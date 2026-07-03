import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { globalErrorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { preventHttpParameterPollution, rateLimit } from './middleware/security.middleware.js';
import { healthRouter } from './routes/health.routes.js';
import { apiRouter } from './routes/index.js';

export const createApp = (): Express => {
  const app = express();

  app.use(helmet());
  app.use(cors({ credentials: true, origin: env.CLIENT_URL }));
  app.use(rateLimit(100, 15 * 60 * 1000));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(preventHttpParameterPollution);
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use('/api', apiRouter);
  app.use('/health', healthRouter);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};
