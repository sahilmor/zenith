import type { RequestHandler } from 'express';
import type { AnyZodObject } from 'zod';

export const validate =
  (schema: AnyZodObject): RequestHandler =>
  (request, _response, next) => {
    const parsed = schema.parse({
      body: request.body,
      cookies: request.cookies,
      params: request.params,
      query: request.query,
    });
    request.body = parsed.body ?? request.body;
    request.params = parsed.params ?? request.params;
    request.query = parsed.query ?? request.query;
    next();
  };
