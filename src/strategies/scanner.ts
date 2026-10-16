import { Candle, WatchlistItem } from '../types/index.ts';
import { ScannerItem } from './types.ts';
import { calculateSMA, calculateEMA, calculateRSI, calculateBollingerBands } from './indicators.ts';

export type ScannerFilterType = 'all' | 'sma44' | 'ema_cross' | 'rsi_oversold' | 'vol_breakout' | 'bollinger_squeeze';

export const INDIAN_MARKET_UNIVERSE: WatchlistItem[] = [
  { key: 'NSE_INDEX|Nifty 50', symbol: 'NIFTY 50', name: 'Nifty 50 Index', exchange: 'NSE', lastPrice: 24850.50, change: 125.40, changePct: 0.51 },
  { key: 'NSE_EQ|INE002A01018', symbol: 'RELIANCE', name: 'RELIANCE INDUSTRIES LTD', exchange: 'NSE', lastPrice: 2980.25, change: 32.10, changePct: 1.09 },
  { key: 'NSE_EQ|INE040A01034', symbol: 'HDFCBANK', name: 'HDFC BANK LTD', exchange: 'NSE', lastPrice: 1680.00, change: -12.40, changePct: -0.73 },
  { key: 'NSE_EQ|INE090A01021', symbol: 'ICICIBANK', name: 'ICICI BANK LTD', exchange: 'NSE', lastPrice: 1245.50, change: 18.20, changePct: 1.48 },
  { key: 'NSE_EQ|INE009A01021', symbol: 'INFY', name: 'INFOSYS LTD', exchange: 'NSE', lastPrice: 1890.75, change: 5.60, changePct: 0.30 },
  { key: 'NSE_EQ|INE467B01029', symbol: 'TCS', name: 'TATA CONSULTANCY SERVICES LTD', exchange: 'NSE', lastPrice: 4210.00, change: -24.80, changePct: -0.59 },
  { key: 'NSE_EQ|INE062A01020', symbol: 'SBIN', name: 'STATE BANK OF INDIA', exchange: 'NSE', lastPrice: 810.20, change: 8.40, changePct: 1.05 },
  { key: 'NSE_EQ|INE154A01025', symbol: 'ITC', name: 'ITC LTD', exchange: 'NSE', lastPrice: 485.50, change: 2.10, changePct: 0.43 },
  { key: 'NSE_EQ|INE030A01027', symbol: 'HINDUNILVR', name: 'HINDUSTAN UNILEVER LTD', exchange: 'NSE', lastPrice: 2680.00, change: -15.30, changePct: -0.57 },
  { key: 'NSE_EQ|INE018A01030', symbol: 'LT', name: 'LARSEN & TOUBRO LTD', exchange: 'NSE', lastPrice: 3590.00, change: 42.00, changePct: 1.18 },
  { key: 'NSE_EQ|INE155A01022', symbol: 'TATAMOTORS', name: 'TATA MOTORS LTD', exchange: 'NSE', lastPrice: 940.50, change: 15.20, changePct: 1.64 },
  { key: 'NSE_EQ|INE296A01024', symbol: 'BAJFINANCE', name: 'BAJAJ FINANCE LTD', exchange: 'NSE', lastPrice: 7120.00, change: -35.00, changePct: -0.49 },
  { key: 'NSE_EQ|INE238A01034', symbol: 'AXISBANK', name: 'AXIS BANK LTD', exchange: 'NSE', lastPrice: 1195.00, change: 14.50, changePct: 1.23 },
  { key: 'NSE_EQ|INE397D01024', symbol: 'BHARTIARTL', name: 'BHARTI AIRTEL LTD', exchange: 'NSE', lastPrice: 1650.00, change: 22.00, changePct: 1.35 },
  { key: 'NSE_EQ|INE237A01028', symbol: 'KOTAKBANK', name: 'KOTAK MAHINDRA BANK LTD', exchange: 'NSE', lastPrice: 1780.00, change: -8.00, changePct: -0.45 },
  { key: 'NSE_EQ|INE585B01010', symbol: 'MARUTI', name: 'MARUTI SUZUKI INDIA LTD', exchange: 'NSE', lastPrice: 12250.00, change: 180.00, changePct: 1.49 },
];

/**
 * Scans a list of candles for an instrument to detect active setups.
 */
export function analyzeSymbolForSetups(
  item: WatchlistItem,
  candles: Candle[]
): ScannerItem | null {
  if (!candles || candles.length < 45) {
    return {
      key: item.key,
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchange,
      lastPrice: item.lastPrice,
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

  // 1. Check 44 SMA Pullback
  const sma44List = calculateSMA(closes, 44);
  const currentSma44 = sma44List[sma44List.length - 1];
  const prevSma44 = sma44List[sma44List.length - 2];

  let smaDistancePct = 0;
  if (currentSma44 && prevSma44) {
    smaDistancePct = ((latest.close - currentSma44) / currentSma44) * 100;
    const isSmaRising = currentSma44 >= prevSma44 * 0.999;
    const dippedNear = latest.low <= currentSma44 * 1.015 && latest.close >= currentSma44 * 0.985;
    const isGreen = latest.close >= latest.open;

    if (isSmaRising && dippedNear && isGreen) {
      return {
        key: item.key,
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchange,
        lastPrice: latest.close,
        changePct: item.changePct,
        signal: 'BULLISH',
        setupName: '44 SMA Pullback Bounce',
        setupScore: 94,
        details: `Touching rising 44 SMA (₹${currentSma44.toFixed(2)}) with green confirmation candle`,
        smaDistancePct,
      };
    }
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
        changePct: item.changePct,
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
        changePct: item.changePct,
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
        changePct: item.changePct,
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
      changePct: item.changePct,
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
      changePct: item.changePct,
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
    changePct: item.changePct,
    signal: item.changePct >= 0 ? 'BULLISH' : 'BEARISH',
    setupName: 'Consolidation / Range',
    setupScore: 50,
    details: `Trading within normal range (RSI ${currentRsi?.toFixed(0) ?? '-'})`,
    rsi: currentRsi ?? undefined,
    smaDistancePct,
  };
}
