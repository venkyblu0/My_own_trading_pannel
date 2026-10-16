import React from 'react';
import { X, Activity, ExternalLink, ShieldCheck, Heart } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';

export const AboutModal: React.FC = () => {
  const { isAboutModalOpen, closeAboutModal } = useAppStore();

  if (!isAboutModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#12161C] border border-[#1F2630] rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="h-12 border-b border-[#1F2630] px-4 flex items-center justify-between bg-[#181D25]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#F0B90B]" />
            <h2 className="text-sm font-semibold text-[#E6EDF3]">
              About Trading Studio
            </h2>
          </div>
          <button
            onClick={closeAboutModal}
            className="text-[#8B949E] hover:text-[#E6EDF3] p-1 rounded hover:bg-[#1F2630] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-[#8B949E]">
          <div>
            <h3 className="text-sm font-bold text-[#E6EDF3] flex items-center gap-1.5 mb-1">
              Trading Studio (Indian Markets)
            </h3>
            <p className="leading-relaxed">
              Personal-grade trading terminal and strategy backtester built for Indian equities, indices, and derivatives with deterministic algorithms.
            </p>
          </div>

          <div className="space-y-2 border-t border-[#1F2630] pt-3">
            <div className="font-mono text-[11px] uppercase text-[#E6EDF3] font-semibold">
              Open-Source Credits & Attribution
            </div>
            <div className="bg-[#181D25] p-3 rounded border border-[#1F2630] space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between items-center text-[#E6EDF3]">
                <span>Charting Engine</span>
                <span className="text-[#F0B90B] font-bold">KLineChart</span>
              </div>
              <div className="flex justify-between items-center text-[#8B949E]">
                <span>License</span>
                <span>Apache License 2.0</span>
              </div>
              <div className="flex justify-between items-center text-[#8B949E]">
                <span>Features</span>
                <span>27 Indicators · 16 Drawing Overlays</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-[#1F2630] pt-3">
            <div className="font-mono text-[11px] uppercase text-[#E6EDF3] font-semibold">
              Market Data Source
            </div>
            <div className="bg-[#181D25] p-3 rounded border border-[#1F2630] space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between items-center text-[#E6EDF3]">
                <span>Provider</span>
                <span className="text-[#26A69A] font-bold">Upstox API v3</span>
              </div>
              <div className="flex justify-between items-center text-[#8B949E]">
                <span>Exchanges</span>
                <span>NSE · BSE · MCX</span>
              </div>
              <div className="flex justify-between items-center text-[#8B949E]">
                <span>Security</span>
                <span>Server-side Proxy (Zero Token Leaks)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={closeAboutModal}
              className="px-4 py-1.5 bg-[#F0B90B] hover:bg-[#d9a70a] text-[#0B0E11] font-bold text-xs rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
