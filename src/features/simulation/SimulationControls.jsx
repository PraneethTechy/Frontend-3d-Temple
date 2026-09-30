import React, { useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Flame, 
  Route, 
  Clock, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { useSimulationStore } from './simulationStore.js';
import { useQueueStore } from '../../store/useQueueStore.js';

export function SimulationControls() {
  const scene = useQueueStore((state) => state.scene);

  const status = useSimulationStore((state) => state.status);
  const speed = useSimulationStore((state) => state.speed);
  const showPaths = useSimulationStore((state) => state.showPaths);
  const showDensity = useSimulationStore((state) => state.showDensity);
  const metrics = useSimulationStore((state) => state.metrics);
  const pathData = useSimulationStore((state) => state.pathData);
  const layoutChangedNotice = useSimulationStore((state) => state.layoutChangedNotice);

  const initFromScene = useSimulationStore((state) => state.initFromScene);
  const startSimulation = useSimulationStore((state) => state.startSimulation);
  const pauseSimulation = useSimulationStore((state) => state.pauseSimulation);
  const resetSimulation = useSimulationStore((state) => state.resetSimulation);
  const setSpeed = useSimulationStore((state) => state.setSpeed);
  const setShowPaths = useSimulationStore((state) => state.setShowPaths);
  const setShowDensity = useSimulationStore((state) => state.setShowDensity);
  const checkLayoutChange = useSimulationStore((state) => state.checkLayoutChange);

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
            status === 'running' ? 'bg-emerald-500 animate-pulse' : status === 'paused' ? 'bg-amber-500' : 'bg-stone-300'
          }`} />
          <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
            {status === 'running' ? 'Simulating' : status === 'paused' ? 'Paused' : 'Ready'}
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

      {/* Primary Playback Buttons */}
      <div className="flex items-center gap-2">
        {status === 'running' ? (
          <button
            id="btn-pause-sim"
            onClick={pauseSimulation}
            className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-soft transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Pause className="w-4 h-4" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            id="btn-start-sim"
            onClick={() => {
              startSimulation(scene);
              useQueueStore.getState().focusCamera('fit_crowd');
            }}
            disabled={!isReady}
            className="flex-1 py-2 px-3 bg-deva-maroon-700 hover:bg-deva-maroon-800 disabled:bg-stone-300 text-white rounded-xl text-xs font-semibold shadow-soft transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{status === 'paused' ? 'Resume' : 'Start Simulation'}</span>
          </button>
        )}

        <button
          id="btn-reset-sim"
          onClick={() => resetSimulation(scene)}
          disabled={status === 'idle' && metrics.simTimeSeconds === 0}
          className="p-2 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
          title="Reset Simulation"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
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
