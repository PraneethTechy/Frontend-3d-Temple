import React, { useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Flame, 
  Route, 
  Clock, 
  AlertTriangle,
  Info,
  Users,
  Compass,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2
} from 'lucide-react';
import { useSimulationStore } from './simulationStore.js';
import { useQueueStore } from '../../store/useQueueStore.js';
import { normalizeEntranceWeights } from './simulationModel.js';
import { DevoteeDetailPanel } from './DevoteeDetailPanel.jsx';

export function SimulationControls() {
  const scene = useQueueStore((state) => state.scene);

  const status = useSimulationStore((state) => state.status);
  const speed = useSimulationStore((state) => state.speed);
  const showPaths = useSimulationStore((state) => state.showPaths);
  const showDensity = useSimulationStore((state) => state.showDensity);
  const metrics = useSimulationStore((state) => state.metrics);
  const pathData = useSimulationStore((state) => state.pathData);
  const layoutChangedNotice = useSimulationStore((state) => state.layoutChangedNotice);

  const simulationRunning = useSimulationStore((state) => state.simulationRunning);
  const arrivalsPaused = useSimulationStore((state) => state.arrivalsPaused);
  const currentArrivalRate = useSimulationStore((state) => state.currentArrivalRate);
  const pauseArrivals = useSimulationStore((state) => state.pauseArrivals);
  const resumeArrivals = useSimulationStore((state) => state.resumeArrivals);
  const toggleArrivals = useSimulationStore((state) => state.toggleArrivals);
  const addCrowdBatch = useSimulationStore((state) => state.addCrowdBatch);

  const initFromScene = useSimulationStore((state) => state.initFromScene);
  const startSimulation = useSimulationStore((state) => state.startSimulation);
  const resetSimulation = useSimulationStore((state) => state.resetSimulation);
  const setSpeed = useSimulationStore((state) => state.setSpeed);
  const setShowPaths = useSimulationStore((state) => state.setShowPaths);
  const setShowDensity = useSimulationStore((state) => state.setShowDensity);
  const checkLayoutChange = useSimulationStore((state) => state.checkLayoutChange);

  // Entrance Inflow & AI Navigation controls
  const entranceInflow = useSimulationStore((state) => state.entranceInflow);
  const aiQueueNavigationEnabled = useSimulationStore((state) => state.aiQueueNavigationEnabled);
  const aiNavigationState = useSimulationStore((state) => state.aiNavigationState);
  const diversionApproved = useSimulationStore((state) => state.diversionApproved);
  const promptDiversionModal = useSimulationStore((state) => state.promptDiversionModal);
  const dismissDiversion = useSimulationStore((state) => state.dismissDiversion);
  const setEntranceShare = useSimulationStore((state) => state.setEntranceShare);
  const applySurgePreset = useSimulationStore((state) => state.applySurgePreset);
  const toggleAiQueueNavigation = useSimulationStore((state) => state.toggleAiQueueNavigation);

  // Initialize and track scene changes
  useEffect(() => {
    initFromScene(scene);
  }, [scene.components, initFromScene]);

  // Check layout mutation during simulation
  useEffect(() => {
    checkLayoutChange(scene.components);
  }, [scene.components, checkLayoutChange]);

  const peakVisitors = scene.requirements?.peakVisitors || 1500;
  const isReady = pathData?.ready;

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-soft border border-stone-200/90 p-3.5 space-y-3 select-none">
      {/* Simulation Playback & Clock */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            simulationRunning ? (arrivalsPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse') : 'bg-stone-300'
          }`} />
          <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
            {simulationRunning ? (arrivalsPaused ? 'Arrivals Paused' : 'Simulating') : 'Ready'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-stone-700">
          <Clock className="w-3.5 h-3.5 text-stone-400" />
          <span>{metrics.formattedTime || '00:00:00'}</span>
        </div>
      </div>

      {/* Layout Changed Notice */}
      {layoutChangedNotice && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5 animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="font-medium text-[11px]">
              Layout changed — reset simulation to analyze the updated design.
            </p>
          </div>
          <button
            onClick={() => resetSimulation(scene)}
            className="w-full py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Reset Simulation
          </button>
        </div>
      )}

      {/* Invalid / Incomplete Layout Warning */}
      {!isReady && !layoutChangedNotice && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              {pathData.reason || 'Create a valid entrance → queue → darshan → exit layout before starting simulation.'}
            </p>
          </div>
        </div>
      )}

      {/* Primary Crowd Remote Controls */}
      <div className="space-y-2">
        {!simulationRunning ? (
          <div className="flex items-center gap-2">
            <button
              id="btn-start-sim"
              onClick={() => {
                startSimulation(scene);
                useQueueStore.getState().focusCamera('fit_crowd');
              }}
              disabled={!isReady}
              className="flex-1 py-2.5 px-3 bg-deva-maroon-700 hover:bg-deva-maroon-800 disabled:bg-stone-300 text-white rounded-xl text-xs font-bold shadow-soft transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed uppercase tracking-wider"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START SIMULATION</span>
            </button>

            <button
              id="btn-reset-sim"
              onClick={() => resetSimulation(scene)}
              disabled={metrics.simTimeSeconds === 0}
              className="p-2.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Reset Simulation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Status Indicator */}
            {!arrivalsPaused ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-wide">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>CROWD ARRIVALS ACTIVE</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>NEW ARRIVALS PAUSED</span>
                </div>
                <p className="text-[10px] text-amber-700 pl-4.5 italic">
                  People already inside continue moving.
                </p>
              </div>
            )}

            {/* Explicit Remote Action Button */}
            <div className="flex items-center gap-2">
              {!arrivalsPaused ? (
                <button
                  id="btn-pause-arrivals"
                  onClick={pauseArrivals}
                  className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-soft transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <Pause className="w-4 h-4" />
                  <span>PAUSE NEW ARRIVALS</span>
                </button>
              ) : (
                <button
                  id="btn-resume-arrivals"
                  onClick={resumeArrivals}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-soft transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>RESUME NEW ARRIVALS</span>
                </button>
              )}

              <button
                id="btn-reset-sim"
                onClick={() => resetSimulation(scene)}
                className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors cursor-pointer"
                title="Reset Simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Crowd Load & Injection Engine */}
      <div className="bg-stone-50/80 rounded-xl p-2.5 border border-stone-200/80 space-y-2 text-[11px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-stone-700">
            <Users className="w-3.5 h-3.5 text-deva-maroon-700" />
            <span>Crowd Load</span>
          </div>
          <button
            id="btn-toggle-arrivals"
            onClick={toggleArrivals}
            disabled={!simulationRunning}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              arrivalsPaused
                ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
            }`}
            title={arrivalsPaused ? 'Resume incoming devotees at gates' : 'Pause incoming devotees without removing existing people'}
          >
            {arrivalsPaused ? 'Arrivals Paused' : 'Arrivals Active'}
          </button>
        </div>

        {/* Planned Crowd vs Total Entered (Unbounded) */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-white rounded-lg p-1.5 border border-stone-200/60 shadow-xs">
          <div>
            <span className="text-stone-400 block text-[9px]">Planned:</span>
            <span className="font-semibold text-stone-700">
              {(metrics.plannedCrowd || peakVisitors).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-stone-400 block text-[9px]">Total Entered:</span>
            <span className="font-bold text-deva-maroon-800">
              {(metrics.totalEntered ?? metrics.visitorsEntered ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Arrival Rate */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          <div className="flex items-center gap-1 text-stone-600">
            <span className="text-[10px]">Rate:</span>
            <span className="font-bold font-mono text-[11px] text-stone-800">
              {metrics.currentArrivalRate || currentArrivalRate || 0}
            </span>
            <span className="text-[9px] text-stone-400">/min</span>
          </div>
        </div>

        {/* Batch Injection Buttons */}
        <div className="flex items-center gap-1 pt-1 border-t border-stone-200/60">
          <span className="text-[9px] text-stone-500 flex-shrink-0">Batch:</span>
          <button
            id="btn-inject-1k"
            onClick={() => addCrowdBatch(1000)}
            disabled={!simulationRunning}
            className="flex-1 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded text-[10px] font-semibold text-stone-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Inject +1,000 devotees immediately"
          >
            +1k
          </button>
          <button
            id="btn-inject-5k"
            onClick={() => addCrowdBatch(5000)}
            disabled={!simulationRunning}
            className="flex-1 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded text-[10px] font-semibold text-stone-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Inject +5,000 devotees immediately"
          >
            +5k
          </button>
          <button
            id="btn-inject-10k"
            onClick={() => addCrowdBatch(10000)}
            disabled={!simulationRunning}
            className="flex-1 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded text-[10px] font-semibold text-deva-maroon-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Inject +10,000 devotees immediately"
          >
            +10k
          </button>
        </div>
      </div>

      {/* Entrance Distribution & Relative Distribution Weights Control (PART 1 & 2) */}
      {(() => {
        const normWeights = normalizeEntranceWeights(entranceInflow || { north: 90, west: 20, east: 20 });
        return (
          <div className="bg-stone-50/90 rounded-xl p-2.5 border border-stone-200/90 space-y-2.5 text-[11px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-stone-800">
                <Compass className="w-3.5 h-3.5 text-deva-maroon-700" />
                <span>Entrance Distribution</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/60" title="Relative arrival distribution weights for new entrants">
                Distribution Weights
              </span>
            </div>

            {/* Quick Distribution Presets */}
            <div className="space-y-1">
              <span className="text-[9px] font-semibold text-stone-500 uppercase tracking-wider block">
                Distribution Presets:
              </span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button
                  id="preset-test-90-20-20"
                  onClick={() => applySurgePreset('test_90_20_20')}
                  className={`py-1 px-1.5 border rounded font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    entranceInflow?.north === 90 && entranceInflow?.west === 20 && entranceInflow?.east === 20
                      ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-xs'
                      : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                  title="North 90, West 20, East 20 relative weights (69.2% / 15.4% / 15.4%)"
                >
                  <span>🛕 90 / 20 / 20 (Test)</span>
                </button>
                <button
                  id="preset-test-40-30-30"
                  onClick={() => applySurgePreset('test_40_30_30')}
                  className={`py-1 px-1.5 border rounded font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    entranceInflow?.north === 40 && entranceInflow?.west === 30 && entranceInflow?.east === 30
                      ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-xs'
                      : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                  title="North 40, West 30, East 30 balanced weights (40% / 30% / 30%)"
                >
                  <span>⚖️ 40 / 30 / 30 (Balanced)</span>
                </button>
                <button
                  id="preset-balanced"
                  onClick={() => applySurgePreset('balanced')}
                  className={`py-1 px-1.5 border rounded font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    entranceInflow?.north === 50 && entranceInflow?.west === 25 && entranceInflow?.east === 25
                      ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-xs'
                      : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                  title="50 / 25 / 25 distribution"
                >
                  <span>⚖️ 50 / 25 / 25</span>
                </button>
                <button
                  id="preset-primary-north"
                  onClick={() => applySurgePreset('primary_north')}
                  className={`py-1 px-1.5 border rounded font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    entranceInflow?.north === 100 && entranceInflow?.west === 0 && entranceInflow?.east === 0
                      ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-xs'
                      : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                  title="100% flow enters strictly through North Gate"
                >
                  <span>🛕 North 100%</span>
                </button>
              </div>
            </div>

            {/* Gate Specific Sliders & Weights */}
            <div className="space-y-2 pt-1 border-t border-stone-200/60">
              {/* North Gate */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-stone-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    North Raja Gopuram:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-amber-900 bg-amber-100/70 px-1 rounded">
                      wt {entranceInflow?.north || 0}
                    </span>
                    <span className="font-mono text-[9px] text-stone-500">
                      ({normWeights.percentages.north}%)
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={entranceInflow?.north || 0}
                  onChange={(e) => setEntranceShare('north', Number(e.target.value))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              {/* West Gate */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-stone-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    West Pashchima Gopuram:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-sky-900 bg-sky-100/70 px-1 rounded">
                      wt {entranceInflow?.west || 0}
                    </span>
                    <span className="font-mono text-[9px] text-stone-500">
                      ({normWeights.percentages.west}%)
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={entranceInflow?.west || 0}
                  onChange={(e) => setEntranceShare('west', Number(e.target.value))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />
              </div>

              {/* East Gate */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-stone-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    East Purva Gopuram:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-purple-900 bg-purple-100/70 px-1 rounded">
                      wt {entranceInflow?.east || 0}
                    </span>
                    <span className="font-mono text-[9px] text-stone-500">
                      ({normWeights.percentages.east}%)
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={entranceInflow?.east || 0}
                  onChange={(e) => setEntranceShare('east', Number(e.target.value))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* AI Dynamic Queue Navigation Card */}
      <div className={`rounded-xl p-2.5 border transition-all space-y-2 text-[11px] ${
        aiNavigationState?.active
          ? 'bg-amber-50/90 border-amber-300 shadow-sm ring-1 ring-amber-400/40'
          : 'bg-stone-50/90 border-stone-200/90'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold">
            <Sparkles className={`w-3.5 h-3.5 ${aiNavigationState?.active ? 'text-amber-600 animate-spin' : 'text-stone-500'}`} />
            <span className={aiNavigationState?.active ? 'text-amber-950 font-bold' : 'text-stone-700'}>
              AI Smart Queue Router
            </span>
          </div>

          <button
            onClick={() => toggleAiQueueNavigation()}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
              aiQueueNavigationEnabled
                ? 'bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-200'
                : 'bg-stone-200 border-stone-300 text-stone-600 hover:bg-stone-300'
            }`}
            title="Automatically navigate queues from congested entrances to less-crowded areas"
          >
            {aiQueueNavigationEnabled ? 'AUTO-ROUTE ON' : 'OFF'}
          </button>
        </div>

        {/* Dynamic Status Display */}
        {aiNavigationState?.pendingApproval ? (
          <div className="p-2 rounded-xl bg-amber-100/90 border border-amber-300 space-y-2 animate-in fade-in">
            <div className="flex items-start gap-1.5 text-[10px] text-amber-950 font-semibold leading-tight">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
              <span>
                Congestion detected at {aiNavigationState.congestedStream?.toUpperCase()}! Recommend redirecting future arrivals to {aiNavigationState.targetStream?.toUpperCase()} via bridge.
              </span>
            </div>
            <button
              id="btn-open-diversion-modal"
              onClick={() => promptDiversionModal({
                congestedStream: aiNavigationState.congestedStream,
                targetStream: aiNavigationState.targetStream,
                congestedUtil: Math.round((aiNavigationState.disparity + 0.4) * 100),
                targetUtil: 30,
              })}
              className="w-full py-1.5 px-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg font-bold text-[10px] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3 text-amber-200" />
              <span>Redirect Future Arrivals</span>
            </button>
          </div>
        ) : aiNavigationState?.active ? (
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-300 space-y-1.5 animate-in fade-in shadow-sm">
            <div className="flex items-start gap-1.5 text-[10px] text-emerald-950 font-semibold leading-tight">
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
              <span>
                {aiNavigationState.message}
              </span>
            </div>
            <div className="flex items-center justify-between text-[9px] text-emerald-900 font-mono pt-1 border-t border-emerald-200/70">
              <span>Navigated devotees:</span>
              <span className="font-bold text-emerald-950 bg-emerald-200/80 px-1.5 py-0.5 rounded">
                +{aiNavigationState.divertedCount || 0} devotees
              </span>
            </div>
            <button
              id="btn-revoke-diversion"
              onClick={() => dismissDiversion()}
              className="w-full mt-1 py-1 px-2 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 rounded-md font-semibold text-[9px] transition-colors cursor-pointer"
            >
              Revoke & Close Transfer
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 bg-white/70 rounded-lg p-1.5 border border-stone-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>
              {aiQueueNavigationEnabled
                ? 'All entrance gates balanced. AI monitoring for surges.'
                : 'Intelligent re-routing disabled. Inflow follows entrance sliders directly.'}
            </span>
          </div>
        )}
      </div>

      {/* Speed Multipliers */}
      <div className="flex items-center justify-between gap-1 pt-1">
        <span className="text-[11px] font-semibold text-stone-500">Speed:</span>
        <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg">
          {[0.5, 1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => setSpeed(spd)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                speed === spd
                  ? 'bg-white text-deva-maroon-800 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {spd}×
            </button>
          ))}
        </div>
      </div>

      {/* Scale & Sampling Indicator */}
      <div className="bg-stone-50 rounded-xl p-2 border border-stone-200/60 text-[11px] space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-stone-500">Visual Agents:</span>
          <span className="font-bold text-stone-800">
            {metrics.visualAgentsCount} / {metrics.targetVisualAgents}
          </span>
        </div>
        <div className="text-[10px] text-stone-400">
          Representing {peakVisitors.toLocaleString()} peak concurrent devotees
        </div>
      </div>

      {/* Individual Logical Devotee Inspector & Manager Search */}
      <DevoteeDetailPanel />

      {/* 3D Visualization Toggles */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100">
        <button
          id="toggle-show-paths"
          onClick={() => setShowPaths(!showPaths)}
          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            showPaths
              ? 'bg-deva-gold-50 border-deva-gold-300 text-deva-maroon-800'
              : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Route className="w-3.5 h-3.5" />
          <span>Flow Paths</span>
        </button>

        <button
          id="toggle-show-density"
          onClick={() => setShowDensity(!showDensity)}
          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            showDensity
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>3D Density</span>
        </button>
      </div>
    </div>
  );
}
