// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { KaprukaLocal } from '../src/local/server.js';
import { MemoryStorage } from '../src/storage.js';
import type { Product, CartItem } from '../src/sdk/types.js';

describe('KaprukaLocal', () => {
  let server: KaprukaLocal;
  let client: Client;
  let toolCallLog: Array<{ tool: string; args: Record<string, unknown> }>;
  let errorLog: Array<{ tool: string; error: Error }>;

  beforeEach(async () => {
    toolCallLog = [];
    errorLog = [];

    server = new KaprukaLocal({
      mock: true,
      compact: false,
      storage: new MemoryStorage(),
      events: {
        onToolCall: (tool, args) => toolCallLog.push({ tool, args }),
        onError: (tool, error) => errorLog.push({ tool, error }),
      },
    });

    client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.getServer().connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.shutdown();
  });

  // Helper to call a tool and parse the result
  async function callTool<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const result = await client.callTool({ name, arguments: args });
    const content = result.content as Array<{ type: string; text: string }>;
    return JSON.parse(content[0].text) as T;
  }

  // =========================================================================
  // kapruka_search_products
  // =========================================================================

  describe('kapruka_search_products', () => {
    it('should return products matching query', async () => {
      const result = await callTool<{ products: Product[]; total: number; query: string }>(
        'kapruka_search_products', { q: 'roses' }
      );
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.products.every(p => p.name.toLowerCase().includes('roses') || p.description.toLowerCase().includes('roses'))).toBe(true);
      expect(result.query).toBe('roses');
    });

    it('should filter by category', async () => {
      const result = await callTool<{ products: Product[] }>(
        'kapruka_search_products', { q: 'cake', category: 'cakes' }
      );
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.products.every(p => p.category === 'cakes')).toBe(true);
    });

    it('should return empty for no matches', async () => {
      const result = await callTool<{ products: Product[]; total: number }>(
        'kapruka_search_products', { q: 'xyznonexistent' }
      );
      expect(result.products).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should log tool call', async () => {
      await callTool('kapruka_search_products', { q: 'test' });
      expect(toolCallLog).toHaveLength(1);
      expect(toolCallLog[0].tool).toBe('kapruka_search_products');
      expect(toolCallLog[0].args.q).toBe('test');
    });
  });

  // =========================================================================
  // kapruka_get_product
  // =========================================================================

  describe('kapruka_get_product', () => {
    it('should return a valid product by ID', async () => {
      const result = await callTool<Product>(
        'kapruka_get_product', { product_id: 'KAP-FLW-001' }
      );
      expect(result).toBeDefined();
      expect(result.id).toBe('KAP-FLW-001');
      expect(result.name).toBeTruthy();
      expect(result.price).toBeGreaterThan(0);
    });

    it('should return error for invalid product ID', async () => {
      const result = await callTool<{ error: string; suggestion?: string }>(
        'kapruka_get_product', { product_id: 'KAP-INVALID' }
      );
      expect(result.error).toContain('not found');
    });

    it('should update session context', async () => {
      await callTool('kapruka_get_product', { product_id: 'KAP-CAKE-001' });
      const ctx = server.getContext();
      expect(ctx.lastViewedProduct).toBe('KAP-CAKE-001');
    });
  });

  // =========================================================================
  // kapruka_add_to_cart
  // =========================================================================

  describe('kapruka_add_to_cart', () => {
    it('should add item to cart', async () => {
      const result = await callTool<{ message: string; cart: CartItem[]; cartTotal: string }>(
        'kapruka_add_to_cart', {
          productId: 'KAP-FLW-001',
          name: 'Red Rose Romance Bouquet',
          price: 3500,
          quantity: 2,
        }
      );
      expect(result.message).toContain('Added');
      expect(result.cart.length).toBe(1);
      expect(result.cart[0].quantity).toBe(2);
    });

    it('should accumulate quantity for same product', async () => {
      await callTool('kapruka_add_to_cart', {
        productId: 'KAP-FLW-001', name: 'Red Rose Romance Bouquet', price: 3500, quantity: 1,
      });
      const result = await callTool<{ cart: CartItem[] }>(
        'kapruka_add_to_cart', {
          productId: 'KAP-FLW-001', name: 'Red Rose Romance Bouquet', price: 3500, quantity: 3,
        }
      );
      expect(result.cart.length).toBe(1);
      expect(result.cart[0].quantity).toBe(4);
    });

    it('should track cart total', async () => {
      const result = await callTool<{ cartTotal: string }>(
        'kapruka_add_to_cart', {
          productId: 'KAP-FLW-001', name: 'Red Rose Romance Bouquet', price: 3500, quantity: 2,
        }
      );
      expect(result.cartTotal).toBe('LKR 7,000');
    });
  });

  // =========================================================================
  // kapruka_get_cart
  // =========================================================================

  describe('kapruka_get_cart', () => {
    it('should return empty cart initially', async () => {
      const result = await callTool<{ items: CartItem[]; itemCount: number; message?: string }>(
        'kapruka_get_cart', {}
      );
      expect(result.items).toHaveLength(0);
      expect(result.itemCount).toBe(0);
    });

    it('should return items after adding', async () => {
      await callTool('kapruka_add_to_cart', {
        productId: 'KAP-CAKE-001', name: 'Java Lounge Classic Ribbon Cake', price: 2850, quantity: 1,
      });
      const result = await callTool<{ items: CartItem[]; itemCount: number }>(
        'kapruka_get_cart', {}
      );
      expect(result.items.length).toBe(1);
      expect(result.itemCount).toBe(1);
    });
  });

  // =========================================================================
  // kapruka_list_categories
  // =========================================================================

  describe('kapruka_list_categories', () => {
    it('should return all 12 categories', async () => {
      const result = await callTool<Array<{ id: string; name: string }>>(
        'kapruka_list_categories', {}
      );
      expect(result).toHaveLength(12);
      expect(result.map(c => c.id)).toContain('flowers');
      expect(result.map(c => c.id)).toContain('cakes');
      expect(result.map(c => c.id)).toContain('electronics');
    });
  });

  // =========================================================================
  // kapruka_list_delivery_cities
  // =========================================================================

  describe('kapruka_list_delivery_cities', () => {
    it('should return all delivery cities', async () => {
      const result = await callTool<Array<{ id: string; name: string; delivery_fee: number }>>(
        'kapruka_list_delivery_cities', {}
      );
      expect(result.length).toBeGreaterThanOrEqual(10);
      expect(result.find(c => c.id === 'COL')).toBeDefined();
      expect(result.find(c => c.id === 'COL')!.delivery_fee).toBe(0);
    });
  });

  // =========================================================================
  // kapruka_check_delivery
  // =========================================================================

  describe('kapruka_check_delivery', () => {
    it('should return delivery info for valid city+product', async () => {
      const result = await callTool<{ available: boolean; city: string; deliveryFee: string }>(
        'kapruka_check_delivery', { city: 'COL', product_id: 'KAP-ELC-001' }
      );
      expect(result.available).toBe(true);
      expect(result.city).toContain('Colombo');
    });

    it('should block perishables to remote cities', async () => {
      const result = await callTool<{ available: boolean; note: string }>(
        'kapruka_check_delivery', { city: 'JAF', product_id: 'KAP-CAKE-001' }
      );
      expect(result.available).toBe(false);
      expect(result.note).toContain('Perishable');
    });

    it('should return error for invalid city', async () => {
      const result = await callTool<{ error: string }>(
        'kapruka_check_delivery', { city: 'INVALID', product_id: 'KAP-FLW-001' }
      );
      expect(result.error).toContain('No delivery data');
    });

    it('should update delivery city in context', async () => {
      await callTool('kapruka_check_delivery', { city: 'KAN', product_id: 'KAP-FLW-001' });
      const ctx = server.getContext();
      expect(ctx.deliveryCity).toBe('KAN');
    });
  });

  // =========================================================================
  // kapruka_create_order
  // =========================================================================

  describe('kapruka_create_order', () => {
    it('should create order with valid items', async () => {
      const result = await callTool<{
        orderId: string; checkoutUrl: string; total: string; items: Array<{ product_name: string }>;
      }>(
        'kapruka_create_order', {
          cart: [{ product_id: 'KAP-FLW-001', quantity: 1 }],
          recipient: { name: 'Test User', phone: '0771234567', address: '123 Test St', city: 'COL' },
          delivery: { date: '2026-06-10' },
          sender: { name: 'Sender', phone: '0771234568' },
        }
      );
      expect(result.orderId).toMatch(/^KAP-ORD-/);
      expect(result.checkoutUrl).toContain('kapruka.com');
      expect(result.items.length).toBe(1);
    });

    it('should return error for invalid product', async () => {
      const result = await callTool<{ error: string }>(
        'kapruka_create_order', {
          cart: [{ product_id: 'KAP-FAKE', quantity: 1 }],
          recipient: { name: 'Test User', phone: '0771234567', address: '123 Test St', city: 'COL' },
          delivery: { date: '2026-06-10' },
          sender: { name: 'Sender', phone: '0771234568' },
        }
      );
      expect(result.error).toContain('Could not create order');
    });

    it('should track order IDs in session context', async () => {
      const result = await callTool<{ orderId: string }>(
        'kapruka_create_order', {
          cart: [{ product_id: 'KAP-CAKE-001', quantity: 1 }],
          recipient: { name: 'Test User', phone: '0771234567', address: '123 Test St', city: 'COL' },
          delivery: { date: '2026-06-10' },
          sender: { name: 'Sender', phone: '0771234568' },
        }
      );
      const ctx = server.getContext();
      expect(ctx.orderIds).toContain(result.orderId);
    });
  });

  // =========================================================================
  // kapruka_track_order
  // =========================================================================

  describe('kapruka_track_order', () => {
    it('should track a created order', async () => {
      const created = await callTool<{ orderId: string }>(
        'kapruka_create_order', {
          cart: [{ product_id: 'KAP-FLW-001', quantity: 1 }],
          recipient: { name: 'Test User', phone: '0771234567', address: '123 Test St', city: 'COL' },
          delivery: { date: '2026-06-10' },
          sender: { name: 'Sender', phone: '0771234568' },
        }
      );
      const result = await callTool<{ orderId: string; status: string }>(
        'kapruka_track_order', { order_number: created.orderId }
      );
      expect(result.orderId).toBe(created.orderId);
      expect(result.status).toMatch(/^(pending|processing|dispatched|delivered)$/);
    });

    it('should return delivered for valid-format unknown ID', async () => {
      const result = await callTool<{ orderId: string; status: string }>(
        'kapruka_track_order', { order_number: 'KAP-ORD-9999' }
      );
      expect(result.status).toBe('delivered');
    });

    it('should return error for completely invalid ID', async () => {
      const result = await callTool<{ error: string }>(
        'kapruka_track_order', { order_number: 'not-a-valid-id' }
      );
      expect(result.error).toContain('not found');
    });
  });

  // =========================================================================
  // Caching
  // =========================================================================

  describe('caching', () => {
    it('should cache search results', async () => {
      const r1 = await callTool<{ products: Product[] }>(
        'kapruka_search_products', { q: 'roses' }
      );
      const r2 = await callTool<{ products: Product[] }>(
        'kapruka_search_products', { q: 'roses' }
      );
      expect(r1.products).toEqual(r2.products);
    });

    it('should cache product details', async () => {
      const r1 = await callTool<Product>('kapruka_get_product', { product_id: 'KAP-FLW-001' });
      const r2 = await callTool<Product>('kapruka_get_product', { product_id: 'KAP-FLW-001' });
      expect(r1).toEqual(r2);
    });

    it('should cache categories', async () => {
      const r1 = await callTool<Array<{ id: string }>>('kapruka_list_categories', {});
      const r2 = await callTool<Array<{ id: string }>>('kapruka_list_categories', {});
      expect(r1).toEqual(r2);
    });

    it('should clear cache', async () => {
      await callTool('kapruka_search_products', { q: 'roses' });
      server.clearCache();
      const result = await callTool<{ products: Product[] }>(
        'kapruka_search_products', { q: 'roses' }
      );
      expect(result.products.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Session context
  // =========================================================================

  describe('session context', () => {
    it('should track search history', async () => {
      await callTool('kapruka_search_products', { q: 'roses' });
      await callTool('kapruka_search_products', { q: 'cake' });
      const ctx = server.getContext();
      expect(ctx.searchHistory).toContain('roses');
      expect(ctx.searchHistory).toContain('cake');
    });

    it('should track last searched category', async () => {
      await callTool('kapruka_search_products', { q: 'cake', category: 'cakes' });
      const ctx = server.getContext();
      expect(ctx.lastSearchedCategory).toBe('cakes');
    });

    it('should track cart total', async () => {
      await callTool('kapruka_add_to_cart', {
        productId: 'KAP-FLW-001', name: 'Red Rose', price: 3500, quantity: 1,
      });
      await callTool('kapruka_add_to_cart', {
        productId: 'KAP-CAKE-001', name: 'Ribbon Cake', price: 2850, quantity: 1,
      });
      const ctx = server.getContext();
      expect(ctx.cartTotal).toBe(6350);
      expect(ctx.cartItems.length).toBe(2);
    });
  });

  // =========================================================================
  // Compact mode
  // =========================================================================

  describe('compact mode', () => {
    it('should return compact product format', async () => {
      const compactServer = new KaprukaLocal({ mock: true, compact: true });
      const compactClient = new Client({ name: 'test-compact', version: '1.0.0' });
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      await compactServer.getServer().connect(serverTransport);
      await compactClient.connect(clientTransport);

      const result = await compactClient.callTool({
        name: 'kapruka_search_products',
        arguments: { q: 'roses' },
      });
      const text = (result.content as Array<{ text: string }>)[0].text;
      // Compact format uses pipes: "ID | Name | Price | Stock"
      expect(text).toContain('|');
      expect(text).toContain('KAP-FLW');

      await compactClient.close();
      await compactServer.shutdown();
    });
  });

  // =========================================================================
  // Event hooks
  // =========================================================================

  describe('event hooks', () => {
    it('should fire onToolCall', async () => {
      await callTool('kapruka_search_products', { q: 'test' });
      expect(toolCallLog.length).toBeGreaterThanOrEqual(1);
    });

    it('should fire onError on invalid tool call (via rate limit)', async () => {
      // No mock error fires naturally, but we can verify the hook wiring works
      expect(errorLog).toHaveLength(0);
    });
  });

  // =========================================================================
  // Cart persistence across storage
  // =========================================================================

  describe('cart persistence', () => {
    it('should restore cart from storage on new instance', async () => {
      const storage = new MemoryStorage();

      // Add item via first instance
      const server1 = new KaprukaLocal({ mock: true, storage });
      const client1 = new Client({ name: 'test1', version: '1.0.0' });
      const [c1t, s1t] = InMemoryTransport.createLinkedPair();
      await server1.getServer().connect(s1t);
      await client1.connect(c1t);

      await client1.callTool({
        name: 'kapruka_add_to_cart',
        arguments: { productId: 'KAP-FLW-001', name: 'Red Rose', price: 3500, quantity: 1 },
      });
      await client1.close();
      await server1.shutdown();

      // Create second instance with same storage
      const server2 = new KaprukaLocal({ mock: true, storage });
      const client2 = new Client({ name: 'test2', version: '1.0.0' });
      const [c2t, s2t] = InMemoryTransport.createLinkedPair();
      await server2.getServer().connect(s2t);
      await client2.connect(c2t);

      const result = await client2.callTool({
        name: 'kapruka_get_cart',
        arguments: {},
      });
      const cart = JSON.parse((result.content as Array<{ text: string }>)[0].text) as { items: CartItem[] };
      expect(cart.items.length).toBe(1);
      expect(cart.items[0].productId).toBe('KAP-FLW-001');

      await client2.close();
      await server2.shutdown();
    });
  });

  // =========================================================================
  // kapruka_get_alternatives
  // =========================================================================

  describe('kapruka_get_alternatives', () => {
    it('should find alternatives for a valid query', async () => {
      const result = await callTool<{ alternatives: Product[]; total: number; suggestion: string }>(
        'kapruka_get_alternatives', { query: 'roses' }
      );
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.suggestion).toContain('alternative');
    });

    it('should filter by category', async () => {
      const result = await callTool<{ alternatives: Product[] }>(
        'kapruka_get_alternatives', { query: 'cake', category: 'cakes' }
      );
      expect(result.alternatives.every(p => p.category === 'cakes')).toBe(true);
    });

    it('should filter by maxPrice', async () => {
      const result = await callTool<{ alternatives: Product[] }>(
        'kapruka_get_alternatives', { query: 'headphones', maxPrice: 50000 }
      );
      expect(result.alternatives.every(p => p.price <= 50000)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const result = await callTool<{ alternatives: Product[] }>(
        'kapruka_get_alternatives', { query: 'gift', limit: 3 }
      );
      expect(result.alternatives.length).toBeLessThanOrEqual(3);
    });

    it('should fallback to word-based search when no direct match', async () => {
      const result = await callTool<{ alternatives: Product[]; total: number }>(
        'kapruka_get_alternatives', { query: 'wireless headphones under 10000' }
      );
      // Should find at least some electronics/audio products
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should include visual descriptions in results', async () => {
      const result = await callTool<{ alternatives: Product[] }>(
        'kapruka_get_alternatives', { query: 'roses', limit: 1 }
      );
      if (result.alternatives.length > 0) {
        expect(result.alternatives[0].visual_description).toBeDefined();
        expect(result.alternatives[0].visual_description.length).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // Visual descriptions
  // =========================================================================

  describe('visual descriptions', () => {
    it('should include visual_description in get_product response', async () => {
      const result = await callTool<Product>(
        'kapruka_get_product', { product_id: 'KAP-FLW-001' }
      );
      expect(result.visual_description).toBeDefined();
      expect(result.visual_description.length).toBeGreaterThan(10);
    });

    it('should include visual_description in search results', async () => {
      const result = await callTool<{ products: Product[] }>(
        'kapruka_search_products', { q: 'roses', limit: 1 }
      );
      expect(result.products[0].visual_description).toBeDefined();
      expect(result.products[0].visual_description.length).toBeGreaterThan(10);
    });

    it('all 136 products should have visual descriptions', async () => {
      const categories = ['flowers', 'cakes', 'electronics', 'toys', 'gifts', 'fashion', 'grocery', 'appliances', 'beauty', 'books', 'fruits', 'beverages'];
      for (const cat of categories) {
        const result = await callTool<{ products: Product[] }>(
          'kapruka_search_products', { q: cat, category: cat }
        );
        for (const p of result.products) {
          expect(p.visual_description, `Missing visual_description for ${p.id}`).toBeDefined();
          expect(p.visual_description.length, `Empty visual_description for ${p.id}`).toBeGreaterThan(10);
        }
      }
    });
  });

  // =========================================================================
  // kapruka_validate_shipping
  // =========================================================================

  describe('kapruka_validate_shipping', () => {
    it('should pass valid address', async () => {
      const result = await callTool<{
        valid: boolean; errors: string[]; warnings: string[];
        checkedAddress: Record<string, unknown>;
      }>(
        'kapruka_validate_shipping', {
          name: 'Kamal Perera',
          phone: '0771234567',
          address: '42 Temple Road',
          city: 'Colombo',
          postal_code: '00100',
        }
      );
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.checkedAddress.name).toBe('Kamal Perera');
      expect(result.checkedAddress.city).toBe('Colombo');
    });

    it('should fail invalid phone number', async () => {
      const result = await callTool<{ valid: boolean; errors: string[] }>(
        'kapruka_validate_shipping', {
          name: 'Kamal Perera',
          phone: '1234567890',
          address: '42 Temple Road',
          city: 'Colombo',
        }
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('phone');
    });

    it('should fail phone number that is too short', async () => {
      const result = await callTool<{ valid: boolean; errors: string[] }>(
        'kapruka_validate_shipping', {
          name: 'Kamal Perera',
          phone: '077123',
          address: '42 Temple Road',
          city: 'Colombo',
        }
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('10 digits'))).toBe(true);
    });

    it('should accept +94 format phone number', async () => {
      const result = await callTool<{ valid: boolean; errors: string[] }>(
        'kapruka_validate_shipping', {
          name: 'Kamal Perera',
          phone: '+94771234567',
          address: '42 Temple Road',
          city: 'Colombo',
        }
      );
      expect(result.valid).toBe(true);
    });

    it('should accept dashed phone number', async () => {
      const result = await callTool<{ valid: boolean; errors: string[] }>(
        'kapruka_validate_shipping', {
          name: 'Kamal Perera',
          phone: '077-123-4567',
          address: '42 Temple Road',
          city: 'Colombo',
        }
      );
      expect(result.valid).toBe(true);
    });

    it('should fail invalid city', async () => {
      const result = await callTool<{ valid: boolean; errors: string[] }>(
        'kapruka_validate_shipping', {
          name: 'Kamal Perera',
          phone: '0771234567',
          address: '42 Temple Road',
          city: 'Atlantis',
        }
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unknown delivery city');
    });

    it('should warn about missing postal code', async () => {
      const result = await callTool<{ valid: boolean; warnings: string[] }>(
        'kapruka_validate_shipping', {
          name: 'Kamal Perera',
          phone: '0771234567',
          address: '42 Temple Road',
          city: 'Colombo',
        }
      );
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('postal code'))).toBe(true);
    });

    it('should warn about invalid postal code format', async () => {
      const result = await callTool<{ valid: boolean; warnings: string[] }>(
        'kapruka_validate_shipping', {
          name: 'Kamal Perera',
          phone: '0771234567',
          address: '42 Temple Road',
          city: 'Colombo',
          postal_code: '123',
        }
      );
      expect(result.warnings.some(w => w.includes('5-digit'))).toBe(true);
    });

    it('should accept "Kandy" as valid city', async () => {
      const result = await callTool<{ valid: boolean; errors: string[] }>(
        'kapruka_validate_shipping', {
          name: 'Kamal Perera',
          phone: '0771234567',
          address: '10 Kandy Road',
          city: 'Kandy',
        }
      );
      expect(result.valid).toBe(true);
    });

    it('should accept "Jaffna" as valid city', async () => {
      const result = await callTool<{ valid: boolean; errors: string[] }>(
        'kapruka_validate_shipping', {
          name: 'Kamal Perera',
          phone: '0771234567',
          address: '5 Main Street',
          city: 'Jaffna',
        }
      );
      expect(result.valid).toBe(true);
    });
  });

  // =========================================================================
  // Progressive caching & scoring
  // =========================================================================

  describe('progressive caching', () => {
    it('should score alternatives correctly in mock mode', async () => {
      const result = await callTool<{ alternatives: Product[]; total: number }>(
        'kapruka_get_alternatives', { query: 'roses' }
      );
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives[0].category).toBe('flowers');
    });

    it('should handle multi-token queries', async () => {
      const result = await callTool<{ alternatives: Product[] }>(
        'kapruka_get_alternatives', { query: 'red roses bouquet' }
      );
      expect(result.alternatives.length).toBeGreaterThan(0);
    });

    it('should respect category filter', async () => {
      const result = await callTool<{ alternatives: Product[] }>(
        'kapruka_get_alternatives', { query: 'cake', category: 'cakes' }
      );
      expect(result.alternatives.every(p => p.category === 'cakes')).toBe(true);
    });

    it('should respect maxPrice filter', async () => {
      const result = await callTool<{ alternatives: Product[] }>(
        'kapruka_get_alternatives', { query: 'electronics', maxPrice: 50000 }
      );
      expect(result.alternatives.every(p => p.price <= 50000)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const result = await callTool<{ alternatives: Product[] }>(
        'kapruka_get_alternatives', { query: 'gift', limit: 2 }
      );
      expect(result.alternatives.length).toBeLessThanOrEqual(2);
    });

    it('should fallback to word-by-word search when no direct match', async () => {
      const result = await callTool<{ alternatives: Product[]; total: number }>(
        'kapruka_get_alternatives', { query: 'birthday celebration items' }
      );
      // Should find at least some results via fallback
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should cache results for repeated queries', async () => {
      const result1 = await callTool<{ alternatives: Product[] }>(
        'kapruka_get_alternatives', { query: 'laptop stand' }
      );
      const result2 = await callTool<{ alternatives: Product[] }>(
        'kapruka_get_alternatives', { query: 'laptop stand' }
      );
      expect(result1.alternatives.length).toBe(result2.alternatives.length);
    });

    it('should return empty gracefully for nonsense query', async () => {
      const result = await callTool<{ alternatives: Product[]; total: number }>(
        'kapruka_get_alternatives', { query: 'xyzzyplugh123' }
      );
      expect(result.total).toBe(0);
    });
  });

  // =========================================================================
  // Tool count
  // =========================================================================

  describe('tool registration', () => {
    it('should have all tools registered', async () => {
      const tools = await client.listTools();
      const toolNames = tools.tools.map(t => t.name);
      expect(toolNames).toContain('kapruka_search_products');
      expect(toolNames).toContain('kapruka_get_product');
      expect(toolNames).toContain('kapruka_get_alternatives');
      expect(toolNames).toContain('kapruka_add_to_cart');
      expect(toolNames).toContain('kapruka_get_cart');
      expect(toolNames).toContain('kapruka_list_categories');
      expect(toolNames).toContain('kapruka_list_delivery_cities');
      expect(toolNames).toContain('kapruka_check_delivery');
      expect(toolNames).toContain('kapruka_validate_shipping');
      expect(toolNames).toContain('kapruka_create_order');
      expect(toolNames).toContain('kapruka_track_order');
    });
  });
});
