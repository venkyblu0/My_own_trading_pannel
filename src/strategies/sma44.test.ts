import { describe, it, expect } from 'vitest';
import { generateSignals, runBacktest, numParam } from './engine.ts';
import { calculateSMA } from './indicators.ts';
import { analyzeSymbolForSetups } from './scanner.ts';
import { BUILT_IN_STRATEGIES } from './definitions.ts';
import { Candle } from '../types/index.ts';

/** Hand-built price paths where the correct SMA44 outcome is known in advance. */

type Bar = [open: number, high: number, low: number, close: number];

interface Levels {
  sma: number;
  trigger: number;
  stop: number;
  risk: number;
}

const DAY_MS = 86_400_000;
const T0 = Date.UTC(2024, 0, 1, 3, 45); // 09:15 IST

const toCandles = (bars: Bar[]): Candle[] =>
  bars.map(([open, high, low, close], i) => ({ time: T0 + i * DAY_MS, open, high, low, close, volume: 100_000 }));

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// Steady uptrend 100 -> 159 (SMA44 rising). Opens equal closes, so none of these bars is green.
const uptrend = (): Bar[] =>
  Array.from({ length: 60 }, (_, i): Bar => {
    const c = 100 + i;
    return [c, c + 0.5, c - 0.5, c];
  });

const SETUP_INDEX = 61;
const PULLBACK: Bar = [158, 158.5, 140.5, 141]; // red bar pulling back towards the SMA

/**
 * Uptrend, a red bar pulling back towards the 44 SMA, then a green setup candle whose low tags
 * the SMA and closes above it. `after` builds the bars that follow from the setup's levels.
 */
function sma44Case(after: (lv: Levels) => Bar[] = () => []) {
  const bars = uptrend();
  bars.push(PULLBACK);
  const close = 142;
  const sma = mean([...bars.map((b) => b[3]), close].slice(-44)); // SMA44 on the setup candle, ~138.64
  const setup: Bar = [139.5, 143, sma - 0.2, close];
  bars.push(setup);
  const trigger = setup[1] + 0.05;
  const stop = Math.min(setup[2], bars[SETUP_INDEX - 1][2]);
  const lv: Levels = { sma, trigger, stop, risk: trigger - stop };
  return { candles: toCandles([...bars, ...after(lv)]), ...lv };
}

/**
 * The sma44Case uptrend with a custom pullback bar and setup candle. `shape` receives the SMA44
 * on the setup candle (which depends on its close) and returns the setup's [open, high, low].
 */
function setupVariant(close: number, shape: (sma: number) => [number, number, number], pullback: Bar = PULLBACK) {
  const bars = [...uptrend(), pullback];
  const sma = mean([...bars.map((b) => b[3]), close].slice(-44));
  return toCandles([...bars, [...shape(sma), close]]);
}

/**
 * Gentle decline 120 -> 118.23 (SMA44 falls ~0.03 a bar), then a green candle that tags the SMA
 * and closes above it and above the previous close. Only the trend condition can reject it.
 */
function fallingSmaCase(close: number) {
  const bars: Bar[] = Array.from({ length: 60 }, (_, i): Bar => {
    const c = 120 - 0.03 * i;
    return [c, c + 0.5, c - 0.5, c];
  });
  const sma = mean([...bars.map((b) => b[3]), close].slice(-44));
  bars.push([close - 0.3, close + 0.3, sma - 0.2, close]);
  const candles = toCandles(bars);
  return { candles, smas: calculateSMA(candles.map((c) => c.close), 44) };
}

// A bar that fills the buy-stop at the trigger and closes without touching stop or target.
const fillBar = (lv: Levels): Bar => [lv.trigger - 0.5, lv.trigger + 0.5, lv.trigger - 1, lv.trigger + 0.3];
// A flat bar that stays below the trigger.
const belowTrigger = (lv: Levels): Bar => [lv.trigger - 2, lv.trigger - 1, lv.trigger - 3, lv.trigger - 2];

const P = { trendFilterSma: 0 };

