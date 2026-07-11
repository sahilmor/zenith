import type { ErrorRequestHandler, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { sendError } from '../utils/api-response.js';
import { logger } from '../utils/logger.js';

const { JsonWebTokenError, TokenExpiredError } = jwt;

export const notFoundHandler: RequestHandler = (request, response) => {
  sendError(response, 404, `Route ${request.method} ${request.originalUrl} not found`);
};

export const globalErrorHandler: ErrorRequestHandler = (error, request, response, next) => {
  void next;
  if (error instanceof ZodError) {
    sendError(response, 400, 'Validation failed', error.errors);
    return;
  }

  if (error instanceof TokenExpiredError) {
    sendError(response, 401, 'Token expired');
    return;
  }

  if (error instanceof JsonWebTokenError) {
    sendError(response, 401, 'Invalid token');
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    sendError(response, 400, 'Database validation failed', Object.values(error.errors));
    return;
  }

  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    sendError(response, 409, 'Duplicate resource');
    return;
  }

  if (error instanceof AppError) {
    sendError(response, error.statusCode, error.message, error.errors);
    return;
  }

  logger.error('Unhandled application error', {
    requestId: request.requestId,
    error: error instanceof Error ? error.message : String(error),
  });
  sendError(
    response,
    500,
    env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error instanceof Error
        ? error.message
        : 'Internal server error',
  );
};
