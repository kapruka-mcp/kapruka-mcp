# LinkedIn Post — kapruka-mcp Launch

---

Built an open-source npm package for the Kapruka Agent Challenge.

@Dulith Herath posted about building AI shopping agents with Kapruka's MCP, made somthing to make it easier for everyone else.

`kapruka-mcp` is a TypeScript SDK that wraps Kapruka's official MCP server and adds what the raw API doesn't:

- Offline mock mode — 136 products, 12 categories, zero internet. Build and test without touching production.
- Local cart persistence — cart survives restarts via SQLite (optional).
- Pre-checkout validation — catches invalid phone numbers, unknown cities before order creation.
- Fuzzy alternatives — when a search returns 0 results, the AI finds similar products automatically. No dead ends.
- Visual product descriptions — every product has colour, material, texture metadata for voice and multimodal agents.
- 30-min TTL cache with rate limit tracking.

14 tools total: search, product details, alternatives, cart, delivery checks, shipping validation, order creation, tracking, recommendations, currency conversion, analytics.

Works with Vercel AI SDK, LangChain, Gemini function calling, Claude Desktop, Cursor, or any MCP client. 30 seconds to set up.

Zero native dependencies by default. SQLite is optional.

npm install kapruka-mcp

GitHub: https://github.com/k-rithik04/kapruka-mcp

Open source. MIT licensed. Built for the Kapruka Agent Challenge 2026.

---

# Suggested Comment (post this on Dulith's original post)

Built an open-source npm package for this — `kapruka-mcp`. Wraps the official MCP server with offline mock mode, local cart persistence, pre-checkout validation, and fuzzy product alternatives. 14 tools, zero native deps, works with Claude Desktop / Cursor / LangChain / Gemini. npm install kapruka-mcp — happy to hear feedback from other devs taking on the challenge.

---

# Posting Strategy

1. Publish this post on LinkedIn, tagging Dulith Herath
2. Comment on Dulith's original post with the suggested comment above
3. The GitHub repo is already public and documented — the README and USAGE.md handle the rest
