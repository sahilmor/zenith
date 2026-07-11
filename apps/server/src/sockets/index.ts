import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { isAllowedOrigin } from '../middleware/security.middleware.js';
import { logger } from '../utils/logger.js';
import { authenticateSocket } from './auth.middleware.js';
import { registerSocketHandlers } from './event-handlers.js';
import { realtimeService } from './realtime.service.js';
import type { ClientToServerEvents, ServerToClientEvents } from './socket.types.js';

export const initializeSocketServer = (
  httpServer: HttpServer,
): Server<ClientToServerEvents, ServerToClientEvents> => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      credentials: true,
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
      },
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 120_000,
      skipMiddlewares: false,
    },
  });

  io.use((socket, next) => void authenticateSocket(socket, next));
  realtimeService.bind(io);

  io.on('connection', (socket) => {
    logger.debug('Socket connected', { socketId: socket.id });
    registerSocketHandlers(socket);
    socket.on('disconnect', (reason) => {
      logger.debug('Socket disconnected', { socketId: socket.id, reason });
    });
  });

  return io;
};
