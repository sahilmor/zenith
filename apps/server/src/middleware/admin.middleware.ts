import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/app-error.js';

export const requirePlatformAdmin: RequestHandler = (request, _response, next) => {
  if (!request.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }
  if (request.user.role !== 'admin') {
    next(new ForbiddenError('Platform administrator access required'));
    return;
  }
  next();
};
