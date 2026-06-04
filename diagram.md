# kapruka-mcp Architecture

## Package Overview

```
+------------------------------------------------------------------+
|                     kapruka-mcp@1.3.1                             |
|  TypeScript SDK + MCP Server + REST API + React Hooks             |
+------------------------------------------------------------------+
|                                                                    |
|  npm imports:                                                      |
|    import { KaprukaSDK } from 'kapruka-mcp'          // SDK        |
|    import { KaprukaLocal } from 'kapruka-mcp/local'   // MCP Srv   |
|    import { createRestServer } from 'kapruka-mcp/rest' // REST     |
|    import { KaprukaProvider } from 'kapruka-mcp/react' // React    |
|    import { MemoryStorage } from 'kapruka-mcp/storage' // Storage  |
|                                                                    |
+------------------------------------------------------------------+
```

## How the Pieces Connect

```
                          +-----------------------+
                          |   Your AI Agent       |
                          |   (OpenAI, Claude,    |
                          |    Gemini, etc.)      |
                          +-----------+-----------+
                                      |
                    +-----------------+------------------+
                    |                 |                   |
              +-----v------+  +------v--------+  +------v--------+
              | SDK Mode    |  | Local Mode    |  | REST Mode     |
              | (Live)      |  | (Mock/Live)   |  | (HTTP API)    |
              +-----+------+  +------+--------+  +------+--------+
                    |                 |                   |
          +---------v---+     +------v------+     +------v------+
          | KaprukaSDK   |     | KaprukaLocal|     | REST Server |
          | (client.ts)  |     | (server.ts) |     | (server.ts) |
          +-------+------+     +------+------+     +------+------+
                  |                   |                   |
                  |             +-----v------+            |
                  |             | InMemory    |            |
                  |             | Transport   |<-----------+
                  |             +-----+------+            |
                  |                   |                   |
                  |             +-----v------+            |
                  |             | MCP Server  |            |
                  |             | (14 tools)  |            |
                  |             +-----+------+            |
                  |                   |                   |
          +-------v-------------------v-------------------v-------+
          |                                                        |
          |              Kapruka Official MCP Server               |
          |              https://mcp.kapruka.com/mcp              |
          |              7 live tools (Streamable HTTP)            |
          |                                                        |
          +--------------------------------------------------------+
```

## Transport Modes

### Mode 1: SDK (Direct to Official Server)

```
  AI Agent
     |
     |  calls searchProducts("roses")
     v
  KaprukaSDK
     |
     |  MCP protocol via StreamableHTTPClientTransport
     |  wraps args: { q: "roses" } --> { params: { q: "roses" } }
     v
  Kapruka Official Server (mcp.kapruka.com)
     |
     |  returns markdown or JSON
     v
  KaprukaSDK.markdown-parser
     |
     |  parses markdown --> structured JSON
     v
  SearchResult { products: [...], total: 9, query: "roses" }
```

### Mode 2: Local MCP Server (Mock or Live)

```
  AI Agent (or CLI)
     |
     |  MCP protocol via stdio or InMemoryTransport
     v
  KaprukaLocal (14 tools)
     |
     |--- mock mode: uses MOCK_PRODUCTS catalog (136 items)
     |
     |--- live mode: delegates 7 tools to KaprukaSDK
     |                (search, get_product, categories,
     |                 cities, check_delivery, create_order,
     |                 track_order)
     |
     +--- always local: cart, alternatives, recommendations,
                       analytics, convert_currency, validate_shipping
     |
     v
  Storage (MemoryStorage or SqliteStorage)
     |
     |--- cart persistence
     |--- analytics tracking
     |--- order history
     +--- alternative product cache
```

### Mode 3: REST API (HTTP endpoints)

```
  Frontend / curl / any HTTP client
     |
     |  POST /api/search  { q: "roses" }
     |  Header: X-Session-ID: <uuid>
     v
  REST Server (127.0.0.1:3001)
     |
     |  SessionManager creates/retrieves session
     |  Each session = KaprukaLocal + InMemoryTransport pair
     v
  KaprukaLocal (via InMemoryTransport)
     |
     v
  Kapruka Official Server (live mode)
     or
  Mock Catalog (mock mode)
     |
     v
  JSON response { success: true, data: {...}, sessionId: "..." }
```

### Mode 4: React Hooks (Frontend)

