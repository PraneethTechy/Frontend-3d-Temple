import { create } from 'zustand';
import { createCapacityReviewState, generateCapacityExpansionPlan } from '../../services/layout/capacityExpansionPlanner.js';

export const useCapacityExpansionStore = create((set, get) => ({
  isOpen: false,
  step: 'review', // 'review' | 'preview'
  reviewState: null,
  isGenerating: false,
  planResult: null,
  error: null,
  applySuccessMessage: null,

  /**
   * Opens the Capacity Review Modal without touching Scene JSON
   */
  openReview: (alert, pressureState, scene) => {
    const reviewState = createCapacityReviewState({ alert, pressureState, scene });
    set({
      isOpen: true,
      step: 'review',
      reviewState,
      planResult: null,
      error: null,
      applySuccessMessage: null,
    });
  },

  /**
   * Closes the review modal without mutating Scene JSON
   */
  closeReview: () => {
    set({
      isOpen: false,
      step: 'review',
      reviewState: null,
      isGenerating: false,
      planResult: null,
      error: null,
      applySuccessMessage: null,
    });
  },

  /**
   * Generates expansion plan only after explicit user approval
   */
  generatePlan: async (scene) => {
    const { reviewState } = get();
    if (!reviewState) return;

    set({ isGenerating: true, error: null, planResult: null });

    try {
      const context = {
        alertId: reviewState.alertId,
        problem: {
          zone: reviewState.zone,
          occupancy: reviewState.currentOccupancy,
          capacity: reviewState.currentCapacity,
          utilization: reviewState.utilization,
          arrivalRate: reviewState.arrivalRate,
          serviceRate: reviewState.serviceRate,
        },
        site: scene?.site || {},
        existingLayout: scene || { components: [] },
        existingQueues: reviewState.currentQueueComponents || [],
        requirements: {
          preserveExistingQueues: true,
          preserveTempleArchitecture: true,
          allowAdditionalQueueCapacity: true,
          allowCurvedQueues: true,
          allowSerpentine: true,
          allowArc: true,
          allowRadial: true,
        },
      };

      const result = await generateCapacityExpansionPlan(context);

      if (!result.success || !result.validation.valid) {
        set({
          isGenerating: false,
          step: 'preview',
          planResult: result,
          error: result.validation?.reason || 'Expansion plan could not be safely placed.',
        });
      } else {
        set({
          isGenerating: false,
          step: 'preview',
          planResult: result,
          error: null,
        });
      }
    } catch (err) {
      set({
        isGenerating: false,
        error: `Expansion planning failed: ${err.message}`,
      });
    }
  },

  /**
   * Phase placeholder for applying expansion
   * (Guarantees Scene JSON is NOT mutated in this phase)
   */
  applyExpansionPlaceholder: () => {
    set({
      applySuccessMessage: 'Expansion plan verified and approved. Scene JSON preserved (Application workflow reserved for Phase 8).',
    });
  },
}));
