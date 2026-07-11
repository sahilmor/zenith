import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { env } from '../../../config/env.js';
import { BadRequestError } from '../../../utils/app-error.js';
import { sendSuccess } from '../../../utils/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { auditLogService } from '../../ops/services/audit-log.service.js';
import { AuthService } from '../services/auth.service.js';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  path: '/api/auth/refresh',
  ...(env.REFRESH_COOKIE_DOMAIN ? { domain: env.REFRESH_COOKIE_DOMAIN } : {}),
};
const authService = new AuthService();

export const signup: RequestHandler = asyncHandler(async (request, response) => {
  const result = await authService.signup(request.body);
  response.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
  await auditLogService.recordFromRequest(request, {
    targetType: 'user',
    targetId: result.user.id,
    action: 'user.signup',
    metadata: { email: result.user.email },
  });
  sendSuccess(response, 201, 'Signup successful', result);
});

export const login: RequestHandler = asyncHandler(async (request, response) => {
  try {
    const result = await authService.login(request.body);
    response.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
    await auditLogService.record({
      actorId: new Types.ObjectId(result.user.id),
      targetType: 'user',
      targetId: result.user.id,
      action: 'user.login',
      ip: request.ip ?? null,
      userAgent: request.header('user-agent') ?? null,
      requestId: request.requestId ?? null,
      metadata: { email: result.user.email },
    });
    sendSuccess(response, 200, 'Login successful', result);
  } catch (error) {
    await auditLogService.record({
      targetType: 'user',
      action: 'user.login_failed',
      ip: request.ip ?? null,
      userAgent: request.header('user-agent') ?? null,
      requestId: request.requestId ?? null,
      metadata: { email: request.body?.email ?? null },
    });
    throw error;
  }
});

export const logout: RequestHandler = asyncHandler(async (request, response) => {
  response.clearCookie('refreshToken', refreshCookieOptions);
  await auditLogService.recordFromRequest(request, {
    targetType: 'user',
    targetId: request.user?.id ?? null,
    action: 'user.logout',
  });
  sendSuccess(response, 200, 'Logout successful');
});

export const refreshToken: RequestHandler = asyncHandler(async (request, response) => {
  const token = request.body?.refreshToken ?? request.cookies?.refreshToken;
  if (typeof token !== 'string') throw new BadRequestError('Refresh token is required');
  const result = await authService.refresh(token);
  response.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
  await auditLogService.record({
    actorId: new Types.ObjectId(result.user.id),
    targetType: 'user',
    targetId: result.user.id,
    action: 'token.refresh',
    ip: request.ip ?? null,
    userAgent: request.header('user-agent') ?? null,
    requestId: request.requestId ?? null,
  });
  sendSuccess(response, 200, 'Token refreshed', result);
});

export const forgotPassword: RequestHandler = asyncHandler(async (request, response) => {
  await authService.forgotPassword(request.body);
  await auditLogService.record({
    targetType: 'user',
    action: 'password_reset.requested',
    ip: request.ip ?? null,
    userAgent: request.header('user-agent') ?? null,
    requestId: request.requestId ?? null,
    metadata: { email: request.body?.email ?? null },
  });
  sendSuccess(response, 200, 'If an account exists, a reset link has been sent');
});

export const resetPassword: RequestHandler = asyncHandler(async (request, response) => {
  await authService.resetPassword(request.body);
  await auditLogService.recordFromRequest(request, {
    targetType: 'user',
    action: 'password_reset.completed',
  });
  sendSuccess(response, 200, 'Password reset successful');
});

export const verifyEmail: RequestHandler = asyncHandler(async (request, response) => {
  const result = await authService.verifyEmail(request.body);
  response.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
  await auditLogService.record({
    actorId: new Types.ObjectId(result.user.id),
    targetType: 'user',
    targetId: result.user.id,
    action: 'email.verified',
    ip: request.ip ?? null,
    userAgent: request.header('user-agent') ?? null,
    requestId: request.requestId ?? null,
  });
  sendSuccess(response, 200, 'Email verified', result);
});

export const resendVerification: RequestHandler = asyncHandler(async (request, response) => {
  await authService.resendVerification(request.body);
  sendSuccess(response, 200, 'If verification is required, a new link has been sent');
});
