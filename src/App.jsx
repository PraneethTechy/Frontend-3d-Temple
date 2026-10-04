import React from 'react';
import { useQueueStore } from './store/useQueueStore.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { CreatePlanForm } from './features/designer/CreatePlanForm.jsx';
import { DesignerHeader } from './features/designer/DesignerHeader.jsx';
import { ComponentsPanel } from './features/designer/ComponentsPanel.jsx';
import { SpaceInfoPanel } from './features/designer/SpaceInfoPanel.jsx';
import { SceneCanvas } from './features/three/SceneCanvas.jsx';
import { SavePlanModal } from './features/designer/SavePlanModal.jsx';
import { SavedPlansModal } from './features/designer/SavedPlansModal.jsx';
import { LiveEntranceFlowPanel } from './features/simulation/LiveEntranceFlowPanel.jsx';
import { DiversionApprovalModal } from './features/simulation/DiversionApprovalModal.jsx';
import { useSimulationStore } from './features/simulation/simulationStore.js';
import { Sparkles, ChevronLeft, ChevronRight, Layers, Activity } from 'lucide-react';

export default function App() {
  const isInitialized = useQueueStore((state) => state.isInitialized);
  const isFormModalOpen = useQueueStore((state) => state.isFormModalOpen);
  const setFormModalOpen = useQueueStore((state) => state.setFormModalOpen);
  const activeSidebarTab = useQueueStore((state) => state.activeSidebarTab);

  // Phase 8: Immersive Review & Panel Collapse States
  const isImmersive = useQueueStore((state) => state.isImmersive);
  const leftPanelCollapsed = useQueueStore((state) => state.leftPanelCollapsed);
  const leftPanelWidth = useQueueStore((state) => state.leftPanelWidth) || 320;
  const setLeftPanelWidth = useQueueStore((state) => state.setLeftPanelWidth);
  const rightPanelCollapsed = useQueueStore((state) => state.rightPanelCollapsed);
  const toggleLeftPanel = useQueueStore((state) => state.toggleLeftPanel);
  const toggleRightPanel = useQueueStore((state) => state.toggleRightPanel);

  // Simulation Mode Active State (PART 1 & 20)
  // Mode-based UI switch: 'analysis' shows LiveEntranceFlowPanel; 'planner'/'info' restores ComponentsPanel.
  const isSimulationMode = activeSidebarTab === 'analysis';

  // Drag-to-resize Left Sidebar Handler
  const handleLeftResizeStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftPanelWidth;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setLeftPanelWidth(startWidth + deltaX);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Activate global keyboard shortcuts (Undo, Redo, Duplicate, Delete, Esc, Modes, Immersive 'F')
  useKeyboardShortcuts();

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-deva-ivory-100 font-sans text-stone-800">
      {/* Top Header with Brand, Active Site, Workflow Modes & Immersive Toggle */}
      {!isImmersive && <DesignerHeader />}

      {/* Main View Area */}
      {!isInitialized ? (
        // Initial First Screen: "Create Queue Plan" Page
        <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-deva-ivory-50 via-deva-ivory-100 to-stone-200/40">
          <div className="w-full max-w-2xl text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-deva-gold-100/70 border border-deva-gold-300/60 rounded-full text-deva-gold-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-deva-gold-600" />
              DevaSetu Sacred Spatial Intelligence
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight font-serif sm:text-4xl">
              Smart Queue Spatial Designer
            </h1>
            <p className="mt-2 text-sm text-stone-600 max-w-lg mx-auto">
              Precision 3D crowd-management and pilgrimage queuing capacity planner. Define physical space boundaries to initialize the interactive environment.
            </p>
          </div>

          {/* Form Container */}
          <CreatePlanForm />
        </main>
      ) : (
        // Active 3D Workspace Layout
        <main className="flex-1 flex overflow-hidden relative">
          {/* Left Panel: Active Queue Components Tools OR Live Entrance Flow in Simulation Mode */}
          {!isImmersive && (
            leftPanelCollapsed ? (
              <aside 
                onClick={toggleLeftPanel}
                className="w-12 h-full bg-white/95 backdrop-blur-md border-r border-stone-200/80 flex flex-col items-center py-4 flex-shrink-0 z-20 transition-colors select-none cursor-pointer hover:bg-stone-50 group"
                title={isSimulationMode ? "Click to expand Live Entrance Flow" : "Click to expand Components Library"}
              >
                <button
                  id="btn-expand-left-panel"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLeftPanel();
                  }}
                  className="w-8 h-8 rounded-xl bg-stone-50 group-hover:bg-white border border-stone-200/80 flex items-center justify-center text-stone-700 group-hover:text-stone-900 transition-colors cursor-pointer shadow-2xs"
                  title={isSimulationMode ? "Expand Live Entrance Flow" : "Expand Components Library"}
                >
                  {isSimulationMode ? (
                    <Activity className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform animate-pulse" />
                  ) : (
                    <Layers className="w-4 h-4 text-stone-600 group-hover:scale-110 transition-transform" />
                  )}
                </button>
                <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold uppercase tracking-widest text-stone-400 group-hover:text-stone-700 transition-colors mt-6 select-none">
                  {isSimulationMode ? "LIVE ENTRANCE FLOW" : "COMPONENTS"}
                </span>
              </aside>
            ) : (
              <div 
                className="relative h-full flex-shrink-0 flex"
                style={{ width: `${leftPanelWidth}px` }}
              >
                {isSimulationMode ? (
                  <LiveEntranceFlowPanel />
                ) : (
                  <ComponentsPanel />
                )}

                {/* Draggable Resize Handle on Right Border */}
                <div
                  onMouseDown={handleLeftResizeStart}
                  className="absolute -right-1 top-0 bottom-0 w-2.5 z-40 cursor-col-resize hover:bg-deva-maroon-500/20 active:bg-deva-maroon-500/40 transition-colors flex items-center justify-center group select-none"
                  title="Drag to resize panel width (Double-click to toggle width)"
                  onDoubleClick={() => setLeftPanelWidth(leftPanelWidth > 360 ? 320 : 440)}
                >
                  <div className="w-0.5 h-10 bg-stone-300 group-hover:bg-deva-maroon-600 rounded-full transition-colors" />
                </div>

                {/* Collapse button on inner border */}
                <button
                  id="btn-collapse-left-panel"
                  onClick={toggleLeftPanel}
                  className="absolute -right-3 top-1/2 -translate-y-1/2 z-40 w-6 h-12 bg-white hover:bg-stone-50 border border-stone-200 rounded-full shadow-md flex items-center justify-center text-stone-500 hover:text-stone-800 transition-all cursor-pointer hover:scale-105"
                  title={isSimulationMode ? "Collapse Live Entrance Flow" : "Collapse Components Library"}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          )}

          {/* Minimal Floating Brand in Focus 3D Mode */}
          {isImmersive && (
            <div className="absolute top-4 left-4 z-40 flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-stone-900/85 backdrop-blur-md border border-stone-700/70 text-white shadow-xl select-none animate-in fade-in duration-200">
              <div className="w-6 h-6 rounded-lg bg-deva-maroon-800 flex items-center justify-center text-deva-gold-300">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold font-serif leading-none">DevaSetu 3D Designer</div>
                <div className="text-[9px] text-stone-400 leading-none mt-0.5">Focus 3D Studio</div>
              </div>
            </div>
          )}

          {/* Center Area: Interactive 3D Canvas */}
          <section className="flex-1 relative h-full overflow-hidden">
            <SceneCanvas />
          </section>

          {/* Right Panel: Space Information & Component Properties */}
          {!isImmersive && (
            rightPanelCollapsed ? (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 z-30">
                <button
                  id="btn-expand-right-panel"
                  onClick={toggleRightPanel}
                  className="flex items-center justify-center w-5 h-14 bg-white/95 hover:bg-stone-100 border-l border-t border-b border-stone-300/80 rounded-l-lg shadow-md text-stone-600 hover:text-stone-900 transition-all cursor-pointer group"
                  title="Expand Space & Analytics Panel"
                >
                  <ChevronLeft className="w-4 h-4 text-stone-500 group-hover:scale-110" />
                </button>
              </div>
            ) : (
              <div className="relative h-full flex-shrink-0 flex">
                {/* Collapse button on inner border */}
                <button
                  id="btn-collapse-right-panel"
                  onClick={toggleRightPanel}
                  className="absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-6 h-12 bg-white hover:bg-stone-50 border border-stone-200 rounded-full shadow-md flex items-center justify-center text-stone-500 hover:text-stone-800 transition-all cursor-pointer hover:scale-105"
                  title="Collapse Space & Analytics Panel"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <SpaceInfoPanel />
              </div>
            )
          )}

          {/* Edit Space Modal (if opened from Space Info Panel) */}
          {isFormModalOpen && (
            <div className="fixed inset-0 z-[9999] bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-elevated animate-in fade-in zoom-in-95 duration-150">
                <CreatePlanForm isModal onClose={() => setFormModalOpen(false)} />
              </div>
            </div>
          )}
        </main>
      )}

      {/* Phase 6 Persistence Modals */}
      <SavePlanModal />
      <SavedPlansModal />

      {/* AI Crowd Navigation: Operator Authorization Pop-up Modal */}
      <DiversionApprovalModal />
    </div>
  );
}
