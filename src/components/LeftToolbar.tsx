import React, { useState } from 'react';
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
  MousePointer,
  Crosshair,
  Percent,
} from 'lucide-react';

interface ToolItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export const LeftToolbar: React.FC = () => {
  const [activeTool, setActiveTool] = useState<string>('cursor');
  const [isMagnetActive, setIsMagnetActive] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isHidden, setIsHidden] = useState<boolean>(false);

  const mainTools: ToolItem[] = [
    { id: 'cursor', label: 'Crosshair', icon: <Crosshair className="w-4 h-4" /> },
    { id: 'trendline', label: 'Trend Line (Alt+T)', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'horizontal', label: 'Horizontal Line (Alt+H)', icon: <Minus className="w-4 h-4" /> },
    { id: 'fibonacci', label: 'Fibonacci Retracement', icon: <Percent className="w-4 h-4" /> },
    { id: 'brush', label: 'Brush', icon: <Brush className="w-4 h-4" /> },
    { id: 'text', label: 'Text Note', icon: <Type className="w-4 h-4" /> },
    { id: 'channel', label: 'Parallel Channel', icon: <Maximize2 className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-11 bg-[#12161C] border-r border-[#1F2630] flex flex-col items-center py-2 shrink-0 select-none justify-between z-20">
      {/* Primary Drawing Tools */}
      <div className="flex flex-col items-center gap-1 w-full px-1">
        {mainTools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative group ${
                isActive
                  ? 'bg-[#F0B90B] text-[#0B0E11]'
                  : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181D25]'
              }`}
              title={tool.label}
            >
              {tool.icon}
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#181D25] border border-[#1F2630] text-[#E6EDF3] text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {tool.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Utilities: Magnet, Lock, Hide, Trash */}
      <div className="flex flex-col items-center gap-1 w-full px-1 pt-2 border-t border-[#1F2630]">
        <button
          onClick={() => setIsMagnetActive(!isMagnetActive)}
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
          onClick={() => setIsLocked(!isLocked)}
          className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative group ${
            isLocked
              ? 'bg-[#181D25] text-[#F0B90B]'
              : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181D25]'
          }`}
          title="Lock All Drawings"
        >
          <Lock className="w-4 h-4" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#181D25] border border-[#1F2630] text-[#E6EDF3] text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {isLocked ? 'Drawings Locked' : 'Lock All Drawings'}
          </div>
        </button>

        <button
          onClick={() => setIsHidden(!isHidden)}
          className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative group ${
            isHidden
              ? 'bg-[#181D25] text-[#EF5350]'
              : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#181D25]'
          }`}
          title="Hide All Drawings"
        >
          <Eye className="w-4 h-4" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#181D25] border border-[#1F2630] text-[#E6EDF3] text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {isHidden ? 'Drawings Hidden' : 'Hide All Drawings'}
          </div>
        </button>

        <button
          className="w-9 h-9 flex items-center justify-center rounded text-[#8B949E] hover:text-[#EF5350] hover:bg-[#181D25] transition-colors relative group"
          title="Delete All Drawings"
        >
          <Trash2 className="w-4 h-4" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#181D25] border border-[#1F2630] text-[#E6EDF3] text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Delete All Drawings
          </div>
        </button>
      </div>
    </aside>
  );
};
