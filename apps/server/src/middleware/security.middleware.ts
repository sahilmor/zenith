import type { RequestHandler } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export const rateLimit =
  (maxRequests: number, windowMs: number): RequestHandler =>
  (request, response, next) => {
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

export const preventHttpParameterPollution: RequestHandler = (request, _response, next) => {
  for (const [key, value] of Object.entries(request.query)) {
    if (Array.isArray(value)) request.query[key] = value.at(-1);
  }
  next();
};
