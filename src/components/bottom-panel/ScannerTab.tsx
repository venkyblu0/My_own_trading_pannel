import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore.ts';
import { ScannerFilterType } from '../../strategies/scanner.ts';
import { ScannerItem } from '../../strategies/types.ts';
import { formatINR, formatPct } from '../../lib/formatters.ts';
import {
  Terminal,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ExternalLink,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

type ScannerSortField = 'setupScore' | 'symbol' | 'lastPrice' | 'changePct' | 'signal';

export const ScannerTab: React.FC = () => {
  const {
    scannerResults,
    isScanning,
    runMarketScan,
    scannerFilter,
    setScannerFilter,
    setSelectedInstrument,
    watchlist,
  } = useAppStore();

  const [sortField, setSortField] = useState<ScannerSortField>('setupScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (scannerResults.length === 0) {
      runMarketScan();
    }
  }, []);

  const handleSort = (field: ScannerSortField) => {
    if (sortField === field) {
      setSortOrder((prev: 'asc' | 'desc') => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      if (field === 'symbol') {
        setSortOrder('asc');
      } else {
        setSortOrder('desc');
      }
    }
  };

  const filteredResults = scannerResults.filter((item) => {
    if (scannerFilter === 'sma44') return item.setupName.includes('44 SMA');
    if (scannerFilter === 'ema_cross') return item.setupName.includes('EMA');
    if (scannerFilter === 'rsi_oversold') return item.setupName.includes('RSI');
    if (scannerFilter === 'vol_breakout') return item.setupName.includes('Volume');
    if (scannerFilter === 'bollinger_squeeze') return item.setupName.includes('Bollinger');
    return true;
  });

  const sortedAndFilteredResults = React.useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      let valA: any = a[sortField as keyof ScannerItem];
      let valB: any = b[sortField as keyof ScannerItem];

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [filteredResults, sortField, sortOrder]);

  const renderSortIcon = (field: ScannerSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-2.5 h-2.5 text-[#8B949E]/40 group-hover:text-[#8B949E] transition-colors" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-2.5 h-2.5 text-[#F0B90B]" />
    ) : (
      <ArrowDown className="w-2.5 h-2.5 text-[#F0B90B]" />
    );
  };

  const handleSelectSymbol = (item: any) => {
    setSelectedInstrument({
      key: item.key,
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchange,
      segment: `${item.exchange}_EQ`,
      type: 'EQUITY',
      tickSize: 0.05,
      lotSize: 1,
    });
  };

  return (
    <div className="h-full flex flex-col p-3 overflow-y-auto font-mono text-xs select-none">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[#1F2630] mb-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#F0B90B]" />
          <span className="font-semibold text-sm text-[#E6EDF3]">
            Indian Equities Technical Scanner
          </span>
          <span className="text-[10px] text-[#8B949E] px-1.5 py-0.2 bg-[#181D25] rounded border border-[#1F2630]">
            NSE High-Beta & Top Caps
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Buttons */}
          <div className="flex items-center bg-[#181D25] p-0.5 rounded border border-[#1F2630] text-[10px]">
            <button
              onClick={() => setScannerFilter('all')}
              className={`px-2 py-0.5 rounded transition-colors ${
                scannerFilter === 'all'
                  ? 'bg-[#F0B90B] text-[#0B0E11] font-bold'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              All Setups
            </button>
            <button
              onClick={() => setScannerFilter('sma44')}
              className={`px-2 py-0.5 rounded transition-colors ${
                scannerFilter === 'sma44'
                  ? 'bg-[#F0B90B] text-[#0B0E11] font-bold'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              44 SMA Pullback
            </button>
            <button
              onClick={() => setScannerFilter('ema_cross')}
              className={`px-2 py-0.5 rounded transition-colors ${
                scannerFilter === 'ema_cross'
                  ? 'bg-[#F0B90B] text-[#0B0E11] font-bold'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              EMA 9/21 Cross
            </button>
            <button
              onClick={() => setScannerFilter('rsi_oversold')}
              className={`px-2 py-0.5 rounded transition-colors ${
                scannerFilter === 'rsi_oversold'
                  ? 'bg-[#F0B90B] text-[#0B0E11] font-bold'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              RSI Oversold
            </button>
            <button
              onClick={() => setScannerFilter('vol_breakout')}
              className={`px-2 py-0.5 rounded transition-colors ${
                scannerFilter === 'vol_breakout'
                  ? 'bg-[#F0B90B] text-[#0B0E11] font-bold'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              Volume Spikes
            </button>
            <button
              onClick={() => setScannerFilter('bollinger_squeeze')}
              className={`px-2 py-0.5 rounded transition-colors ${
                scannerFilter === 'bollinger_squeeze'
                  ? 'bg-[#F0B90B] text-[#0B0E11] font-bold'
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              BB Squeeze
            </button>
          </div>

          {/* Refresh / Scan Now */}
          <button
            onClick={() => runMarketScan(scannerFilter)}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#181D25] hover:bg-[#1F2630] disabled:opacity-50 text-[#E6EDF3] border border-[#1F2630] rounded text-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 text-[#F0B90B] ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Now'}</span>
          </button>
        </div>
      </div>

      {/* Results Table */}
      {isScanning && scannerResults.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-8 text-[#8B949E]">
          <RefreshCw className="w-6 h-6 text-[#F0B90B] animate-spin mb-2" />
          <span className="text-xs">Scanning Indian equities market for high-probability setups...</span>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-8 text-[#8B949E]">
          <div className="max-w-md bg-[#12161C] border border-[#1F2630] rounded p-6">
            <Search className="w-6 h-6 text-[#8B949E] mx-auto mb-2 opacity-50" />
            <h3 className="font-semibold text-sm text-[#E6EDF3] mb-1">
              No Symbols Match Current Filter
            </h3>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              Click &quot;All Setups&quot; or click &quot;Scan Now&quot; to refresh scanner data across all symbols.
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-[#1F2630] rounded overflow-hidden">
          <table className="w-full text-left text-[11px] divide-y divide-[#1F2630]">
            <thead className="bg-[#181D25] text-[#8B949E] uppercase text-[10px] select-none">
              <tr>
                <th
                  onClick={() => handleSort('symbol')}
                  className="py-2 px-3 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Symbol</span>
                    {renderSortIcon('symbol')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('lastPrice')}
                  className="py-2 px-3 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>LTP (₹)</span>
                    {renderSortIcon('lastPrice')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('changePct')}
                  className="py-2 px-3 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Change %</span>
                    {renderSortIcon('changePct')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('signal')}
                  className="py-2 px-3 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Signal</span>
                    {renderSortIcon('signal')}
                  </div>
                </th>
                <th className="py-2 px-3">Identified Setup</th>
                <th
                  onClick={() => handleSort('setupScore')}
                  className="py-2 px-3 cursor-pointer hover:bg-[#1F2630]/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Setup Score</span>
                    {renderSortIcon('setupScore')}
                  </div>
                </th>
                <th className="py-2 px-3">Technical Condition Details</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2630]/60 text-[#E6EDF3]">
              {sortedAndFilteredResults.map((item) => {
                const isBull = item.signal === 'BULLISH';
                const isHighConfidence = item.setupScore >= 80;
                return (
                  <tr
                    key={item.key}
                    onClick={() => handleSelectSymbol(item)}
                    className="hover:bg-[#181D25]/60 cursor-pointer transition-colors group"
                  >
                    <td className="py-2 px-3 font-bold text-[#E6EDF3] flex items-center gap-1.5">
                      <span>{item.symbol}</span>
                      <span className="text-[9px] text-[#8B949E] font-normal px-1 bg-[#181D25] rounded">
                        {item.exchange}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#E6EDF3]">
                      {formatINR(item.lastPrice)}
                    </td>
                    <td
                      className={`py-2 px-3 font-bold flex items-center gap-0.5 ${
                        item.changePct >= 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'
                      }`}
                    >
                      {item.changePct >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{formatPct(item.changePct)}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          isBull
                            ? 'bg-[#132B25] text-[#26A69A] border border-[#26A69A]/30'
                            : item.signal === 'BEARISH'
                            ? 'bg-[#311A1B] text-[#EF5350] border border-[#EF5350]/30'
                            : 'bg-[#181D25] text-[#8B949E]'
                        }`}
                      >
                        {item.signal}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-[#E6EDF3]">
                      <div className="flex items-center gap-1">
                        {isHighConfidence && <Flame className="w-3 h-3 text-[#F0B90B] shrink-0" />}
                        <span>{item.setupName}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-[#181D25] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.setupScore >= 80
                                ? 'bg-[#26A69A]'
                                : item.setupScore >= 60
                                ? 'bg-[#F0B90B]'
                                : 'bg-[#8B949E]'
                            }`}
                            style={{ width: `${item.setupScore}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#8B949E]">{item.setupScore}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-[#8B949E] text-[10px] max-w-sm truncate" title={item.details}>
                      {item.details}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSymbol(item);
                        }}
                        className="px-2 py-0.5 bg-[#181D25] group-hover:bg-[#F0B90B] text-[#8B949E] group-hover:text-[#0B0E11] font-semibold text-[10px] rounded border border-[#1F2630] transition-colors inline-flex items-center gap-1"
                      >
                        <span>Chart</span>
                        <ExternalLink className="w-2.5 h-2.5" />
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