describe('SMA44 entry: buy-stop above the setup high', () => {
  it('places a buy-stop one tick above the setup high instead of buying the close', () => {
    const { candles, trigger } = sma44Case();
    const signals = generateSignals(candles, 'sma44_pullback', P);
    expect(signals).toHaveLength(1);
    expect(signals[0].candleIndex).toBe(SETUP_INDEX);
    expect(signals[0].price).toBeCloseTo(trigger, 6);
    expect(signals[0].buyStop).toMatchObject({ trigger, validBars: 2 });
  });

  it('fills at the trigger on the next bar that trades through it', () => {
    const { candles, trigger } = sma44Case((lv) => [fillBar(lv)]);
    const r = runBacktest(candles, 'sma44_pullback', P);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].entryPrice).toBeCloseTo(trigger, 6);
    expect(r.trades[0].entryTime).toBe(candles[SETUP_INDEX + 1].time);
  });

  it('fills a gap-up entry at the open, not the trigger', () => {
    const { candles, trigger } = sma44Case((lv) => [[lv.trigger + 3, lv.trigger + 4, lv.trigger + 2.5, lv.trigger + 3.5]]);
    const r = runBacktest(candles, 'sma44_pullback', P);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].entryPrice).toBeCloseTo(trigger + 3, 6);
  });

  it('expires the order if it does not fill within 2 bars', () => {
    const late = sma44Case((lv) => [belowTrigger(lv), belowTrigger(lv), [lv.trigger + 1, lv.trigger + 2, lv.trigger + 0.5, lv.trigger + 1]]);
    const lateResult = runBacktest(late.candles, 'sma44_pullback', P);
    expect(lateResult.trades).toHaveLength(0);
    expect(lateResult.signals[0].status).toBe('EXPIRED');

    const inTime = sma44Case((lv) => [belowTrigger(lv), [lv.trigger + 1, lv.trigger + 2, lv.trigger + 0.5, lv.trigger + 1]]);
    expect(runBacktest(inTime.candles, 'sma44_pullback', P).trades).toHaveLength(1);
  });

  it('counts a candle that hits both stop and target as a stop', () => {
    const { candles } = sma44Case((lv) => [
      fillBar(lv),
      [lv.trigger, lv.trigger + 4 * lv.risk, lv.stop - 1, lv.trigger], // touches target and stop
    ]);
    const r = runBacktest(candles, 'sma44_pullback', P);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].exitReason).toBe('STOP_LOSS');
    expect(r.trades[0].exitPrice).toBeCloseTo(r.signals[0].stopLoss, 6);
  });

  it('stops out on the entry candle when it fills and then breaks the stop', () => {
    const { candles } = sma44Case((lv) => [[lv.trigger - 0.5, lv.trigger + 0.5, lv.stop - 1, lv.trigger - 1.5]]);
    const r = runBacktest(candles, 'sma44_pullback', P);
    expect(r.trades).toHaveLength(1);
    const t = r.trades[0];
    expect(t.exitTime).toBe(t.entryTime);
    expect(t.exitReason).toBe('STOP_LOSS');
    expect(t.exitPrice).toBeCloseTo(r.signals[0].stopLoss, 6);
  });
});

describe('SMA44 trend: SMA today above the SMA 5 bars ago', () => {
  it('does not fire when the SMA is slightly falling', () => {
    const { candles, smas } = fallingSmaCase(119.2);
    // The setup bar's SMA dips by less than the old 0.05% tolerance
    expect(smas[60]!).toBeLessThan(smas[59]!);
    expect(smas[60]!).toBeGreaterThanOrEqual(smas[59]! * 0.9995);
    expect(generateSignals(candles, 'sma44_pullback', P)).toHaveLength(0);
  });

  it('compares with the SMA 5 bars ago, not 1 bar ago', () => {
    const { candles, smas } = fallingSmaCase(119.9);
    // SMA ticks up on the setup bar but is still below where it was 5 bars ago
    expect(smas[60]!).toBeGreaterThan(smas[59]!);
    expect(smas[60]!).toBeLessThan(smas[55]!);
    expect(generateSignals(candles, 'sma44_pullback', P)).toHaveLength(0);
  });
});

