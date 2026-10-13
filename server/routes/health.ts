import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const tokenSet = Boolean(process.env.UPSTOX_TOKEN && process.env.UPSTOX_TOKEN.trim().length > 0);
  res.json({
    ok: true,
    tokenSet,
  });
});
