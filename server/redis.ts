export interface CacheStats {
  hits: number;
  misses: number;
  totalKeys: number;
  hitRatio: number;
  uptimeSeconds: number;
  operations: number;
  evictions: number;
}

interface CacheItem {
  value: string;
  expiresAt: number | null; // Unix timestamp in ms or null for persistent
  createdAt: number;
  accessCount: number;
  ttlSeconds?: number;
}

class RedisCacheService {
  private store: Map<string, CacheItem> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private operations: number = 0;
  private evictions: number = 0;
  private startTime: number = Date.now();

  constructor() {
    // Run background TTL cleaner every 10 seconds
    setInterval(() => this.cleanExpired(), 10000);
  }

  private cleanExpired() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt !== null && item.expiresAt <= now) {
        this.store.delete(key);
        this.evictions++;
      }
    }
  }

  public async get<T = any>(key: string): Promise<T | null> {
    this.operations++;
    const item = this.store.get(key);
    if (!item) {
      this.misses++;
      return null;
    }

    if (item.expiresAt !== null && item.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.evictions++;
      this.misses++;
      return null;
    }

    item.accessCount++;
    this.hits++;
    try {
      return JSON.parse(item.value) as T;
    } catch {
      return item.value as unknown as T;
    }
  }

  public async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    this.operations++;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;

    this.store.set(key, {
      value: serialized,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0,
      ttlSeconds,
    });
    return true;
  }

  public async del(key: string | string[]): Promise<number> {
    this.operations++;
    const keysToDelete = Array.isArray(key) ? key : [key];
    let count = 0;
    for (const k of keysToDelete) {
      if (this.store.delete(k)) {
        count++;
      }
    }
    return count;
  }

  public async delByPattern(pattern: string): Promise<number> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matched: string[] = [];
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        matched.push(key);
      }
    }
    return this.del(matched);
  }

  public async incr(key: string, ttlSeconds?: number): Promise<number> {
    this.operations++;
    const current = await this.get<number>(key);
    const newVal = (current && !isNaN(Number(current)) ? Number(current) : 0) + 1;
    await this.set(key, newVal, ttlSeconds);
    return newVal;
  }

  public async keys(pattern: string = '*'): Promise<string[]> {
    this.cleanExpired();
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const result: string[] = [];
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  public async flushall(): Promise<boolean> {
    this.operations++;
    this.store.clear();
    return true;
  }

  public getStats(): CacheStats {
    this.cleanExpired();
    const totalRequests = this.hits + this.misses;
    const hitRatio = totalRequests > 0 ? Number(((this.hits / totalRequests) * 100).toFixed(2)) : 100;
    return {
      hits: this.hits,
      misses: this.misses,
      totalKeys: this.store.size,
      hitRatio,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      operations: this.operations,
      evictions: this.evictions,
    };
  }

  public async dumpDetails(): Promise<Array<{
    key: string;
    ttlRemainingSeconds: number | null;
    sizeBytes: number;
    accessCount: number;
    createdAt: string;
  }>> {
    this.cleanExpired();
    const now = Date.now();
    const list = [];
    for (const [key, item] of this.store.entries()) {
      const ttl = item.expiresAt !== null ? Math.max(0, Math.round((item.expiresAt - now) / 1000)) : null;
      list.push({
        key,
        ttlRemainingSeconds: ttl,
        sizeBytes: item.value.length,
        accessCount: item.accessCount,
        createdAt: new Date(item.createdAt).toISOString(),
      });
    }
    return list;
  }
}

export const redis = new RedisCacheService();
