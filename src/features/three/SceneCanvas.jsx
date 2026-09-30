import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useQueueStore } from '../../store/useQueueStore.js';
import { SiteFloor } from './SiteFloor.jsx';
import { SiteBoundary } from './SiteBoundary.jsx';
import { DesignGrid } from './DesignGrid.jsx';
import { DimensionLabels } from './DimensionLabels.jsx';
import { CameraController } from './CameraController.jsx';
import { ComponentWrapper } from './components/ComponentWrapper.jsx';
import { TempleAxis } from './components/TempleAxis.jsx';
import { SimulationAgents } from '../simulation/SimulationAgents.jsx';
import { SimulationPath } from '../simulation/SimulationPath.jsx';
import { SimulationHeatmap } from '../simulation/SimulationHeatmap.jsx';
import { FlowIndicators } from './FlowIndicators.jsx';
import { ImmersiveToolbar } from '../designer/ImmersiveToolbar.jsx';
import { Loader2, Sparkles, Check, X } from 'lucide-react';

function CanvasFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-deva-ivory-100 text-stone-500 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-deva-maroon-700" />
      <span className="text-sm font-medium">Initializing 3D Spatial Canvas...</span>
    </div>
  );
}

export function SceneCanvas() {
  const scene = useQueueStore((state) => state.scene);
  const cameraMode = useQueueStore((state) => state.cameraMode);
  const cameraResetCount = useQueueStore((state) => state.cameraResetCount);
  const setSelectedComponentId = useQueueStore((state) => state.setSelectedComponentId);
  const previewLayout = useQueueStore((state) => state.previewLayout);
  const isPreviewing = useQueueStore((state) => state.isPreviewing);
  const exitPreview = useQueueStore((state) => state.exitPreview);
  const applyAiRecommendation = useQueueStore((state) => state.applyAiRecommendation);

  const { length, width, unit } = scene.site;
  const componentsToRender = isPreviewing && previewLayout
    ? (previewLayout.components || [])
    : (scene.components || []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#FAF7F0] to-[#EFEAE1] select-none">
      <Suspense fallback={<CanvasFallback />}>
        <Canvas
          shadows
          dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.75)]}
          resize={{ scroll: false, debounce: { scroll: 50, resize: 50 } }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          className="w-full h-full"
          onPointerMissed={(e) => {
            // Deselect when clicking empty space
            if (e.type === 'click') {
              setSelectedComponentId(null);
            }
          }}
        >
          {/* Studio Lighting Setup */}
          <color attach="background" args={['#F5F1E8']} />
          <ambientLight intensity={0.7} color="#FFFDF7" />
          
          <directionalLight
            position={[40, 75, 40]}
            intensity={1.15}
            color="#FFF8EE"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-left={-140}
            shadow-camera-right={140}
            shadow-camera-top={110}
            shadow-camera-bottom={-110}
            shadow-camera-near={1}
            shadow-camera-far={450}
            shadow-bias={-0.0003}
          />
          
          <hemisphereLight
            skyColor="#FFFDF5"
            groundColor="#D8D0C2"
            intensity={0.45}
          />

          {/* Camera Controller with smooth reset and mode switching */}
          <CameraController
            cameraMode={cameraMode}
            resetCount={cameraResetCount}
            length={length}
            width={width}
            unit={unit}
          />

          {/* 3D Site Elements */}
          <SiteFloor length={length} width={width} unit={unit} />
          <SiteBoundary length={length} width={width} unit={unit} />
          <DesignGrid length={length} width={width} unit={unit} />
          <DimensionLabels length={length} width={width} unit={unit} />

          {/* Placed Interactive 3D Queue Components (or Temporary AI Preview) */}
          <group name="scene-queue-components">
            {componentsToRender.map((comp) => (
              <ComponentWrapper key={comp.id} component={comp} />
            ))}
          </group>

          {/* Sacred Temple Axis Visualizer */}
          <TempleAxis />

          {/* Phase 5: Deterministic Crowd Simulation 3D Layers */}
          <SimulationPath />
          <SimulationHeatmap />
          <SimulationAgents />

          {/* Phase 8: Sacred Directional Flow Indicators */}
          <FlowIndicators />
        </Canvas>
      </Suspense>

      {/* Floating AI Preview Banner */}
      {isPreviewing && previewLayout && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-stone-900/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-2xl border border-stone-700/80 flex items-center gap-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-300">3D Preview:</span>
            <span className="text-xs font-medium text-stone-100">{previewLayout.title}</span>
            <span className="text-[11px] text-stone-400 ml-1">
              (Capacity: {previewLayout.analysis?.metrics?.queueCapacity?.toLocaleString() || 0} • Wait: {previewLayout.analysis?.metrics?.estimatedWaitMinutes || 0}m)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-banner-apply-ai"
              onClick={() => applyAiRecommendation(previewLayout)}
              className="px-3.5 py-1.5 bg-deva-maroon-700 hover:bg-deva-maroon-800 text-white text-xs font-semibold rounded-full shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Layout
            </button>
            <button
              id="btn-banner-exit-preview"
              onClick={exitPreview}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-full transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Exit Preview
            </button>
          </div>
        </div>
      )}

      {/* Unified Minimal 3D Viewport Toolbar */}
      <ImmersiveToolbar />
    </div>
  );
}
