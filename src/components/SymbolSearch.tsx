import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Instrument } from '../types/index.ts';
import { useAppStore } from '../store/useAppStore.ts';

export const SymbolSearch: React.FC = () => {
  const { exchange, selectedInstrument, setSelectedInstrument } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Instrument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/instruments?exchange=${encodeURIComponent(exchange)}&q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.instruments)) {
            setResults(data.instruments);
            setSelectedIndex(0);
          }
        }
      } catch (err) {
        console.warn('Failed to query instruments:', err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, exchange, isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (inst: Instrument) => {
    setSelectedInstrument(inst);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative z-50">
      {/* Current Selection / Input Display */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className="flex items-center gap-2 bg-[#181D25] hover:bg-[#1F2630] border border-[#1F2630] hover:border-[#2D3748] px-2.5 py-1.5 rounded cursor-pointer transition-colors min-w-[200px] max-w-[260px]"
      >
        <Search className="w-4 h-4 text-[#8B949E] shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-semibold text-[#E6EDF3] tracking-wide truncate">
              {selectedInstrument.symbol}
            </span>
            <span className="text-[10px] px-1 py-0.2 bg-[#2D3748] text-[#8B949E] rounded font-mono">
              {selectedInstrument.exchange}
            </span>
          </div>
          <span className="text-[10px] text-[#8B949E] truncate">
            {selectedInstrument.name}
          </span>
        </div>
      </div>

      {/* Dropdown Modal / Popup */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-[380px] bg-[#12161C] border border-[#1F2630] rounded shadow-2xl overflow-hidden flex flex-col">
          {/* Search Input in Dropdown */}
          <div className="flex items-center gap-2 p-2.5 border-b border-[#1F2630] bg-[#181D25]">
            <Search className="w-4 h-4 text-[#8B949E] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Search ${exchange} symbol or name...`}
              className="bg-transparent text-[#E6EDF3] text-xs font-mono w-full focus:outline-none placeholder:text-[#8B949E]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-[#8B949E] hover:text-[#E6EDF3] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {isLoading && <Loader2 className="w-3.5 h-3.5 text-[#F0B90B] animate-spin" />}
          </div>

          {/* Results List */}
          <div className="max-h-[300px] overflow-y-auto divide-y divide-[#1F2630]">
            {results.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#8B949E]">
                {isLoading ? 'Searching instruments...' : 'No symbols found matching query'}
              </div>
            ) : (
              results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.key}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#181D25]' : 'hover:bg-[#181D25]'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[#E6EDF3]">{item.symbol}</span>
                        <span className="text-[10px] text-[#8B949E] px-1 bg-[#1F2630] rounded font-mono">
                          {item.segment || item.exchange}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8B949E] truncate mt-0.5">{item.name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-[#8B949E] font-mono">{item.key.split('|')[1] || item.key}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Keyboard tip footer */}
          <div className="px-3 py-1.5 bg-[#0B0E11] border-t border-[#1F2630] flex items-center justify-between text-[10px] text-[#8B949E]">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
