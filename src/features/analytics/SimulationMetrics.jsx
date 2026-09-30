import React from 'react';
import { Users, Clock, CheckCircle2, TrendingUp, Hourglass, ShieldCheck, Sparkles, Activity } from 'lucide-react';
import { useSimulationStore } from '../simulation/simulationStore.js';
import { formatNumber } from '../../utils/units.js';

export function SimulationMetrics() {
  const metrics = useSimulationStore((state) => state.metrics);

  return (
    <div className="space-y-2 select-none">
      <div className="grid grid-cols-3 gap-1.5">
        {/* Visitors Entered */}
        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-2">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold text-stone-500">
            <Users className="w-3 h-3 text-stone-600" />
            <span>Entered</span>
          </div>
          <div className="text-xs font-bold text-stone-900 mt-0.5">
            {formatNumber(metrics.visitorsEntered)}
          </div>
        </div>

        {/* Active Visitors */}
        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-2">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold text-sky-600">
            <Activity className="w-3 h-3 text-sky-600" />
            <span>Active</span>
          </div>
          <div className="text-xs font-bold text-sky-800 mt-0.5">
            {formatNumber(metrics.visitorsActive)}
          </div>
        </div>

        {/* In Queue */}
        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-2">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold text-amber-600">
            <Hourglass className="w-3 h-3 text-amber-600" />
            <span>In Queue</span>
          </div>
          <div className="text-xs font-bold text-amber-700 mt-0.5">
            {formatNumber(metrics.visitorsInQueue)}
          </div>
        </div>

        {/* In Security */}
        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-2">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold text-indigo-600">
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            <span>In Security</span>
          </div>
          <div className="text-xs font-bold text-indigo-700 mt-0.5">
            {formatNumber(metrics.visitorsInSecurity)}
          </div>
        </div>

        {/* In Darshan */}
        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-2">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold text-amber-700">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>In Darshan</span>
          </div>
          <div className="text-xs font-bold text-amber-800 mt-0.5">
            {formatNumber(metrics.visitorsInDarshan)}
          </div>
        </div>

        {/* Completed Egress */}
        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-2">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold text-emerald-600">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Completed</span>
          </div>
          <div className="text-xs font-bold text-emerald-700 mt-0.5">
            {formatNumber(metrics.visitorsCompleted)}
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-3 gap-1.5 text-[11px] bg-stone-50/60 rounded-xl p-2 border border-stone-200/60">
        <div>
          <span className="text-stone-400 block text-[9px]">Avg Wait:</span>
          <span className="font-bold text-deva-maroon-800">{metrics.avgWaitMinutes} min</span>
        </div>
        <div>
          <span className="text-stone-400 block text-[9px]">Peak Queue:</span>
          <span className="font-bold text-stone-800">{formatNumber(metrics.peakQueue)}</span>
        </div>
        <div>
          <span className="text-stone-400 block text-[9px]">Throughput:</span>
          <span className="font-bold text-stone-800">{formatNumber(metrics.throughputPerHour)}/hr</span>
        </div>
      </div>
    </div>
  );
}
