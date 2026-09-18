/**
 * NestJS Redis Cache Interceptor & Caching Service
 * 
 * Provides full NestJS interface compatibility for teams using or migrating
 * between NestJS and Express architectures.
 * 
 * Usage in NestJS Controller:
 * ```typescript
 * import { Controller, Get, UseInterceptors } from '@nestjs/common';
 * import { RedisCacheInterceptor, CacheTTL } from './nestjs-cache.interceptor';
 * 
 * @Controller('accounting')
 * export class AccountingController {
 *   @Get('chart-of-accounts')
 *   @UseInterceptors(RedisCacheInterceptor)
 *   @CacheTTL(300)
 *   async getChartOfAccounts() {
 *     return this.accountingService.findAll();
 *   }
 * 
 *   @Get('document-series')
 *   @UseInterceptors(RedisCacheInterceptor)
 *   @CacheTTL(600)
 *   async getDocumentSeries() {
 *     return this.seriesService.findAll();
 *   }
 * }
 * ```
 */

import { redis } from '../redis.js';

export interface ExecutionContext {
  switchToHttp(): {
    getRequest<T = any>(): T;
    getResponse<T = any>(): T;
  };
  getHandler(): Function;
  getClass(): Function;
}

export interface CallHandler<T = any> {
  handle(): Promise<T>;
}

export interface NestInterceptor<T = any, R = any> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Promise<R>;
}

export const CACHE_TTL_METADATA = 'CACHE_TTL_METADATA';
export const CACHE_KEY_METADATA = 'CACHE_KEY_METADATA';

/**
 * Decorator to set cache TTL in seconds for a route
 */
export function CacheTTL(seconds: number): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    (Reflect as any).defineMetadata?.(CACHE_TTL_METADATA, seconds, descriptor.value);
    (descriptor.value as any)[CACHE_TTL_METADATA] = seconds;
    return descriptor;
  };
}

/**
 * Decorator to set explicit cache key or key prefix
 */
export function CacheKey(key: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    (Reflect as any).defineMetadata?.(CACHE_KEY_METADATA, key, descriptor.value);
    (descriptor.value as any)[CACHE_KEY_METADATA] = key;
    return descriptor;
  };
}

/**
 * NestJS-compatible Redis Cache Interceptor
 */
export class NestRedisCacheInterceptor implements NestInterceptor {
  private defaultTTL = 300;

  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    // Cache only GET requests
    if (req.method !== 'GET') {
      return await next.handle();
    }

    const handler = context.getHandler();
    const ttl = (handler as any)?.[CACHE_TTL_METADATA] || this.defaultTTL;
    const customKey = (handler as any)?.[CACHE_KEY_METADATA];
    
    const tenantId = req.headers?.['x-tenant-id'] || 'tenant-rapidlinks-001';
    const cacheKey = customKey || `cache:nestjs:${tenantId}:${req.url}`;

    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      if (res.setHeader) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        res.setHeader('X-Cache-TTL', ttl.toString());
      }
      return cached;
    }

    if (res.setHeader) {
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);
    }

    const result = await next.handle();
    if (result !== undefined) {
      await redis.set(cacheKey, result, ttl);
    }
    return result;
  }
}
