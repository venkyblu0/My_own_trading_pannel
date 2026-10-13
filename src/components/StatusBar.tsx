import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.ts';
import { isMarketOpenNow, formatISTTime } from '../lib/formatters.ts';
import { Database, Wifi, ShieldCheck, ShieldAlert } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const { isTokenSet, selectedInstrument } = useAppStore();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [marketOpen, setMarketOpen] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setMarketOpen(isMarketOpenNow());
    }, 1000);
    setMarketOpen(isMarketOpenNow());
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="h-6 bg-[#0B0E11] border-t border-[#1F2630] px-3 flex items-center justify-between text-[11px] font-mono text-[#8B949E] shrink-0 select-none z-30">
      {/* Left: Data source and Security status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Database className="w-3 h-3 text-[#F0B90B]" />
          <span>Source: <strong className="text-[#E6EDF3]">Upstox API v3</strong></span>
        </div>

        <div className="hidden sm:flex items-center gap-1">
          {isTokenSet ? (
            <span className="text-[#26A69A] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Token Verified
            </span>
          ) : (
            <span className="text-[#F0B90B] flex items-center gap-1" title="Set UPSTOX_TOKEN in Settings -> Secrets">
              <ShieldAlert className="w-3 h-3" /> Token Pending in Secrets
            </span>
          )}
        </div>
      </div>

      {/* Center: Selected Key */}
      <div className="hidden md:flex items-center gap-2 text-[10px]">
        <span>Active:</span>
        <span className="text-[#E6EDF3] bg-[#181D25] px-1.5 py-0.5 rounded border border-[#1F2630]">
          {selectedInstrument.key}
        </span>
      </div>

      {/* Right: Market Status & IST Clock */}
      <div className="flex items-center gap-3">
        {/* Connection & Market Dot */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              marketOpen
                ? 'bg-[#26A69A] shadow-[0_0_6px_#26A69A]'
                : 'bg-[#8B949E]'
            }`}
          />
          <span className={marketOpen ? 'text-[#26A69A]' : 'text-[#8B949E]'}>
            {marketOpen ? 'Market Open' : 'Market Closed'}
          </span>
        </div>

        {/* IST Clock */}
        <div className="border-l border-[#1F2630] pl-3 text-[#E6EDF3] font-medium">
          {formatISTTime(currentTime, false)} IST
        </div>
      </div>
    </footer>
  );
};
