// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

export const KAPRUKA_MCP_URL = 'https://mcp.kapruka.com/mcp';
export const FRANKFURTER_RATE_URL = 'https://api.frankfurter.dev/v2/rate/USD/LKR';

export const TOOL_NAMES = {
  search_products: 'kapruka_search_products',
  get_product: 'kapruka_get_product',
  get_alternatives: 'kapruka_get_alternatives',
  add_to_cart: 'kapruka_add_to_cart',
  get_cart: 'kapruka_get_cart',
  list_categories: 'kapruka_list_categories',
  list_delivery_cities: 'kapruka_list_delivery_cities',
  check_delivery: 'kapruka_check_delivery',
  validate_shipping: 'kapruka_validate_shipping',
  create_order: 'kapruka_create_order',
  track_order: 'kapruka_track_order',
  get_recommendations: 'kapruka_get_recommendations',
  convert_currency: 'kapruka_convert_currency',
  get_analytics: 'kapruka_get_analytics',
} as const;

export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES];
