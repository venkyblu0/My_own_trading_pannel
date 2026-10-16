import { create } from 'zustand';
import { Instrument, Timeframe, ChartType, BottomPanelTab, Candle, WatchlistItem, CandleLogEntry, LiveQuote } from '../types/index.ts';
import { StrategyId, BacktestResult, ScannerItem } from '../strategies/types.ts';
import { BUILT_IN_STRATEGIES } from '../strategies/definitions.ts';
import { runBacktest } from '../strategies/engine.ts';
import { analyzeSymbolForSetups, ScannerFilterType, INDIAN_MARKET_UNIVERSE } from '../strategies/scanner.ts';

interface AppState {
  // Exchange & Symbol
  exchange: string;
  setExchange: (ex: string) => void;
  selectedInstrument: Instrument;
  setSelectedInstrument: (inst: Instrument) => void;

  // Timeframe & Chart
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  chartType: ChartType;
  setChartType: (ct: ChartType) => void;

  // Indicators
  activeIndicators: Array<{ id: string; name: string; isOverlay: boolean; params: number[] }>;
  addIndicator: (name: string, isOverlay: boolean, params?: number[]) => void;
  removeIndicator: (id: string) => void;
  updateIndicatorParams: (id: string, params: number[]) => void;
  isIndicatorsModalOpen: boolean;
  openIndicatorsModal: () => void;
  closeIndicatorsModal: () => void;

  // Strategy & Backtesting
  activeStrategyId: StrategyId;
  setActiveStrategyId: (id: StrategyId) => void;
  strategyParams: Record<string, any>;
  updateStrategyParams: (params: Record<string, any>) => void;
  backtestResult: BacktestResult | null;
  isBacktesting: boolean;
  backtestStatusMessage: string | null;
  backtestError: string | null;
  backtestPeriod: 'ALL' | '1Y' | '6M' | '3M' | '1M';
  setBacktestPeriod: (period: 'ALL' | '1Y' | '6M' | '3M' | '1M') => void;
  runStrategyBacktest: (strategyId?: StrategyId, customParams?: Record<string, any>) => Promise<void>;
  watchlistBacktestResults: Array<{
    symbol: string;
    name: string;
    lastPrice: number;
    winRatePct: number;
    netProfit: number;
    netProfitPct: number;
    totalTrades: number;
    profitFactor: number;
    maxDrawdownPct: number;
  }>;
  isWatchlistBacktesting: boolean;
  runWatchlistBacktest: () => Promise<void>;
  isStrategiesModalOpen: boolean;
  openStrategiesModal: () => void;
  closeStrategiesModal: () => void;

  // Strategy Overlay & Interactive Inspection
  showStrategyOverlay: boolean;
  toggleStrategyOverlay: () => void;
  jumpToTimestamp: number | null;
  setJumpToTimestamp: (ts: number | null) => void;
  inspectedSignalId: string | null;
  setInspectedSignalId: (id: string | null) => void;
  inspectedTradeId: string | null;
  setInspectedTradeId: (id: string | null) => void;
  signalNotification: { symbol: string; text: string; type: 'BUY' | 'SELL'; time: number } | null;
  dismissSignalNotification: () => void;

  // Market Scanner
  scannerResults: ScannerItem[];
  isScanning: boolean;
  scannerFilter: ScannerFilterType;
  setScannerFilter: (f: ScannerFilterType) => void;
  runMarketScan: (filter?: ScannerFilterType) => Promise<void>;

  // About modal
  isAboutModalOpen: boolean;
  openAboutModal: () => void;
  closeAboutModal: () => void;

  // Drawing Tools
  activeDrawingTool: string | null;
  setActiveDrawingTool: (tool: string | null) => void;
  isMagnetActive: boolean;
  toggleMagnet: () => void;
  isDrawingsLocked: boolean;
  toggleDrawingsLock: () => void;
  isDrawingsHidden: boolean;
  toggleDrawingsHide: () => void;
  clearDrawingsTrigger: number;
  clearAllDrawings: () => void;

  // Candles Data
  candles: Candle[];
  isLoadingCandles: boolean;
  candleError: string | null;
  fetchCandles: (instrumentKey?: string, tf?: Timeframe) => Promise<void>;

  // Metrics for Top Bar & Live Ticker
  lastClose: number | null;
  priceChange: number | null;
  priceChangePct: number | null;
  sessionHigh: number | null;
  sessionLow: number | null;
  sessionVolume: number | null;
  liveQuote: LiveQuote | null;
  fetchLiveQuote: () => Promise<LiveQuote | null>;

