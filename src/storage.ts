// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

export interface ProductAnalytics {
  product_id: string;
  mentions: number;
  views: number;
  cart_adds: number;
}

export interface Storage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlMs?: number): void;
  delete(key: string): void;
  has(key: string): boolean;
  clear(): void;
  size(): number;
  keys(prefix?: string): string[];
  incrementAnalytics(productId: string, type: 'mention' | 'view' | 'cart_add'): void;
  getAnalytics(limit?: number): ProductAnalytics[];
}

export class MemoryStorage implements Storage {
  private store = new Map<string, { data: unknown; expiresAt?: number }>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const entry: { data: T; expiresAt?: number } = { data: value };
    if (ttlMs !== undefined) {
      entry.expiresAt = Date.now() + ttlMs;
    }
    this.store.set(key, entry);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  keys(prefix?: string): string[] {
    const allKeys = Array.from(this.store.keys());
    if (prefix === undefined) return allKeys;
    return allKeys.filter(k => k.startsWith(prefix));
  }

  incrementAnalytics(productId: string, type: 'mention' | 'view' | 'cart_add'): void {
    const key = `analytics:${productId}`;
    const stats = this.get<ProductAnalytics>(key) || { product_id: productId, mentions: 0, views: 0, cart_adds: 0 };
    if (type === 'mention') stats.mentions++;
    if (type === 'view') stats.views++;
    if (type === 'cart_add') stats.cart_adds++;
    this.set(key, stats);
  }

  getAnalytics(limit: number = 10): ProductAnalytics[] {
    return this.keys('analytics:')
      .map(k => {
        const data = this.get<ProductAnalytics>(k);
        return {
          product_id: k.split(':')[1],
          mentions: data?.mentions ?? 0,
          views: data?.views ?? 0,
          cart_adds: data?.cart_adds ?? 0,
        };
      })
      .sort((a, b) => (b.mentions + b.views + b.cart_adds) - (a.mentions + a.views + a.cart_adds))
      .slice(0, limit);
  }
}

export class SqliteStorage implements Storage {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  private db: import('better-sqlite3').Database | null = null;
  private tableName: string;

  constructor(dbPath: string = './kapruka.db', tableName: string = 'kapruka_storage') {
    this.tableName = tableName;

    // Lazy-load better-sqlite3
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Database = require('better-sqlite3');
      this.db = new Database(dbPath);
      this.init();
    } catch (_err) {
      throw new Error(
        'better-sqlite3 is required for SqliteStorage. Install it with: npm install better-sqlite3',
        { cause: _err }
      );
    }
  }

  private init(): void {
    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS product_analytics (
        product_id TEXT PRIMARY KEY,
        mentions INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        cart_adds INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  get<T>(key: string): T | null {
    const row = this.db!.prepare(
      `SELECT value, expires_at FROM ${this.tableName} WHERE key = ?`
    ).get(key) as { value: string; expires_at: number | null } | undefined;

    if (!row) return null;

    if (row.expires_at && Date.now() > row.expires_at) {
      this.delete(key);
      return null;
    }

    try {
      return JSON.parse(row.value) as T;
    } catch {
      // Corrupted data — remove it and return null
      this.delete(key);
      return null;
    }
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt = ttlMs !== undefined ? Date.now() + ttlMs : null;
    const valueStr = JSON.stringify(value);

    this.db!.prepare(`
      INSERT INTO ${this.tableName} (key, value, expires_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        expires_at = excluded.expires_at,
        updated_at = CURRENT_TIMESTAMP
    `).run(key, valueStr, expiresAt);
  }

  delete(key: string): void {
    this.db!.prepare(`DELETE FROM ${this.tableName} WHERE key = ?`).run(key);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.db!.prepare(`DELETE FROM ${this.tableName}`).run();
  }

  size(): number {
    const row = this.db!.prepare(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE expires_at IS NULL OR expires_at > ?`
    ).get(Date.now()) as { count: number };
    return row.count;
  }

  keys(prefix?: string): string[] {
    let query: string;
    let params: unknown[];

    if (prefix) {
      query = `SELECT key FROM ${this.tableName} WHERE key LIKE ? AND (expires_at IS NULL OR expires_at > ?)`;
      params = [`${prefix}%`, Date.now()];
    } else {
      query = `SELECT key FROM ${this.tableName} WHERE expires_at IS NULL OR expires_at > ?`;
      params = [Date.now()];
    }

    const rows = this.db!.prepare(query).all(...params) as Array<{ key: string }>;
    return rows.map(r => r.key);
  }

  incrementAnalytics(productId: string, type: 'mention' | 'view' | 'cart_add'): void {
    const col = type === 'mention' ? 'mentions' : type === 'view' ? 'views' : 'cart_adds';
    this.db!.prepare(`
      INSERT INTO product_analytics (product_id, ${col})
      VALUES (?, 1)
      ON CONFLICT(product_id) DO UPDATE SET
        ${col} = ${col} + 1,
        updated_at = CURRENT_TIMESTAMP
    `).run(productId);
  }

  getAnalytics(limit: number = 10): ProductAnalytics[] {
    return this.db!.prepare(`
      SELECT product_id, mentions, views, cart_adds FROM product_analytics 
      ORDER BY (mentions + views + cart_adds * 2) DESC 
      LIMIT ?
    `).all(limit) as ProductAnalytics[];
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export function createStorage(options: {
  type?: 'memory' | 'sqlite';
  dbPath?: string;
  tableName?: string;
} = {}): Storage {
  const { type = 'memory', dbPath, tableName } = options;

  if (type === 'sqlite') {
    return new SqliteStorage(dbPath, tableName);
  }

  return new MemoryStorage();
}
