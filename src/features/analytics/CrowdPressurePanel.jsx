import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  TrendingUp, 
  Layers, 
  ChevronRight,
  Flame,
  ArrowRightLeft
} from 'lucide-react';
import { useSimulationStore } from '../simulation/simulationStore.js';
import { useQueueStore } from '../../store/useQueueStore.js';
import { PRESSURE_LEVELS } from '../simulation/crowdPressureEngine.js';

export function CrowdPressurePanel() {
  const pressureState = useSimulationStore((state) => state.pressureState);
  const status = useSimulationStore((state) => state.status);
  const engine = useSimulationStore((state) => state.engine);
  const aiNavigationState = useSimulationStore((state) => state.aiNavigationState);
  const diversionApproved = useSimulationStore((state) => state.diversionApproved);
  const approveDiversion = useSimulationStore((state) => state.approveDiversion);
  const dismissDiversion = useSimulationStore((state) => state.dismissDiversion);
  const scene = useQueueStore((state) => state.scene);

  if (!pressureState) {
    return (
      <div className="bg-stone-50/70 border border-stone-200/80 rounded-2xl p-3 text-xs text-stone-500 space-y-1 select-none">
        <div className="flex items-center gap-1.5 font-bold text-stone-700 text-[11px] uppercase tracking-wider">
          <Activity className="w-3.5 h-3.5 text-stone-500" />
          <span>Crowd Pressure</span>
        </div>
        <p className="text-[11px] text-stone-400">
          Start simulation to evaluate dynamic architectural crowd pressure.
        </p>
      </div>
    );
  }

  const { index, level, highestPressureZone, overloadedZones, zones, alerts } = pressureState;

  // Level Badge Styles
  const getBadgeStyle = () => {
    switch (level) {
      case PRESSURE_LEVELS.OVER_CAPACITY:
        return 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse';
      case PRESSURE_LEVELS.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case PRESSURE_LEVELS.ELEVATED:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case PRESSURE_LEVELS.NORMAL:
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  const getLevelLabel = () => {
    switch (level) {
      case PRESSURE_LEVELS.OVER_CAPACITY:
        return 'OVER CAPACITY';
      case PRESSURE_LEVELS.HIGH:
        return 'HIGH LOAD';
      case PRESSURE_LEVELS.ELEVATED:
        return 'ELEVATED';
      case PRESSURE_LEVELS.NORMAL:
      default:
        return 'NORMAL FLOW';
    }
  };

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-3 shadow-soft space-y-3 select-none">
      {/* Header & Crowd Pressure Index */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className={`w-4 h-4 ${
            level === PRESSURE_LEVELS.OVER_CAPACITY ? 'text-rose-600' : level === PRESSURE_LEVELS.HIGH ? 'text-orange-500' : 'text-stone-700'
          }`} />
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
            CROWD PRESSURE
          </h4>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-base font-extrabold font-mono text-stone-900">
            {index}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getBadgeStyle()}`}>
            {getLevelLabel()}
          </span>
        </div>
      </div>

      {/* Critical Pressure Summary */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/70">
          <span className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider block">
            HIGHEST PRESSURE
          </span>
          <span className="text-xs font-bold text-stone-800 truncate block mt-0.5" title={highestPressureZone}>
            {highestPressureZone}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/70">
          <span className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider block">
            OVERLOADED ZONES
          </span>
          <span className={`text-xs font-bold block mt-0.5 truncate ${
            overloadedZones.length > 0 ? 'text-rose-600' : 'text-emerald-700'
          }`}>
            {overloadedZones.length > 0 ? overloadedZones.join(', ') : 'None'}
          </span>
        </div>
      </div>

      {/* Zone Utilization Progress Bars */}
      {zones && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[10px] text-stone-500 font-semibold uppercase tracking-wider">
            <span>Operational Zones</span>
            <span>Utilization</span>
          </div>

          <div className="space-y-1">
            {['north', 'west', 'east', 'security', 'darshan'].map((zKey) => {
              const z = zones[zKey];
              if (!z) return null;
              const pct = z.utilizationPercent;
              const barColor =
                pct > 100
                  ? 'bg-rose-500'
                  : pct >= 85
                  ? 'bg-orange-500'
                  : pct >= 70
                  ? 'bg-amber-400'
                  : 'bg-emerald-500';

              return (
                <div key={zKey} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-stone-600 truncate max-w-[140px]">{z.name}</span>
                    <span className={`font-mono font-bold ${
                      pct > 100 ? 'text-rose-600' : 'text-stone-700'
                    }`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Capacity Alerts (Deduplicated Lifecycle) */}
      <div className="pt-2 border-t border-stone-100 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            CAPACITY ALERTS {alerts && alerts.length > 0 && `(${alerts.length})`}
          </span>
          {alerts && alerts.length > 0 ? (
            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
              Active Alerts
            </span>
          ) : (
            <span className="text-[9px] font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Within Capacity</span>
            </span>
          )}
        </div>

        {alerts && alerts.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
            {alerts.map((alert) => {
              const isEntrance = ['north', 'west', 'east', 'queue'].includes(alert.zone);
              const congestedKey = alert.zone === 'queue' ? 'north' : (alert.zone || 'north');
              const congestedName = congestedKey === 'north' ? 'North Raja Gopuram' : congestedKey === 'west' ? 'West Paschima Gopuram' : 'East Purva Gopuram';

              // Determine healthiest alternative entrance using actual runtime telemetry
              let targetKey = aiNavigationState?.targetStream;
              if (!targetKey || targetKey === congestedKey) {
                const candidates = ['west', 'east', 'north'].filter((k) => k !== congestedKey);
                candidates.sort((a, b) => {
                  const utilA = engine?.entranceStats?.[a]?.queueUtilization ?? (zones?.[a]?.utilizationPercent ?? 50);
                  const utilB = engine?.entranceStats?.[b]?.queueUtilization ?? (zones?.[b]?.utilizationPercent ?? 50);
                  return utilA - utilB;
                });
                targetKey = candidates[0] || 'west';
              }
              const targetName = targetKey === 'north' ? 'North Raja Gopuram' : targetKey === 'west' ? 'West Paschima Gopuram' : 'East Purva Gopuram';
              const targetTitle = targetKey === 'west' ? 'West' : targetKey === 'east' ? 'East' : 'North';

              const congestedUtil = Math.round(alert.utilization * 100);
              const targetUtil = engine?.entranceStats?.[targetKey]?.queueUtilization ?? (zones?.[targetKey]?.utilizationPercent ?? 42);
              const isBlocked = (engine?.entranceStats?.[congestedKey]?.congestionState === 'BLOCKED');
              const isCongested = isBlocked || (engine?.entranceStats?.[congestedKey]?.congestionState === 'CONGESTED') || congestedUtil >= 80;
              const movementText = isBlocked ? 'BLOCKED' : (engine?.entranceStats?.[congestedKey]?.avgSpeed < 0.35 ? 'SLOW' : 'FLOWING');
              const showRedirectionAction = isBlocked || aiNavigationState?.pendingApproval;

              return (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded-xl border text-[11px] space-y-2 ${
                    alert.severity === PRESSURE_LEVELS.OVER_CAPACITY
                      ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                      : 'bg-amber-50/80 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${
                        alert.severity === PRESSURE_LEVELS.OVER_CAPACITY ? 'text-rose-600' : 'text-amber-600'
                      }`} />
                      <span className="truncate">{alert.zoneName}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono uppercase ${
                      alert.severity === PRESSURE_LEVELS.OVER_CAPACITY ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {congestedUtil}%
                    </span>
                  </div>

                  <p className="text-[10px] leading-relaxed opacity-90">
                    {alert.message}
                  </p>

                  {/* Operational Response: Entrance Congestion Notification & Redirection */}
                  {isEntrance && (alert.severity === PRESSURE_LEVELS.OVER_CAPACITY || alert.severity === PRESSURE_LEVELS.HIGH) && (
                    <div className="pt-2 border-t border-rose-200/60 space-y-2">
                      {diversionApproved ? (
                        <div className="p-2 rounded-lg bg-emerald-100/80 border border-emerald-300 text-emerald-950 text-[10px] space-y-0.5">
                          <div className="flex items-center gap-1 font-bold text-emerald-900">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                            <span>BRIDGE REDIRECTION ACTIVE</span>
                          </div>
                          <p className="text-[9.5px] text-emerald-800 leading-tight">
                            Future arrivals are redirected via overpass bridge to {targetName}. Existing queue devotees continue their journey uninterrupted.
                          </p>
                        </div>
                      ) : aiNavigationState?.allQueuesOverloaded ? (
                        <div className="p-2 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-950 text-[10px] space-y-0.5">
                          <div className="flex items-center gap-1 font-bold text-amber-900">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                            <span>ALL ENTRANCE QUEUES UNDER HIGH LOAD</span>
                          </div>
                          <p className="text-[9.5px] text-amber-800 leading-tight">
                            No alternative entrance currently has spare capacity. Monitoring queue flow across all gates.
                          </p>
                        </div>
                      ) : showRedirectionAction ? (
                        <div className="space-y-2">
                          {/* Comparison Cards */}
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="p-2 rounded-xl bg-red-100/85 border border-red-200 text-stone-900 space-y-0.5">
                              <span className="font-extrabold text-[10px] text-red-800 block uppercase tracking-wide">
                                {congestedKey.toUpperCase()} ENTRANCE BLOCKED
                              </span>
                              <div className="text-[10px] text-stone-600">
                                Queue utilization: <strong className="font-mono text-red-700">{congestedUtil}%</strong>
                              </div>
                              <div className="text-[10px] text-stone-600">
                                Movement: <strong className="font-bold text-rose-700">{movementText}</strong>
                              </div>
                            </div>

                            <div className="p-2 rounded-xl bg-emerald-100/85 border border-emerald-200 text-stone-900 space-y-0.5">
                              <span className="font-extrabold text-[10px] text-emerald-800 block uppercase tracking-wide">
                                {targetKey.toUpperCase()} ENTRANCE
                              </span>
                              <div className="text-[10px] text-stone-600">
                                Utilization: <strong className="font-mono text-emerald-700">{targetUtil}%</strong>
                              </div>
                              <div className="text-[10px] text-stone-600">
                                Status: <strong className="font-bold text-emerald-700">FLOWING</strong>
                              </div>
                            </div>
                          </div>

                          <div className="text-[10.5px] font-semibold text-stone-800">
                            Redirect future arrivals to {targetTitle}?
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              id={`btn-redirect-future-arrivals-${congestedKey}`}
                              onClick={() => {
                                if (engine) {
                                  engine.approveRerouting(congestedKey, targetKey);
                                }
                                approveDiversion();
                              }}
                              className="flex-1 py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-[10px] font-bold shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title={`Redirect future arrivals to ${targetName} via bridge`}
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-200" />
                              <span>Redirect Future Arrivals</span>
                            </button>

                            <button
                              id={`btn-keep-current-routing-${congestedKey}`}
                              onClick={() => {
                                dismissDiversion();
                              }}
                              className="py-1.5 px-2.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                              title="Keep current entrance routing unchanged"
                            >
                              <span>Keep Current Routing</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-amber-50/90 border border-amber-200 text-stone-900 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-amber-900 uppercase">
                              {congestedKey.toUpperCase()} ENTRANCE {isCongested ? 'CONGESTED' : 'MONITORING'}
                            </span>
                            <span className="font-semibold text-stone-600">Movement: <strong className={movementText === 'FLOWING' ? 'text-emerald-700' : 'text-amber-700'}>{movementText}</strong></span>
                          </div>
                          <p className="text-[9.5px] text-stone-600 leading-tight">
                            Queue utilization is elevated ({congestedUtil}%), but crowd progression is currently healthy ({movementText}). Monitoring queue dynamics before recommending redirection.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-stone-400 italic">
            No active capacity alerts. Current queue dimensions accommodate devotee flow.
          </p>
        )}
      </div>
    </div>
  );
}
