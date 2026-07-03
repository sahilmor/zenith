import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const initializeSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, { cors: { credentials: true, origin: env.CLIENT_URL } });

  io.on('connection', (socket) => {
    logger.debug('Socket connected', { socketId: socket.id });
    socket.on('disconnect', (reason) =>
      logger.debug('Socket disconnected', { socketId: socket.id, reason }),
    );
  });

  return io;
};
