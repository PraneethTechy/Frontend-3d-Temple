import React, { useState } from 'react';
import { 
  Sparkles, 
  RotateCw, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Sliders, 
  HelpCircle,
  Shield,
  Layers
} from 'lucide-react';
import { useQueueStore } from '../../store/useQueueStore.js';
import { 
  QUEUE_TEMPLATES, 
  QUEUE_TEMPLATE_LABELS 
} from '../../services/layout/layoutGenerator.js';

export function QueuePlannerPanel() {
  const scene = useQueueStore((state) => state.scene);
  const generationOptions = useQueueStore((state) => state.generationOptions);
  const setGenerationOptions = useQueueStore((state) => state.setGenerationOptions);
  const generateLayout = useQueueStore((state) => state.generateLayout);
  const clearGeneratedLayout = useQueueStore((state) => state.clearGeneratedLayout);

  const loadFestivalScenario = useQueueStore((state) => state.loadFestivalScenario);
  const alignQueueToTempleAxis = useQueueStore((state) => state.alignQueueToTempleAxis);

  const [feedback, setFeedback] = useState(null);
  const [festivalSummary, setFestivalSummary] = useState(null);

  const hasGeneratedComponents = scene.components.some((c) => c.generated);
  const hasArchitecture = scene.components.some(
    (c) =>
      c.type === 'entrance_gopuram' ||
      c.type === 'main_gopuram' ||
      c.type === 'darshan_sanctum' ||
      c.type === 'temple_gateway'
  );

  const handleGenerateFestival = () => {
    setFeedback(null);
    loadFestivalScenario();
    setFestivalSummary({
      title: '100K Temple Festival Crowd System Generated',
      details: [
        '6 Entrances',
        '4 Holding Zones',
        '16 Security Channels',
        '16 Queue Lanes',
        '4 Darshan Zones',
        '6 Exits',
        '1 Overflow Zone',
        '1 Entrance Gopuram',
        '1 Main Gopuram',
        '1 Main Darshan/Sanctum',
      ],
      nextStep: 'Inspect the layout in 2D or 3D, then start Simulation to observe crowd movement.',
    });
  };

  const handleGenerate = () => {
    setFeedback(null);
    setFestivalSummary(null);
    const result = generateLayout();
    if (!result.success) {
      setFeedback({
        type: 'error',
        title: 'Layout Generation Failed',
        message: result.reason,
        suggestion: result.suggestion,
      });
    } else {
      setFeedback({
        type: 'success',
        title: 'Queue Layout Generated',
        message: `Successfully placed ${result.components.length} components using ${QUEUE_TEMPLATE_LABELS[result.template]}.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleTemplateChange = (tmpl) => {
    // Adapt default lane count based on template
    let defaultLanes = generationOptions.lanes;
    if (tmpl === QUEUE_TEMPLATES.SPLIT) {
      defaultLanes = 2;
    } else if (tmpl === QUEUE_TEMPLATES.U_SHAPE) {
      defaultLanes = 2;
    } else if (defaultLanes < 3) {
      defaultLanes = 4;
    }

    setGenerationOptions({
      template: tmpl,
      lanes: defaultLanes,
    });
  };

  return (
    <div className="h-full flex flex-col select-none">
      {/* Header */}
      <div className="p-4 border-b border-stone-200/80 bg-stone-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-deva-maroon-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
            Queue Planner
          </h3>
        </div>
        <span className="text-[10px] font-semibold text-deva-gold-800 bg-deva-gold-100/80 px-2 py-0.5 rounded-full border border-deva-gold-300/70">
          Procedural Engine
        </span>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Helper Note */}
        <p className="text-[11px] text-stone-500 leading-relaxed">
          Select a template and parameters to automatically generate a complete crowd layout dimensioned to fit inside this site.
        </p>

        {/* Scenario Presets (Point 4) */}
        <div className="p-3 bg-gradient-to-br from-amber-50 to-stone-50 rounded-xl border border-amber-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <span>🛕</span>
              Scenario Presets
            </span>
            <span className="text-[9px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
              100K Devotees
            </span>
          </div>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            5 Gopurams, 3 entrance streams, dedicated South Exit &amp; 16 queue paths.
          </p>
          <button
            id="btn-generate-festival-scenario"
            type="button"
            onClick={handleGenerateFestival}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-deva-maroon-800 hover:from-amber-700 hover:to-deva-maroon-900 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <span>Load 100K Festival Campus</span>
          </button>
        </div>

        {/* Festival Reference Scenario Summary Card */}
        {festivalSummary && (
          <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent border border-amber-300 rounded-2xl space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <span className="text-base">🛕</span>
              <span>{festivalSummary.title}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-stone-700 font-medium pl-1">
              {festivalSummary.details.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-deva-maroon-800 font-semibold pt-1 border-t border-amber-200/80">
              {festivalSummary.nextStep}
            </p>
          </div>
        )}

        {/* Empty States */}
        {scene.components.length === 0 && (
          <div className="p-3 bg-stone-100/90 border border-stone-200 rounded-xl text-stone-600 text-xs">
            <p className="font-medium text-[11px]">
              Define your site and generate a crowd layout to begin.
            </p>
          </div>
        )}

        {!hasArchitecture && scene.components.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
            <span className="text-base">🛕</span>
            <p className="font-medium text-[11px]">
              Add an Entrance Gopuram or Main Gopuram to establish the temple destination.
            </p>
          </div>
        )}

        {/* 1. Queue Template Selection */}
        <div className="p-3 bg-white rounded-xl border border-stone-200/80 shadow-sm space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block">
            Queue Type / Template
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(QUEUE_TEMPLATE_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                id={`btn-template-${key}`}
                onClick={() => handleTemplateChange(key)}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold text-left transition-all border ${
                  generationOptions.template === key
                    ? 'bg-deva-maroon-800 text-white border-deva-maroon-900 shadow-sm'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Geometric Parameters */}
        <div className="p-3 bg-white rounded-xl border border-stone-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
            <Sliders className="w-3.5 h-3.5 text-deva-maroon-700" />
            <span>Channel Dimensions</span>
          </div>

          {/* Number of Lanes (only for Parallel and Serpentine) */}
          {generationOptions.template !== QUEUE_TEMPLATES.U_SHAPE && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="input-gen-lanes" className="font-medium text-stone-700">
                  {generationOptions.template === QUEUE_TEMPLATES.SPLIT
                    ? 'Branch Channels'
                    : 'Number of Lanes'}
                </label>
                <span className="font-mono font-bold text-deva-maroon-800">
                  {generationOptions.lanes}
                </span>
              </div>
              <input
                id="input-gen-lanes"
                type="range"
                min={generationOptions.template === QUEUE_TEMPLATES.SPLIT ? 2 : 2}
                max={generationOptions.template === QUEUE_TEMPLATES.SPLIT ? 3 : 8}
                value={generationOptions.lanes}
                onChange={(e) => setGenerationOptions({ lanes: parseInt(e.target.value, 10) })}
                className="w-full accent-deva-maroon-700 cursor-pointer"
              />
            </div>
          )}

          {/* Lane Width */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor="input-gen-width" className="font-medium text-stone-700">
                Lane Width (m)
              </label>
              <span className="font-mono font-bold text-deva-maroon-800">
                {generationOptions.laneWidth.toFixed(1)} m
              </span>
            </div>
            <input
              id="input-gen-width"
              type="range"
              min="1.0"
              max="4.0"
              step="0.2"
              value={generationOptions.laneWidth}
              onChange={(e) => setGenerationOptions({ laneWidth: parseFloat(e.target.value) })}
              className="w-full accent-deva-maroon-700 cursor-pointer"
            />
          </div>

          {/* Lane Spacing */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor="input-gen-spacing" className="font-medium text-stone-700">
                Inter-Lane Spacing (m)
              </label>
              <span className="font-mono font-bold text-deva-maroon-800">
                {generationOptions.spacing.toFixed(1)} m
              </span>
            </div>
            <input
              id="input-gen-spacing"
              type="range"
              min="0.6"
              max="3.5"
              step="0.1"
              value={generationOptions.spacing}
              onChange={(e) => setGenerationOptions({ spacing: parseFloat(e.target.value) })}
              className="w-full accent-deva-maroon-700 cursor-pointer"
            />
          </div>
        </div>

        {/* 3. Facility Inclusions */}
        <div className="p-3 bg-white rounded-xl border border-stone-200/80 shadow-sm space-y-2.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block">
            Facilities In Queue Path
          </label>

          <label className="flex items-center gap-2.5 text-xs text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={generationOptions.includeSecurity}
              onChange={(e) => setGenerationOptions({ includeSecurity: e.target.checked })}
              className="w-4 h-4 rounded text-deva-maroon-700 focus:ring-deva-maroon-700 accent-deva-maroon-800"
            />
            <span>Include Security Screening Checkpoint</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={generationOptions.includeWaitingArea}
              onChange={(e) => setGenerationOptions({ includeWaitingArea: e.target.checked })}
              className="w-4 h-4 rounded text-deva-maroon-700 focus:ring-deva-maroon-700 accent-deva-maroon-800"
            />
            <span>Include Side Holding Bay / Waiting Area</span>
          </label>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-stone-200/80 bg-white space-y-2">

        {hasArchitecture && (
          <button
            id="btn-align-queue-temple-axis"
            type="button"
            onClick={alignQueueToTempleAxis}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Align all queue lanes towards the sacred Temple Axis"
          >
            <span>Align Queue to Temple Axis</span>
          </button>
        )}

        <button
          id="btn-generate-layout"
          type="button"
          onClick={handleGenerate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-deva-maroon-800 hover:bg-deva-maroon-900 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-medium transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-deva-gold-300" />
          <span>{hasGeneratedComponents ? 'Regenerate Procedural Layout' : 'Generate Procedural Layout'}</span>
        </button>

        {hasGeneratedComponents && (
          <button
            id="btn-clear-layout"
            type="button"
            onClick={() => {
              clearGeneratedLayout();
              setFestivalSummary(null);
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-stone-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Generated Layout</span>
          </button>
        )}
      </div>
    </div>
  );
}