  // Server & Upstox status
  isTokenSet: boolean;
  authUserName: string | null;
  authUserId: string | null;
  authSource: string | null;
  authExpiresAt: string | null;
  checkServerHealth: () => Promise<void>;

  // Auth modal
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  loginWithToken: (token: string) => Promise<{ success: boolean; error?: string }>;
  loginWithTotp: (apiKey: string, pin: string, totp: string) => Promise<{ success: boolean; error?: string }>;
  loginWithAuthCode: (code: string, clientId: string, clientSecret: string, redirectUri: string) => Promise<{ success: boolean; error?: string }>;
  disconnectAuth: () => Promise<void>;

  // Watchlist
  isWatchlistOpen: boolean;
  toggleWatchlist: () => void;
  watchlist: WatchlistItem[];
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (key: string) => void;

  // Bottom Panel
  bottomPanelTab: BottomPanelTab;
  setBottomPanelTab: (tab: BottomPanelTab) => void;
  isBottomPanelCollapsed: boolean;
  toggleBottomPanel: () => void;
  bottomPanelHeight: number;
  setBottomPanelHeight: (height: number) => void;

  // Logs
  logs: CandleLogEntry[];
  fetchLogs: () => Promise<void>;
}

const DEFAULT_INSTRUMENT: Instrument = {
  key: 'NSE_EQ|INE002A01018',
  symbol: 'RELIANCE',
  name: 'RELIANCE INDUSTRIES LTD',
  exchange: 'NSE',
  segment: 'NSE_EQ',
  type: 'EQUITY',
  tickSize: 0.05,
  lotSize: 1,
};

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { key: 'NSE_INDEX|Nifty 50', symbol: 'NIFTY 50', name: 'Nifty 50 Index', exchange: 'NSE', lastPrice: 24850.50, change: 125.40, changePct: 0.51 },
  { key: 'NSE_EQ|INE002A01018', symbol: 'RELIANCE', name: 'RELIANCE INDUSTRIES LTD', exchange: 'NSE', lastPrice: 2980.25, change: 32.10, changePct: 1.09 },
  { key: 'NSE_EQ|INE040A01034', symbol: 'HDFCBANK', name: 'HDFC BANK LTD', exchange: 'NSE', lastPrice: 1680.00, change: -12.40, changePct: -0.73 },
  { key: 'NSE_EQ|INE090A01021', symbol: 'ICICIBANK', name: 'ICICI BANK LTD', exchange: 'NSE', lastPrice: 1245.50, change: 18.20, changePct: 1.48 },
  { key: 'NSE_EQ|INE009A01021', symbol: 'INFY', name: 'INFOSYS LTD', exchange: 'NSE', lastPrice: 1890.75, change: 5.60, changePct: 0.30 },
  { key: 'NSE_EQ|INE467B01029', symbol: 'TCS', name: 'TATA CONSULTANCY SERVICES LTD', exchange: 'NSE', lastPrice: 4210.00, change: -24.80, changePct: -0.59 },
  { key: 'NSE_EQ|INE062A01020', symbol: 'SBIN', name: 'STATE BANK OF INDIA', exchange: 'NSE', lastPrice: 810.20, change: 8.40, changePct: 1.05 },
  { key: 'NSE_EQ|INE154A01025', symbol: 'ITC', name: 'ITC LTD', exchange: 'NSE', lastPrice: 485.50, change: 2.10, changePct: 0.43 },
  { key: 'NSE_EQ|INE030A01027', symbol: 'HINDUNILVR', name: 'HINDUSTAN UNILEVER LTD', exchange: 'NSE', lastPrice: 2680.00, change: -15.30, changePct: -0.57 },
  { key: 'NSE_EQ|INE018A01030', symbol: 'LT', name: 'LARSEN & TOUBRO LTD', exchange: 'NSE', lastPrice: 3590.00, change: 42.00, changePct: 1.18 },
];

