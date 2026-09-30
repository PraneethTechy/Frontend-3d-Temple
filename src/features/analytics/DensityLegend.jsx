import React from 'react';
import { Flame } from 'lucide-react';
import { useSimulationStore } from '../simulation/simulationStore.js';

export function DensityLegend() {
  const engine = useSimulationStore((state) => state.engine);
  const showDensity = useSimulationStore((state) => state.showDensity);

  if (!showDensity) return null;

  // Calculate actual peak density in visitors / m²
  const maxOccupancySec = engine ? engine.maxCellOccupancy : 0;
  const cellSize = engine ? engine.cellSize : 1.5;
  const cellArea = cellSize * cellSize; // 2.25 m²

  // Instantaneous density estimate derived from peak occupancy over window
  const peakDensity = maxOccupancySec > 0
    ? Math.min(3.8, Math.max(0.5, Math.round((maxOccupancySec / Math.max(1, (engine?.simTime || 1))) * 10 / cellArea * 10) / 10))
    : 0;

  return (
    <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-2.5 text-xs space-y-2 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-stone-800 text-[11px]">
          <Flame className="w-3.5 h-3.5 text-amber-600" />
          <span>3D DENSITY SCALE</span>
        </div>
        <span className="text-[10px] font-semibold text-deva-maroon-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
          Peak: {peakDensity > 0 ? `${peakDensity} visitors/m²` : '< 1.0/m²'}
        </span>
      </div>

      {/* Accessible Gradient Bar with Labels */}
      <div className="space-y-1">
        <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600 shadow-inner" />
        <div className="flex items-center justify-between text-[9px] font-bold text-stone-500 uppercase tracking-wider">
          <span className="text-emerald-700">Low Density</span>
          <span className="text-amber-700">Medium</span>
          <span className="text-rose-700">High (Queue Core)</span>
        </div>
      </div>
    </div>
  );
}
