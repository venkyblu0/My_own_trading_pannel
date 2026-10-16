import React, { useEffect } from 'react';
import { TopBar } from './components/TopBar.tsx';
import { LeftToolbar } from './components/LeftToolbar.tsx';
import { ChartPane } from './components/ChartPane.tsx';
import { WatchlistSidebar } from './components/WatchlistSidebar.tsx';
import { BottomPanel } from './components/BottomPanel.tsx';
import { StatusBar } from './components/StatusBar.tsx';
import { ConnectUpstoxModal } from './components/ConnectUpstoxModal.tsx';
import { IndicatorsModal } from './components/IndicatorsModal.tsx';
import { StrategiesModal } from './components/StrategiesModal.tsx';
import { AboutModal } from './components/AboutModal.tsx';
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

        {/* Center Interactive Chart Pane (KLineChart) */}
        <ChartPane />

        {/* Collapsible Right Watchlist Sidebar */}
        <WatchlistSidebar />
      </div>

      {/* Resizable Bottom Panel (Strategy Tester, Signals, Trades, Scanner, Logs) */}
      <BottomPanel />

      {/* Persistent Status Bar */}
      <StatusBar />

      {/* Modals & Dialogs */}
      <ConnectUpstoxModal />
      <IndicatorsModal />
      <StrategiesModal />
      <AboutModal />
    </div>
  );
}
