import type { RequestHandler } from 'express';
import type { CorsOptions } from 'cors';
import { env } from '../config/env.js';
import { ForbiddenError } from '../utils/app-error.js';

interface Bucket {
  count: number;
  resetAt: number;
}

export const rateLimit = (maxRequests: number, windowMs: number): RequestHandler => {
  const buckets = new Map<string, Bucket>();
  return (request, response, next) => {
    const key = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (bucket.count >= maxRequests) {
      response.status(429).json({
        success: false,
        message: 'Too many requests',
        data: null,
        errors: null,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    bucket.count += 1;
    next();
  };
};

export const preventHttpParameterPollution: RequestHandler = (request, _response, next) => {
  for (const [key, value] of Object.entries(request.query)) {
    if (Array.isArray(value)) request.query[key] = value.at(-1);
  }
  next();
};

export const allowedOrigins = new Set(
  (env.CORS_ORIGINS ?? env.CLIENT_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

export const isAllowedOrigin = (origin?: string): boolean => !origin || allowedOrigins.has(origin);

export const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new ForbiddenError('Origin is not allowed by CORS'));
  },
};