describe('Strategy params: 0 is a real value, not "use the default"', () => {
  it('trendFilterSma 0 switches the trend filter off', () => {
    // 200 bars at 300 first, so the setup candle closes far below its 200 SMA
    const flat = Array.from({ length: 200 }, (): Bar => [300, 300.5, 299.5, 300]);
    const setupBars = sma44Case().candles.map((c): Bar => [c.open, c.high, c.low, c.close]);
    const candles = toCandles([...flat, ...setupBars]);

    expect(generateSignals(candles, 'sma44_pullback', { trendFilterSma: 200 })).toHaveLength(0);
    const filterOff = generateSignals(candles, 'sma44_pullback', { trendFilterSma: 0 });
    expect(filterOff).toHaveLength(1);
    expect(filterOff[0].candleIndex).toBe(200 + SETUP_INDEX);
  });

  it('riskPerTradePct 0 risks nothing, so no trade is taken', () => {
    const { candles } = sma44Case((lv) => [fillBar(lv)]);
    expect(runBacktest(candles, 'sma44_pullback', { ...P, riskPerTradePct: 1 }).trades).toHaveLength(1);
    expect(runBacktest(candles, 'sma44_pullback', { ...P, riskPerTradePct: 0 }).trades).toHaveLength(0);
  });

  it('numParam keeps 0 and falls back only for missing or non-numeric values', () => {
    expect(numParam(0, 200)).toBe(0);
    expect(numParam('0', 200)).toBe(0);
    expect(numParam(undefined, 200)).toBe(200);
    expect(numParam(null, 200)).toBe(200);
    expect(numParam('', 200)).toBe(200);
    expect(numParam('abc', 200)).toBe(200);
    expect(numParam(44, 200)).toBe(44);
  });
});

describe('SMA44 setup candle matches the spec exactly', () => {
  const fires = (candles: Candle[]) => generateSignals(candles, 'sma44_pullback', {}).length > 0;
  const setupShape = (sma: number): [number, number, number] => [139.5, 143, sma - 0.2];

  it('fires on the reference setup with default params (trend filter is off by default)', () => {
    expect(BUILT_IN_STRATEGIES.sma44_pullback.params.trendFilterSma).toBe(0);
    expect(fires(sma44Case().candles)).toBe(true);
  });

  it('does not fire on a red candle', () => {
    expect(fires(setupVariant(142, (sma) => [143, 143.5, sma - 0.2]))).toBe(false);
  });

  it('does not fire when the close is below the SMA', () => {
    // 138 is below the SMA (~138.55) but inside the old 1.5% allowance
    expect(fires(setupVariant(138, (sma) => [137.5, 139, sma - 0.5]))).toBe(false);
  });

  it('does not fire when the low is more than 1% above the SMA', () => {
    expect(fires(setupVariant(142, (sma) => [141, 143, sma * 1.011]))).toBe(false);
    expect(fires(setupVariant(142, (sma) => [141, 143, sma * 1.009]))).toBe(true);
  });

  it('does not fire when the setup closes below ₹20', () => {
    const scaled = (k: number) => toCandles(sma44Case().candles.map((c): Bar => [c.open * k, c.high * k, c.low * k, c.close * k]));
    expect(fires(scaled(0.1))).toBe(false); // setup closes at ₹14.20
    expect(fires(scaled(0.5))).toBe(true); // same shape at ₹71
  });

  it('fires even when the setup closes below the previous close', () => {
    const higherPullback: Bar = [158, 158.5, 143.5, 144]; // closes above the setup's 142
    expect(fires(setupVariant(142, setupShape, higherPullback))).toBe(true);
  });

  it('puts the stop at min(setup low, previous low) with no buffer', () => {
    const { candles, stop } = sma44Case(); // the setup low is the lower one here
    expect(generateSignals(candles, 'sma44_pullback', {})[0].stopLoss).toBe(stop);

    const deeperPullback: Bar = [158, 158.5, 137, 141]; // previous low below the setup low
    const [sig] = generateSignals(setupVariant(142, setupShape, deeperPullback), 'sma44_pullback', {});
    expect(sig.stopLoss).toBe(137);
  });
});

