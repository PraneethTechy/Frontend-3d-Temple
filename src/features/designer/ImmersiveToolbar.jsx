import React, { useState } from 'react';
import { 
  Eye, 
  Box, 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  Landmark, 
  GitBranch, 
  Tag, 
  ChevronUp, 
  Focus
} from 'lucide-react';
import { useQueueStore } from '../../store/useQueueStore.js';
import { useSimulationStore } from '../simulation/simulationStore.js';

/**
 * Professional Viewport Control Toolbar (Points 9, 15, 16, 17)
 * Groups:
 * VIEW: [2D] [3D]
 * CAMERA: [Camera] [Fit]
 * SIMULATION: [Play/Pause]
 * VISUAL: [Flow] [Labels]
 * FOCUS: [Focus 3D (F)]
 */
export function ImmersiveToolbar() {
  const isImmersive = useQueueStore((state) => state.isImmersive);
  const toggleImmersive = useQueueStore((state) => state.toggleImmersive);
  const cameraMode = useQueueStore((state) => state.cameraMode);
  const setCameraMode = useQueueStore((state) => state.setCameraMode);
  const focusCamera = useQueueStore((state) => state.focusCamera);
  const selectedComponentId = useQueueStore((state) => state.selectedComponentId);
  const showFlow = useQueueStore((state) => state.showFlow);
  const toggleShowFlow = useQueueStore((state) => state.toggleShowFlow);
  const showLabels = useQueueStore((state) => state.showLabels);
  const toggleShowLabels = useQueueStore((state) => state.toggleShowLabels);

  // Simulation store state & actions
  const simStatus = useSimulationStore((state) => state.status);
  const runSimulation = useSimulationStore((state) => state.runSimulation);
  const pauseSimulation = useSimulationStore((state) => state.pauseSimulation);
  const resumeSimulation = useSimulationStore((state) => state.resumeSimulation);
  const scene = useQueueStore((state) => state.scene);

  const [showPresetsMenu, setShowPresetsMenu] = useState(false);

  const handleSimToggle = () => {
    if (simStatus === 'running') {
      pauseSimulation();
    } else if (simStatus === 'paused') {
      resumeSimulation();
    } else {
      runSimulation(scene);
    }
  };

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-auto select-none">
      {/* Expandable Camera Presets Menu */}
      {showPresetsMenu && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 p-2 bg-stone-900/95 backdrop-blur-xl border border-stone-700/80 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 text-white max-w-xl">
          <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider px-2 py-0.5 w-full text-center border-b border-stone-800">
            Sacred Campus Camera Presets
          </div>

          {/* 1. OVERVIEW */}
          <button
            id="btn-preset-overview"
            onClick={() => {
              focusCamera('overview');
              setShowPresetsMenu(false);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-800/80 hover:bg-stone-700 text-stone-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Overview of all 4 perimeter gopurams and Main Temple"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>1. OVERVIEW</span>
          </button>

          {/* 2. NORTH ENTRANCE */}
          <button
            id="btn-preset-north"
            onClick={() => {
              focusCamera('north_entrance');
              setShowPresetsMenu(false);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-800/80 hover:bg-stone-700 text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Focus North Entrance Gopuram"
          >
            <span>🛕 2. NORTH</span>
          </button>

          {/* 3. WEST ENTRANCE */}
          <button
            id="btn-preset-west"
            onClick={() => {
              focusCamera('west_entrance');
              setShowPresetsMenu(false);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-800/80 hover:bg-stone-700 text-sky-300 hover:text-sky-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Focus West Entrance Gopuram"
          >
            <span>🛕 3. WEST</span>
          </button>

          {/* 4. EAST ENTRANCE */}
          <button
            id="btn-preset-east"
            onClick={() => {
              focusCamera('east_entrance');
              setShowPresetsMenu(false);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-800/80 hover:bg-stone-700 text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Focus East Entrance Gopuram"
          >
            <span>🛕 4. EAST</span>
          </button>

          {/* 5. MAIN DARSHAN */}
          <button
            id="btn-preset-main"
            onClick={() => {
              focusCamera('main_darshan');
              setShowPresetsMenu(false);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
            title="Majestic view of Central Main Raja Gopuram"
          >
            <span>👑 5. MAIN DARSHAN</span>
          </button>

          {/* 6. DARSHAN SANCTUM */}
          <button
            id="btn-preset-sanctum"
            onClick={() => {
              focusCamera('darshan_sanctum');
              setShowPresetsMenu(false);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-800/80 hover:bg-stone-700 text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Focus on Inner Garbhagriha Sanctum"
          >
            <span>🛕 6. SANCTUM</span>
          </button>

          {/* 7. SOUTH EXIT */}
          <button
            id="btn-preset-south"
            onClick={() => {
              focusCamera('south_exit');
              setShowPresetsMenu(false);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/60 text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
            title="Focus South Exit Gopuram"
          >
            <span>🚪 7. SOUTH EXIT</span>
          </button>

          {/* 8. SELECTED COMPONENT */}
          {selectedComponentId && (
            <button
              id="btn-preset-selected"
              onClick={() => {
                focusCamera('selected_component', selectedComponentId);
                setShowPresetsMenu(false);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-800/80 hover:bg-stone-700 text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
              title="Focus currently selected component"
            >
              <Focus className="w-3.5 h-3.5 text-emerald-400" />
              <span>SELECTED</span>
            </button>
          )}
        </div>
      )}

      {/* Grouped Viewport Control Bar (Point 15) */}
      <div className="flex items-center gap-2 p-1.5 bg-stone-900/90 backdrop-blur-xl border border-stone-700/80 rounded-2xl shadow-2xl text-white">
        {/* GROUP 1: VIEW [2D] [3D] */}
        <div className="flex items-center bg-stone-800/80 rounded-xl p-0.5 border border-stone-700/60">
          <button
            id="btn-toolbar-2d"
            onClick={() => setCameraMode('2d')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              cameraMode === '2d'
                ? 'bg-deva-maroon-700 text-white shadow-xs'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
            title="Top-down 2D drafting view"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>2D</span>
          </button>
          <button
            id="btn-toolbar-3d"
            onClick={() => setCameraMode('3d')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              cameraMode === '3d'
                ? 'bg-deva-maroon-700 text-white shadow-xs'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
            title="3D perspective visualization view"
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D</span>
          </button>
        </div>

        <div className="w-[1px] h-4 bg-stone-700/80" />

        {/* GROUP 2: CAMERA [Camera] [Fit] */}
        <div className="flex items-center gap-1">
          <button
            id="btn-toolbar-camera"
            onClick={() => setShowPresetsMenu(!showPresetsMenu)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              showPresetsMenu
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
            title="Campus Camera Presets"
          >
            <Landmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Camera</span>
            <ChevronUp className={`w-3 h-3 transition-transform ${showPresetsMenu ? 'rotate-180' : ''}`} />
          </button>

          <button
            id="btn-toolbar-fit"
            onClick={() => focusCamera('overview')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-stone-300 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            title="Fit full campus into view"
          >
            <Maximize2 className="w-3.5 h-3.5 text-stone-400" />
            <span>Fit</span>
          </button>
        </div>

        <div className="w-[1px] h-4 bg-stone-700/80" />

        {/* GROUP 3: SIMULATION [Play/Pause] */}
        <button
          id="btn-toolbar-simulation"
          onClick={handleSimToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            simStatus === 'running'
              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
          }`}
          title={simStatus === 'running' ? 'Pause Simulation' : 'Run Simulation'}
        >
          {simStatus === 'running' ? (
            <>
              <Pause className="w-3.5 h-3.5 text-white" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Simulation</span>
            </>
          )}
        </button>

        <div className="w-[1px] h-4 bg-stone-700/80" />

        {/* GROUP 4: VISUAL [Flow] [Labels] */}
        <div className="flex items-center gap-0.5">
          <button
            id="btn-toolbar-flow"
            onClick={toggleShowFlow}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              showFlow
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
            title="Toggle Pilgrim Directional Flow Guides"
          >
            <GitBranch className="w-3.5 h-3.5 text-amber-400" />
            <span>Flow</span>
          </button>

          <button
            id="btn-toolbar-labels"
            onClick={toggleShowLabels}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              showLabels
                ? 'bg-stone-700/80 text-amber-300'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
            title="Toggle 3D Floating Labels"
          >
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            <span>Labels</span>
          </button>
        </div>

        <div className="w-[1px] h-4 bg-stone-700/80" />

        {/* GROUP 5: FOCUS [Focus 3D (F)] (Point 16) */}
        <button
          id={isImmersive ? "btn-exit-immersive" : "btn-toolbar-focus-3d"}
          onClick={toggleImmersive}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
            isImmersive
              ? 'bg-stone-800 text-stone-200 border border-stone-600 hover:bg-stone-700 hover:text-white'
              : 'bg-deva-maroon-800 hover:bg-deva-maroon-700 text-white border border-deva-gold-400/40 shadow-xs'
          }`}
          title={isImmersive ? "Return to Design Studio (Shortcut: F or Esc)" : "Focus 3D Studio View (Shortcut: F)"}
        >
          {isImmersive ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-deva-gold-300" />
              <span>Exit Focus</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-deva-gold-300" />
              <span>Focus 3D</span>
            </>
          )}
          <span className="hidden sm:inline px-1 py-0.2 bg-black/40 rounded text-[9px] text-deva-gold-200 font-mono">F</span>
        </button>
      </div>
    </div>
  );
}
