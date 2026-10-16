import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { healthRouter } from './server/routes/health.js';
import { instrumentsRouter } from './server/routes/instruments.js';
import { candlesRouter } from './server/routes/candles.js';
import { logsRouter } from './server/routes/logs.js';
import { authRouter } from './server/routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.use(express.json());

  // Mount API routes
  app.use('/api', healthRouter);
  app.use('/api', instrumentsRouter);
  app.use('/api', candlesRouter);
  app.use('/api', logsRouter);
  app.use('/api', authRouter);

  if (!isProduction) {
    // In dev mode, integrate Vite dev server via middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built client assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Trading Studio] Server running on http://0.0.0.0:${PORT} (env: ${isProduction ? 'prod' : 'dev'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
