import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore.ts';
import { formatINR, formatPct, formatISTTime } from '../../lib/formatters.ts';
import {
  GitCommit,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Crosshair,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  Sparkles,
} from 'lucide-react';

type TradeSortField =
  | 'tradeNumber'
  | 'type'
  | 'entryTime'
  | 'entryPrice'
  | 'exitTime'
  | 'exitPrice'
  | 'shares'
  | 'pnl'
  | 'pnlPct'
  | 'holdingPeriodBars'
  | 'exitReason'
  | 'equityAfter';

export const TradesTab: React.FC = () => {
  const {
    backtestResult,
    selectedInstrument,
    timeframe,
    setJumpToTimestamp,
    inspectedTradeId,
    setInspectedTradeId,
  } = useAppStore();

  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all');
  // Default to Newest trades first (descending by exitTime / tradeNumber)
  const [sortField, setSortField] = useState<TradeSortField>('exitTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const trades = backtestResult?.trades || [];

  const handleSort = (field: TradeSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Sensible default directions for columns
      if (field === 'pnl' || field === 'pnlPct' || field === 'exitTime' || field === 'entryTime' || field === 'tradeNumber' || field === 'equityAfter') {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
  };

  const sortedAndFilteredTrades = useMemo(() => {
    const list = trades.filter((t) => {
      if (filter === 'wins') return t.pnl > 0;
      if (filter === 'losses') return t.pnl < 0;
      return true;
    });

    return [...list].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'entryTime' || sortField === 'exitTime') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [trades, filter, sortField, sortOrder]);

  const handleSelectTrade = (trade: any) => {
    setJumpToTimestamp(trade.entryTime);
    setInspectedTradeId(trade.id);
  };

  const handleExportCSV = () => {
    if (trades.length === 0) return;
    const headers = 'Trade#,Type,EntryTime,EntryPrice,ExitTime,ExitPrice,Shares,PnL_INR,PnL_Pct,ExitReason,EquityAfter\n';
    const rows = sortedAndFilteredTrades
      .map(
        (t) =>
          `${t.tradeNumber},${t.type},"${formatISTTime(t.entryTime, true)}",${t.entryPrice},"${formatISTTime(
            t.exitTime,
            true
          )}",${t.exitPrice},${t.shares},${t.pnl.toFixed(2)},${t.pnlPct.toFixed(2)},${t.exitReason},${t.equityAfter.toFixed(2)}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_${selectedInstrument.symbol}_${timeframe}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSortIcon = (field: TradeSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-2.5 h-2.5 text-[#8B949E]/40 group-hover:text-[#8B949E] transition-colors" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-2.5 h-2.5 text-[#F0B90B]" />
    ) : (
      <ArrowDown className="w-2.5 h-2.5 text-[#F0B90B]" />
    );
  };

  return (
    <div className="h-full flex flex-col p-3 overflow-y-auto font-mono text-xs select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#1F2630] mb-2">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-[#F0B90B]" />
          <span className="font-semibold text-sm text-[#E6EDF3]">
            Trade Execution Ledger
          </span>
          <span className="text-[10px] text-[#8B949E] px-1.5 py-0.2 bg-[#181D25] rounded border border-[#1F2630]">
            {selectedInstrument.symbol} · {timeframe}
          </span>
          <span className="text-[10px] text-[#4FA3FF] font-semibold">
            {trades.length} trades
          </span>
          <span className="text-[10px] text-[#26A69A] bg-[#132B25] px-1.5 py-0.2 rounded border border-[#26A69A]/30">
            Sorted: {sortField} ({sortOrder === 'desc' ? 'Newest/High' : 'Oldest/Low'})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Sort Presets */}
          <div className="flex items-center bg-[#181D25] p-0.5 rounded border border-[#1F2630] text-[10px]">
            <button
              onClick={() => {
                setSortField('exitTime');
                setSortOrder('desc');
              }}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                sortField === 'exitTime' && sortOrder === 'desc'
                  ? 'bg-[#F0B90B] text-[#0B0E11] font-bold'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
              title="Show most recent trades first"
            >
              Newest First
            </button>
            <button
              onClick={() => {
                setSortField('exitTime');
                setSortOrder('asc');
              }}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                sortField === 'exitTime' && sortOrder === 'asc'
                  ? 'bg-[#F0B90B] text-[#0B0E11] font-bold'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
              title="Show oldest historical trades first"
            >
              Oldest First
            </button>
            <button
              onClick={() => {
                setSortField('pnl');
                setSortOrder('desc');
              }}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                sortField === 'pnl' && sortOrder === 'desc'
                  ? 'bg-[#26A69A] text-[#0B0E11] font-bold'
                  : 'text-[#8B949E] hover:text-[#26A69A]'
              }`}
              title="Show highest winning trades first"
            >
              Best P&L
            </button>
            <button
              onClick={() => {
                setSortField('pnl');
                setSortOrder('asc');
              }}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                sortField === 'pnl' && sortOrder === 'asc'
                  ? 'bg-[#EF5350] text-[#FFFFFF] font-bold'
                  : 'text-[#8B949E] hover:text-[#EF5350]'
              }`}
              title="Show biggest losing trades first"
            >
              Worst P&L
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-[#181D25] p-0.5 rounded border border-[#1F2630] text-[10px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filter === 'all' ? 'bg-[#F0B90B] text-[#0B0E11] font-bold' : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              All ({trades.length})
            </button>
            <button
              onClick={() => setFilter('wins')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filter === 'wins' ? 'bg-[#26A69A] text-[#0B0E11] font-bold' : 'text-[#8B949E] hover:text-[#26A69A]'
              }`}
            >
              Wins ({trades.filter((t) => t.pnl > 0).length})
            </button>
            <button
              onClick={() => setFilter('losses')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filter === 'losses' ? 'bg-[#EF5350] text-[#FFFFFF] font-bold' : 'text-[#8B949E] hover:text-[#EF5350]'
              }`}
            >
              Losses ({trades.filter((t) => t.pnl < 0).length})
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={trades.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#181D25] hover:bg-[#1F2630] disabled:opacity-40 text-[#E6EDF3] border border-[#1F2630] rounded text-[11px] transition-colors cursor-pointer"
            title="Download CSV report in current sorted order"
          >
            <Download className="w-3 h-3 text-[#4FA3FF]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {sortedAndFilteredTrades.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-8 text-[#8B949E]">
          <div className="max-w-md bg-[#12161C] border border-[#1F2630] rounded p-6">
            <GitCommit className="w-6 h-6 text-[#8B949E] mx-auto mb-2 opacity-50" />
            <h3 className="font-semibold text-sm text-[#E6EDF3] mb-1">
              No Trades to Display
            </h3>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              {trades.length === 0
                ? 'Run the backtest in the Strategy Tester tab to generate a realistic trade execution log.'
                : 'No trades match the selected filter.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-[#1F2630] rounded overflow-hidden">
          <table className="w-full text-left text-[11px] divide-y divide-[#1F2630]">
            <thead className="bg-[#181D25] text-[#8B949E] uppercase text-[10px] select-none">
              <tr>
                <th
                  onClick={() => handleSort('tradeNumber')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>#</span>
                    {renderSortIcon('tradeNumber')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('type')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Type</span>
                    {renderSortIcon('type')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('entryTime')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Entry Time (IST)</span>
                    {renderSortIcon('entryTime')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('entryPrice')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Entry Price</span>
                    {renderSortIcon('entryPrice')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('exitTime')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Exit Time (IST)</span>
                    {renderSortIcon('exitTime')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('exitPrice')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Exit Price</span>
                    {renderSortIcon('exitPrice')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('shares')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Shares</span>
                    {renderSortIcon('shares')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pnl')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>P&L (₹)</span>
                    {renderSortIcon('pnl')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pnlPct')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>P&L (%)</span>
                    {renderSortIcon('pnlPct')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('holdingPeriodBars')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Holding</span>
                    {renderSortIcon('holdingPeriodBars')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('exitReason')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Exit Reason</span>
                    {renderSortIcon('exitReason')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('equityAfter')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Equity After</span>
                    {renderSortIcon('equityAfter')}
                  </div>
                </th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2630]/60 text-[#E6EDF3]">
              {sortedAndFilteredTrades.map((t) => {
                const isWin = t.pnl > 0;
                const isSelected = inspectedTradeId === t.id;
                return (
                  <tr
                    key={t.id}
                    onClick={() => handleSelectTrade(t)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#181D25] ring-1 ring-inset ring-[#F0B90B]/50'
                        : 'hover:bg-[#181D25]/50'
                    }`}
                  >
                    <td className="py-2 px-3 font-semibold text-[#8B949E]">
                      #{t.tradeNumber}
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1 text-[#26A69A] bg-[#132B25] px-1.5 py-0.2 rounded text-[10px] font-bold">
                        <ArrowUpRight className="w-2.5 h-2.5" />
                        {t.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[#8B949E]">
                      {formatISTTime(t.entryTime, false)}
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#E6EDF3]">
                      {formatINR(t.entryPrice)}
                    </td>
                    <td className="py-2 px-3 text-[#8B949E]">
                      {formatISTTime(t.exitTime, false)}
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#E6EDF3]">
                      {formatINR(t.exitPrice)}
                    </td>
                    <td className="py-2 px-3 text-[#8B949E]">
                      {t.shares.toLocaleString()}
                    </td>
                    <td
                      className={`py-2 px-3 font-bold flex items-center gap-1 ${
                        isWin ? 'text-[#26A69A]' : 'text-[#EF5350]'
                      }`}
                    >
                      {isWin ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{formatINR(t.pnl)}</span>
                    </td>
                    <td className={`py-2 px-3 font-semibold ${isWin ? 'text-[#26A69A]' : 'text-[#EF5350]'}`}>
                      {formatPct(t.pnlPct)}
                    </td>
                    <td className="py-2 px-3 text-[#8B949E]">
                      {t.holdingPeriodBars} bars
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          t.exitReason === 'TARGET'
                            ? 'bg-[#132B25] text-[#26A69A]'
                            : t.exitReason === 'STOP_LOSS'
                            ? 'bg-[#311A1B] text-[#EF5350]'
                            : 'bg-[#181D25] text-[#8B949E]'
                        }`}
                      >
                        {t.exitReason.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-[#F0B90B]">
                      {formatINR(t.equityAfter)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTrade(t);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-[#181D25] hover:bg-[#F0B90B] text-[#8B949E] hover:text-[#0B0E11] rounded border border-[#1F2630] transition-colors cursor-pointer"
                        title="Locate trade on chart"
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>Locate</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
