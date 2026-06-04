// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { KAPRUKA_MCP_URL } from '../config.js';
import {
  parseSearchResults,
  parseProductDetails,
  parseCategoryList,
  parseCityList,
  parseDeliveryCheck,
  parseOrderResult,
  parseTrackOrder,
  isMarkdownResponse,
} from './markdown-parser.js';
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

  get isOfficialServer(): boolean {
    return this.transport !== null && this.mcpUrl.includes('mcp.kapruka.com');
  }

  private async callToolRaw(name: string, args: Record<string, unknown>): Promise<string> {
    try {
      if (!this.connected) {
        await this.connect();
      }
    } catch (_connError) {
      throw new Error(`The Kapruka server is currently unreachable. Please check your internet connection or the server status URL: ${this.mcpUrl}`, { cause: _connError });
    }

    const callArgs = this.isOfficialServer ? { params: args } : args;

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
      throw new Error(`Kapruka tool "${name}" returned an empty response.`);
    }

    return content[0].text;
  }

  private async callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const rawText = await this.callToolRaw(name, args);

    // Try JSON first (local mock server returns JSON)
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      // Not JSON — will be handled by tool-specific methods below
      throw new Error(`Unexpected response format from "${name}".`);
    }

    if (parsed && typeof parsed.error === 'string') {
      throw new Error(parsed.error + (parsed.suggestion ? ` Suggestion: ${parsed.suggestion}` : ''));
    }

    return parsed as T;
  }

  private async callToolAutoParse<T>(
    name: string,
    args: Record<string, unknown>,
    parser: (text: string) => T | null,
    fallbackArgs?: Record<string, unknown>,
  ): Promise<T> {
    const rawText = await this.callToolRaw(name, fallbackArgs ?? args);

    // Try JSON first
    try {
      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      if (parsed && typeof parsed.error === 'string') {
        throw new Error(parsed.error + (parsed.suggestion ? ` Suggestion: ${parsed.suggestion}` : ''));
      }
      return parsed as T;
    } catch (e) {
      if (e instanceof SyntaxError) {
        // Markdown — parse it
        if (isMarkdownResponse(rawText)) {
          const result = parser(rawText);
          if (result === null) {
            throw new Error(`Failed to parse response from "${name}". Raw: ${rawText.slice(0, 200)}`, { cause: e });
          }
          return result;
        }
      }
      throw new Error(`Failed to parse response from "${name}".`, { cause: e });
    }
  }

  async searchProducts(q: string, category?: string): Promise<SearchResult> {
    const args = { q, ...(category ? { category } : {}) };

    if (this.isOfficialServer) {
      const rawText = await this.callToolRaw('kapruka_search_products', args);
      try {
        return JSON.parse(rawText) as SearchResult;
      } catch {
        if (isMarkdownResponse(rawText)) {
          return parseSearchResults(rawText, q);
        }
        // Plain text "No products found" or similar
        if (rawText.includes('No products found') || rawText.trim().length === 0) {
          return { products: [], total: 0, query: q };
        }
        throw new Error(`Unexpected response format from search_products: ${rawText.slice(0, 200)}`);
      }
    }

    return this.callTool<SearchResult>('kapruka_search_products', args);
  }

  async getProduct(product_id: string): Promise<Product> {
    if (this.isOfficialServer) {
      const rawText = await this.callToolRaw('kapruka_get_product', { product_id });
      try {
        return JSON.parse(rawText) as Product;
      } catch {
        if (isMarkdownResponse(rawText)) {
          const product = parseProductDetails(rawText);
          if (!product) throw new Error(`Product "${product_id}" not found`);
          return product;
        }
        throw new Error('Unexpected response format from get_product');
      }
    }

    return this.callTool<Product>('kapruka_get_product', { product_id });
  }

  async addToCart(productId: string, name: string, price: number, quantity: number = 1): Promise<{ message: string; cart: CartItem[] }> {
    // Cart is always local — never calls the official server
    if (this.isOfficialServer) {
      throw new Error(
        'add_to_cart is a local-only tool and is not available on the official Kapruka MCP server. ' +
        'Use the local MCP server (kapruka-mcp/local) or the REST API for cart operations.'
      );
    }
    return this.callTool<{ message: string; cart: CartItem[] }>('kapruka_add_to_cart', {
      productId, name, price, quantity,
    });
  }

  async getCart(): Promise<CartItem[]> {
    // Cart is always local
    if (this.isOfficialServer) {
      throw new Error(
        'get_cart is a local-only tool and is not available on the official Kapruka MCP server. ' +
        'Use the local MCP server (kapruka-mcp/local) or the REST API for cart operations.'
      );
    }
    return this.callTool<CartItem[]>('kapruka_get_cart', {});
  }

  async clearCart(): Promise<void> {
    // Cart is always local
    if (this.isOfficialServer) {
      throw new Error(
        'clear_cart is a local-only tool and is not available on the official Kapruka MCP server. ' +
        'Use the local MCP server (kapruka-mcp/local) or the REST API for cart operations.'
      );
    }
    await this.callTool('kapruka_clear_cart', {});
  }

  async listCategories(): Promise<Category[]> {
    if (this.isOfficialServer) {
      const rawText = await this.callToolRaw('kapruka_list_categories', {});
      try {
        return JSON.parse(rawText) as Category[];
      } catch {
        if (isMarkdownResponse(rawText)) {
          return parseCategoryList(rawText);
        }
        throw new Error('Unexpected response format from list_categories');
      }
    }

    return this.callTool<Category[]>('kapruka_list_categories', {});
  }

  async listDeliveryCities(query?: string): Promise<DeliveryCity[]> {
    const args = { ...(query ? { query } : {}) };

    if (this.isOfficialServer) {
      const rawText = await this.callToolRaw('kapruka_list_delivery_cities', args);
      try {
        return JSON.parse(rawText) as DeliveryCity[];
      } catch {
        if (isMarkdownResponse(rawText)) {
          return parseCityList(rawText);
        }
        throw new Error('Unexpected response format from list_delivery_cities');
      }
    }

    return this.callTool<DeliveryCity[]>('kapruka_list_delivery_cities', args);
  }

  async checkDelivery(city: string, product_id: string, delivery_date?: string): Promise<DeliveryCheck> {
    const args = { city, product_id, ...(delivery_date ? { delivery_date } : {}) };

    if (this.isOfficialServer) {
      const rawText = await this.callToolRaw('kapruka_check_delivery', args);
      try {
        return JSON.parse(rawText) as DeliveryCheck;
      } catch {
        if (isMarkdownResponse(rawText)) {
          const result = parseDeliveryCheck(rawText);
          if (!result) throw new Error(`Delivery check failed for city "${city}"`);
          return result;
        }
        throw new Error('Unexpected response format from check_delivery');
      }
    }

    return this.callTool<DeliveryCheck>('kapruka_check_delivery', args);
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    if (this.isOfficialServer) {
      const rawText = await this.callToolRaw('kapruka_create_order', { ...request });
      try {
        return JSON.parse(rawText) as Order;
      } catch {
        if (isMarkdownResponse(rawText)) {
          const order = parseOrderResult(rawText);
          if (!order) throw new Error('Order creation failed');
          return order;
        }
        throw new Error('Unexpected response format from create_order');
      }
    }

    return this.callTool<Order>('kapruka_create_order', { ...request });
  }

  async trackOrder(order_number: string): Promise<Order> {
    if (this.isOfficialServer) {
      const rawText = await this.callToolRaw('kapruka_track_order', { order_number });
      try {
        return JSON.parse(rawText) as Order;
      } catch {
        if (isMarkdownResponse(rawText)) {
          const order = parseTrackOrder(rawText);
          if (!order) throw new Error(`Order "${order_number}" not found`);
          return order;
        }
        throw new Error('Unexpected response format from track_order');
      }
    }

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
