import React from 'react';
import { AlertCircle, ShieldAlert, Layers, Eye } from 'lucide-react';
import { useSimulationStore } from '../simulation/simulationStore.js';

export function BottleneckSummary() {
  const metrics = useSimulationStore((state) => state.metrics);
  const status = useSimulationStore((state) => state.status);

  const bottleneck = metrics?.bottleneck || {
    zone: 'Queue Lane',
    reason: 'Awaiting simulation data.',
  };

  const isSimulating = status === 'running' || status === 'paused';

  return (
    <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-3 text-xs space-y-1.5 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-amber-950 font-bold text-[11px] uppercase tracking-wider">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Simulation Bottleneck</span>
        </div>
        <span className="text-[10px] font-bold text-deva-maroon-800 bg-white px-2 py-0.5 rounded-full border border-amber-200">
          {bottleneck.zone}
        </span>
      </div>

      <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
        {isSimulating ? bottleneck.reason : 'Start crowd simulation to detect dynamic flow bottlenecks.'}
      </p>

      <p className="text-[10px] text-stone-400 italic pt-0.5 border-t border-amber-200/60">
        Planning simulation estimates. Does not constitute certified regulatory clearance.
      </p>
    </div>
  );
}
