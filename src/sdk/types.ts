import type { Storage } from '../storage.js';

export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  image_url: string;
  category: string;
  description: string;
  visual_description: string;
  in_stock: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface DeliveryCity {
  id: string;
  name: string;
  delivery_fee: number;
  estimated_days: number;
}

export interface DeliveryCheck {
  available: boolean;
  fee: number;
  estimated_days: number;
  city: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface OrderItemResult {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  items: OrderItemResult[];
  total: number;
  currency: string;
  checkout_url: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export interface SearchResult {
  products: Product[];
  total: number;
  query: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Official Kapruka MCP server request types
// ---------------------------------------------------------------------------

export interface OrderRecipient {
  name: string;
  phone: string;
  address: string;
  city: string;
  postal_code?: string;
}

export interface OrderDelivery {
  date: string;
  instructions?: string;
}

export interface OrderSender {
  name: string;
  phone: string;
}

export interface CreateOrderRequest {
  cart: Array<{ product_id: string; quantity: number }>;
  recipient: OrderRecipient;
  delivery: OrderDelivery;
  sender: OrderSender;
  gift_message?: string;
  currency?: string;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code?: string;
  delivery_instructions?: string;
}

export interface ShippingValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestion?: string;
}

export interface KaprukaSDKConfig {
  mcpUrl?: string;
}

export interface KaprukaLocalConfig {
  mock?: boolean;
  compact?: boolean;
  storage?: Storage;
  events?: {
    onToolCall?: (tool: string, args: Record<string, unknown>) => void;
    onError?: (tool: string, error: Error) => void;
  };
}
