import { Candle, WatchlistItem } from '../types/index.ts';
import { ScannerItem } from './types.ts';
import { calculateSMA, calculateEMA, calculateRSI, calculateBollingerBands } from './indicators.ts';
import { generateSignals, numParam } from './engine.ts';
import { BUILT_IN_STRATEGIES } from './definitions.ts';

export type ScannerFilterType = 'all' | 'sma44' | 'ema_cross' | 'rsi_oversold' | 'vol_breakout' | 'bollinger_squeeze';

export const INDIAN_MARKET_UNIVERSE: WatchlistItem[] = [
  { key: 'NSE_INDEX|Nifty 50', symbol: 'NIFTY 50', name: 'Nifty 50 Index', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE002A01018', symbol: 'RELIANCE', name: 'RELIANCE INDUSTRIES LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE040A01034', symbol: 'HDFCBANK', name: 'HDFC BANK LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE090A01021', symbol: 'ICICIBANK', name: 'ICICI BANK LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE009A01021', symbol: 'INFY', name: 'INFOSYS LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE467B01029', symbol: 'TCS', name: 'TATA CONSULTANCY SERVICES LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE062A01020', symbol: 'SBIN', name: 'STATE BANK OF INDIA', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE154A01025', symbol: 'ITC', name: 'ITC LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE030A01027', symbol: 'HINDUNILVR', name: 'HINDUSTAN UNILEVER LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE018A01030', symbol: 'LT', name: 'LARSEN & TOUBRO LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE155A01022', symbol: 'TATAMOTORS', name: 'TATA MOTORS LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE296A01024', symbol: 'BAJFINANCE', name: 'BAJAJ FINANCE LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE238A01034', symbol: 'AXISBANK', name: 'AXIS BANK LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE397D01024', symbol: 'BHARTIARTL', name: 'BHARTI AIRTEL LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE237A01028', symbol: 'KOTAKBANK', name: 'KOTAK MAHINDRA BANK LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
  { key: 'NSE_EQ|INE585B01010', symbol: 'MARUTI', name: 'MARUTI SUZUKI INDIA LTD', exchange: 'NSE', lastPrice: null, change: null, changePct: null },
];

/**
 * Row for a symbol whose candles could not be loaded: no price or signal is invented.
 */
export function unavailableScanItem(item: WatchlistItem): ScannerItem {
  return {
    key: item.key,
    symbol: item.symbol,
    name: item.name,
    exchange: item.exchange,
    lastPrice: null,
    changePct: null,
    signal: 'UNAVAILABLE',
    setupName: 'Data unavailable',
    setupScore: 0,
    details: 'Candle data could not be loaded, so no setup was evaluated',
  };
}

/**
 * Scans a list of candles for an instrument to detect active setups.
 * The 44 SMA setup uses the backtester's own rule (generateSignals) with `sma44Params`.
 */
export function analyzeSymbolForSetups(
  item: WatchlistItem,
  candles: Candle[],
  sma44Params: Record<string, any> = BUILT_IN_STRATEGIES.sma44_pullback.params
): ScannerItem | null {
  if (!candles || candles.length < 45) {
    return {
      key: item.key,
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchange,
      lastPrice: candles?.length ? candles[candles.length - 1].close : item.lastPrice,
      changePct: item.changePct,
      signal: 'NEUTRAL',
      setupName: 'Insufficient Data',
      setupScore: 0,
      details: 'Needs at least 45 candles for technical scan',
    };
  }

  const closes = candles.map((c) => c.close);
  const latest = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  // Session change from the candles themselves, not from a static list
  const changePct = prev.close > 0 ? ((latest.close - prev.close) / prev.close) * 100 : null;

  // 1. Check 44 SMA Pullback: a setup on the latest candle, by the same rule the backtester trades
  const smaList = calculateSMA(closes, numParam(sma44Params.smaPeriod, 44));
  const currentSma = smaList[smaList.length - 1];
  const smaDistancePct = currentSma ? ((latest.close - currentSma) / currentSma) * 100 : 0;

  const sma44Setup = generateSignals(candles, 'sma44_pullback', sma44Params).find(
    (s) => s.candleIndex === candles.length - 1
  );
  if (sma44Setup) {
    return {
      key: item.key,
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchange,
      lastPrice: latest.close,
      changePct,
      signal: 'BULLISH',
      setupName: '44 SMA Pullback Bounce',
      setupScore: 94,
      details: `Setup on rising 44 SMA (₹${(currentSma ?? 0).toFixed(2)}). Buy-stop ₹${sma44Setup.price.toFixed(2)}, stop ₹${sma44Setup.stopLoss.toFixed(2)}`,
      smaDistancePct,
    };
  }

  // 2. Check EMA 9 / 21 Trend Crossover
  const ema9List = calculateEMA(closes, 9);
  const ema21List = calculateEMA(closes, 21);
  const curE9 = ema9List[ema9List.length - 1];
  const prevE9 = ema9List[ema9List.length - 2];
  const curE21 = ema21List[ema21List.length - 1];
  const prevE21 = ema21List[ema21List.length - 2];

  if (curE9 !== null && prevE9 !== null && curE21 !== null && prevE21 !== null) {
    if (prevE9 <= prevE21 && curE9 > curE21) {
      return {
        key: item.key,
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchange,
        lastPrice: latest.close,
        changePct,
        signal: 'BULLISH',
        setupName: 'EMA 9/21 Golden Cross',
        setupScore: 91,
        details: `Fast 9 EMA (₹${curE9.toFixed(2)}) crossed above 21 EMA (₹${curE21.toFixed(2)}) indicating bullish momentum`,
      };
    }
  }

  // 3. Check RSI Oversold / Overbought
  const rsiList = calculateRSI(closes, 14);
  const currentRsi = rsiList[rsiList.length - 1];
  const prevRsi = rsiList[rsiList.length - 2];

  if (currentRsi !== null && prevRsi !== null) {
    if (currentRsi <= 35 && currentRsi > prevRsi) {
      return {
        key: item.key,
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchange,
        lastPrice: latest.close,
        changePct,
        signal: 'BULLISH',
        setupName: 'RSI Oversold Hook (>30)',
        setupScore: 88,
        details: `RSI rebounding from oversold zone (${prevRsi.toFixed(1)} → ${currentRsi.toFixed(1)})`,
        rsi: currentRsi,
      };
    } else if (currentRsi >= 75) {
      return {
        key: item.key,
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchange,
        lastPrice: latest.close,
        changePct,
        signal: 'BEARISH',
        setupName: 'RSI Overbought Alert (>75)',
        setupScore: 80,
        details: `RSI elevated at ${currentRsi.toFixed(1)}, watch for potential mean reversion`,
        rsi: currentRsi,
      };
    }
  }

  // 4. Check Volume Spike Breakout
  const recentVolumes = candles.slice(-21, -1).map((c) => c.volume);
  const avgVol = recentVolumes.reduce((a, b) => a + b, 0) / (recentVolumes.length || 1);
  const volRatio = avgVol > 0 ? latest.volume / avgVol : 1;

  if (volRatio >= 1.8 && latest.close > prev.close && latest.close > latest.open) {
    return {
      key: item.key,
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchange,
      lastPrice: latest.close,
      changePct,
      signal: 'BULLISH',
      setupName: 'High Volume Expansion',
      setupScore: 89,
      details: `Volume is ${(volRatio).toFixed(1)}x above 20-period average on strong up candle`,
      volumeRatio: volRatio,
    };
  }

  // 5. Check Bollinger Band Squeeze
  const bbList = calculateBollingerBands(closes, 20, 2);
  const currentBB = bbList[bbList.length - 1];
  if (currentBB && currentBB.bandwidth < 0.04) {
    return {
      key: item.key,
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchange,
      lastPrice: latest.close,
      changePct,
      signal: 'NEUTRAL',
      setupName: 'Bollinger Band Squeeze',
      setupScore: 78,
      details: `Bandwidth tight at ${(currentBB.bandwidth * 100).toFixed(1)}%, explosive breakout pending`,
    };
  }

  // Default baseline
  return {
    key: item.key,
    symbol: item.symbol,
    name: item.name,
    exchange: item.exchange,
    lastPrice: latest.close,
    changePct,
    signal: changePct === null ? 'NEUTRAL' : changePct >= 0 ? 'BULLISH' : 'BEARISH',
    setupName: 'Consolidation / Range',
    setupScore: 50,
    details: `Trading within normal range (RSI ${currentRsi?.toFixed(0) ?? '-'})`,
    rsi: currentRsi ?? undefined,
    smaDistancePct,
  };
}
