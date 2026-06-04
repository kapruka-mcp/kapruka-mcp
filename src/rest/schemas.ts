// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import { TOOL_NAMES } from '../config.js';

export interface ToolSchema {
  name: string;
  description: string;
  path: string;
  inputSchema: Record<string, unknown>;
}

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    name: TOOL_NAMES.search_products,
    description: 'Search the Kapruka product catalog by keyword, category, or price range.',
    path: '/api/search',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', minLength: 1, description: 'Search keyword (e.g., "birthday cake", "red roses")' },
        category: { type: 'string', description: 'Category filter: flowers | cakes | gifts | electronics | toys | fashion | grocery | appliances | beauty | books | fruits | beverages' },
        min_price: { type: 'number', description: 'Minimum price in LKR' },
        max_price: { type: 'number', description: 'Maximum price in LKR' },
        in_stock_only: { type: 'boolean', description: 'Only show in-stock products' },
        sort: { type: 'string', description: 'Sort: price_asc, price_desc, name' },
        limit: { type: 'integer', description: 'Max results to return' },
        currency: { type: 'string', description: 'Currency code (default: LKR)' },
      },
      required: ['q'],
    },
  },
  {
    name: TOOL_NAMES.get_product,
    description: 'Get full details for a single product by ID.',
    path: '/api/product',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product ID (e.g., "KAP-CAKE-001")' },
        currency: { type: 'string', description: 'Currency code (default: LKR)' },
      },
      required: ['product_id'],
    },
  },
  {
    name: TOOL_NAMES.get_alternatives,
    description: 'Find similar or alternative products when a search returns few results.',
    path: '/api/alternatives',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, description: 'Original search term that failed or had few results' },
        category: { type: 'string', description: 'Narrow alternatives to a category' },
        maxPrice: { type: 'number', description: 'Max price in LKR' },
        limit: { type: 'integer', default: 5, description: 'Max alternatives (1-10)' },
      },
      required: ['query'],
    },
  },
  {
    name: TOOL_NAMES.add_to_cart,
    description: 'Add an item to the session cart.',
    path: '/api/cart/add',
    inputSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID to add' },
        name: { type: 'string', description: 'Product name' },
        price: { type: 'number', description: 'Unit price in LKR' },
        quantity: { type: 'integer', default: 1, description: 'Quantity' },
      },
      required: ['productId', 'name', 'price'],
    },
  },
  {
    name: TOOL_NAMES.get_cart,
    description: 'View the current session cart contents and total.',
    path: '/api/cart',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: TOOL_NAMES.list_categories,
    description: 'List all product categories available on Kapruka.',
    path: '/api/categories',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: TOOL_NAMES.list_delivery_cities,
    description: 'List all delivery cities with fees and estimated delivery times.',
    path: '/api/cities',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: TOOL_NAMES.check_delivery,
    description: 'Check delivery availability, fee, and estimated days for a city and product.',
    path: '/api/delivery/check',
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City code (e.g., COL, KAN, JAF)' },
        product_id: { type: 'string', description: 'Product ID' },
        delivery_date: { type: 'string', description: 'Delivery date (YYYY-MM-DD)' },
      },
      required: ['city', 'product_id'],
    },
  },
  {
    name: TOOL_NAMES.validate_shipping,
    description: 'Validate a Sri Lankan shipping address and phone number before creating an order.',
    path: '/api/shipping/validate',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2, description: 'Full name' },
        phone: { type: 'string', description: 'Sri Lankan phone number' },
        address: { type: 'string', minLength: 5, description: 'Street address' },
        city: { type: 'string', description: 'City name or code' },
        postal_code: { type: 'string', description: '5-digit postal code' },
        delivery_instructions: { type: 'string', description: 'Special instructions' },
      },
      required: ['name', 'phone', 'address', 'city'],
    },
  },
  {
    name: TOOL_NAMES.create_order,
    description: 'Create a price-locked guest checkout order valid for 60 minutes.',
    path: '/api/order/create',
    inputSchema: {
      type: 'object',
      properties: {
        cart: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string' },
              quantity: { type: 'integer' },
            },
            required: ['product_id', 'quantity'],
          },
          minItems: 1,
          description: 'Array of {product_id, quantity} objects',
        },
        recipient: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            postal_code: { type: 'string' },
          },
          required: ['name', 'phone', 'address', 'city'],
        },
        delivery: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'YYYY-MM-DD' },
            instructions: { type: 'string' },
          },
          required: ['date'],
        },
        sender: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
          },
          required: ['name', 'phone'],
        },
        gift_message: { type: 'string' },
        currency: { type: 'string' },
      },
      required: ['cart', 'recipient', 'delivery', 'sender'],
    },
  },
  {
    name: TOOL_NAMES.track_order,
    description: 'Track the status and delivery progress of an existing order.',
    path: '/api/order/track',
    inputSchema: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'Order ID (e.g., "KAP-ORD-2501")' },
      },
      required: ['order_number'],
    },
  },
  {
    name: TOOL_NAMES.get_recommendations,
    description: 'Get product recommendations based on current cart contents.',
    path: '/api/recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', default: 3, description: 'Number of recommendations (1-5)' },
      },
    },
  },
  {
    name: TOOL_NAMES.convert_currency,
    description: 'Convert LKR to USD, AED, EUR, GBP, or INR using live rates.',
    path: '/api/currency/convert',
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount in LKR' },
        to: { type: 'string', enum: ['USD', 'AED', 'EUR', 'GBP', 'INR'], description: 'Target currency' },
      },
      required: ['amount', 'to'],
    },
  },
  {
    name: TOOL_NAMES.get_analytics,
    description: 'View trending products based on search, view, and cart activity.',
    path: '/api/analytics',
    inputSchema: { type: 'object', properties: {} },
  },
];

/** Map from URL path to tool name */
export const PATH_TO_TOOL: Record<string, string> = {};
for (const schema of TOOL_SCHEMAS) {
  PATH_TO_TOOL[schema.path] = schema.name;
}

/** Map from tool name to URL path */
export const TOOL_TO_PATH: Record<string, string> = {};
for (const schema of TOOL_SCHEMAS) {
  TOOL_TO_PATH[schema.name] = schema.path;
}
