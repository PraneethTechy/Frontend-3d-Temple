import React, { useState, useEffect } from 'react';
import { Save, X, Loader2, Building, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { useQueueStore } from '../../store/useQueueStore.js';

export function SavePlanModal() {
  const isSaveModalOpen = useQueueStore((state) => state.isSaveModalOpen);
  const setSaveModalOpen = useQueueStore((state) => state.setSaveModalOpen);
  const scene = useQueueStore((state) => state.scene);
  const savedPlanId = useQueueStore((state) => state.savedPlanId);
  const savedPlanName = useQueueStore((state) => state.savedPlanName);
  const saveCurrentPlan = useQueueStore((state) => state.saveCurrentPlan);
  const isSaving = useQueueStore((state) => state.isSaving);

  const [planName, setPlanName] = useState('');
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (isSaveModalOpen) {
      setPlanName(savedPlanName || `${scene.temple?.name || 'Temple'} Queue Plan`);
      setSaveError(null);
    }
  }, [isSaveModalOpen, savedPlanName, scene.temple?.name]);

  if (!isSaveModalOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!planName.trim()) return;

    setSaveError(null);
    const result = await saveCurrentPlan(planName.trim());
    if (result.success) {
      setSaveModalOpen(false);
    } else {
      setSaveError(result.message || 'Failed to save plan.');
    }
  };

  const isUpdating = Boolean(savedPlanId);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-white rounded-2xl shadow-soft border border-stone-200/90 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-deva-maroon-50 border border-deva-maroon-200 flex items-center justify-center text-deva-maroon-800">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                {isUpdating ? 'Update Queue Plan' : 'Save Queue Plan'}
              </h2>
              <p className="text-[11px] text-stone-500">
                {isUpdating ? 'Update the existing saved design in database' : 'Store this 3D layout for future editing & simulations'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSaveModalOpen(false)}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="plan-name-input" className="block text-xs font-semibold text-stone-700">
              Plan Title
            </label>
            <input
              id="plan-name-input"
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. Somnath Shravan Pilgrimage Queue"
              maxLength={100}
              required
              autoFocus
              className="w-full text-xs rounded-lg border border-stone-300 p-2.5 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-deva-maroon-500/20 focus:border-deva-maroon-600 transition-all outline-none"
            />
          </div>

          {/* Plan Summary Preview Box */}
          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/60 text-xs space-y-1.5 text-stone-600">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Temple / Site:</span>
              <span className="font-bold text-stone-800">{scene.temple?.name || 'Sanctuary'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Footprint:</span>
              <span className="font-semibold text-stone-800">{scene.site?.length}m × {scene.site?.width}m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Components Placed:</span>
              <span className="font-semibold text-stone-800">{scene.components?.length || 0} units</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Peak Demand:</span>
              <span className="font-semibold text-stone-800">
                {(scene.requirements?.peakVisitors || 0).toLocaleString()} visitors
              </span>
            </div>
          </div>

          {/* Error Notice */}
          {saveError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setSaveModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-save-plan"
              type="submit"
              disabled={isSaving || !planName.trim()}
              className="px-5 py-2 bg-deva-maroon-700 hover:bg-deva-maroon-800 disabled:bg-stone-300 text-white rounded-lg text-xs font-semibold shadow-soft hover:shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isUpdating ? 'Update Plan' : 'Save Plan'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
