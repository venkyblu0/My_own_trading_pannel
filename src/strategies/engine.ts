import { Candle } from '../types/index.ts';
import {
  StrategyId,
  StrategySignal,
  BacktestTrade,
  BacktestResult,
  EquityPoint,
  ExitMode,
} from './types.ts';
import { BUILT_IN_STRATEGIES } from './definitions.ts';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateATR,
  calculateSupertrend,
  calculateBollingerBands,
} from './indicators.ts';

// Agreed SMA44 spec constants
const SMA44_SLOPE_LOOKBACK = 5; // trend: SMA today > SMA 5 bars ago
const SMA44_TOUCH_PCT = 0.01; // setup low within 1% above the SMA (or below it)
const SMA44_MIN_PRICE = 20; // setup close must be at least ₹20
const SMA44_TICK = 0.05; // buy-stop sits one tick above the setup high
const SMA44_ENTRY_VALID_BARS = 2; // the order may fill on the 2 bars after the setup candle
const SMA44_MAX_RISK_PCT = 0.15; // skip fills whose risk exceeds 15% of the entry

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Brokerage + STT + exchange + stamp duty + GST + slippage, % of traded value per side (delivery)
const DEFAULT_COST_PER_SIDE_PCT = 0.15;

/**
 * Reads a numeric param. Falls back only when the value is missing or not a number,
 * so an explicit 0 (e.g. trendFilterSma = 0 to switch the filter off) is kept.
 */
