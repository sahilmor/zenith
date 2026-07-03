import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from '@/config/env';
import { healthRouter } from '@/routes/health.routes';

export const createApp = (): Express => {
  const app = express();

  app.use(helmet());
  app.use(cors({ credentials: true, origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use('/health', healthRouter);

  return app;
};
