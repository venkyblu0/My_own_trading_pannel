import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.ts';
import { BUILT_IN_STRATEGIES } from '../../strategies/definitions.ts';
import { StrategyId } from '../../strategies/types.ts';
import { formatINR, formatPct, formatISTTime, formatRatio } from '../../lib/formatters.ts';
import {
  Play,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldAlert,
  Percent,
  SlidersHorizontal,
  FileSpreadsheet,
  Activity,
  BarChart3,
  Award,
  Zap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ListOrdered,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

type LeaderboardSortField =
  | 'rank'
  | 'symbol'
  | 'lastPrice'
  | 'netProfit'
  | 'netProfitPct'
  | 'winRatePct'
  | 'totalTrades'
  | 'profitFactor'
  | 'maxDrawdownPct';

export const StrategyTesterTab: React.FC = () => {
  const {
    activeStrategyId,
    setActiveStrategyId,
    strategyParams,
    updateStrategyParams,
    backtestResult,
    runStrategyBacktest,
    isBacktesting,
    backtestStatusMessage,
    backtestError,
    backtestPeriod,
    setBacktestPeriod,
    watchlistBacktestResults,
    isWatchlistBacktesting,
    runWatchlistBacktest,
    candles,
    selectedInstrument,
    setSelectedInstrument,
    timeframe,
    setBottomPanelTab,
    openStrategiesModal,
    fetchCandles,
  } = useAppStore();

  const [viewMode, setViewMode] = useState<'SINGLE' | 'LEADERBOARD'>('SINGLE');
  const [chartMode, setChartMode] = useState<'EQUITY' | 'DRAWDOWN'>('EQUITY');
  const [hoveredPoint, setHoveredPoint] = useState<{ time: number; equity: number; dd: number } | null>(null);
  const [showQuickConfig, setShowQuickConfig] = useState(false);
  const [leaderboardSortField, setLeaderboardSortField] = useState<LeaderboardSortField>('netProfit');
  const [leaderboardSortOrder, setLeaderboardSortOrder] = useState<'asc' | 'desc'>('desc');

  const currentStrategy = BUILT_IN_STRATEGIES[activeStrategyId] || BUILT_IN_STRATEGIES['sma44_pullback'];

  // Auto-run initial backtest when candles arrive
  React.useEffect(() => {
    if (!backtestResult && candles.length >= 15 && !isBacktesting) {
      runStrategyBacktest();
    }
  }, [candles.length, activeStrategyId]);

  const isNetProfit = (backtestResult?.netProfit ?? 0) >= 0;

  const handleLeaderboardSort = (field: LeaderboardSortField) => {
    if (leaderboardSortField === field) {
      setLeaderboardSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setLeaderboardSortField(field);
      if (field === 'symbol' || field === 'rank') {
        setLeaderboardSortOrder('asc');
      } else {
        setLeaderboardSortOrder('desc');
      }
    }
  };

  const sortedLeaderboard = React.useMemo(() => {
    return [...watchlistBacktestResults].sort((a, b) => {
      let valA: any = a[leaderboardSortField as keyof typeof a];
      let valB: any = b[leaderboardSortField as keyof typeof b];

      if (typeof valA === 'string') {
        return leaderboardSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return leaderboardSortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [watchlistBacktestResults, leaderboardSortField, leaderboardSortOrder]);

  const renderLeaderboardSortIcon = (field: LeaderboardSortField) => {
    if (leaderboardSortField !== field) {
      return <ArrowUpDown className="w-2.5 h-2.5 text-[#8B949E]/40 group-hover:text-[#8B949E] transition-colors" />;
    }
    return leaderboardSortOrder === 'asc' ? (
      <ArrowUp className="w-2.5 h-2.5 text-[#F0B90B]" />
    ) : (
      <ArrowDown className="w-2.5 h-2.5 text-[#F0B90B]" />
    );
  };

  return (
    <div className="h-full flex flex-col p-3 overflow-y-auto font-mono text-xs select-none">
      {/* Top Strategy & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1F2630]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#F0B90B]" />
          <span className="font-semibold text-sm text-[#E6EDF3]">
            {currentStrategy.name}
          </span>
          <span className="text-[10px] text-[#8B949E] px-1.5 py-0.5 bg-[#181D25] rounded border border-[#1F2630]">
            {selectedInstrument.symbol} · {timeframe}
          </span>
          {backtestResult && (
            <span className="text-[10px] text-[#8B949E]">
              ({backtestResult.executionTimeMs}ms simulation · {candles.length} bars)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle (Single Stock vs Watchlist Leaderboard) */}
          <div className="flex items-center bg-[#181D25] p-0.5 rounded border border-[#1F2630] text-[11px]">
            <button
              onClick={() => setViewMode('SINGLE')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'SINGLE'
                  ? 'bg-[#26A69A] text-[#0B0E11] font-bold'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Single Symbol</span>
            </button>
            <button
              onClick={() => {
                setViewMode('LEADERBOARD');
                if (watchlistBacktestResults.length === 0) {
                  runWatchlistBacktest();
                }
              }}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'LEADERBOARD'
                  ? 'bg-[#F0B90B] text-[#0B0E11] font-bold'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              <ListOrdered className="w-3 h-3" />
              <span>Watchlist Ranking</span>
            </button>
          </div>

          {/* Strategy Selector Dropdown */}
          <select
            value={activeStrategyId}
            onChange={(e) => setActiveStrategyId(e.target.value as StrategyId)}
            className="bg-[#181D25] border border-[#1F2630] rounded px-2 py-1 text-xs text-[#E6EDF3] focus:border-[#F0B90B] focus:outline-none cursor-pointer"
          >
            {Object.values(BUILT_IN_STRATEGIES).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Backtest Period Selector */}
          <div className="flex items-center bg-[#181D25] p-0.5 rounded border border-[#1F2630] text-[10px]">
            {(['ALL', '1Y', '6M', '3M', '1M'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setBacktestPeriod(p)}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  backtestPeriod === p
                    ? 'bg-[#F0B90B] text-[#0B0E11] font-bold'
                    : 'text-[#8B949E] hover:text-[#E6EDF3]'
                }`}
                title={`Backtest range: ${p === 'ALL' ? 'All historical bars' : `Last ${p}`}`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Quick Parameters Toggle */}
          <button
            onClick={() => setShowQuickConfig(!showQuickConfig)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer border ${
              showQuickConfig
                ? 'bg-[#F0B90B] text-[#0B0E11] border-[#F0B90B] font-bold'
                : 'bg-[#181D25] hover:bg-[#1F2630] text-[#E6EDF3] border-[#1F2630]'
            }`}
            title="Toggle quick parameters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Parameters</span>
          </button>

          {/* Run Backtest Main Button */}
          <button
            onClick={() => runStrategyBacktest()}
            disabled={isBacktesting}
            className={`flex items-center gap-1.5 px-3 py-1 font-bold rounded text-xs transition-all cursor-pointer shadow-sm ${
              isBacktesting
                ? 'bg-[#F0B90B]/50 text-[#0B0E11] cursor-wait'
                : 'bg-[#F0B90B] hover:bg-[#d9a70a] text-[#0B0E11] active:scale-95'
            }`}
            title="Execute algorithmic simulation"
          >
            {isBacktesting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Run Backtest</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Parameter Inline Bar */}
      {showQuickConfig && (
        <div className="bg-[#151A22] border border-[#1F2630] rounded p-2.5 mt-2 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-1">
          {/* Starting Capital quick input */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#8B949E]">Capital (₹):</span>
            <input
              type="number"
              value={strategyParams['capital'] ?? 100000}
              step={10000}
              min={10000}
              onChange={(e) => {
                const val = Number(e.target.value);
                updateStrategyParams({ ...strategyParams, capital: val });
              }}
              className="w-24 bg-[#181D25] border border-[#1F2630] rounded px-2 py-0.5 text-xs text-[#E6EDF3] font-mono focus:border-[#F0B90B] focus:outline-none"
            />
          </div>

          {/* Strategy Specific Param Defs */}
          {currentStrategy.paramDefs.slice(0, 4).map((p) => (
            <div key={p.key} className="flex items-center gap-2">
              <span className="text-[11px] text-[#8B949E]">{p.label}:</span>
              {p.type === 'select' ? (
                <select
                  value={strategyParams[p.key] ?? p.default}
                  onChange={(e) => updateStrategyParams({ ...strategyParams, [p.key]: e.target.value })}
                  className="bg-[#181D25] border border-[#1F2630] rounded px-2 py-0.5 text-xs text-[#E6EDF3] font-mono focus:border-[#F0B90B] focus:outline-none cursor-pointer"
                >
                  {p.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={strategyParams[p.key] ?? p.default}
                  min={p.min}
                  max={p.max}
                  step={p.step || 1}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateStrategyParams({ ...strategyParams, [p.key]: val });
                  }}
                  className="w-18 bg-[#181D25] border border-[#1F2630] rounded px-2 py-0.5 text-xs text-[#E6EDF3] font-mono focus:border-[#F0B90B] focus:outline-none"
                />
              )}
            </div>
          ))}

          <button
            onClick={openStrategiesModal}
            className="text-[10px] text-[#F0B90B] hover:underline ml-auto cursor-pointer flex items-center gap-1"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Full Strategy Rules...</span>
          </button>
        </div>
      )}

      {/* Feedback & Status Message Banner */}
      {backtestError && (
        <div className="bg-[#311A1B] border border-[#EF5350]/40 text-[#EF5350] rounded p-2 mt-2 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#EF5350]" />
            <span>{backtestError}</span>
          </div>
          <button
            onClick={() => fetchCandles()}
            className="px-2 py-0.5 bg-[#EF5350]/20 hover:bg-[#EF5350]/30 rounded text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Reload Candle Data
          </button>
        </div>
      )}

      {backtestStatusMessage && !backtestError && (
        <div className="bg-[#132B25] border border-[#26A69A]/40 text-[#26A69A] rounded px-3 py-1.5 mt-2 flex items-center justify-between text-[11px] animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#26A69A]" />
            <span>{backtestStatusMessage}</span>
          </div>
          <span className="text-[10px] text-[#8B949E]">
            {backtestResult?.trades.length ?? 0} trades executed
          </span>
        </div>
      )}

      {/* VIEW MODE 1: Watchlist Leaderboard (Compare All Indian Stocks) */}
      {viewMode === 'LEADERBOARD' && (
        <div className="flex-1 flex flex-col gap-3 pt-3 min-h-0">
          <div className="flex items-center justify-between bg-[#12161C] border border-[#1F2630] rounded p-2.5">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#F0B90B]" />
              <span className="text-xs font-semibold text-[#E6EDF3]">
                {currentStrategy.name} · Watchlist Comparative Performance
              </span>
              <span className="text-[10px] text-[#8B949E]">
                (Simulated on {timeframe} timeframe)
              </span>
            </div>
            <button
              onClick={runWatchlistBacktest}
              disabled={isWatchlistBacktesting}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#181D25] hover:bg-[#1F2630] border border-[#1F2630] rounded text-xs text-[#E6EDF3] transition-colors cursor-pointer"
            >
              {isWatchlistBacktesting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-[#F0B90B]" />
                  <span>Scanning Stocks...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 text-[#F0B90B]" />
                  <span>Re-rank All</span>
                </>
              )}
            </button>
          </div>

          <div className="flex-1 bg-[#12161C] border border-[#1F2630] rounded overflow-hidden flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#181D25] text-[#8B949E] text-[10px] uppercase border-b border-[#1F2630] tracking-wider z-10 select-none">
                  <tr>
                    <th
                      onClick={() => handleLeaderboardSort('rank')}
                      className="p-2.5 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Rank</span>
                        {renderLeaderboardSortIcon('rank')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleLeaderboardSort('symbol')}
                      className="p-2.5 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Symbol</span>
                        {renderLeaderboardSortIcon('symbol')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleLeaderboardSort('lastPrice')}
                      className="p-2.5 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>LTP (₹)</span>
                        {renderLeaderboardSortIcon('lastPrice')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleLeaderboardSort('netProfit')}
                      className="p-2.5 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Net Profit</span>
                        {renderLeaderboardSortIcon('netProfit')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleLeaderboardSort('netProfitPct')}
                      className="p-2.5 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Return (%)</span>
                        {renderLeaderboardSortIcon('netProfitPct')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleLeaderboardSort('winRatePct')}
                      className="p-2.5 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Win Rate</span>
                        {renderLeaderboardSortIcon('winRatePct')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleLeaderboardSort('totalTrades')}
                      className="p-2.5 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Trades</span>
                        {renderLeaderboardSortIcon('totalTrades')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleLeaderboardSort('profitFactor')}
                      className="p-2.5 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Profit Factor</span>
                        {renderLeaderboardSortIcon('profitFactor')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleLeaderboardSort('maxDrawdownPct')}
                      className="p-2.5 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Max Drawdown</span>
                        {renderLeaderboardSortIcon('maxDrawdownPct')}
                      </div>
                    </th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2630]/60 text-xs">
                  {sortedLeaderboard.length > 0 ? (
                    sortedLeaderboard.map((r, idx) => {
                      const isProfit = r.netProfit >= 0;
                      const isCurrent = selectedInstrument.symbol === r.symbol;
                      return (
                        <tr
                          key={r.symbol}
                          className={`hover:bg-[#181D25]/60 transition-colors ${
                            isCurrent ? 'bg-[#181D25] border-l-2 border-l-[#F0B90B]' : ''
                          }`}
                        >
                          <td className="p-2.5 font-bold text-[#8B949E]">
                            #{idx + 1}
                          </td>
                          <td className="p-2.5">
                            <span className="font-bold text-[#E6EDF3]">{r.symbol}</span>
                            <span className="block text-[10px] text-[#8B949E] truncate max-w-[140px]">
                              {r.name}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-[#E6EDF3]">
                            ₹{r.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`p-2.5 font-bold ${isProfit ? 'text-[#26A69A]' : 'text-[#EF5350]'}`}>
                            {formatINR(r.netProfit)}
                          </td>
                          <td className={`p-2.5 font-bold ${isProfit ? 'text-[#26A69A]' : 'text-[#EF5350]'}`}>
                            {formatPct(r.netProfitPct)}
                          </td>
                          <td className="p-2.5 text-[#E6EDF3]">
                            {r.winRatePct.toFixed(1)}%
                          </td>
                          <td className="p-2.5 text-[#8B949E]">
                            {r.totalTrades}
                          </td>
                          <td className="p-2.5 text-[#4FA3FF]">
                            {r.profitFactor >= 99 ? '∞' : r.profitFactor.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-[#EF5350]">
                            -{r.maxDrawdownPct.toFixed(1)}%
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => {
                                const fullItem = useAppStore.getState().watchlist.find((w) => w.symbol === r.symbol);
                                if (fullItem) {
                                  setSelectedInstrument({
                                    key: fullItem.key,
                                    symbol: fullItem.symbol,
                                    name: fullItem.name,
                                    exchange: fullItem.exchange,
                                    segment: 'NSE_EQ',
                                    type: 'EQUITY',
                                    tickSize: 0.05,
                                    lotSize: 1,
                                  });
                                }
                                setViewMode('SINGLE');
                              }}
                              className="px-2.5 py-1 bg-[#F0B90B] text-[#0B0E11] font-bold rounded text-[11px] hover:bg-[#d9a70a] transition-colors cursor-pointer"
                            >
                              Load Chart
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-[#8B949E]">
                        {isWatchlistBacktesting ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-[#F0B90B]" />
                            <span>Simulating {currentStrategy.name} across all Indian equities...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <span>No watchlist simulation results yet.</span>
                            <button
                              onClick={runWatchlistBacktest}
                              className="px-3 py-1 bg-[#F0B90B] text-[#0B0E11] font-bold rounded text-xs hover:bg-[#d9a70a] transition-colors cursor-pointer"
                            >
                              Run Watchlist Ranking
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Single Stock Detailed Backtest Result */}
      {viewMode === 'SINGLE' && (
        <>
          {backtestResult ? (
            <div className="flex-1 flex flex-col gap-3 pt-3 min-h-0">
              {/* Key Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                {/* Net Profit */}
                <div className="bg-[#12161C] border border-[#1F2630] rounded p-2 flex flex-col">
                  <span className="text-[9px] text-[#8B949E] uppercase tracking-wider">
                    Net Profit
                  </span>
                  <div
                    className={`text-xs sm:text-sm font-bold mt-0.5 flex items-center gap-1 ${
                      isNetProfit ? 'text-[#26A69A]' : 'text-[#EF5350]'
                    }`}
                  >
                    {isNetProfit ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{formatINR(backtestResult.netProfit)}</span>
                  </div>
                  <span className={`text-[10px] mt-0.5 ${isNetProfit ? 'text-[#26A69A]' : 'text-[#EF5350]'}`}>
                    {formatPct(backtestResult.netProfitPct)}
                    <span className="text-[#8B949E]"> · after {formatINR(backtestResult.totalCosts)} costs</span>
                  </span>
                </div>

                {/* Win Rate */}
                <div className="bg-[#12161C] border border-[#1F2630] rounded p-2 flex flex-col">
                  <span className="text-[9px] text-[#8B949E] uppercase tracking-wider">
                    Win Rate
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-[#E6EDF3] mt-0.5">
                    {backtestResult.winRatePct.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-[#8B949E] mt-0.5">
                    {backtestResult.winningTrades}W / {backtestResult.losingTrades}L
                  </span>
                </div>

                {/* Profit Factor */}
                <div className="bg-[#12161C] border border-[#1F2630] rounded p-2 flex flex-col">
                  <span className="text-[9px] text-[#8B949E] uppercase tracking-wider">
                    Profit Factor
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-[#4FA3FF] mt-0.5">
                    {backtestResult.profitFactor >= 99 ? '∞' : backtestResult.profitFactor.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-[#8B949E] mt-0.5">
                    Gains / Losses
                  </span>
                </div>

                {/* Max Drawdown */}
                <div className="bg-[#12161C] border border-[#1F2630] rounded p-2 flex flex-col">
                  <span className="text-[9px] text-[#8B949E] uppercase tracking-wider">
                    Max Drawdown
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-[#EF5350] mt-0.5">
                    -{backtestResult.maxDrawdownPct.toFixed(2)}%
                  </div>
                  <span className="text-[10px] text-[#8B949E] mt-0.5">
                    -{formatINR(backtestResult.maxDrawdownINR)}
                  </span>
                </div>

                {/* Total Trades */}
                <div className="bg-[#12161C] border border-[#1F2630] rounded p-2 flex flex-col">
                  <span className="text-[9px] text-[#8B949E] uppercase tracking-wider">
                    Trades Count
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-[#E6EDF3] mt-0.5">
                    {backtestResult.totalTrades}
                  </div>
                  <span className="text-[10px] text-[#8B949E] mt-0.5">
                    Avg: {formatPct(backtestResult.avgTradePnlPct)} / trade
                  </span>
                </div>

                {/* Expectancy */}
                <div className="bg-[#12161C] border border-[#1F2630] rounded p-2 flex flex-col">
                  <span className="text-[9px] text-[#8B949E] uppercase tracking-wider">
                    Expectancy
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-[#F0B90B] mt-0.5">
                    {formatINR(backtestResult.expectancy ?? 0)}
                  </div>
                  <span className="text-[10px] text-[#8B949E] mt-0.5">
                    Per trade average
                  </span>
                </div>

                {/* Average R-multiple */}
                <div className="bg-[#12161C] border border-[#1F2630] rounded p-2 flex flex-col">
                  <span className="text-[9px] text-[#8B949E] uppercase tracking-wider">
                    Avg R
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-[#F0B90B] mt-0.5">
                    {backtestResult.avgR === null
                      ? '-'
                      : `${backtestResult.avgR >= 0 ? '+' : ''}${backtestResult.avgR.toFixed(2)}R`}
                  </div>
                  <span className="text-[10px] text-[#8B949E] mt-0.5">
                    Exit: {backtestResult.exitMode}
                  </span>
                </div>

                {/* Sharpe Ratio */}
                <div className="bg-[#12161C] border border-[#1F2630] rounded p-2 flex flex-col">
                  <span className="text-[9px] text-[#8B949E] uppercase tracking-wider">
                    Sharpe Ratio
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-[#4FA3FF] mt-0.5">
                    {formatRatio(backtestResult.sharpeRatio)}
                  </div>
                  <span className="text-[10px] text-[#8B949E] mt-0.5">
                    Annualized risk adj
                  </span>
                </div>

                {/* Final Capital */}
                <div className="bg-[#12161C] border border-[#1F2630] rounded p-2 flex flex-col">
                  <span className="text-[9px] text-[#8B949E] uppercase tracking-wider">
                    Ending Equity
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-[#F0B90B] mt-0.5">
                    {formatINR(backtestResult.finalCapital)}
                  </div>
                  <span className="text-[10px] text-[#8B949E] mt-0.5">
                    Initial: ₹{backtestResult.initialCapital.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Equity Curve SVG Visualizer */}
              <div className="flex-1 bg-[#12161C] border border-[#1F2630] rounded p-3 flex flex-col min-h-[140px]">
                <div className="flex flex-wrap items-center justify-between pb-2 border-b border-[#1F2630]/60 mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#E6EDF3]">
                      {chartMode === 'EQUITY' ? 'Performance Equity Curve' : 'Underwater Drawdown Curve'}
                    </span>
                    <span className="text-[10px] text-[#8B949E]">
                      ({backtestResult.trades.length} closed trades over {candles.length} bars)
                    </span>
                    {hoveredPoint && (
                      <span className="text-[10px] text-[#F0B90B] bg-[#181D25] px-2 py-0.5 rounded border border-[#1F2630]">
                        {formatISTTime(hoveredPoint.time, false)} · Equity: {formatINR(hoveredPoint.equity)} · DD: -{hoveredPoint.dd.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Mode Selector */}
                    <div className="flex items-center bg-[#181D25] p-0.5 rounded border border-[#1F2630] text-[10px]">
                      <button
                        onClick={() => setChartMode('EQUITY')}
                        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                          chartMode === 'EQUITY' ? 'bg-[#26A69A] text-[#0B0E11] font-bold' : 'text-[#8B949E] hover:text-[#E6EDF3]'
                        }`}
                      >
                        Equity (₹)
                      </button>
                      <button
                        onClick={() => setChartMode('DRAWDOWN')}
                        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                          chartMode === 'DRAWDOWN' ? 'bg-[#EF5350] text-[#FFFFFF] font-bold' : 'text-[#8B949E] hover:text-[#EF5350]'
                        }`}
                      >
                        Drawdown (%)
                      </button>
                    </div>

                    <button
                      onClick={() => setBottomPanelTab('signals')}
                      className="text-[10px] text-[#F0B90B] hover:underline flex items-center gap-1 cursor-pointer ml-1"
                    >
                      <span>Signals ({backtestResult.signals.length})</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setBottomPanelTab('trades')}
                      className="text-[10px] text-[#4FA3FF] hover:underline flex items-center gap-1 cursor-pointer ml-1"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      <span>Trades ({backtestResult.trades.length})</span>
                    </button>
                  </div>
                </div>

                {/* Responsive Equity Curve Sparkline */}
                <div className="flex-1 w-full min-h-0 relative">
                  {backtestResult.equityCurve.length > 1 ? (
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="equityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#26A69A" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#26A69A" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="ddGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#EF5350" stopOpacity="0.0" />
                          <stop offset="100%" stopColor="#EF5350" stopOpacity="0.35" />
                        </linearGradient>
                      </defs>

                      {chartMode === 'EQUITY' ? (
                        (() => {
                          const sortedCurve = [...backtestResult.equityCurve].sort((a, b) => a.time - b.time);
                          const equities = sortedCurve.map((e) => e.equity);
                          const minE = Math.min(...equities, backtestResult.initialCapital * 0.98);
                          const maxE = Math.max(...equities, backtestResult.initialCapital * 1.02);
                          const range = maxE - minE || 1;

                          const points = sortedCurve.map((pt, i) => {
                            const x = (i / (sortedCurve.length - 1)) * 100;
                            const y = 100 - ((pt.equity - minE) / range) * 90 - 5;
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          });

                          const baseLineY = 100 - ((backtestResult.initialCapital - minE) / range) * 90 - 5;

                          return (
                            <>
                              {/* Baseline at initial capital */}
                              <line
                                x1="0"
                                y1={baseLineY}
                                x2="100"
                                y2={baseLineY}
                                stroke="#8B949E"
                                strokeDasharray="2,2"
                                strokeWidth="0.5"
                              />

                              {/* Gradient Area under Equity curve */}
                              <polygon
                                points={`0,100 ${points.join(' ')} 100,100`}
                                fill="url(#equityGrad)"
                              />

                              {/* Equity Line */}
                              <polyline
                                fill="none"
                                stroke={isNetProfit ? '#26A69A' : '#EF5350'}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={points.join(' ')}
                              />
                            </>
                          );
                        })()
                      ) : (
                        (() => {
                          const sortedCurve = [...backtestResult.equityCurve].sort((a, b) => a.time - b.time);
                          const maxDd = Math.max(...sortedCurve.map((e) => e.drawdownPct), 5);
                          const points = sortedCurve.map((pt, i) => {
                            const x = (i / (sortedCurve.length - 1)) * 100;
                            const y = (pt.drawdownPct / maxDd) * 90 + 5;
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          });

                          return (
                            <>
                              <line
                                x1="0"
                                y1="5"
                                x2="100"
                                y2="5"
                                stroke="#8B949E"
                                strokeDasharray="2,2"
                                strokeWidth="0.5"
                              />
                              <polygon
                                points={`0,5 ${points.join(' ')} 100,5`}
                                fill="url(#ddGrad)"
                              />
                              <polyline
                                fill="none"
                                stroke="#EF5350"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={points.join(' ')}
                              />
                            </>
                          );
                        })()
                      )}
                    </svg>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[#8B949E] text-xs">
                      Run backtest to plot equity growth and drawdown curve.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8 text-[#8B949E]">
              <div className="max-w-md bg-[#12161C] border border-[#1F2630] rounded p-6">
                <Sparkles className="w-8 h-8 text-[#F0B90B] mx-auto mb-2 opacity-80" />
                <h3 className="font-semibold text-sm text-[#E6EDF3] mb-1">
                  Ready to Run {currentStrategy.name}
                </h3>
                <p className="text-xs text-[#8B949E] mb-4 leading-relaxed">
                  Simulate {currentStrategy.name} over {candles.length > 0 ? `${candles.length} historical candles` : 'Upstox market data'} of {selectedInstrument.symbol} ({timeframe}).
                </p>
                <button
                  onClick={() => runStrategyBacktest()}
                  disabled={isBacktesting}
                  className="px-5 py-2.5 bg-[#F0B90B] text-[#0B0E11] font-bold text-xs rounded hover:bg-[#d9a70a] transition-all inline-flex items-center gap-2 cursor-pointer shadow active:scale-95"
                >
                  {isBacktesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Simulating Strategy...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Execute Backtest Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
