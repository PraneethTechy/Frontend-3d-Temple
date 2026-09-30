import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Save, 
  Settings, 
  Undo2, 
  Redo2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Bot, 
  Activity, 
  FolderOpen, 
  Download, 
  FileJson, 
  FileText, 
  ChevronDown, 
  Loader2, 
  Layers
} from 'lucide-react';
import { useQueueStore } from '../../store/useQueueStore.js';
import { exportPlanAsJson, exportPlanSummary } from '../../utils/exportPlan.js';

/**
 * Professional Studio Top Navbar (64-72px)
 * Clean visual groups:
 * 1. Brand (DevaSetu 3D Designer / AI Spatial Planning Studio)
 * 2. Current Site (Sri Ganesha Temple Festival / Sync Status)
 * 3. Workspace Modes Segmented Control (Manual | AI | Simulation)
 * 4. Document Actions (Saved Plans | Undo | Redo | Save | Export | Settings)
 */
export function DesignerHeader() {
  const scene = useQueueStore((state) => state.scene);
  const isInitialized = useQueueStore((state) => state.isInitialized);
  const history = useQueueStore((state) => state.history);
  const undo = useQueueStore((state) => state.undo);
  const redo = useQueueStore((state) => state.redo);
  const activeSidebarTab = useQueueStore((state) => state.activeSidebarTab);
  const setActiveSidebarTab = useQueueStore((state) => state.setActiveSidebarTab);
  const setRightPanelCollapsed = useQueueStore((state) => state.setRightPanelCollapsed);

  // Persistence State & Actions
  const savedPlanId = useQueueStore((state) => state.savedPlanId);
  const savedPlanName = useQueueStore((state) => state.savedPlanName);
  const isDirty = useQueueStore((state) => state.isDirty);
  const isSaving = useQueueStore((state) => state.isSaving);
  const setSaveModalOpen = useQueueStore((state) => state.setSaveModalOpen);
  const setPlansModalOpen = useQueueStore((state) => state.setPlansModalOpen);
  const saveCurrentPlan = useQueueStore((state) => state.saveCurrentPlan);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const exportMenuRef = useRef(null);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close export dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    }
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  const handleSaveClick = async () => {
    if (!savedPlanId) {
      setSaveModalOpen(true);
    } else {
      const res = await saveCurrentPlan();
      if (res.success) {
        showToast('Plan updated successfully in database.', 'success');
      } else {
        showToast(res.message || 'Failed to update plan.', 'error');
      }
    }
  };

  const handleExportJson = () => {
    setShowExportMenu(false);
    exportPlanAsJson({
      name: savedPlanName || scene.temple?.name,
      scene,
    });
    showToast('Scene JSON exported successfully.', 'success');
  };

  const handleExportSummary = () => {
    setShowExportMenu(false);
    exportPlanSummary({
      name: savedPlanName || scene.temple?.name,
      scene,
    });
    showToast('Plan summary report exported successfully.', 'success');
  };

  const handleModeSwitch = (mode) => {
    setActiveSidebarTab(mode);
    setRightPanelCollapsed(false);
  };

  return (
    <header className="h-[68px] bg-white border-b border-stone-200/90 px-4 sm:px-6 flex items-center justify-between select-none z-30 shadow-2xs">
      {/* GROUP 1: Brand & Identity */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-deva-maroon-800 flex items-center justify-center shadow-xs flex-shrink-0">
            <Building2 className="w-5 h-5 text-deva-gold-300" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-stone-900 tracking-tight font-serif leading-tight">
                DevaSetu
              </span>
              <span className="text-xs font-semibold text-stone-700 font-sans tracking-normal">
                3D Designer
              </span>
            </div>
            <span className="text-[11px] text-stone-500 font-medium tracking-tight">
              AI Spatial Planning Studio
            </span>
          </div>
        </div>

        {/* GROUP 2: Current Site Context (Hidden on small viewports) */}
        {isInitialized && (
          <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-stone-200/80">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-stone-50 rounded-lg border border-stone-200/70 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                Site:
              </span>
              <span className="font-semibold text-stone-800 max-w-[200px] truncate">
                {scene.temple.name || 'Sri Ganesha Temple Festival'}
              </span>
              {isDirty ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-medium ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved
                </span>
              ) : savedPlanId ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Synced
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* GROUP 3: Workspace Modes (Single Segmented Control) */}
      {isInitialized && (
        <div className="hidden md:flex items-center mx-2">
          <div className="flex items-center p-1 bg-stone-100/90 rounded-xl border border-stone-200/80">
            {/* Mode: Manual */}
            <button
              id="mode-tab-manual"
              onClick={() => handleModeSwitch('planner')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSidebarTab === 'planner' || activeSidebarTab === 'info'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
              }`}
              title="Manual Studio: Queue placement and drafting"
            >
              <Layers className="w-3.5 h-3.5 text-stone-700" />
              <span>Manual</span>
            </button>

            {/* Mode: AI */}
            <button
              id="mode-tab-ai"
              onClick={() => handleModeSwitch('ai')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSidebarTab === 'ai'
                  ? 'bg-deva-maroon-700 text-white shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
              }`}
              title="AI Assistant: Prompt AI layout generation & optimization"
            >
              <Bot className="w-3.5 h-3.5 text-deva-gold-300" />
              <span>AI</span>
            </button>

            {/* Mode: Simulation */}
            <button
              id="mode-tab-simulation"
              onClick={() => handleModeSwitch('analysis')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSidebarTab === 'analysis'
                  ? 'bg-stone-900 text-white shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
              }`}
              title="Simulation & Flow Analysis"
            >
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulation</span>
            </button>
          </div>
        </div>
      )}

      {/* GROUP 4: Document Actions & Persistence */}
      <div className="flex items-center gap-2">
        {/* Saved Plans Browser */}
        <button
          id="btn-header-saved-plans"
          onClick={() => setPlansModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 transition-colors cursor-pointer"
          title="Browse and load saved plans"
        >
          <FolderOpen className="w-3.5 h-3.5 text-stone-500" />
          <span className="hidden sm:inline">Saved</span>
        </button>

        {isInitialized && (
          <>
            {/* Undo / Redo Group */}
            <div className="flex items-center bg-stone-50 border border-stone-200/80 rounded-lg p-0.5">
              <button
                id="btn-header-undo"
                onClick={undo}
                disabled={!canUndo}
                className={`p-1.5 rounded text-xs transition-colors ${
                  canUndo
                    ? 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60 cursor-pointer'
                    : 'text-stone-300 cursor-not-allowed opacity-40'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              <button
                id="btn-header-redo"
                onClick={redo}
                disabled={!canRedo}
                className={`p-1.5 rounded text-xs transition-colors ${
                  canRedo
                    ? 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60 cursor-pointer'
                    : 'text-stone-300 cursor-not-allowed opacity-40'
                }`}
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Save Button (Primary Document Action) */}
            <button
              id="btn-header-save"
              onClick={handleSaveClick}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isDirty
                  ? 'bg-deva-maroon-800 hover:bg-deva-maroon-900 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
              }`}
              title={savedPlanId ? 'Save changes to database' : 'Save as new queue plan'}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-deva-gold-300" />
              ) : (
                <Save className={`w-3.5 h-3.5 ${isDirty ? 'text-deva-gold-300' : 'text-stone-500'}`} />
              )}
              <span>{savedPlanId ? 'Save' : 'Save Plan'}</span>
            </button>

            {/* Export Dropdown (Secondary Document Action) */}
            <div className="relative" ref={exportMenuRef}>
              <button
                id="btn-header-export"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/70 transition-colors cursor-pointer"
                title="Export queue plan"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-elevated border border-stone-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                    Export Options
                  </div>
                  <button
                    onClick={handleExportJson}
                    className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <FileJson className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-medium">Scene JSON</div>
                      <div className="text-[10px] text-stone-400">Complete 3D layout data</div>
                    </div>
                  </button>
                  <button
                    onClick={handleExportSummary}
                    className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-medium">Plan Summary</div>
                      <div className="text-[10px] text-stone-400">Capacity & flow report</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Settings Button */}
        <button
          id="btn-header-settings"
          onClick={() => setShowSettingsModal(true)}
          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 border border-stone-200/70 transition-colors cursor-pointer"
          title="Studio Information & Shortcuts"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-elevated w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-deva-maroon-900 text-white">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-deva-gold-300" />
                <h3 className="text-sm font-bold font-serif">DevaSetu 3D Designer</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-stone-300 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs text-stone-600">
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <div className="font-semibold text-stone-800">Spatial Studio Engine</div>
                <div>Coordinate system: 1 Three.js unit = 1.000 meter</div>
                <div>Measurement units: Meters (m) / Feet (ft)</div>
                <div>Simulation: Deterministic multi-stream crowd kinematics</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl space-y-1 text-stone-700">
                <div className="font-semibold text-stone-800">Keyboard Shortcuts</div>
                <div className="grid grid-cols-2 gap-1 pt-1 font-mono text-[11px]">
                  <div>F:</div>
                  <div className="text-stone-500">Focus 3D (Full-screen view)</div>
                  <div>Delete / Backspace:</div>
                  <div className="text-stone-500">Delete object</div>
                  <div>Ctrl / Cmd + Z:</div>
                  <div className="text-stone-500">Undo action</div>
                  <div>Ctrl + Shift + Z:</div>
                  <div className="text-stone-500">Redo action</div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-deva-maroon-800 hover:bg-deva-maroon-900 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-elevated text-xs font-medium flex items-center gap-2.5 animate-in slide-in-from-top-3 fade-in duration-200">
          {toastType === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}
    </header>
  );
}
