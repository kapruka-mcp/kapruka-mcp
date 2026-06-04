// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import type { IncomingMessage, ServerResponse } from 'node:http';
import { TOOL_SCHEMAS } from './schemas.js';
import type { Session } from './server.js';

export interface RouteContext {
  session: Session;
  method: string;
  path: string;
  body: unknown;
}

export type RouteHandler = (ctx: RouteContext) => Promise<unknown>;

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID',
};

export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, HEADERS);
  res.end(JSON.stringify(data));
}

export function sendSuccess(res: ServerResponse, data: unknown, sessionId: string, tool?: string): void {
  sendJson(res, 200, { success: true, data, sessionId, ...(tool ? { tool } : {}) });
}

export function sendError(res: ServerResponse, status: number, error: string, sessionId: string, tool?: string, suggestion?: string): void {
  sendJson(res, status, { success: false, error, sessionId, ...(tool ? { tool } : {}), ...(suggestion ? { suggestion } : {}) });
}

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

export function parsePath(url: string): { path: string; query: Record<string, string> } {
  const [pathname, qs] = url.split('?');
  const query: Record<string, string> = {};
  if (qs) {
    for (const pair of qs.split('&')) {
      const [k, v] = pair.split('=');
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
  }
  return { path: pathname, query };
}

/** Execute a tool call through the session's MCP client */
async function callTool(session: Session, toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await session.client.callTool({ name: toolName, arguments: args });
  const content = result.content as Array<{ type: string; text: string }>;
  if (result.isError) {
    const text = content[0].text;
    try {
      const parsed = JSON.parse(text);
      throw Object.assign(new Error(parsed.error), { suggestion: parsed.suggestion, tool: parsed.tool });
    } catch {
      throw new Error(text);
    }
  }
  return JSON.parse(content[0].text);
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/** POST /api/tool — universal tool endpoint */
export async function handleUniversalTool(ctx: RouteContext): Promise<unknown> {
  const { tool, args } = ctx.body as { tool?: string; args?: Record<string, unknown> };
  if (!tool) throw Object.assign(new Error('Missing "tool" field'), { status: 400 });

  const toolSchema = TOOL_SCHEMAS.find(s => s.name === tool);
  if (!toolSchema) throw Object.assign(new Error(`Unknown tool: ${tool}. Use GET /api/tools to list available tools.`), { status: 400 });

  return callTool(ctx.session, tool, args ?? {});
}

/** POST /api/search */
async function handleSearch(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_search_products', ctx.body as Record<string, unknown>);
}

/** POST /api/product */
async function handleProduct(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_get_product', ctx.body as Record<string, unknown>);
}

/** POST /api/alternatives */
async function handleAlternatives(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_get_alternatives', ctx.body as Record<string, unknown>);
}

/** POST /api/cart/add */
async function handleCartAdd(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_add_to_cart', ctx.body as Record<string, unknown>);
}

/** POST /api/cart */
async function handleCartGet(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_get_cart', {});
}

/** POST /api/categories */
async function handleCategories(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_list_categories', {});
}

/** POST /api/cities */
async function handleCities(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_list_delivery_cities', {});
}

/** POST /api/delivery/check */
async function handleDeliveryCheck(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_check_delivery', ctx.body as Record<string, unknown>);
}

/** POST /api/shipping/validate */
async function handleShippingValidate(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_validate_shipping', ctx.body as Record<string, unknown>);
}

/** POST /api/order/create */
async function handleOrderCreate(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_create_order', ctx.body as Record<string, unknown>);
}

/** POST /api/order/track */
async function handleOrderTrack(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_track_order', ctx.body as Record<string, unknown>);
}

/** POST /api/recommendations */
async function handleRecommendations(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_get_recommendations', ctx.body as Record<string, unknown> ?? {});
}

/** POST /api/currency/convert */
async function handleCurrencyConvert(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_convert_currency', ctx.body as Record<string, unknown>);
}

/** POST /api/analytics */
async function handleAnalytics(ctx: RouteContext): Promise<unknown> {
  return callTool(ctx.session, 'kapruka_get_analytics', {});
}

/** GET /api/tools — list all available tools */
export async function handleToolsList(_ctx: RouteContext): Promise<unknown> {
  return {
    tools: TOOL_SCHEMAS.map(s => ({
      name: s.name,
      description: s.description,
      path: s.path,
      inputSchema: s.inputSchema,
    })),
  };
}

/** GET /api/health */
export async function handleHealth(_ctx: RouteContext): Promise<unknown> {
  return { status: 'ok', version: '1.2.0' };
}

/** GET /api/session */
async function handleSessionGet(ctx: RouteContext): Promise<unknown> {
  const mcpResult = await ctx.session.client.callTool({ name: 'kapruka_get_cart', arguments: {} });
  const content = mcpResult.content as Array<{ type: string; text: string }>;
  const cart = JSON.parse(content[0].text);
  return {
    sessionId: ctx.session.id,
    cart,
  };
}

/** DELETE /api/session */
async function handleSessionClear(ctx: RouteContext): Promise<unknown> {
  ctx.session.storage.clear();
  return { message: 'Session cleared' };
}

// ---------------------------------------------------------------------------
// Route table
// ---------------------------------------------------------------------------

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

export const POST_ROUTES: Record<string, RouteHandler> = {
  '/api/tool':                handleUniversalTool,
  '/api/search':              handleSearch,
  '/api/product':             handleProduct,
  '/api/alternatives':        handleAlternatives,
  '/api/cart/add':            handleCartAdd,
  '/api/cart':                handleCartGet,
  '/api/categories':          handleCategories,
  '/api/cities':              handleCities,
  '/api/delivery/check':      handleDeliveryCheck,
  '/api/shipping/validate':   handleShippingValidate,
  '/api/order/create':        handleOrderCreate,
  '/api/order/track':         handleOrderTrack,
  '/api/recommendations':     handleRecommendations,
  '/api/currency/convert':    handleCurrencyConvert,
  '/api/analytics':           handleAnalytics,
};

export const GET_ROUTES: Record<string, RouteHandler> = {
  '/api/tools':     handleToolsList,
  '/api/health':    handleHealth,
  '/api/session':   handleSessionGet,
};

export const DELETE_ROUTES: Record<string, RouteHandler> = {
  '/api/session': handleSessionClear,
};
