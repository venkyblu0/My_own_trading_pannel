import React, { useState } from 'react';
import { X, Search, SlidersHorizontal, Plus, Trash2, Check, Settings2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { SUPPORTED_INDICATORS } from '../chart/types.ts';

export const IndicatorsModal: React.FC = () => {
  const {
    isIndicatorsModalOpen,
    closeIndicatorsModal,
    activeIndicators,
    addIndicator,
    removeIndicator,
    updateIndicatorParams,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'overlay' | 'sub'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paramInputs, setParamInputs] = useState<Record<string, string>>({});

  if (!isIndicatorsModalOpen) return null;

  const filteredIndicators = SUPPORTED_INDICATORS.filter((ind) => {
    const matchesSearch =
      ind.name.toLowerCase().includes(search.toLowerCase()) ||
      ind.label.toLowerCase().includes(search.toLowerCase()) ||
      ind.description.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'overlay') return ind.isOverlay;
    if (filter === 'sub') return !ind.isOverlay;
    return true;
  });

  const handleStartEdit = (id: string, currentParams: number[]) => {
    setEditingId(id);
    setParamInputs({ [id]: currentParams.join(', ') });
  };

  const handleSaveParams = (id: string) => {
    const raw = paramInputs[id] || '';
    const parsed = raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);

    if (parsed.length > 0) {
      updateIndicatorParams(id, parsed);
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#12161C] border border-[#1F2630] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[520px]">
        {/* Header */}
        <div className="h-12 border-b border-[#1F2630] px-4 flex items-center justify-between bg-[#181D25]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#F0B90B]" />
            <h2 className="text-sm font-semibold text-[#E6EDF3]">
              Technical Indicators & Studies
            </h2>
          </div>
          <button
            onClick={closeIndicatorsModal}
            className="text-[#8B949E] hover:text-[#E6EDF3] p-1 rounded hover:bg-[#1F2630] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-[#1F2630] flex items-center gap-3 bg-[#0B0E11]">
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-[#8B949E] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search indicators (e.g. SMA, RSI, Bollinger Bands)..."
              className="w-full bg-[#181D25] border border-[#1F2630] focus:border-[#F0B90B] rounded pl-8 pr-3 py-1.5 text-xs font-mono text-[#E6EDF3] focus:outline-none placeholder:text-[#8B949E]"
            />
          </div>

          <div className="flex items-center bg-[#181D25] p-0.5 rounded border border-[#1F2630] text-xs font-mono">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-1 rounded transition-colors ${
                filter === 'all' ? 'bg-[#F0B90B] text-[#0B0E11] font-semibold' : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('overlay')}
              className={`px-2 py-1 rounded transition-colors ${
                filter === 'overlay' ? 'bg-[#F0B90B] text-[#0B0E11] font-semibold' : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              Overlays
            </button>
            <button
              onClick={() => setFilter('sub')}
              className={`px-2 py-1 rounded transition-colors ${
                filter === 'sub' ? 'bg-[#F0B90B] text-[#0B0E11] font-semibold' : 'text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              Oscillators
            </button>
          </div>
        </div>

        {/* Content Columns: Left Catalogue, Right Active Indicators */}
        <div className="flex-1 flex min-h-0 divide-x divide-[#1F2630]">
          {/* Left: Available Indicators */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1F2630]/60 p-1">
            {filteredIndicators.map((ind) => {
              const isAdded = activeIndicators.some((a) => a.name === ind.name);
              return (
                <div
                  key={ind.name}
                  onClick={() => addIndicator(ind.name, ind.isOverlay, ind.defaultParams)}
                  className="p-2.5 hover:bg-[#181D25] cursor-pointer rounded flex items-center justify-between transition-colors group"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-xs text-[#E6EDF3]">
                        {ind.label}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#1F2630] text-[#8B949E] rounded">
                        {ind.isOverlay ? 'Price Overlay' : 'Sub-Pane'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8B949E] mt-0.5 truncate">
                      {ind.description}
                    </p>
                  </div>

                  <button
                    className={`px-2 py-1 rounded text-xs font-mono shrink-0 flex items-center gap-1 transition-colors ${
                      isAdded
                        ? 'bg-[#132B25] text-[#26A69A] border border-[#26A69A]/30'
                        : 'bg-[#181D25] group-hover:bg-[#F0B90B] text-[#8B949E] group-hover:text-[#0B0E11] border border-[#1F2630]'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3 h-3" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" /> Add
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Right: Currently Active Indicators */}
          <div className="w-64 bg-[#0B0E11] p-3 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-[#1F2630] mb-2">
              <span className="text-xs font-semibold text-[#E6EDF3] uppercase tracking-wider">
                Active on Chart
              </span>
              <span className="text-[10px] font-mono text-[#8B949E] px-1.5 bg-[#181D25] rounded">
                {activeIndicators.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {activeIndicators.length === 0 ? (
                <div className="text-center text-[#8B949E] text-xs py-8">
                  No indicators added. Pick one from the catalogue to add.
                </div>
              ) : (
                activeIndicators.map((ind) => {
                  const isEditing = editingId === ind.id;
                  return (
                    <div
                      key={ind.id}
                      className="bg-[#12161C] border border-[#1F2630] rounded p-2 text-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-mono font-bold text-[#E6EDF3]">
                          {ind.name}
                          <span className="text-[#F0B90B] text-[11px] ml-1">
                            ({ind.params.join(', ')})
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(ind.id, ind.params)}
                            className="p-1 text-[#8B949E] hover:text-[#E6EDF3] rounded hover:bg-[#181D25]"
                            title="Edit parameters"
                          >
                            <Settings2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeIndicator(ind.id)}
                            className="p-1 text-[#8B949E] hover:text-[#EF5350] rounded hover:bg-[#181D25]"
                            title="Remove indicator"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="flex items-center gap-1.5 pt-1 border-t border-[#1F2630]">
                          <input
                            type="text"
                            value={paramInputs[ind.id] || ''}
                            onChange={(e) =>
                              setParamInputs({ ...paramInputs, [ind.id]: e.target.value })
                            }
                            placeholder="e.g. 44 or 12, 26, 9"
                            className="w-full bg-[#181D25] border border-[#1F2630] rounded px-2 py-0.5 text-[11px] font-mono text-[#E6EDF3]"
                          />
                          <button
                            onClick={() => handleSaveParams(ind.id)}
                            className="px-2 py-0.5 bg-[#F0B90B] text-[#0B0E11] font-bold text-[10px] rounded shrink-0"
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
