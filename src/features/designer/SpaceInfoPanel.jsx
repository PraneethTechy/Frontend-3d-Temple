import React from 'react';
import { 
  Building, 
  Maximize2, 
  Users, 
  TrendingUp, 
  Edit3, 
  Info,
  Sparkles,
  BarChart3,
  AlertTriangle,
  Bot
} from 'lucide-react';
import { useQueueStore } from '../../store/useQueueStore.js';
import { calculateAreaMetrics, formatNumber, UNIT_LABELS } from '../../utils/units.js';
import { ComponentPropertyPanel } from './ComponentPropertyPanel.jsx';
import { QueuePlannerPanel } from './QueuePlannerPanel.jsx';
import { LayoutAnalysisPanel } from './LayoutAnalysisPanel.jsx';
import { AiQueueDesignerPanel } from './AiQueueDesignerPanel.jsx';
import { AnalyticsPanel } from '../analytics/AnalyticsPanel.jsx';

export function SpaceInfoPanel() {
  const scene = useQueueStore((state) => state.scene);
  const selectedComponentId = useQueueStore((state) => state.selectedComponentId);
  const setFormModalOpen = useQueueStore((state) => state.setFormModalOpen);
  const activeSidebarTab = useQueueStore((state) => state.activeSidebarTab) || 'info';
  const setActiveSidebarTab = useQueueStore((state) => state.setActiveSidebarTab);

  const selectedComponent = scene.components?.find((c) => c.id === selectedComponentId);

  // If a component is selected, render Component Properties ONLY in Manual Mode (Section 20)
  if (selectedComponent && activeSidebarTab !== 'analysis') {
    return (
      <aside className="w-80 h-full bg-white/95 backdrop-blur-md border-l border-stone-200/80 flex flex-col flex-shrink-0 select-none shadow-soft z-20">
        <ComponentPropertyPanel component={selectedComponent} />
      </aside>
    );
  }

  // Count validation issues for tab badge
  const issuesCount = (scene.analysis?.errors?.length || 0) + (scene.analysis?.warnings?.length || 0);

  return (
    <aside className="w-80 h-full bg-white/95 backdrop-blur-md border-l border-stone-200/80 flex flex-col flex-shrink-0 select-none shadow-soft z-20">
      {/* 3 Compact Tabs Header (Point 12) */}
      <div className="border-b border-stone-200/80 bg-stone-50/70 p-1 flex items-center gap-1 flex-shrink-0">
        <button
          id="tab-btn-ai"
          onClick={() => setActiveSidebarTab('ai')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
            activeSidebarTab === 'ai'
              ? 'bg-white text-deva-maroon-800 shadow-xs border border-stone-200/60 font-bold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
          title="AI Spatial Planning Assistant"
        >
          <Bot className="w-3.5 h-3.5 text-deva-maroon-700" />
          <span>AI</span>
        </button>

        <button
          id="tab-btn-planner"
          onClick={() => setActiveSidebarTab('planner')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
            activeSidebarTab === 'planner' || activeSidebarTab === 'info'
              ? 'bg-white text-deva-maroon-800 shadow-xs border border-stone-200/60 font-bold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
          title="Procedural Queue Planner"
        >
          <Sparkles className="w-3.5 h-3.5 text-deva-gold-600" />
          <span>PLANNER</span>
        </button>

        <button
          id="tab-btn-analysis"
          onClick={() => setActiveSidebarTab('analysis')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer relative ${
            activeSidebarTab === 'analysis'
              ? 'bg-white text-deva-maroon-800 shadow-xs border border-stone-200/60 font-bold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
          title="Crowd Flow & Simulation Analysis"
        >
          <BarChart3 className="w-3.5 h-3.5 text-deva-maroon-700" />
          <span>ANALYSIS</span>
          {issuesCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeSidebarTab === 'ai' && <AiQueueDesignerPanel />}
        {(activeSidebarTab === 'planner' || activeSidebarTab === 'info') && <QueuePlannerPanel />}
        {activeSidebarTab === 'analysis' && <AnalyticsPanel />}
        {activeSidebarTab === 'info' && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-stone-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-deva-maroon-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Space Info
                </h2>
              </div>
              <button
                id="btn-edit-dimensions"
                onClick={() => setFormModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-deva-maroon-800 bg-deva-maroon-50 hover:bg-deva-maroon-100 rounded-lg border border-deva-maroon-200/70 transition-colors"
                title="Edit space dimensions"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Temple Name Card */}
              <div className="p-3.5 bg-gradient-to-br from-deva-ivory-100 to-deva-ivory-200 rounded-xl border border-stone-200/90 shadow-sm">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-deva-maroon-800 mb-1">
                  <Building className="w-3.5 h-3.5 text-deva-maroon-700" />
                  <span>Temple</span>
                </div>
                <div className="text-sm font-bold text-stone-900 leading-snug break-words font-serif">
                  {scene.temple.name || 'Unnamed Temple'}
                </div>
              </div>

              {/* Spatial Footprint Card */}
              <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  <div className="flex items-center gap-1.5 text-stone-700">
                    <Maximize2 className="w-3.5 h-3.5 text-deva-maroon-700" />
                    <span>Available Space</span>
                  </div>
                  <span className="font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70">
                    {scene.site.unit}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Dimensions:</span>
                    <span className="font-mono font-bold text-stone-900">
                      {formatNumber(scene.site.length)} {UNIT_LABELS[scene.site.unit]} &times; {formatNumber(scene.site.width)} {UNIT_LABELS[scene.site.unit]}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Surface Area:</span>
                    <span className="font-mono font-bold text-deva-maroon-800 text-sm">
                      {formatNumber(calculateAreaMetrics(scene.site.length, scene.site.width, scene.site.unit).displayArea)} {calculateAreaMetrics(scene.site.length, scene.site.width, scene.site.unit).displayUnit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Crowd Requirements Card */}
              <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 shadow-sm space-y-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-700">
                  <Users className="w-3.5 h-3.5 text-deva-maroon-700" />
                  <span>Visitor Requirements</span>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Expected Visitors:</span>
                    <span className="font-mono font-bold text-stone-900">
                      {formatNumber(scene.requirements.expectedVisitors, 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Peak Concurrent:</span>
                    <span className="font-mono font-bold text-stone-900">
                      {formatNumber(scene.requirements.peakVisitors, 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Prompt */}
              <div className="p-3 bg-deva-maroon-50 rounded-xl border border-deva-maroon-200 text-xs text-deva-maroon-900 space-y-2">
                <div className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-deva-gold-600" />
                  <span>Ready to Plan Queues?</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-snug">
                  Switch to the <strong>Planner</strong> tab to automatically generate a complete crowd queue layout fitting this exact footprint.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab('planner')}
                  className="w-full py-1.5 px-3 bg-deva-maroon-800 text-white rounded-lg font-semibold text-xs text-center hover:bg-deva-maroon-900 transition-colors"
                >
                  Open Queue Planner &rarr;
                </button>
              </div>
            </div>

            <div className="p-3 border-t border-stone-100 bg-stone-50/50 text-[10px] text-stone-500 flex items-center justify-between">
              <span>Spatial 3D Model Synced</span>
              <span className="font-mono text-stone-400">Phase 3</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
