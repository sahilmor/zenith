import crypto from 'node:crypto';
import type { RequestHandler } from 'express';

export const requestContext: RequestHandler = (request, response, next) => {
  const forwardedRequestId = request.header('x-request-id');
  const requestId = forwardedRequestId?.trim() || crypto.randomUUID();
  request.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  next();
};
