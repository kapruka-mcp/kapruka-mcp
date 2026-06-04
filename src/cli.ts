#!/usr/bin/env node
// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { KaprukaLocal } from './local/server.js';

const args = process.argv.slice(2);
const useMock = args.includes('--mock');
const useRest = args.includes('--rest');
const portArg = args.find((a, i) => args[i - 1] === '--port');
const port = portArg ? parseInt(portArg, 10) : 3001;

async function main(): Promise<void> {
  if (useRest) {
    const { createRestServer } = await import('./rest/index.js');
    const server = createRestServer({ mock: useMock, port });
    await server.start();
    console.error(`[Kapruka] REST API running at ${server.url()}`);
    console.error(`[Kapruka] Mode: ${useMock ? 'mock' : 'live'}`);
    console.error('[Kapruka] Endpoints:');
    console.error('  POST /api/tool            — universal tool endpoint');
    console.error('  POST /api/search          — search products');
    console.error('  POST /api/product         — get product');
    console.error('  POST /api/cart/add        — add to cart');
    console.error('  POST /api/cart            — get cart');
    console.error('  GET  /api/tools           — list all tools');
    console.error('  GET  /api/health          — health check');
    console.error('  GET  /api/session         — session info');
    console.error('  DELETE /api/session       — clear session');

    const shutdown = async (): Promise<void> => {
      console.error('[Kapruka] Shutting down...');
      await server.stop();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    return;
  }

  let local: KaprukaLocal;
  try {
    local = new KaprukaLocal({
      mock: useMock,
      events: {
        onToolCall: (tool, toolArgs) => {
          console.error(`[Kapruka] Tool called: ${tool}`, JSON.stringify(toolArgs));
        },
        onError: (tool, error) => {
          console.error(`[Kapruka] Error in ${tool}:`, error.message);
        },
      },
    });
  } catch (err) {
    console.error('[Kapruka] Failed to initialize:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const server = local.getServer();
  const transport = new StdioServerTransport();

  const shutdown = async (): Promise<void> => {
    console.error('[Kapruka] Shutting down...');
    try {
      await server.close();
    } catch {
      // Ignore close errors
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.error('[Kapruka] Starting MCP server...');
  console.error(`[Kapruka] Mode: ${useMock ? 'mock' : 'live'}`);

  try {
    await server.connect(transport);
  } catch (err) {
    console.error('[Kapruka] Failed to connect transport:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.error('[Kapruka] Server connected via stdio');
  console.error('[Kapruka] Tools available:');
  console.error('  - kapruka_search_products');
  console.error('  - kapruka_get_product');
  console.error('  - kapruka_get_alternatives');
  console.error('  - kapruka_add_to_cart');
  console.error('  - kapruka_get_cart');
  console.error('  - kapruka_list_categories');
  console.error('  - kapruka_list_delivery_cities');
  console.error('  - kapruka_check_delivery');
  console.error('  - kapruka_validate_shipping');
  console.error('  - kapruka_create_order');
  console.error('  - kapruka_track_order');
  console.error('  - kapruka_get_recommendations');
  console.error('  - kapruka_convert_currency');
  console.error('  - kapruka_get_analytics');
}

main().catch((err) => {
  console.error('[Kapruka] Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
