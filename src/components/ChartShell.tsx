import React from 'react';
import { useAppStore } from '../store/useAppStore.ts';
import { formatINR, formatPct, formatVolume, formatISTTime } from '../lib/formatters.ts';
import { AlertCircle, KeyRound, Loader2, Sparkles, Activity } from 'lucide-react';

export const ChartShell: React.FC = () => {
  const {
    selectedInstrument,
    timeframe,
    candles,
    isLoadingCandles,
    candleError,
    isTokenSet,
    openAuthModal,
    lastClose,
    priceChange,
    priceChangePct,
    sessionHigh,
    sessionLow,
    sessionVolume,
  } = useAppStore();

  const isPositive = (priceChange ?? 0) >= 0;
  const latestCandle = candles.length > 0 ? candles[candles.length - 1] : null;

  return (
    <div className="flex-1 bg-[#0B0E11] relative overflow-hidden flex flex-col select-none">
      {/* Top Crosshair Legend */}
      <div className="h-8 border-b border-[#1F2630]/60 bg-[#0B0E11]/80 backdrop-blur-sm px-3 flex items-center justify-between text-xs font-mono z-10">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#E6EDF3] tracking-wide">
            {selectedInstrument.symbol} · {timeframe} · {selectedInstrument.exchange}
          </span>
          <div className="hidden sm:flex items-center gap-2.5 text-[11px] text-[#8B949E]">
            <span>O <span className="text-[#E6EDF3]">{latestCandle ? formatINR(latestCandle.open, false) : '-'}</span></span>
            <span>H <span className="text-[#E6EDF3]">{latestCandle ? formatINR(latestCandle.high, false) : formatINR(sessionHigh, false)}</span></span>
            <span>L <span className="text-[#E6EDF3]">{latestCandle ? formatINR(latestCandle.low, false) : formatINR(sessionLow, false)}</span></span>
            <span>C <span className={isPositive ? 'text-[#26A69A]' : 'text-[#EF5350]'}>{latestCandle ? formatINR(latestCandle.close, false) : formatINR(lastClose, false)}</span></span>
            <span className={isPositive ? 'text-[#26A69A]' : 'text-[#EF5350]'}>{formatPct(priceChangePct)}</span>
            <span>Vol <span className="text-[#E6EDF3]">{latestCandle ? formatVolume(latestCandle.volume) : formatVolume(sessionVolume)}</span></span>
          </div>
        </div>

        {latestCandle && (
          <span className="text-[10px] text-[#8B949E]">
            Last Bar: {formatISTTime(latestCandle.time)}
          </span>
        )}
      </div>

      {/* Grid Pattern Area */}
      <div
        className="flex-1 relative flex items-center justify-center p-6"
        style={{
          backgroundImage: `
            linear-gradient(to right, #141A22 1px, transparent 1px),
            linear-gradient(to bottom, #141A22 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      >
        {/* State Notice Cards */}
        {isLoadingCandles ? (
          <div className="bg-[#12161C]/90 border border-[#1F2630] rounded-lg p-6 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
            <Loader2 className="w-8 h-8 text-[#F0B90B] animate-spin mb-3" />
            <h3 className="font-semibold text-sm text-[#E6EDF3] mb-1">
              Loading {selectedInstrument.symbol} Candles
            </h3>
            <p className="text-xs text-[#8B949E] mb-2 font-mono">
              Fetching {timeframe} history from Upstox API v3...
            </p>
            <div className="w-48 bg-[#181D25] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#F0B90B] h-full w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        ) : candleError ? (
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
                  <div className="p-3 bg-[#12161C] border border-[#1F2630] rounded text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#F0B90B] font-medium">
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Upstox Connection Required</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#8B949E] leading-normal">
                      Connect your Upstox account using your 1-Year Analytics Token, daily TOTP & PIN, or OAuth Auth Code to load historical candles.
                    </p>
                    <button
                      onClick={openAuthModal}
                      className="w-full py-2 bg-[#F0B90B] hover:bg-[#d9a70a] text-[#0B0E11] font-bold rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Connect Upstox Account</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : candles.length > 0 ? (
          <div className="bg-[#12161C]/80 backdrop-blur-sm border border-[#1F2630] rounded-lg p-5 max-w-lg w-full text-center shadow-xl">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#F0B90B]/10 text-[#F0B90B] mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#E6EDF3] mb-1">
              {selectedInstrument.symbol} ({candles.length} Candles Loaded)
            </h3>
            <p className="text-xs text-[#8B949E] mb-4">
              Range: {formatISTTime(candles[0].time, true)} → {formatISTTime(candles[candles.length - 1].time, true)}
            </p>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              <div className="bg-[#181D25] p-2 rounded border border-[#1F2630]">
                <div className="text-[10px] text-[#8B949E] uppercase">First Close</div>
                <div className="font-semibold text-[#E6EDF3]">{formatINR(candles[0].close)}</div>
              </div>
              <div className="bg-[#181D25] p-2 rounded border border-[#1F2630]">
                <div className="text-[10px] text-[#8B949E] uppercase">Latest Close</div>
                <div className={`font-semibold ${isPositive ? 'text-[#26A69A]' : 'text-[#EF5350]'}`}>
                  {formatINR(candles[candles.length - 1].close)}
                </div>
              </div>
              <div className="bg-[#181D25] p-2 rounded border border-[#1F2630]">
                <div className="text-[10px] text-[#8B949E] uppercase">Bars Cached</div>
                <div className="font-semibold text-[#4FA3FF]">{candles.length}</div>
              </div>
            </div>
            <div className="mt-4 text-[11px] text-[#8B949E] bg-[#181D25]/50 px-3 py-1.5 rounded">
              Phase 1 data pipe verified. Interactive KLineChart canvas will mount here in Phase 2.
            </div>
          </div>
        ) : (
          <div className="text-center text-[#8B949E] max-w-sm">
            <div className="w-10 h-10 rounded-full bg-[#181D25] border border-[#1F2630] flex items-center justify-center mx-auto mb-3">
              <Activity className="w-5 h-5 text-[#8B949E]" />
            </div>
            <p className="text-xs">Select any symbol to inspect real historical candle data.</p>
          </div>
        )}
      </div>
    </div>
  );
};