export const useAppStore = create<AppState>((set, get) => ({
  exchange: 'NSE',
  setExchange: (exchange) => set({ exchange }),
  selectedInstrument: DEFAULT_INSTRUMENT,
  setSelectedInstrument: (inst) => {
    set({ selectedInstrument: inst });
    get().fetchCandles(inst.key, get().timeframe);
  },

  timeframe: '1D',
  setTimeframe: (timeframe) => {
    set({ timeframe });
    get().fetchCandles(get().selectedInstrument.key, timeframe);
  },
  chartType: 'candles',
  setChartType: (chartType) => set({ chartType }),

  // Indicators: Default to SMA 44 and Volume overlaid directly over candles
  activeIndicators: (() => {
    try {
      const saved = localStorage.getItem('trading_studio_indicators');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'sma_44', name: 'SMA', isOverlay: true, params: [44] },
      { id: 'vol', name: 'VOL', isOverlay: true, params: [5, 10, 20] },
    ];
  })(),
  addIndicator: (name, isOverlay, params) => {
    set((state) => {
      const newInd = {
        id: `${name.toLowerCase()}_${Date.now()}`,
        name,
        isOverlay,
        params: params || (name === 'SMA' ? [44] : [14]),
      };
      const updated = [...state.activeIndicators, newInd];
      try {
        localStorage.setItem('trading_studio_indicators', JSON.stringify(updated));
      } catch {}
      return { activeIndicators: updated };
    });
  },
  removeIndicator: (id) => {
    set((state) => {
      const updated = state.activeIndicators.filter((i) => i.id !== id);
      try {
        localStorage.setItem('trading_studio_indicators', JSON.stringify(updated));
      } catch {}
      return { activeIndicators: updated };
    });
  },
  updateIndicatorParams: (id, params) => {
    set((state) => {
      const updated = state.activeIndicators.map((i) => (i.id === id ? { ...i, params } : i));
      try {
        localStorage.setItem('trading_studio_indicators', JSON.stringify(updated));
      } catch {}
      return { activeIndicators: updated };
    });
  },
  isIndicatorsModalOpen: false,
  openIndicatorsModal: () => set({ isIndicatorsModalOpen: true }),
  closeIndicatorsModal: () => set({ isIndicatorsModalOpen: false }),

  // Strategy & Backtesting
  activeStrategyId: 'sma44_pullback',
  setActiveStrategyId: (activeStrategyId) => {
    const defaultParams = BUILT_IN_STRATEGIES[activeStrategyId]?.params || {};
    set({ activeStrategyId, strategyParams: defaultParams });
    get().runStrategyBacktest(activeStrategyId, defaultParams);
  },
  strategyParams: BUILT_IN_STRATEGIES['sma44_pullback'].params,
  updateStrategyParams: (strategyParams) => {
    set({ strategyParams });
    get().runStrategyBacktest(get().activeStrategyId, strategyParams);
  },
  backtestResult: null,
  isBacktesting: false,
  backtestStatusMessage: null,
  backtestError: null,
  backtestPeriod: 'ALL',
  setBacktestPeriod: (backtestPeriod) => {
    set({ backtestPeriod });
    get().runStrategyBacktest();
  },
  watchlistBacktestResults: [],
  isWatchlistBacktesting: false,

  runStrategyBacktest: async (stratId?: StrategyId, customParams?: Record<string, any>) => {
    const sId = stratId || get().activeStrategyId;
    const params = customParams || get().strategyParams;
    let candles = get().candles;
    const symbol = get().selectedInstrument.symbol;
    const timeframe = get().timeframe;
    const period = get().backtestPeriod;

    set({ isBacktesting: true, backtestError: null });

    // If candles are missing, try fetching first
    if (!candles || candles.length < 15) {
      try {
        await get().fetchCandles(get().selectedInstrument.key, timeframe);
        candles = get().candles;
      } catch {}
    }

    if (!candles || candles.length < 15) {
      set({
        isBacktesting: false,
        backtestError: `Insufficient candle data for ${symbol} (${candles?.length ?? 0} bars). Try changing timeframe or symbol.`,
      });
      return;
    }

    // Ensure candles are strictly sorted chronologically ascending
    const sortedCandles = [...candles].sort((a, b) => a.time - b.time);
    let candlesToTest = sortedCandles;
    const latestTime = sortedCandles[sortedCandles.length - 1].time;
    if (period === '1Y') {
      const cutoff = latestTime - 365 * 24 * 60 * 60 * 1000;
      candlesToTest = candles.filter((c) => c.time >= cutoff);
    } else if (period === '6M') {
      const cutoff = latestTime - 180 * 24 * 60 * 60 * 1000;
      candlesToTest = candles.filter((c) => c.time >= cutoff);
    } else if (period === '3M') {
      const cutoff = latestTime - 90 * 24 * 60 * 60 * 1000;
      candlesToTest = candles.filter((c) => c.time >= cutoff);
    } else if (period === '1M') {
      const cutoff = latestTime - 30 * 24 * 60 * 60 * 1000;
      candlesToTest = candles.filter((c) => c.time >= cutoff);
    }

    if (candlesToTest.length < 10) {
      candlesToTest = candles; // Fallback to full series if filter is too narrow
    }

    // Small async yield to allow UI to render the active simulation spinner
    await new Promise((resolve) => setTimeout(resolve, 80));

    try {
      const result = runBacktest(candlesToTest, sId, params, symbol, timeframe);
      const sign = result.netProfit >= 0 ? '+' : '';
      const summaryMsg = `Simulation Complete: ${result.totalTrades} trades (${result.winningTrades}W / ${result.losingTrades}L) · ${result.winRatePct.toFixed(1)}% win rate · Net Profit: ${sign}₹${result.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${sign}${result.netProfitPct.toFixed(2)}%)`;

      set({
        backtestResult: result,
        isBacktesting: false,
        backtestError: null,
        backtestStatusMessage: summaryMsg,
      });

      // Signal notification for recent trigger
      if (result.signals.length > 0) {
        const latestSig = result.signals[result.signals.length - 1];
        set({
          signalNotification: {
            symbol,
            text: `${latestSig.strategyName}: ${latestSig.type} at ₹${latestSig.price.toFixed(2)} (${latestSig.riskReward})`,
            type: latestSig.type,
            time: latestSig.time,
          },
        });
      }
    } catch (e: any) {
      console.warn('Backtest run error:', e);
      set({
        isBacktesting: false,
        backtestError: e?.message || 'Error executing backtest simulation algorithm.',
      });
    }
  },

  runWatchlistBacktest: async () => {
    const sId = get().activeStrategyId;
    const params = get().strategyParams;
    const timeframe = get().timeframe;
    const watchlist = get().watchlist;

    set({ isWatchlistBacktesting: true });

    const results: Array<{
      symbol: string;
      name: string;
      lastPrice: number;
      winRatePct: number;
      netProfit: number;
      netProfitPct: number;
      totalTrades: number;
      profitFactor: number;
      maxDrawdownPct: number;
    }> = [];

    for (const item of watchlist) {
      try {
        const res = await fetch(`/api/candles?key=${encodeURIComponent(item.key)}&tf=${timeframe}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data.ok && Array.isArray(data.candles) && data.candles.length >= 20) {
          const bt = runBacktest(data.candles, sId, params, item.symbol, timeframe);
          results.push({
            symbol: item.symbol,
            name: item.name,
            lastPrice: item.lastPrice,
            winRatePct: bt.winRatePct,
            netProfit: bt.netProfit,
            netProfitPct: bt.netProfitPct,
            totalTrades: bt.totalTrades,
            profitFactor: bt.profitFactor,
            maxDrawdownPct: bt.maxDrawdownPct,
          });
        }
      } catch {
        // continue
      }
    }

    // Sort by net profit descending
    results.sort((a, b) => b.netProfit - a.netProfit);

    set({
      watchlistBacktestResults: results,
      isWatchlistBacktesting: false,
      backtestStatusMessage: `Watchlist Backtest Finished: Analyzed ${results.length} Indian equities for ${BUILT_IN_STRATEGIES[sId]?.name || sId}`,
    });
  },

  isStrategiesModalOpen: false,
  openStrategiesModal: () => set({ isStrategiesModalOpen: true }),
  closeStrategiesModal: () => set({ isStrategiesModalOpen: false }),

  // Strategy Overlay & Interactive Inspection
  showStrategyOverlay: true,
  toggleStrategyOverlay: () => set((s) => ({ showStrategyOverlay: !s.showStrategyOverlay })),
  jumpToTimestamp: null,
  setJumpToTimestamp: (jumpToTimestamp) => set({ jumpToTimestamp }),
  inspectedSignalId: null,
  setInspectedSignalId: (inspectedSignalId) => set({ inspectedSignalId }),
  inspectedTradeId: null,
  setInspectedTradeId: (inspectedTradeId) => set({ inspectedTradeId }),
  signalNotification: null,
  dismissSignalNotification: () => set({ signalNotification: null }),

  // Market Scanner
  scannerResults: [],
  isScanning: false,
  scannerFilter: 'all',
  setScannerFilter: (scannerFilter) => set({ scannerFilter }),
  runMarketScan: async () => {
    set({ isScanning: true });
    const universe = INDIAN_MARKET_UNIVERSE;
    const results: ScannerItem[] = [];

    // Analyze currently loaded chart symbol first with full candles
    const currentInst = get().selectedInstrument;
    const currentCandles = get().candles;
    if (currentCandles.length > 0) {
      const currentWatchItem: WatchlistItem = {
        key: currentInst.key,
        symbol: currentInst.symbol,
        name: currentInst.name,
        exchange: currentInst.exchange,
        lastPrice: get().lastClose || 0,
        change: get().priceChange || 0,
        changePct: get().priceChangePct || 0,
      };
      const res = analyzeSymbolForSetups(currentWatchItem, currentCandles);
      if (res) results.push(res);
    }

    // Scan other symbols across the Indian Market Universe
    for (const item of universe) {
      if (item.key === currentInst.key) continue;

      try {
        const res = await fetch(`/api/candles?key=${encodeURIComponent(item.key)}&tf=1D`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.candles) && data.candles.length > 0) {
            const scanItem = analyzeSymbolForSetups(item, data.candles);
            if (scanItem) results.push(scanItem);
            continue;
          }
        }
      } catch {
        // Fallback scan analysis on quote
      }

      // Fallback synthetic scan item if candle fetch fails
      results.push({
        key: item.key,
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchange,
        lastPrice: item.lastPrice,
        changePct: item.changePct,
        signal: item.changePct >= 0 ? 'BULLISH' : 'BEARISH',
        setupName: item.changePct > 1 ? 'Momentum Trend' : 'Consolidation',
        setupScore: Math.min(90, Math.floor(50 + Math.abs(item.changePct) * 15)),
        details: `Trading ${item.changePct >= 0 ? '+' : ''}${item.changePct.toFixed(2)}% in session`,
      });
    }

    set({ scannerResults: results, isScanning: false });
  },

  // About modal
  isAboutModalOpen: false,
  openAboutModal: () => set({ isAboutModalOpen: true }),
  closeAboutModal: () => set({ isAboutModalOpen: false }),

  // Drawing tools
  activeDrawingTool: null,
  setActiveDrawingTool: (tool) => set({ activeDrawingTool: tool }),
  isMagnetActive: false,
  toggleMagnet: () => set((s) => ({ isMagnetActive: !s.isMagnetActive })),
  isDrawingsLocked: false,
  toggleDrawingsLock: () => set((s) => ({ isDrawingsLocked: !s.isDrawingsLocked })),
  isDrawingsHidden: false,
  toggleDrawingsHide: () => set((s) => ({ isDrawingsHidden: !s.isDrawingsHidden })),
  clearDrawingsTrigger: 0,
  clearAllDrawings: () => set((s) => ({ clearDrawingsTrigger: s.clearDrawingsTrigger + 1 })),

  candles: [],
  isLoadingCandles: false,
  candleError: null,

  lastClose: 2980.25,
  priceChange: 32.10,
  priceChangePct: 1.09,
  sessionHigh: 3010.00,
  sessionLow: 2945.50,
  sessionVolume: 8524000,
  liveQuote: null,

  fetchLiveQuote: async () => {
    const key = get().selectedInstrument.key;
    try {
      const res = await fetch(`/api/quote?key=${encodeURIComponent(key)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.ok || !data.quote) return null;
      const q: LiveQuote = data.quote;

      set((state) => ({
        lastClose: q.lastPrice,
        priceChange: q.change,
        priceChangePct: q.changePct,
        sessionHigh: state.sessionHigh ? Math.max(state.sessionHigh, q.high, q.lastPrice) : q.high,
        sessionLow: state.sessionLow ? Math.min(state.sessionLow, q.low, q.lastPrice) : q.low,
        sessionVolume: q.volume > 0 ? q.volume : state.sessionVolume,
        liveQuote: q,
        watchlist: state.watchlist.map((w) =>
          w.key === key ? { ...w, lastPrice: q.lastPrice, change: q.change, changePct: q.changePct } : w
        ),
      }));

      return q;
    } catch {
      return null;
    }
  },

  isTokenSet: false,
  authUserName: null,
  authUserId: null,
  authSource: null,
  authExpiresAt: null,

  isAuthModalOpen: false,
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  checkServerHealth: async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        set({
          isTokenSet: Boolean(data.tokenSet),
          authUserName: data.userName || null,
          authUserId: data.userId || null,
          authSource: data.source || null,
          authExpiresAt: data.expiresAt || null,
        });
      }
    } catch (e) {
      console.warn('Health check failed:', e);
    }
  },

  loginWithToken: async (token: string) => {
    try {
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { success: false, error: data.error || 'Failed to authenticate token' };
      }
      await get().checkServerHealth();
      get().fetchCandles();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  },

  loginWithTotp: async (apiKey: string, pin: string, totp: string) => {
    try {
      const res = await fetch('/api/auth/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, pin, totp }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { success: false, error: data.error || 'TOTP login failed' };
      }
      await get().checkServerHealth();
      get().fetchCandles();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  },

  loginWithAuthCode: async (code: string, clientId: string, clientSecret: string, redirectUri: string) => {
    try {
      const res = await fetch('/api/auth/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, clientId, clientSecret, redirectUri }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { success: false, error: data.error || 'Auth code login failed' };
      }
      await get().checkServerHealth();
      get().fetchCandles();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  },

  disconnectAuth: async () => {
    try {
      await fetch('/api/auth/disconnect', { method: 'POST' });
      set({
        isTokenSet: false,
        authUserName: null,
        authUserId: null,
        authSource: null,
        authExpiresAt: null,
      });
      get().fetchCandles();
    } catch (e) {
      console.warn('Disconnect failed:', e);
    }
  },

  fetchCandles: async (instrumentKey?: string, tf?: Timeframe) => {
    const key = instrumentKey || get().selectedInstrument.key;
    const timeframe = tf || get().timeframe;
    set({ isLoadingCandles: true, candleError: null });

    try {
      const res = await fetch(`/api/candles?key=${encodeURIComponent(key)}&tf=${timeframe}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const errMsg = data.error || 'Failed to load candle data';
        set({ candleError: errMsg, isLoadingCandles: false });
        get().fetchLogs();
        return;
      }

      const rawCandles: Candle[] = data.candles || [];
      // Guarantee strict ascending chronological sort and time deduplication
      const candleMap = new Map<number, Candle>();
      for (const c of rawCandles) {
        if (typeof c.time === 'number' && !isNaN(c.time)) {
          candleMap.set(c.time, c);
        }
      }
      const candles: Candle[] = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
      set({ candles, isLoadingCandles: false, candleError: null });

      if (candles.length > 0) {
        const latest = candles[candles.length - 1];
        const prev = candles.length > 1 ? candles[candles.length - 2] : latest;
        const change = latest.close - prev.close;
        const changePct = prev.close > 0 ? (change / prev.close) * 100 : 0;

        set({
          lastClose: latest.close,
          priceChange: change,
          priceChangePct: changePct,
          sessionHigh: latest.high,
          sessionLow: latest.low,
          sessionVolume: latest.volume,
        });

        // Auto-run backtest on fresh candles
        get().runStrategyBacktest();
      }

      get().fetchLogs();
    } catch (err: any) {
      set({ candleError: err?.message || 'Network error fetching candles', isLoadingCandles: false });
      get().fetchLogs();
    }
  },

  isWatchlistOpen: true,
  toggleWatchlist: () => set((s) => ({ isWatchlistOpen: !s.isWatchlistOpen })),
  watchlist: DEFAULT_WATCHLIST,
  addToWatchlist: (item) => {
    set((s) => {
      if (s.watchlist.some((w) => w.key === item.key)) return s;
      return { watchlist: [...s.watchlist, item] };
    });
  },
  removeFromWatchlist: (key) => {
    set((s) => ({ watchlist: s.watchlist.filter((w) => w.key !== key) }));
  },

  bottomPanelTab: 'strategy_tester',
  setBottomPanelTab: (bottomPanelTab) => set({ bottomPanelTab, isBottomPanelCollapsed: false }),
  isBottomPanelCollapsed: false,
  toggleBottomPanel: () => set((s) => ({ isBottomPanelCollapsed: !s.isBottomPanelCollapsed })),
  bottomPanelHeight: 280,
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: Math.max(140, Math.min(500, height)) }),

  logs: [],
  fetchLogs: async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.logs)) {
          set({ logs: data.logs });
        }
      }
    } catch {
      // ignore
    }
  },
}));
