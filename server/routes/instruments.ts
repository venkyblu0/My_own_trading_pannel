import { Router } from 'express';
import { searchInstruments } from '../upstox/client.js';

export const instrumentsRouter = Router();

instrumentsRouter.get('/instruments', (req, res) => {
  const q = String(req.query.q || '');
  const exchange = String(req.query.exchange || 'NSE');
  const includeDerivatives = req.query.includeDerivatives === 'true';

  const results = searchInstruments(q, exchange, includeDerivatives);
  res.json({
    ok: true,
    count: results.length,
    instruments: results,
  });
});
