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
- **In-App Upstox Authentication (No AI Studio Settings Required)**:
  - Direct Token Connect for 1-Year Analytics Token or daily Access Token.
  - TOTP & PIN Login via Upstox API v2 (`POST /v2/totp-login/authorization/token`).
  - Auth Code OAuth Exchange (`POST /v2/login/authorization/token`).
  - Secure server-side caching (`/server/cache/token_session.json`) keeping credentials private from client scripts.
## [Phase 2] - The Chart: KLineChart, Timeframes, Indicators & Drawings (2026-10-13)

### Added
- **KLineChart Canvas Engine**:
  - Full interactive chart mounted via KLineChart (`klinecharts` Apache 2.0).
  - Terminal Night theme: `#0B0E11` background, `#141A22` grid, `#26A69A` up candles, `#EF5350` down candles, `#F0B90B` amber accents.
  - Live data feed using DataLoader with backward lazy scrolling for older history.
  - Crosshair hover tracking O, H, L, C, change %, and volume in IST time (`Asia/Kolkata`).
- **Chart Types**:
  - Solid Candles, Hollow Candles, OHLC Bars, Line, Area.
  - Heikin Ashi transformation computed in code with unit tests against hand-computed candles.
- **Indicators Engine**:
  - Default layout: **SMA 44** on price pane and **Volume (VOL)** on lower sub-pane.
  - Searchable Indicators modal with 15 built-in indicators (SMA, EMA, MA, BOLL, SAR, BBI, VOL, MACD, RSI, KDJ, OBV, CCI, DMI, WR, BIAS).
  - Parameter customization (e.g. MA periods) and per-indicator removal.
- **Drawing Tools & Overlays**:
  - Trend line (`segment`), Ray (`rayLine`), Extended line (`straightLine`), Horizontal line (`horizontalStraightLine`), Fibonacci retracement (`fibonacciLine`), Brush (`brush`), Text notes (`simpleAnnotation`), Parallel channel (`parallelStraightLine`).
  - Magnet mode (`weak_magnet`), Lock all drawings, Hide/Show all drawings, Clear all drawings.
  - LocalStorage persistence per symbol + timeframe.
  - Keyboard shortcuts: `Alt+T` (trend line), `Alt+H` (horizontal line), `Esc` (cancel), `1-9` (timeframes).
- **About Dialog**:
  - Open-source license attribution for KLineChart (Apache-2.0) and Upstox API v3 market data.

## [Phase 3] - Strategy Engine & Quantitative Backtester, Visual Signals on Chart, Trade Ledger & Scanner (2026-10-14)

### Added
- **Quantitative Strategy & Backtesting Engine**:
  - 5 Built-in deterministic Indian market strategies:
    - **44 SMA Pullback**: High-probability swing setup on rising 44 SMA with bullish confirmation candle and 200 SMA macro trend filter.
    - **EMA 9/21 Trend Crossover**: Fast momentum trend engine with dynamic target projection.
    - **Supertrend (10, 3)**: ATR-based volatility band flips with trailing stop support.
    - **RSI Mean Reversion (14)**: Oversold accumulation bounce (RSI < 30 hooking back upwards).
    - **Bollinger Band Squeeze Breakout (20, 2)**: Volatility contraction identification with explosive upper band breakout.
  - Institutional-grade quantitative risk metrics:
    - Net Profit (₹ and %), Total Trades, Winning/Losing counts, Win Rate %.
    - Profit Factor, Annualized Sharpe Ratio approximation, Mathematical Expectancy per trade.
    - Max Drawdown (% and ₹), Win/Loss Ratio, Recovery Factor, Max Consecutive Wins & Losses.
- **Interactive Visual Signals & Trade Execution Overlays on KLineChart**:
  - Custom canvas indicator `STRATEGY_OVERLAY` rendering directly on the candlestick pane.
  - Crisp upward green triangles and entry price badges (`▲ BUY ₹...`) positioned right at candle lows.
  - Dashed trade execution vectors connecting Entry candle to Exit candle with exit PnL pill badges (`✓ +%` or `✕ -%`).
  - Projection guidelines for Target 1 (emerald dashed line) and Stop Loss (crimson dashed line) on active/inspected setups.
  - Toggle button in chart header to show/hide signals on the chart.
- **Interactive Chart Synchronization (Locate on Chart)**:
  - Clicking any trade in the **Trades Tab** or signal in the **Signals Tab** smoothly scrolls and centers that candle on the chart canvas via `chart.scrollToTimestamp`.
  - Selected trade or signal is visually highlighted with a luminous halo and active target/SL projection.
