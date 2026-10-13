import React, { useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Info, ExternalLink } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { formatINR, formatPct } from '../lib/formatters.ts';
import { Instrument } from '../types/index.ts';

export const WatchlistSidebar: React.FC = () => {
  const {
    isWatchlistOpen,
    watchlist,
    selectedInstrument,
    setSelectedInstrument,
    removeFromWatchlist,
    lastClose,
    sessionHigh,
    sessionLow,
    sessionVolume,
  } = useAppStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newSymbolInput, setNewSymbolInput] = useState('');

  if (!isWatchlistOpen) return null;

  return (
    <aside className="w-64 bg-[#12161C] border-l border-[#1F2630] flex flex-col shrink-0 select-none z-20">
      {/* Header */}
      <div className="h-9 border-b border-[#1F2630] px-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#E6EDF3] tracking-wide uppercase">
          Watchlist
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-[#8B949E] px-1.5 py-0.5 bg-[#181D25] rounded">
            {watchlist.length}
          </span>
        </div>
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1F2630]/60">
        {watchlist.map((item) => {
          const isSelected = selectedInstrument.symbol === item.symbol;
          const isPositive = item.change >= 0;

          return (
            <div
              key={item.key}
              onClick={() => {
                const inst: Instrument = {
                  key: item.key,
                  symbol: item.symbol,
                  name: item.name,
                  exchange: item.exchange,
                  segment: item.key.startsWith('NSE_INDEX') ? 'NSE_INDEX' : 'NSE_EQ',
                  type: item.key.startsWith('NSE_INDEX') ? 'INDEX' : 'EQUITY',
                  tickSize: 0.05,
                  lotSize: 1,
                };
                setSelectedInstrument(inst);
              }}
              className={`px-3 py-2 flex items-center justify-between cursor-pointer group transition-colors ${
                isSelected ? 'bg-[#181D25] border-l-2 border-[#F0B90B]' : 'hover:bg-[#181D25]/60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-mono text-xs font-semibold ${
                      isSelected ? 'text-[#F0B90B]' : 'text-[#E6EDF3]'
                    }`}
                  >
                    {item.symbol}
                  </span>
                  <span className="text-[9px] text-[#8B949E] font-mono uppercase">
                    {item.exchange}
                  </span>
                </div>
                <div className="text-[10px] text-[#8B949E] truncate">
                  {item.name}
                </div>
              </div>

              <div className="text-right shrink-0 flex items-center gap-2">
                <div>
                  <div className="font-mono text-xs font-medium text-[#E6EDF3]">
                    {formatINR(item.lastPrice, false)}
                  </div>
                  <div
                    className={`font-mono text-[10px] flex items-center justify-end ${
                      isPositive ? 'text-[#26A69A]' : 'text-[#EF5350]'
                    }`}
                  >
                    {isPositive ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                    {formatPct(item.changePct)}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWatchlist(item.key);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#8B949E] hover:text-[#EF5350] transition-opacity"
                  title="Remove from watchlist"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Symbol Details Panel (Bottom of sidebar) */}
      <div className="border-t border-[#1F2630] bg-[#0B0E11] p-3 text-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#E6EDF3]">
            <Info className="w-3 h-3 text-[#F0B90B]" />
            <span>Symbol Details</span>
          </div>
          <span className="text-[10px] font-mono text-[#8B949E] px-1 bg-[#181D25] rounded">
            {selectedInstrument.segment || selectedInstrument.exchange}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between text-[#8B949E]">
            <span>Symbol</span>
            <span className="text-[#E6EDF3] font-semibold">{selectedInstrument.symbol}</span>
          </div>
          <div className="flex justify-between text-[#8B949E]">
            <span>Security ID</span>
            <span className="text-[#E6EDF3] truncate max-w-[120px]">{selectedInstrument.key.split('|')[1] || selectedInstrument.key}</span>
          </div>
          <div className="flex justify-between text-[#8B949E]">
            <span>Tick / Lot</span>
            <span className="text-[#E6EDF3]">{selectedInstrument.tickSize} / {selectedInstrument.lotSize}</span>
          </div>
          <div className="flex justify-between text-[#8B949E]">
            <span>Day Range</span>
            <span className="text-[#E6EDF3]">
              {formatINR(sessionLow, false)} - {formatINR(sessionHigh, false)}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
