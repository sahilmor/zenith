import { Router } from 'express';
import { validate } from '../../../middleware/validate.middleware.js';
import { login, logout, refreshToken, signup } from '../controllers/auth.controller.js';
import { loginSchema, refreshTokenSchema, signupSchema } from '../validation/auth.validation.js';

export const authRouter = Router();

authRouter.post('/signup', validate(signupSchema), signup);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.post('/refresh', validate(refreshTokenSchema), refreshToken);
