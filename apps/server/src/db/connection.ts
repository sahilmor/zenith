import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const maxRetries = 5;
const retryDelayMs = 5000;

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const connectDatabase = async (attempt = 1): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    logger.info('MongoDB connected');
  } catch (error) {
    if (attempt >= maxRetries) {
      logger.error('MongoDB connection failed', {
        attempts: attempt,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    logger.warn('MongoDB connection retry scheduled', { attempt, nextAttempt: attempt + 1 });
    await wait(retryDelayMs);
    await connectDatabase(attempt + 1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.connection.close();
  logger.info('MongoDB disconnected');
};

export const getDatabaseState = (): string => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] ?? 'unknown';
};
