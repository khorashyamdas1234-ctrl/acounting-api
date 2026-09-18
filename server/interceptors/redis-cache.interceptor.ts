import { Request, Response, NextFunction } from 'express';
import { redis } from '../redis.js';

export interface CacheInterceptorOptions {
  ttlSeconds?: number;
  keyPrefix?: string;
  tags?: string[];
  keyGenerator?: (req: Request) => string;
}

/**
 * Enterprise Redis Caching Service & Interceptor
 * Compatible with NestJS Interceptor patterns and Express middleware pipelines.
 * Automatically intercepts requests, checks Redis cache, handles cache stamps,
 * tracks hits/misses, and sets X-Cache headers.
 */
export class RedisCacheService {
  private tagIndex: Map<string, Set<string>> = new Map();

  /**
   * Retrieves an item from Redis cache
   */
  public async get<T = any>(key: string): Promise<T | null> {
    return await redis.get<T>(key);
  }

  /**
   * Stores an item in Redis cache with TTL and optional tag associations
   */
  public async set(key: string, value: any, ttlSeconds: number = 300, tags: string[] = []): Promise<boolean> {
    const success = await redis.set(key, value, ttlSeconds);
    if (success && tags.length > 0) {
      for (const tag of tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      }
    }
    return success;
  }

  /**
   * Invalidate a specific key
   */
  public async invalidate(key: string): Promise<number> {
    return await redis.del(key);
  }

  /**
   * Invalidate all keys associated with a specific tag (e.g. 'chart-of-accounts', 'document-series')
   */
  public async invalidateTag(tag: string): Promise<number> {
    let count = 0;
    const keys = this.tagIndex.get(tag);
    if (keys && keys.size > 0) {
      const keysArr = Array.from(keys);
      count = await redis.del(keysArr);
      this.tagIndex.delete(tag);
    }
    // Also pattern match as safeguard
    const patternCount = await redis.delByPattern(`*${tag}*`);
    return count + patternCount;
  }

  /**
   * Invalidate keys matching a wildcard pattern
   */
  public async invalidatePattern(pattern: string): Promise<number> {
    return await redis.delByPattern(pattern);
  }

  /**
   * NestJS-style Interceptor & Express Middleware Factory
   * Intercepts GET requests, checks Redis, returns cached JSON if present,
   * or intercepts response payload on MISS to cache for subsequent calls.
   */
  public intercept(options: CacheInterceptorOptions = {}) {
    const ttl = options.ttlSeconds || 300;
    const prefix = options.keyPrefix || 'cache:api';
    const tags = options.tags || [];

    return async (req: Request, res: Response, next: NextFunction) => {
      // Only cache idempotent GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const tenantId = (req as any).user?.tenantId || (req.headers['x-tenant-id'] as string) || 'tenant-rapidlinks-001';
      const cacheKey = options.keyGenerator
        ? options.keyGenerator(req)
        : `${prefix}:${tenantId}:${req.originalUrl || req.url}`;

      const startTime = performance.now();

      try {
        const cachedData = await this.get(cacheKey);

        if (cachedData !== null) {
          const elapsed = (performance.now() - startTime).toFixed(2);
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-Key', cacheKey);
          res.setHeader('X-Cache-TTL', ttl.toString());
          res.setHeader('X-Response-Time', `${elapsed}ms`);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          return res.status(200).send(cachedData);
        }

        // Cache MISS: Intercept res.send and res.json to capture response
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);

        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        res.json = (body: any): Response => {
          const elapsed = (performance.now() - startTime).toFixed(2);
          res.setHeader('X-Response-Time', `${elapsed}ms`);
          
          // Cache successful 200 responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.set(cacheKey, body, ttl, tags).catch(err => {
              console.warn(`[RedisCacheInterceptor] Failed caching key ${cacheKey}:`, err);
            });
          }
          return originalJson(body);
        };

        res.send = (body: any): Response => {
          const elapsed = (performance.now() - startTime).toFixed(2);
          res.setHeader('X-Response-Time', `${elapsed}ms`);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            let dataToCache = body;
            if (typeof body === 'string') {
              try {
                dataToCache = JSON.parse(body);
              } catch {
                // Raw string or buffer
              }
            }
            this.set(cacheKey, dataToCache, ttl, tags).catch(err => {
              console.warn(`[RedisCacheInterceptor] Failed caching key ${cacheKey}:`, err);
            });
          }
          return originalSend(body);
        };

        next();
      } catch (err) {
        console.warn(`[RedisCacheInterceptor] Cache error for ${cacheKey}, bypassing:`, err);
        next();
      }
    };
  }
}

export const redisCacheService = new RedisCacheService();
export const redisCacheInterceptor = (options: CacheInterceptorOptions = {}) => redisCacheService.intercept(options);
