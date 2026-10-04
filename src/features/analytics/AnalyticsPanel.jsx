import React, { useState } from 'react';
import { 
  BarChart3, 
  Activity, 
  Clock, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Hourglass,
  ScanFace
} from 'lucide-react';
import { useQueueStore } from '../../store/useQueueStore.js';
import { useSimulationStore } from '../simulation/simulationStore.js';
import { SimulationControls } from '../simulation/SimulationControls.jsx';
import { CrowdPressurePanel } from './CrowdPressurePanel.jsx';
import { WaitTimeChart } from './WaitTimeChart.jsx';
import { ThroughputChart } from './ThroughputChart.jsx';
import { formatNumber } from '../../utils/units.js';

export function AnalyticsPanel() {
  const scene = useQueueStore((state) => state.scene);
  const setSelectedComponentId = useQueueStore((state) => state.setSelectedComponentId);
  const runValidation = useQueueStore((state) => state.runValidation);

  const metrics = useSimulationStore((state) => state.metrics);
  const metricsHistory = useSimulationStore((state) => state.metricsHistory);

  const [activeSubTab, setActiveSubTab] = useState('simulation'); // 'simulation' | 'validation'
  const [showMoreCharts, setShowMoreCharts] = useState(false);

  const staticMetrics = scene.analysis?.metrics || {};
  const errors = scene.analysis?.errors || [];
  const warnings = scene.analysis?.warnings || [];
  const totalIssues = errors.length + warnings.length;

  const bottleneckZone = metrics?.bottleneck?.zone;
  const hasBottleneck = bottleneckZone && bottleneckZone !== 'Normal Flow';

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 select-none text-stone-800">
      {/* Header: Crowd Flow with Meaningful Validation Badge (Points 13, 20) */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-200/80">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-deva-maroon-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
            CROWD FLOW
          </h3>
        </div>

        {/* Meaningful Compact Validation Status Badge */}
        <button
          id="btn-subtab-val"
          onClick={() => setActiveSubTab(activeSubTab === 'validation' ? 'simulation' : 'validation')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
            activeSubTab === 'validation'
              ? 'ring-2 ring-stone-400 bg-stone-100'
              : errors.length > 0
              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              : warnings.length > 0
              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
          }`}
          title="Click to view layout spatial validation"
        >
          {errors.length > 0 ? (
            <>
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>⚠ {totalIssues} Layout Issues</span>
            </>
          ) : warnings.length > 0 ? (
            <>
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span>⚠ {warnings.length} Warnings</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>✓ Layout Valid</span>
            </>
          )}
        </button>
      </div>

      {activeSubTab === 'simulation' ? (
        <>
          {/* Priority Metrics: Capacity, Utilization, Wait, Throughput, Bottleneck (Points 14, 21) */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-3 shadow-soft space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* 1. Capacity */}
              <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/70">
                <span className="text-[10px] text-stone-500 font-medium block">Capacity</span>
                <span className="text-sm font-bold text-stone-900 block mt-0.5">
                  {formatNumber(staticMetrics.queueCapacity || 0)}
                </span>
                <span className="text-[9px] text-stone-400">devotees</span>
              </div>

              {/* 2. Utilization */}
              {(() => {
                const queueCap = staticMetrics.queueCapacity || 8752;
                const liveUtilization = queueCap > 0
                  ? Math.round(((metrics.visitorsInQueue || 0) / queueCap) * 100)
                  : 0;
                return (
                  <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/70">
                    <span className="text-[10px] text-stone-500 font-medium block">Utilization</span>
                    <span className="text-sm font-bold text-stone-900 block mt-0.5">
                      {liveUtilization}%
                    </span>
                    <span className={`text-[9px] font-medium ${
                      liveUtilization > 100
                        ? 'text-rose-600 font-bold'
                        : liveUtilization > 85
                        ? 'text-rose-600'
                        : liveUtilization > 0
                        ? 'text-emerald-600'
                        : 'text-stone-400'
                    }`}>
                      {liveUtilization > 100
                        ? 'Over capacity'
                        : liveUtilization > 85
                        ? 'High load'
                        : liveUtilization > 0
                        ? 'Optimal'
                        : 'Normal'}
                    </span>
                  </div>
                );
              })()}

              {/* 3. Wait */}
              <div className="p-2 rounded-xl bg-amber-50/40 border border-amber-200/60">
                <span className="text-[10px] text-amber-800 font-medium block">Wait Time</span>
                <span className="text-sm font-bold text-deva-maroon-800 block mt-0.5">
                  {metrics.avgWaitMinutes !== undefined ? metrics.avgWaitMinutes : 0} min
                </span>
                <span className="text-[9px] text-stone-400">average dwell</span>
              </div>

              {/* 4. Throughput */}
              <div className="p-2 rounded-xl bg-amber-50/40 border border-amber-200/60">
                <span className="text-[10px] text-amber-800 font-medium block">Throughput</span>
                <span className="text-sm font-bold text-deva-maroon-800 block mt-0.5">
                  {formatNumber(metrics.throughputPerHour || 0)}
                </span>
                <span className="text-[9px] text-stone-400">devotees / hr</span>
              </div>
            </div>

            {/* 5. Bottleneck (Point 21) */}
            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider block">
                  BOTTLENECK
                </span>
                <span className="text-xs font-bold text-stone-800 truncate block mt-0.5">
                  {hasBottleneck ? bottleneckZone : '✓ No Critical Bottleneck'}
                </span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                hasBottleneck ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`} />
            </div>
          </div>

          {/* Live Simulation Info Cards (Point 13) */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-3 shadow-soft space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
              LIVE DEVOTEES
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {/* Active Visitors */}
              <div className="p-1.5 rounded-lg bg-sky-50/60 border border-sky-100">
                <span className="text-[9px] font-medium text-sky-700 block">Active</span>
                <span className="text-xs font-bold text-sky-900">{formatNumber(metrics.visitorsActive)}</span>
              </div>

              {/* In Queue */}
              <div className="p-1.5 rounded-lg bg-amber-50/60 border border-amber-100">
                <span className="text-[9px] font-medium text-amber-700 block">In Queue</span>
                <span className="text-xs font-bold text-amber-900">{formatNumber(metrics.visitorsInQueue)}</span>
              </div>

              {/* Security */}
              <div className="p-1.5 rounded-lg bg-indigo-50/60 border border-indigo-100">
                <span className="text-[9px] font-medium text-indigo-700 block">Security</span>
                <span className="text-xs font-bold text-indigo-900">{formatNumber(metrics.visitorsInSecurity)}</span>
              </div>

              {/* Darshan */}
              <div className="p-1.5 rounded-lg bg-amber-50/80 border border-amber-200/60">
                <span className="text-[9px] font-medium text-amber-800 block">Darshan</span>
                <span className="text-xs font-bold text-amber-950">{formatNumber(metrics.visitorsInDarshan)}</span>
              </div>

              {/* Completed */}
              <div className="p-1.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <span className="text-[9px] font-medium text-emerald-700 block">Completed</span>
                <span className="text-xs font-bold text-emerald-900">{formatNumber(metrics.visitorsCompleted)}</span>
              </div>

              {/* Throughput */}
              <div className="p-1.5 rounded-lg bg-stone-50 border border-stone-200/70">
                <span className="text-[9px] font-medium text-stone-600 block">Flow Rate</span>
                <span className="text-xs font-bold text-stone-900">{formatNumber(metrics.throughputPerHour)}/h</span>
              </div>
            </div>
          </div>

          {/* Real-Time Architectural Crowd Pressure & Capacity Alerts Engine */}
          <CrowdPressurePanel />

          {/* Simulation Playback & Speed Controls */}
          <SimulationControls />

          {/* Collapsible Detailed Charts (Point 14) */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-3 shadow-soft space-y-2">
            <button
              onClick={() => setShowMoreCharts(!showMoreCharts)}
              className="w-full flex items-center justify-between text-xs font-semibold text-stone-700 hover:text-stone-900 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-deva-maroon-700" />
                <span>More Flow Analytics & Charts</span>
              </div>
              {showMoreCharts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showMoreCharts && (
              <div className="space-y-3 pt-2 border-t border-stone-100 animate-in fade-in duration-150">
                {/* Wait-Time Progression */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-stone-600">
                    <span>Wait-Time Progression</span>
                    <span className="text-[9px] font-mono text-stone-400">D3.js</span>
                  </div>
                  <WaitTimeChart data={metricsHistory} width={260} height={120} />
                </div>

                {/* Throughput Trend */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-stone-600">
                    <span>Throughput (Visitors / hr)</span>
                    <span className="text-[9px] font-mono text-stone-400">D3.js</span>
                  </div>
                  <ThroughputChart data={metricsHistory} width={260} height={110} />
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Validation Details View (Point 20) */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800">
              Spatial Validation ({totalIssues} issues)
            </span>
            <button
              onClick={runValidation}
              className="text-[11px] font-semibold text-deva-maroon-800 underline hover:text-deva-maroon-900 cursor-pointer"
            >
              Re-run Check
            </button>
          </div>

          {errors.length === 0 && warnings.length === 0 ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-emerald-900">Layout is Fully Valid</p>
              <p className="text-[11px] text-emerald-700">
                All components fit safely within site boundaries with no spatial collisions.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {errors.map((err, idx) => (
                <div
                  key={`err-${idx}`}
                  onClick={() => err.componentId && setSelectedComponentId(err.componentId)}
                  className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1 cursor-pointer hover:bg-rose-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-rose-950">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    <span>{err.type?.toUpperCase()} ERROR</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-900">{err.message}</p>
                </div>
              ))}

              {warnings.map((warn, idx) => (
                <div
                  key={`warn-${idx}`}
                  onClick={() => warn.componentId && setSelectedComponentId(warn.componentId)}
                  className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1 cursor-pointer hover:bg-amber-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-950">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>{warn.type?.toUpperCase()} WARNING</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900">{warn.message}</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setActiveSubTab('simulation')}
            className="w-full py-1.5 text-center text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
          >
            &larr; Back to Crowd Flow
          </button>
        </div>
      )}
    </div>
  );
}
