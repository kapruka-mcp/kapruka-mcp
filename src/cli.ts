#!/usr/bin/env node
// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { KaprukaLocal } from './local/server.js';

const args = process.argv.slice(2);
const useMock = args.includes('--mock');

async function main(): Promise<void> {
  let local: KaprukaLocal;
  try {
    local = new KaprukaLocal({
      mock: useMock,
      events: {
        onToolCall: (tool, args) => {
          console.error(`[Kapruka] Tool called: ${tool}`, JSON.stringify(args));
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
}

main().catch((err) => {
  console.error('[Kapruka] Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
