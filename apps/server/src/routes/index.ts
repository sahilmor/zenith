import { Router } from 'express';
import { authRouter } from '../features/auth/routes/auth.routes.js';
import { healthRouter } from './health.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
