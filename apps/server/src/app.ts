import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { env } from './config/env.js';
import { globalErrorHandler, notFoundHandler } from './middleware/error.middleware.js';
import {
  corsOptions,
  preventHttpParameterPollution,
  rateLimit,
} from './middleware/security.middleware.js';
import { requestContext } from './middleware/request-context.middleware.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import { healthRouter } from './routes/health.routes.js';
import { apiRouter } from './routes/index.js';

export const createApp = (): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestContext);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(rateLimit(env.RATE_LIMIT_MAX, env.RATE_LIMIT_WINDOW_MS));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(preventHttpParameterPollution);
  app.use(requestLogger);
  if (env.NODE_ENV !== 'production') app.use(morgan('dev'));
  if (env.NODE_ENV !== 'production')
    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  app.use('/api', apiRouter);
  app.use('/health', healthRouter);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};
