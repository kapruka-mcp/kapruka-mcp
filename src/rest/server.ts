// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { KaprukaLocal } from '../local/server.js';
import { MemoryStorage, type Storage } from '../storage.js';
import {
  POST_ROUTES,
  GET_ROUTES,
  DELETE_ROUTES,
  readBody,
  parsePath,
  sendJson,
  sendSuccess,
  sendError,
} from './routes.js';
import type { RouteContext } from './routes.js';
import { PATH_TO_TOOL } from './schemas.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Session {
  id: string;
  local: KaprukaLocal;
  client: Client;
  storage: Storage;
  lastAccessed: number;
}

export interface RestServerConfig {
  port?: number;
  host?: string;
  mock?: boolean;
  maxSessions?: number;
  sessionTimeoutMs?: number;
  cors?: boolean;
  currencyApiUrl?: string;
}

// ---------------------------------------------------------------------------
// Session manager
// ---------------------------------------------------------------------------

class SessionManager {
  private readonly sessions = new Map<string, Session>();
  private readonly maxSessions: number;
  private readonly timeoutMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxSessions: number, timeoutMs: number) {
    this.maxSessions = maxSessions;
    this.timeoutMs = timeoutMs;
  }

  async getOrCreate(id: string, config: { mock: boolean; currencyApiUrl?: string }): Promise<Session> {
    const existing = this.sessions.get(id);
    if (existing) {
      existing.lastAccessed = Date.now();
      return existing;
    }

    if (this.sessions.size >= this.maxSessions) {
      this.evictOldest();
    }

    const storage = new MemoryStorage();
    const local = new KaprukaLocal({
      mock: config.mock,
      storage,
      ...(config.currencyApiUrl ? { currencyApiUrl: config.currencyApiUrl } : {}),
    });

    const client = new Client({ name: 'rest-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await local.getServer().connect(serverTransport);
    await client.connect(clientTransport);

    const session: Session = {
      id,
      local,
      client,
      storage,
      lastAccessed: Date.now(),
    };

    this.sessions.set(id, session);
    this.startCleanup();
    return session;
  }

  delete(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.client.close().catch((err) => {
        process.stderr.write(`[Kapruka] Error closing client for session ${id}: ${err instanceof Error ? err.message : err}\n`);
      });
      session.local.shutdown().catch((err) => {
        process.stderr.write(`[Kapruka] Error shutting down local for session ${id}: ${err instanceof Error ? err.message : err}\n`);
      });
      this.sessions.delete(id);
    }
  }

  async deleteAll(): Promise<void> {
    for (const [id] of this.sessions) {
      this.delete(id);
    }
  }

  count(): number {
    return this.sessions.size;
  }

  private evictOldest(): void {
    let oldest: Session | null = null;
    for (const session of this.sessions.values()) {
      if (!oldest || session.lastAccessed < oldest.lastAccessed) {
        oldest = session;
      }
    }
    if (oldest) {
      this.delete(oldest.id);
    }
  }

  private startCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastAccessed > this.timeoutMs) {
        this.delete(id);
      }
    }
    if (this.sessions.size === 0 && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  sessions: SessionManager,
  config: { mock: boolean; currencyApiUrl?: string; cors: boolean },
): Promise<void> {
  const { path } = parsePath(req.url ?? '/');

  // CORS preflight
  if (config.cors && req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  // Health check doesn't need session
  if (path === '/api/health' && req.method === 'GET') {
    sendSuccess(res, { status: 'ok', version: '1.2.0', sessions: sessions.count() }, 'none');
    return;
  }

  // Tools list doesn't need session
  if (path === '/api/tools' && req.method === 'GET') {
    const { handleToolsList } = await import('./routes.js');
    const data = await handleToolsList({ session: null as unknown as RouteContext['session'], method: 'GET', path, body: null });
    sendSuccess(res, data, 'none');
    return;
  }

  // Get or create session
  const sessionId = req.headers['x-session-id'] as string | undefined;
  const sid = sessionId || crypto.randomUUID();

  try {
    const session = await sessions.getOrCreate(sid, config);

    // Route the request
    let body: unknown = {};
    if (req.method === 'POST') {
      const raw = await readBody(req);
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          sendError(res, 400, 'Invalid JSON body', sid);
          return;
        }
      }
    }

    let handler;
    if (req.method === 'POST') {
      handler = POST_ROUTES[path];
    } else if (req.method === 'GET') {
      handler = GET_ROUTES[path];
    } else if (req.method === 'DELETE') {
      handler = DELETE_ROUTES[path];
    }

    if (!handler) {
      sendError(res, 404, `Unknown route: ${req.method} ${path}. Use GET /api/tools to list available endpoints.`, sid);
      return;
    }

    const result = await handler({ session, method: req.method!, path, body });

    // Set session ID in response header
    res.setHeader('X-Session-ID', sid);
    const toolName = PATH_TO_TOOL[path] ?? (path === '/api/tool' ? (body as { tool?: string })?.tool : undefined);
    sendSuccess(res, result, sid, toolName);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const status = (err as { status?: number }).status ?? 500;
    sendError(res, status, error.message ?? 'Internal server error', sid, (err as { tool?: string }).tool, (err as { suggestion?: string }).suggestion);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RestServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  url(): string;
}

export function createRestServer(config: RestServerConfig = {}): RestServer {
  const port = config.port ?? 3001;
  const host = config.host ?? '127.0.0.1';
  const cors = config.cors ?? true;
  const mock = config.mock ?? true;
  const maxSessions = config.maxSessions ?? 1000;
  const sessionTimeoutMs = config.sessionTimeoutMs ?? 30 * 60 * 1000;

  const sessions = new SessionManager(maxSessions, sessionTimeoutMs);
  let httpServer: Server | null = null;
  let actualPort = port;

  return {
    async start(): Promise<void> {
      httpServer = createServer(async (req, res) => {
        try {
          await handleRequest(req, res, sessions, { mock, currencyApiUrl: config.currencyApiUrl, cors });
        } catch (err: unknown) {
          const error = err instanceof Error ? err : new Error(String(err));
          sendJson(res, 500, {
            success: false,
            error: error.message ?? 'Internal server error',
            sessionId: req.headers['x-session-id'] as string ?? 'none',
          });
        }
      });

      return new Promise((resolve) => {
        httpServer!.listen(port, host, () => {
          const addr = httpServer!.address();
          if (addr && typeof addr === 'object') {
            actualPort = addr.port;
          } else {
            actualPort = port;
          }
          resolve();
        });
      });
    },

    async stop(): Promise<void> {
      await sessions.deleteAll();
      if (httpServer) {
        await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
        httpServer = null;
      }
    },

    url(): string {
      return `http://127.0.0.1:${actualPort}`;
    },
  };
}
