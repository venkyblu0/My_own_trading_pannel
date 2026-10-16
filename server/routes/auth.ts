import { Router } from 'express';
import {
  loginViaTotp,
  loginViaAuthCode,
  setTokenDirect,
  clearServerSession,
  getSessionStatus,
} from '../upstox/client.js';

export const authRouter = Router();

// GET /api/auth/status
authRouter.get('/auth/status', (_req, res) => {
  const status = getSessionStatus();
  res.json({
    ok: true,
    ...status,
  });
});

// POST /api/auth/token - Direct token (1-year Analytics Token or daily Access Token)
authRouter.post('/auth/token', async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ ok: false, error: 'Token is required' });
    return;
  }

  try {
    const profile = await setTokenDirect(token);
    res.json({
      ok: true,
      profile,
      message: 'Token configured successfully on server',
    });
  } catch (err: any) {
    res.status(400).json({
      ok: false,
      error: err.message || 'Failed to save token',
    });
  }
});

// POST /api/auth/totp - Acquire token via Upstox TOTP API
authRouter.post('/auth/totp', async (req, res) => {
  const { apiKey, pin, totp } = req.body;

  if (!apiKey || !pin || !totp) {
    res.status(400).json({
      ok: false,
      error: 'apiKey, 6-digit pin, and 6-digit totp are required',
    });
    return;
  }

  try {
    const profile = await loginViaTotp(apiKey, pin, totp);
    res.json({
      ok: true,
      profile,
      message: 'Logged in successfully via Upstox TOTP',
    });
  } catch (err: any) {
    res.status(400).json({
      ok: false,
      error: err.message || 'TOTP login failed',
    });
  }
});

// POST /api/auth/code - Acquire token via Authorization Code
authRouter.post('/auth/code', async (req, res) => {
  const { code, clientId, clientSecret, redirectUri } = req.body;

  if (!code || !clientId || !clientSecret || !redirectUri) {
    res.status(400).json({
      ok: false,
      error: 'code, client_id, client_secret, and redirect_uri are required',
    });
    return;
  }

  try {
    const profile = await loginViaAuthCode(code, clientId, clientSecret, redirectUri);
    res.json({
      ok: true,
      profile,
      message: 'Logged in successfully via Auth Code',
    });
  } catch (err: any) {
    res.status(400).json({
      ok: false,
      error: err.message || 'Auth code login failed',
    });
  }
});

// POST /api/auth/disconnect - Remove active token
authRouter.post('/auth/disconnect', (_req, res) => {
  clearServerSession();
  res.json({
    ok: true,
    message: 'Disconnected Upstox session',
  });
});
