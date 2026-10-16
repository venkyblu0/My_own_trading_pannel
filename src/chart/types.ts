export interface IndicatorItem {
  name: string;
  label: string;
  isOverlay: boolean;
  defaultParams: number[];
  description: string;
}

export const SUPPORTED_INDICATORS: IndicatorItem[] = [
  { name: 'SMA', label: 'SMA (Simple Moving Average)', isOverlay: true, defaultParams: [44], description: 'Arithmetic moving average plotted directly over candlestick prices' },
  { name: 'EMA', label: 'EMA (Exponential Moving Average)', isOverlay: true, defaultParams: [20], description: 'Exponential moving average giving priority to recent prices over candles' },
  { name: 'MA', label: 'MA (Moving Average Multi-Line)', isOverlay: true, defaultParams: [5, 10, 30, 60], description: 'Standard multi-period moving average bands plotted over candles' },
  { name: 'BOLL', label: 'Bollinger Bands', isOverlay: true, defaultParams: [20, 2], description: 'Volatility envelope bands plotted directly over candlesticks' },
  { name: 'SAR', label: 'Parabolic SAR', isOverlay: true, defaultParams: [2, 2, 20], description: 'Trailing stop and reverse dots over/under price candles' },
  { name: 'BBI', label: 'Bull and Bear Index', isOverlay: true, defaultParams: [3, 6, 12, 24], description: 'Integrated multi-period benchmark plotted over candles' },
  { name: 'VOL', label: 'Volume (VOL)', isOverlay: true, defaultParams: [5, 10, 20], description: 'Volume histogram plotted over the lower section of the candle pane' },
  { name: 'MACD', label: 'MACD', isOverlay: true, defaultParams: [12, 26, 9], description: 'Moving Average Convergence Divergence overlaid on chart' },
  { name: 'RSI', label: 'RSI (Relative Strength Index)', isOverlay: true, defaultParams: [14], description: 'Momentum oscillator plotted over price action' },
  { name: 'KDJ', label: 'KDJ Stochastic Oscillator', isOverlay: true, defaultParams: [9, 3, 3], description: 'Fast stochastic indicator overlaid on chart' },
  { name: 'OBV', label: 'OBV (On-Balance Volume)', isOverlay: true, defaultParams: [30], description: 'Cumulative volume indicator tracking smart money accumulation' },
  { name: 'CCI', label: 'CCI (Commodity Channel Index)', isOverlay: true, defaultParams: [20], description: 'Cyclical oscillator identifying overbought/oversold levels' },
  { name: 'DMI', label: 'DMI (Directional Movement Index)', isOverlay: true, defaultParams: [14, 6], description: 'Trend strength indicator (+DI, -DI, ADX) over chart' },
  { name: 'WR', label: 'Williams %R', isOverlay: true, defaultParams: [14], description: 'Momentum indicator comparing close to high-low range' },
  { name: 'BIAS', label: 'BIAS Ratio', isOverlay: true, defaultParams: [6, 12, 24], description: 'Deviation percentage of price from moving average' },
];

export const DRAWING_OVERLAY_MAP: Record<string, string> = {
  trendline: 'segment',
  ray: 'rayLine',
  extendedLine: 'straightLine',
  horizontal: 'horizontalStraightLine',
  horizontalRay: 'horizontalRayLine',
  vertical: 'verticalStraightLine',
  parallelChannel: 'parallelStraightLine',
  priceChannel: 'priceChannelLine',
  fibonacci: 'fibonacciLine',
  priceLine: 'priceLine',
  text: 'simpleAnnotation',
  tag: 'simpleTag',
  brush: 'brush',
};
