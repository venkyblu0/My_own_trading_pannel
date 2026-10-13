import React, { useState } from 'react';
import {
  BarChart2,
  SlidersHorizontal,
  Layers,
  Play,
  Save,
  SidebarClose,
  SidebarOpen,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Activity,
  KeyRound,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { SymbolSearch } from './SymbolSearch.tsx';
import { Timeframe, ChartType } from '../types/index.ts';
import { formatINR, formatPct, formatVolume } from '../lib/formatters.ts';

const EXCHANGES = ['NSE', 'BSE', 'NSE INDICES', 'MCX'];
const TIMEFRAMES: Timeframe[] = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '1D', '1W', '1M'];
const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: 'candles', label: 'Candles' },
  { id: 'hollow', label: 'Hollow Candles' },
  { id: 'heikinAshi', label: 'Heikin Ashi' },
  { id: 'bars', label: 'OHLC Bars' },
  { id: 'line', label: 'Line' },
  { id: 'area', label: 'Area' },
];

export const TopBar: React.FC = () => {
  const {
    exchange,
    setExchange,
    timeframe,
    setTimeframe,
    chartType,
    setChartType,
    lastClose,
    priceChange,
    priceChangePct,
    sessionHigh,
    sessionLow,
    sessionVolume,
    isWatchlistOpen,
    toggleWatchlist,
    isTokenSet,
    isLoadingCandles,
  } = useAppStore();

  const [isChartTypeDropdownOpen, setIsChartTypeDropdownOpen] = useState(false);
  const [isExchangeDropdownOpen, setIsExchangeDropdownOpen] = useState(false);

  const isPositive = (priceChange ?? 0) >= 0;

  return (
    <header className="h-12 bg-[#12161C] border-b border-[#1F2630] flex items-center justify-between px-3 shrink-0 select-none z-30">
      {/* Left section: App Brand, Exchange, Symbol Search, Metrics */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Brand */}
        <div className="flex items-center gap-2 pr-2 border-r border-[#1F2630]">
          <Activity className="w-5 h-5 text-[#F0B90B]" />
          <span className="font-semibold text-xs tracking-wider text-[#E6EDF3] uppercase hidden sm:inline">
            Trading Studio
          </span>
        </div>

        {/* Exchange Selector */}
        <div className="relative">
          <button
            onClick={() => setIsExchangeDropdownOpen(!isExchangeDropdownOpen)}
            className="flex items-center gap-1 px-2 py-1 bg-[#181D25] hover:bg-[#1F2630] border border-[#1F2630] rounded text-xs font-mono font-medium text-[#E6EDF3] transition-colors"
          >
            <span>{exchange}</span>
            <ChevronDown className="w-3 h-3 text-[#8B949E]" />
          </button>
          {isExchangeDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 w-32 bg-[#12161C] border border-[#1F2630] rounded shadow-xl py-1 z-50">
              {EXCHANGES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    setExchange(ex);
                    setIsExchangeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-[#181D25] ${
                    exchange === ex ? 'text-[#F0B90B] font-semibold' : 'text-[#E6EDF3]'
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Symbol Search Component */}
        <SymbolSearch />

        {/* Live Close & Change Metrics (Top Bar display as required in Phase 1) */}
        <div className="hidden lg:flex items-center gap-4 pl-3 border-l border-[#1F2630]">
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-sm font-bold text-[#E6EDF3]">
              {formatINR(lastClose)}
            </span>
            <span
              className={`text-xs font-medium flex items-center ${
                isPositive ? 'text-[#26A69A]' : 'text-[#EF5350]'
              }`}
            >
              {isPositive ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
              {priceChange !== null ? (isPositive ? `+${priceChange.toFixed(2)}` : priceChange.toFixed(2)) : '-'}
              <span className="ml-1">({formatPct(priceChangePct)})</span>
            </span>
          </div>

          {/* Quick High / Low / Volume */}
          <div className="flex items-center gap-3 text-[11px] font-mono text-[#8B949E]">
            <span>H: <span className="text-[#E6EDF3]">{formatINR(sessionHigh, false)}</span></span>
            <span>L: <span className="text-[#E6EDF3]">{formatINR(sessionLow, false)}</span></span>
            <span>Vol: <span className="text-[#E6EDF3]">{formatVolume(sessionVolume)}</span></span>
          </div>
        </div>
      </div>

      {/* Center/Right section: Timeframes, Chart Types, Indicators, Layout */}
      <div className="flex items-center gap-2">
        {/* Timeframe selector */}
        <div className="hidden md:flex items-center bg-[#181D25] p-0.5 rounded border border-[#1F2630]">
          {TIMEFRAMES.map((tf) => {
            const isSelected = timeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                  isSelected
                    ? 'bg-[#F0B90B] text-[#0B0E11] font-semibold shadow-sm'
                    : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#1F2630]'
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>

        {/* Chart type dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsChartTypeDropdownOpen(!isChartTypeDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#181D25] hover:bg-[#1F2630] border border-[#1F2630] rounded text-xs text-[#E6EDF3] transition-colors"
            title="Chart Type"
          >
            <BarChart2 className="w-3.5 h-3.5 text-[#8B949E]" />
            <span className="hidden sm:inline capitalize">
              {CHART_TYPES.find((c) => c.id === chartType)?.label || chartType}
            </span>
            <ChevronDown className="w-3 h-3 text-[#8B949E]" />
          </button>
          {isChartTypeDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-[#12161C] border border-[#1F2630] rounded shadow-xl py-1 z-50">
              {CHART_TYPES.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => {
                    setChartType(ct.id);
                    setIsChartTypeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#181D25] ${
                    chartType === ct.id ? 'text-[#F0B90B] font-semibold' : 'text-[#E6EDF3]'
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Indicators Shell */}
        <button
          className="flex items-center gap-1 px-2.5 py-1 bg-[#181D25] hover:bg-[#1F2630] border border-[#1F2630] rounded text-xs text-[#E6EDF3] transition-colors"
          title="Indicators (SMA, EMA, RSI, MACD...)"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#8B949E]" />
          <span className="hidden sm:inline">Indicators</span>
        </button>

        {/* Strategies Shell */}
        <button
          className="flex items-center gap-1 px-2.5 py-1 bg-[#181D25] hover:bg-[#1F2630] border border-[#1F2630] rounded text-xs text-[#E6EDF3] transition-colors"
          title="Strategies (SMA44 Pullback...)"
        >
          <Layers className="w-3.5 h-3.5 text-[#8B949E]" />
          <span className="hidden sm:inline">Strategies</span>
        </button>

        {/* Replay/Backtest button Shell */}
        <button
          className="flex items-center gap-1 px-2.5 py-1 bg-[#181D25] hover:bg-[#1F2630] border border-[#1F2630] rounded text-xs text-[#E6EDF3] transition-colors"
          title="Backtest Strategy"
        >
          <Play className="w-3.5 h-3.5 text-[#8B949E]" />
          <span className="hidden lg:inline">Backtest</span>
        </button>

        {/* Layout Save/Load Shell */}
        <button
          className="p-1.5 bg-[#181D25] hover:bg-[#1F2630] border border-[#1F2630] rounded text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
          title="Save Layout"
        >
          <Save className="w-3.5 h-3.5" />
        </button>

        {/* Upstox Token Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono border ${
            isTokenSet
              ? 'bg-[#132B25] text-[#26A69A] border-[#26A69A]/30'
              : 'bg-[#2E1A17] text-[#F0B90B] border-[#F0B90B]/30'
          }`}
          title={isTokenSet ? 'Upstox Token Active' : 'UPSTOX_TOKEN Secret not set in Settings -> Secrets'}
        >
          <KeyRound className="w-3 h-3" />
          <span className="hidden xl:inline">{isTokenSet ? 'Token Active' : 'Token Missing'}</span>
        </div>

        {/* Watchlist Toggle */}
        <button
          onClick={toggleWatchlist}
          className={`p-1.5 rounded border transition-colors ${
            isWatchlistOpen
              ? 'bg-[#F0B90B]/10 border-[#F0B90B]/40 text-[#F0B90B]'
              : 'bg-[#181D25] border-[#1F2630] text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
          title={isWatchlistOpen ? 'Hide Watchlist' : 'Show Watchlist'}
        >
          {isWatchlistOpen ? <SidebarClose className="w-4 h-4" /> : <SidebarOpen className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
