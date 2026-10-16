import { Candle } from '../types/index.ts';

/**
 * Technical indicators computed on raw historical Candle series
 */

export function calculateSMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;

  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= period - 1) {
      result.push(sum / period);
      sum -= closes[i - (period - 1)];
    } else {
      result.push(null);
    }
  }

  return result;
}

export function calculateEMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prevEma: number | null = null;
  let sum = 0;

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sum += closes[i];
      result.push(null);
    } else if (i === period - 1) {
      sum += closes[i];
      prevEma = sum / period;
      result.push(prevEma);
    } else {
      prevEma = closes[i] * k + (prevEma as number) * (1 - k);
      result.push(prevEma);
    }
  }

  return result;
}

export function calculateRSI(closes: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (closes.length < period + 1) {
    return closes.map(() => null);
  }

  let gains = 0;
  let losses = 0;

  result.push(null); // first item has no diff

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
    result.push(null);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const firstRSI = 100 - 100 / (1 + firstRS);
  result[period] = firstRSI;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }

  return result;
}

export function calculateATR(candles: Candle[], period: number = 14): (number | null)[] {
  const trs: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trs.push(candles[i].high - candles[i].low);
    } else {
      const hl = candles[i].high - candles[i].low;
      const hc = Math.abs(candles[i].high - candles[i - 1].close);
      const lc = Math.abs(candles[i].low - candles[i - 1].close);
      trs.push(Math.max(hl, hc, lc));
    }
  }

  const result: (number | null)[] = [];
  let trSum = 0;
  let prevAtr: number | null = null;

  for (let i = 0; i < trs.length; i++) {
    if (i < period - 1) {
      trSum += trs[i];
      result.push(null);
    } else if (i === period - 1) {
      trSum += trs[i];
      prevAtr = trSum / period;
      result.push(prevAtr);
    } else {
      prevAtr = ((prevAtr as number) * (period - 1) + trs[i]) / period;
      result.push(prevAtr);
    }
  }

  return result;
}

export interface SupertrendPoint {
  supertrend: number;
  direction: 1 | -1; // 1 = bullish (uptrend), -1 = bearish (downtrend)
}

export function calculateSupertrend(
  candles: Candle[],
  period: number = 10,
  multiplier: number = 3
): (SupertrendPoint | null)[] {
  const atrs = calculateATR(candles, period);
  const result: (SupertrendPoint | null)[] = [];

  let prevUpper = 0;
  let prevLower = 0;
  let prevTrend: 1 | -1 = 1;

  for (let i = 0; i < candles.length; i++) {
    const atr = atrs[i];
    if (atr === null) {
      result.push(null);
      continue;
    }

    const hl2 = (candles[i].high + candles[i].low) / 2;
    let basicUpper = hl2 + multiplier * atr;
    let basicLower = hl2 - multiplier * atr;

    if (i > 0 && atrs[i - 1] !== null) {
      const prevClose = candles[i - 1].close;
      basicUpper = basicUpper < prevUpper || prevClose > prevUpper ? basicUpper : prevUpper;
      basicLower = basicLower > prevLower || prevClose < prevLower ? basicLower : prevLower;
    }

    let trend: 1 | -1 = prevTrend;
    if (candles[i].close > prevUpper) {
      trend = 1;
    } else if (candles[i].close < prevLower) {
      trend = -1;
    }

    prevUpper = basicUpper;
    prevLower = basicLower;
    prevTrend = trend;

    result.push({
      supertrend: trend === 1 ? basicLower : basicUpper,
      direction: trend,
    });
  }

  return result;
}

export interface BollingerBandsPoint {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMult: number = 2
): (BollingerBandsPoint | null)[] {
  const smas = calculateSMA(closes, period);
  const result: (BollingerBandsPoint | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    const sma = smas[i];
    if (sma === null) {
      result.push(null);
      continue;
    }

    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(closes[j] - sma, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);
    const upper = sma + stdDevMult * stdDev;
    const lower = sma - stdDevMult * stdDev;
    const bandwidth = sma > 0 ? (upper - lower) / sma : 0;

    result.push({
      upper,
      middle: sma,
      lower,
      bandwidth,
    });
  }

  return result;
}
