import { Router } from 'express';
import { getHistoricalCandles, getMarketQuote } from '../upstox/client.js';

export const candlesRouter = Router();

candlesRouter.get('/quote', async (req, res) => {
  const key = req.query.key as string;
  if (!key) {
    res.status(400).json({ ok: false, error: 'Query parameter "key" is required' });
    return;
  }

  try {
    const quote = await getMarketQuote(key);
    if (!quote) {
      res.status(404).json({ ok: false, error: 'Market quote unavailable for symbol' });
      return;
    }
    res.json({
      ok: true,
      quote,
    });
  } catch (err: any) {
    const message = err?.message || 'Failed to fetch market quote';
    const status = message.includes('UPSTOX_TOKEN secret not set') ? 503 : 500;
    res.status(status).json({
      ok: false,
      error: message,
    });
  }
});

candlesRouter.get('/candles', async (req, res) => {
  const key = req.query.key as string;
  const tf = (req.query.tf as string) || '1D';
  let from = req.query.from as string;
  let to = req.query.to as string;

  if (!key) {
    res.status(400).json({ ok: false, error: 'Query parameter "key" (instrument key) is required' });
    return;
  }

  // If no date range provided, default to last 2 years for 1D, or last 1 month for intraday
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  if (!to) {
    to = todayStr;
  }
  if (!from) {
    const fromDate = new Date();
    if (tf === '1D') {
      fromDate.setFullYear(today.getFullYear() - 2);
    } else if (tf === '1W' || tf === '1M') {
      fromDate.setFullYear(today.getFullYear() - 5);
    } else {
      fromDate.setDate(today.getDate() - 30);
    }
    from = fromDate.toISOString().slice(0, 10);
  }

  try {
    const result = await getHistoricalCandles(key, tf, from, to);
    res.json({
      ok: true,
      key,
      tf,
      from,
      to,
      durationMs: result.durationMs,
      cached: result.cached,
      count: result.candles.length,
      candles: result.candles,
    });
  } catch (err: any) {
    const message = err?.message || 'Failed to fetch candle data';
    const status = message.includes('UPSTOX_TOKEN secret not set') ? 503 : 500;
    res.status(status).json({
      ok: false,
      error: message,
    });
  }
});

