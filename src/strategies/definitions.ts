import { StrategyDefinition, StrategyId } from './types.ts';

export const BUILT_IN_STRATEGIES: Record<StrategyId, StrategyDefinition> = {
  sma44_pullback: {
    id: 'sma44_pullback',
    name: '44 SMA Pullback Strategy',
    shortName: '44 SMA Pullback',
    tagline: 'High-probability Indian swing trading setup',
    description:
      'SMA(44) above its value 5 bars ago. Setup: a green candle closing at ₹20+ whose low is within 1% above the SMA (or below it) and whose close is above the SMA. Entry: buy-stop at the setup high + ₹0.05, valid 2 bars (a gap above it fills at the open). Stop: the lower of the setup low and the previous low; setups risking more than 15% are skipped.',
    popularFor: 'Nifty 50, Bank Nifty, and High-Beta Large Caps (Daily & 1-Hour)',
    params: {
      smaPeriod: 44,
      trendFilterSma: 0,
      riskRewardRatio: 2.0,
      exitMode: 'fixed',
      capital: 100000,
      riskPerTradePct: 1,
      maxAllocationPct: 100,
      costPerSidePct: 0.15,
    },
    paramDefs: [
      { key: 'smaPeriod', label: 'SMA Period', type: 'number', default: 44, min: 10, max: 200 },
      { key: 'trendFilterSma', label: 'Trend Filter SMA (0 = off)', type: 'number', default: 0, min: 0, max: 200 },
      { key: 'riskRewardRatio', label: 'Risk-to-Reward (R:R)', type: 'number', default: 2.0, min: 1.0, max: 5.0, step: 0.5 },
      {
        key: 'exitMode',
        label: 'Exit Mode',
        type: 'select',
        default: 'fixed',
        options: [
          { value: 'fixed', label: 'Fixed target (R:R)' },
          { value: 'half', label: 'Half at target, rest trails' },
          { value: 'trail', label: 'Trail only (close < SMA)' },
        ],
      },
      { key: 'capital', label: 'Starting Capital (₹)', type: 'number', default: 100000, min: 10000, max: 10000000, step: 10000 },
      { key: 'riskPerTradePct', label: 'Risk Per Trade (%)', type: 'number', default: 1, min: 0.25, max: 10, step: 0.25 },
      { key: 'maxAllocationPct', label: 'Max Allocation (% of equity)', type: 'number', default: 100, min: 5, max: 100, step: 5 },
      { key: 'costPerSidePct', label: 'Costs per Side (%)', type: 'number', default: 0.15, min: 0, max: 1, step: 0.01 },
    ],
  },

  ema_crossover: {
    id: 'ema_crossover',
    name: 'EMA 9 / 21 Trend Crossover',
    shortName: 'EMA 9/21 Cross',
    tagline: 'Fast momentum & trend continuation engine',
    description:
      'Generates long signals when the fast 9 EMA crosses above the slow 21 EMA in the direction of the macro trend, and exits when fast EMA crosses below or target is reached.',
    popularFor: 'Intraday (5m, 15m) and Momentum Swing (1D)',
    params: {
      fastPeriod: 9,
      slowPeriod: 21,
      riskRewardRatio: 2.0,
      trailingStop: 1, // 1 = enabled, 0 = fixed
      capital: 100000,
      riskPerTradePct: 2,
    },
    paramDefs: [
      { key: 'fastPeriod', label: 'Fast EMA Period', type: 'number', default: 9, min: 3, max: 50 },
      { key: 'slowPeriod', label: 'Slow EMA Period', type: 'number', default: 21, min: 10, max: 100 },
      { key: 'riskRewardRatio', label: 'Risk-to-Reward (R:R)', type: 'number', default: 2.0, min: 1.0, max: 5.0, step: 0.5 },
      { key: 'capital', label: 'Starting Capital (₹)', type: 'number', default: 100000, min: 10000, max: 10000000, step: 10000 },
      { key: 'riskPerTradePct', label: 'Risk Per Trade (%)', type: 'number', default: 2, min: 0.5, max: 10, step: 0.5 },
    ],
  },

  supertrend: {
    id: 'supertrend',
    name: 'Supertrend (10, 3) Volatility Trend',
    shortName: 'Supertrend',
    tagline: 'ATR-based trailing stop and trend follower',
    description:
      'Calculates volatility bands using Average True Range (ATR). Goes long when price closes above the upper band, keeping the trailing band as a dynamic trailing stop.',
    popularFor: 'Trend following in Nifty, Bank Nifty, and NSE Equities',
    params: {
      period: 10,
      multiplier: 3,
      riskRewardRatio: 2.5,
      capital: 100000,
      riskPerTradePct: 2,
    },
    paramDefs: [
      { key: 'period', label: 'ATR Period', type: 'number', default: 10, min: 5, max: 30 },
      { key: 'multiplier', label: 'ATR Multiplier', type: 'number', default: 3, min: 1, max: 6, step: 0.5 },
      { key: 'riskRewardRatio', label: 'Target R:R', type: 'number', default: 2.5, min: 1.0, max: 5.0, step: 0.5 },
      { key: 'capital', label: 'Starting Capital (₹)', type: 'number', default: 100000, min: 10000, max: 10000000, step: 10000 },
      { key: 'riskPerTradePct', label: 'Risk Per Trade (%)', type: 'number', default: 2, min: 0.5, max: 10, step: 0.5 },
    ],
  },

  rsi_reversal: {
    id: 'rsi_reversal',
    name: 'RSI Mean Reversion & Oversold Bounce',
    shortName: 'RSI Reversal',
    tagline: 'Oversold accumulation and mean reversion',
    description:
      'Detects extreme exhaustion when RSI dips below 30 in an overall healthy structure. Triggers a buy signal when RSI curls back above 30 with bullish confirmation, targeting the 60-70 RSI zone.',
    popularFor: 'Swing trading dips on fundamentally strong NSE equities',
    params: {
      rsiPeriod: 14,
      oversoldLevel: 30,
      exitLevel: 65,
      stopLossPct: 3.5,
      capital: 100000,
      riskPerTradePct: 2,
    },
    paramDefs: [
      { key: 'rsiPeriod', label: 'RSI Period', type: 'number', default: 14, min: 7, max: 28 },
      { key: 'oversoldLevel', label: 'Oversold Buy Threshold', type: 'number', default: 30, min: 15, max: 40 },
      { key: 'exitLevel', label: 'Exit RSI Target Level', type: 'number', default: 65, min: 50, max: 85 },
      { key: 'stopLossPct', label: 'Max Stop Loss (%)', type: 'number', default: 3.5, min: 1, max: 10, step: 0.5 },
      { key: 'capital', label: 'Starting Capital (₹)', type: 'number', default: 100000, min: 10000, max: 10000000, step: 10000 },
      { key: 'riskPerTradePct', label: 'Risk Per Trade (%)', type: 'number', default: 2, min: 0.5, max: 10, step: 0.5 },
    ],
  },

  bollinger_breakout: {
    id: 'bollinger_breakout',
    name: 'Bollinger Band Squeeze Breakout',
    shortName: 'Bollinger Squeeze',
    tagline: 'Volatility contraction preceding rapid expansions',
    description:
      'Measures volatility contraction when Bollinger Band bandwidth contracts below historical norms, then buys the breakout candle closing outside the upper band.',
    popularFor: 'Capturing large multi-day expansion candles in equities',
    params: {
      period: 20,
      stdDev: 2,
      riskRewardRatio: 2.5,
      capital: 100000,
      riskPerTradePct: 2,
    },
    paramDefs: [
      { key: 'period', label: 'Period', type: 'number', default: 20, min: 10, max: 50 },
      { key: 'stdDev', label: 'Std Dev Multiplier', type: 'number', default: 2, min: 1, max: 3.5, step: 0.5 },
      { key: 'riskRewardRatio', label: 'Risk-to-Reward (R:R)', type: 'number', default: 2.5, min: 1.0, max: 5.0, step: 0.5 },
      { key: 'capital', label: 'Starting Capital (₹)', type: 'number', default: 100000, min: 10000, max: 10000000, step: 10000 },
      { key: 'riskPerTradePct', label: 'Risk Per Trade (%)', type: 'number', default: 2, min: 0.5, max: 10, step: 0.5 },
    ],
  },
};
