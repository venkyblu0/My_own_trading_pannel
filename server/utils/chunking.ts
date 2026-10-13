import { Candle, TimeframeConfig } from '../types.js';

export const TIMEFRAME_MAP: Record<string, TimeframeConfig> = {
  '1m': { unit: 'minutes', interval: 1, label: '1m' },
  '3m': { unit: 'minutes', interval: 3, label: '3m' },
  '5m': { unit: 'minutes', interval: 5, label: '5m' },
  '15m': { unit: 'minutes', interval: 15, label: '15m' },
  '30m': { unit: 'minutes', interval: 30, label: '30m' },
  '1h': { unit: 'hours', interval: 1, label: '1h' },
  '2h': { unit: 'hours', interval: 2, label: '2h' },
  '4h': { unit: 'hours', interval: 4, label: '4h' },
  '1D': { unit: 'days', interval: 1, label: '1D' },
  '1W': { unit: 'weeks', interval: 1, label: '1W' },
  '1M': { unit: 'months', interval: 1, label: '1M' },
};

export function getTimeframeConfig(tf: string): TimeframeConfig {
  const config = TIMEFRAME_MAP[tf];
  if (!config) {
    throw new Error(`Unsupported timeframe: ${tf}. Valid values are: ${Object.keys(TIMEFRAME_MAP).join(', ')}`);
  }
  return config;
}

/**
 * Returns the maximum chunk span in milliseconds according to Upstox API limits.
 * - 1m - 15m: 1 month (approx 30 days)
 * - >15m and hours: 1 quarter (approx 90 days)
 * - 1D: 10 years (approx 3650 days)
 * - 1W, 1M: 10 years
 */
export function getMaxChunkSpanMs(config: TimeframeConfig): number {
  const DAY_MS = 24 * 60 * 60 * 1000;
  if (config.unit === 'minutes' && config.interval <= 15) {
    return 30 * DAY_MS; // 1 month
  }
  if (config.unit === 'minutes' || config.unit === 'hours') {
    return 90 * DAY_MS; // 1 quarter
  }
  return 3650 * DAY_MS; // 10 years
}

export interface DateChunk {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

function formatDate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Splits a [fromDateStr, toDateStr] date range into valid Upstox API chunks.
 * In Upstox, historical queries take to_date and from_date.
 * The returned chunks are chronological (from oldest to newest).
 */
export function splitDateRange(config: TimeframeConfig, fromDateStr: string, toDateStr: string): DateChunk[] {
  const startMs = new Date(fromDateStr + 'T00:00:00Z').getTime();
  const endMs = new Date(toDateStr + 'T23:59:59Z').getTime();

  if (isNaN(startMs) || isNaN(endMs) || startMs > endMs) {
    throw new Error(`Invalid date range: ${fromDateStr} to ${toDateStr}`);
  }

  const maxSpanMs = getMaxChunkSpanMs(config);
  const chunks: DateChunk[] = [];
  let currentStart = startMs;

  while (currentStart < endMs) {
    const currentEnd = Math.min(currentStart + maxSpanMs - 1, endMs);
    chunks.push({
      from: formatDate(new Date(currentStart)),
      to: formatDate(new Date(currentEnd)),
    });
    // Next chunk starts the day after
    currentStart = currentEnd + 1;
  }

  return chunks;
}

/**
 * Merges raw candle rows from Upstox, deduplicates by time, and sorts ascending.
 * Raw format from Upstox API: [timestamp_iso, open, high, low, close, volume, oi] (newest first).
 */
export function mergeAndSortCandles(rawCandlesArrays: Array<Array<[string, number, number, number, number, number, number?]>>): Candle[] {
  const candleMap = new Map<number, Candle>();

  for (const rawList of rawCandlesArrays) {
    if (!Array.isArray(rawList)) continue;
    for (const row of rawList) {
      if (!row || row.length < 6) continue;
      const [isoTime, open, high, low, close, volume] = row;
      const timeMs = new Date(isoTime).getTime();
      if (isNaN(timeMs)) continue;

      candleMap.set(timeMs, {
        time: timeMs,
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume),
      });
    }
  }

  return Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
}
