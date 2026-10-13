# Trading Studio — Changelog

## [Phase 1] - Skeleton, Layout & Data Pipe (2026-10-13)

### Added
- **Full Layout Shells**: TradingView-inspired Terminal Night dark layout (`#0B0E11`).
  - Top Bar with exchange selector (NSE, BSE, NSE Indices, MCX), timeframe buttons (1m to 1M), chart type menu, indicators/strategies shells, and live metric indicators.
  - Left Drawing Toolbar with 7 core drawing tools, magnet mode, lock all, hide all, and trash utilities.
  - Center Chart pane shell with crosshair legend, dark grid pattern, and candle status inspector.
  - Collapsible right Watchlist sidebar with Nifty 50, Reliance, HDFC Bank, ICICI Bank, Infosys, and TCS, plus symbol details inspector.
  - Resizable and collapsible bottom panel with tabs: Strategy Tester, Signals, Trades, Scanner, and interactive Logs tab.
  - Persistent Status bar featuring Upstox API v3 connection indicator, secret verification badge, market status (IST 09:15-15:30), and live IST clock.
- **Upstox API v3 Backend Pipe**:
  - `GET /api/health` reporting `{ ok: true, tokenSet: boolean }` without ever exposing secret tokens.
  - `GET /api/instruments` with daily cached Upstox master lists (`NSE.json.gz`, `BSE.json.gz`), filtering by exchange and equity/derivatives.
  - `GET /api/candles` with automatic timeframe mapping, Upstox API v3 date-range chunking (1m-15m 1 month; 1h 1 quarter; 1D 10 years), rate limit management, exponential backoff on HTTP 429, and disk caching.
  - `GET /api/logs` recording data queries, candle counts, source (cache vs live), and latency.
- **Unit Tests**:
  - Timeframe configuration mapping.
  - Date-range chunking (e.g. 1m over 3 months -> 4 chunks; 1D over 16 years -> 2 chunks).
  - Candle array normalization, time deduplication, and ascending sort order.
