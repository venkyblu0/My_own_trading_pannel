import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore.ts';
import { formatINR, formatISTTime } from '../../lib/formatters.ts';
import {
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Crosshair,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

type SignalSortField = 'time' | 'type' | 'price' | 'stopLoss' | 'target1' | 'target2' | 'status' | 'reason';

export const SignalsTab: React.FC = () => {
  const {
    backtestResult,
    selectedInstrument,
    timeframe,
    runStrategyBacktest,
    setJumpToTimestamp,
    inspectedSignalId,
    setInspectedSignalId,
  } = useAppStore();

  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'HIT_TARGET' | 'HIT_SL'>('ALL');
  // Default to Newest signals first
  const [sortField, setSortField] = useState<SignalSortField>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const allSignals = backtestResult?.signals || [];

  const handleSort = (field: SignalSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Sensible default directions
      if (field === 'time' || field === 'price' || field === 'target1') {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
  };

  const sortedAndFilteredSignals = useMemo(() => {
    const list = allSignals.filter((s) => {
      if (filter === 'ALL') return true;
      return s.status === filter;
    });

    return [...list].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'time') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [allSignals, filter, sortField, sortOrder]);

  const handleSelectSignal = (sig: any) => {
    setJumpToTimestamp(sig.time);
    setInspectedSignalId(sig.id);
  };

  const renderSortIcon = (field: SignalSortField) => {
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
          <Radio className="w-4 h-4 text-[#F0B90B] animate-pulse" />
          <span className="font-semibold text-sm text-[#E6EDF3]">
            Strategy Signals Feed
          </span>
          <span className="text-[10px] text-[#8B949E] px-1.5 py-0.2 bg-[#181D25] rounded border border-[#1F2630]">
            {selectedInstrument.symbol} · {timeframe}
          </span>
          <span className="text-[10px] text-[#F0B90B] font-semibold">
            {allSignals.length} generated
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
                setSortField('time');
                setSortOrder('desc');
              }}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                sortField === 'time' && sortOrder === 'desc'
                  ? 'bg-[#F0B90B] text-[#0B0E11] font-bold'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
              title="Show most recent signals first"
            >
              Newest First
            </button>
            <button
              onClick={() => {
                setSortField('time');
                setSortOrder('asc');
              }}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                sortField === 'time' && sortOrder === 'asc'
                  ? 'bg-[#F0B90B] text-[#0B0E11] font-bold'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
              title="Show oldest historical signals first"
            >
              Oldest First
            </button>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center bg-[#181D25] p-0.5 rounded border border-[#1F2630] text-[10px]">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filter === 'ALL' ? 'bg-[#F0B90B] text-[#0B0E11] font-bold' : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              All ({allSignals.length})
            </button>
            <button
              onClick={() => setFilter('ACTIVE')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filter === 'ACTIVE' ? 'bg-[#F0B90B]/20 text-[#F0B90B] font-bold' : 'text-[#8B949E] hover:text-[#F0B90B]'
              }`}
            >
              Active ({allSignals.filter((s) => s.status === 'ACTIVE').length})
            </button>
            <button
              onClick={() => setFilter('HIT_TARGET')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filter === 'HIT_TARGET' ? 'bg-[#26A69A] text-[#0B0E11] font-bold' : 'text-[#8B949E] hover:text-[#26A69A]'
              }`}
            >
              Targets ({allSignals.filter((s) => s.status === 'HIT_TARGET').length})
            </button>
            <button
              onClick={() => setFilter('HIT_SL')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filter === 'HIT_SL' ? 'bg-[#EF5350] text-[#FFFFFF] font-bold' : 'text-[#8B949E] hover:text-[#EF5350]'
              }`}
            >
              Stop Loss ({allSignals.filter((s) => s.status === 'HIT_SL').length})
            </button>
          </div>

          <button
            onClick={() => runStrategyBacktest()}
            className="text-[11px] text-[#F0B90B] hover:underline cursor-pointer flex items-center gap-1"
          >
            <Layers className="w-3 h-3" />
            <span>Re-compute</span>
          </button>
        </div>
      </div>

      {sortedAndFilteredSignals.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-8 text-[#8B949E]">
          <div className="max-w-md bg-[#12161C] border border-[#1F2630] rounded p-6">
            <Radio className="w-6 h-6 text-[#8B949E] mx-auto mb-2 opacity-50" />
            <h3 className="font-semibold text-sm text-[#E6EDF3] mb-1">
              No Signals Matching Filter
            </h3>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              {allSignals.length === 0
                ? 'Run the strategy backtest from the Strategy Tester tab or click "Re-compute" above to scan the loaded candles for trading setups.'
                : 'No signals match the selected filter. Try selecting "All" above.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-[#1F2630] rounded overflow-hidden">
          <table className="w-full text-left text-[11px] divide-y divide-[#1F2630]">
            <thead className="bg-[#181D25] text-[#8B949E] uppercase text-[10px] select-none">
              <tr>
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
                  onClick={() => handleSort('time')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Time (IST)</span>
                    {renderSortIcon('time')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('price')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Trigger Price</span>
                    {renderSortIcon('price')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('stopLoss')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Stop Loss</span>
                    {renderSortIcon('stopLoss')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('target1')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Target 1</span>
                    {renderSortIcon('target1')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('target2')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Target 2</span>
                    {renderSortIcon('target2')}
                  </div>
                </th>
                <th className="py-2 px-3">R:R</th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {renderSortIcon('status')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('reason')}
                  className="py-2 px-3 cursor-pointer group hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Setup Trigger Rationale</span>
                    {renderSortIcon('reason')}
                  </div>
                </th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2630]/60 text-[#E6EDF3]">
              {sortedAndFilteredSignals.map((sig) => {
                const isBuy = sig.type === 'BUY';
                const isSelected = inspectedSignalId === sig.id;
                return (
                  <tr
                    key={sig.id}
                    onClick={() => handleSelectSignal(sig)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#181D25] ring-1 ring-inset ring-[#F0B90B]/50'
                        : 'hover:bg-[#181D25]/50'
                    }`}
                  >
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isBuy
                            ? 'bg-[#132B25] text-[#26A69A] border border-[#26A69A]/30'
                            : 'bg-[#311A1B] text-[#EF5350] border border-[#EF5350]/30'
                        }`}
                      >
                        {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {sig.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[#8B949E]">
                      {formatISTTime(sig.time, true)}
                    </td>
                    <td className="py-2 px-3 font-bold text-[#E6EDF3]">
                      {formatINR(sig.price)}
                    </td>
                    <td className="py-2 px-3 text-[#EF5350]">
                      {formatINR(sig.stopLoss)}
                    </td>
                    <td className="py-2 px-3 text-[#26A69A] font-semibold">
                      {formatINR(sig.target1)}
                    </td>
                    <td className="py-2 px-3 text-[#26A69A]">
                      {formatINR(sig.target2)}
                    </td>
                    <td className="py-2 px-3 text-[#F0B90B]">
                      {sig.riskReward}
                    </td>
                    <td className="py-2 px-3">
                      {sig.status === 'HIT_TARGET' && (
                        <span className="inline-flex items-center gap-1 text-[#26A69A] bg-[#132B25] px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Hit Target
                        </span>
                      )}
                      {sig.status === 'HIT_SL' && (
                        <span className="inline-flex items-center gap-1 text-[#EF5350] bg-[#311A1B] px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          <XCircle className="w-3 h-3" /> Hit SL
                        </span>
                      )}
                      {sig.status === 'ACTIVE' && (
                        <span className="inline-flex items-center gap-1 text-[#F0B90B] bg-[#F0B90B]/10 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          <Clock className="w-3 h-3" /> Active
                        </span>
                      )}
                      {sig.status === 'CLOSED' && (
                        <span className="inline-flex items-center gap-1 text-[#8B949E] bg-[#181D25] px-1.5 py-0.5 rounded text-[10px]">
                          Closed
                        </span>
                      )}
                      {sig.status === 'EXPIRED' && (
                        <span className="inline-flex items-center gap-1 text-[#8B949E] bg-[#181D25] px-1.5 py-0.5 rounded text-[10px]">
                          Expired (not filled)
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-[#8B949E] text-[10px] max-w-xs truncate" title={sig.reason}>
                      {sig.reason}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSignal(sig);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-[#181D25] hover:bg-[#F0B90B] text-[#8B949E] hover:text-[#0B0E11] rounded border border-[#1F2630] transition-colors cursor-pointer"
                        title="Locate candle on chart"
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
