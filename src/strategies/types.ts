import { Candle } from '../types/index.ts';

export type StrategyId = 'sma44_pullback' | 'ema_crossover' | 'supertrend' | 'rsi_reversal' | 'bollinger_breakout';

export interface StrategyParamDef {
  key: string;
  label: string;
  type: 'number' | 'select';
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string | number; label: string }[];
}

export interface StrategyDefinition {
  id: StrategyId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  popularFor: string;
  params: Record<string, number | string>;
  paramDefs: StrategyParamDef[];
}

export type SignalType = 'BUY' | 'SELL';

export interface StrategySignal {
  id: string;
  strategyId: StrategyId;
  strategyName: string;
  type: SignalType;
  candleIndex: number;
  time: number; // Unix timestamp ms
  price: number;
  stopLoss: number;
  target1: number;
  target2: number;
  riskReward: string;
  reason: string;
  status: 'ACTIVE' | 'HIT_TARGET' | 'HIT_SL' | 'CLOSED';
}

export interface BacktestTrade {
  id: string;
  tradeNumber: number;
  type: 'LONG' | 'SHORT';
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPct: number;
  exitReason: 'TARGET' | 'STOP_LOSS' | 'EXIT_SIGNAL' | 'END_OF_DATA';
  holdingPeriodBars: number;
  equityAfter: number;
}

export interface EquityPoint {
  time: number;
  equity: number;
  drawdownPct: number;
}

export interface BacktestResult {
  strategyId: StrategyId;
  strategyName: string;
  symbol: string;
  timeframe: string;
  initialCapital: number;
  finalCapital: number;
  netProfit: number;
  netProfitPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  maxDrawdownINR: number;
  avgTradePnl: number;
  avgTradePnlPct: number;
  avgWinPnl: number;
  avgLossPnl: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
  signals: StrategySignal[];
  executionTimeMs: number;
  sharpeRatio?: number;
  expectancy?: number;
  winLossRatio?: number;
  recoveryFactor?: number;
}

export interface ScannerItem {
  key: string;
  symbol: string;
  name: string;
  exchange: string;
  lastPrice: number;
  changePct: number;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  setupName: string;
  setupScore: number; // 0 - 100
  details: string;
  rsi?: number;
  smaDistancePct?: number;
  volumeRatio?: number;
}
