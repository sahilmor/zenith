import { Router } from 'express';
import { validate } from '../../../middleware/validate.middleware.js';
import {
  forgotPassword,
  login,
  logout,
  refreshToken,
  resendVerification,
  resetPassword,
  signup,
  verifyEmail,
} from '../controllers/auth.controller.js';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from '../validation/auth.validation.js';

export const authRouter = Router();

authRouter.post('/signup', validate(signupSchema), signup);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.post('/refresh', validate(refreshTokenSchema), refreshToken);
authRouter.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', validate(resetPasswordSchema), resetPassword);
authRouter.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
authRouter.post('/resend-verification', validate(resendVerificationSchema), resendVerification);