- **Enhanced Performance Visualizer**:
  - Dual-mode SVG visualizer: **Performance Equity Curve** and **Underwater Drawdown Curve**.
  - Interactive hover inspector reporting exact date, equity amount in INR, and drawdown percentage.
  - Inline quick-parameters adjust drawer for real-time risk and strategy parameter tweaking.
- **Indian Equities Technical Scanner**:
  - Expanded 16-symbol NSE universe (Nifty 50, Reliance, HDFC Bank, ICICI Bank, Infosys, TCS, SBI, ITC, Hindustan Unilever, L&T, Tata Motors, Bajaj Finance, Axis Bank, Bharti Airtel, Kotak Bank, Maruti).
  - Filter by 5 setup categories: All Setups, 44 SMA Pullback, EMA 9/21 Cross, RSI Oversold, Volume Spikes, and Bollinger Squeeze.
  - Setup confidence scores (0-100%) and clear technical rationale.
  - Single-click to select any scanned stock: immediately switches the chart, loads historical data, and simulates strategies.
- **Real-Time Signal Alert Notification**:
  - Floating toast notification banner when a strategy setup triggers on recent candles.
- **Unit Testing & Robustness**:
  - Comprehensive Vitest test suite with 18 automated unit tests covering indicator mathematics, all 5 backtest strategies, risk metrics, and technical scanner classification.
- **Backtesting Fixes & Usability Upgrades**:
  - Mounted `<StrategiesModal />` in main layout so the Strategy selection and parameter configuration modal opens cleanly from TopBar, Chart toolbar, and Strategy Tester.
  - Added responsive execution feedback with `isBacktesting` active spinner on all "Run Backtest" buttons, eliminating silent execution and assuring user of real-time simulation progress.
  - Added Backtest Period filtering (`ALL`, `1Y`, `6M`, `3M`, `1M`) to simulate performance across different historical market cycles.
  - Added Watchlist Comparative Leaderboard mode allowing one-click backtest across all Indian watchlist equities with performance ranking table.
  - Added user-facing status and error banners with instant candle reload if network data is pending.

## [Phase 3.1] - Chart & Data Sorting Corrections (2026-10-15)

### Fixed & Enhanced
- **Strict Chronological Chart Candlestick Sorting**:
  - Enforced strict ascending timestamp sort order and key deduplication on all candle inputs before feeding KlineCharts.
  - Resolved backward pagination boundary duplication where older historical bars fetched during left-scroll could overlap with existing candles.
  - Guaranteed chronological ordering on the performance equity curve and drawdown curve SVG visualizers.
- **Trade Execution Ledger (`TradesTab`) Sorting**:
  - Defaulted to **Newest First** order (most recent execution at the top), replacing the reverse chronological display.
  - Added full interactive column sorting on Trade #, Type, Entry Time, Entry Price, Exit Time, Exit Price, Shares, P&L (₹), P&L (%), Holding Bars, Exit Reason, and Account Equity with visual directional indicators (`▲` / `▼` / `↕`).
  - Added one-click quick presets: *Newest First*, *Oldest First*, *Best P&L*, and *Worst P&L*.
- **Strategy Signals Feed (`SignalsTab`) Sorting**:
  - Defaulted to **Newest First** order so current active signals are displayed at the top rather than buried beneath historical trades.
  - Added interactive column sorting on Time, Trigger Price, Stop Loss, Target 1, Target 2, Status, and Setup Rationale.
- **Watchlist Ranking Leaderboard Sorting**:
  - Added multi-column sorting across all 9 metrics: Rank, Symbol, LTP, Net Profit, Return %, Win Rate, Trades, Profit Factor, and Max Drawdown.
- **Watchlist Sidebar & Scanner Sorting**:
  - Added multi-mode sorting to the right Watchlist Sidebar: Default, Top Gainers (%), Top Losers (%), Symbol (A-Z), and Highest Price.
  - Added interactive header sorting to the Technical Scanner table (Symbol, LTP, Change %, Signal, Setup Score).
- **Backend Logs Query Sorting**:
  - Corrected `getRequestLogs()` to return the 100 most recent requests (newest first) instead of slicing the tail of the unshifted list.
  - Added column sorting on the bottom panel Logs table (Status, Time, Symbol, Timeframe, Candles, Latency).
