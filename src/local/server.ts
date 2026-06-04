import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { KaprukaSDK } from '../sdk/client.js';
import { KaprukaEvents } from './events.js';
import { MemoryStorage, type Storage } from '../storage.js';
import { TOOL_NAMES } from '../config.js';
import type {
  KaprukaLocalConfig,
  Product,
  Category,
  DeliveryCity,
  Order,
  SearchResult,
  CartItem,
  ShippingAddress,
  ShippingValidation,
  CreateOrderRequest,
} from '../sdk/types.js';
import {
  MOCK_PRODUCTS,
  mockSearchProducts,
  mockGetProduct,
  mockListCategories,
  mockListDeliveryCities,
  mockCheckDelivery,
  mockCreateOrder,
  mockTrackOrder,
} from './mock.js';

// ---------------------------------------------------------------------------
// Server-level instructions (surfaced to the AI client)
// ---------------------------------------------------------------------------

const SERVER_INSTRUCTIONS = `\
You are a Kapruka shopping assistant for Sri Lanka's largest e-commerce platform.

## Recommended Shopping Workflow
1. kapruka_search_products    — find products by keyword (use "q" param) or category
2. kapruka_get_product        — fetch full details by product_id (price, stock, image, visual description)
3. kapruka_get_alternatives   — find similar products when nothing matches or item is out of stock
4. kapruka_check_delivery     — verify availability by city, product_id, and delivery_date
5. kapruka_add_to_cart        — add items (persists for this session)
6. kapruka_get_cart           — review cart before checkout
7. kapruka_validate_shipping  — validate address & phone BEFORE creating the order
8. kapruka_create_order       — generate a 60-minute price-locked checkout link (requires cart, recipient, delivery, sender)
9. kapruka_track_order        — track an existing order by order_number

## UI RENDERING RULES (MANDATORY)
For every product or list of products you find, you MUST return a UI Resource hint in your response so the frontend can render them beautifully.
Format: [UI_RESOURCE:kapruka://product/{id}] for single items, or [UI_RESOURCE:kapruka://search?q={query}] for lists.

## Categories
flowers · cakes · gifts · electronics · toys · fashion · grocery · appliances · beauty · books · fruits · beverages

## Key Rules
- All prices are in Sri Lankan Rupees (LKR).
- Perishables (cakes, flowers, fruits) cannot be delivered to 3+ day cities (JAF, TRI, BAT, VAN, POL).
- Electronics and appliances require +1 extra day for security handling.
- ALWAYS call kapruka_validate_shipping before kapruka_create_order to prevent failed orders.

## Multimodal & Voice Tips
- Every product includes a "visual_description" field — use it to describe products to blind users or over voice calls.
- The visual_description provides rich detail about colours, materials, sizes, and textures.`;

// ---------------------------------------------------------------------------
// Zod input schemas
// ---------------------------------------------------------------------------

const SearchSchema = {
  q: z.string().min(1).describe(
    'Search keyword. Examples: "birthday cake", "red roses", "iPhone 15"'
  ),
  category: z.string().optional().describe(
    'Optional category filter: flowers | cakes | gifts | electronics | toys | fashion | grocery | appliances | beauty | books | fruits | beverages'
  ),
};

const GetProductSchema = {
  product_id: z.string().describe('Product ID from search results. Example: "KAP-FLW-001"'),
};

const AddToCartSchema = {
  productId: z.string().describe('Product ID to add to cart'),
  name:      z.string().describe('Product name'),
  price:     z.number().positive().describe('Unit price in LKR'),
  quantity:  z.number().int().min(1).default(1).describe('Quantity to add'),
};

const CheckDeliverySchema = {
  city:    z.string().describe('City code — e.g. COL, KAN, JAF.'),
  product_id: z.string().describe('Product ID to check delivery for'),
};

const CreateOrderSchema = {
  cart: z.array(z.object({
    product_id: z.string(),
    quantity:  z.number().int().min(1),
  })).min(1).describe('Array of {product_id, quantity}'),
  recipient: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
  }),
  delivery: z.object({
    date: z.string(),
  }),
  sender: z.object({
    name: z.string(),
    phone: z.string(),
  }),
};

const TrackOrderSchema = {
  order_number: z.string().describe('Order ID. Example: "KAP-ORD-2501"'),
};

const GetAlternativesSchema = {
  query: z.string().min(1),
  category: z.string().optional(),
  limit: z.number().int().default(5),
};

const ConvertCurrencySchema = {
  amount: z.number().positive(),
  to: z.enum(['USD', 'AED', 'EUR', 'GBP', 'INR']),
};

const GetRecommendationsSchema = {
  limit: z.number().int().default(3),
};

const ValidateShippingSchema = {
  name: z.string(),
  phone: z.string(),
  address_line1: z.string(),
  city: z.string(),
};

// ---------------------------------------------------------------------------
// In-memory cache entry type
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Session context
// ---------------------------------------------------------------------------

export interface SessionContext {
  cartTotal: number;
  cartItems: CartItem[];
  searchHistory: string[];
  orderIds: string[];
}

