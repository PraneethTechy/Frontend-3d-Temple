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
import { NavigationCorridors } from './components/NavigationCorridors.jsx';
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

export const SceneCanvas = React.memo(function SceneCanvas() {
  const [contextLost, setContextLost] = React.useState(false);
  const [canvasKey, setCanvasKey] = React.useState(0);
  const site = useQueueStore((state) => state.scene?.site || { length: 100, width: 75, unit: 'meters' });
  const sceneComponents = useQueueStore((state) => state.scene?.components || []);
  const cameraMode = useQueueStore((state) => state.cameraMode);
  const cameraResetCount = useQueueStore((state) => state.cameraResetCount);
  const setSelectedComponentId = useQueueStore((state) => state.setSelectedComponentId);
  const previewLayout = useQueueStore((state) => state.previewLayout);
  const isPreviewing = useQueueStore((state) => state.isPreviewing);
  const exitPreview = useQueueStore((state) => state.exitPreview);
  const applyAiRecommendation = useQueueStore((state) => state.applyAiRecommendation);
  const applyCapacityExpansion = useQueueStore((state) => state.applyCapacityExpansion);
  const discardCapacityExpansion = useQueueStore((state) => state.discardCapacityExpansion);

  const { length, width, unit } = site;
  const componentsToRender = isPreviewing && previewLayout
    ? (previewLayout.components || [])
    : sceneComponents;

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#FAF7F0] to-[#EFEAE1] select-none isolate z-0">
      {contextLost && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-stone-900/80 backdrop-blur-sm text-white gap-3 p-4">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <span className="text-sm font-semibold">Graphics Context Restoring...</span>
          <button
            onClick={() => {
              setContextLost(false);
              setCanvasKey((k) => k + 1);
            }}
            className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Recover 3D Viewport
          </button>
        </div>
      )}
      <Suspense fallback={<CanvasFallback />}>
        <Canvas
          key={canvasKey}
          shadows
          dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)]}
          resize={{ scroll: false, debounce: 0 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false,
          }}
          className="w-full h-full"
          onCreated={({ gl }) => {
            const canvasEl = gl.domElement;
            if (!canvasEl) return;

            const handleContextLost = (event) => {
              // Critical: preventDefault() tells browser not to destroy context permanently
              event.preventDefault();
              console.warn('[DevaSetu 3D] WebGL context lost. Preventing default to allow restoration...');
              setContextLost(true);
            };

            const handleContextRestored = () => {
              console.log('[DevaSetu 3D] WebGL context restored successfully.');
              setContextLost(false);
              gl.resetState?.();
              setCanvasKey((k) => k + 1);
            };

            canvasEl.addEventListener('webglcontextlost', handleContextLost, false);
            canvasEl.addEventListener('webglcontextrestored', handleContextRestored, false);
          }}
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
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
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
          <NavigationCorridors />
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
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-300">
              {previewLayout.type === 'capacity_expansion' ? 'Capacity Expansion Preview:' : '3D Preview:'}
            </span>
            <span className="text-xs font-medium text-stone-100">{previewLayout.title}</span>
            <span className="text-[11px] text-stone-400 ml-1">
              {previewLayout.type === 'capacity_expansion' ? (
                <span>
                  (+{previewLayout.additionalCapacity || previewLayout.expectedCapacityIncrease || 0} Capacity •{' '}
                  {previewLayout.expansionComponents?.length || 0} New Lanes)
                </span>
              ) : (
                <span>
                  (Capacity: {previewLayout.analysis?.metrics?.queueCapacity?.toLocaleString() || 0} • Wait:{' '}
                  {previewLayout.analysis?.metrics?.estimatedWaitMinutes || 0}m)
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {previewLayout.type === 'capacity_expansion' ? (
              <>
                <button
                  id="btn-banner-apply-expansion"
                  data-testid="btn-banner-apply-expansion"
                  onClick={() => applyCapacityExpansion(previewLayout)}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-full shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Apply to Layout
                </button>
                <button
                  id="btn-banner-discard-expansion"
                  data-testid="btn-banner-discard-expansion"
                  onClick={discardCapacityExpansion}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Discard
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      )}

      {/* Unified Minimal 3D Viewport Toolbar */}
      <ImmersiveToolbar />
    </div>
  );
});
