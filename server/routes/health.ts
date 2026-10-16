import { Router } from 'express';
import { getActiveToken, getSessionStatus } from '../upstox/client.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const token = getActiveToken();
  const tokenSet = Boolean(token && token.trim().length > 0);
  const status = getSessionStatus();

  res.json({
    ok: true,
    tokenSet,
    userName: status.userName,
    userId: status.userId,
    source: status.source,
    expiresAt: status.expiresAt,
  });
});
