import React from 'react';
import { 
  ShieldAlert, 
  Sparkles, 
  X, 
  TrendingUp, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Check, 
  ShieldCheck,
  Building2,
  Users
} from 'lucide-react';
import { useCapacityExpansionStore } from '../simulation/capacityExpansionStore.js';
import { useQueueStore } from '../../store/useQueueStore.js';
import { PRESSURE_LEVELS } from '../simulation/crowdPressureEngine.js';

export function CapacityExpansionModal() {
  const isOpen = useCapacityExpansionStore((state) => state.isOpen);
  const step = useCapacityExpansionStore((state) => state.step);
  const reviewState = useCapacityExpansionStore((state) => state.reviewState);
  const isGenerating = useCapacityExpansionStore((state) => state.isGenerating);
  const planResult = useCapacityExpansionStore((state) => state.planResult);
  const error = useCapacityExpansionStore((state) => state.error);
  const applySuccessMessage = useCapacityExpansionStore((state) => state.applySuccessMessage);
  const closeReview = useCapacityExpansionStore((state) => state.closeReview);
  const generatePlan = useCapacityExpansionStore((state) => state.generatePlan);
  const applyExpansionPlaceholder = useCapacityExpansionStore((state) => state.applyExpansionPlaceholder);

  const scene = useQueueStore((state) => state.scene);

  if (!isOpen || !reviewState) return null;

  const {
    zoneName,
    severity,
    currentOccupancy,
    currentCapacity,
    utilization,
    arrivalRate,
    architectureContext,
  } = reviewState;

  const isOverCapacity = severity === PRESSURE_LEVELS.OVER_CAPACITY;
  const utilPct = Math.round(utilization * 100);

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`px-5 py-4 flex items-center justify-between border-b ${
          isOverCapacity ? 'bg-rose-50/80 border-rose-200' : 'bg-amber-50/80 border-amber-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isOverCapacity ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 font-serif">
                {step === 'review' ? `Capacity Review: ${zoneName}` : 'Proposed Capacity Expansion'}
              </h3>
              <p className="text-[11px] text-stone-500">
                {step === 'review' 
                  ? 'Deterministic architectural bottleneck analysis'
                  : 'AI-assisted structured queue expansion plan'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
              isOverCapacity 
                ? 'bg-rose-100 text-rose-800 border-rose-300' 
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              {isOverCapacity ? 'OVER CAPACITY' : 'HIGH LOAD'}
            </span>
            <button
              onClick={closeReview}
              className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {step === 'review' ? (
            <>
              {/* 1. Current Problem Section */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                  Current Problem
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                  <div>
                    <span className="text-[10px] text-stone-400 block font-medium">Occupancy</span>
                    <span className="text-sm font-extrabold text-stone-900 font-mono">
                      {currentOccupancy.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block font-medium">Designed Cap</span>
                    <span className="text-sm font-extrabold text-stone-700 font-mono">
                      {currentCapacity.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block font-medium">Utilization</span>
                    <span className={`text-sm font-extrabold font-mono ${
                      utilPct > 100 ? 'text-rose-600' : 'text-amber-600'
                    }`}>
                      {utilPct}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block font-medium">Arrival Rate</span>
                    <span className="text-sm font-extrabold text-stone-700 font-mono">
                      {arrivalRate ? `${arrivalRate.toLocaleString()}/min` : 'Not available'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200/70 text-rose-900 text-[11px] leading-relaxed">
                  <strong>Architectural Strain:</strong> Current crowd demand exceeds designed queue capacity by {Math.max(0, utilPct - 100)}%. Unmitigated overflow risks crowd lockup and extended Darshan dwell.
                </div>
              </div>

              {/* 2. Existing Architecture Context Section */}
              <div className="space-y-2 pt-1 border-t border-stone-100">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-stone-400" />
                  <span>Existing Architecture Context</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border border-stone-200 bg-white space-y-1">
                    <span className="text-[11px] font-bold text-stone-800 block">
                      Existing {zoneName}
                    </span>
                    <ul className="text-[11px] text-stone-600 space-y-0.5 list-disc list-inside">
                      <li>{architectureContext.totalLanes} queue lanes</li>
                      <li>Template: <span className="capitalize">{architectureContext.template}</span></li>
                      <li>{architectureContext.totalCenterline} centerline length</li>
                      <li>{architectureContext.averageWidth} lane width</li>
                      <li>Holding capacity: {architectureContext.queueCapacity.toLocaleString()} devotees</li>
                    </ul>
                  </div>

                  <div className="p-2.5 rounded-xl border border-stone-200 bg-white space-y-1">
                    <span className="text-[11px] font-bold text-stone-800 block">
                      Screening & Spatial Footprint
                    </span>
                    <ul className="text-[11px] text-stone-600 space-y-0.5 list-disc list-inside">
                      <li>Security: {architectureContext.securityCheckpoints} checkpoints</li>
                      <li>Available site area: {architectureContext.availableSiteSpace}</li>
                      <li>Dravidian Vimana & Gopurams: Preserved</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3. Recommended Action */}
              <div className="space-y-1.5 pt-1 border-t border-stone-100">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                  Recommended Action
                </span>

                <div className="p-3 rounded-xl bg-deva-gold-50/70 border border-deva-gold-200/80 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-deva-gold-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-deva-gold-950 block">
                      Generate additional queue capacity
                    </span>
                    <p className="text-[11px] text-deva-gold-800/90 leading-relaxed mt-0.5">
                      The AI planner will compute structured intent for additional queue channels to alleviate the {utilPct}% pressure while strictly preserving sacred Gopurams, Sanctum, and existing queue lines.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* 4. Preview Step */
            <div className="space-y-3">
              {error ? (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Expansion plan could not be safely placed</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    {error}
                  </p>
                </div>
              ) : planResult?.plan ? (
                <>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Proposed Expansion Validated</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                        Plan Ready
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/80 p-2.5 rounded-lg border border-emerald-200/60">
                      <div>
                        <span className="text-stone-400 block text-[10px]">Target Zone</span>
                        <span className="font-bold text-stone-800 capitalize">
                          {planResult.plan.targetZone} Queue
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">Current Architecture</span>
                        <span className="font-semibold text-stone-700">
                          {architectureContext.totalLanes} lanes ({architectureContext.template})
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">Proposed Addition</span>
                        <span className="font-bold text-deva-maroon-700">
                          +{planResult.proposedComponents.reduce((sum, c) => sum + (c.lanes || 1), 0)} {planResult.plan.changes[0]?.template} lanes
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">Expected Capacity Increase</span>
                        <span className="font-extrabold text-emerald-700 font-mono">
                          +{planResult.expectedCapacityIncrease.toLocaleString()} devotees
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-600 italic bg-white/60 p-2 rounded border border-emerald-100 leading-relaxed">
                      "{planResult.plan.reasoning}"
                    </p>
                  </div>

                  {/* Constraints list */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                      Preserved Constraints
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {planResult.plan.constraints.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] flex items-center gap-1 border border-stone-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{c}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 text-[11px]">
                    <strong>Preview Notice:</strong> This proposal is in non-destructive preview mode. The working Scene JSON and 3D temple layout have not been modified.
                  </div>

                  {applySuccessMessage && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{applySuccessMessage}</span>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <button
            onClick={closeReview}
            disabled={isGenerating}
            className="px-3.5 py-1.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          {step === 'review' ? (
            <button
              id="btn-generate-expansion-plan"
              onClick={() => generatePlan(scene)}
              disabled={isGenerating}
              className="px-4 py-2 bg-deva-maroon-700 hover:bg-deva-maroon-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Planning Expansion...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-deva-gold-300" />
                  <span>Generate Expansion Plan</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="btn-preview-in-scene"
                data-testid="btn-preview-in-scene"
                onClick={() => {
                  if (planResult) {
                    useQueueStore.getState().startCapacityExpansionPreview(planResult);
                    closeReview();
                  }
                }}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Preview in 3D scene before applying"
              >
                <Layers className="w-3.5 h-3.5 text-stone-600" />
                <span>3D Preview</span>
              </button>

              <button
                id="btn-apply-expansion"
                data-testid="btn-apply-expansion"
                onClick={() => {
                  if (planResult) {
                    useQueueStore.getState().applyCapacityExpansion(planResult);
                    closeReview();
                  }
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                title="Accept and apply queue expansion directly to layout"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Apply to Layout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
