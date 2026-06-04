import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRestServer, type RestServer } from '../src/rest/index.js';

let server: RestServer;
let baseUrl: string;

function request(method: string, path: string, body?: unknown, sessionId?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionId) headers['X-Session-ID'] = sessionId;
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({
    status: r.status,
    headers: Object.fromEntries(r.headers.entries()),
    body: await r.json(),
  }));
}

beforeAll(async () => {
  server = createRestServer({ port: 0, mock: true });
  await server.start();
  baseUrl = server.url();
});

afterAll(async () => {
  await server.stop();
});

describe('REST API — Health & Tools', () => {
  it('GET /api/health', async () => {
    const r = await request('GET', '/api/health');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.data.status).toBe('ok');
    expect(r.body.data.version).toBe('1.2.0');
  });

  it('GET /api/tools', async () => {
    const r = await request('GET', '/api/tools');
    expect(r.status).toBe(200);
    expect(r.body.data.tools.length).toBe(15);
  });

  it('404 for unknown route', async () => {
    const r = await request('GET', '/api/unknown');
    expect(r.status).toBe(404);
    expect(r.body.success).toBe(false);
  });
});

describe('REST API — Session Management', () => {
  it('returns X-Session-ID in response', async () => {
    const r = await request('POST', '/api/categories');
    expect(r.headers['x-session-id']).toBeDefined();
  });

  it('reuses session with same X-Session-ID', async () => {
    const r1 = await request('POST', '/api/categories');
    const sid = r1.headers['x-session-id'];
    const r2 = await request('POST', '/api/categories', undefined, sid);
    expect(r2.headers['x-session-id']).toBe(sid);
  });

  it('DELETE /api/session clears data', async () => {
    const r = await request('DELETE', '/api/session');
    expect(r.status).toBe(200);
    expect(r.body.data.message).toBe('Session cleared');
  });
});

describe('REST API — Universal Tool Endpoint', () => {
  it('POST /api/tool — search', async () => {
    const r = await request('POST', '/api/tool', {
      tool: 'kapruka_search_products',
      args: { q: 'cake' },
    });
    expect(r.status).toBe(200);
    expect(r.body.data.products.length).toBeGreaterThan(0);
  });

  it('POST /api/tool — missing tool field', async () => {
    const r = await request('POST', '/api/tool', { args: {} });
    expect(r.status).toBe(400);
    expect(r.body.error).toContain('Missing');
  });

  it('POST /api/tool — unknown tool', async () => {
    const r = await request('POST', '/api/tool', { tool: 'fake_tool' });
    expect(r.status).toBe(400);
    expect(r.body.error).toContain('Unknown tool');
  });
});

describe('REST API — Individual Endpoints (14 tools)', () => {
  let sessionId: string;

  it('POST /api/search', async () => {
    const r = await request('POST', '/api/search', { q: 'roses' });
    sessionId = r.headers['x-session-id'];
    expect(r.status).toBe(200);
    expect(r.body.data.products.length).toBeGreaterThan(0);
    expect(r.body.tool).toBe('kapruka_search_products');
  });

  it('POST /api/product', async () => {
    const r = await request('POST', '/api/product', { product_id: 'KAP-CAKE-001' }, sessionId);
    expect(r.status).toBe(200);
    expect(r.body.data.name).toBeTruthy();
    expect(r.body.data.price).toBeGreaterThan(0);
  });

  it('POST /api/alternatives', async () => {
    const r = await request('POST', '/api/alternatives', { query: 'roses' }, sessionId);
    expect(r.status).toBe(200);
    const items = r.body.data.alternatives ?? r.body.data.products ?? [];
    expect(items.length).toBeGreaterThan(0);
  });

  it('POST /api/categories', async () => {
    const r = await request('POST', '/api/categories', undefined, sessionId);
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBe(12);
  });

  it('POST /api/cities', async () => {
    const r = await request('POST', '/api/cities', undefined, sessionId);
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBe(16);
  });

  it('POST /api/delivery/check', async () => {
    const r = await request('POST', '/api/delivery/check', { city: 'COL', product_id: 'KAP-CAKE-001' }, sessionId);
    expect(r.status).toBe(200);
    expect(typeof r.body.data.available).toBe('boolean');
  });

  it('POST /api/shipping/validate', async () => {
    const r = await request('POST', '/api/shipping/validate', {
      name: 'Test User', phone: '0771234567', address: '42 Road', city: 'COL',
    }, sessionId);
    expect(r.status).toBe(200);
    expect(typeof r.body.data.valid).toBe('boolean');
  });

  it('POST /api/cart/add + POST /api/cart', async () => {
    await request('POST', '/api/cart/add', {
      productId: 'KAP-CAKE-001', name: 'Test Cake', price: 2850, quantity: 2,
    }, sessionId);
    const r = await request('POST', '/api/cart', undefined, sessionId);
    expect(r.status).toBe(200);
    expect(r.body.data.items.length).toBe(1);
    expect(r.body.data.items[0].quantity).toBe(2);
  });

  it('POST /api/order/create', async () => {
    const r = await request('POST', '/api/order/create', {
      cart: [{ product_id: 'KAP-CAKE-001', quantity: 1 }],
      recipient: { name: 'Test', phone: '0771234567', address: '42 Road', city: 'COL' },
      delivery: { date: '2026-06-10' },
      sender: { name: 'Sender', phone: '0779876543' },
    }, sessionId);
    expect(r.status).toBe(200);
    expect(r.body.data.checkoutUrl).toBeTruthy();
  });

  it('POST /api/order/track', async () => {
    const r = await request('POST', '/api/order/track', { order_number: 'KAP-ORD-2501' }, sessionId);
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBeTruthy();
  });

  it('POST /api/recommendations', async () => {
    const r = await request('POST', '/api/recommendations', {}, sessionId);
    expect(r.status).toBe(200);
    expect(r.body.data.recommendations.length).toBeGreaterThan(0);
  });

  it('POST /api/currency/convert', { timeout: 15000 }, async () => {
    const r = await request('POST', '/api/currency/convert', { amount: 1000, to: 'USD' }, sessionId);
    expect(r.status).toBe(200);
    expect(r.body.data.converted).toContain('USD');
    expect(r.body.data.rate).toContain('LKR');
  });

  it('POST /api/analytics', async () => {
    const r = await request('POST', '/api/analytics', undefined, sessionId);
    expect(r.status).toBe(200);
    expect(typeof r.body.data.totalActionsRecorded).toBe('number');
  });
});

describe('REST API — CORS', () => {
  it('OPTIONS returns CORS headers', async () => {
    const r = await fetch(`${baseUrl}/api/health`, { method: 'OPTIONS' });
    expect(r.headers.get('access-control-allow-origin')).toBe('*');
    expect(r.headers.get('access-control-allow-methods')).toContain('POST');
    expect(r.status).toBe(204);
  });
});

describe('REST API — Invalid JSON', () => {
  it('POST with invalid JSON returns 400', async () => {
    const r = await fetch(`${baseUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    }).then(async (res) => ({
      status: res.status,
      body: await res.json(),
    }));
    expect(r.status).toBe(400);
    expect(r.body.error).toContain('Invalid JSON');
  });
});
