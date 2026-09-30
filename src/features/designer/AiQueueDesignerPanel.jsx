import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Bot, 
  Send, 
  Check, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  Layers, 
  ArrowRight, 
  Loader2, 
  TrendingUp, 
  ShieldCheck, 
  RotateCcw,
  Zap,
  Info,
  Landmark
} from 'lucide-react';
import { useQueueStore } from '../../store/useQueueStore.js';
import { requestAiLayout, checkAiServiceStatus } from '../ai/aiService.js';
import { formatNumber } from '../../utils/units.js';

const QUICK_TEMPLE_PROMPTS = [
  {
    label: '🛕 100K Festival Campus',
    text: 'Design a 5-Gopuram multi-stream festival layout with 16 DFMD screening points, multiple holding bays and Garbhagriha flow.',
  },
  {
    label: '⚡ Dual-Stream Fast Darshan',
    text: 'Design a dual-stream queue with dedicated VIP Fast Darshan and general devotee serpentine lanes with security checkpoints.',
  },
  {
    label: '🔄 High-Density Serpentine',
    text: 'Maximize queue capacity using continuous serpentine lanes with 2.0m width, security checkpoints and waiting bay.',
  },
  {
    label: '🚪 Express Parallel Flow',
    text: 'Design a high-throughput parallel queue configuration with wide channels for rapid festival crowd clearance.',
  },
];

