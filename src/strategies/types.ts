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

// SMA44 exits: full exit at the target | half at the target, then breakeven stop + trail | trail only
export type ExitMode = 'fixed' | 'half' | 'trail';

/** A resting buy-stop order placed after the signal candle closes. */
export interface BuyStopOrder {
  trigger: number;
  validBars: number; // number of bars after the signal candle on which the order may fill
  targetR: number; // target distance in multiples of the risk taken at the fill
}

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
  status: 'ACTIVE' | 'HIT_TARGET' | 'HIT_SL' | 'CLOSED' | 'EXPIRED';
  // Present when entry is a buy-stop above the signal candle; otherwise entry is at the signal close.
  buyStop?: BuyStopOrder;
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
  exitReason: 'TARGET' | 'STOP_LOSS' | 'BREAKEVEN' | 'EXIT_SIGNAL' | 'END_OF_DATA';
  holdingPeriodBars: number;
  equityAfter: number;
  costs: number; // transaction costs paid on entry + exit (already deducted from pnl)
  initialStop: number;
  rMultiple: number | null; // pnl / (shares x (entry - initial stop)); null when that risk is not positive
  partialExit?: { time: number; price: number; shares: number }; // half exit at the target (half mode)
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
  totalCosts: number;
  avgR: number | null; // null when there are no trades
  exitMode: ExitMode;
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
  lastPrice: number | null; // null when no market data is available
  changePct: number | null;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'UNAVAILABLE';
  setupName: string;
  setupScore: number; // 0 - 100
  details: string;
  rsi?: number;
  smaDistancePct?: number;
  volumeRatio?: number;
}
