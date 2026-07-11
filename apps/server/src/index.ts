import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './db/connection.js';
import { backgroundJobService } from './features/ops/services/background-job.service.js';
import { initializeSocketServer } from './sockets/index.js';
import { logger } from './utils/logger.js';

const startServer = async (): Promise<void> => {
  await connectDatabase();

  const app = createApp();
  const httpServer = createServer(app);
  const io = initializeSocketServer(httpServer);
  backgroundJobService.start();

  httpServer.listen(env.PORT, () => logger.info(`Server listening on port ${env.PORT}`));

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
