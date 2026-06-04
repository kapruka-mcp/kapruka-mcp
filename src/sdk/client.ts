// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { KAPRUKA_MCP_URL } from '../config.js';
import type {
  KaprukaSDKConfig,
  SearchResult,
  Product,
  Category,
  DeliveryCity,
  DeliveryCheck,
  Order,
  CartItem,
  CreateOrderRequest,
} from './types.js';

export class KaprukaSDK {
  private client: Client;
  private transport: StreamableHTTPClientTransport | null = null;
  private connected = false;
  private mcpUrl: string;

  constructor(config: KaprukaSDKConfig = {}) {
    this.mcpUrl = config.mcpUrl || KAPRUKA_MCP_URL;
    this.client = new Client({
      name: 'kapruka-mcp-sdk',
      version: '1.0.0',
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    this.transport = new StreamableHTTPClientTransport(
      new URL(this.mcpUrl)
    );
    await this.client.connect(this.transport);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.connected = false;
  }

  private async callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
    try {
      if (!this.connected) {
        await this.connect();
      }
    } catch (_connError) {
      throw new Error(`The Kapruka server is currently unreachable. Please check your internet connection or the server status URL: ${this.mcpUrl}`, { cause: _connError });
    }

    // The official Kapruka MCP server requires arguments wrapped in a "params" key.
    // Local/custom servers follow standard MCP protocol (flat arguments).
    // When transport is null, we're using an injected client (tests/local), so don't wrap.
    const isOfficial = this.transport !== null && this.mcpUrl.includes('mcp.kapruka.com');
    const callArgs = isOfficial ? { params: args } : args;

    let result;
    try {
      result = await this.client.callTool({ name, arguments: callArgs });
    } catch (toolError) {
      throw new Error(`Failed to communicate with Kapruka MCP: ${toolError instanceof Error ? toolError.message : 'Unknown connection error'}`, { cause: toolError });
    }

    if (result.isError) {
      const content = result.content as Array<{ type: string; text: string }>;
      const errorMsg = content?.[0]?.text || 'Unknown error from MCP server';
      throw new Error(`Kapruka API Error [${name}]: ${errorMsg}`);
    }

    const content = result.content as Array<{ type: string; text: string }>;
    if (!content || !Array.isArray(content) || content.length === 0) {
      throw new Error(`Kapruka tool "${name}" returned an empty response. This may indicate a temporary server issue.`);
    }

    const rawText = content[0].text;

    // Try JSON first (local mock server returns JSON)
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      // Official server returns markdown — return as structured text response
      return { text: rawText, markdown: true } as unknown as T;
    }

    // Detect application-level error objects from the server
    if (parsed && typeof parsed.error === 'string') {
      throw new Error(parsed.error + (parsed.suggestion ? ` Suggestion: ${parsed.suggestion}` : ''));
    }

    return parsed as T;
  }

  async searchProducts(q: string, category?: string): Promise<SearchResult> {
    return this.callTool<SearchResult>('kapruka_search_products', {
      q,
      ...(category ? { category } : {}),
    });
  }

  async getProduct(product_id: string): Promise<Product> {
    return this.callTool<Product>('kapruka_get_product', { product_id });
  }

  async addToCart(productId: string, name: string, price: number, quantity: number = 1): Promise<{ message: string; cart: CartItem[] }> {
    return this.callTool<{ message: string; cart: CartItem[] }>('kapruka_add_to_cart', {
      productId,
      name,
      price,
      quantity,
    });
  }

  async getCart(): Promise<CartItem[]> {
    return this.callTool<CartItem[]>('kapruka_get_cart', {});
  }

  async listCategories(): Promise<Category[]> {
    return this.callTool<Category[]>('kapruka_list_categories', {});
  }

  async listDeliveryCities(query?: string): Promise<DeliveryCity[]> {
    return this.callTool<DeliveryCity[]>('kapruka_list_delivery_cities', {
      ...(query ? { query } : {}),
    });
  }

  async checkDelivery(city: string, product_id: string, delivery_date?: string): Promise<DeliveryCheck> {
    return this.callTool<DeliveryCheck>('kapruka_check_delivery', {
      city,
      product_id,
      ...(delivery_date ? { delivery_date } : {}),
    });
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    return this.callTool<Order>('kapruka_create_order', { ...request });
  }

  async trackOrder(order_number: string): Promise<Order> {
    return this.callTool<Order>('kapruka_track_order', { order_number });
  }

  async listTools(): Promise<string[]> {
    if (!this.connected) {
      await this.connect();
    }

    const { tools } = await this.client.listTools();
    return tools.map((t) => t.name);
  }
}
