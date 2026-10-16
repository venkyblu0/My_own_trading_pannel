import { Candle } from '../types/index.ts';
import {
  StrategyId,
  StrategySignal,
  BacktestTrade,
  BacktestResult,
  EquityPoint,
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
      const smaPeriod = Number(params.smaPeriod) || 44;
      const rr = Number(params.riskRewardRatio) || 2.0;
      const maxDistancePct = Number(params.maxPullbackDistancePct) || 2.5;
      const trendPeriod = Number(params.trendFilterSma) || 200;

      const smas = calculateSMA(closes, smaPeriod);
      const trendSmas = trendPeriod > 0 ? calculateSMA(closes, trendPeriod) : null;

      for (let i = Math.max(smaPeriod, 10); i < candles.length; i++) {
        const c = candles[i];
        const prev = candles[i - 1];
        const sma = smas[i];
        const prevSma = smas[i - 1];

        if (sma === null || prevSma === null) continue;

        // Condition 1: 44 SMA is sloping upwards
        const isSmaRising = sma >= prevSma * 0.9995;

        // Condition 2: Macro trend filter (if enabled)
        const isMacroBullish = !trendSmas || trendSmas[i] === null || c.close >= (trendSmas[i] as number);

        // Condition 3: Candle pulled back near 44 SMA (low dipped near or touched SMA)
        const distanceToSmaPct = Math.abs(c.low - sma) / sma * 100;
        const touchedNearSma = c.low <= sma * 1.012 && c.close >= sma * 0.985 && distanceToSmaPct <= maxDistancePct;

        // Condition 4: Bullish confirmation candle (green candle or hammer/rejection)
        const isBullishConfirmation = c.close > c.open && c.close > prev.close;

        if (isSmaRising && isMacroBullish && touchedNearSma && isBullishConfirmation) {
          const entryPrice = c.close;
          // Stop Loss just below the recent swing low or candle low with safety buffer
          const stopLoss = Math.min(c.low, prev.low) * 0.995;
          const risk = entryPrice - stopLoss;
          if (risk > 0) {
            const target1 = entryPrice + risk * rr;
            const target2 = entryPrice + risk * (rr + 1);

            signals.push({
              id: `sig_sma44_${c.time}`,
              strategyId,
              strategyName,
              type: 'BUY',
              candleIndex: i,
              time: c.time,
              price: entryPrice,
              stopLoss,
              target1,
              target2,
              riskReward: `1:${rr.toFixed(1)}`,
              reason: `44 SMA Pullback Bounce. Low touched ₹${c.low.toFixed(2)} near rising SMA (₹${sma.toFixed(2)}) with bullish confirmation.`,
              status: 'ACTIVE',
            });
          }
        }
      }
      break;
    }

    case 'ema_crossover': {
      const fastP = Number(params.fastPeriod) || 9;
      const slowP = Number(params.slowPeriod) || 21;
      const rr = Number(params.riskRewardRatio) || 2.0;

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
      const period = Number(params.period) || 10;
      const mult = Number(params.multiplier) || 3;
      const rr = Number(params.riskRewardRatio) || 2.5;

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
      const period = Number(params.rsiPeriod) || 14;
      const oversold = Number(params.oversoldLevel) || 30;
      const maxSlPct = Number(params.stopLossPct) || 3.5;

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
      const period = Number(params.period) || 20;
      const stdDev = Number(params.stdDev) || 2;
      const rr = Number(params.riskRewardRatio) || 2.5;

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
 */
export function runBacktest(
  candles: Candle[],
  strategyId: StrategyId,
  customParams?: Record<string, any>,
  symbol: string = 'RELIANCE',
  timeframe: string = '1D'
): BacktestResult {
  const startTime = Date.now();
  const defaultDef = BUILT_IN_STRATEGIES[strategyId];
  const params = { ...(defaultDef?.params || {}), ...(customParams || {}) };
  const initialCapital = Number(params.capital) || 100000;
  const riskPerTradePct = Number(params.riskPerTradePct) || 2;

  let currentCapital = initialCapital;
  let peakCapital = initialCapital;
  let maxDrawdownINR = 0;
  let maxDrawdownPct = 0;

  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [{ time: candles[0]?.time || Date.now(), equity: initialCapital, drawdownPct: 0 }];

  const signals = generateSignals(candles, strategyId, params);

  // Map signals by candle index for realistic sequential execution
  const signalsByIndex = new Map<number, StrategySignal>();
  for (const s of signals) {
    if (!signalsByIndex.has(s.candleIndex)) {
      signalsByIndex.set(s.candleIndex, s);
    }
  }

  let activeTrade: {
    signal: StrategySignal;
    entryBarIndex: number;
    entryTime: number;
    entryPrice: number;
    stopLoss: number;
    targetPrice: number;
    shares: number;
  } | null = null;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    // 1. Manage active position if open
    if (activeTrade) {
      const { signal, entryBarIndex, entryTime, entryPrice, stopLoss, targetPrice, shares } = activeTrade;
      let exitPrice: number | null = null;
      let exitReason: 'TARGET' | 'STOP_LOSS' | 'EXIT_SIGNAL' | 'END_OF_DATA' = 'END_OF_DATA';

      // Check Stop Loss hit first (low <= stopLoss)
      if (candle.low <= stopLoss) {
        exitPrice = Math.min(candle.open, stopLoss); // Accounts for possible gap down
        exitReason = 'STOP_LOSS';
        signal.status = 'HIT_SL';
      }
      // Check Target hit (high >= targetPrice)
      else if (candle.high >= targetPrice) {
        exitPrice = Math.max(candle.open, targetPrice); // Accounts for possible gap up
        exitReason = 'TARGET';
        signal.status = 'HIT_TARGET';
      }
      // Check End of data
      else if (i === candles.length - 1) {
        exitPrice = candle.close;
        exitReason = 'END_OF_DATA';
        signal.status = 'CLOSED';
      }

      if (exitPrice !== null) {
        const pnl = (exitPrice - entryPrice) * shares;
        const pnlPct = ((exitPrice - entryPrice) / entryPrice) * 100;
        currentCapital += pnl;

        if (currentCapital > peakCapital) {
          peakCapital = currentCapital;
        }
        const ddINR = peakCapital - currentCapital;
        const ddPct = peakCapital > 0 ? (ddINR / peakCapital) * 100 : 0;
        if (ddINR > maxDrawdownINR) maxDrawdownINR = ddINR;
        if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;

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
        });

        equityCurve.push({
          time: candle.time,
          equity: currentCapital,
          drawdownPct: ddPct,
        });

        activeTrade = null;
      }
    }

    // 2. Open new trade on signal if no position currently active
    if (!activeTrade && signalsByIndex.has(i)) {
      const sig = signalsByIndex.get(i)!;
      const entryPrice = candle.close;
      const stopLoss = sig.stopLoss;
      const targetPrice = sig.target1;
      const riskPerShare = Math.max(entryPrice - stopLoss, entryPrice * 0.005);

      // Position Sizing: Risk X% of current equity per trade
      const maxRiskCapital = currentCapital * (riskPerTradePct / 100);
      let shares = Math.floor(maxRiskCapital / riskPerShare);

      // Capital constraint: Cannot exceed current available capital
      if (shares * entryPrice > currentCapital) {
        shares = Math.floor(currentCapital / entryPrice);
      }

      if (shares > 0) {
        activeTrade = {
          signal: sig,
          entryBarIndex: i,
          entryTime: candle.time,
          entryPrice,
          stopLoss,
          targetPrice,
          shares,
        };
      }
    }
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

  // Annualized Sharpe Ratio approximation based on trade return variance
  let sharpeRatio = 0;
  if (totalTrades > 1) {
    const meanPct = avgTradePnlPct;
    const variance = trades.reduce((acc, t) => acc + Math.pow(t.pnlPct - meanPct, 2), 0) / (totalTrades - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0.0001) {
      sharpeRatio = (meanPct / stdDev) * Math.sqrt(Math.min(252, totalTrades * 12));
    }
  }

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
    signals,
    executionTimeMs: Date.now() - startTime,
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    expectancy: Number(expectancy.toFixed(2)),
    winLossRatio: Number(winLossRatio.toFixed(2)),
    recoveryFactor: Number(recoveryFactor.toFixed(2)),
  };
}