describe('Backtest costs and sizing', () => {
  // Fill at the trigger, then a bar that reaches the 2R target
  const targetCase = () =>
    sma44Case((lv) => [fillBar(lv), [lv.trigger + 0.3, lv.trigger + 2 * lv.risk + 1, lv.trigger - 0.5, lv.trigger + 2 * lv.risk]]);

  it('charges 0.15% of traded value per side by default and deducts it from P&L', () => {
    const { candles } = targetCase();
    const free = runBacktest(candles, 'sma44_pullback', { ...P, costPerSidePct: 0 }).trades[0];
    const result = runBacktest(candles, 'sma44_pullback', P);
    const costed = result.trades[0];

    expect(costed.shares).toBe(free.shares);
    const expectedCosts = costed.shares * (costed.entryPrice + costed.exitPrice) * 0.0015;
    expect(costed.costs).toBeCloseTo(expectedCosts, 6);
    expect(costed.pnl).toBeCloseTo(free.pnl - expectedCosts, 6);
    expect(costed.pnl).toBeLessThan(free.pnl);
    expect(result.totalCosts).toBeCloseTo(expectedCosts, 6);
    expect(result.finalCapital).toBeCloseTo(100000 + costed.pnl, 6);
  });

  it('sizes the position to risk 1% of equity by default', () => {
    const { candles, risk } = targetCase();
    const t = runBacktest(candles, 'sma44_pullback', P).trades[0];
    expect(t.shares).toBe(Math.floor(1000 / risk)); // 1% of ₹1,00,000
  });

  it('caps the position at the max allocation', () => {
    const { candles, trigger } = targetCase();
    const t = runBacktest(candles, 'sma44_pullback', { ...P, maxAllocationPct: 10 }).trades[0];
    expect(t.shares).toBe(Math.floor(10000 / trigger)); // 10% of ₹1,00,000 at the fill price
  });
});

describe('Mark-to-market equity, drawdown and Sharpe', () => {
  // Fill at the trigger, sag to just above the stop with the trade still open, then hit the 2R target
  const dipCase = () =>
    sma44Case((lv) => [
      fillBar(lv),
      [lv.trigger - 1, lv.trigger - 0.5, lv.stop + 0.2, lv.stop + 0.5],
      [lv.stop + 0.5, lv.trigger + 2 * lv.risk + 1, lv.stop + 0.4, lv.trigger + 2 * lv.risk],
    ]);
  const ZERO_COST = { ...P, costPerSidePct: 0 };

  it('records equity at every bar, including the open position', () => {
    const { candles, trigger, stop } = dipCase();
    const r = runBacktest(candles, 'sma44_pullback', ZERO_COST);
    const { shares } = r.trades[0];
    expect(r.equityCurve).toHaveLength(candles.length);
    expect(r.equityCurve[SETUP_INDEX + 2].equity).toBeCloseTo(100000 + shares * (stop + 0.5 - trigger), 6);
  });

  it('measures drawdown on mark-to-market equity, not only on closed trades', () => {
    const { candles, risk } = dipCase();
    const r = runBacktest(candles, 'sma44_pullback', ZERO_COST);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].pnl).toBeGreaterThan(0); // the only closed trade is a winner...
    const { shares } = r.trades[0];
    const peak = 100000 + shares * 0.3; // the fill bar closes 0.3 above the entry
    const drop = shares * (risk - 0.2); // ...but the open trade sagged to 0.5 above the stop
    expect(r.maxDrawdownINR).toBeCloseTo(drop, 6);
    expect(r.maxDrawdownPct).toBeCloseTo((drop / peak) * 100, 6);
  });

  it('computes Sharpe as mean / std of daily returns x sqrt(252)', () => {
    const { candles } = dipCase();
    const r = runBacktest(candles, 'sma44_pullback', ZERO_COST);
    const eq = r.equityCurve.map((p) => p.equity);
    const rets = eq.slice(1).map((e, k) => e / eq[k] - 1);
    const m = mean(rets);
    const sd = Math.sqrt(rets.reduce((a, x) => a + (x - m) ** 2, 0) / (rets.length - 1));
    expect(r.sharpeRatio).toBe(Number(((m / sd) * Math.sqrt(252)).toFixed(2)));
  });

  it('has no Sharpe ratio when equity never moves', () => {
    const r = runBacktest(sma44Case().candles, 'sma44_pullback', P); // the order never fills
    expect(r.trades).toHaveLength(0);
    expect(r.sharpeRatio).toBeUndefined();
  });
});

