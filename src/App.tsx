import React, { useEffect } from 'react';
import { TopBar } from './components/TopBar.tsx';
import { LeftToolbar } from './components/LeftToolbar.tsx';
import { ChartShell } from './components/ChartShell.tsx';
import { WatchlistSidebar } from './components/WatchlistSidebar.tsx';
import { BottomPanel } from './components/BottomPanel.tsx';
import { StatusBar } from './components/StatusBar.tsx';
import { useAppStore } from './store/useAppStore.ts';

export default function App() {
  const { checkServerHealth, fetchCandles, selectedInstrument, timeframe } = useAppStore();

  useEffect(() => {
    // Initial server health and data pipe verification
    checkServerHealth();
    fetchCandles(selectedInstrument.key, timeframe);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0B0E11] text-[#E6EDF3] font-sans">
      {/* Top Bar */}
      <TopBar />

      {/* Main Trading Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Drawing Toolbar */}
        <LeftToolbar />

        {/* Center Chart Pane (Phase 1 shell, Phase 2 KLineChart canvas) */}
        <ChartShell />

        {/* Collapsible Right Watchlist Sidebar */}
        <WatchlistSidebar />
      </div>

      {/* Resizable Bottom Panel (Strategy Tester, Signals, Trades, Scanner, Logs) */}
      <BottomPanel />

      {/* Persistent Status Bar */}
      <StatusBar />
    </div>
  );
}
