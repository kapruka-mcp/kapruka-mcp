// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

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
  Order,
  SearchResult,
  CartItem,
  ShippingAddress,
  ShippingValidation,
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

// Server-level instructions (surfaced to the AI client)

const SERVER_INSTRUCTIONS = `\
You are a Kapruka shopping assistant for Sri Lanka's largest e-commerce platform.

## Recommended Shopping Workflow
1. kapruka_search_products    -- find products by keyword (use "q" param) or category
2. kapruka_get_product        -- fetch full details by product_id (price, stock, image, visual description)
3. kapruka_get_alternatives   -- find similar products when nothing matches or item is out of stock
4. kapruka_check_delivery     -- verify availability by city, product_id, and delivery_date
5. kapruka_add_to_cart        -- add items (persists for this session)
6. kapruka_get_cart           -- review cart before checkout
7. kapruka_validate_shipping  -- validate address & phone BEFORE creating the order
8. kapruka_create_order       -- generate a 60-minute price-locked checkout link (requires cart, recipient, delivery, sender)
9. kapruka_track_order        -- track an existing order by order_number

## Categories
flowers | cakes | gifts | electronics | toys | fashion | grocery | appliances | beauty | books | fruits | beverages

## Delivery Cities
COL (Colombo) | DEH (Dehiwala) | NEG (Negombo) | SRI (Sri Jayawardenepura)
KAN (Kandy) | KUR (Kurunegala) | GAL (Galle) | MAT (Matara) | RAT (Ratnapura)
ANU (Anuradhapura) | POL (Polonnaruwa) | TRI (Trincomalee) | BAT (Batticaloa)
JAF (Jaffna) | VAN (Vavuniya) | NUW (Nuwara Eliya)

## Key Rules
- All prices are in Sri Lankan Rupees (LKR).
- Perishables (cakes, flowers, fruits) cannot be delivered to 3+ day cities (JAF, TRI, BAT, VAN, POL).
- Electronics and appliances require +1 extra day for security handling.
- Guest checkout links expire in 60 minutes -- create the order only when the customer is ready to pay.
- The cart is local to this session; it is NOT synced with Kapruka until create_order is called.
- Official rate limits: 60 requests/minute, 30 orders/hour.
- ALWAYS call kapruka_validate_shipping before kapruka_create_order to prevent failed orders.
- For kapruka_search_products, use the "q" parameter (not "query") for the search keyword.
- For kapruka_get_product, use "product_id" (not "productId").
- For kapruka_track_order, use "order_number" (not "orderId").

## Multimodal & Voice Tips
- Every product includes a "visual_description" field -- use it to describe products to blind users or over voice calls.
- When a search returns 0 results, ALWAYS call kapruka_get_alternatives before telling the user "nothing found".
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
  min_price: z.number().optional().describe('Minimum price filter in LKR'),
  max_price: z.number().optional().describe('Maximum price filter in LKR'),
  in_stock_only: z.boolean().optional().describe('Only show in-stock products'),
  sort: z.string().optional().describe('Sort order: price_asc, price_desc, name'),
  limit: z.number().int().optional().describe('Max results to return'),
  cursor: z.string().optional().describe('Pagination cursor from previous result'),
  currency: z.string().optional().describe('Currency code (default: LKR)'),
};

const GetProductSchema = {
  product_id: z.string().describe('Product ID from search results. Example: "KAP-FLW-001"'),
  currency: z.string().optional().describe('Currency code (default: LKR)'),
};

const AddToCartSchema = {
  productId: z.string().describe('Product ID to add to cart'),
  name:      z.string().describe('Product name (from search/get_product result)'),
  price:     z.number().positive().describe('Unit price in LKR'),
  quantity:  z.number().int().min(1).default(1).describe('Quantity to add (default: 1)'),
};

const CheckDeliverySchema = {
  city:    z.string().describe('City code (e.g. COL, KAN, JAF). Use kapruka_list_delivery_cities for the full list.'),
  product_id: z.string().describe('Product ID to check delivery constraints for'),
  delivery_date: z.string().optional().describe('Delivery date in YYYY-MM-DD format (optional, defaults to today)'),
};

const CreateOrderSchema = {
  cart: z.array(z.object({
    product_id: z.string(),
    quantity:  z.number().int().min(1),
  })).min(1).describe('Array of {product_id, quantity} objects. Must not be empty.'),
  recipient: z.object({
    name: z.string().describe('Recipient full name'),
    phone: z.string().describe('Recipient phone number'),
    address: z.string().describe('Delivery address'),
    city: z.string().describe('Delivery city code (e.g., COL, KAN)'),
    postal_code: z.string().optional().describe('5-digit postal code'),
  }).describe('Recipient details'),
  delivery: z.object({
    date: z.string().describe('Delivery date in YYYY-MM-DD format'),
    instructions: z.string().optional().describe('Special delivery instructions'),
  }).describe('Delivery schedule'),
  sender: z.object({
    name: z.string().describe('Sender full name'),
    phone: z.string().describe('Sender phone number'),
  }).describe('Sender details'),
  gift_message: z.string().optional().describe('Gift message to include with the order'),
  currency: z.string().optional().describe('Currency code (default: LKR)'),
};

const TrackOrderSchema = {
  order_number: z.string().describe('Order ID from a create_order response or confirmation email. Example: "KAP-ORD-2501"'),
};

const GetAlternativesSchema = {
  query: z.string().min(1).describe(
    'The original search term that failed or returned too few results. Example: "wireless headphones under 10000"'
  ),
  category: z.string().optional().describe(
    'Optional category to narrow alternatives'
  ),
  maxPrice: z.number().positive().optional().describe(
    'Maximum price filter in LKR. Example: 10000'
  ),
  limit: z.number().int().min(1).max(10).default(5).describe(
    'Max alternatives to return (default: 5, max: 10)'
  ),
};

const ConvertCurrencySchema = {
  amount: z.number().positive().describe('The amount in LKR to convert'),
  to: z.enum(['USD', 'AED', 'EUR', 'GBP', 'INR']).describe('The target currency code'),
};

const GetRecommendationsSchema = {
  limit: z.number().int().min(1).max(5).default(3).describe('Number of recommendations to return (default: 3)'),
};

const ValidateShippingSchema = {
  name: z.string().min(2).describe('Full name (e.g., "Kamal Perera")'),
  phone: z.string().describe('Sri Lankan phone number in any common format: 0771234567, +94771234567, 077-123-4567'),
  address: z.string().min(5).describe('Street address or house number and street (e.g., "42 Temple Road")'),
  city: z.string().describe('Delivery city name or code (e.g. "Colombo", "Kandy", "JAF")'),
  postal_code: z.string().optional().describe('5-digit Sri Lankan postal code (optional but recommended)'),
  delivery_instructions: z.string().optional().describe('Special delivery instructions (optional)'),
};

// ---------------------------------------------------------------------------
// In-memory cache entry type
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Session context (tracking per-server-instance state)
// ---------------------------------------------------------------------------

export interface SessionContext {
  lastSearchedCategory?: string;
  lastViewedProduct?: string;
  deliveryCity?: string;
  cartTotal: number;
  cartItems: CartItem[];
  searchHistory: string[];
  orderIds: string[];
}

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

class RateLimiter {
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly maxOrders: number;
  private readonly orderWindowMs: number;

  private requestTimestamps: number[] = [];
  private orderTimestamps: number[] = [];

  constructor(options: {
    windowMs?: number;
    maxRequests?: number;
    maxOrders?: number;
    orderWindowMs?: number;
  } = {}) {
    this.windowMs      = options.windowMs      ?? 60_000;
    this.maxRequests   = options.maxRequests   ?? 60;
    this.maxOrders     = options.maxOrders     ?? 30;
    this.orderWindowMs = options.orderWindowMs ?? 3_600_000;
  }

  /** Returns an error string if rate-limited, otherwise undefined. */
  check(): string | undefined {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < this.windowMs);
    if (this.requestTimestamps.length >= this.maxRequests) {
      return `Rate limit exceeded: max ${this.maxRequests} requests per ${this.windowMs / 1000}s.`;
    }
    this.requestTimestamps.push(now);
    return undefined;
  }

  /** Returns an error string if order rate-limited, otherwise undefined. */
  checkOrder(): string | undefined {
    const now = Date.now();
    this.orderTimestamps = this.orderTimestamps.filter(t => now - t < this.orderWindowMs);
    if (this.orderTimestamps.length >= this.maxOrders) {
      return `Order rate limit exceeded: max ${this.maxOrders} orders per hour.`;
    }
    this.orderTimestamps.push(now);
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// KaprukaLocal -- main class
// ---------------------------------------------------------------------------

export class KaprukaLocal {
  private readonly server:   McpServer;
  private readonly events:   KaprukaEvents;
  private readonly storage:  Storage;
  private readonly useMock:  boolean;
  private readonly compact:  boolean;

  /** Only created when useMock === false */
  private sdk: KaprukaSDK | null = null;

  /** Simple TTL cache for read-only tool responses */
  private readonly cache = new Map<string, CacheEntry<string>>();
  private readonly cacheTtlMs: number;

  /** Rate limiter */
  private readonly rateLimiter: RateLimiter;

  /** Keys of cart items currently in storage */
  private readonly cartKeys = new Set<string>();

  /** Mutable session context */
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
    this.compact     = config.compact ?? false;
    this.cacheTtlMs  = 30 * 60 * 1000; // 30 minutes
    this.rateLimiter = new RateLimiter();

    if (!this.useMock) {
      this.sdk = new KaprukaSDK();
    }

    this.restoreCartFromStorage();
    this.registerTools();
    this.registerResources();
  }

  // -------------------------------------------------------------------------
  // Storage helpers
  // -------------------------------------------------------------------------

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
    this.storage.set(
      `action:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      { tool, args, timestamp: Date.now() },
      86_400_000 // 24 hours
    );
  }

  // -------------------------------------------------------------------------
  // Cache helpers
  // -------------------------------------------------------------------------

  private cacheGet(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private cacheSet(key: string, value: string): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
  }

  // -------------------------------------------------------------------------
  // Response formatters
  // -------------------------------------------------------------------------

  private textContent(text: string) {
    return { content: [{ type: 'text' as const, text }] };
  }

  private errorContent(tool: string, message: string, suggestion?: string) {
    return this.textContent(JSON.stringify({
      error: message,
      tool,
      ...(suggestion ? { suggestion } : {}),
    }));
  }

  private formatProduct(product: Product): string {
    if (this.compact) {
      return `${product.id} | ${product.name} | LKR ${product.price.toLocaleString()} | ${product.in_stock ? 'In Stock' : 'Out of Stock'}`;
    }
    return JSON.stringify(product);
  }

  private formatProductList(products: Product[]): string {
    if (this.compact) {
      return products.map(p => this.formatProduct(p)).join('\n');
    }
    return JSON.stringify(products);
  }

  // -------------------------------------------------------------------------
  // Fuzzy "did you mean?" helper
  // -------------------------------------------------------------------------

  private findSimilar(query: string, limit = 3): Product[] {
    const q = query.toLowerCase();
    return MOCK_PRODUCTS
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      )
      .slice(0, limit);
  }

  // -------------------------------------------------------------------------
  // Stop words for token extraction
  // -------------------------------------------------------------------------

  private static readonly STOP_WORDS = new Set([
    'under', 'below', 'less', 'than', 'the', 'and', 'for', 'with',
    'best', 'cheap', 'buy', 'price', 'how', 'what', 'where', 'which',
    'does', 'any', 'some', 'need', 'want', 'find', 'get', 'show',
  ]);

  // -------------------------------------------------------------------------
  // Token extraction
  // -------------------------------------------------------------------------

  private extractTokens(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 2 && !KaprukaLocal.STOP_WORDS.has(t));
  }

  // -------------------------------------------------------------------------
  // Score alternatives (reusable across mock and live modes)
  // -------------------------------------------------------------------------

  private scoreAlternatives(
    products: Product[],
    query: string,
    category?: string,
    maxPrice?: number,
    limit = 5
  ): Product[] {
    const tokens = this.extractTokens(query);

    const scored = products
      .filter(p => {
        if (maxPrice !== undefined && p.price > maxPrice) return false;
        if (category && p.category !== category) return false;
        return true;
      })
      .map(p => {
        let score = 0;
        const name = p.name.toLowerCase();
        const desc = p.description.toLowerCase();
        const cat = p.category.toLowerCase();

        // Category match bonus
        if (tokens.some(t => cat.includes(t))) score += 30;

        // Name token overlap
        for (const t of tokens) {
          if (name.includes(t)) score += 20;
        }

        // Description token overlap
        for (const t of tokens) {
          if (desc.includes(t)) score += 10;
        }

        // In-stock preference (only if product already matched something)
        if (score > 0 && p.in_stock) score += 5;

        // Exact name match bonus
        if (tokens.length > 0 && tokens.every(t => name.includes(t))) score += 25;

        return { product: p, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map(item => item.product).slice(0, limit);
  }

  // -------------------------------------------------------------------------
  // Mock mode: find alternatives from local catalog
  // -------------------------------------------------------------------------

  private findAlternativesFromMock(
    query: string,
    category?: string,
    maxPrice?: number,
    limit = 5
  ): Product[] {
    return this.scoreAlternatives(MOCK_PRODUCTS, query, category, maxPrice, limit);
  }

  // -------------------------------------------------------------------------
  // Live mode: progressive caching with 2-4 background API calls
  // -------------------------------------------------------------------------

  /**
   * Search the real Kapruka catalog and cache results in storage.
   * Fires 2-4 parallel searches, deduplicates, and caches for 30 minutes.
   */
  private async searchAndCache(query: string, category?: string): Promise<Product[]> {
    const cacheKey = `search_cache:${query}:${category ?? ''}`;
    const cached = this.storage.get<Product[]>(cacheKey);
    if (cached) return cached;

    // Build search queries: full query + top 2 meaningful tokens
    const tokens = this.extractTokens(query);
    const queries: Array<{ q: string; cat?: string }> = [
      { q: query, cat: category },
    ];
    for (const token of tokens.slice(0, 2)) {
      // Avoid duplicate if token is the same as full query
      if (token !== query.toLowerCase()) {
        queries.push({ q: token, cat: category });
      }
    }

    // Fire searches in parallel (non-blocking, max 4)
    const searches = queries.slice(0, 4).map(({ q, cat }) =>
      this.sdk!.searchProducts(q, cat).catch(() => null)
    );

    const results = await Promise.all(searches);

    // Deduplicate by product ID
    const productMap = new Map<string, Product>();
    for (const result of results) {
      if (result && result.products) {
        for (const p of result.products) {
          productMap.set(p.id, p);
        }
      }
    }

    const products = Array.from(productMap.values());

    // Cache for 30 minutes
    if (products.length > 0) {
      this.storage.set(cacheKey, products, 30 * 60 * 1000);
    }

    return products;
  }

  // -------------------------------------------------------------------------
  // Mode-aware findAlternatives (mock vs live)
  // -------------------------------------------------------------------------

  private async findAlternatives(
    query: string,
    category?: string,
    maxPrice?: number,
    limit = 5
  ): Promise<Product[]> {
    if (this.useMock) {
      return this.findAlternativesFromMock(query, category, maxPrice, limit);
    }

    // Live mode: search real catalog, then score
    const products = await this.searchAndCache(query, category);
    return this.scoreAlternatives(products, query, category, maxPrice, limit);
  }

  // -------------------------------------------------------------------------
  // Shipping address validation
  // -------------------------------------------------------------------------

  private async validateShippingAddress(address: ShippingAddress, liveCities?: string[]): Promise<ShippingValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // --- Phone validation ---
    const raw = address.phone.replace(/[\s\-()]/g, '');
    const phoneDigits = raw.startsWith('+94') ? raw.slice(3) : raw.startsWith('94') ? raw.slice(2) : raw.startsWith('0') ? raw.slice(1) : raw;

    if (!/^(7[0-9]{8})$/.test(phoneDigits)) {
      errors.push(
        `Invalid phone number: "${address.phone}". Sri Lankan mobile numbers must be exactly 10 digits starting with 0 (e.g., 0771234567, 0711234567, 077-123-4567, +94771234567).`
      );
    }

    // --- City validation ---
    const cityLower = address.city.toLowerCase().trim();

    if (liveCities && liveCities.length > 0) {
      // Live mode: validate against real server cities
      const matched = liveCities.some(c => c.toLowerCase() === cityLower);
      if (!matched) {
        errors.push(
          `Unknown delivery city: "${address.city}". Valid cities: ${liveCities.slice(0, 10).join(', ')}, etc.`
        );
      }
    } else {
      // Mock mode: validate against local map
      const cityMap: Record<string, string> = {
        colombo: 'COL', dehiwala: 'DEH', 'mount lavinia': 'DEH',
        negombo: 'NEG', 'sri jayawardenepura': 'SRI', kotte: 'SRI',
        kandy: 'KAN', kurunegala: 'KUR', galle: 'GAL', matara: 'MAT',
        ratnapura: 'RAT', anuradhapura: 'ANU', polonnaruwa: 'POL',
        trincomalee: 'TRI', jaffna: 'JAF', vavuniya: 'VAN', 'nuwara eliya': 'NUW',
      };
      const matchedCityCode = cityMap[cityLower];

      if (!matchedCityCode) {
        const validCities = Object.keys(cityMap).map(c => c.replace(/\b\w/g, l => l.toUpperCase()));
        errors.push(
          `Unknown delivery city: "${address.city}". Valid cities: ${validCities.slice(0, 10).join(', ')}, etc.`
        );
      }
    }

    // --- Postal code validation ---
    if (address.postal_code && !/^\d{5}$/.test(address.postal_code)) {
      warnings.push(
        `Postal code "${address.postal_code}" is not in 5-digit format. Sri Lankan postal codes are exactly 5 digits (e.g., 00100).`
      );
    }

    // --- Address completeness warnings ---
    if (!address.address_line2) {
      warnings.push('Consider adding an apartment or floor number to ensure accurate delivery.');
    }
    if (!address.postal_code) {
      warnings.push('Adding a postal code improves delivery accuracy.');
    }
    if (!address.delivery_instructions) {
      warnings.push('Adding delivery instructions (e.g., "Ring doorbell twice") helps the courier.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestion: errors.length > 0
        ? 'Fix the errors above before creating your order to prevent failed deliveries.'
        : undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Tool registration
  // -------------------------------------------------------------------------

  private registerTools(): void {
    this.registerSearchProducts();
    this.registerGetProduct();
    this.registerGetAlternatives();
    this.registerAddToCart();
    this.registerGetCart();
    this.registerListCategories();
    this.registerListDeliveryCities();
    this.registerCheckDelivery();
    this.registerValidateShipping();
    this.registerCreateOrder();
    this.registerTrackOrder();
    this.registerGetRecommendations();
    this.registerConvertCurrency();
    this.registerGetAnalytics();
  }

  // --- kapruka_search_products ---
  private registerSearchProducts(): void {
    this.server.registerTool(
      TOOL_NAMES.search_products,
      {
        description: `Search Kapruka's full product catalog by keyword and optional category.
Returns a ranked list of products with ID, name, price (LKR), image URL, and stock status.
Tip: add a category filter for more relevant results.
Examples: query="birthday cake", category="cakes"; query="red roses", category="flowers"`,
        inputSchema: SearchSchema,
      },
      async ({ q, category }) => {
        const rateLimitError = this.rateLimiter.check();
        if (rateLimitError) return this.errorContent(TOOL_NAMES.search_products, rateLimitError);

        this.events.toolCall(TOOL_NAMES.search_products, { q, category });
        this.recordAction(TOOL_NAMES.search_products, { q, category });

        if (category) this.context.lastSearchedCategory = category;
        this.context.searchHistory.push(q);

        const cacheKey = `search:${q}:${category ?? ''}`;
        const cached = this.cacheGet(cacheKey);
        if (cached) return this.textContent(cached);

        try {
          const result: SearchResult = this.useMock
            ? mockSearchProducts(q, category)
            : await this.sdk!.searchProducts(q, category);

          const response = JSON.stringify({
            products: result.products,
            total: result.total,
            query: result.query,
            ...(this.context.deliveryCity ? { sessionDeliveryCity: this.context.deliveryCity } : {}),
          });

          const text = this.compact ? this.formatProductList(result.products) : response;
          this.cacheSet(cacheKey, text);

          // Track top 3 results as mentions
          for (const p of result.products.slice(0, 3)) {
            this.storage.incrementAnalytics(p.id, 'mention');
          }

          return this.textContent(text);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.events.error(TOOL_NAMES.search_products, error);
          return this.errorContent(
            TOOL_NAMES.search_products,
            error.message,
            'Check your internet connection or switch to mock mode'
          );
        }
      }
    );
  }

  // --- kapruka_get_product ---
  private registerGetProduct(): void {
    this.server.registerTool(
      TOOL_NAMES.get_product,
      {
        description: `Get full details for a specific product: name, price, description, visual description, image URL, stock status, category.
Use this after searching to get complete product information before adding to cart.`,
        inputSchema: GetProductSchema,
      },
      async ({ product_id }) => {
        const rateLimitError = this.rateLimiter.check();
        if (rateLimitError) return this.errorContent(TOOL_NAMES.get_product, rateLimitError);

        this.events.toolCall(TOOL_NAMES.get_product, { product_id });
        this.recordAction(TOOL_NAMES.get_product, { product_id });
        this.context.lastViewedProduct = product_id;

        const cacheKey = `product:${product_id}`;
        const cached = this.cacheGet(cacheKey);
        if (cached) return this.textContent(cached);

        try {
          const result: Product | null = this.useMock
            ? mockGetProduct(product_id)
            : await this.sdk!.getProduct(product_id);

          if (!result) {
            const similar = this.findSimilar(product_id);
            return this.errorContent(
              TOOL_NAMES.get_product,
              `Product "${product_id}" not found.`,
              similar.length
                ? `Did you mean: ${similar.map(p => `${p.id} (${p.name})`).join(', ')}?`
                : 'Use kapruka_search_products to find valid product IDs.'
            );
          }

          const text = this.formatProduct(result);
          this.cacheSet(cacheKey, text);

          // Track view engagement
          this.storage.incrementAnalytics(product_id, 'view');

          return this.textContent(text);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.events.error(TOOL_NAMES.get_product, error);
          return this.errorContent(TOOL_NAMES.get_product, error.message);
        }
      }
    );
  }

  // --- kapruka_get_alternatives ---
  private registerGetAlternatives(): void {
    this.server.registerTool(
      TOOL_NAMES.get_alternatives,
      {
        description: `Find similar or alternative products when a search returns 0 results, the item is out of stock, or the customer wants options.
Uses fuzzy matching across name, description, and category to find close matches.
Always call this BEFORE telling the user "nothing found" -- the AI should never hit a dead end.
Returns: list of alternative products with visual descriptions for voice-friendly output.`,
        inputSchema: GetAlternativesSchema,
      },
      async ({ query, category, maxPrice, limit }) => {
        const rateLimitError = this.rateLimiter.check();
        if (rateLimitError) return this.errorContent(TOOL_NAMES.get_alternatives, rateLimitError);

        this.events.toolCall(TOOL_NAMES.get_alternatives, { query, category, maxPrice, limit });
        this.recordAction(TOOL_NAMES.get_alternatives, { query, category, maxPrice, limit });

        const cacheKey = `alt:${query}:${category ?? ''}:${maxPrice ?? ''}:${limit}`;
        const cached = this.cacheGet(cacheKey);
        if (cached) return this.textContent(cached);

        try {
          const alternatives = await this.findAlternatives(query, category, maxPrice, limit);

          if (alternatives.length === 0) {
            // Fall back to broader search -- try each word individually
            const words = this.extractTokens(query);
            for (const word of words) {
              const more = await this.findAlternatives(word, category, maxPrice, limit - alternatives.length);
              for (const p of more) {
                if (!alternatives.find(a => a.id === p.id)) {
                  alternatives.push(p);
                }
              }
              if (alternatives.length >= limit) break;
            }
          }

          const result = {
            query,
            alternatives: alternatives.slice(0, limit),
            total: alternatives.length,
            suggestion: alternatives.length > 0
              ? `Found ${alternatives.length} alternative${alternatives.length !== 1 ? 's' : ''} for "${query}".`
              : `No alternatives found for "${query}". Try a broader search term.`,
          };

          const text = this.compact
            ? alternatives.slice(0, limit).map(p => this.formatProduct(p)).join('\n')
            : JSON.stringify(result);

          this.cacheSet(cacheKey, text);
          return this.textContent(text);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.events.error(TOOL_NAMES.get_alternatives, error);
          return this.errorContent(TOOL_NAMES.get_alternatives, error.message);
        }
      }
    );
  }

  // --- kapruka_add_to_cart ---
  private registerAddToCart(): void {
    this.server.registerTool(
      TOOL_NAMES.add_to_cart,
      {
        description: `Add a product to the local cart. The cart persists across all tool calls in this session.
Returns: confirmation message, updated cart contents, and running total.
Note: The cart is local only -- it is NOT sent to Kapruka until you call kapruka_create_order.`,
        inputSchema: AddToCartSchema,
      },
      async ({ productId, name, price, quantity }) => {
        this.events.toolCall(TOOL_NAMES.add_to_cart, { productId, name, price, quantity });
        this.recordAction(TOOL_NAMES.add_to_cart, { productId, name, price, quantity });

        const qty = quantity ?? 1;
        this.persistCart({ productId, name, price, quantity: qty });
        this.refreshCartContext();

        // Track cart add engagement
        this.storage.incrementAnalytics(productId, 'cart_add');

        return this.textContent(JSON.stringify({
          message: `Added ${qty} +� ${name} to your cart.`,
          cart: this.context.cartItems,
          cartTotal: `LKR ${this.context.cartTotal.toLocaleString()}`,
          itemCount: this.context.cartItems.length,
        }));
      }
    );
  }

  // --- kapruka_get_cart ---
  private registerGetCart(): void {
    this.server.registerTool(
      TOOL_NAMES.get_cart,
      {
        description: `View all items currently in the local cart with quantities and subtotals.
Returns: item list, total in LKR, item count.
Use this before kapruka_create_order to review the cart.`,
        inputSchema: {},
      },
      async () => {
        this.events.toolCall(TOOL_NAMES.get_cart, {});
        this.recordAction(TOOL_NAMES.get_cart, {});
        this.refreshCartContext();

        if (this.context.cartItems.length === 0) {
          return this.textContent(JSON.stringify({
            items: [],
            cartTotal: 'LKR 0',
            itemCount: 0,
            message: 'Your cart is empty. Use kapruka_search_products to find products.',
          }));
        }

        return this.textContent(JSON.stringify({
          items: this.context.cartItems.map(item => ({
            ...item,
            subtotal: `LKR ${(item.price * item.quantity).toLocaleString()}`,
          })),
          cartTotal: `LKR ${this.context.cartTotal.toLocaleString()}`,
          itemCount: this.context.cartItems.length,
        }));
      }
    );
  }

  // --- kapruka_list_categories ---
  private registerListCategories(): void {
    this.server.registerTool(
      TOOL_NAMES.list_categories,
      {
        description: `List all Kapruka product categories with IDs, names, and descriptions.
Use the category ID as the category filter in kapruka_search_products.`,
        inputSchema: {},
      },
      async () => {
        const rateLimitError = this.rateLimiter.check();
        if (rateLimitError) return this.errorContent(TOOL_NAMES.list_categories, rateLimitError);

        this.events.toolCall(TOOL_NAMES.list_categories, {});
        this.recordAction(TOOL_NAMES.list_categories, {});

        const cacheKey = 'categories';
        const cached = this.cacheGet(cacheKey);
        if (cached) return this.textContent(cached);

        try {
          const result: Category[] = this.useMock
            ? mockListCategories()
            : await this.sdk!.listCategories();

          const text = this.compact
            ? result.map(c => `${c.id} | ${c.name}`).join('\n')
            : JSON.stringify(result);

          this.cacheSet(cacheKey, text);
          return this.textContent(text);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.events.error(TOOL_NAMES.list_categories, error);
          return this.errorContent(TOOL_NAMES.list_categories, error.message);
        }
      }
    );
  }

  // --- kapruka_list_delivery_cities ---
  private registerListDeliveryCities(): void {
    this.server.registerTool(
      TOOL_NAMES.list_delivery_cities,
      {
        description: `List all delivery cities with their city codes, delivery fees (LKR), and estimated delivery days.
Use the city code (e.g. COL, KAN, JAF) in kapruka_check_delivery.`,
        inputSchema: {},
      },
      async () => {
        const rateLimitError = this.rateLimiter.check();
        if (rateLimitError) return this.errorContent(TOOL_NAMES.list_delivery_cities, rateLimitError);

        this.events.toolCall(TOOL_NAMES.list_delivery_cities, {});
        this.recordAction(TOOL_NAMES.list_delivery_cities, {});

        const cacheKey = 'delivery_cities';
        const cached = this.cacheGet(cacheKey);
        if (cached) return this.textContent(cached);

        try {
          const result = this.useMock
            ? mockListDeliveryCities()
            : await this.sdk!.listDeliveryCities();

          const text = this.compact
            ? result.map(c =>
                `${c.id} | ${c.name} | ${c.delivery_fee === 0 ? 'FREE' : `LKR ${c.delivery_fee}`} | ${c.estimated_days} day${c.estimated_days !== 1 ? 's' : ''}`
              ).join('\n')
            : JSON.stringify(result);

          this.cacheSet(cacheKey, text);
          return this.textContent(text);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.events.error(TOOL_NAMES.list_delivery_cities, error);
          return this.errorContent(TOOL_NAMES.list_delivery_cities, error.message);
        }
      }
    );
  }

  // --- kapruka_check_delivery ---
  private registerCheckDelivery(): void {
    this.server.registerTool(
      TOOL_NAMES.check_delivery,
      {
        description: `Check delivery availability, fee, and estimated arrival days for a city and product combination.
Important: Perishables (cakes, flowers, fruits) cannot be delivered to remote cities (JAF, TRI, BAT, VAN).
Always call this before creating an order when the customer specifies a delivery location.`,
        inputSchema: CheckDeliverySchema,
      },
      async ({ city, product_id, delivery_date }) => {
        const rateLimitError = this.rateLimiter.check();
        if (rateLimitError) return this.errorContent(TOOL_NAMES.check_delivery, rateLimitError);

        this.events.toolCall(TOOL_NAMES.check_delivery, { city, product_id, delivery_date });
        this.recordAction(TOOL_NAMES.check_delivery, { city, product_id, delivery_date });
        this.context.deliveryCity = city;

        const cacheKey = `delivery:${city}:${product_id}`;
        const cached = this.cacheGet(cacheKey);
        if (cached) return this.textContent(cached);

        try {
          const result = this.useMock
            ? mockCheckDelivery(city, product_id, delivery_date)
            : await this.sdk!.checkDelivery(city, product_id, delivery_date);

          if (!result) {
            const cities = this.useMock ? mockListDeliveryCities() : [];
            return this.errorContent(
              TOOL_NAMES.check_delivery,
              `No delivery data found for city "${city}" or product "${product_id}".`,
              cities.length
                ? `Valid city codes: ${cities.map(c => c.id).join(', ')}`
                : 'Use kapruka_list_delivery_cities for valid city codes.'
            );
          }

          const text = JSON.stringify({
            available: result.available,
            city: result.city,
            deliveryFee: result.fee === 0 ? 'FREE' : `LKR ${result.fee}`,
            estimatedDays: result.estimated_days,
            note: result.available
              ? result.fee === 0
                ? '=��� Free delivery to this city!'
                : `Delivery fee: LKR ${result.fee}. Arrives in ${result.estimated_days} day${result.estimated_days !== 1 ? 's' : ''}.`
              : 'G��n+� Perishable products cannot be delivered to this city due to the distance.',
          });

          this.cacheSet(cacheKey, text);
          return this.textContent(text);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.events.error(TOOL_NAMES.check_delivery, error);
          return this.errorContent(TOOL_NAMES.check_delivery, error.message);
        }
      }
    );
  }

  // --- kapruka_validate_shipping ---
  private registerValidateShipping(): void {
    this.server.registerTool(
      TOOL_NAMES.validate_shipping,
      {
        description: `Validate a shipping address BEFORE calling kapruka_create_order.
Checks Sri Lankan phone format (07X-XXXXXXX), city name against 16 delivery cities, address completeness, and postal code format.
Returns: {valid: true/false, errors: [...], warnings: [...]}.
Always call this first to prevent order failures from invalid addresses.`,
        inputSchema: ValidateShippingSchema,
      },
      async ({ name, phone, address, city, postal_code, delivery_instructions }) => {
        this.events.toolCall(TOOL_NAMES.validate_shipping, { name, phone, city });
        this.recordAction(TOOL_NAMES.validate_shipping, { name, phone, city });

        const shippingAddress: ShippingAddress = {
          name, phone, address_line1: address, city,
          postal_code, delivery_instructions,
        };

        // In live mode, fetch real cities from the server for validation
        let liveCities: string[] | undefined;
        if (!this.useMock && this.sdk) {
          try {
            const cities = await this.sdk.listDeliveryCities();
            liveCities = cities.map(c => c.name);
          } catch {
            // Fall back to local city map if server unreachable
          }
        }

        const result = await this.validateShippingAddress(shippingAddress, liveCities);

        // Store validated address in session context for order creation
        if (result.valid) {
          // reserved for future use
        }

        return this.textContent(JSON.stringify({
          valid: result.valid,
          errors: result.errors,
          warnings: result.warnings,
          suggestion: result.suggestion,
          checkedAddress: {
            name,
            phone,
            address,
            city,
            postal_code: postal_code || null,
            delivery_instructions: delivery_instructions || null,
          },
        }));
      }
    );
  }

  // --- kapruka_create_order ---
  private registerCreateOrder(): void {
    this.server.registerTool(
      TOOL_NAMES.create_order,
      {
        description: `Create a guest checkout order and receive a price-locked pay link (valid 60 minutes).
No Kapruka account is required. Returns: order ID, checkout URL, total, and item breakdown.
Tip: Review the cart with kapruka_get_cart and confirm delivery with kapruka_check_delivery first.
Rate limit: 30 orders per hour.`,
        inputSchema: CreateOrderSchema,
      },
      async ({ cart, recipient, delivery, sender, gift_message, currency }) => {
        const rateLimitError = this.rateLimiter.check();
        if (rateLimitError) return this.errorContent(TOOL_NAMES.create_order, rateLimitError);

        const orderRateError = this.rateLimiter.checkOrder();
        if (orderRateError) return this.errorContent(TOOL_NAMES.create_order, orderRateError);

        this.events.toolCall(TOOL_NAMES.create_order, { cart, recipient, delivery, sender, gift_message, currency });
        this.recordAction(TOOL_NAMES.create_order, { cart, recipient, delivery, sender, gift_message, currency });

        try {
          const result: Order | null = this.useMock
            ? mockCreateOrder(cart)
            : await this.sdk!.createOrder({ cart, recipient, delivery, sender, gift_message, currency });

          if (!result) {
            return this.errorContent(
              TOOL_NAMES.create_order,
              'Could not create order. One or more product IDs may be invalid or out of stock.',
              'Use kapruka_get_product to verify stock status before ordering.'
            );
          }

          this.context.orderIds.push(result.id);

          return this.textContent(JSON.stringify({
            orderId: result.id,
            checkoutUrl: result.checkout_url,
            total: `LKR ${result.total.toLocaleString()}`,
            currency: result.currency,
            items: result.items,
            status: result.status,
            expiresAt: result.expires_at,
            message: `G�� Order created! Complete payment at the checkout URL within 60 minutes to confirm your order.`,
          }));
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.events.error(TOOL_NAMES.create_order, error);
          return this.errorContent(
            TOOL_NAMES.create_order,
            error.message,
            'You may have reached the 30 orders/hour limit, or an item may be out of stock.'
          );
        }
      }
    );
  }

  // --- kapruka_track_order ---
  private registerTrackOrder(): void {
    this.server.registerTool(
      TOOL_NAMES.track_order,
      {
        description: `Track the status and delivery progress of an existing order.
Returns: current status (pending G�� processing G�� dispatched G�� delivered), item list, and timestamps.
Use the order ID from a create_order response or from the customer's confirmation email.`,
        inputSchema: TrackOrderSchema,
      },
      async ({ order_number }) => {
        const rateLimitError = this.rateLimiter.check();
        if (rateLimitError) return this.errorContent(TOOL_NAMES.track_order, rateLimitError);

        this.events.toolCall(TOOL_NAMES.track_order, { order_number });
        this.recordAction(TOOL_NAMES.track_order, { order_number });

        try {
          const result: Order | null = this.useMock
            ? mockTrackOrder(order_number)
            : await this.sdk!.trackOrder(order_number);

          if (!result) {
            return this.errorContent(
              TOOL_NAMES.track_order,
              `Order "${order_number}" not found.`,
              'Check the order ID from your confirmation email. Format: KAP-ORD-XXXX'
            );
          }

          return this.textContent(JSON.stringify({
            orderId: result.id,
            status: result.status,
            statusLabel: result.status.charAt(0).toUpperCase() + result.status.slice(1),
            items: result.items,
            total: `LKR ${result.total.toLocaleString()}`,
            currency: result.currency,
            createdAt: result.created_at,
            expiresAt: result.expires_at,
          }));
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.events.error(TOOL_NAMES.track_order, error);
          return this.errorContent(TOOL_NAMES.track_order, error.message);
        }
      }
    );
  }

  // --- kapruka_get_recommendations ---
  private registerGetRecommendations(): void {
    this.server.registerTool(
      TOOL_NAMES.get_recommendations,
      {
        description: `Recommends products that "go well" with items currently in the cart.
Examples: if a cake is in cart, suggests candles or flowers. If an iPhone is in cart, suggests cases or chargers.`,
        inputSchema: GetRecommendationsSchema,
      },
      async ({ limit }) => {
        this.recordAction(TOOL_NAMES.get_recommendations, { limit });
        this.refreshCartContext();

        if (this.context.cartItems.length === 0) {
          const fallback = await this.findAlternatives('gift', undefined, undefined, limit);
          return this.textContent(JSON.stringify({
            recommendations: fallback,
            message: 'Your cart is empty. Here are some popular gift ideas.'
          }));
        }

        const recommendations: Product[] = [];
        for (const item of this.context.cartItems) {
          // Rule-based upselling — uses category (works for both mock and live IDs)
          let query: string | undefined;
          const cat = item.productId.toLowerCase();
          if (cat.includes('cake') || cat.includes('cak')) query = 'topper candles';
          else if (cat.includes('flw') || cat.includes('flower') || cat.includes('rose')) query = 'vase greeting card';
          else if (cat.includes('elc') || cat.includes('elect') || cat.includes('phone') || cat.includes('apple')) query = 'case protector charger';
          else if (cat.includes('grc') || cat.includes('grocery') || cat.includes('snack')) query = 'snacks beverages';
          else if (cat.includes('toy') || cat.includes('kid')) query = 'board game puzzle';
          else if (cat.includes('beauty') || cat.includes('perfume')) query = 'skincare gift set';
          else if (cat.includes('book')) query = 'bookmark pen stationery';
          else query = 'gift hamper';

          if (query) {
            const matches = await this.findAlternatives(query, undefined, undefined, limit);
            for (const m of matches) {
              if (!recommendations.find(r => r.id === m.id) && !this.context.cartItems.find(c => c.productId === m.id)) {
                recommendations.push(m);
              }
              if (recommendations.length >= limit) break;
            }
          }
          if (recommendations.length >= limit) break;
        }

        // Final fallback if no specific rules matched
        if (recommendations.length < limit) {
          const general = await this.findAlternatives('gift hampers', 'gifts', undefined, limit - recommendations.length);
          recommendations.push(...general);
        }

        return this.textContent(JSON.stringify({
          recommendations: recommendations.slice(0, limit),
          context: `Based on your cart containing ${this.context.cartItems.map(i => i.name).join(', ')}`
        }));
      }
    );
  }

  // --- kapruka_convert_currency ---
  private registerConvertCurrency(): void {
    this.server.registerTool(
      TOOL_NAMES.convert_currency,
      {
        description: `Convert Sri Lankan Rupee (LKR) amounts to other currencies.
Supports: USD, AED, EUR, GBP, INR. Ideal for expats sending gifts home.`,
        inputSchema: ConvertCurrencySchema,
      },
      async ({ amount, to }) => {
        this.recordAction(TOOL_NAMES.convert_currency, { amount, to });

        // Mock exchange rates (LKR per 1 unit of target currency)
        const RATES: Record<string, number> = {
          USD: 310,
          AED: 84.5,
          EUR: 335,
          GBP: 390,
          INR: 3.7
        };

        const rate = RATES[to] || 1;
        const converted = amount / rate;

        return this.textContent(JSON.stringify({
          original: `LKR ${amount.toLocaleString()}`,
          converted: `${to} ${converted.toFixed(2)}`,
          rate: `1 ${to} = LKR ${rate}`,
          note: 'Rates are approximate and updated daily.'
        }));
      }
    );
  }

  // --- kapruka_get_analytics ---
  private registerGetAnalytics(): void {
    this.server.registerTool(
      TOOL_NAMES.get_analytics,
      {
        description: 'View trending products based on mentions, views, and cart additions.',
        inputSchema: {},
      },
      async () => {
        const stats = this.storage.getAnalytics(10);
        return this.textContent(JSON.stringify({
          trendingProducts: stats,
          totalActionsRecorded: this.storage.size(),
          note: 'This tool is for developers to monitor agent performance.'
        }));
      }
    );
  }

  // -------------------------------------------------------------------------
  // Resource registration (readable data endpoints for AI clients)
  // -------------------------------------------------------------------------

  private registerResources(): void {
    // Categories reference
    this.server.resource('categories', 'kapruka://categories', async () => {
      const categories = this.useMock
        ? mockListCategories()
        : await this.sdk!.listCategories();
      return {
        contents: [{
          uri: 'kapruka://categories',
          mimeType: 'application/json',
          text: JSON.stringify(categories),
        }],
      };
    });

    // Delivery cities reference
    this.server.resource('delivery-cities', 'kapruka://delivery-cities', async () => {
      const cities = this.useMock
        ? mockListDeliveryCities()
        : await this.sdk!.listDeliveryCities();
      return {
        contents: [{
          uri: 'kapruka://delivery-cities',
          mimeType: 'application/json',
          text: JSON.stringify(cities),
        }],
      };
    });

    // Live cart contents
    this.server.resource('cart', 'kapruka://cart', async () => {
      this.refreshCartContext();
      return {
        contents: [{
          uri: 'kapruka://cart',
          mimeType: 'application/json',
          text: JSON.stringify({
            items: this.context.cartItems,
            cartTotal: `LKR ${this.context.cartTotal.toLocaleString()}`,
            itemCount: this.context.cartItems.length,
          }),
        }],
      };
    });

    // Session metadata
    this.server.resource('session', 'kapruka://session', async () => ({
      contents: [{
        uri: 'kapruka://session',
        mimeType: 'application/json',
        text: JSON.stringify({
          lastSearchedCategory: this.context.lastSearchedCategory,
          lastViewedProduct: this.context.lastViewedProduct,
          deliveryCity: this.context.deliveryCity,
          searchHistory: this.context.searchHistory.slice(-10),
          orderIds: this.context.orderIds,
        }),
      }],
    }));
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Returns the underlying McpServer for transport attachment. */
  getServer(): McpServer {
    return this.server;
  }

  /** Returns a snapshot of the current session context. */
  getContext(): Readonly<SessionContext> {
    this.refreshCartContext();
    return { ...this.context };
  }

  /** Clears the in-memory response cache. */
  clearCache(): void {
    this.cache.clear();
  }

  /** Disconnects the remote SDK client (no-op in mock mode). */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.disconnect();
    }
  }
}