```
  <KaprukaProvider mode="rest" baseUrl="http://localhost:3001">
     |
     |--- creates KaprukaClient (ref-stable, only recreates on mode/URL change)
     |
     +--- useKaprukaSearch(query)
     |       |--- debounced fetch (300ms)
     |       |--- offset-based loadMore()
     |       +--- returns { results, loading, error, search, loadMore }
     |
     +--- useCart()
     |       |--- snapshot+rollback on failure
     |       |--- addItems, removeItem, updateQuantity, clearCart
     |       +--- returns { items, total, addItem, removeItem, ... }
     |
     +--- useCheckout(cartItems)
     |       |--- takes cartItems as param (no internal useCart)
     |       |--- creates order via client.createOrder()
     |       +--- returns { order, loading, error, createOrder }
     |
     +--- KaprukaClient
             |--- rest mode: fetches REST API endpoints
             +--- sdk mode: calls KaprukaSDK directly
```

## 14 MCP Tools

```
+-------------------+------------------+-------------------------------------------+
| Tool              | Transport        | What it does                             |
+-------------------+------------------+-------------------------------------------+
| search_products   | Live + Mock      | Search by keyword + category filter      |
| get_product       | Live + Mock      | Full product details by ID               |
| get_alternatives  | Mock only        | Find similar products (live: async)      |
| add_to_cart       | Local only       | Add item to session cart                 |
| get_cart          | Local only       | List cart items + total                  |
| list_categories   | Live + Mock      | 64 live / 12 mock categories             |
| list_delivery_cities | Live + Mock   | 332 live / 16 mock cities                |
| check_delivery    | Live + Mock      | Fee + availability by city + date        |
| validate_shipping | Local only       | Address + phone validation               |
| create_order      | Live + Mock      | Generate 60-min checkout link            |
| track_order       | Live + Mock      | Order status by order number             |
| get_recommendations| Local only       | Category-based product suggestions       |
| convert_currency  | Local only       | LKR to USD/GBP/EUR via Frankfurter API   |
| get_analytics     | Local only       | Search/cart/order analytics              |
+-------------------+------------------+-------------------------------------------+

Live tools (7):  Official server handles directly
Composed tools (5): Built from official server primitives locally
Local-only tools (2): Cart + Analytics (not on official server)
```

## Data Flow: Shopping Session

```
  User: "I want to buy roses for my girlfriend"
     |
     v
  1. search_products(q: "roses")
     |--> 9 products returned
     v
  2. get_product(product_id: "FLOWERS00T2075")
     |--> "6 Red Rose Bouquet With Elegant Wrapping" - LKR 5,210
     v
  3. check_delivery(city: "COL", product_id: "FLOWERS00T2075")
     |--> available: true, fee: LKR 590
     v
  4. add_to_cart(productId, name, price, quantity: 1)
     |--> cart: [{ ... }], total: LKR 5,800
     v
  5. get_recommendations(category: "flowers")
     |--> 3 similar products suggested
     v
  6. validate_shipping(address)
     |--> valid: true
     v
  7. create_order(cart, recipient, delivery, sender)
     |--> orderId: KAP-ORD-2501
     |--> checkout_url: https://mcp.kapruka.com/checkout/...
     |--> (link expires in 60 minutes)
     v
  8. track_order(order_number: "KAP-ORD-2501")
     |--> status: pending
```

## Storage Architecture

```
  Storage Interface
     |
     +--- get(key), set(key, value), delete(key)
     +--- keys(prefix)
     +--- getAnalytics(), setAnalytics()
     +--- getOrderHistory(), addOrder()
     +--- getAlternativeCache(), setAlternativeCache()
     |
     +--- MemoryStorage (default)
     |       In-process, no dependencies
     |       Cart lives until server restart
     |
     +--- SqliteStorage (optional peer dep)
             Persistent, requires better-sqlite3
             createStorageAsync() for ESM
             new SqliteStorage(path) for CJS
```

## Currency Conversion Flow

```
  convert_currency(amount: 5210, to: "USD")
     |
     v
  Fetch https://api.frankfurter.dev/v2/rate/USD/LKR
     |
     |  { rate: 333.25, base: "USD", quote: "LKR" }
     v
  Calculate: 5210 / 333.25 = 15.64 USD
     |
     v
  Result: { converted: "USD 15.64", rate: "1 USD = 333.25 LKR",
            source: "Frankfurter API (2026-06-04)" }

  Cross-rate (e.g., to EUR):
     1. Fetch USD/LKR rate
     2. Fetch USD/EUR rate
     3. Convert: LKR -> USD -> EUR
```

