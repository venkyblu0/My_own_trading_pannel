import React, { useEffect, useRef, useState, useMemo } from 'react';
import { init, dispose, Chart, KLineData, Nullable } from 'klinecharts';
import { useAppStore } from '../store/useAppStore.ts';
import { TERMINAL_NIGHT_THEME } from '../chart/theme.ts';
import { DRAWING_OVERLAY_MAP } from '../chart/types.ts';
import { computeHeikinAshi } from '../chart/heikinAshi.ts';
import { registerCustomIndicators } from '../chart/customIndicators.ts';
import { formatINR, formatPct, formatVolume, formatISTTime } from '../lib/formatters.ts';
import { AlertCircle, KeyRound, Loader2, Sparkles, Activity, Radio, Eye, EyeOff, Play, SlidersHorizontal, X, ArrowUpRight } from 'lucide-react';
import { BUILT_IN_STRATEGIES } from '../strategies/definitions.ts';
import { Candle } from '../types/index.ts';

function getKLinePeriod(tf: string): { type: 'minute' | 'hour' | 'day' | 'week' | 'month'; span: number } {
  switch (tf) {
    case '1m': return { type: 'minute', span: 1 };
    case '3m': return { type: 'minute', span: 3 };
    case '5m': return { type: 'minute', span: 5 };
    case '15m': return { type: 'minute', span: 15 };
    case '30m': return { type: 'minute', span: 30 };
    case '1h': return { type: 'hour', span: 1 };
    case '2h': return { type: 'hour', span: 2 };
    case '4h': return { type: 'hour', span: 4 };
    case '1D': return { type: 'day', span: 1 };
    case '1W': return { type: 'week', span: 1 };
    case '1M': return { type: 'month', span: 1 };
    default: return { type: 'day', span: 1 };
  }
}

