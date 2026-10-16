import { Candle } from '../types/index.ts';

/**
 * Computes Heikin Ashi candles from standard OHLC candles.
 * Formula:
 * haClose = (open + high + low + close) / 4
 * haOpen[0] = (open[0] + close[0]) / 2
 * haOpen[i] = (haOpen[i-1] + haClose[i-1]) / 2
 * haHigh = max(high, haOpen, haClose)
 * haLow = min(low, haOpen, haClose)
 */
export function computeHeikinAshi(candles: Candle[]): Candle[] {
  if (!candles || candles.length === 0) return [];

  const result: Candle[] = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0
      ? (c.open + c.close) / 2
      : (result[i - 1].open + result[i - 1].close) / 2;

    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);

    result.push({
      time: c.time,
      open: Number(haOpen.toFixed(4)),
      high: Number(haHigh.toFixed(4)),
      low: Number(haLow.toFixed(4)),
      close: Number(haClose.toFixed(4)),
      volume: c.volume,
    });
  }

  return result;
}
