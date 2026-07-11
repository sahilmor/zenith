import { Router } from 'express';
import { getDatabaseState } from '../db/connection.js';
import { backgroundJobService } from '../features/ops/services/background-job.service.js';

export const healthRouter = Router();

healthRouter.get('/', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

healthRouter.get('/live', (_request, response) => {
  response.status(200).json({ status: 'alive', uptime: process.uptime() });
});

healthRouter.get('/ready', (_request, response) => {
  const database = getDatabaseState();
  const ready = database === 'connected';
  response.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    checks: {
      database,
      jobs: backgroundJobService.status(),
    },
  });
});
