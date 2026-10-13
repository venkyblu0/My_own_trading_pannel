import { create } from 'zustand';
import { Instrument, Timeframe, ChartType, BottomPanelTab, Candle, WatchlistItem, CandleLogEntry } from '../types/index.ts';

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

  // Candles Data
  candles: Candle[];
  isLoadingCandles: boolean;
  candleError: string | null;
  fetchCandles: (instrumentKey?: string, tf?: Timeframe) => Promise<void>;

  // Metrics for Top Bar
  lastClose: number | null;
  priceChange: number | null;
  priceChangePct: number | null;
  sessionHigh: number | null;
  sessionLow: number | null;
  sessionVolume: number | null;

  // Server & Upstox status
  isTokenSet: boolean;
  checkServerHealth: () => Promise<void>;

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

  candles: [],
  isLoadingCandles: false,
  candleError: null,

  lastClose: 2980.25,
  priceChange: 32.10,
  priceChangePct: 1.09,
  sessionHigh: 3010.00,
  sessionLow: 2945.50,
  sessionVolume: 8524000,

  isTokenSet: false,
  checkServerHealth: async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        set({ isTokenSet: Boolean(data.tokenSet) });
      }
    } catch (e) {
      console.warn('Health check failed:', e);
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

      const candles: Candle[] = data.candles || [];
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

  bottomPanelTab: 'logs',
  setBottomPanelTab: (bottomPanelTab) => set({ bottomPanelTab, isBottomPanelCollapsed: false }),
  isBottomPanelCollapsed: false,
  toggleBottomPanel: () => set((s) => ({ isBottomPanelCollapsed: !s.isBottomPanelCollapsed })),
  bottomPanelHeight: 260,
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: Math.max(120, Math.min(500, height)) }),

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