export const ChartPane: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<Nullable<Chart>>(null);

  // References to avoid stale closures in listeners and data loaders
  const kLineDataRef = useRef<KLineData[]>([]);
  const selectedInstrumentRef = useRef(useAppStore.getState().selectedInstrument);
  const timeframeRef = useRef(useAppStore.getState().timeframe);

  const {
    selectedInstrument,
    timeframe,
    chartType,
    candles,
    isLoadingCandles,
    candleError,
    isTokenSet,
    openAuthModal,
    activeIndicators,
    activeDrawingTool,
    setActiveDrawingTool,
    isMagnetActive,
    isDrawingsLocked,
    isDrawingsHidden,
    clearDrawingsTrigger,
    lastClose,
    priceChange,
    priceChangePct,
    sessionHigh,
    sessionLow,
    sessionVolume,
    // Strategy & Overlay
    activeStrategyId,
    backtestResult,
    runStrategyBacktest,
    openStrategiesModal,
    showStrategyOverlay,
    toggleStrategyOverlay,
    jumpToTimestamp,
    signalNotification,
    dismissSignalNotification,
    setBottomPanelTab,
  } = useAppStore();

  const [hoveredData, setHoveredData] = useState<KLineData | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Keep refs synced
  selectedInstrumentRef.current = selectedInstrument;
  timeframeRef.current = timeframe;

  // Convert raw candles according to chartType (e.g. Heikin Ashi)
  const processedCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    // Strict deduplication and ascending chronological sort
    const candleMap = new Map<number, Candle>();
    for (const c of candles) {
      if (typeof c.time === 'number' && !isNaN(c.time)) {
        candleMap.set(c.time, c);
      }
    }
    const sorted = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
    if (chartType === 'heikinAshi') {
      return computeHeikinAshi(sorted);
    }
    return sorted;
  }, [candles, chartType]);

  // Convert Candle[] to KLineData[], strictly sorted ascending
  const kLineDataList = useMemo<KLineData[]>(() => {
    const list = processedCandles.map((c) => ({
      timestamp: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      turnover: c.close * c.volume,
    }));
    return list.sort((a, b) => a.timestamp - b.timestamp);
  }, [processedCandles]);

  kLineDataRef.current = kLineDataList;

  // 1. Initialize KLineChart instance & register custom overlay indicators
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Register custom SMA, EMA and Overlaid VOL indicators
    registerCustomIndicators();

    const chart = init(chartContainerRef.current, {
      styles: TERMINAL_NIGHT_THEME,
      timezone: 'Asia/Kolkata',
      locale: 'en-US',
    });

    if (!chart) return;
    chartInstanceRef.current = chart;

    // Set initial symbol & period
    chart.setPeriod(getKLinePeriod(timeframeRef.current));
    chart.setSymbol({
      ticker: selectedInstrumentRef.current.symbol,
      pricePrecision: selectedInstrumentRef.current.tickSize < 0.05 ? 3 : 2,
      volumePrecision: 0,
    });

    // Crosshair hover listener for the top IST price legend
    chart.subscribeAction('onCrosshairChange', (data: any) => {
      if (data && data.kLineData) {
        setHoveredData(data.kLineData);
      } else {
        setHoveredData(null);
      }
    });

    // Configure DataLoader once for initial load and backward historical pagination
    chart.setDataLoader({
      getBars: async ({ type, timestamp, callback }) => {
        if (type === 'init' || type === 'update') {
          callback(kLineDataRef.current, {
            forward: kLineDataRef.current.length > 50,
            backward: false,
          });
          return;
        }

        // 'forward' in KLineChart v10 = user scrolled left into older historical bars
        if (type === 'forward' && timestamp) {
          setIsLoadingMore(true);
          try {
            const currentKey = selectedInstrumentRef.current.key;
            const currentTf = timeframeRef.current;
            const oldestDate = new Date(timestamp);
            const toDateStr = oldestDate.toISOString().slice(0, 10);
            const fromDateObj = new Date(oldestDate);

            if (currentTf === '1D') {
              fromDateObj.setFullYear(oldestDate.getFullYear() - 3);
            } else if (currentTf === '1W' || currentTf === '1M') {
              fromDateObj.setFullYear(oldestDate.getFullYear() - 5);
            } else {
              fromDateObj.setDate(oldestDate.getDate() - 30);
            }
            const fromDateStr = fromDateObj.toISOString().slice(0, 10);

            const res = await fetch(
              `/api/candles?key=${encodeURIComponent(currentKey)}&tf=${currentTf}&from=${fromDateStr}&to=${toDateStr}`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.ok && Array.isArray(data.candles)) {
                const map = new Map<number, Candle>();
                for (const c of data.candles) {
                  // Must be strictly older than the current oldest bar to prevent overlapping/duplicates
                  if (typeof c.time === 'number' && c.time < timestamp) {
                    map.set(c.time, c);
                  }
                }
                const olderBars: KLineData[] = Array.from(map.values())
                  .sort((a, b) => a.time - b.time)
                  .map((c: Candle) => ({
                    timestamp: c.time,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                    volume: c.volume,
                    turnover: c.close * c.volume,
                  }));
                callback(olderBars, { forward: olderBars.length > 20, backward: false });
              } else {
                callback([], { forward: false, backward: false });
              }
            } else {
              callback([], { forward: false, backward: false });
            }
          } catch {
            callback([], { forward: false, backward: false });
          } finally {
            setIsLoadingMore(false);
          }
        }
      },
    });

    // Populate data if already available on initial mount
    if (kLineDataRef.current.length > 0) {
      const store = (chart as any).getChartStore?.();
      if (store) {
        store._addData(kLineDataRef.current, 'init', {
          forward: kLineDataRef.current.length > 50,
          backward: false,
        });
        chart.resize();
        chart.scrollToRealTime();
      }
    }

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartInstanceRef.current && chartContainerRef.current) {
        dispose(chartContainerRef.current);
        chartInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Feed updated candles when symbol, timeframe, or candles change
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;

    chart.setPeriod(getKLinePeriod(timeframe));
    chart.setSymbol({
      ticker: selectedInstrument.symbol,
      pricePrecision: selectedInstrument.tickSize < 0.05 ? 3 : 2,
      volumePrecision: 0,
    });

    const store = (chart as any).getChartStore?.();
    if (store && kLineDataList.length > 0) {
      store._addData(kLineDataList, 'init', {
        forward: kLineDataList.length > 50,
        backward: false,
      });
      chart.resize();
      chart.scrollToRealTime();
    } else if (store) {
      chart.resetData();
    }
  }, [kLineDataList, selectedInstrument.key, selectedInstrument.symbol, timeframe]);

  // 3. Update Chart Type (Candles, Hollow, OHLC, Area, Line)
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;

    if (chartType === 'candles' || chartType === 'heikinAshi') {
      chart.setStyles({
        candle: {
          type: 'candle_solid',
        },
      });
    } else if (chartType === 'hollow') {
      chart.setStyles({
        candle: {
          type: 'candle_stroke',
        },
      });
    } else if (chartType === 'bars') {
      chart.setStyles({
        candle: {
          type: 'ohlc',
        },
      });
    } else if (chartType === 'area') {
      chart.setStyles({
        candle: {
          type: 'area',
          area: {
            lineColor: '#F0B90B',
            backgroundColor: [
              { offset: 0, color: 'rgba(240, 185, 11, 0.28)' },
              { offset: 1, color: 'rgba(240, 185, 11, 0.01)' },
            ],
          },
        },
      });
    } else if (chartType === 'line') {
      chart.setStyles({
        candle: {
          type: 'area',
          area: {
            lineColor: '#F0B90B',
            backgroundColor: [
              { offset: 0, color: 'transparent' },
              { offset: 1, color: 'transparent' },
            ],
          },
        },
      });
    }
  }, [chartType]);

  // 4. Manage Indicators: ALWAYS PLACED DIRECTLY OVER THE CANDLES (paneId: 'candle_pane')
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;

    // Reset previous indicators
    const currentIndicators = chart.getIndicators();
    for (const ind of currentIndicators) {
      chart.removeIndicator({ name: ind.name });
    }

    // Apply active indicators directly OVER the candle pane
    for (const ind of activeIndicators) {
      try {
        chart.createIndicator(
          {
            name: ind.name,
            paneId: 'candle_pane', // Direct overlay over candlestick prices
            calcParams: ind.params,
          },
          true // Stack directly over price action
        );
      } catch (err) {
        console.warn(`Failed to add indicator ${ind.name}:`, err);
      }
    }

    // Apply Strategy Signals & Trade Overlays
    if (showStrategyOverlay) {
      try {
        chart.createIndicator(
          {
            name: 'STRATEGY_OVERLAY',
            paneId: 'candle_pane',
          },
          true
        );
      } catch (err) {
        console.warn('Failed to add STRATEGY_OVERLAY:', err);
      }
    }

    chart.resize();
  }, [activeIndicators, showStrategyOverlay, backtestResult]);

  // Jump to Candle Timestamp smoothly (e.g. from Signals or Trades ledger)
  useEffect(() => {
    if (!jumpToTimestamp || !chartInstanceRef.current) return;
    try {
      chartInstanceRef.current.scrollToTimestamp(jumpToTimestamp, 300);
    } catch {}
  }, [jumpToTimestamp]);

  // 5. Real-Time 1-Second Live Quote Polling from Upstox (Direct App call, zero Google AI API)
  useEffect(() => {
    let isMounted = true;

    const pollLiveQuote = async () => {
      if (!isMounted) return;
      const currentKey = selectedInstrumentRef.current.key;

      try {
        const res = await fetch(`/api/quote?key=${encodeURIComponent(currentKey)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.ok || !data.quote || !isMounted) return;
        const q = data.quote;

        // Update Zustand store metrics for TopBar and Watchlist
        useAppStore.setState((state) => ({
          lastClose: q.lastPrice,
          priceChange: q.change,
          priceChangePct: q.changePct,
          sessionHigh: state.sessionHigh ? Math.max(state.sessionHigh, q.high, q.lastPrice) : q.high,
          sessionLow: state.sessionLow ? Math.min(state.sessionLow, q.low, q.lastPrice) : q.low,
          sessionVolume: q.volume > 0 ? q.volume : state.sessionVolume,
          liveQuote: q,
          watchlist: state.watchlist.map((w) =>
            w.key === currentKey
              ? { ...w, lastPrice: q.lastPrice, change: q.change, changePct: q.changePct }
              : w
          ),
        }));

        // Real-time canvas bar update on chart
        const chart = chartInstanceRef.current;
        if (!chart) return;

        const store = (chart as any).getChartStore?.();
        if (!store) return;

        const dataList: KLineData[] = store.getDataList?.() || [];
        if (dataList.length === 0) return;

        const lastIndex = dataList.length - 1;
        const lastBar = dataList[lastIndex];

        // Update latest bar with live tick
        const updatedBar: KLineData = {
          timestamp: lastBar.timestamp,
          open: lastBar.open,
          high: Math.max(lastBar.high, q.high, q.lastPrice),
          low: Math.min(lastBar.low, q.low, q.lastPrice),
          close: q.lastPrice,
          volume: q.volume > 0 ? q.volume : lastBar.volume,
          turnover: q.lastPrice * (q.volume > 0 ? q.volume : (lastBar.volume || 1)),
        };

        store._addData(updatedBar, 'update');
      } catch {
        // quiet network poll failure
      }
    };

    // Immediate first tick, then interval every 1 second
    pollLiveQuote();
    const intervalTimer = setInterval(pollLiveQuote, 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalTimer);
    };
  }, [selectedInstrument.key, timeframe]);

  // 6. Handle Drawing Tools Activation
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart || !activeDrawingTool) return;

    const overlayName = DRAWING_OVERLAY_MAP[activeDrawingTool];
    if (overlayName) {
      chart.createOverlay(overlayName);
      setActiveDrawingTool(null);
    }
  }, [activeDrawingTool]);

  // 7. Handle Magnet, Lock, Hide, Clear
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;
    chart.overrideOverlay({ mode: isMagnetActive ? 'weak_magnet' : 'normal' });
  }, [isMagnetActive]);

  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;
    chart.overrideOverlay({ lock: isDrawingsLocked });
  }, [isDrawingsLocked]);

  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;
    chart.overrideOverlay({ visible: !isDrawingsHidden });
  }, [isDrawingsHidden]);

  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart || clearDrawingsTrigger === 0) return;
    chart.removeOverlay();
    try {
      const storageKey = `trading_studio_drawings_${selectedInstrument.symbol}_${timeframe}`;
      localStorage.removeItem(storageKey);
    } catch {}
  }, [clearDrawingsTrigger]);

  // 8. Load and save drawings in localStorage per symbol + timeframe
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;

    const storageKey = `trading_studio_drawings_${selectedInstrument.symbol}_${timeframe}`;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const overlays = JSON.parse(saved);
        if (Array.isArray(overlays)) {
          for (const ov of overlays) {
            chart.createOverlay(ov);
          }
        }
      }
    } catch {}

    const saveDrawings = () => {
      try {
        const currentOverlays = chart.getOverlays();
        if (currentOverlays && currentOverlays.length > 0) {
          const serializable = currentOverlays.map((o) => ({
            name: o.name,
            points: o.points,
            mode: o.mode,
            lock: o.lock,
          }));
          localStorage.setItem(storageKey, JSON.stringify(serializable));
        }
      } catch {}
    };

    window.addEventListener('beforeunload', saveDrawings);
    return () => {
      saveDrawings();
      window.removeEventListener('beforeunload', saveDrawings);
    };
  }, [selectedInstrument.symbol, timeframe]);

  // Determine active display data (hovered candle or latest candle)
  const latestCandle = candles.length > 0 ? candles[candles.length - 1] : null;
  const displayOpen = hoveredData?.open ?? latestCandle?.open;
  const displayHigh = hoveredData?.high ?? latestCandle?.high ?? sessionHigh;
  const displayLow = hoveredData?.low ?? latestCandle?.low ?? sessionLow;
  const displayClose = hoveredData?.close ?? latestCandle?.close ?? lastClose;
  const displayVolume = hoveredData?.volume ?? latestCandle?.volume ?? sessionVolume;
  const displayTime = hoveredData?.timestamp ?? latestCandle?.time;

  const displayChange =
    displayOpen && displayClose ? displayClose - displayOpen : priceChange;
  const displayChangePct =
    displayOpen && displayOpen > 0 && displayChange !== null
      ? (displayChange / displayOpen) * 100
      : priceChangePct;
  const isDisplayPositive = (displayChange ?? 0) >= 0;

  return (
    <div className="flex-1 bg-[#0B0E11] relative overflow-hidden flex flex-col select-none h-full min-h-0 min-w-0">
      {/* Top Crosshair Legend in IST */}
      <div className="h-8 border-b border-[#1F2630]/60 bg-[#0B0E11]/90 backdrop-blur-sm px-3 flex items-center justify-between text-xs font-mono z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#E6EDF3] tracking-wide flex items-center gap-1.5">
            <span>{selectedInstrument.symbol}</span>
            <span className="text-[#8B949E] font-normal">·</span>
            <span className="text-[#F0B90B] font-semibold">{timeframe}</span>
            <span className="text-[#8B949E] font-normal">·</span>
            <span className="text-[10px] text-[#8B949E] px-1 bg-[#181D25] rounded">
              {selectedInstrument.exchange}
            </span>
          </span>

          <div className="hidden sm:flex items-center gap-2.5 text-[11px] text-[#8B949E]">
            <span>
              O <span className="text-[#E6EDF3]">{displayOpen ? formatINR(displayOpen, false) : '-'}</span>
            </span>
            <span>
              H <span className="text-[#E6EDF3]">{displayHigh ? formatINR(displayHigh, false) : '-'}</span>
            </span>
            <span>
              L <span className="text-[#E6EDF3]">{displayLow ? formatINR(displayLow, false) : '-'}</span>
            </span>
            <span>
              C{' '}
              <span className={isDisplayPositive ? 'text-[#26A69A]' : 'text-[#EF5350]'}>
                {displayClose ? formatINR(displayClose, false) : '-'}
              </span>
            </span>
            <span className={isDisplayPositive ? 'text-[#26A69A]' : 'text-[#EF5350]'}>
              {formatPct(displayChangePct)}
            </span>
            <span>
              Vol <span className="text-[#E6EDF3]">{formatVolume(displayVolume)}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#8B949E]">
          {/* Strategy & Overlay Controls */}
          <div className="flex items-center bg-[#181D25] border border-[#1F2630] rounded p-0.5">
            <button
              onClick={toggleStrategyOverlay}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                showStrategyOverlay
                  ? 'bg-[#132B25] text-[#26A69A] font-semibold border border-[#26A69A]/30'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
              title={showStrategyOverlay ? 'Hide Strategy Signals on chart' : 'Show Strategy Signals on chart'}
            >
              {showStrategyOverlay ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span className="hidden md:inline">Signals</span>
              {backtestResult?.signals && (
                <span className="font-mono text-[9px] px-1 bg-[#0B0E11] rounded">
                  {backtestResult.signals.length}
                </span>
              )}
            </button>

            <button
              onClick={openStrategiesModal}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors cursor-pointer ml-0.5"
              title="Configure Strategy Parameters"
            >
              <SlidersHorizontal className="w-2.5 h-2.5 text-[#F0B90B]" />
              <span className="hidden lg:inline text-[10px] text-[#E6EDF3] max-w-[90px] truncate">
                {BUILT_IN_STRATEGIES[activeStrategyId]?.shortName || 'Strategy'}
              </span>
            </button>

            <button
              onClick={() => {
                setBottomPanelTab('strategy_tester');
                runStrategyBacktest();
              }}
              className="p-1 rounded text-[#8B949E] hover:text-[#F0B90B] hover:bg-[#12161C] transition-colors cursor-pointer"
              title="Re-run Strategy Backtest"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
            </button>
          </div>

          {isLoadingMore && (
            <span className="text-[#F0B90B] flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading older bars...
            </span>
          )}
          {displayTime && (
            <span className="hidden sm:inline">IST: {formatISTTime(displayTime, true)}</span>
          )}
        </div>
      </div>

      {/* Main Chart Canvas Container */}
      <div className="flex-1 w-full min-h-0 relative">
        <div
          ref={chartContainerRef}
          className="w-full h-full absolute inset-0 overflow-hidden"
        />

        {/* Floating Signal Notification Toast */}
        {signalNotification && (
          <div className="absolute top-3 right-3 z-30 max-w-sm bg-[#12161C]/95 border border-[#26A69A]/50 backdrop-blur-md rounded-lg p-2.5 shadow-2xl flex items-center justify-between gap-3 font-mono text-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-2">
              <Radio className="w-4 h-4 text-[#26A69A] animate-pulse shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[#26A69A] text-[11px] flex items-center gap-1.5">
                  <span>SIGNAL TRIGGERED</span>
                  <span className="px-1 py-0.2 bg-[#132B25] border border-[#26A69A]/30 rounded text-[9px]">
                    {signalNotification.symbol}
                  </span>
                </div>
                <div className="text-[10px] text-[#E6EDF3] mt-0.5 leading-snug">
                  {signalNotification.text}
                </div>
              </div>
            </div>
            <button
              onClick={dismissSignalNotification}
              className="text-[#8B949E] hover:text-[#E6EDF3] p-1 rounded hover:bg-[#181D25] transition-colors cursor-pointer shrink-0"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Floating loading overlay if initial data is pending */}
        {isLoadingCandles && candles.length === 0 && (
          <div className="absolute inset-0 bg-[#0B0E11]/60 backdrop-blur-xs flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-[#12161C] border border-[#1F2630] rounded-lg p-4 shadow-xl flex items-center gap-3 text-xs font-mono">
              <Loader2 className="w-4 h-4 text-[#F0B90B] animate-spin" />
              <span className="text-[#E6EDF3]">
                Loading {selectedInstrument.symbol} candles...
              </span>
            </div>
          </div>
        )}

        {candleError && candles.length === 0 && (
          <div className="absolute inset-0 bg-[#0B0E11]/80 backdrop-blur-xs flex items-center justify-center z-20 p-4">
            <div className="bg-[#181D25] border border-[#EF5350]/30 rounded-lg p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#EF5350] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm text-[#E6EDF3] mb-1">
                    Market Data Notice
                  </h3>
                  <p className="text-xs text-[#8B949E] mb-3 leading-relaxed">
                    {candleError}
                  </p>
                  {!isTokenSet && (
                    <button
                      onClick={openAuthModal}
                      className="w-full py-2 bg-[#F0B90B] hover:bg-[#d9a70a] text-[#0B0E11] font-bold rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Connect Upstox Account</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
