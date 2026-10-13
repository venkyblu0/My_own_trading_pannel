import { Router } from 'express';
import { getRequestLogs } from '../upstox/client.js';

export const logsRouter = Router();

logsRouter.get('/logs', (_req, res) => {
  res.json({
    ok: true,
    logs: getRequestLogs(),
  });
});
