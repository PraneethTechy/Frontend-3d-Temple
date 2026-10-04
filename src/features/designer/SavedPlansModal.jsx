import React, { useEffect, useState } from 'react';
import { 
  FolderOpen, 
  Trash2, 
  X, 
  Loader2, 
  Building, 
  Clock, 
  Users, 
  Maximize2, 
  Layers, 
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useQueueStore } from '../../store/useQueueStore.js';
import { formatNumber } from '../../utils/units.js';

export function SavedPlansModal() {
  const isPlansModalOpen = useQueueStore((state) => state.isPlansModalOpen);
  const setPlansModalOpen = useQueueStore((state) => state.setPlansModalOpen);
  const savedPlansList = useQueueStore((state) => state.savedPlansList);
  const isLoadingPlans = useQueueStore((state) => state.isLoadingPlans);
  const fetchSavedPlans = useQueueStore((state) => state.fetchSavedPlans);
  const loadSavedPlan = useQueueStore((state) => state.loadSavedPlan);
  const deleteSavedPlan = useQueueStore((state) => state.deleteSavedPlan);
  const isDirty = useQueueStore((state) => state.isDirty);
  const savedPlanId = useQueueStore((state) => state.savedPlanId);

  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [openingId, setOpeningId] = useState(null);
  const [modalError, setModalError] = useState(null);

  useEffect(() => {
    if (isPlansModalOpen) {
      fetchSavedPlans();
      setModalError(null);
      setConfirmDeleteId(null);
    }
  }, [isPlansModalOpen, fetchSavedPlans]);

  if (!isPlansModalOpen) return null;

  const handleOpenPlan = async (id) => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes in your current plan. Open this saved plan anyway?'
      );
      if (!confirmDiscard) return;
    }

    setOpeningId(id);
    setModalError(null);

    const result = await loadSavedPlan(id);
    setOpeningId(null);

    if (result.success) {
      setPlansModalOpen(false);
    } else {
      setModalError(result.message || 'Unable to load this plan.');
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setModalError(null);

    const result = await deleteSavedPlan(id);
    setDeletingId(null);
    setConfirmDeleteId(null);

    if (!result.success) {
      setModalError(result.message || 'Unable to delete this plan.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-white rounded-2xl shadow-soft border border-stone-200/90 w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-deva-maroon-50 border border-deva-maroon-200 flex items-center justify-center text-deva-maroon-800">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">Saved Queue Plans</h2>
              <p className="text-[11px] text-stone-500">
                Browse, open, and manage persistent 3D crowd management designs
              </p>
            </div>
          </div>
          <button
            onClick={() => setPlansModalOpen(false)}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Notification */}
        {modalError && (
          <div className="mx-4 mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoadingPlans ? (
            <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-deva-maroon-700" />
              <span className="text-xs font-medium">Retrieving saved plans...</span>
            </div>
          ) : savedPlansList.length === 0 ? (
            /* Empty State */
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-bold text-stone-700">No saved queue plans yet</h3>
              <p className="text-[11px] text-stone-400 max-w-xs mx-auto leading-relaxed">
                Design a queue layout in the 3D space and click "Save" in the top bar to store your designs.
              </p>
            </div>
          ) : (
            /* Plans List */
            savedPlansList.map((plan) => {
              const id = plan._id || plan.id;
              const isCurrent = id === savedPlanId;
              const isDeleting = deletingId === id;
              const isOpening = openingId === id;
              const isConfirming = confirmDeleteId === id;

              return (
                <div
                  key={id}
                  className={`bg-white border rounded-xl p-3.5 shadow-soft transition-all space-y-2.5 ${
                    isCurrent
                      ? 'border-deva-maroon-300 ring-2 ring-deva-maroon-100/60'
                      : 'border-stone-200/90 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-stone-900">{plan.name}</h4>
                        {isCurrent && (
                          <span className="text-[9px] font-bold text-deva-maroon-800 bg-deva-maroon-50 px-2 py-0.5 rounded-full border border-deva-maroon-200">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium">
                        Temple: {plan.templeName || 'Sanctuary'}
                      </p>
                    </div>

                    <span className="text-[10px] text-stone-400 font-mono whitespace-nowrap">
                      {plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString() : ''}
                    </span>
                  </div>

                  {/* Plan Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-600">
                    <span className="bg-stone-100 px-2 py-0.5 rounded-md font-medium">
                      {plan.site?.length}m × {plan.site?.width}m
                    </span>
                    <span className="bg-stone-100 px-2 py-0.5 rounded-md font-medium">
                      {(plan.requirements?.peakVisitors || 0).toLocaleString()} Peak Crowd
                    </span>
                    <span className="bg-stone-100 px-2 py-0.5 rounded-md font-medium">
                      {plan.componentsCount || 0} Components
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                    {isConfirming ? (
                      <div className="flex items-center gap-2 w-full justify-between animate-in fade-in">
                        <span className="text-[11px] text-rose-700 font-semibold">
                          Delete this saved queue plan?
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(id)}
                            disabled={isDeleting}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setConfirmDeleteId(id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenPlan(id)}
                          disabled={isOpening}
                          className="px-3.5 py-1.5 bg-deva-maroon-700 hover:bg-deva-maroon-800 text-white rounded-lg text-xs font-semibold shadow-soft hover:shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isOpening ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Loading...</span>
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-3 h-3" />
                              <span>Open Plan</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
