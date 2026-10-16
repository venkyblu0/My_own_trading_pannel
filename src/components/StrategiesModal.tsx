import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore.ts';
import { BUILT_IN_STRATEGIES } from '../strategies/definitions.ts';
import { StrategyId } from '../strategies/types.ts';
import { X, Layers, Play, Check, SlidersHorizontal, Info, Target, ShieldCheck } from 'lucide-react';

export const StrategiesModal: React.FC = () => {
  const {
    isStrategiesModalOpen,
    closeStrategiesModal,
    activeStrategyId,
    setActiveStrategyId,
    strategyParams,
    updateStrategyParams,
    runStrategyBacktest,
    setBottomPanelTab,
  } = useAppStore();

  const [selectedId, setSelectedId] = useState<StrategyId>(activeStrategyId);
  const [localParams, setLocalParams] = useState<Record<string, any>>(strategyParams);

  if (!isStrategiesModalOpen) return null;

  const currentDef = BUILT_IN_STRATEGIES[selectedId];

  const handleApplyAndRun = () => {
    setActiveStrategyId(selectedId);
    updateStrategyParams(localParams);
    closeStrategiesModal();
    setBottomPanelTab('strategy_tester');
    runStrategyBacktest(selectedId, localParams);
  };

  const handleParamChange = (key: string, val: any) => {
    setLocalParams((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-[#12161C] border border-[#1F2630] rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col h-[540px]">
        {/* Header */}
        <div className="h-12 border-b border-[#1F2630] px-4 flex items-center justify-between bg-[#181D25]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#F0B90B]" />
            <h2 className="text-sm font-semibold text-[#E6EDF3]">
              Algorithmic Trading Strategies & Rule Config
            </h2>
          </div>
          <button
            onClick={closeStrategiesModal}
            className="text-[#8B949E] hover:text-[#E6EDF3] p-1 rounded hover:bg-[#1F2630] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: Left Strategy List, Right Config Form */}
        <div className="flex-1 flex min-h-0 divide-x divide-[#1F2630]">
          {/* Left Strategy Catalogue */}
          <div className="w-72 overflow-y-auto divide-y divide-[#1F2630]/60 p-1.5 bg-[#0B0E11]">
            {Object.values(BUILT_IN_STRATEGIES).map((strat) => {
              const isSelected = selectedId === strat.id;
              const isActive = activeStrategyId === strat.id;
              return (
                <div
                  key={strat.id}
                  onClick={() => {
                    setSelectedId(strat.id);
                    setLocalParams(strat.params);
                  }}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#181D25] border border-[#F0B90B]/50'
                      : 'hover:bg-[#181D25]/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#E6EDF3]">
                      {strat.name}
                    </span>
                    {isActive && (
                      <span className="px-1.5 py-0.2 bg-[#132B25] text-[#26A69A] border border-[#26A69A]/30 rounded text-[9px] font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8B949E] mt-1 line-clamp-2">
                    {strat.tagline}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right Strategy Details & Param Configuration Form */}
          <div className="flex-1 bg-[#12161C] p-4 overflow-y-auto flex flex-col font-mono text-xs">
            {/* Header info */}
            <div className="pb-3 border-b border-[#1F2630] mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#E6EDF3]">
                  {currentDef.name}
                </h3>
                <span className="text-[10px] text-[#F0B90B] font-semibold">
                  {currentDef.popularFor}
                </span>
              </div>
              <p className="text-xs text-[#8B949E] mt-1.5 leading-relaxed font-sans">
                {currentDef.description}
              </p>
            </div>

            {/* Parameter Inputs */}
            <div className="flex-1 space-y-3">
              <div className="text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider mb-2">
                Strategy Parameters & Risk Rules
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentDef.paramDefs.map((param) => {
                  const val = localParams[param.key] ?? param.default;
                  return (
                    <div key={param.key} className="bg-[#181D25] border border-[#1F2630] rounded p-2.5">
                      <label className="text-[11px] text-[#8B949E] block mb-1">
                        {param.label}
                      </label>
                      {param.type === 'select' ? (
                        <select
                          value={val}
                          onChange={(e) => handleParamChange(param.key, e.target.value)}
                          className="w-full bg-[#12161C] border border-[#1F2630] focus:border-[#F0B90B] rounded px-2.5 py-1 text-xs text-[#E6EDF3] focus:outline-none cursor-pointer"
                        >
                          {param.options?.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          min={param.min}
                          max={param.max}
                          step={param.step || 1}
                          value={val}
                          onChange={(e) => handleParamChange(param.key, Number(e.target.value))}
                          className="w-full bg-[#12161C] border border-[#1F2630] focus:border-[#F0B90B] rounded px-2.5 py-1 text-xs text-[#E6EDF3] focus:outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Modal Actions */}
            <div className="pt-4 border-t border-[#1F2630] flex items-center justify-between mt-auto">
              <button
                onClick={() => setLocalParams(currentDef.params)}
                className="text-[#8B949E] hover:text-[#E6EDF3] text-xs underline cursor-pointer"
              >
                Reset to Defaults
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={closeStrategiesModal}
                  className="px-3 py-1.5 bg-[#181D25] hover:bg-[#1F2630] text-[#8B949E] hover:text-[#E6EDF3] rounded text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyAndRun}
                  className="px-4 py-1.5 bg-[#F0B90B] hover:bg-[#d9a70a] text-[#0B0E11] font-bold rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Activate & Run Backtest</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
