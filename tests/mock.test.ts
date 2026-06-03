import { describe, it, expect } from 'vitest';
import {
  mockSearchProducts,
  mockGetProduct,
  mockListCategories,
  mockListDeliveryCities,
  mockCheckDelivery,
  mockCreateOrder,
  mockTrackOrder,
} from '../src/local/mock.js';

describe('Mock Functions', () => {
  describe('mockSearchProducts', () => {
    it('should search products by query', () => {
      const result = mockSearchProducts('rose');
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.query).toBe('rose');
    });

    it('should filter by category', () => {
      const result = mockSearchProducts('', 'flowers');
      expect(result.products.every(p => p.category === 'flowers')).toBe(true);
    });

    it('should return empty for no matches', () => {
      const result = mockSearchProducts('nonexistentxyz');
      expect(result.products.length).toBe(0);
    });
  });

  describe('mockGetProduct', () => {
    it('should return product by ID', () => {
      const product = mockGetProduct('KAP-FLW-001');
      expect(product).not.toBeNull();
      expect(product?.id).toBe('KAP-FLW-001');
    });

    it('should return null for non-existent product', () => {
      const product = mockGetProduct('NONEXISTENT');
      expect(product).toBeNull();
    });
  });

  describe('mockListCategories', () => {
    it('should return categories', () => {
      const categories = mockListCategories();
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('mockListDeliveryCities', () => {
    it('should return delivery cities', () => {
      const cities = mockListDeliveryCities();
      expect(cities.length).toBeGreaterThan(0);
    });
  });

  describe('mockCheckDelivery', () => {
    it('should check delivery for valid city and product', () => {
      const result = mockCheckDelivery('COL', 'KAP-FLW-001');
      expect(result).not.toBeNull();
      expect(result?.available).toBe(true);
    });

    it('should return null for invalid city', () => {
      const result = mockCheckDelivery('INVALID', 'KAP-FLW-001');
      expect(result).toBeNull();
    });
  });

  describe('mockCreateOrder', () => {
    it('should create order with valid items', () => {
      const result = mockCreateOrder([
        { product_id: 'KAP-FLW-001', quantity: 1 }
      ]);
      expect(result).not.toBeNull();
      expect(result?.items.length).toBe(1);
      expect(result?.status).toBe('pending');
    });

    it('should return null for empty items', () => {
      const result = mockCreateOrder([]);
      expect(result).toBeNull();
    });
  });

  describe('mockTrackOrder', () => {
    it('should track order by ID', () => {
      const result = mockTrackOrder('KAP-ORD-2501');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('KAP-ORD-2501');
    });
  });
});
