import React from 'react';
import { 
  X, 
  Copy, 
  Trash2, 
  Move, 
  RotateCw, 
  Grid, 
  Maximize2, 
  Compass, 
  Sliders, 
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { useQueueStore } from '../../store/useQueueStore.js';
import { checkSiteBounds } from '../../utils/componentDefaults.js';

export function ComponentPropertyPanel({ component }) {
  const updateComponent = useQueueStore((state) => state.updateComponent);
  const duplicateComponent = useQueueStore((state) => state.duplicateComponent);
  const deleteComponent = useQueueStore((state) => state.deleteComponent);
  const setSelectedComponentId = useQueueStore((state) => state.setSelectedComponentId);
  const transformMode = useQueueStore((state) => state.transformMode);
  const setTransformMode = useQueueStore((state) => state.setTransformMode);
  const snapEnabled = useQueueStore((state) => state.snapEnabled);
  const setSnapEnabled = useQueueStore((state) => state.setSnapEnabled);
  const snapSize = useQueueStore((state) => state.snapSize);
  const setSnapSize = useQueueStore((state) => state.setSnapSize);
  const site = useQueueStore((state) => state.scene.site);

  const bounds = checkSiteBounds(component, site);

  const handlePositionChange = (axis, val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    updateComponent(component.id, {
      position: {
        ...component.position,
        [axis]: num,
      },
    }, true);
  };

  const handleDimensionChange = (key, val, min = 0.5, max = 200) => {
    let num = parseFloat(val);
    if (isNaN(num) || num <= 0) return;
    num = Math.max(min, Math.min(max, num));
    updateComponent(component.id, {
      dimensions: {
        ...component.dimensions,
        [key]: num,
      },
    }, true);
  };

  const handleRotationChange = (val) => {
    let num = parseInt(val, 10);
    if (isNaN(num)) return;
    num = ((num % 360) + 360) % 360;
    updateComponent(component.id, { rotation: num }, true);
  };

  const rotateBy = (deg) => {
    const current = component.rotation || 0;
    const next = (((current + deg) % 360) + 360) % 360;
    updateComponent(component.id, { rotation: next }, true);
  };

  const handleLaneChange = (lanesCount) => {
    const count = Math.max(1, Math.min(6, parseInt(lanesCount, 10) || 1));
    updateComponent(component.id, {
      properties: {
        ...component.properties,
        lanes: count,
      },
    }, true);
  };

  return (
    <div className="h-full flex flex-col select-none">
      {/* Header */}
      <div className="p-4 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedComponentId(null)}
            className="p-1 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors"
            title="Return to Space Information"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-deva-maroon-700 block">
              Component Properties
            </span>
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wide">
              {component.name || component.type}
            </h3>
          </div>
        </div>

        <button
          onClick={() => setSelectedComponentId(null)}
          className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100"
          title="Deselect"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Boundary Alert if violating */}
        {bounds.isViolating && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Boundary Warning</span>
              <span className="text-[11px] text-red-700">
                This component extends outside the available crowd site boundary. Move or resize it to fit inside the space.
              </span>
            </div>
          </div>
        )}

        {/* 3D Transform Mode Switch */}
        <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/80 space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
            3D Gizmo Mode
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-stone-200/60 p-1 rounded-lg">
            <button
              id="btn-gizmo-translate"
              onClick={() => setTransformMode('translate')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                transformMode === 'translate'
                  ? 'bg-white text-deva-maroon-800 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>Move (X/Z)</span>
            </button>
            <button
              id="btn-gizmo-rotate"
              onClick={() => setTransformMode('rotate')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                transformMode === 'rotate'
                  ? 'bg-white text-deva-maroon-800 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate (Y)</span>
            </button>
          </div>
        </div>

        {/* Position Controls (Horizontal Ground Plane) */}
        <div className="p-3 bg-white rounded-xl border border-stone-200/80 shadow-sm space-y-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
            <Compass className="w-3.5 h-3.5 text-deva-maroon-700" />
            <span>Position Coordinates</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="input-pos-x" className="block text-[10px] font-medium text-stone-500 mb-0.5">
                X Position (m)
              </label>
              <input
                id="input-pos-x"
                type="number"
                step={snapEnabled ? snapSize : 0.5}
                value={Number(component.position.x || 0).toFixed(1)}
                onChange={(e) => handlePositionChange('x', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-deva-maroon-700"
              />
            </div>
            <div>
              <label htmlFor="input-pos-z" className="block text-[10px] font-medium text-stone-500 mb-0.5">
                Z Position (m)
              </label>
              <input
                id="input-pos-z"
                type="number"
                step={snapEnabled ? snapSize : 0.5}
                value={Number(component.position.z || 0).toFixed(1)}
                onChange={(e) => handlePositionChange('z', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-deva-maroon-700"
              />
            </div>
          </div>
        </div>

        {/* Dimensions Controls */}
        <div className="p-3 bg-white rounded-xl border border-stone-200/80 shadow-sm space-y-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
            <Maximize2 className="w-3.5 h-3.5 text-deva-maroon-700" />
            <span>Dimensions</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="input-dim-length" className="block text-[10px] font-medium text-stone-500 mb-0.5">
                Length (m)
              </label>
              <input
                id="input-dim-length"
                type="number"
                min="1"
                max="100"
                step={snapEnabled ? snapSize : 0.5}
                value={component.dimensions.length || ''}
                onChange={(e) => handleDimensionChange('length', e.target.value, 1, 100)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-deva-maroon-700"
              />
            </div>

            <div>
              <label htmlFor="input-dim-width" className="block text-[10px] font-medium text-stone-500 mb-0.5">
                Width (m)
              </label>
              <input
                id="input-dim-width"
                type="number"
                min="0.3"
                max="30"
                step={snapEnabled ? snapSize : 0.2}
                value={component.dimensions.width || ''}
                onChange={(e) => handleDimensionChange('width', e.target.value, 0.3, 30)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-deva-maroon-700"
              />
            </div>
          </div>

          {/* Special Lanes Control for Queue Lane */}
          {component.type === 'queue' && (
            <div className="pt-2 border-t border-stone-100">
              <label htmlFor="input-queue-lanes" className="block text-[10px] font-medium text-stone-500 mb-1">
                Lanes Partition
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleLaneChange(num)}
                    className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all ${
                      (component.properties.lanes || 1) === num
                        ? 'bg-deva-maroon-800 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rotation Controls */}
        <div className="p-3 bg-white rounded-xl border border-stone-200/80 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-600">
            <div className="flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-deva-maroon-700" />
              <span>Rotation Angle</span>
            </div>
            <span className="font-mono text-stone-800 text-xs font-bold">
              {component.rotation || 0}&deg;
            </span>
          </div>

          {/* Quick 90-degree rotate buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 90, 180, 270].map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => handleRotationChange(deg)}
                className={`py-1 rounded-md text-xs font-mono font-medium transition-all ${
                  (component.rotation || 0) === deg
                    ? 'bg-deva-maroon-800 text-white font-bold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {deg}&deg;
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => rotateBy(-45)}
              className="flex-1 py-1 text-xs text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-md font-medium"
            >
              -45&deg;
            </button>
            <button
              type="button"
              onClick={() => rotateBy(45)}
              className="flex-1 py-1 text-xs text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-md font-medium"
            >
              +45&deg;
            </button>
          </div>
        </div>

        {/* Snap to Grid Settings */}
        <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
              <Grid className="w-3.5 h-3.5 text-stone-500" />
              <span>Snap to Grid</span>
            </div>

            <button
              id="btn-toggle-snap"
              type="button"
              onClick={() => setSnapEnabled(!snapEnabled)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                snapEnabled
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {snapEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {snapEnabled && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-stone-500">Snap Increments:</span>
              <div className="flex items-center gap-1">
                {[0.5, 1.0, 2.0].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSnapSize(sz)}
                    className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                      snapSize === sz
                        ? 'bg-deva-maroon-800 text-white font-bold'
                        : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {sz}m
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer: Duplicate and Delete */}
      <div className="p-3 border-t border-stone-200/80 bg-white space-y-2">
        <button
          id="btn-duplicate-component"
          type="button"
          onClick={() => duplicateComponent(component.id)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors"
          title="Duplicate component (Ctrl+D)"
        >
          <Copy className="w-3.5 h-3.5 text-stone-600" />
          <span>Duplicate (Ctrl+D)</span>
        </button>

        <button
          id="btn-delete-component"
          type="button"
          onClick={() => deleteComponent(component.id)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition-colors"
          title="Delete selected component (Delete)"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600" />
          <span>Delete Component</span>
        </button>
      </div>
    </div>
  );
}
