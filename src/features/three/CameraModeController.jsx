import React, { useState } from 'react';
import { Eye, Box, RotateCcw, Compass, Maximize2, Users, Landmark, Focus, ChevronUp, Sparkles, Flame } from 'lucide-react';
import { useQueueStore } from '../../store/useQueueStore.js';

export function CameraModeController() {
  const isImmersive = useQueueStore((state) => state.isImmersive);
  const cameraMode = useQueueStore((state) => state.cameraMode);
  const setCameraMode = useQueueStore((state) => state.setCameraMode);
  const triggerResetCamera = useQueueStore((state) => state.triggerResetCamera);
  const focusCamera = useQueueStore((state) => state.focusCamera);
  const selectedComponentId = useQueueStore((state) => state.selectedComponentId);
  const [showPresets, setShowPresets] = useState(false);

  // In Immersive 3D Review mode, the compact ImmersiveToolbar takes over
  if (isImmersive) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-auto">
      {/* Expandable Camera Presets Tray */}
      {showPresets && (
        <div className="flex items-center gap-1 p-1 bg-stone-900/90 backdrop-blur-md border border-stone-700/80 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 text-white">
          {/* 1. OVERVIEW */}
          <button
            id="btn-cam-view-overview"
            onClick={() => focusCamera('overview')}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-stone-800 text-stone-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Overview of the entire temple campus"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Overview</span>
          </button>

          {/* 2. ENTRANCE */}
          <button
            id="btn-cam-view-entrance"
            onClick={() => focusCamera('entrance')}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-stone-800 text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Entrance Gopuram and arrival forecourt"
          >
            <span>🛕 Entrance</span>
          </button>

          {/* 3. QUEUE */}
          <button
            id="btn-cam-view-queue"
            onClick={() => focusCamera('queue')}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-stone-800 text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Queue channels and devotee movement"
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Queue</span>
          </button>

          {/* 4. DARSHAN VIEW (Key Requirement) */}
          <button
            id="btn-cam-view-darshan"
            onClick={() => focusCamera('darshan_view')}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/25 border border-amber-400/60 hover:bg-amber-500/35 text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Close view of incoming queue, sanctum portal & sacred deity"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Darshan View</span>
          </button>

          {/* 5. DARSHAN INTERIOR (Devotee Human Eye-Level Sacred Vista) */}
          <button
            id="btn-cam-view-darshan-interior"
            onClick={() => focusCamera('darshan_interior')}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-600/30 border border-amber-300/80 hover:bg-amber-600/40 text-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Devotee eye-level perspective inside mandapa approach corridor and sanctum"
          >
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span>Darshan Interior</span>
          </button>

          {/* 5. SIMULATION */}
          <button
            id="btn-cam-view-simulation"
            onClick={() => focusCamera('simulation')}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-stone-800 text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
            title="Full simulation crowd operations view"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulation</span>
          </button>

          <div className="w-[1px] h-4 bg-stone-700 mx-0.5" />

          {/* Additional Architectural Presets */}
          <button
            id="btn-cam-focus-main-gopuram"
            onClick={() => focusCamera('focus_main_gopuram')}
            className="px-2 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-stone-800 text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
            title="Central Raja Gopuram"
          >
            <span>👑 Raja Gopuram</span>
          </button>

          <button
            id="btn-cam-focus-south"
            onClick={() => focusCamera('focus_south_gopuram')}
            className="px-2 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-stone-800 text-emerald-300 hover:text-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="South Exit Gopuram"
          >
            <span>🚪 South Exit</span>
          </button>

          {selectedComponentId && (
            <button
              id="btn-cam-focus-selected"
              onClick={() => focusCamera('focus_selected')}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-stone-800 text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Focus on currently selected component"
            >
              <Focus className="w-3.5 h-3.5" />
              <span>Selected</span>
            </button>
          )}
        </div>
      )}

      {/* Primary Camera Toolbar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-md border border-stone-200/90 rounded-2xl shadow-elevated">
        {/* 2D Design Mode Button */}
        <button
          id="btn-camera-2d"
          onClick={() => setCameraMode('2d')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
            cameraMode === '2d'
              ? 'bg-deva-maroon-800 text-white shadow-sm shadow-deva-maroon-900/20'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
          }`}
          title="Top-down orthographic drafting view"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>2D DESIGN</span>
        </button>

        {/* 3D View Mode Button */}
        <button
          id="btn-camera-3d"
          onClick={() => setCameraMode('3d')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
            cameraMode === '3d'
              ? 'bg-deva-maroon-800 text-white shadow-sm shadow-deva-maroon-900/20'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
          }`}
          title="3D perspective visualization view"
        >
          <Box className="w-3.5 h-3.5" />
          <span>3D VIEW</span>
        </button>

        <div className="w-[1px] h-5 bg-stone-200 mx-1" />

        {/* Camera Views & Presets Toggle */}
        <button
          id="btn-camera-presets-toggle"
          onClick={() => setShowPresets(!showPresets)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
            showPresets
              ? 'bg-amber-100 text-amber-900'
              : 'text-stone-600 hover:text-deva-maroon-800 hover:bg-deva-maroon-50/60'
          }`}
          title="Architectural and crowd camera focus views"
        >
          <Landmark className="w-3.5 h-3.5 text-amber-600" />
          <span>Camera Views</span>
          <ChevronUp className={`w-3.5 h-3.5 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
        </button>

        <div className="w-[1px] h-5 bg-stone-200 mx-0.5" />

        {/* Reset Camera Button */}
        <button
          id="btn-camera-reset"
          onClick={triggerResetCamera}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-600 hover:text-deva-maroon-800 hover:bg-deva-maroon-50/60 transition-all duration-150 cursor-pointer"
          title="Recenter view to fit site dimensions"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Camera</span>
        </button>
      </div>

      {/* Helpful navigation indicator */}
      <div className="flex items-center gap-2 px-3 py-1 bg-stone-900/70 backdrop-blur-md rounded-full text-[10px] text-stone-300 font-medium">
        <Compass className="w-3 h-3 text-amber-400" />
        <span>
          {cameraMode === '3d'
            ? 'Left Click: Orbit • Right Click: Pan • Scroll: Zoom'
            : 'Left/Right Click: Pan • Scroll: Zoom (Top-Down CAD)'}
        </span>
      </div>
    </div>
  );
}
