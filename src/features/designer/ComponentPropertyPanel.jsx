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
  AlertTriangle,
  Landmark,
  Crown,
  Sparkles,
  Building2,
  Shield,
  Layers
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

  const handlePropertyChange = (key, val) => {
    updateComponent(component.id, {
      properties: {
        ...component.properties,
        [key]: val,
      },
    }, true);
  };

  const isGopuram = ['entrance_gopuram', 'main_gopuram', 'gopuram', 'raja_gopuram'].includes(component.type);
  const isSanctum = ['darshan_sanctum', 'sanctum'].includes(component.type);
  const isMandapam = component.type === 'mandapam';
  const isPrakaram = ['prakaram_wall', 'wall'].includes(component.type);
  const isArchitecture = isGopuram || isSanctum || isMandapam || isPrakaram || component.type === 'temple_gateway';

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

          <div className="grid grid-cols-3 gap-1.5">
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
                className="w-full px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-deva-maroon-700"
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
                max="50"
                step={snapEnabled ? snapSize : 0.2}
                value={component.dimensions.width || ''}
                onChange={(e) => handleDimensionChange('width', e.target.value, 0.3, 50)}
                className="w-full px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-deva-maroon-700"
              />
            </div>

            <div>
              <label htmlFor="input-dim-height" className="block text-[10px] font-medium text-stone-500 mb-0.5">
                Height (m)
              </label>
              <input
                id="input-dim-height"
                type="number"
                min="0.5"
                max="70"
                step={snapEnabled ? snapSize : 0.5}
                value={component.dimensions.height || ''}
                onChange={(e) => handleDimensionChange('height', e.target.value, 0.5, 70)}
                className="w-full px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-deva-maroon-700"
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

        {/* TEMPLE ARCHITECTURE DESIGN CONTROLS */}
        {isArchitecture && (
          <div className="p-3 bg-white rounded-xl border border-amber-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-100">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                {isGopuram ? <Crown className="w-3.5 h-3.5 text-amber-700" /> :
                 isSanctum ? <Sparkles className="w-3.5 h-3.5 text-amber-700" /> :
                 isMandapam ? <Building2 className="w-3.5 h-3.5 text-amber-700" /> :
                 <Landmark className="w-3.5 h-3.5 text-amber-700" />}
                <span>Temple Architecture Controls</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-mono text-[9px] font-bold">
                DRAVIDIAN
              </span>
            </div>

            {/* Gopuram Controls */}
            {isGopuram && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-stone-500 mb-0.5">
                      Tower Height (m)
                    </label>
                    <input
                      id="input-gopuram-height"
                      type="number"
                      min="10"
                      max="66"
                      step="1"
                      value={component.dimensions.height || 18}
                      onChange={(e) => handleDimensionChange('height', e.target.value, 10, 66)}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-stone-500 mb-0.5">
                      Base Width (m)
                    </label>
                    <input
                      id="input-gopuram-width"
                      type="number"
                      min="4"
                      max="30"
                      step="0.5"
                      value={component.dimensions.width || 8}
                      onChange={(e) => {
                        handleDimensionChange('width', e.target.value, 4, 30);
                        handlePropertyChange('baseWidth', parseFloat(e.target.value));
                      }}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                </div>

                {/* Tiers Selector */}
                <div>
                  <label className="block text-[10px] font-medium text-stone-500 mb-1">
                    Storey Tiers (Tala Levels)
                  </label>
                  <div className="flex items-center gap-1">
                    {[3, 5, 7, 9, 11].map((t) => (
                      <button
                        key={t}
                        id={`btn-tier-${t}`}
                        type="button"
                        onClick={() => handlePropertyChange('tiers', t)}
                        className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all ${
                          (Number(component.properties.tiers) || 5) === t
                            ? 'bg-amber-800 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gateway Width */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-stone-500 mb-0.5">
                      Gateway Width (m)
                    </label>
                    <input
                      id="input-gopuram-gateway-width"
                      type="number"
                      min="3"
                      max="12"
                      step="0.5"
                      value={component.properties.gatewayWidth || component.properties.archWidth || 5}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 5;
                        handlePropertyChange('gatewayWidth', val);
                        handlePropertyChange('archWidth', val);
                      }}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-stone-500 mb-0.5">
                      Apex Kalasams
                    </label>
                    <input
                      id="input-gopuram-kalasams"
                      type="number"
                      min="3"
                      max="13"
                      step="2"
                      value={component.properties.kalasams || component.properties.tiers || 5}
                      onChange={(e) => handlePropertyChange('kalasams', parseInt(e.target.value, 10) || 5)}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Darshan Sanctum Controls */}
            {isSanctum && (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-medium text-stone-500 mb-1">
                    Deity / Sacred Focal Object
                  </label>
                  <select
                    id="select-sanctum-deity"
                    value={component.properties.deity || 'Arunachaleswarar Shiva Lingam'}
                    onChange={(e) => handlePropertyChange('deity', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600"
                  >
                    <option value="Arunachaleswarar Shiva Lingam">Arunachaleswarar Shiva Lingam</option>
                    <option value="Sri Ganesha">Sri Ganesha</option>
                    <option value="Sri Venkateswara">Sri Venkateswara</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-stone-500 mb-0.5">
                      Vimana Height (m)
                    </label>
                    <input
                      id="input-sanctum-height"
                      type="number"
                      min="8"
                      max="30"
                      step="1"
                      value={component.dimensions.height || 14}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 14;
                        handleDimensionChange('height', val, 8, 30);
                        handlePropertyChange('vimanaHeight', val);
                      }}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-stone-500 mb-0.5">
                      Entrance Width (m)
                    </label>
                    <input
                      id="input-sanctum-entrance-width"
                      type="number"
                      min="3"
                      max="10"
                      step="0.5"
                      value={component.properties.entranceWidth || 5}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 5;
                        handlePropertyChange('entranceWidth', val);
                        handlePropertyChange('archWidth', val);
                      }}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                </div>

                {/* Sacred Elements Toggles */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handlePropertyChange('showNandi', !component.properties.showNandi)}
                    className={`py-1 rounded text-[11px] font-semibold transition-all ${
                      (component.properties.showNandi !== false)
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-stone-100 text-stone-500 border border-stone-200'
                    }`}
                  >
                    Nandi: {(component.properties.showNandi !== false) ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePropertyChange('showPrabhavali', !component.properties.showPrabhavali)}
                    className={`py-1 rounded text-[11px] font-semibold transition-all ${
                      (component.properties.showPrabhavali !== false)
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-stone-100 text-stone-500 border border-stone-200'
                    }`}
                  >
                    Prabhavali: {(component.properties.showPrabhavali !== false) ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePropertyChange('diyaGlow', !component.properties.diyaGlow)}
                    className={`py-1 rounded text-[11px] font-semibold transition-all ${
                      (component.properties.diyaGlow !== false)
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-stone-100 text-stone-500 border border-stone-200'
                    }`}
                  >
                    Diya: {(component.properties.diyaGlow !== false) ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            )}

            {/* Mandapam Controls */}
            {isMandapam && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-stone-500 mb-0.5">
                      Hall Height (m)
                    </label>
                    <input
                      id="input-mandapam-height"
                      type="number"
                      min="4"
                      max="14"
                      step="0.5"
                      value={component.dimensions.height || 6}
                      onChange={(e) => handleDimensionChange('height', e.target.value, 4, 14)}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-stone-500 mb-0.5">
                      Pillar Spacing (m)
                    </label>
                    <input
                      id="input-mandapam-spacing"
                      type="number"
                      min="2.5"
                      max="6.0"
                      step="0.5"
                      value={component.properties.pillarSpacing || 3.5}
                      onChange={(e) => handlePropertyChange('pillarSpacing', parseFloat(e.target.value) || 3.5)}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Prakaram Wall Controls */}
            {isPrakaram && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-stone-500 mb-0.5">
                      Wall Height (m)
                    </label>
                    <input
                      id="input-prakaram-height"
                      type="number"
                      min="2.5"
                      max="10"
                      step="0.5"
                      value={component.dimensions.height || 4.5}
                      onChange={(e) => handleDimensionChange('height', e.target.value, 2.5, 10)}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-stone-500 mb-0.5">
                      Wall Thickness (m)
                    </label>
                    <input
                      id="input-prakaram-thickness"
                      type="number"
                      min="0.6"
                      max="3.0"
                      step="0.2"
                      value={component.dimensions.width || component.properties.thickness || 1.2}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 1.2;
                        handleDimensionChange('width', val, 0.6, 3.0);
                        handlePropertyChange('thickness', val);
                      }}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stone Finish Style */}
            <div>
              <label className="block text-[10px] font-medium text-stone-500 mb-1">
                Stone Material & Finish
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { name: 'Aged Granite', color: '#9CA3AF' },
                  { name: 'Limestone', color: '#A8A29E' },
                  { name: 'Dark Stone', color: '#374151' },
                  { name: 'Dravidian', color: '#78716C' },
                ].map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => handlePropertyChange('stoneColor', s.color)}
                    className={`py-1 rounded text-[9px] font-semibold transition-all ${
                      (component.properties.stoneColor || '#9CA3AF') === s.color
                        ? 'bg-amber-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Cardinal Orientation Buttons */}
            <div>
              <label className="block text-[10px] font-medium text-stone-500 mb-1">
                Cardinal Orientation
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: 'North', deg: 0 },
                  { label: 'East', deg: 90 },
                  { label: 'South', deg: 180 },
                  { label: 'West', deg: 270 },
                ].map((d) => (
                  <button
                    key={d.label}
                    id={`btn-orient-${d.label.toLowerCase()}`}
                    type="button"
                    onClick={() => handleRotationChange(d.deg)}
                    className={`py-1 rounded text-[11px] font-semibold transition-all ${
                      (component.rotation || 0) === d.deg
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Path-Based Queue Shape & Geometry Controls */}
        {component.type === 'queue' && (
          <div className="p-3 bg-white rounded-xl border border-stone-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-600">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-deva-maroon-700" />
                <span>Queue Path Geometry</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-[9px] font-bold">
                {component.properties?.pathData?.type || 'straight'}
              </span>
            </div>

            {/* Shape Selector Grid */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'straight', label: 'Straight' },
                { id: 'arc', label: 'Arc' },
                { id: 'bezier', label: 'Bezier' },
                { id: 'polyline', label: 'Polyline' },
                { id: 'serpentine', label: 'Serpentine' },
                { id: 'u_shape', label: 'U-Shape' },
                { id: 's_shape', label: 'S-Shape' },
                { id: 'radial', label: 'Radial' },
                { id: 'l_shape', label: 'L-Shape' },
              ].map((s) => {
                const currentType = component.properties?.pathData?.type || 'straight';
                const isActive = currentType === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const len = component.dimensions?.length || 16;
                      let newPathData = { type: s.id, params: {} };
                      if (s.id === 'arc') {
                        newPathData.params = { radius: 14, startAngle: -45, endAngle: 45 };
                      } else if (s.id === 'bezier') {
                        newPathData.controlPoints = [
                          { x: -len / 2, z: 0 },
                          { x: -len / 6, z: 4 },
                          { x: len / 6, z: -4 },
                          { x: len / 2, z: 0 },
                        ];
                      } else if (s.id === 'polyline') {
                        newPathData.controlPoints = [
                          { x: -len / 2, z: 0 },
                          { x: 0, z: 3 },
                          { x: len / 2, z: 0 },
                        ];
                      } else if (s.id === 'serpentine') {
                        newPathData.params = { rows: 4, rowLength: len, spacing: 2.2 };
                      } else if (s.id === 'u_shape') {
                        newPathData.params = { armLength: len, width: 6 };
                      } else if (s.id === 's_shape') {
                        newPathData.params = { length: len, amplitude: 4, cycles: 1.5 };
                      } else if (s.id === 'radial') {
                        newPathData.params = { outerRadius: 20, innerRadius: 5, sweepAngle: 40 };
                      } else if (s.id === 'l_shape') {
                        newPathData.params = { leg1: len, leg2: 12, turnRadius: 3, turnDirection: 'right' };
                      }
                      updateComponent(
                        component.id,
                        {
                          properties: {
                            ...component.properties,
                            pathData: newPathData,
                          },
                        },
                        true
                      );
                    }}
                    className={`py-1 px-1 rounded-md text-[10px] font-semibold text-center transition-all ${
                      isActive
                        ? 'bg-deva-maroon-800 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Shape-Specific Parametric Controls */}
            {component.properties?.pathData?.type === 'arc' && (
              <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Radius (m)</label>
                    <input
                      type="number"
                      step="1"
                      min="3"
                      max="60"
                      value={component.properties.pathData.params?.radius ?? 14}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 14;
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, radius: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Start Angle (&deg;)</label>
                    <input
                      type="number"
                      step="5"
                      value={component.properties.pathData.params?.startAngle ?? -45}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, startAngle: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">End Angle (&deg;)</label>
                    <input
                      type="number"
                      step="5"
                      value={component.properties.pathData.params?.endAngle ?? 45}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, endAngle: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {component.properties?.pathData?.type === 'serpentine' && (
              <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Rows</label>
                    <select
                      value={component.properties.pathData.params?.rows ?? 4}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, rows: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    >
                      <option value="2">2 Rows</option>
                      <option value="3">3 Rows</option>
                      <option value="4">4 Rows</option>
                      <option value="6">6 Rows</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Row Length (m)</label>
                    <input
                      type="number"
                      step="1"
                      min="4"
                      max="60"
                      value={component.properties.pathData.params?.rowLength ?? 20}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 20;
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, rowLength: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Row Spacing (m)</label>
                    <input
                      type="number"
                      step="0.2"
                      min="1.0"
                      max="6.0"
                      value={component.properties.pathData.params?.spacing ?? 2.2}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 2.2;
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, spacing: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {component.properties?.pathData?.type === 'u_shape' && (
              <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Arm Length (m)</label>
                    <input
                      type="number"
                      step="1"
                      min="4"
                      max="60"
                      value={component.properties.pathData.params?.armLength ?? 16}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 16;
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, armLength: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Loop Width (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="2"
                      max="20"
                      value={component.properties.pathData.params?.width ?? 6}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 6;
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, width: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {component.properties?.pathData?.type === 's_shape' && (
              <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Span Length (m)</label>
                    <input
                      type="number"
                      step="1"
                      value={component.properties.pathData.params?.length ?? 24}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 24;
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, length: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Amplitude (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={component.properties.pathData.params?.amplitude ?? 4}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 4;
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, amplitude: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Cycles</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="4"
                      value={component.properties.pathData.params?.cycles ?? 1.5}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 1.5;
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, cycles: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {component.properties?.pathData?.type === 'radial' && (
              <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Outer R (m)</label>
                    <input
                      type="number"
                      step="1"
                      value={component.properties.pathData.params?.outerRadius ?? 20}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 20;
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, outerRadius: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Inner R (m)</label>
                    <input
                      type="number"
                      step="1"
                      value={component.properties.pathData.params?.innerRadius ?? 5}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 5;
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, innerRadius: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-stone-500 mb-0.5">Sweep (&deg;)</label>
                    <input
                      type="number"
                      step="5"
                      value={component.properties.pathData.params?.sweepAngle ?? 40}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 40;
                        updateComponent(
                          component.id,
                          {
                            properties: {
                              ...component.properties,
                              pathData: {
                                ...component.properties.pathData,
                                params: { ...component.properties.pathData.params, sweepAngle: val },
                              },
                            },
                          },
                          true
                        );
                      }}
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