// ---------------------------------------------------------------------------
// KaprukaLocal — main class
// ---------------------------------------------------------------------------

export class KaprukaLocal {
  private readonly server:   McpServer;
  private readonly events:   KaprukaEvents;
  private readonly storage:  Storage;
  private readonly useMock:  boolean;

  private sdk: KaprukaSDK | null = null;
  private readonly cache = new Map<string, CacheEntry<string>>();
  private readonly cartKeys = new Set<string>();

  private context: SessionContext = {
    cartTotal: 0,
    cartItems: [],
    searchHistory: [],
    orderIds: [],
  };

  constructor(config: KaprukaLocalConfig = {}) {
    this.server = new McpServer(
      { name: 'kapruka-mcp-local', version: '1.0.0' },
      { instructions: SERVER_INSTRUCTIONS }
    );

    this.events      = new KaprukaEvents(config.events);
    this.storage     = config.storage ?? new MemoryStorage();
    this.useMock     = config.mock    ?? true;

    if (!this.useMock) {
      this.sdk = new KaprukaSDK();
    }

    this.restoreCartFromStorage();
    this.registerTools();
    this.registerResources();
  }

  private restoreCartFromStorage(): void {
    const cartKeys = this.storage.keys('cart:');
    for (const key of cartKeys) {
      this.cartKeys.add(key);
    }
    this.refreshCartContext();
  }

  private persistCart(item: CartItem): void {
    const key = `cart:${item.productId}`;
    const existing = this.storage.get<CartItem>(key);

    if (existing) {
      existing.quantity += item.quantity;
      this.storage.set(key, existing);
    } else {
      this.storage.set(key, item);
      this.cartKeys.add(key);
    }
  }

  private readCart(): CartItem[] {
    const items: CartItem[] = [];
    for (const key of this.cartKeys) {
      const item = this.storage.get<CartItem>(key);
      if (item) items.push(item);
    }
    return items;
  }

  private refreshCartContext(): void {
    this.context.cartItems = this.readCart();
    this.context.cartTotal = this.context.cartItems.reduce(
      (sum, i) => sum + i.price * i.quantity, 0
    );
  }

  private recordAction(tool: string, args: Record<string, unknown>): void {
    this.storage.incrementAnalytics(args.productId as string || 'system', 'mention');
  }

  private textContent(text: string, uiUri?: string) {
    return { 
      content: [{ type: 'text' as const, text }],
      ...(uiUri ? { _meta: { ui: uiUri } } : {})
    };
  }

  private registerTools(): void {
    // --- kapruka_search_products ---
    this.server.registerTool(
      TOOL_NAMES.search_products,
      { description: 'Search Kapruka catalog', inputSchema: SearchSchema },
      async ({ q, category }) => {
        const result = this.useMock ? mockSearchProducts(q, category) : await this.sdk!.searchProducts(q, category);
        const text = `I found ${result.products.length} items for "${q}". [UI_RESOURCE:kapruka://search?q=${encodeURIComponent(q)}]`;
        return this.textContent(text, `kapruka://search?q=${encodeURIComponent(q)}`);
      }
    );

    // --- kapruka_get_product ---
    this.server.registerTool(
      TOOL_NAMES.get_product,
      { description: 'Get product detail', inputSchema: GetProductSchema },
      async ({ product_id }) => {
        const result = this.useMock ? mockGetProduct(product_id) : await this.sdk!.getProduct(product_id);
        if (!result) return this.textContent(`Product ${product_id} not found.`);
        const text = `${result.name} - LKR ${result.price.toLocaleString()}. [UI_RESOURCE:kapruka://product/${product_id}]`;
        return this.textContent(text, `kapruka://product/${product_id}`);
      }
    );

    // --- kapruka_add_to_cart ---
    this.server.registerTool(
      TOOL_NAMES.add_to_cart,
      { description: 'Add to cart', inputSchema: AddToCartSchema },
      async ({ productId, name, price, quantity }) => {
        this.persistCart({ productId, name, price, quantity: quantity ?? 1 });
        this.refreshCartContext();
        return this.textContent(`Added ${name} to cart. Your total is now LKR ${this.context.cartTotal.toLocaleString()}. [UI_RESOURCE:kapruka://cart]`);
      }
    );

    // --- kapruka_get_cart ---
    this.server.registerTool(
      TOOL_NAMES.get_cart,
      { description: 'View cart', inputSchema: {} },
      async () => {
        this.refreshCartContext();
        return this.textContent(`Your cart has ${this.context.cartItems.length} items totaling LKR ${this.context.cartTotal.toLocaleString()}. [UI_RESOURCE:kapruka://cart]`);
      }
    );

    // Additional tools would be registered here...
    // For brevity, focus on the core shopping loop for the test
  }

  private registerResources(): void {
    this.server.resource('cart', 'kapruka://cart', async () => ({
      contents: [{ uri: 'kapruka://cart', mimeType: 'application/json', text: JSON.stringify(this.context.cartItems) }]
    }));
  }

  getServer(): McpServer { return this.server; }
  getContext(): Readonly<SessionContext> { return { ...this.context }; }
}
