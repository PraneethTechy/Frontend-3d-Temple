import React from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Users, 
  Clock, 
  Layers, 
  TrendingUp, 
  AlertOctagon,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { useQueueStore } from '../../store/useQueueStore.js';
import { formatNumber } from '../../utils/units.js';

export function LayoutAnalysisPanel() {
  const scene = useQueueStore((state) => state.scene);
  const setSelectedComponentId = useQueueStore((state) => state.setSelectedComponentId);
  const runValidation = useQueueStore((state) => state.runValidation);

  const analysis = scene.analysis || { valid: true, errors: [], warnings: [], metrics: null };
  const metrics = analysis.metrics || {};

  const errors = analysis.errors || [];
  const warnings = analysis.warnings || [];

  const handleSelectComponent = (compId) => {
    if (compId) {
      setSelectedComponentId(compId);
    }
  };

  // Status Badge Colors
  const getUtilizationBadge = (status) => {
    switch (status) {
      case 'within_capacity':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'near_capacity':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'over_capacity':
      default:
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  return (
    <div className="h-full flex flex-col select-none">
      {/* Header */}
      <div className="p-4 border-b border-stone-200/80 bg-stone-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-deva-maroon-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
            Layout Analysis
          </h3>
        </div>
        <button
          onClick={runValidation}
          className="text-[10px] font-semibold text-deva-maroon-800 hover:text-deva-maroon-900 underline"
          title="Re-run validation"
        >
          Re-validate
        </button>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Overall Status Banner */}
        <div
          className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
            errors.length > 0
              ? 'bg-red-50 border-red-200 text-red-800'
              : warnings.length > 0
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {errors.length > 0 ? (
            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          ) : warnings.length > 0 ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          )}
          <span>
            {errors.length > 0
              ? `${errors.length} Layout Validation Issue(s) Detected`
              : warnings.length > 0
              ? 'Layout Functional with Planning Warnings'
              : 'All Spatial Validation Checks Passed'}
          </span>
        </div>

        {/* 1. Core Planning Metrics Card */}
        <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
            <Users className="w-3.5 h-3.5 text-deva-maroon-700" />
            <span>Capacity & Occupancy Metrics</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Queue Capacity */}
            <div className="p-2.5 bg-stone-50 rounded-lg">
              <span className="text-[10px] text-stone-500 block mb-0.5">Queue Capacity</span>
              <span className="font-mono text-sm font-bold text-stone-900 block">
                {formatNumber(metrics.queueCapacity, 0)}
              </span>
              <span className="text-[9px] text-stone-400">@ 2.0 persons/m²</span>
            </div>

            {/* Peak Visitors */}
            <div className="p-2.5 bg-stone-50 rounded-lg">
              <span className="text-[10px] text-stone-500 block mb-0.5">Peak Visitors</span>
              <span className="font-mono text-sm font-bold text-stone-900 block">
                {formatNumber(metrics.peakVisitors, 0)}
              </span>
              <span className="text-[9px] text-stone-400">concurrent demand</span>
            </div>

            {/* Peak Utilization */}
            <div className="p-2.5 bg-stone-50 rounded-lg">
              <span className="text-[10px] text-stone-500 block mb-0.5">Peak Utilization</span>
              <span className="font-mono text-sm font-bold text-deva-maroon-800 block">
                {metrics.utilization || 0}%
              </span>
              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border mt-0.5 ${getUtilizationBadge(metrics.utilizationStatus)}`}>
                {metrics.utilizationStatus === 'within_capacity'
                  ? 'Optimal'
                  : metrics.utilizationStatus === 'near_capacity'
                  ? 'Near Limit'
                  : 'Overload'}
              </span>
            </div>

            {/* Estimated Wait */}
            <div className="p-2.5 bg-stone-50 rounded-lg">
              <div className="flex items-center gap-1 text-[10px] text-stone-500 mb-0.5">
                <Clock className="w-3 h-3 text-stone-400" />
                <span>Estimated Wait</span>
              </div>
              <span className="font-mono text-sm font-bold text-stone-900 block">
                {metrics.estimatedWaitMinutes || 0} min
              </span>
              <span className="text-[9px] text-stone-400">planning estimate</span>
            </div>
          </div>

          <div className="pt-1 text-[10px] text-stone-400 leading-tight">
            * Assumptions: Density 2.0 persons/m², Service 60 pilgrims/lane/hr.
          </div>
        </div>

        {/* 2. Validation Checklist */}
        <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 shadow-sm space-y-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block">
            System Validation Checks
          </div>

          <div className="space-y-1.5 text-xs">
            {/* Check: Boundary */}
            <div className="flex items-center justify-between py-1 border-b border-stone-100">
              <span className="text-stone-700">Layout within site bounds</span>
              {errors.some((e) => e.type === 'outside_boundary') ? (
                <span className="flex items-center gap-1 text-red-600 font-semibold text-[11px]">
                  <XCircle className="w-3.5 h-3.5" /> Fails
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> In Bounds
                </span>
              )}
            </div>

            {/* Check: Queue Capacity */}
            <div className="flex items-center justify-between py-1 border-b border-stone-100">
              <span className="text-stone-700">Capacity matches demand</span>
              {metrics.utilization > 100 ? (
                <span className="flex items-center gap-1 text-red-600 font-semibold text-[11px]">
                  <XCircle className="w-3.5 h-3.5" /> Deficit
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sufficient
                </span>
              )}
            </div>

            {/* Check: Flow Continuity */}
            <div className="flex items-center justify-between py-1 border-b border-stone-100">
              <span className="text-stone-700">Flow Continuity (Gate &rarr; Exit)</span>
              {warnings.some((w) => w.type?.startsWith('missing_')) ? (
                <span className="flex items-center gap-1 text-amber-600 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" /> Missing Zones
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              )}
            </div>

            {/* Check: Spatial Collisions */}
            <div className="flex items-center justify-between py-1">
              <span className="text-stone-700">Component collision check</span>
              {errors.some((e) => e.type === 'component_overlap') || warnings.some((w) => w.type === 'component_overlap') ? (
                <span className="flex items-center gap-1 text-amber-600 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" /> Overlaps
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Clear
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Detailed Issues & Bottlenecks List */}
        {(errors.length > 0 || warnings.length > 0) && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block">
              Validation Alerts & Bottlenecks
            </span>

            <div className="space-y-1.5">
              {errors.map((err) => (
                <button
                  key={err.id}
                  onClick={() => handleSelectComponent(err.componentId)}
                  className="w-full text-left p-2.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-50 text-red-900 transition-colors flex items-start gap-2 text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="leading-snug">{err.message}</p>
                    {err.componentId && (
                      <span className="text-[10px] text-red-700 font-medium underline mt-0.5 inline-block">
                        Click to select in 3D &rarr;
                      </span>
                    )}
                  </div>
                </button>
              ))}

              {warnings.map((warn) => (
                <button
                  key={warn.id}
                  onClick={() => handleSelectComponent(warn.componentId)}
                  className="w-full text-left p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-50 text-amber-900 transition-colors flex items-start gap-2 text-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="leading-snug">{warn.message}</p>
                    {warn.componentId && (
                      <span className="text-[10px] text-amber-800 font-medium underline mt-0.5 inline-block">
                        Click to select in 3D &rarr;
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-stone-100 bg-stone-50/50 text-[10px] text-stone-500 flex items-center justify-between">
        <span>Deterministic Flow Model</span>
        <span className="font-mono text-stone-400">Phase 3</span>
      </div>
    </div>
  );
}