export function AiQueueDesignerPanel() {
  const scene = useQueueStore((state) => state.scene);
  const previewLayout = useQueueStore((state) => state.previewLayout);
  const isPreviewing = useQueueStore((state) => state.isPreviewing);
  const startPreview = useQueueStore((state) => state.startPreview);
  const exitPreview = useQueueStore((state) => state.exitPreview);
  const applyAiRecommendation = useQueueStore((state) => state.applyAiRecommendation);

  const [promptText, setPromptText] = useState('');
  const [includeTempleArchitecture, setIncludeTempleArchitecture] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState(null); // 'generate' | 'optimize'
  const [errorMessage, setErrorMessage] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [optimizationRec, setOptimizationRec] = useState(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(null);

  // Check backend service configuration on mount
  useEffect(() => {
    checkAiServiceStatus().then((status) => {
      setServiceStatus(status);
    });
  }, []);

  const handleGenerate = async (allowFallback = true) => {
    setIsLoading(true);
    setLoadingMode('generate');
    setErrorMessage(null);
    setOptimizationRec(null);

    const defaultPrompt = promptText.trim() || 
      `Design a queue for ${scene.requirements?.peakVisitors || 1500} peak visitors with entrance, temple gopurams and security checkpoints.`;

    const result = await requestAiLayout({
      scene: {
        ...scene,
        options: {
          ...scene.options,
          includeTempleArchitecture,
        },
      },
      prompt: defaultPrompt,
      mode: 'generate',
      allowFallback,
    });

    setIsLoading(false);
    setLoadingMode(null);

    if (!result.success) {
      setErrorMessage(result.message || 'AI layout generation is temporarily unavailable. You can continue designing manually.');
      setRecommendations([]);
      return;
    }

    setRecommendations(result.recommendations || []);
    setIsFallbackMode(Boolean(result.isFallback));
  };

  const handleOptimize = async (allowFallback = true) => {
    setIsLoading(true);
    setLoadingMode('optimize');
    setErrorMessage(null);
    setRecommendations([]);

    const result = await requestAiLayout({
      scene: {
        ...scene,
        options: {
          ...scene.options,
          includeTempleArchitecture,
        },
      },
      prompt: promptText.trim() || 'Optimize current crowd flow and eliminate bottlenecks',
      mode: 'optimize',
      allowFallback,
    });

    setIsLoading(false);
    setLoadingMode(null);

    if (!result.success) {
      setErrorMessage(result.message || 'AI layout optimization is temporarily unavailable. You can continue designing manually.');
      setOptimizationRec(null);
      return;
    }

    setOptimizationRec(result.recommendation);
    setIsFallbackMode(Boolean(result.isFallback));
  };

  const handleDismiss = () => {
    setRecommendations([]);
    setOptimizationRec(null);
    setErrorMessage(null);
    if (isPreviewing) {
      exitPreview();
    }
  };

  const currentCapacity = scene.analysis?.metrics?.queueCapacity || 0;
  const currentWait = scene.analysis?.metrics?.estimatedWaitMinutes || 0;
  const currentUtil = scene.analysis?.metrics?.utilization || 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="border-b border-stone-200/80 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-deva-maroon-50 border border-deva-maroon-200 flex items-center justify-center text-deva-maroon-800">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 tracking-tight font-serif">
                AI QUEUE DESIGNER
              </h2>
              <p className="text-[11px] text-stone-500">Spatial Planning & Layout Optimization</p>
            </div>
          </div>
          {serviceStatus && (
            <span 
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                serviceStatus.configured 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={serviceStatus.configured ? `Model: ${serviceStatus.model}` : 'OpenRouter key ready or deterministic mode'}
            >
              {serviceStatus.configured ? 'AI Ready' : 'Deterministic Mode'}
            </span>
          )}
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
          Quick Temple Scenarios
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TEMPLE_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPromptText(qp.text)}
              className="text-[10px] font-medium px-2 py-1 bg-stone-100 hover:bg-deva-maroon-50 hover:text-deva-maroon-800 hover:border-deva-maroon-300 text-stone-700 rounded-md border border-stone-200/80 transition-all cursor-pointer text-left"
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Crowd Requirement Prompt Box */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="ai-requirement-input" className="block text-xs font-semibold text-stone-700">
            Describe your queue & crowd requirement
          </label>
          {promptText && (
            <button
              onClick={() => setPromptText('')}
              className="text-[10px] text-stone-400 hover:text-stone-600 underline"
            >
              Clear
            </button>
          )}
        </div>
        <textarea
          id="ai-requirement-input"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder={`e.g. Design a queue for ${scene.requirements?.peakVisitors || 1500} peak visitors with entrance, gopurams and security checkpoints.`}
          rows={3}
          disabled={isLoading}
          className="w-full text-xs rounded-lg border border-stone-300 p-2.5 bg-stone-50/70 focus:bg-white focus:ring-1 focus:ring-deva-maroon-500 focus:border-deva-maroon-500 transition-all outline-none resize-none placeholder:text-stone-400"
        />

        {/* Coordinated Architecture Toggle */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeTempleArchitecture}
              onChange={(e) => setIncludeTempleArchitecture(e.target.checked)}
              className="rounded border-stone-300 text-deva-maroon-700 focus:ring-deva-maroon-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
              <Landmark className="w-3 h-3 text-amber-700" />
              Build Temple Architecture (Gopurams & Sanctum)
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between text-[11px] text-stone-400 pt-0.5">
          <span>Site: {scene.site?.length}m × {scene.site?.width}m</span>
          <span>Peak: {scene.requirements?.peakVisitors?.toLocaleString() || 0} visitors</span>
        </div>

        {/* Quick Scenario & Design Prompts */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
            Suggested Prompts &amp; Presets
          </span>
          <div className="flex flex-wrap gap-1">
            {QUICK_TEMPLE_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPromptText(qp.text)}
                className="text-[11px] px-2 py-1 rounded-md bg-stone-100 hover:bg-stone-200/80 text-stone-700 transition-colors border border-stone-200/80 cursor-pointer text-left"
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          id="btn-generate-ai-layouts"
          onClick={() => handleGenerate(true)}
          disabled={isLoading}
          className="w-full py-2.5 px-3 bg-deva-maroon-700 hover:bg-deva-maroon-800 disabled:bg-stone-300 text-white rounded-lg text-xs font-semibold shadow-soft hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
        >
          {isLoading && loadingMode === 'generate' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              <span>AI is designing queue & architecture...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-deva-gold-400" />
              <span>Generate AI Layouts</span>
            </>
          )}
        </button>

        <button
          id="btn-optimize-current-layout"
          onClick={() => handleOptimize(true)}
          disabled={isLoading || scene.components?.length === 0}
          className="w-full py-2 px-3 bg-white hover:bg-stone-50 border border-stone-300 disabled:border-stone-200 disabled:bg-stone-100 text-stone-700 disabled:text-stone-400 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          title={scene.components?.length === 0 ? 'Place or generate components first to optimize' : 'Optimize layout and eliminate bottlenecks'}
        >
          {isLoading && loadingMode === 'optimize' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-deva-maroon-700" />
              <span>AI is analyzing bottlenecks...</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Optimize Current Layout</span>
            </>
          )}
        </button>
      </div>

      {/* Graceful Error Notification Card */}
      {errorMessage && (
        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950">AI Service Notice</p>
              <p className="text-[11px] leading-relaxed text-amber-900">{errorMessage}</p>
            </div>
          </div>
          <div className="pt-1 flex items-center justify-between border-t border-amber-200/60">
            <span className="text-[10px] text-amber-800">You can continue designing manually.</span>
            <button
              onClick={() => handleGenerate(true)}
              className="text-[10px] font-semibold text-deva-maroon-800 underline hover:text-deva-maroon-900 cursor-pointer"
            >
              Use Procedural Proposals
            </button>
          </div>
        </div>
      )}

      {/* Fallback Mode Badge */}
      {isFallbackMode && (recommendations.length > 0 || optimizationRec) && (
        <div className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-1.5 text-[11px] text-blue-800">
          <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span>High-confidence procedural proposals generated to fit site dimensions.</span>
        </div>
      )}

      {/* Optimization Mode Comparison Result */}
      {optimizationRec && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-900">Optimization Comparison</span>
            <button
              onClick={handleDismiss}
              className="text-[11px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-xl p-3 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-deva-maroon-800 uppercase tracking-wide">
                {optimizationRec.title}
              </span>
              {optimizationRec.fits ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Fits Site
                </span>
              ) : (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Exceeds Site
                </span>
              )}
            </div>

            {/* Metrics Comparison */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-stone-50 rounded-lg border border-stone-200/70 text-xs">
              <div>
                <span className="text-[10px] text-stone-500 block">Queue Capacity</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-stone-800">
                    {formatNumber(optimizationRec.optimizedMetrics?.queueCapacity || 0)}
                  </span>
                  {optimizationRec.diff?.capacityDiff !== 0 && (
                    <span 
                      className={`text-[10px] font-bold ${
                        (optimizationRec.diff?.capacityDiff || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      ({optimizationRec.diff?.capacityDiff > 0 ? '+' : ''}{optimizationRec.diff?.capacityDiff})
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-stone-500 block">Est. Wait Time</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-stone-800">
                    {optimizationRec.optimizedMetrics?.estimatedWaitMinutes || 0} min
                  </span>
                  {optimizationRec.diff?.waitMinutesDiff !== 0 && (
                    <span 
                      className={`text-[10px] font-bold ${
                        (optimizationRec.diff?.waitMinutesDiff || 0) < 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      ({optimizationRec.diff?.waitMinutesDiff > 0 ? '+' : ''}{optimizationRec.diff?.waitMinutesDiff}m)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Itemized Changes */}
            {optimizationRec.changes && optimizationRec.changes.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Key Improvements
                </span>
                <ul className="text-xs text-stone-700 space-y-1 pl-3 list-disc marker:text-deva-maroon-600">
                  {optimizationRec.changes.map((c, idx) => (
                    <li key={idx} className="text-[11px] leading-tight">{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
              <button
                onClick={() => {
                  if (isPreviewing && previewLayout?.id === optimizationRec.id) {
                    exitPreview();
                  } else {
                    startPreview(optimizationRec);
                  }
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isPreviewing && previewLayout?.id === optimizationRec.id
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                }`}
              >
                {isPreviewing && previewLayout?.id === optimizationRec.id ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                    <span>Exit Preview</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-stone-600" />
                    <span>Preview in 3D</span>
                  </>
                )}
              </button>

              <button
                onClick={() => applyAiRecommendation(optimizationRec)}
                className="flex-1 py-1.5 px-3 bg-deva-maroon-700 hover:bg-deva-maroon-800 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Optimization</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Up to 3 AI Layout Alternatives Cards */}
      {recommendations.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-900 tracking-tight">
              Recommended Layouts ({recommendations.length})
            </span>
            <button
              onClick={handleDismiss}
              className="text-[11px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <div className="space-y-3">
            {recommendations.map((rec, index) => {
              const isSelectedForPreview = isPreviewing && previewLayout?.id === rec.id;
              const metrics = rec.analysis?.metrics || {};
              const fits = rec.fits;

              return (
                <div
                  key={rec.id || index}
                  className={`bg-white border rounded-xl p-3 shadow-soft transition-all space-y-2.5 ${
                    isSelectedForPreview
                      ? 'border-amber-400 ring-2 ring-amber-200/80 bg-amber-50/20'
                      : 'border-stone-200/90 hover:border-stone-300'
                  }`}
                >
                  {/* Card Title & Topology Badge */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-deva-maroon-700 uppercase tracking-wider block">
                        OPTION {String.fromCharCode(65 + index)}
                      </span>
                      <h3 className="text-xs font-bold text-stone-900">
                        {rec.intent?.template?.toUpperCase()} • {rec.intent?.lanes} LANES
                      </h3>
                    </div>

                    {fits ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Fits Site
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        Exceeds Bounds
                      </span>
                    )}
                  </div>

                  {/* Deterministic Metrics Grid */}
                  {fits ? (
                    <div className="grid grid-cols-3 gap-1.5 py-1.5 px-2 bg-stone-50 rounded-lg border border-stone-200/60 text-center">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-500 block">
                          Capacity
                        </span>
                        <span className="text-xs font-bold text-stone-800">
                          {formatNumber(metrics.queueCapacity || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-500 block">
                          Utilization
                        </span>
                        <span className="text-xs font-bold text-stone-800">
                          {metrics.utilization || 0}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-500 block">
                          Wait Time
                        </span>
                        <span className="text-xs font-bold text-stone-800">
                          {metrics.estimatedWaitMinutes || 0}m
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-rose-50 rounded-lg border border-rose-200 text-[11px] text-rose-800">
                      {rec.fitReason || 'This layout proposal exceeds the available physical site area.'}
                    </div>
                  )}

                  {/* AI Reasoning Narrative */}
                  {rec.aiReasoning && (
                    <p className="text-[11px] text-stone-600 italic leading-snug">
                      "{rec.aiReasoning}"
                    </p>
                  )}

                  {/* Action Buttons: 3D Preview & Apply */}
                  <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                    <button
                      onClick={() => {
                        if (isSelectedForPreview) {
                          exitPreview();
                        } else {
                          startPreview(rec);
                        }
                      }}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isSelectedForPreview
                          ? 'bg-amber-100 border-amber-300 text-amber-900'
                          : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {isSelectedForPreview ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                          <span>Exit Preview</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-stone-500" />
                          <span>3D Preview</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => applyAiRecommendation(rec)}
                      className="flex-1 py-1.5 px-2.5 bg-deva-maroon-700 hover:bg-deva-maroon-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
