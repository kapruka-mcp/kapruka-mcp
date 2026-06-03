import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { KaprukaLocal } from '../src/local/server.js';
import { KaprukaSDK } from '../src/sdk/client.js';
import { MemoryStorage } from '../src/storage.js';
import type { Product, SearchResult, Category, DeliveryCity, CartItem } from '../src/sdk/types.js';

/**
 * KaprukaSDK tests.
 *
 * The SDK is designed to connect to a real MCP server via HTTP.
 * For unit testing, we create a KaprukaLocal mock server, connect
 * a Client via InMemoryTransport, then inject that client into the
 * SDK instance to bypass the HTTP layer.
 */
describe('KaprukaSDK', () => {
  let sdk: KaprukaSDK;
  let mockServer: KaprukaLocal;
  let client: Client;

  beforeEach(async () => {
    mockServer = new KaprukaLocal({
      mock: true,
      storage: new MemoryStorage(),
    });

    // Create a client and connect it to our mock server via in-memory transport
    client = new Client({ name: 'sdk-test', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await mockServer.getServer().connect(serverTransport);
    await client.connect(clientTransport);

    // Create SDK instance and inject the connected client
    sdk = new KaprukaSDK();
    // Inject the connected client and mark as connected
    const sdkAny = sdk as unknown as {
      client: Client;
      connected: boolean;
      transport: null;
    };
    sdkAny.client = client;
    sdkAny.connected = true;
    sdkAny.transport = null;
  });

  afterEach(async () => {
    try { await client.close(); } catch { /* ignore */ }
    await mockServer.shutdown();
  });

  // =========================================================================
  // searchProducts
  // =========================================================================

  describe('searchProducts', () => {
    it('should return search results', async () => {
      const result = await sdk.searchProducts('roses');
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.query).toBe('roses');
    });

    it('should filter by category', async () => {
      const result = await sdk.searchProducts('cake', 'cakes');
      expect(result.products.every(p => p.category === 'cakes')).toBe(true);
    });
  });

  // =========================================================================
  // getProduct
  // =========================================================================

  describe('getProduct', () => {
    it('should return product for valid ID', async () => {
      const product = await sdk.getProduct('KAP-FLW-001');
      expect(product).not.toBeNull();
      expect(product.id).toBe('KAP-FLW-001');
    });

    it('should throw error for invalid ID', async () => {
      await expect(sdk.getProduct('KAP-NONEXISTENT')).rejects.toThrow();
    });
  });

  // =========================================================================
  // addToCart
  // =========================================================================

  describe('addToCart', () => {
    it('should add item to cart', async () => {
      const result = await sdk.addToCart('KAP-FLW-001', 'Red Rose', 3500, 2);
      expect(result.cart.length).toBe(1);
      expect(result.cart[0].quantity).toBe(2);
    });
  });

  // =========================================================================
  // getCart
  // =========================================================================

  describe('getCart', () => {
    it('should return empty cart initially', async () => {
      const cart = await sdk.getCart();
      expect(cart).toBeDefined();
      // The local server returns { items: [], ... } but SDK expects CartItem[]
      // In mock mode the response is the full get_cart response object
      const items = Array.isArray(cart) ? cart : (cart as unknown as { items: CartItem[] }).items;
      expect(items).toHaveLength(0);
    });
  });

  // =========================================================================
  // listCategories
  // =========================================================================

  describe('listCategories', () => {
    it('should return categories array', async () => {
      const categories = await sdk.listCategories();
      expect(categories.length).toBe(12);
      expect(categories.some(c => c.id === 'flowers')).toBe(true);
    });
  });

  // =========================================================================
  // listDeliveryCities
  // =========================================================================

  describe('listDeliveryCities', () => {
    it('should return delivery cities', async () => {
      const cities = await sdk.listDeliveryCities();
      expect(cities.length).toBeGreaterThanOrEqual(10);
      expect(cities.some(c => c.id === 'COL')).toBe(true);
    });
  });

  // =========================================================================
  // checkDelivery
  // =========================================================================

  describe('checkDelivery', () => {
    it('should return delivery info for valid combo', async () => {
      const result = await sdk.checkDelivery('COL', 'KAP-FLW-001');
      expect(result).not.toBeNull();
      expect(result.available).toBe(true);
    });

    it('should throw error for invalid city', async () => {
      await expect(sdk.checkDelivery('INVALID', 'KAP-FLW-001')).rejects.toThrow();
    });
  });

  // =========================================================================
  // createOrder
  // =========================================================================

  describe('createOrder', () => {
    it('should create an order', async () => {
      const order = await sdk.createOrder({
        cart: [{ product_id: 'KAP-FLW-001', quantity: 1 }],
        recipient: { name: 'Test User', phone: '0771234567', address: '123 Test St', city: 'COL' },
        delivery: { date: '2026-06-10' },
        sender: { name: 'Sender', phone: '0771234568' },
      });
      expect(order).toBeDefined();
      const orderId = (order as unknown as { orderId?: string }).orderId ?? order.id;
      expect(orderId).toMatch(/^KAP-ORD-/);
    });
  });

  // =========================================================================
  // trackOrder
  // =========================================================================

  describe('trackOrder', () => {
    it('should track a created order', async () => {
      const order = await sdk.createOrder({
        cart: [{ product_id: 'KAP-FLW-001', quantity: 1 }],
        recipient: { name: 'Test User', phone: '0771234567', address: '123 Test St', city: 'COL' },
        delivery: { date: '2026-06-10' },
        sender: { name: 'Sender', phone: '0771234568' },
      });
      const orderId = (order as unknown as { orderId?: string }).orderId ?? order.id;
      const tracked = await sdk.trackOrder(orderId!);
      expect(tracked).toBeDefined();
      const trackedId = (tracked as unknown as { orderId?: string }).orderId ?? tracked.id;
      expect(trackedId).toBe(orderId);
    });

    it('should return delivered for unknown valid-format ID', async () => {
      const tracked = await sdk.trackOrder('KAP-ORD-9999');
      expect(tracked).not.toBeNull();
      expect(tracked.status).toBe('delivered');
    });
  });

  // =========================================================================
  // listTools
  // =========================================================================

  describe('listTools', () => {
    it('should list available tools', async () => {
      const tools = await sdk.listTools();
      expect(tools).toContain('kapruka_search_products');
      expect(tools).toContain('kapruka_get_product');
      expect(tools).toContain('kapruka_get_alternatives');
      expect(tools).toContain('kapruka_add_to_cart');
      expect(tools.length).toBeGreaterThanOrEqual(10);
    });
  });

  // =========================================================================
  // disconnect
  // =========================================================================

  describe('disconnect', () => {
    it('should disconnect cleanly', async () => {
      await sdk.disconnect();
    });

    it('should be idempotent', async () => {
      await sdk.disconnect();
      await sdk.disconnect();
    });
  });

  // =========================================================================
  // Error handling in callTool
  // =========================================================================

  describe('error handling', () => {
    it('should handle getProduct with invalid ID', async () => {
      await expect(sdk.getProduct('KAP-INVALID-XYZ')).rejects.toThrow();
    });

    it('should handle checkDelivery with invalid data', async () => {
      await expect(sdk.checkDelivery('NOPE', 'NOPE')).rejects.toThrow();
    });
  });
});
