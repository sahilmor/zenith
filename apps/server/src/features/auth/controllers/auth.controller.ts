import type { RequestHandler } from 'express';
import { env } from '../../../config/env.js';
import { BadRequestError } from '../../../utils/app-error.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { AuthService } from '../services/auth.service.js';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth/refresh',
};
const authService = new AuthService();

export const signup: RequestHandler = asyncHandler(async (request, response) => {
  const result = await authService.signup(request.body);
  response.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
  sendSuccess(response, 201, 'Signup successful', result);
});

export const login: RequestHandler = asyncHandler(async (request, response) => {
  const result = await authService.login(request.body);
  response.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
  sendSuccess(response, 200, 'Login successful', result);
});

export const logout: RequestHandler = asyncHandler(async (_request, response) => {
  response.clearCookie('refreshToken', refreshCookieOptions);
  sendSuccess(response, 200, 'Logout successful');
});

export const refreshToken: RequestHandler = asyncHandler(async (request, response) => {
  const token = request.body?.refreshToken ?? request.cookies?.refreshToken;
  if (typeof token !== 'string') throw new BadRequestError('Refresh token is required');
  const result = await authService.refresh(token);
  response.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
  sendSuccess(response, 200, 'Token refreshed', result);
});
