import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './db/connection.js';
import { backgroundJobService } from './features/ops/services/background-job.service.js';
import { initializeSocketServer } from './sockets/index.js';
import { logger } from './utils/logger.js';

interface ListenError extends Error {
  readonly code?: string;
}

const listen = (httpServer: ReturnType<typeof createServer>, port: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const onError = (error: Error): void => {
      httpServer.off('listening', onListening);
      reject(error);
    };
    const onListening = (): void => {
      httpServer.off('error', onError);
      resolve();
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);
    httpServer.listen(port);
  });

const startServer = async (): Promise<void> => {
  let databaseConnected = false;

  await connectDatabase();
  databaseConnected = true;
  const app = createApp();
  const httpServer = createServer(app);
  const io = initializeSocketServer(httpServer);
  backgroundJobService.start();

  try {
    await listen(httpServer, env.PORT);
    logger.info(`Server listening on port ${env.PORT}`);
  } catch (error) {
    const listenError = error as ListenError;
    if (listenError.code === 'EADDRINUSE') {
      logger.error(`Port ${env.PORT} is already in use`, {
        port: env.PORT,
        hint: `Stop the existing process or start with a different PORT, for example PORT=${env.PORT + 1} npm run dev.`,
      });
    } else {
      logger.error('HTTP server failed to start', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    backgroundJobService.stop();
    io.close();
    if (databaseConnected) await disconnectDatabase();
    process.exit(1);
  }

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info('Graceful shutdown started', { signal });
    backgroundJobService.stop();
    io.close();
    httpServer.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};

void startServer().catch((error) => {
  logger.error('Server startup failed', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
