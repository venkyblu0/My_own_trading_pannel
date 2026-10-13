export interface Candle {
  time: number; // Unix timestamp in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Exchange = 'NSE' | 'BSE' | 'MCX';

export interface Instrument {
  key: string; // e.g. "NSE_EQ|INE002A01018"
  symbol: string; // e.g. "RELIANCE"
  name: string; // e.g. "RELIANCE INDUSTRIES LTD"
  exchange: Exchange;
  segment: string; // e.g. "NSE_EQ"
  type: string; // e.g. "EQUITY", "INDEX", "FUTSTK"
  tickSize: number;
  lotSize: number;
}

export interface TimeframeConfig {
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  interval: number;
  label: string;
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
