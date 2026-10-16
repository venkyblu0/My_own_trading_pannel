export interface Candle {
  time: number; // Unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LiveQuote {
  key: string;
  symbol: string;
  lastPrice: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePct: number;
  timestamp: number;
}

export type Exchange = 'NSE' | 'BSE' | 'NSE INDICES' | 'MCX';

export interface Instrument {
  key: string;
  symbol: string;
  name: string;
  exchange: string;
  segment: string;
  type: string;
  tickSize: number;
  lotSize: number;
}

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1D' | '1W' | '1M';

export type ChartType = 'candles' | 'hollow' | 'heikinAshi' | 'bars' | 'line' | 'area';

export interface WatchlistItem {
  key: string;
  symbol: string;
  name: string;
  exchange: string;
  lastPrice: number | null; // null until real market data arrives
  change: number | null;
  changePct: number | null;
}

export interface CandleLogEntry {
  id: string;
  timestamp: number;
  symbol: string;
  timeframe: string;
  from: string;
  to: string;
  durationMs: number;
  candleCount: number;
  cached: boolean;
  status: 'ok' | 'error';
  errorMessage?: string;
}

export type BottomPanelTab = 'strategy_tester' | 'signals' | 'trades' | 'scanner' | 'logs';
