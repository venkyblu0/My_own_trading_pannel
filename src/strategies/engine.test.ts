import { describe, it, expect } from 'vitest';
import { calculateSMA, calculateEMA, calculateRSI, calculateATR, calculateBollingerBands, calculateSupertrend } from './indicators.ts';
import { runBacktest, generateSignals } from './engine.ts';
import { analyzeSymbolForSetups } from './scanner.ts';
import { Candle, WatchlistItem } from '../types/index.ts';

describe('Strategy Indicators Mathematical Calculations', () => {
  it('calculates SMA correctly with period 3', () => {
    const closes = [10, 20, 30, 40, 50];
    const sma = calculateSMA(closes, 3);
    expect(sma[0]).toBeNull();
    expect(sma[1]).toBeNull();
    expect(sma[2]).toBe(20); // (10+20+30)/3
    expect(sma[3]).toBe(30); // (20+30+40)/3
    expect(sma[4]).toBe(40); // (30+40+50)/3
  });

  it('calculates EMA properly without NaN', () => {
    const closes = [10, 20, 30, 40, 50, 60, 70];
    const ema = calculateEMA(closes, 3);
    expect(ema[0]).toBeNull();
    expect(ema[1]).toBeNull();
    expect(ema[2]).toBe(20);
    expect(typeof ema[3]).toBe('number');
    expect(isNaN(ema[3]!)).toBe(false);
  });

  it('calculates RSI values strictly between 0 and 100', () => {
    const closes = [
      100, 102, 101, 104, 106, 105, 107, 109, 108, 110,
      112, 111, 115, 118, 117, 119, 122, 120, 125, 128
    ];
    const rsi = calculateRSI(closes, 14);
    for (const val of rsi) {
      if (val !== null) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    }
  });

  it('calculates ATR correctly on candle high-low-close', () => {
    const candles: Candle[] = [
      { time: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { time: 2000, open: 102, high: 108, low: 101, close: 107, volume: 1200 },
      { time: 3000, open: 107, high: 110, low: 104, close: 105, volume: 800 },
      { time: 4000, open: 105, high: 112, low: 103, close: 110, volume: 1500 },
      { time: 5000, open: 110, high: 115, low: 108, close: 114, volume: 2000 },
    ];
    const atrs = calculateATR(candles, 3);
    expect(atrs[0]).toBeNull();
    expect(atrs[1]).toBeNull();
    expect(typeof atrs[2]).toBe('number');
    expect(atrs[2]!).toBeGreaterThan(0);
  });

  it('calculates Bollinger Bands upper, lower, and bandwidth', () => {
    const closes = [20, 22, 21, 24, 25, 23, 26, 28, 27, 29, 30, 31, 30, 32, 33, 35, 34, 36, 37, 38, 40];
    const bbs = calculateBollingerBands(closes, 10, 2);
    const latest = bbs[bbs.length - 1];
    expect(latest).toBeDefined();
    expect(latest!.upper).toBeGreaterThan(latest!.middle);
    expect(latest!.lower).toBeLessThan(latest!.middle);
    expect(latest!.bandwidth).toBeGreaterThan(0);
  });
});

describe('Backtest Simulation Engine', () => {
  // Helper to generate realistic candles
  const generateTestCandles = (count: number = 100): Candle[] => {
    const candles: Candle[] = [];
    let price = 1000;
    const baseTime = 1700000000000;
    const dayMs = 86400000;

    for (let i = 0; i < count; i++) {
      const isDip = i % 8 === 0 && i > 25;
      const change = isDip ? -18 : (i % 2 === 0 ? 10 : -4);
      price += change;
      candles.push({
        time: baseTime + i * dayMs,
        open: price - 3,
        high: price + 6,
        low: price - 5,
        close: price,
        volume: 500000 + (i * 2000),
      });
    }
    return candles;
  };

  it('runs backtest for EMA crossover and returns quantitative risk metrics', () => {
    const candles = generateTestCandles(120);
    const result = runBacktest(candles, 'ema_crossover', { fastPeriod: 5, slowPeriod: 15 });
    expect(result.strategyId).toBe('ema_crossover');
    expect(result.initialCapital).toBe(100000);
    expect(typeof result.finalCapital).toBe('number');
    expect(typeof result.winRatePct).toBe('number');
    expect(result.winRatePct).toBeGreaterThanOrEqual(0);
    expect(result.winRatePct).toBeLessThanOrEqual(100);
    expect(typeof result.profitFactor).toBe('number');
    expect(typeof result.sharpeRatio).toBe('number');
    expect(typeof result.expectancy).toBe('number');
    expect(typeof result.winLossRatio).toBe('number');
    expect(typeof result.recoveryFactor).toBe('number');
    expect(Array.isArray(result.trades)).toBe(true);
    expect(Array.isArray(result.equityCurve)).toBe(true);
    expect(Array.isArray(result.signals)).toBe(true);
  });

  it('runs backtest for 44 SMA Pullback strategy correctly', () => {
    const candles = generateTestCandles(150);
    const result = runBacktest(candles, 'sma44_pullback', { smaPeriod: 20, trendFilterSma: 0 });
    expect(result.strategyId).toBe('sma44_pullback');
    expect(result.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.equityCurve[0].equity).toBe(100000);
  });

  it('runs backtest for Supertrend strategy correctly', () => {
    const candles = generateTestCandles(100);
    const result = runBacktest(candles, 'supertrend', { period: 7, multiplier: 2.5 });
    expect(result.strategyId).toBe('supertrend');
    expect(typeof result.maxDrawdownPct).toBe('number');
    expect(result.maxDrawdownPct).toBeGreaterThanOrEqual(0);
  });

  it('runs backtest for RSI Reversal and Bollinger Breakout strategies without error', () => {
    const candles = generateTestCandles(100);
    const rsiResult = runBacktest(candles, 'rsi_reversal', { rsiPeriod: 10, oversoldLevel: 35 });
    expect(rsiResult.strategyId).toBe('rsi_reversal');

    const bbResult = runBacktest(candles, 'bollinger_breakout', { period: 15, stdDev: 1.8 });
    expect(bbResult.strategyId).toBe('bollinger_breakout');
  });

  it('scans candles and classifies setups using analyzeSymbolForSetups', () => {
    const candles = generateTestCandles(60);
    const item: WatchlistItem = {
      key: 'NSE_EQ|INE002A01018',
      symbol: 'RELIANCE',
      name: 'RELIANCE INDUSTRIES LTD',
      exchange: 'NSE',
      lastPrice: 2980.25,
      change: 32.10,
      changePct: 1.09,
    };
    const scan = analyzeSymbolForSetups(item, candles);
    expect(scan).not.toBeNull();
    expect(scan?.symbol).toBe('RELIANCE');
    expect(typeof scan?.setupScore).toBe('number');
    expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(scan?.signal);
  });
});
