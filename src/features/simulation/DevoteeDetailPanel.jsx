import React, { useState } from 'react';
import { Search, UserCheck, Eye, EyeOff, X, Clock, MapPin, ShieldCheck, Heart, Sparkles } from 'lucide-react';
import { useSimulationStore } from './simulationStore.js';

/**
 * DevoteeDetailPanel
 * Displays real-time individual logical devotee telemetry, deterministic queue position,
 * service milestones (Security, Darshan), actual elapsed time, and deterministic ETA.
 */
export function DevoteeDetailPanel() {
  const selectedDevoteeDetails = useSimulationStore((state) => state.selectedDevoteeDetails);
  const selectDevotee = useSimulationStore((state) => state.selectDevotee);
  const clearSelectedDevotee = useSimulationStore((state) => state.clearSelectedDevotee);
  const searchDevotees = useSimulationStore((state) => state.searchDevotees);
  const engine = useSimulationStore((state) => state.engine);

  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState('');

  const handleSearch = (e) => {
    e?.preventDefault();
    if (!searchInput.trim()) return;

    setSearchError('');
    const query = searchInput.trim().toUpperCase();
    const results = searchDevotees(query, 5);

    if (results && results.length > 0) {
      selectDevotee(results[0].id);
      setSearchInput(results[0].id);
    } else {
      setSearchError(`Devotee #${query} not found in active or historical records.`);
    }
  };

  const handleSelectSample = () => {
    setSearchError('');
    if (!engine) return;

    // Pick a visible agent or head of north queue
    if (engine.agents && engine.agents.length > 0) {
      const a = engine.agents[0];
      const targetId = a.logicalDevoteeId || a.visitorRepresentativeId || a.id;
      selectDevotee(targetId);
      if (a.logicalDevoteeId) setSearchInput(a.logicalDevoteeId);
    } else if (engine.logicalDevotees && engine.logicalDevotees.size > 0) {
      const firstId = engine.logicalDevotees.keys().next().value;
      selectDevotee(firstId);
      setSearchInput(firstId);
    }
  };

  const details = selectedDevoteeDetails;
  const eta = details?.eta;

  return (
    <div className="bg-stone-50/90 rounded-xl p-3 border border-stone-200/80 space-y-2.5 text-xs">
      {/* Panel Header & Search Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-stone-800 text-[11px] uppercase tracking-wider">
          <UserCheck className="w-3.5 h-3.5 text-deva-gold-600" />
          <span>Devotee Inspector</span>
        </div>
        {details && (
          <button
            onClick={clearSelectedDevotee}
            className="text-stone-400 hover:text-stone-600 transition-colors p-0.5 rounded cursor-pointer"
            title="Deselect Devotee"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search Input Form */}
      <form onSubmit={handleSearch} className="flex gap-1.5">
        <div className="relative flex-1">
          <input
            id="input-search-devotee"
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (searchError) setSearchError('');
            }}
            placeholder="Search ID (e.g. N-00000001)"
            className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-[11px] font-mono text-stone-800 placeholder-stone-400 focus:outline-none focus:border-deva-gold-500 focus:ring-1 focus:ring-deva-gold-500"
          />
        </div>
        <button
          id="btn-search-devotee"
          type="submit"
          className="px-2.5 py-1 bg-deva-maroon-800 hover:bg-deva-maroon-900 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Search className="w-3 h-3" />
          <span>Find</span>
        </button>
      </form>

      {searchError && (
        <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
          {searchError}
        </div>
      )}

      {/* Selected Devotee Details Card */}
      {details ? (
        <div className="bg-white rounded-lg p-2.5 border border-stone-200 shadow-sm space-y-2 animate-in fade-in duration-200">
          {/* Header & 3D Visibility Tag */}
          <div className="flex items-start justify-between border-b border-stone-100 pb-1.5">
            <div>
              <div className="text-[9px] text-stone-400 uppercase font-semibold">Devotee ID</div>
              <div className="text-xs font-mono font-bold text-deva-maroon-900">
                #{details.id}
              </div>
            </div>

            <div className="text-right">
              {details.isVisuallyRepresented ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  <Eye className="w-2.5 h-2.5" />
                  <span>3D Visible</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-stone-600 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-full">
                  <EyeOff className="w-2.5 h-2.5 text-stone-400" />
                  <span>Logical Simulation</span>
                </span>
              )}
            </div>
          </div>

          {!details.isVisuallyRepresented && details.status !== 'Completed' && (
            <div className="text-[9px] text-stone-500 bg-stone-50 px-2 py-1 rounded border border-stone-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Not currently visible in 3D • Logical simulation active</span>
            </div>
          )}

          {/* Key Attributes Grid */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="space-y-0.5">
              <span className="text-stone-400">Entrance</span>
              <div className="font-semibold text-stone-800 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-stone-400" />
                <span className="truncate">{details.entranceName || details.entranceId}</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-stone-400">Current Zone</span>
              <div className="font-semibold text-stone-800">
                {details.currentZone}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-stone-400">Status</span>
              <div className="font-semibold text-stone-800">
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                  details.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
                {details.status}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-stone-400">Queue Position</span>
              <div className="font-mono font-bold text-stone-900">
                {details.queuePosition > 0 ? `${details.queuePosition.toLocaleString()} / ${details.totalQueue.toLocaleString()}` : '—'}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-stone-400">People Ahead</span>
              <div className="font-mono font-bold text-stone-900">
                {details.peopleAhead.toLocaleString()}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-stone-400">Security Check</span>
              <div className="font-semibold text-stone-800 flex items-center gap-1">
                <ShieldCheck className={`w-2.5 h-2.5 ${details.securityStatus === 'Completed' ? 'text-emerald-500' : 'text-stone-400'}`} />
                <span>{details.securityStatus}</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-stone-400">Darshan</span>
              <div className="font-semibold text-stone-800 flex items-center gap-1">
                <Heart className={`w-2.5 h-2.5 ${details.darshanStatus === 'Completed' ? 'text-amber-500' : 'text-stone-400'}`} />
                <span>{details.darshanStatus}</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-stone-400">Entered At</span>
              <div className="font-mono text-stone-700">
                {details.enteredTimeFormatted || '10:00:00'}
              </div>
            </div>
          </div>

          {/* Deterministic ETA & Timings Box */}
          <div className="pt-2 border-t border-stone-100 bg-stone-50/60 rounded-md p-2 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-stone-500 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-stone-400" />
                <span>Actual Elapsed:</span>
              </span>
              <span className="font-mono font-bold text-stone-800">
                {eta?.elapsedSeconds !== undefined ? `${eta.elapsedSeconds}s` : `${Math.round(details.waitTime + details.serviceTime)}s`}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-stone-500">Estimated Remaining:</span>
              <span className={`font-mono font-bold ${eta?.available ? 'text-deva-maroon-800' : 'text-stone-400'}`}>
                {eta?.available ? eta.text : 'ETA unavailable'}
              </span>
            </div>

            {eta?.available && eta.estimatedCompletionFormatted && (
              <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-stone-200/50">
                <span className="text-stone-500">Est. Completion:</span>
                <span className="font-mono font-bold text-emerald-800">
                  {eta.estimatedCompletionFormatted}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-2.5 bg-white rounded-lg border border-dashed border-stone-200 text-center space-y-1.5">
          <p className="text-[10px] text-stone-400">
            Click any 3D devotee in the temple or enter a Devotee ID above to inspect their live individual telemetry and deterministic ETA.
          </p>
          <button
            type="button"
            onClick={handleSelectSample}
            className="text-[10px] font-semibold text-deva-maroon-700 hover:text-deva-maroon-900 underline cursor-pointer"
          >
            Inspect Active Devotee
          </button>
        </div>
      )}
    </div>
  );
}
