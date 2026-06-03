# Usage Guide

Everything you need to get `kapruka-mcp` running in your project — from zero to a working AI shopping assistant in under 2 minutes.

---

## Table of Contents

1. [What This Package Does](#what-this-package-does)
2. [Quick Start (30 seconds)](#quick-start-30-seconds)
3. [Installation](#installation)
4. [Option A: Use the Direct SDK](#option-a-use-the-direct-sdk)
5. [Option B: Use the Local MCP Server](#option-b-use-the-local-mcp-server)
6. [Option C: Use the CLI with Claude Desktop](#option-c-use-the-cli-with-claude-desktop)
7. [Configuration Reference](#configuration-reference)
8. [Real-World Workflows](#real-world-workflows)
9. [Storage & Persistence](#storage--persistence)
10. [Event Hooks & Observability](#event-hooks--observability)
11. [All 14 Tools at a Glance](#all-14-tools-at-a-glance)
12. [Troubleshooting](#troubleshooting)

---

## What This Package Does

`kapruka-mcp` wraps Kapruka.com's official MCP server with **offline mock mode**, **local cart persistence**, **caching**, and **AI-friendly product descriptions** — so you can build a shopping agent without touching raw HTTP calls or worrying about rate limits.

| Without `kapruka-mcp` | With `kapruka-mcp` |
|---|---|
| No types, raw JSON only | Full TypeScript types for all 14 tools |
| Must be online | Offline mock mode with 136 products |
| Stateless — cart lost on refresh | Cart persists in memory or SQLite |
| No caching, hits rate limits | 30-min TTL cache, rate-limit tracking |
| No delivery rules | Perishable-aware delivery logic built in |

---

## Quick Start (30 seconds)

### Copy-paste this to get started:

```bash
npm install kapruka-mcp
```

```typescript
import { KaprukaLocal } from 'kapruka-mcp/local';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const local = new KaprukaLocal({ mock: true });
const transport = new StdioServerTransport();
await local.getServer().connect(transport);
```

That's it. You now have a working MCP server with 14 tools over stdio, ready for Claude Desktop, Cursor, or any MCP client.

---

## Installation

### Basic (no native dependencies)

```bash
npm install kapruka-mcp
```

### With SQLite persistence (optional — cart survives restarts)

```bash
npm install kapruka-mcp better-sqlite3
```

`better-sqlite3` is an **optional peer dependency**. Without it, the package works fine using in-memory storage.

### System requirements

- **Node.js** 18 or later
- **TypeScript** 5.x (if using TypeScript)

---

## Option A: Use the Direct SDK

Use this when building a custom UI, a backend service, or integrating with an AI framework (Vercel AI SDK, LangChain, Gemini).

### Basic setup

```typescript
import { KaprukaSDK } from 'kapruka-mcp';

const sdk = new KaprukaSDK();
```

### Search for products

```typescript
const results = await sdk.searchProducts('birthday cake');
// results.products → [{ id, name, price, image_url, visual_description, ... }]
// results.total    → 12
// results.query    → "birthday cake"
```

### Get full product details

```typescript
const product = await sdk.getProduct('KAP-CAKE-001');
console.log(product.name);              // "Java Lounge Classic Ribbon Cake"
console.log(product.price);             // 3500
console.log(product.visual_description); // "A two-layer round cake with pink buttercream..."
console.log(product.in_stock);          // true
```

### Check delivery to a city

```typescript
const delivery = await sdk.checkDelivery('KAN', 'KAP-CAKE-001');
// delivery.available     → true
// delivery.fee           → 350
// delivery.estimated_days → 2
```

### Add items to cart

```typescript
await sdk.addToCart('KAP-CAKE-001', 'Java Lounge Classic Ribbon Cake', 3500, 1);
```

### View cart

```typescript
const cart = await sdk.getCart();
// cart → [{ productId, name, price, quantity }]
```

### Create a checkout link

```typescript
const order = await sdk.createOrder({
  cart: [
    { product_id: 'KAP-CAKE-001', quantity: 1 },
  ],
  recipient: {
    name: 'Amara Perera',
    phone: '0771234567',
    address: '42 Galle Road, Colombo 03',
    city: 'COL',
  },
  delivery: {
    date: '2026-06-05',
    instructions: 'Leave at reception',
  },
  sender: {
    name: 'Rithik',
    phone: '0779876543',
  },
  gift_message: 'Happy Birthday!',
});

console.log(order.checkout_url); // "https://www.kapruka.com/checkout/pay/..."
console.log(order.expires_at);   // 60-minute price lock
```

### Track an existing order

```typescript
const status = await sdk.trackOrder('ORD-12345');
console.log(status.status); // "processing" | "shipped" | "delivered"
```

### List available categories

```typescript
const categories = await sdk.listCategories();
// [{ id: "flowers", name: "Flowers", description: "..." }, ...]
```

### List delivery cities

```typescript
const cities = await sdk.listDeliveryCities();
// [{ id: "COL", name: "Colombo", delivery_fee: 0, estimated_days: 1 }, ...]
```

---

## Option B: Use the Local MCP Server

Use this when building an AI agent that connects via MCP (Model Context Protocol). The local server adds caching, rate limiting, event hooks, and persistence on top of the official Kapruka API.

### Minimal setup

```typescript
import { KaprukaLocal } from 'kapruka-mcp/local';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const local = new KaprukaLocal({ mock: true });
const transport = new StdioServerTransport();
await local.getServer().connect(transport);
```

### Full configuration

```typescript
import { KaprukaLocal } from 'kapruka-mcp/local';
import { SqliteStorage } from 'kapruka-mcp/storage';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const local = new KaprukaLocal({
  mock: false,                                          // false = live mode (calls mcp.kapruka.com)
  compact: false,                                       // true = shorter tool descriptions for token savings
  storage: new SqliteStorage('./session.db', 'kapruka'), // persistent storage with custom prefix
  events: {
    onToolCall: (tool, args) => {
      console.log(`[Tool] ${tool}`, JSON.stringify(args));
    },
    onError: (tool, error) => {
      console.error(`[Error] ${tool}:`, error.message);
    },
  },
});

const transport = new StdioServerTransport();
await local.getServer().connect(transport);
```

### Config options explained

| Option | Type | Default | What it does |
|---|---|---|---|
| `mock` | `boolean` | `true` | `true` = offline mode with 136 mock products. `false` = live mode calling `mcp.kapruka.com`. |
| `compact` | `boolean` | `false` | `true` = shorter tool descriptions to save tokens in AI prompts. |
| `storage` | `Storage` | `MemoryStorage()` | Where to persist cart data. Use `SqliteStorage` for persistence across restarts. |
| `events.onToolCall` | `(tool, args) => void` | — | Called every time a tool is invoked. Good for logging. |
| `events.onError` | `(tool, error) => void` | — | Called when a tool throws. Good for error tracking. |

### Mock mode vs. live mode

| Feature | Mock mode (`mock: true`) | Live mode (`mock: false`) |
|---|---|---|
| Internet required | No | Yes |
| Products | 136 hardcoded | Real Kapruka catalog |
| Rate limits | None | 60 req/min, 30 orders/hr |
| Delivery rules | Simulated | Real Kapruka logistics |
| API key | Not needed | Not needed (public server) |
| Checkout links | Mock URLs | Real 60-min price-locked links |

---

## Option C: Use the CLI with Claude Desktop

The fastest way to connect Kapruka to Claude Desktop. No code required — just add to your config.

### Step 1: Add to Claude Desktop config

Open your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Step 2: Add this entry

**Mock mode (no internet, offline dev):**

```json
{
  "mcpServers": {
    "kapruka": {
      "command": "npx",
      "args": ["-y", "kapruka-mcp", "--mock"]
    }
  }
}
```

**Live mode (real Kapruka catalog):**

```json
{
  "mcpServers": {
    "kapruka": {
      "command": "npx",
      "args": ["-y", "kapruka-mcp"]
    }
  }
}
```

### Step 3: Restart Claude Desktop

Claude will now have access to all 14 Kapruka tools. Ask it things like:

- "Search for birthday cakes under LKR 5000"
- "Can you send flowers to Jaffna?"
- "Add a MacBook to my cart and check delivery to Kandy"
- "Create an order with the items in my cart"

---

## Configuration Reference

### KaprukaSDK options

```typescript
const sdk = new KaprukaSDK({
  mcpUrl: 'https://mcp.kapruka.com/mcp', // default — only change if using a proxy
});
```

### KaprukaLocal options

```typescript
const local = new KaprukaLocal({
  mock: true,       // boolean — offline mode
  compact: false,   // boolean — shorter tool descriptions
  storage: ...,     // Storage instance — MemoryStorage or SqliteStorage
  events: { ... },  // EventHandlers — optional logging hooks
});
```

### SqliteStorage options

```typescript
import { SqliteStorage } from 'kapruka-mcp/storage';

const storage = new SqliteStorage(
  './session.db',   // file path (created automatically if it doesn't exist)
  'kapruka_cart'    // key prefix — lets you share a DB with other packages
);
```

### MemoryStorage

```typescript
import { MemoryStorage } from 'kapruka-mcp/storage';

const storage = new MemoryStorage(); // data lost when process exits
```

---

## Real-World Workflows

### Building a Vercel AI SDK agent

```typescript
import { KaprukaSDK } from 'kapruka-mcp';
import { tool } from 'ai';
import { z } from 'zod';

const sdk = new KaprukaSDK();

const tools = {
  searchProducts: tool({
    description: 'Search Kapruka products by keyword',
    parameters: z.object({
      q: z.string().describe('Search keyword (e.g. "birthday cake", "iPhone 15")'),
      category: z.string().optional().describe('Filter by category'),
    }),
    execute: async ({ q, category }) => sdk.searchProducts(q, category),
  }),

  getProduct: tool({
    description: 'Get full product details including visual description',
    parameters: z.object({
      product_id: z.string().describe('Product SKU (e.g. "KAP-CAKE-001")'),
    }),
    execute: async ({ product_id }) => sdk.getProduct(product_id),
  }),

  checkDelivery: tool({
    description: 'Check if a product can be delivered to a city',
    parameters: z.object({
      city: z.string().describe('City code (e.g. "COL", "KAN", "JAF")'),
      product_id: z.string().describe('Product SKU'),
    }),
    execute: async ({ city, product_id }) => sdk.checkDelivery(city, product_id),
  }),

  createOrder: tool({
    description: 'Generate a 60-minute price-locked checkout link',
    parameters: z.object({
      cart: z.array(z.object({
        product_id: z.string(),
        quantity: z.number(),
      })),
      recipient_name: z.string(),
      recipient_phone: z.string(),
      recipient_address: z.string(),
      recipient_city: z.string(),
      delivery_date: z.string(),
      sender_name: z.string(),
      sender_phone: z.string(),
      gift_message: z.string().optional(),
    }),
    execute: async (params) => sdk.createOrder({
      cart: params.cart,
      recipient: {
        name: params.recipient_name,
        phone: params.recipient_phone,
        address: params.recipient_address,
        city: params.recipient_city,
      },
      delivery: { date: params.delivery_date },
      sender: { name: params.sender_name, phone: params.sender_phone },
      gift_message: params.gift_message,
    }),
  }),
};
```

### Building a LangChain agent

```typescript
import { KaprukaSDK } from 'kapruka-mcp';
import { DynamicTool } from 'langchain/tools';

const sdk = new KaprukaSDK();

const tools = [
  new DynamicTool({
    name: 'kapruka_search',
    description: 'Search Kapruka.com for products. Input: JSON with "q" (keyword) and optional "category".',
    func: async (input: string) => {
      const { q, category } = JSON.parse(input);
      const result = await sdk.searchProducts(q, category);
      return JSON.stringify(result);
    },
  }),
  new DynamicTool({
    name: 'kapruka_get_product',
    description: 'Get full product details. Input: JSON with "product_id".',
    func: async (input: string) => {
      const { product_id } = JSON.parse(input);
      const product = await sdk.getProduct(product_id);
      return JSON.stringify(product);
    },
  }),
];
```

### Building a Google Gemini function-calling agent

```typescript
import { KaprukaSDK } from 'kapruka-mcp';

const sdk = new KaprukaSDK();

const functionDeclarations = [
  {
    name: 'kapruka_search_products',
    description: 'Search Kapruka product catalog by keyword',
    parameters: {
      type: 'OBJECT',
      properties: {
        q:        { type: 'STRING', description: 'Search keyword' },
        category: { type: 'STRING', description: 'Optional category filter' },
      },
      required: ['q'],
    },
  },
  {
    name: 'kapruka_get_product',
    description: 'Get full product details including visual description',
    parameters: {
      type: 'OBJECT',
      properties: {
        product_id: { type: 'STRING', description: 'Product SKU' },
      },
      required: ['product_id'],
    },
  },
];

// In your function call handler:
async function handleFunctionCall(name: string, args: Record<string, string>) {
  switch (name) {
    case 'kapruka_search_products':
      return sdk.searchProducts(args.q, args.category);
    case 'kapruka_get_product':
      return sdk.getProduct(args.product_id);
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}
```

### Using with a custom MCP client

```typescript
import { KaprukaLocal } from 'kapruka-mcp/local';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Start the server as a child process
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', 'kapruka-mcp', '--mock'],
});

const client = new Client({ name: 'my-app', version: '1.0.0' });
await client.connect(transport);

// List available tools
const { tools } = await client.listTools();
console.log(tools.map(t => t.name));
// ["kapruka_search_products", "kapruka_get_product", ...]

// Call a tool
const result = await client.callTool({
  name: 'kapruka_search_products',
  arguments: { q: 'red roses' },
});
console.log(result.content);
```

---

## Storage & Persistence

### In-memory (default)

Data lives as long as the process runs. Good for quick tests and single-session agents.

```typescript
import { KaprukaLocal } from 'kapruka-mcp/local';

const local = new KaprukaLocal({
  mock: true,
  // storage defaults to MemoryStorage — no config needed
});
```

### SQLite (persistent)

Cart and cache survive process restarts. Good for long-running agents and multi-session users.

```bash
npm install better-sqlite3
```

```typescript
import { KaprukaLocal } from 'kapruka-mcp/local';
import { SqliteStorage } from 'kapruka-mcp/storage';

const local = new KaprukaLocal({
  mock: false,
  storage: new SqliteStorage('./kapruka-data.db', 'kapruka'),
});
```

### What gets stored

| Prefix | What | TTL |
|---|---|---|
| `cart:*` | Shopping cart items | Until `create_order` or manual clear |
| `search:*` | Cached search results | 30 minutes |
| `product:*` | Cached product details | 30 minutes |

---

## Event Hooks & Observability

Log every tool call and error for debugging and analytics:

```typescript
const local = new KaprukaLocal({
  mock: true,
  events: {
    onToolCall: (tool, args) => {
      // Log to your analytics service
      console.log(JSON.stringify({
        event: 'tool_call',
        tool,
        args,
        ts: Date.now(),
      }));
    },
    onError: (tool, error) => {
      // Alert on errors
      console.error(JSON.stringify({
        event: 'tool_error',
        tool,
        message: error.message,
        ts: Date.now(),
      }));
    },
  },
});
```

### Event types

| Event | Callback signature | When it fires |
|---|---|---|
| `onToolCall` | `(tool: string, args: Record<string, unknown>) => void` | Every successful tool invocation |
| `onError` | `(tool: string, error: Error) => void` | When a tool throws an error |

---

## All 14 Tools at a Glance

### Discovery

| Tool | Key params | What it does |
|---|---|---|
| `kapruka_search_products` | `q`, `category`, `min_price`, `max_price`, `in_stock_only`, `sort`, `limit` | Search the product catalog |
| `kapruka_get_product` | `product_id` | Full product details with visual description |
| `kapruka_list_categories` | `depth` | Browse product categories |
| `kapruka_list_delivery_cities` | `query`, `limit` | List Sri Lankan delivery cities |

### AI Intelligence

| Tool | Key params | What it does |
|---|---|---|
| `kapruka_get_alternatives` | `query`, `product_id` | Find similar products (prevents dead ends) |
| `kapruka_get_recommendations` | — | Suggest "goes well with" items based on cart |

### Cart & Checkout

| Tool | Key params | What it does |
|---|---|---|
| `kapruka_add_to_cart` | `productId`, `name`, `price`, `quantity` | Add item to local cart |
| `kapruka_get_cart` | — | View current cart contents |
| `kapruka_validate_shipping` | `name`, `phone`, `address`, `city` | Validate address & phone before checkout |
| `kapruka_create_order` | `cart`, `recipient`, `delivery`, `sender`, `gift_message` | Generate 60-min checkout link |

### Logistics

| Tool | Key params | What it does |
|---|---|---|
| `kapruka_check_delivery` | `city`, `product_id`, `delivery_date` | Check delivery fee and time |
| `kapruka_track_order` | `order_number` | Track order status |
| `kapruka_convert_currency` | `amount`, `from`, `to` | Convert LKR to USD/AED/EUR/GBP/INR |

### Dev

| Tool | Key params | What it does |
|---|---|---|
| `kapruka_get_analytics` | — | Session analytics (trending products, call counts) |

---

## Troubleshooting

### "The Kapruka server is currently unreachable"

Your internet is down or `mcp.kapruka.com` is temporarily offline. In mock mode, this never happens — all data is local.

**Fix:** Check your internet connection, or switch to `mock: true` for development.

### "Kapruka API Error [kapruka_search_products]: ..."

The live server returned an error. Common causes:

- **Rate limit exceeded** — you're making more than 60 requests/minute. Wait a minute.
- **Invalid product_id** — the SKU doesn't exist. Use `kapruka_search_products` to find valid IDs.
- **City code not found** — use `kapruka_list_delivery_cities` to get valid codes.

### "Kapruka tool returned invalid JSON"

The server returned an unexpected response. This is usually temporary.

**Fix:** Retry the call. If it persists, check server status at `https://mcp.kapruka.com`.

### Cart items disappear after restart

You're using `MemoryStorage` (the default). Switch to `SqliteStorage`:

```typescript
import { SqliteStorage } from 'kapruka-mcp/storage';

const local = new KaprukaLocal({
  storage: new SqliteStorage('./session.db'),
});
```

### `better-sqlite3` fails to install

`better-sqlite3` requires native compilation. Make sure you have:

- **Node.js 18+**
- **A C++ compiler** (Xcode on macOS, Build Tools on Windows, `build-essential` on Linux)

Or just skip it — `MemoryStorage` works fine without any native dependencies.

### Claude Desktop can't connect

1. Make sure `npx` is in your PATH (open a terminal and run `npx --version`)
2. Restart Claude Desktop after changing the config
3. Check the config JSON is valid (no trailing commas)
4. Look at Claude Desktop logs for error messages

---

**Built for the [Kapruka Agent Challenge 2026](https://www.kapruka.com/contactUs/agentChallenge.html)**