## Session Management (REST)

```
  Client sends POST /api/search
     |
     |  Header: X-Session-ID: abc-123 (or absent)
     v
  SessionManager.getOrCreate("abc-123")
     |
     |--- Session exists? --> update lastAccessed, return
     |
     |--- Session count >= 1000? --> evict oldest (LRU)
     |
     |--- Create new:
     |       1. new MemoryStorage()
     |       2. new KaprukaLocal({ mock, storage })
     |       3. InMemoryTransport.createLinkedPair()
     |       4. local.getServer().connect(serverTransport)
     |       5. client.connect(clientTransport)
     |
     v
  Route handler calls session.client.callTool(...)
     |
     v
  Response sent with X-Session-ID header

  Cleanup: 30-minute timeout, checked every 60 seconds
```

## CLI Usage

```
  # Mock mode (offline, 136 products)
  npx kapruka-mcp --mock

  # Live mode (connects to official server)
  npx kapruka-mcp

  # REST API server
  npx kapruka-mcp --rest --port 3001

  # Mock REST server
  npx kapruka-mcp --mock --rest --port 3002
```

## File Structure

```
kapruka-mcp/
  src/
    config.ts              # TOOL_NAMES, KAPRUKA_MCP_URL, FRANKFURTER_RATE_URL
    storage.ts             # Storage interface, MemoryStorage, SqliteStorage
    index.ts               # Root exports (SDK + storage)
    cli.ts                 # CLI entry point

    sdk/
      client.ts            # KaprukaSDK — MCP client with markdown parser
      markdown-parser.ts   # Parses official server markdown to JSON
      types.ts             # All TypeScript interfaces
      index.ts             # SDK exports

    local/
      server.ts            # KaprukaLocal — 14 MCP tools
      mock.ts              # 136 products, 12 categories, 16 cities
      events.ts            # KaprukaEvents (cart/order events)
      index.ts             # Local exports

    rest/
      server.ts            # HTTP server, session management, CORS
      routes.ts            # Route table, callTool, response helpers
      schemas.ts           # JSON Schema for all 14 tools
      index.ts             # REST exports

    react/
      client.ts            # KaprukaClient (REST + SDK transport)
      context.tsx          # KaprukaProvider, useKaprukaContext
      useKaprukaSearch.ts  # Debounced search hook
      useCart.ts           # Cart hook with snapshot+rollback
      useCheckout.ts       # Checkout hook
      index.ts             # React exports

  tests/
    storage.test.ts        # Storage unit tests
    mock.test.ts           # Mock function tests
    server.test.ts         # Local server tests
    sdk.test.ts            # SDK client tests
    markdown-parser.test.ts# Parser tests
    rest.test.ts           # REST API tests
    react.test.tsx         # React hook tests (jsdom)
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| TypeScript SDK over WASM | Simpler build, no native deps, works everywhere |
| Official server returns markdown | SDK parses to JSON transparently |
| `params` wrapping for official server | Official API requires `{ params: args }` format |
| Cart is always local | Official server has no cart endpoint |
| `findSimilar` is async | Populates live catalog on demand from official server |
| `extractTokens` keeps 2-letter words | Supports "TV", "PC", "AC" product queries |
| REST uses InMemoryTransport | Each HTTP request = temporary MCP client pair |
| REST binds to 127.0.0.1 | Fixes Windows IPv6 localhost resolution issue |
| `useCheckout` takes cartItems param | Avoids duplicate cart state from internal useCart |
| `useCart` uses snapshot+rollback | Clones cart before destructive ops, restores on failure |
| `KaprukaProvider` ref-stable client | Only recreates on mode/mcpUrl change, prevents re-renders |
| SqliteStorage has async `create()` | ESM can't use `require()`, needs dynamic `import()` |
| Analytics weight: `mentions + views + cart_adds*2` | Unified across MemoryStorage and SqliteStorage |
| Body size limit 1MB | Prevents memory exhaustion from malformed requests |
| `callTool` wraps JSON.parse in try/catch | Handles markdown responses from official server |
