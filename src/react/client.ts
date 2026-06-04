// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import { KaprukaSDK } from '../sdk/client.js';
import type {
  Product,
  Category,
  DeliveryCity,
  DeliveryCheck,
  Order,
  SearchResult,
  CartItem,
  ShippingAddress,
  ShippingValidation,
  CreateOrderRequest,
} from '../sdk/types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KaprukaClientConfig {
  mode: 'rest' | 'sdk';
  baseUrl?: string;
  mcpUrl?: string;
  sessionId?: string;
}

interface RestResponse<T> {
  success: boolean;
  data: T;
  sessionId: string;
  error?: string;
  suggestion?: string;
}

// ---------------------------------------------------------------------------
// KaprukaClient
// ---------------------------------------------------------------------------

export class KaprukaClient {
  private readonly mode: 'rest' | 'sdk';
  private readonly baseUrl: string;
  private readonly sdk: KaprukaSDK | null = null;
  private _sessionId: string;

  constructor(config: KaprukaClientConfig) {
    this.mode = config.mode;
    this.baseUrl = config.baseUrl ?? 'http://localhost:3001';
    this._sessionId = config.sessionId ?? crypto.randomUUID();

    if (config.mode === 'sdk') {
      this.sdk = new KaprukaSDK({ mcpUrl: config.mcpUrl });
    }
  }

  get sessionId(): string {
    return this._sessionId;
  }

  set sessionId(id: string) {
    this._sessionId = id;
  }

  // -------------------------------------------------------------------------
  // REST helpers
  // -------------------------------------------------------------------------

  private async restFetch<T>(path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Session-ID': this._sessionId,
    };

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json: RestResponse<T> = await res.json();

    if (json.sessionId && json.sessionId !== 'none') {
      this._sessionId = json.sessionId;
    }

    if (!json.success) {
      throw Object.assign(new Error(json.error ?? 'Request failed'), {
        tool: json.suggestion,
      });
    }

