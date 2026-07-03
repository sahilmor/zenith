import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();
const httpServer = createServer(app);

new Server(httpServer, {
  cors: {
    credentials: true,
    origin: env.CORS_ORIGIN,
  },
});

httpServer.listen(env.PORT, () => {
  console.info(`Server listening on port ${env.PORT}`);
});
