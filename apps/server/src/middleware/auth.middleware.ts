import type { RequestHandler } from 'express';
import { TokenService } from '../features/auth/services/token.service.js';
import { UserRepository } from '../features/auth/repositories/user.repository.js';
import { UnauthorizedError } from '../utils/app-error.js';

const tokens = new TokenService();
const users = new UserRepository();

export const verifyToken: RequestHandler = async (request, _response, next) => {
  try {
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!token) throw new UnauthorizedError('Access token is required');
    const payload = tokens.verifyAccessToken(token);
    const user = await users.findById(payload.userId);
    if (!user) throw new UnauthorizedError('User no longer exists');
    request.user = { ...payload, id: user.id, _id: user._id };
    next();
  } catch (error) {
    next(error);
  }
};
