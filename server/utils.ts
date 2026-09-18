import { Response } from 'express';
import { redis } from './redis.js';

export function sendApiResponse<T>(
  res: Response,
  data: T,
  message: string = 'Request completed successfully',
  statusCode: number = 200
) {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
  });
}

export function sendApiError(
  res: Response,
  message: string = 'Internal server error',
  statusCode: number = 500,
  details?: any
) {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    error: details || message,
  });
}

export async function withCache<T>(
  cacheKey: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await redis.get<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }
  const fresh = await fetcher();
  await redis.set(cacheKey, fresh, ttlSeconds);
  return fresh;
}
