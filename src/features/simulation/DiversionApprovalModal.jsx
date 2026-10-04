import React from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  CornerDownRight,
  ShieldCheck,
  Clock,
  Gauge
} from 'lucide-react';
import { useSimulationStore } from './simulationStore.js';

/**
 * DiversionApprovalModal
 * High-priority operator decision modal that requests temple administrator approval
 * before activating intelligent entrance traffic redistribution.
 * 
 * Complies with PART 7, 8, 9, 10:
 * - Shows WHY congestion occurred (actual utilization, waiting count, wait time, movement speed)
 * - Compares with healthier alternative entrance with available capacity
 * - Explicitly guarantees existing devotees are never redirected or moved
 * - Reversible recommendation requiring explicit operator approval
 */
export function DiversionApprovalModal() {
  const diversionApprovalModal = useSimulationStore((state) => state.diversionApprovalModal);
  const approveDiversion = useSimulationStore((state) => state.approveDiversion);
  const dismissDiversion = useSimulationStore((state) => state.dismissDiversion);

  if (!diversionApprovalModal?.isOpen || !diversionApprovalModal?.data) {
    return null;
  }

  const {
    congestedStream = 'north',
    targetStream = 'west',
    congestedUtil = 85,
    targetUtil = 30,
    waitingCount = 2840,
    targetWaitingCount = 620,
    congestedWaitTime = 28,
    movementSpeed = 'Very Slow',
    targetMovementSpeed = 'Normal',
    queueGrowthRate = 0,
    blockedDuration = 8,
    divertPercent = 15,
    suggestedAction,
    message,
  } = diversionApprovalModal.data;

  const streamNames = {
    north: 'North Raja Gopuram',
    west: 'West Paschima Gopuram',
    east: 'East Purva Gopuram',
  };

  const congestedName = streamNames[congestedStream] || `${congestedStream.toUpperCase()} Gopuram`;
  const targetName = streamNames[targetStream] || `${targetStream.toUpperCase()} Gopuram`;
  const availableCapacity = Math.max(0, 100 - targetUtil);

  return (
    <div className="fixed inset-0 z-[99999] bg-stone-950/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diversion-modal-title"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-4 h-4 text-amber-200 animate-bounce" />
            </div>
            <div>
              <h3 id="diversion-modal-title" className="font-bold text-sm tracking-wide font-serif uppercase">
                {congestedStream.toUpperCase()} ENTRANCE BLOCKED
              </h3>
              <p className="text-[11px] text-amber-100/90">
                {congestedName} queue is currently blocked
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-900/60 border border-rose-400/40 text-rose-200">
            Approval Required
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Explanation Alert (PART 10) */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-[12px] block">
                {message || `${congestedName} queue is blocked. ${targetName} currently has available flow capacity.`}
              </span>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                Physical blockage persisted for {blockedDuration}s with queue growth and slow devotee advancement.
              </p>
            </div>
          </div>

          {/* Comparison Cards (PART 7) */}
          <div className="grid grid-cols-2 gap-3 items-stretch relative">
            {/* Congested Entrance Card */}
            <div className="p-3.5 rounded-2xl bg-red-50/70 border border-red-200 space-y-2 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                  {congestedStream.toUpperCase()} ENTRANCE BLOCKED
                </div>
                <div className="font-bold text-stone-900 text-xs mt-0.5 leading-snug">
                  {congestedName}
                </div>
              </div>

              <div className="space-y-1 py-1.5 border-t border-b border-red-200/60 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-stone-500">Queue:</span>
                  <span className="font-mono font-bold text-stone-800">{Number(waitingCount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Queue utilization:</span>
                  <span className="font-mono font-bold text-red-700">{congestedUtil}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Movement:</span>
                  <span className="font-bold text-rose-700">BLOCKED</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Queue growth:</span>
                  <span className="font-mono font-bold text-red-800">
                    {queueGrowthRate > 0 ? `+${queueGrowthRate}/min` : `${queueGrowthRate}/min`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Blocked duration:</span>
                  <span className="font-mono font-bold text-stone-700">{blockedDuration} sec</span>
                </div>
              </div>
            </div>

            {/* Transfer Center Arrow */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-stone-300 shadow-md flex items-center justify-center text-amber-600">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>

            {/* Healthier Alternative Card */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  {targetStream.toUpperCase()} ENTRANCE
                </div>
                <div className="font-bold text-stone-900 text-xs mt-0.5 leading-snug">
                  {targetName}
                </div>
              </div>

              <div className="space-y-1 py-1.5 border-t border-b border-emerald-200/60 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-stone-500">Queue:</span>
                  <span className="font-mono font-bold text-stone-800">{Number(targetWaitingCount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Utilization:</span>
                  <span className="font-mono font-bold text-emerald-700">{targetUtil}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Movement:</span>
                  <span className="font-bold text-emerald-800">{targetMovementSpeed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Available capacity:</span>
                  <span className="font-mono font-bold text-emerald-800">{availableCapacity}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Status:</span>
                  <span className="font-bold text-emerald-700">FLOWING</span>
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Action & Guarantee (PART 8 & 10) */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-[11px] text-stone-700 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <CornerDownRight className="w-3.5 h-3.5 text-amber-600" />
              <span>Recommended action:</span>
            </div>
            <p className="font-bold text-stone-900 text-xs">
              Redirect future arrivals to {targetStream === 'west' ? 'West' : targetStream === 'east' ? 'East' : targetStream.toUpperCase()}?
            </p>
            <p className="text-[11px] text-stone-600">
              {suggestedAction || `Redirect a controlled portion (${divertPercent}%) of future ${congestedStream.toUpperCase()} arrivals to ${targetStream.toUpperCase()} via overpass bridge.`}
            </p>

            <div className="pt-2 border-t border-stone-200/70 flex items-start gap-2 text-[10px] text-stone-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Zero Disruption Guarantee:</strong> Devotees already inside the {congestedStream.toUpperCase()} queue are never moved or teleported. Only future arrivals will use the adjusted distribution.
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-stone-50/90 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            id="btn-dismiss-diversion"
            onClick={dismissDiversion}
            className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 text-stone-700 hover:text-stone-900 hover:bg-stone-100 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
          >
            <XCircle className="w-4 h-4 text-stone-400" />
            <span>Keep Current Routing</span>
          </button>

          <button
            id="btn-approve-diversion"
            onClick={approveDiversion}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-md hover:shadow-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ring-2 ring-emerald-500/30 uppercase tracking-wider"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>Redirect Future Arrivals</span>
          </button>
        </div>
      </div>
    </div>
  );
}