describe("Scanner uses the backtester's SMA44 rule", () => {
  const item = { key: 'NSE_EQ|TEST', symbol: 'TEST', name: 'TEST LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null };

  it('flags a 44 SMA setup exactly when generateSignals fires on the latest candle', () => {
    const { candles, trigger, stop } = sma44Case();
    expect(generateSignals(candles, 'sma44_pullback', {}).at(-1)?.candleIndex).toBe(candles.length - 1);

    const scan = analyzeSymbolForSetups(item, candles)!;
    expect(scan.setupName).toBe('44 SMA Pullback Bounce');
    expect(scan.signal).toBe('BULLISH');
    expect(scan.details).toContain(`Buy-stop ₹${trigger.toFixed(2)}`);
    expect(scan.details).toContain(`stop ₹${stop.toFixed(2)}`);
  });

  it('does not flag a setup the backtester would not trade (slightly falling SMA)', () => {
    // The old scanner rule (SMA >= 0.999 x yesterday's, low within 1.5%) accepted this candle
    const { candles } = fallingSmaCase(119.2);
    expect(generateSignals(candles, 'sma44_pullback', {})).toHaveLength(0);
    expect(analyzeSymbolForSetups(item, candles)!.setupName).not.toContain('44 SMA');
  });

  it('uses the SMA44 params it is given, e.g. a trend filter that blocks the setup', () => {
    const flat = Array.from({ length: 200 }, (): Bar => [300, 300.5, 299.5, 300]);
    const candles = toCandles([...flat, ...sma44Case().candles.map((c): Bar => [c.open, c.high, c.low, c.close])]);
    expect(analyzeSymbolForSetups(item, candles, { trendFilterSma: 0 })!.setupName).toBe('44 SMA Pullback Bounce');
    expect(analyzeSymbolForSetups(item, candles, { trendFilterSma: 200 })!.setupName).not.toContain('44 SMA');
  });
});

describe('runBacktest does not mutate signals', () => {
  // Frozen inputs: any write to them throws in strict-mode modules
  const frozenSignals = (candles: Candle[]) =>
    generateSignals(candles, 'sma44_pullback', P).map((s) => Object.freeze({ ...s }));

  it('returns new signal objects carrying the final status (stop hit)', () => {
    const { candles } = sma44Case((lv) => [fillBar(lv), [lv.trigger - 1, lv.trigger - 0.5, lv.stop - 1, lv.stop - 0.5]]);
    const signals = frozenSignals(candles);
    const r = runBacktest(candles, 'sma44_pullback', P, 'TEST', '1D', signals);
    expect(signals[0].status).toBe('ACTIVE');
    expect(r.signals[0].status).toBe('HIT_SL');
    expect(r.signals[0]).not.toBe(signals[0]);
  });

  it('returns new signal objects carrying the final status (order expired)', () => {
    const { candles } = sma44Case((lv) => [belowTrigger(lv), belowTrigger(lv), belowTrigger(lv)]);
    const signals = frozenSignals(candles);
    const r = runBacktest(candles, 'sma44_pullback', P, 'TEST', '1D', signals);
    expect(signals[0].status).toBe('ACTIVE');
    expect(r.signals[0].status).toBe('EXPIRED');
  });

  it('gives the same statuses when the same signals are backtested twice', () => {
    const { candles } = sma44Case((lv) => [fillBar(lv), [lv.trigger - 1, lv.trigger - 0.5, lv.stop - 1, lv.stop - 0.5]]);
    const signals = generateSignals(candles, 'sma44_pullback', P);
    const first = runBacktest(candles, 'sma44_pullback', P, 'TEST', '1D', signals);
    const second = runBacktest(candles, 'sma44_pullback', P, 'TEST', '1D', signals);
    expect(second.signals.map((s) => s.status)).toEqual(first.signals.map((s) => s.status));
    expect(signals.map((s) => s.status)).toEqual(['ACTIVE']);
  });
});

describe('Exit modes and R-multiples', () => {
  const ZERO_COST = { ...P, costPerSidePct: 0 };
  const target = (lv: Levels) => lv.trigger + 2 * lv.risk;
  // Reaches the 2R target and closes well above the SMA
  const targetBar = (lv: Levels): Bar => [lv.trigger + 0.3, target(lv) + 0.5, lv.trigger - 0.2, target(lv) - 0.5];

  it('books +2.00R when the 2R target is hit at zero cost (fixed mode, the default)', () => {
    const { candles, trigger } = sma44Case((lv) => [fillBar(lv), targetBar(lv)]);
    const r = runBacktest(candles, 'sma44_pullback', ZERO_COST);
    expect(r.exitMode).toBe('fixed');
    expect(r.trades).toHaveLength(1);
    const t = r.trades[0];
    expect(t.exitReason).toBe('TARGET');
    expect(t.entryPrice).toBeCloseTo(trigger, 6);
    expect(t.rMultiple).toBeCloseTo(2.0, 6);
    expect(r.avgR).toBeCloseTo(2.0, 6);
  });

  it('books -1.00R when the stop is hit at zero cost', () => {
    const { candles } = sma44Case((lv) => [fillBar(lv), [lv.trigger - 1, lv.trigger - 0.5, lv.stop - 2, lv.stop - 1]]);
    const r = runBacktest(candles, 'sma44_pullback', ZERO_COST);
    expect(r.trades[0].exitReason).toBe('STOP_LOSS');
    expect(r.trades[0].rMultiple).toBeCloseTo(-1.0, 6);
    expect(r.avgR).toBeCloseTo(-1.0, 6);
  });

  it('exits a gap below the stop at the open, for a loss bigger than 1R', () => {
    const { candles, stop } = sma44Case((lv) => [fillBar(lv), [lv.stop - 2, lv.stop - 1.5, lv.stop - 3, lv.stop - 2.5]]);
    const t = runBacktest(candles, 'sma44_pullback', ZERO_COST).trades[0];
    expect(t.exitReason).toBe('STOP_LOSS');
    expect(t.exitPrice).toBeCloseTo(stop - 2, 6);
    expect(t.rMultiple!).toBeLessThan(-1);
  });

  it('reports no average R when there are no trades', () => {
    expect(runBacktest(sma44Case().candles, 'sma44_pullback', P).avgR).toBeNull();
  });

  it('half mode: books half at 2R, moves the stop to breakeven, and the runner stops there', () => {
    const { candles, trigger, risk } = sma44Case((lv) => [
      fillBar(lv),
      targetBar(lv),
      [lv.trigger + 1, lv.trigger + 1.5, lv.trigger - 1, lv.trigger - 0.5], // falls back through the entry
    ]);
    const r = runBacktest(candles, 'sma44_pullback', { ...ZERO_COST, exitMode: 'half' });
    expect(r.exitMode).toBe('half');
    expect(r.trades).toHaveLength(1);
    const t = r.trades[0];
    const half = Math.floor(t.shares / 2);
    expect(t.partialExit?.shares).toBe(half);
    expect(t.partialExit?.price).toBeCloseTo(trigger + 2 * risk, 6);
    expect(t.exitReason).toBe('BREAKEVEN');
    expect(t.exitPrice).toBeCloseTo(trigger, 6);
    // Half the position made 2R, the runner made 0R
    expect(t.rMultiple).toBeCloseTo((2 * half) / t.shares, 6);
  });

  it('trail mode: ignores the 2R target and exits at the next open after a close below the SMA', () => {
    const { candles, stop } = sma44Case((lv) => [
      fillBar(lv),
      [lv.trigger + 0.3, target(lv) + 5, lv.trigger, target(lv) + 4], // runs well past 2R
      [148, 148.5, lv.stop + 0.5, lv.stop + 0.6], // closes below the SMA but above the stop
      [140, 141, 139.5, 140.5], // exit at this open
    ]);
    const dropIndex = SETUP_INDEX + 3;
    const smas = calculateSMA(candles.map((c) => c.close), 44);
    expect(candles[dropIndex].close).toBeLessThan(smas[dropIndex]!);
    expect(candles[dropIndex].low).toBeGreaterThan(stop);

    const trail = runBacktest(candles, 'sma44_pullback', { ...ZERO_COST, exitMode: 'trail' }).trades[0];
    expect(trail.exitReason).toBe('EXIT_SIGNAL');
    expect(trail.exitTime).toBe(candles[dropIndex + 1].time);
    expect(trail.exitPrice).toBe(140);

    const fixed = runBacktest(candles, 'sma44_pullback', ZERO_COST).trades[0];
    expect(fixed.exitReason).toBe('TARGET');
    expect(fixed.exitTime).toBe(candles[SETUP_INDEX + 2].time);
  });

  it('keeps the other strategies on their fixed target and stop', () => {
    const { candles } = sma44Case();
    expect(runBacktest(candles, 'ema_crossover', { exitMode: 'trail' }).exitMode).toBe('fixed');
  });
});