export function numParam(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Generates raw signals for a specific strategy across a candlestick series.
 */
export function generateSignals(
  candles: Candle[],
  strategyId: StrategyId,
  params: Record<string, any>
): StrategySignal[] {
  if (!candles || candles.length < 20) return [];

  const signals: StrategySignal[] = [];
  const closes = candles.map((c) => c.close);
  const strategyDef = BUILT_IN_STRATEGIES[strategyId];
  const strategyName = strategyDef?.name || strategyId;

  switch (strategyId) {
    case 'sma44_pullback': {
      const smaPeriod = numParam(params.smaPeriod, 44);
      const rr = numParam(params.riskRewardRatio, 2.0);
      const trendPeriod = numParam(params.trendFilterSma, 0);

      const smas = calculateSMA(closes, smaPeriod);
      const trendSmas = trendPeriod > 0 ? calculateSMA(closes, trendPeriod) : null;

      for (let i = Math.max(smaPeriod, 10); i < candles.length; i++) {
        const c = candles[i];
        const prev = candles[i - 1];
        const sma = smas[i];
        const lookbackSma = smas[i - SMA44_SLOPE_LOOKBACK];

        if (sma === null || lookbackSma === null) continue;

        // Condition 1: 44 SMA is rising: above its value 5 bars ago
        const isSmaRising = sma > lookbackSma;

        // Condition 2: Optional trend filter (off when trendFilterSma = 0). When on, the
        // trend SMA must exist and the close must be above it.
        const trendSma = trendSmas ? trendSmas[i] : null;
        const passesTrendFilter = !trendSmas || (trendSma !== null && c.close > trendSma);

        // Condition 3: Low within 1% above the SMA (or below it) and close above the SMA
        const touchesSma = c.low <= sma * (1 + SMA44_TOUCH_PCT) && c.close > sma;

        // Condition 4: Green setup candle at a tradeable price
        const isGreenSetup = c.close > c.open && c.close >= SMA44_MIN_PRICE;

        if (isSmaRising && passesTrendFilter && touchesSma && isGreenSetup) {
          // Entry is a buy-stop above the setup high, not the setup close
          const trigger = c.high + SMA44_TICK;
          // Stop: the lower of the setup candle's low and the previous candle's low
          const stopLoss = Math.min(c.low, prev.low);
          const risk = trigger - stopLoss;
          if (risk > 0) {
            const target1 = trigger + risk * rr;
            const target2 = trigger + risk * (rr + 1);

            signals.push({
              id: `sig_sma44_${c.time}`,
              strategyId,
              strategyName,
              type: 'BUY',
              candleIndex: i,
              time: c.time,
              price: trigger,
              stopLoss,
              target1,
              target2,
              riskReward: `1:${rr.toFixed(1)}`,
              reason: `44 SMA Pullback. Low ₹${c.low.toFixed(2)} near rising SMA (₹${sma.toFixed(2)}). Buy-stop ₹${trigger.toFixed(2)} valid ${SMA44_ENTRY_VALID_BARS} bars.`,
              status: 'ACTIVE',
              buyStop: { trigger, validBars: SMA44_ENTRY_VALID_BARS, targetR: rr },
            });
          }
        }
      }
      break;
    }

    case 'ema_crossover': {
      const fastP = numParam(params.fastPeriod, 9);
      const slowP = numParam(params.slowPeriod, 21);
      const rr = numParam(params.riskRewardRatio, 2.0);

      const fastEmas = calculateEMA(closes, fastP);
      const slowEmas = calculateEMA(closes, slowP);

      for (let i = slowP + 1; i < candles.length; i++) {
        const fCurrent = fastEmas[i];
        const fPrev = fastEmas[i - 1];
        const sCurrent = slowEmas[i];
        const sPrev = slowEmas[i - 1];

        if (fCurrent === null || fPrev === null || sCurrent === null || sPrev === null) continue;

        // Golden Crossover: Fast crosses above Slow
        if (fPrev <= sPrev && fCurrent > sCurrent) {
          const c = candles[i];
          const entryPrice = c.close;
          const stopLoss = Math.min(c.low, candles[i - 1].low, sCurrent * 0.995);
          const risk = entryPrice - stopLoss;

          if (risk > 0) {
            signals.push({
              id: `sig_ema_${c.time}`,
              strategyId,
              strategyName,
              type: 'BUY',
              candleIndex: i,
              time: c.time,
              price: entryPrice,
              stopLoss,
              target1: entryPrice + risk * rr,
              target2: entryPrice + risk * (rr + 1),
              riskReward: `1:${rr.toFixed(1)}`,
              reason: `EMA ${fastP} crossed above EMA ${slowP} at ₹${entryPrice.toFixed(2)} indicating upward trend momentum.`,
              status: 'ACTIVE',
            });
          }
        }
      }
      break;
    }

    case 'supertrend': {
      const period = numParam(params.period, 10);
      const mult = numParam(params.multiplier, 3);
      const rr = numParam(params.riskRewardRatio, 2.5);

      const st = calculateSupertrend(candles, period, mult);

      for (let i = 1; i < candles.length; i++) {
        const curr = st[i];
        const prev = st[i - 1];
        if (!curr || !prev) continue;

        // Flip from bearish (-1) to bullish (1)
        if (prev.direction === -1 && curr.direction === 1) {
          const c = candles[i];
          const entryPrice = c.close;
          const stopLoss = curr.supertrend;
          const risk = entryPrice - stopLoss;

          if (risk > 0) {
            signals.push({
              id: `sig_st_${c.time}`,
              strategyId,
              strategyName,
              type: 'BUY',
              candleIndex: i,
              time: c.time,
              price: entryPrice,
              stopLoss,
              target1: entryPrice + risk * rr,
              target2: entryPrice + risk * (rr + 1),
              riskReward: `1:${rr.toFixed(1)}`,
              reason: `Supertrend (${period}, ${mult}) flipped Bullish (Green). Trailing stop set to ₹${stopLoss.toFixed(2)}.`,
              status: 'ACTIVE',
            });
          }
        }
      }
      break;
    }

    case 'rsi_reversal': {
      const period = numParam(params.rsiPeriod, 14);
      const oversold = numParam(params.oversoldLevel, 30);
      const maxSlPct = numParam(params.stopLossPct, 3.5);

      const rsi = calculateRSI(closes, period);

      for (let i = period + 2; i < candles.length; i++) {
        const rCurr = rsi[i];
        const rPrev = rsi[i - 1];
        if (rCurr === null || rPrev === null) continue;

        // RSI was <= oversold and now curls above oversold
        if (rPrev <= oversold && rCurr > oversold) {
          const c = candles[i];
          const entryPrice = c.close;
          const stopLoss = entryPrice * (1 - maxSlPct / 100);
          const risk = entryPrice - stopLoss;
          const target1 = entryPrice + risk * 2.0;

          signals.push({
            id: `sig_rsi_${c.time}`,
            strategyId,
            strategyName,
            type: 'BUY',
            candleIndex: i,
            time: c.time,
            price: entryPrice,
            stopLoss,
            target1,
            target2: entryPrice + risk * 3.0,
            riskReward: '1:2.0',
            reason: `RSI (${period}) hooked above oversold boundary (${rPrev.toFixed(1)} → ${rCurr.toFixed(1)}) on bullish bounce.`,
            status: 'ACTIVE',
          });
        }
      }
      break;
    }

    case 'bollinger_breakout': {
      const period = numParam(params.period, 20);
      const stdDev = numParam(params.stdDev, 2);
      const rr = numParam(params.riskRewardRatio, 2.5);

      const bb = calculateBollingerBands(closes, period, stdDev);

      for (let i = period + 2; i < candles.length; i++) {
        const currBB = bb[i];
        const prevBB = bb[i - 1];
        if (!currBB || !prevBB) continue;

        // Bollinger Band breakout: previous candle close <= upper band, current candle closes strongly above upper band
        const c = candles[i];
        const prev = candles[i - 1];

        if (prev.close <= prevBB.upper && c.close > currBB.upper && c.close > c.open) {
          const entryPrice = c.close;
          const stopLoss = currBB.middle; // Stop loss at 20 SMA middle line
          const risk = entryPrice - stopLoss;

          if (risk > 0) {
            signals.push({
              id: `sig_bb_${c.time}`,
              strategyId,
              strategyName,
              type: 'BUY',
              candleIndex: i,
              time: c.time,
              price: entryPrice,
              stopLoss,
              target1: entryPrice + risk * rr,
              target2: entryPrice + risk * (rr + 1),
              riskReward: `1:${rr.toFixed(1)}`,
              reason: `Bollinger Squeeze Upper Breakout. Price broke above upper band (₹${currBB.upper.toFixed(2)}) with expanding volatility.`,
              status: 'ACTIVE',
            });
          }
        }
      }
      break;
    }
  }

  return signals;
}

/**
 * Runs a full historical backtest simulation without lookahead bias.
 * `signals` defaults to the strategy's own signals. They are never mutated: the result
 * carries new signal objects with their final status.
 */
export function runBacktest(
  candles: Candle[],
  strategyId: StrategyId,
  customParams?: Record<string, any>,
  symbol: string = 'RELIANCE',
  timeframe: string = '1D',
  signals?: StrategySignal[]
): BacktestResult {
  const startTime = Date.now();
  const defaultDef = BUILT_IN_STRATEGIES[strategyId];
  const params = { ...(defaultDef?.params || {}), ...(customParams || {}) };
  const initialCapital = numParam(params.capital, 100000);
  const riskPerTradePct = numParam(params.riskPerTradePct, 2);
  const maxAllocationPct = numParam(params.maxAllocationPct, 100);
  const costRate = numParam(params.costPerSidePct, DEFAULT_COST_PER_SIDE_PCT) / 100;
  // Exit modes apply to SMA44; the other strategies always exit at their fixed target or stop
  const exitMode: ExitMode =
    strategyId === 'sma44_pullback' && (params.exitMode === 'half' || params.exitMode === 'trail') ? params.exitMode : 'fixed';
  // Trailing exits leave at the next open after a close below the strategy's SMA
  const trailSmas = exitMode === 'fixed' ? null : calculateSMA(candles.map((c) => c.close), numParam(params.smaPeriod, 44));

  let currentCapital = initialCapital; // realised capital (closed trades, net of costs)
  let peakEquity = initialCapital;
  let maxDrawdownINR = 0;
  let maxDrawdownPct = 0;

  const trades: BacktestTrade[] = [];
  // Mark-to-market equity at every bar's close, including the open position
  const equityCurve: EquityPoint[] = [];

  signals = signals ?? generateSignals(candles, strategyId, params);
  // Final status per signal id; signals are copied with these at the end instead of mutated
  const statusById = new Map<string, StrategySignal['status']>();

  // Map signals by candle index for realistic sequential execution
  const signalsByIndex = new Map<number, StrategySignal>();
  for (const s of signals) {
    if (!signalsByIndex.has(s.candleIndex)) {
      signalsByIndex.set(s.candleIndex, s);
    }
  }

  // Asserted rather than annotated so TypeScript does not narrow it to null: it is set inside openTrade
  let activeTrade = null as {
    signal: StrategySignal;
    entryBarIndex: number;
    entryTime: number;
    entryPrice: number;
    initialStop: number;
    stopLoss: number; // moves to breakeven after a half exit
    targetPrice: number;
    shares: number;
    sharesOpen: number; // shares still held after any half exit
    entryCost: number;
    costsPaid: number; // entry cost plus any half-exit cost
    realizedPnl: number; // half-exit P&L net of its exit cost
    partialExit?: BacktestTrade['partialExit'];
    halfDone: boolean;
    exitNextOpen: boolean;
  } | null;

  // Resting buy-stop order waiting for a fill (signals with `buyStop`)
  let pendingOrder: { signal: StrategySignal; expiresIndex: number } | null = null;

  const closeTrade = (i: number, exitPrice: number, exitReason: BacktestTrade['exitReason']) => {
    const { signal, entryBarIndex, entryTime, entryPrice, initialStop, shares, sharesOpen, entryCost, costsPaid, realizedPnl, partialExit } =
      activeTrade!;
    const candle = candles[i];
    const exitCost = exitPrice * sharesOpen * costRate;
    // P&L is net of costs on every fill, including any half exit
    const pnl = realizedPnl + (exitPrice - entryPrice) * sharesOpen - exitCost - entryCost;
    const pnlPct = (pnl / (entryPrice * shares)) * 100;
    const riskAmount = (entryPrice - initialStop) * shares;
    currentCapital += pnl;

    statusById.set(signal.id, exitReason === 'TARGET' ? 'HIT_TARGET' : exitReason === 'STOP_LOSS' ? 'HIT_SL' : 'CLOSED');

    trades.push({
      id: `trade_${trades.length + 1}_${entryTime}`,
      tradeNumber: trades.length + 1,
      type: 'LONG',
      entryTime,
      entryPrice,
      exitTime: candle.time,
      exitPrice,
      shares,
      pnl,
      pnlPct,
      exitReason,
      holdingPeriodBars: i - entryBarIndex,
      equityAfter: currentCapital,
      costs: costsPaid + exitCost,
      initialStop,
      rMultiple: riskAmount > 0 ? pnl / riskAmount : null,
      partialExit,
    });

    activeTrade = null;
  };

  const openTrade = (sig: StrategySignal, i: number, entryPrice: number, targetPrice: number): boolean => {
    const stopLoss = sig.stopLoss;
    // Buy-stop (SMA44) entries size on the true risk; the other strategies keep their 0.5% minimum risk
    const riskPerShare = sig.buyStop ? entryPrice - stopLoss : Math.max(entryPrice - stopLoss, entryPrice * 0.005);

    // Position Sizing: risk X% of current equity, capped by the max allocation and by the
    // capital available to pay for the shares plus the entry cost
    const shares = Math.floor(
      Math.min(
        (currentCapital * (riskPerTradePct / 100)) / riskPerShare,
        (currentCapital * (maxAllocationPct / 100)) / entryPrice,
        currentCapital / (entryPrice * (1 + costRate))
      )
    );

    if (shares <= 0) return false;
    const entryCost = entryPrice * shares * costRate;
    activeTrade = {
      signal: sig,
      entryBarIndex: i,
      entryTime: candles[i].time,
      entryPrice,
      initialStop: stopLoss,
      stopLoss,
      targetPrice,
      shares,
      sharesOpen: shares,
      entryCost,
      costsPaid: entryCost,
      realizedPnl: 0,
      halfDone: false,
      exitNextOpen: false,
    };
    return true;
  };

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    // 1. Manage active position if open
    if (activeTrade) {
      const t = activeTrade;

      // Previous close was below the SMA: trailing exit at this open
      if (t.exitNextOpen) {
        closeTrade(i, candle.open, 'EXIT_SIGNAL');
      }
      // Check Stop Loss hit first (low <= stopLoss): same candle hitting stop and target counts as stop
      else if (candle.low <= t.stopLoss) {
        // Accounts for possible gap down
        closeTrade(i, Math.min(candle.open, t.stopLoss), t.halfDone ? 'BREAKEVEN' : 'STOP_LOSS');
      } else {
        // Check Target hit (high >= targetPrice); trail-only mode has no target
        if (!t.halfDone && candle.high >= t.targetPrice) {
          const fill = Math.max(candle.open, t.targetPrice); // Accounts for possible gap up
          if (exitMode === 'fixed') {
            closeTrade(i, fill, 'TARGET');
          } else {
            // Half mode: book half at the target, move the runner's stop to breakeven
            const half = Math.floor(t.shares / 2);
            if (half > 0) {
              const cost = fill * half * costRate;
              t.realizedPnl += (fill - t.entryPrice) * half - cost;
              t.costsPaid += cost;
              t.sharesOpen -= half;
              t.partialExit = { time: candle.time, price: fill, shares: half };
            }
            t.halfDone = true;
            t.stopLoss = Math.max(t.stopLoss, t.entryPrice);
          }
        }

        // Trailing: a close below the SMA exits at the next open
        const trails = exitMode === 'trail' || (exitMode === 'half' && t.halfDone);
        const sma = trailSmas ? trailSmas[i] : null;
        if (activeTrade && trails && sma !== null && candle.close < sma) {
          t.exitNextOpen = true;
        }

        // Check End of data
        if (activeTrade && i === candles.length - 1) {
          closeTrade(i, candle.close, 'END_OF_DATA');
        }
      }
    }

    // 2. Fill a resting buy-stop order
    if (!activeTrade && pendingOrder) {
      const { signal: sig, expiresIndex } = pendingOrder;
      const order = sig.buyStop!;
      if (i > expiresIndex) {
        statusById.set(sig.id, 'EXPIRED');
        pendingOrder = null;
      } else if (candle.high >= order.trigger) {
        pendingOrder = null;
        // A gap above the trigger fills at the open, not the trigger
        const entryPrice = Math.max(candle.open, order.trigger);
        const risk = entryPrice - sig.stopLoss;
        if (risk > 0 && risk / entryPrice <= SMA44_MAX_RISK_PCT) {
          const target = exitMode === 'trail' ? Infinity : entryPrice + risk * order.targetR;
          const opened = openTrade(sig, i, entryPrice, target);
          // Stop hit on the entry candle: stopped out the same bar
          if (opened && candle.low <= sig.stopLoss) {
            closeTrade(i, sig.stopLoss, 'STOP_LOSS');
          } else if (opened && i === candles.length - 1) {
            closeTrade(i, candle.close, 'END_OF_DATA');
          }
        }
      }
    }

    // 3. Act on a signal at this candle's close if flat and no order is resting
    if (!activeTrade && !pendingOrder && signalsByIndex.has(i)) {
      const sig = signalsByIndex.get(i)!;
      if (sig.buyStop) {
        pendingOrder = { signal: sig, expiresIndex: i + sig.buyStop.validBars };
      } else if (i < candles.length - 1) {
        // An entry at the final close could never be managed, so it is not taken
        openTrade(sig, i, candle.close, sig.target1);
      }
    }

    // 4. Mark the account to market at this bar's close
    const equity = activeTrade
      ? currentCapital +
        activeTrade.realizedPnl -
        activeTrade.entryCost +
        activeTrade.sharesOpen * (candle.close - activeTrade.entryPrice)
      : currentCapital;
    if (equity > peakEquity) peakEquity = equity;
    const ddINR = peakEquity - equity;
    const ddPct = peakEquity > 0 ? (ddINR / peakEquity) * 100 : 0;
    if (ddINR > maxDrawdownINR) maxDrawdownINR = ddINR;
    if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
    equityCurve.push({ time: candle.time, equity, drawdownPct: ddPct });
  }

  // Backtest metrics calculation
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  const losingTrades = trades.filter((t) => t.pnl < 0).length;
  const winRatePct = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalGains = trades.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const totalLosses = Math.abs(trades.filter((t) => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? 99.9 : 0;

  const netProfit = currentCapital - initialCapital;
  const netProfitPct = (netProfit / initialCapital) * 100;

  const avgTradePnl = totalTrades > 0 ? netProfit / totalTrades : 0;
  const avgTradePnlPct = totalTrades > 0 ? trades.reduce((a, t) => a + t.pnlPct, 0) / totalTrades : 0;
  const avgWinPnl = winningTrades > 0 ? totalGains / winningTrades : 0;
  const avgLossPnl = losingTrades > 0 ? totalLosses / losingTrades : 0;

  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let currWins = 0;
  let currLosses = 0;

  for (const t of trades) {
    if (t.pnl > 0) {
      currWins++;
      currLosses = 0;
      if (currWins > maxConsecWins) maxConsecWins = currWins;
    } else if (t.pnl < 0) {
      currLosses++;
      currWins = 0;
      if (currLosses > maxConsecLosses) maxConsecLosses = currLosses;
    }
  }

  const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
  const lossRate = totalTrades > 0 ? losingTrades / totalTrades : 0;
  const expectancy = totalTrades > 0 ? (winRate * avgWinPnl) - (lossRate * avgLossPnl) : 0;
  const winLossRatio = avgLossPnl > 0 ? avgWinPnl / avgLossPnl : avgWinPnl > 0 ? 99.9 : 0;
  const recoveryFactor = maxDrawdownINR > 0 ? netProfit / maxDrawdownINR : netProfit > 0 ? 99.9 : 0;

  const sharpeRatio = annualizedSharpe(equityCurve, timeframe);

  // Average R-multiple: P&L per trade in units of the risk taken at entry
  const rMultiples = trades.map((t) => t.rMultiple).filter((r): r is number => r !== null);
  const avgR = rMultiples.length > 0 ? rMultiples.reduce((a, r) => a + r, 0) / rMultiples.length : null;

  return {
    strategyId,
    strategyName: defaultDef?.name || strategyId,
    symbol,
    timeframe,
    initialCapital,
    finalCapital: currentCapital,
    netProfit,
    netProfitPct,
    totalTrades,
    winningTrades,
    losingTrades,
    winRatePct,
    profitFactor,
    maxDrawdownPct,
    maxDrawdownINR,
    avgTradePnl,
    avgTradePnlPct,
    avgWinPnl,
    avgLossPnl,
    maxConsecutiveWins: maxConsecWins,
    maxConsecutiveLosses: maxConsecLosses,
    trades,
    equityCurve,
    signals: signals.map((sig) => ({ ...sig, status: statusById.get(sig.id) ?? sig.status })),
    executionTimeMs: Date.now() - startTime,
    totalCosts: trades.reduce((acc, t) => acc + t.costs, 0),
    avgR,
    exitMode,
    sharpeRatio: sharpeRatio === undefined ? undefined : Number(sharpeRatio.toFixed(2)),
    expectancy: Number(expectancy.toFixed(2)),
    winLossRatio: Number(winLossRatio.toFixed(2)),
    recoveryFactor: Number(recoveryFactor.toFixed(2)),
  };
}

/**
 * Annualised Sharpe ratio from mark-to-market equity: returns between the last equity of each
 * trading day (IST), mean / sample std x sqrt(252). Weekly and monthly bars annualise with 52
 * and 12 periods. Undefined when there are fewer than two returns or they never vary.
 */
function annualizedSharpe(curve: EquityPoint[], timeframe: string): number | undefined {
  const dailyEquity = new Map<number, number>();
  for (const p of curve) {
    dailyEquity.set(Math.floor((p.time + IST_OFFSET_MS) / DAY_MS), p.equity);
  }
  const equities = [...dailyEquity.values()];
  const returns: number[] = [];
  for (let k = 1; k < equities.length; k++) {
    returns.push(equities[k] / equities[k - 1] - 1);
  }
  if (returns.length < 2) return undefined;

  const mean = returns.reduce((a, r) => a + r, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  if (!(stdDev > 0)) return undefined;

  const periodsPerYear = timeframe === '1W' ? 52 : timeframe === '1M' ? 12 : 252;
  return (mean / stdDev) * Math.sqrt(periodsPerYear);
}
