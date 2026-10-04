import React from 'react';
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  Users, 
  ShieldAlert, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertTriangle,
  Compass,
  ArrowRightLeft,
  Sparkles
} from 'lucide-react';
import { useSimulationStore } from './simulationStore.js';

/**
 * Visual Status Badge Component
 * PART 12: 🟢 FLOWING, 🟡 SLOW, 🟠 CONGESTED, 🔴 BLOCKED
 */
function EntranceStatusBadge({ status, congestionState }) {
  const effectiveState = congestionState || status;
  switch (effectiveState) {
    case 'BLOCKED':
    case 'REROUTE_CANDIDATE':
    case 'REROUTE_RECOMMENDED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
          🔴 BLOCKED
        </span>
      );
    case 'CONGESTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          🟠 CONGESTED
        </span>
      );
    case 'SLOW':
    case 'BUILDING':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-yellow-100 text-yellow-800 border border-yellow-300">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
          🟡 SLOW
        </span>
      );
    case 'FLOWING':
    case 'NORMAL':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          🟢 FLOWING
        </span>
      );
  }
}

/**
 * LiveEntranceFlowPanel
 * PART 11 & 12: Live entrance-count monitoring panel that replaces the design-time
 * components sidebar whenever Simulation Mode is active.
 */
export function LiveEntranceFlowPanel() {
  const metrics = useSimulationStore((state) => state.metrics);
  const aiNavigationState = useSimulationStore((state) => state.aiNavigationState);
  const diversionApproved = useSimulationStore((state) => state.diversionApproved);
  const promptDiversionModal = useSimulationStore((state) => state.promptDiversionModal);

  const entranceStats = metrics?.entranceStats || {
    north: { entered: 0, active: 0, share: 0, queueOccupancy: 0, queueUtilization: 0, status: 'NORMAL' },
    west: { entered: 0, active: 0, share: 0, queueOccupancy: 0, queueUtilization: 0, status: 'NORMAL' },
    east: { entered: 0, active: 0, share: 0, queueOccupancy: 0, queueUtilization: 0, status: 'NORMAL' },
  };

  const streams = [
    {
      key: 'north',
      title: 'NORTH ENTRANCE',
      sub: 'North Raja Gopuram',
      color: 'amber',
      accentBorder: 'border-amber-400',
      accentBg: 'bg-amber-500',
      data: entranceStats.north || {},
    },
    {
      key: 'west',
      title: 'WEST ENTRANCE',
      sub: 'West Pashchima Gopuram',
      color: 'sky',
      accentBorder: 'border-sky-400',
      accentBg: 'bg-sky-500',
      data: entranceStats.west || {},
    },
    {
      key: 'east',
      title: 'EAST ENTRANCE',
      sub: 'East Purva Gopuram',
      color: 'purple',
      accentBorder: 'border-purple-400',
      accentBg: 'bg-purple-500',
      data: entranceStats.east || {},
    },
  ];

  const totalEntered = metrics?.totalEntered || (entranceStats.north.entered + entranceStats.west.entered + entranceStats.east.entered);
  const currentInside = metrics?.activeCrowd || 0;
  const completed = metrics?.completedCrowd || 0;

  return (
    <aside 
      id="live-entrance-flow-panel"
      className="w-full h-full bg-white/95 backdrop-blur-md border-r border-stone-200/80 flex flex-col flex-shrink-0 select-none shadow-soft z-20 overflow-hidden"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-stone-200/80 bg-stone-50/90 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-deva-maroon-700 text-white flex items-center justify-center shadow-xs">
              <Activity className="w-4 h-4 animate-pulse text-amber-300" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-stone-900 font-sans">
                LIVE ENTRANCE FLOW
              </h2>
              <p className="text-[10px] text-stone-500 font-medium">Real-time devotee entry telemetry</p>
            </div>
          </div>

          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>

        {/* Visual Representation Ratio Badge */}
        <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-stone-100/90 border border-stone-200/80 flex items-center justify-between text-[10px]">
          <span className="text-stone-600 font-semibold flex items-center gap-1">
            <Users className="w-3 h-3 text-stone-500" />
            3D Visual Agents: <strong className="text-stone-900 font-mono">{metrics?.visualAgentsCount || 0}</strong>
          </span>
          <span className="text-stone-500 font-medium">
            1 visual ≈ <strong className="text-deva-maroon-700 font-mono font-bold">{metrics?.representationRatio || 1}</strong> devotees
          </span>
        </div>

        {/* Active Rerouting Banner */}
        {diversionApproved && (
          <div className="mt-2 p-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-[10px] flex items-center gap-1.5 shadow-2xs">
            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold leading-tight">
              Dynamic Rerouting Active: Future arrivals balanced across healthy gates.
            </span>
          </div>
        )}

        {/* Pending Approval Banner */}
        {aiNavigationState?.pendingApproval && !diversionApproved && (
          <div className="mt-2 p-2 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 text-[10px] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 animate-bounce" />
              <span className="font-bold">Congestion Action Needed</span>
            </div>
            <button
              onClick={() => promptDiversionModal && promptDiversionModal({
                congestedStream: aiNavigationState.congestedStream || 'north',
                targetStream: aiNavigationState.targetStream || 'west',
              })}
              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold rounded-md shadow-xs cursor-pointer"
            >
              Review
            </button>
          </div>
        )}

        {/* All Queues Overloaded Banner (Requirement 11) */}
        {aiNavigationState?.allQueuesOverloaded && !diversionApproved && (
          <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-[10px] space-y-0.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>ALL ENTRANCE QUEUES UNDER HIGH LOAD</span>
            </div>
            <p className="text-[9px] text-amber-800 leading-tight">
              There is currently no suitable alternate entrance with spare capacity.
            </p>
          </div>
        )}
      </div>

      {/* Stream Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {streams.map((s) => {
          const data = s.data;
          const entered = Number(data.entered || 0).toLocaleString();
          const active = Number(data.active || 0).toLocaleString();
          const queue = Number(data.queueOccupancy || 0).toLocaleString();
          const share = typeof data.share === 'number' ? data.share.toFixed(1) : '0.0';
          const util = Math.min(100, Math.max(0, Math.round(data.queueUtilization || 0)));

          return (
            <div
              key={s.key}
              className={`rounded-2xl border bg-white p-3 space-y-2.5 transition-all shadow-2xs hover:shadow-xs ${
                data.status === 'REROUTE_RECOMMENDED'
                  ? 'border-rose-400 ring-2 ring-rose-300/50 bg-rose-50/20'
                  : data.status === 'CONGESTED'
                  ? 'border-amber-400 bg-amber-50/15'
                  : 'border-stone-200'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${s.accentBg}`} />
                    <h3 className="text-xs font-black tracking-wide text-stone-900 font-sans">
                      {s.title}
                    </h3>
                  </div>
                  <div className="text-[10px] text-stone-500 font-medium pl-3.5">
                    {s.sub}
                  </div>
                </div>

                <EntranceStatusBadge status={data.status} congestionState={data.congestionState} />
              </div>

              {/* Primary Stats Grid */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-stone-100 text-center">
                <div className="bg-stone-50/80 rounded-xl p-1.5 border border-stone-200/60">
                  <div className="text-[9px] font-bold text-stone-500 uppercase tracking-tight">Entered</div>
                  <div className="text-xs font-black font-mono text-stone-900 mt-0.5">{entered}</div>
                </div>

                <div className="bg-stone-50/80 rounded-xl p-1.5 border border-stone-200/60">
                  <div className="text-[9px] font-bold text-stone-500 uppercase tracking-tight">Current Active</div>
                  <div className="text-xs font-black font-mono text-stone-800 mt-0.5">{active}</div>
                </div>

                <div className="bg-stone-50/80 rounded-xl p-1.5 border border-stone-200/60">
                  <div className="text-[9px] font-bold text-stone-500 uppercase tracking-tight">Share</div>
                  <div className="text-xs font-black font-mono text-deva-maroon-700 mt-0.5">{share}%</div>
                </div>
              </div>

              {/* Queue & Utilization Row */}
              <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-stone-600 flex items-center gap-1">
                    <Users className="w-3 h-3 text-stone-400" />
                    Queue Occupancy:
                  </span>
                  <span className="font-mono font-bold text-stone-900">{queue}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-stone-500 font-medium">Utilization:</span>
                    <span className={`font-mono font-extrabold ${
                      util >= 80 ? 'text-rose-700' : util >= 60 ? 'text-amber-700' : 'text-emerald-700'
                    }`}>
                      {util}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${
                        util >= 80 ? 'bg-rose-600' : util >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${util}%` }}
                    />
                  </div>
                </div>

                {/* Avg wait, speed & 3D visual reps */}
                <div className="flex items-center justify-between text-[9px] text-stone-500 pt-1 border-t border-stone-200/50">
                  <span>3D Reps: <strong className="text-stone-700 font-mono">{data.visualCount || 0}</strong></span>
                  <span>Speed: <strong className="text-stone-700">{data.avgSpeed < 0.45 ? 'Slow' : 'Normal'}</strong></span>
                  <span>Avg Wait: <strong className="text-stone-700">{data.avgWaitMinutes || 0}m</strong></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Campus Totals Summary Footer */}
      <div className="p-3 bg-stone-900 text-white border-t border-stone-800 flex-shrink-0 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Campus Total Summary
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-stone-800/80 rounded-xl p-1.5 border border-stone-700/60">
            <div className="text-[8px] font-bold text-stone-400 uppercase tracking-tight">TOTAL ENTERED</div>
            <div className="text-xs font-black font-mono text-emerald-400 mt-0.5">
              {Number(totalEntered).toLocaleString()}
            </div>
          </div>

          <div className="bg-stone-800/80 rounded-xl p-1.5 border border-stone-700/60">
            <div className="text-[8px] font-bold text-stone-400 uppercase tracking-tight">CURRENT INSIDE</div>
            <div className="text-xs font-black font-mono text-amber-300 mt-0.5">
              {Number(currentInside).toLocaleString()}
            </div>
          </div>

          <div className="bg-stone-800/80 rounded-xl p-1.5 border border-stone-700/60">
            <div className="text-[8px] font-bold text-stone-400 uppercase tracking-tight">COMPLETED</div>
            <div className="text-xs font-black font-mono text-sky-300 mt-0.5">
              {Number(completed).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
