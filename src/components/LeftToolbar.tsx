import React, { useEffect } from 'react';
import {
  TrendingUp,
  Minus,
  Maximize2,
  Type,
  Brush,
  Magnet,
  Lock,
  Eye,
  Trash2,
  Crosshair,
  Percent,
  HelpCircle,
  CornerUpRight,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { Timeframe } from '../types/index.ts';

interface ToolItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
}

const TIMEFRAME_KEYS: Record<string, Timeframe> = {
  '1': '1m',
  '2': '3m',
  '3': '5m',
  '4': '15m',
  '5': '30m',
  '6': '1h',
  '7': '1D',
  '8': '1W',
  '9': '1M',
};

export const LeftToolbar: React.FC = () => {
  const {
    activeDrawingTool,
    setActiveDrawingTool,
    isMagnetActive,
    toggleMagnet,
    isDrawingsLocked,
    toggleDrawingsLock,
    isDrawingsHidden,
    toggleDrawingsHide,
    clearAllDrawings,
    openAboutModal,
    setTimeframe,
  } = useAppStore();

  const mainTools: ToolItem[] = [
    { id: 'cursor', label: 'Crosshair', icon: <Crosshair className="w-4 h-4" /> },
    { id: 'trendline', label: 'Trend Line', shortcut: 'Alt+T', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'ray', label: 'Ray Line', icon: <CornerUpRight className="w-4 h-4" /> },
    { id: 'horizontal', label: 'Horizontal Line', shortcut: 'Alt+H', icon: <Minus className="w-4 h-4" /> },
    { id: 'fibonacci', label: 'Fibonacci Retracement', icon: <Percent className="w-4 h-4" /> },
    { id: 'brush', label: 'Brush', icon: <Brush className="w-4 h-4" /> },
    { id: 'text', label: 'Text Note', icon: <Type className="w-4 h-4" /> },
    { id: 'parallelChannel', label: 'Parallel Channel', icon: <Maximize2 className="w-4 h-4" /> },
  ];

  // Keyboard shortcuts (Alt+T, Alt+H, Esc, Del, 1-9 for timeframes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Alt+T: Trend line
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        setActiveDrawingTool('trendline');
        return;
      }

      // Alt+H: Horizontal line
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setActiveDrawingTool('horizontal');
        return;
      }

      // Esc: Cancel active drawing
      if (e.key === 'Escape') {
        setActiveDrawingTool(null);
        return;
      }

      // 1-9: Switch timeframes
      if (TIMEFRAME_KEYS[e.key]) {
        setTimeframe(TIMEFRAME_KEYS[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToolClick = (id: string) => {
    if (id === 'cursor') {
      setActiveDrawingTool(null);
    } else {
      setActiveDrawingTool(id);
    }
  };

  return (
    <aside className="w-11 bg-[#12161C] border-r border-[#1F2630] flex flex-col items-center py-2 shrink-0 select-none justify-between z-20">
      {/* Primary Drawing Tools */}
      <div className="flex flex-col items-center gap-1 w-full px-1">
        {mainTools.map((tool) => {
          const isActive =
            tool.id === 'cursor'
              ? activeDrawingTool === null
              : activeDrawingTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative group ${
                isActive
                  ? 'bg-[#F0B90B] text-[#0B0E11]'
                  : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181D25]'
              }`}
              title={`${tool.label} ${tool.shortcut ? `(${tool.shortcut})` : ''}`}
            >
              {tool.icon}
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#181D25] border border-[#1F2630] text-[#E6EDF3] text-[11px] font-mono rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {tool.label} {tool.shortcut && <span className="text-[#F0B90B] ml-1">{tool.shortcut}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Utilities: Magnet, Lock, Hide, Trash, About */}
      <div className="flex flex-col items-center gap-1 w-full px-1 pt-2 border-t border-[#1F2630]">
        <button
          onClick={toggleMagnet}
          className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative group ${
            isMagnetActive
              ? 'bg-[#181D25] text-[#4FA3FF]'
              : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181D25]'
          }`}
          title="Magnet Mode"
        >
          <Magnet className="w-4 h-4" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#181D25] border border-[#1F2630] text-[#E6EDF3] text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {isMagnetActive ? 'Magnet Enabled' : 'Magnet Mode'}
          </div>
        </button>

        <button
          onClick={toggleDrawingsLock}
          className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative group ${
            isDrawingsLocked
              ? 'bg-[#181D25] text-[#F0B90B]'
              : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181D25]'
          }`}
          title="Lock All Drawings"
        >
          <Lock className="w-4 h-4" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#181D25] border border-[#1F2630] text-[#E6EDF3] text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {isDrawingsLocked ? 'Drawings Locked' : 'Lock All Drawings'}
          </div>
        </button>

        <button
          onClick={toggleDrawingsHide}
          className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative group ${
            isDrawingsHidden
              ? 'bg-[#181D25] text-[#EF5350]'
              : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181D25]'
          }`}
          title="Hide All Drawings"
        >
          <Eye className="w-4 h-4" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#181D25] border border-[#1F2630] text-[#E6EDF3] text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {isDrawingsHidden ? 'Drawings Hidden' : 'Hide All Drawings'}
          </div>
        </button>

        <button
          onClick={clearAllDrawings}
          className="w-9 h-9 flex items-center justify-center rounded text-[#8B949E] hover:text-[#EF5350] hover:bg-[#181D25] transition-colors relative group"
          title="Delete All Drawings"
        >
          <Trash2 className="w-4 h-4" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#181D25] border border-[#1F2630] text-[#E6EDF3] text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Delete All Drawings
          </div>
        </button>

        <button
          onClick={openAboutModal}
          className="w-9 h-9 flex items-center justify-center rounded text-[#8B949E] hover:text-[#F0B90B] hover:bg-[#181D25] transition-colors relative group mt-1"
          title="About & Open-Source Credits"
        >
          <HelpCircle className="w-4 h-4" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#181D25] border border-[#1F2630] text-[#E6EDF3] text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            About Trading Studio
          </div>
        </button>
      </div>
    </aside>
  );
};
