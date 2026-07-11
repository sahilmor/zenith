import type { RequestHandler } from 'express';
import { apiKeyService } from '../features/ops/services/api-key.service.js';
import { UnauthorizedError } from '../utils/app-error.js';

export const verifyApiKey =
  (scope: string): RequestHandler =>
  async (request, _response, next) => {
    try {
      const header = request.header('authorization');
      const token = header?.startsWith('Bearer ') ? header.slice(7) : request.header('x-api-key');
      if (!token) throw new UnauthorizedError('API key is required');
      const apiKey = await apiKeyService.authenticate(token, scope);
      request.apiKey = apiKey;
      next();
    } catch (error) {
      next(error);
    }
  };