    return json.data;
  }

  // -------------------------------------------------------------------------
  // Read-only tools
  // -------------------------------------------------------------------------

  async searchProducts(q: string, opts?: { category?: string; limit?: number }): Promise<SearchResult> {
    if (this.mode === 'sdk' && this.sdk) {
      return this.sdk.searchProducts(q, opts?.category);
    }
    return this.restFetch<SearchResult>('/api/search', {
      q,
      ...(opts?.category ? { category: opts.category } : {}),
      ...(opts?.limit ? { limit: opts.limit } : {}),
    });
  }

  async getProduct(productId: string): Promise<Product> {
    if (this.mode === 'sdk' && this.sdk) {
      return this.sdk.getProduct(productId);
    }
    return this.restFetch<Product>('/api/product', { product_id: productId });
  }

  async getAlternatives(query: string, opts?: { category?: string; maxPrice?: number; limit?: number }): Promise<SearchResult> {
    if (this.mode === 'sdk' && this.sdk) {
      return this.sdk.searchProducts(query, opts?.category);
    }
    return this.restFetch<SearchResult>('/api/alternatives', {
      query,
      ...(opts?.category ? { category: opts.category } : {}),
      ...(opts?.maxPrice ? { maxPrice: opts.maxPrice } : {}),
      ...(opts?.limit ? { limit: opts.limit } : {}),
    });
  }

  async listCategories(): Promise<Category[]> {
    if (this.mode === 'sdk' && this.sdk) {
      return this.sdk.listCategories();
    }
    return this.restFetch<Category[]>('/api/categories');
  }

  async listDeliveryCities(): Promise<DeliveryCity[]> {
    if (this.mode === 'sdk' && this.sdk) {
      return this.sdk.listDeliveryCities();
    }
    return this.restFetch<DeliveryCity[]>('/api/cities');
  }

  async checkDelivery(city: string, productId: string): Promise<DeliveryCheck> {
    if (this.mode === 'sdk' && this.sdk) {
      return this.sdk.checkDelivery(city, productId);
    }
    return this.restFetch<DeliveryCheck>('/api/delivery/check', {
      city,
      product_id: productId,
    });
  }

  async validateShipping(address: ShippingAddress): Promise<ShippingValidation> {
    if (this.mode === 'sdk' && this.sdk) {
      // Official server has no validate_shipping; use check_delivery to verify city
      try {
        const cities = await this.sdk.listDeliveryCities();
        const match = cities.find(
          c => c.name.toLowerCase() === address.city.toLowerCase()
        );
        if (match) {
          return { valid: true, errors: [], warnings: [] };
        }
        return {
          valid: false,
          errors: [`City "${address.city}" is not in the delivery area`],
          warnings: [],
          suggestion: 'Check available cities with listDeliveryCities()',
        };
      } catch {
        return { valid: true, errors: [], warnings: ['Could not validate city against official server'] };
      }
    }
    return this.restFetch<ShippingValidation>('/api/shipping/validate', address);
  }

  async convertCurrency(amount: number, to: string): Promise<{ converted: string; rate: string; source: string }> {
    if (this.mode === 'sdk' && this.sdk) {
      // Use Frankfurter API directly for live currency conversion
      const FrankFurterRate = 'https://api.frankfurter.dev/v2/rate/USD/LKR';
      try {
        const res = await fetch(FrankFurterRate);
        const data = await res.json() as { rate?: number; base?: string; quote?: string; date?: string };
        if (!data.rate) throw new Error('Invalid rate response');

        const lkrPerUsd = data.rate;
        const fromUsd = amount / lkrPerUsd;

        if (to.toUpperCase() === 'LKR') {
          return {
            converted: `LKR ${amount.toFixed(2)}`,
            rate: `1 USD = ${lkrPerUsd} LKR`,
            source: `Frankfurter API (${data.date ?? 'latest'})`,
          };
        }
        if (to.toUpperCase() === 'USD') {
          return {
            converted: `USD ${fromUsd.toFixed(2)}`,
            rate: `1 USD = ${lkrPerUsd} LKR`,
            source: `Frankfurter API (${data.date ?? 'latest'})`,
          };
        }
        // Cross-rate via USD
        const toRes = await fetch(`https://api.frankfurter.dev/v2/rate/USD/${to.toUpperCase()}`);
        const toData = await toRes.json() as { rate?: number; date?: string };
        if (!toData.rate) throw new Error(`Rate not available for ${to}`);
        const converted = fromUsd * toData.rate;
        return {
          converted: `${to.toUpperCase()} ${converted.toFixed(2)}`,
          rate: `1 LKR = ${(1 / lkrPerUsd).toFixed(6)} USD, 1 USD = ${toData.rate} ${to}`,
          source: `Frankfurter API (${toData.date ?? 'latest'})`,
        };
      } catch (err) {
        throw Object.assign(new Error(`Currency conversion failed: ${err instanceof Error ? err.message : 'Unknown error'}`), { cause: err });
      }
    }
    return this.restFetch('/api/currency/convert', { amount, to });
  }

  async trackOrder(orderNumber: string): Promise<Order> {
    if (this.mode === 'sdk' && this.sdk) {
      return this.sdk.trackOrder(orderNumber);
    }
    return this.restFetch<Order>('/api/order/track', { order_number: orderNumber });
  }

  // -------------------------------------------------------------------------
  // Cart (stateful)
  // -------------------------------------------------------------------------

  async addToCart(item: { productId: string; name: string; price: number; quantity?: number }): Promise<CartItem[]> {
    if (this.mode === 'sdk' && this.sdk) {
      await this.sdk.addToCart(item.productId, item.name, item.price, item.quantity ?? 1);
      return this.sdk.getCart();
    }
    await this.restFetch('/api/cart/add', {
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity ?? 1,
    });
    return this.getCart();
  }

  async getCart(): Promise<CartItem[]> {
    if (this.mode === 'sdk' && this.sdk) {
      return this.sdk.getCart();
    }
    const result = await this.restFetch<{ items: CartItem[] }>('/api/cart');
    return result.items ?? [];
  }

  async clearCart(): Promise<void> {
    if (this.mode === 'sdk' && this.sdk) {
      await this.sdk.clearCart();
      return;
    }
    const res = await fetch(`${this.baseUrl}/api/cart`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': this._sessionId,
      },
    });
    const json: RestResponse<void> = await res.json();
    if (json.sessionId && json.sessionId !== 'none') {
      this._sessionId = json.sessionId;
    }
    if (!json.success) {
      throw Object.assign(new Error(json.error ?? 'Failed to clear cart'), {
        suggestion: json.suggestion,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Order
  // -------------------------------------------------------------------------

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    if (this.mode === 'sdk' && this.sdk) {
      return this.sdk.createOrder(request);
    }
    return this.restFetch<Order>('/api/order/create', request);
  }
}
