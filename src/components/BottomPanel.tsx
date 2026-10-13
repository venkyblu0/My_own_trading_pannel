import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Activity,
  GitCommit,
  Radio,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { BottomPanelTab } from '../types/index.ts';
import { formatISTTime } from '../lib/formatters.ts';

export const BottomPanel: React.FC = () => {
  const {
    bottomPanelTab,
    setBottomPanelTab,
    isBottomPanelCollapsed,
    toggleBottomPanel,
    bottomPanelHeight,
    setBottomPanelHeight,
    logs,
    fetchLogs,
  } = useAppStore();

  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(0);

  // Auto fetch logs on mount and when tab is logs
  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Vertical resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartHeightRef.current = bottomPanelHeight;
    document.body.style.cursor = 'row-resize';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = dragStartYRef.current - e.clientY;
      setBottomPanelHeight(dragStartHeightRef.current + deltaY);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = 'default';
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const tabs: { id: BottomPanelTab; label: string; icon: React.ReactNode }[] = [
    { id: 'strategy_tester', label: 'Strategy Tester', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'signals', label: 'Signals', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'trades', label: 'Trades', icon: <GitCommit className="w-3.5 h-3.5" /> },
    { id: 'scanner', label: 'Scanner', icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: 'logs', label: `Logs (${logs.length})`, icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      style={{ height: isBottomPanelCollapsed ? 32 : bottomPanelHeight }}
      className="bg-[#12161C] border-t border-[#1F2630] flex flex-col shrink-0 select-none transition-[height] duration-75 relative z-20"
    >
      {/* Drag handle */}
      {!isBottomPanelCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-[#F0B90B] active:bg-[#F0B90B] transition-colors z-30"
          title="Drag to resize bottom panel"
        />
      )}

      {/* Tabs Header */}
      <div className="h-8 bg-[#12161C] border-b border-[#1F2630] flex items-center justify-between px-2 shrink-0">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = bottomPanelTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setBottomPanelTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors ${
                  isActive
                    ? 'bg-[#181D25] text-[#F0B90B] font-semibold border-b-2 border-[#F0B90B]'
                    : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181D25]/50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          {bottomPanelTab === 'logs' && (
            <button
              onClick={() => fetchLogs()}
              className="p-1 text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181D25] rounded transition-colors"
              title="Refresh logs"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={toggleBottomPanel}
            className="p-1 text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181D25] rounded transition-colors"
            title={isBottomPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isBottomPanelCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {!isBottomPanelCollapsed && (
        <div className="flex-1 bg-[#0B0E11] overflow-y-auto font-mono text-xs">
          {bottomPanelTab === 'logs' ? (
            <div className="p-2">
              {logs.length === 0 ? (
                <div className="p-6 text-center text-[#8B949E] text-xs">
                  No data request logs recorded yet. Search a symbol or change timeframes to view Upstox server queries.
                </div>
              ) : (
                <div className="border border-[#1F2630] rounded overflow-hidden">
                  <table className="w-full text-left text-[11px] divide-y divide-[#1F2630]">
                    <thead className="bg-[#181D25] text-[#8B949E] uppercase text-[10px]">
                      <tr>
                        <th className="py-1.5 px-3">Status</th>
                        <th className="py-1.5 px-3">Time (IST)</th>
                        <th className="py-1.5 px-3">Instrument Key</th>
                        <th className="py-1.5 px-3">TF</th>
                        <th className="py-1.5 px-3">Range</th>
                        <th className="py-1.5 px-3">Candles</th>
                        <th className="py-1.5 px-3">Latency</th>
                        <th className="py-1.5 px-3">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2630]/60 text-[#E6EDF3]">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#181D25]/40 transition-colors">
                          <td className="py-1.5 px-3">
                            {log.status === 'ok' ? (
                              <span className="inline-flex items-center gap-1 text-[#26A69A]">
                                <CheckCircle2 className="w-3 h-3" /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#EF5350]" title={log.errorMessage}>
                                <XCircle className="w-3 h-3" /> ERR
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-[#8B949E]">
                            {formatISTTime(log.timestamp, false)}
                          </td>
                          <td className="py-1.5 px-3 font-semibold text-[#E6EDF3]">
                            {log.symbol}
                          </td>
                          <td className="py-1.5 px-3 text-[#F0B90B]">
                            {log.timeframe}
                          </td>
                          <td className="py-1.5 px-3 text-[#8B949E]">
                            {log.from} → {log.to}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-[#4FA3FF]">
                            {log.candleCount.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-3 text-[#8B949E]">
                            {log.durationMs}ms
                          </td>
                          <td className="py-1.5 px-3">
                            {log.cached ? (
                              <span className="px-1.5 py-0.5 bg-[#1F2630] text-[#8B949E] rounded text-[10px] inline-flex items-center gap-1">
                                <HardDrive className="w-2.5 h-2.5 text-[#26A69A]" /> Disk Cache
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-[#1F2630] text-[#8B949E] rounded text-[10px] inline-flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-[#F0B90B]" /> Upstox API v3
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-[#8B949E]">
              <div className="max-w-md mx-auto bg-[#12161C] border border-[#1F2630] p-6 rounded">
                <div className="text-sm font-semibold text-[#E6EDF3] mb-1 capitalize">
                  {bottomPanelTab.replace('_', ' ')} Module
                </div>
                <p className="text-xs text-[#8B949E] leading-relaxed">
                  Phase 1 shell active. This module will be wired in Phase 3 (Strategy & Signals) and Phase 4 (Single-stock backtester & performance analytics).
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
