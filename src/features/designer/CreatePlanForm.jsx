import React, { useState } from 'react';
import { 
  Building2, 
  Ruler, 
  Users, 
  Sparkles, 
  ArrowRight, 
  AlertCircle,
  X,
  FolderOpen
} from 'lucide-react';
import { UNITS } from '../../utils/units.js';
import { useQueueStore } from '../../store/useQueueStore.js';

export function CreatePlanForm({ isModal = false, onClose }) {
  const createSpace = useQueueStore((state) => state.createSpace);
  const setPlansModalOpen = useQueueStore((state) => state.setPlansModalOpen);
  const currentScene = useQueueStore((state) => state.scene);

  const [templeName, setTempleName] = useState(currentScene?.temple?.name || '');
  const [length, setLength] = useState(currentScene?.site?.length || '');
  const [width, setWidth] = useState(currentScene?.site?.width || '');
  const [unit, setUnit] = useState(currentScene?.site?.unit || UNITS.METERS);
  const [expectedVisitors, setExpectedVisitors] = useState(currentScene?.requirements?.expectedVisitors || '');
  const [peakVisitors, setPeakVisitors] = useState(currentScene?.requirements?.peakVisitors || '');

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    // Temple Name
    if (!templeName || !templeName.trim()) {
      newErrors.templeName = 'Temple name is required';
    }

    // Length
    const lVal = parseFloat(length);
    if (!length || isNaN(lVal)) {
      newErrors.length = 'Length is required';
    } else if (lVal <= 0) {
      newErrors.length = 'Length must be greater than 0';
    } else if (lVal > 2000) {
      newErrors.length = 'Length exceeds maximum supported site limit (2000)';
    }

    // Width
    const wVal = parseFloat(width);
    if (!width || isNaN(wVal)) {
      newErrors.width = 'Width is required';
    } else if (wVal <= 0) {
      newErrors.width = 'Width must be greater than 0';
    } else if (wVal > 2000) {
      newErrors.width = 'Width exceeds maximum supported site limit (2000)';
    }

    // Unit
    if (unit !== UNITS.METERS && unit !== UNITS.FEET) {
      newErrors.unit = 'Unit must be either meters or feet';
    }

    // Expected Visitors
    const expVal = parseInt(expectedVisitors, 10);
    if (!expectedVisitors || isNaN(expVal)) {
      newErrors.expectedVisitors = 'Expected visitors count is required';
    } else if (expVal <= 0) {
      newErrors.expectedVisitors = 'Expected visitors must be greater than 0';
    }

    // Peak Visitors
    const peakVal = parseInt(peakVisitors, 10);
    if (!peakVisitors || isNaN(peakVal)) {
      newErrors.peakVisitors = 'Peak visitors count is required';
    } else if (peakVal <= 0) {
      newErrors.peakVisitors = 'Peak visitors must be greater than 0';
    } else if (expVal && peakVal > expVal) {
      newErrors.peakVisitors = 'Peak visitors cannot exceed total expected daily visitors';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    createSpace({
      templeName: templeName.trim(),
      length: parseFloat(length),
      width: parseFloat(width),
      unit,
      expectedVisitors: parseInt(expectedVisitors, 10),
      peakVisitors: parseInt(peakVisitors, 10),
    });

    if (onClose) onClose();
  };

  const unitLabel = unit === UNITS.METERS ? 'meters (m)' : 'feet (ft)';
  const shortUnit = unit === UNITS.METERS ? 'm' : 'ft';

  return (
    <div className={`w-full ${isModal ? 'p-0' : 'max-w-xl mx-auto my-auto py-8 px-4'}`}>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-elevated overflow-hidden">
        {/* Card Header with DevaSetu Identity */}
        <div className="bg-gradient-to-r from-deva-maroon-900 via-deva-maroon-800 to-deva-maroon-950 p-6 text-white relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-deva-gold-400/20 border border-deva-gold-400/40 flex items-center justify-center text-deva-gold-300">
                <Sparkles className="w-5 h-5 text-deva-gold-400" />
              </div>
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-deva-gold-300 uppercase">
                  Spatial Planning Initializer
                </span>
                <h2 className="text-xl font-bold tracking-tight text-white font-serif">
                  {isModal ? 'Edit Crowd Space Parameters' : 'Create Queue Plan'}
                </h2>
              </div>
            </div>

            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-stone-300 max-w-md leading-relaxed">
            Enter the physical boundaries and crowd parameters for the temple crowd-management precinct to generate an interactive 3D spatial canvas.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Reference Scenario Quick-Load Card */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-300/80 rounded-2xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <span className="text-base">🛕</span>
                  <span>Sri Ganesha Temple Festival (Reference Scenario)</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-snug">
                  250m × 180m site (45,000 m²) • 100,000 devotees/day • 12,000/hr peak • 15,000 peak managed crowd with Dravidian Gopurams, Sanctum, 16 Security Channels, 16 Queue Lanes, and 6 Exits.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                id="btn-load-festival-scenario"
                onClick={() => {
                  useQueueStore.getState().loadFestivalScenario();
                  if (onClose) onClose();
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-deva-maroon-800 to-deva-maroon-900 hover:from-deva-maroon-900 hover:to-stone-900 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>🛕 Load Complete 100K System</span>
              </button>

              <button
                type="button"
                id="btn-fill-festival-values"
                onClick={() => {
                  setTempleName('Sri Ganesha Temple Festival');
                  setLength(250);
                  setWidth(180);
                  setUnit(UNITS.METERS);
                  setExpectedVisitors(100000);
                  setPeakVisitors(15000);
                  setErrors({});
                }}
                className="px-3 py-2 bg-white hover:bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                Fill 250m × 180m Parameters
              </button>
            </div>
          </div>

          {/* Section 1: Temple Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-stone-800 font-semibold text-xs tracking-wider uppercase">
              <Building2 className="w-3.5 h-3.5 text-deva-maroon-700" />
              <span>Temple Identification</span>
            </div>
            <div>
              <label htmlFor="input-temple-name" className="block text-xs font-medium text-stone-700 mb-1">
                Temple Name <span className="text-red-500">*</span>
              </label>
              <input
                id="input-temple-name"
                type="text"
                placeholder="e.g. Sri Somnath Mandir, Tirumala Venkateswara Temple"
                value={templeName}
                onChange={(e) => {
                  setTempleName(e.target.value);
                  if (errors.templeName) setErrors((prev) => ({ ...prev, templeName: null }));
                }}
                className={`w-full px-3.5 py-2.5 bg-deva-ivory-50 border rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.templeName
                    ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
                    : 'border-stone-200 focus:border-deva-maroon-700 focus:ring-deva-maroon-700/20'
                }`}
              />
              {errors.templeName && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.templeName}</p>
              )}
            </div>
          </div>

          {/* Section 2: Available Space Dimensions */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-800 font-semibold text-xs tracking-wider uppercase">
                <Ruler className="w-3.5 h-3.5 text-deva-maroon-700" />
                <span>Available Space Dimensions</span>
              </div>

              {/* Unit Toggle */}
              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                <button
                  type="button"
                  id="btn-unit-meters"
                  onClick={() => setUnit(UNITS.METERS)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    unit === UNITS.METERS
                      ? 'bg-white text-deva-maroon-800 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Meters (m)
                </button>
                <button
                  type="button"
                  id="btn-unit-feet"
                  onClick={() => setUnit(UNITS.FEET)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    unit === UNITS.FEET
                      ? 'bg-white text-deva-maroon-800 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Feet (ft)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Length Input */}
              <div>
                <label htmlFor="input-length" className="block text-xs font-medium text-stone-700 mb-1">
                  Length ({shortUnit}) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="input-length"
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 60"
                    value={length}
                    onChange={(e) => {
                      setLength(e.target.value);
                      if (errors.length) setErrors((prev) => ({ ...prev, length: null }));
                    }}
                    className={`w-full px-3.5 py-2.5 bg-deva-ivory-50 border rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all pr-12 ${
                      errors.length
                        ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
                        : 'border-stone-200 focus:border-deva-maroon-700 focus:ring-deva-maroon-700/20'
                    }`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400 pointer-events-none">
                    {shortUnit}
                  </span>
                </div>
                {errors.length && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.length}</p>
                )}
              </div>

              {/* Width Input */}
              <div>
                <label htmlFor="input-width" className="block text-xs font-medium text-stone-700 mb-1">
                  Width ({shortUnit}) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="input-width"
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 35"
                    value={width}
                    onChange={(e) => {
                      setWidth(e.target.value);
                      if (errors.width) setErrors((prev) => ({ ...prev, width: null }));
                    }}
                    className={`w-full px-3.5 py-2.5 bg-deva-ivory-50 border rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all pr-12 ${
                      errors.width
                        ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
                        : 'border-stone-200 focus:border-deva-maroon-700 focus:ring-deva-maroon-700/20'
                    }`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400 pointer-events-none">
                    {shortUnit}
                  </span>
                </div>
                {errors.width && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.width}</p>
                )}
              </div>
            </div>

            {/* Live Surface Area helper calculation */}
            {length > 0 && width > 0 && !errors.length && !errors.width && (
              <div className="p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-xl flex items-center justify-between text-xs text-stone-700">
                <span className="text-stone-500">Total Ground Footprint Area:</span>
                <span className="font-semibold font-mono text-deva-maroon-800">
                  {(parseFloat(length) * parseFloat(width)).toLocaleString()} {unit === UNITS.METERS ? 'm²' : 'sq ft'}
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Visitor Demand Requirements */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <div className="flex items-center gap-2 text-stone-800 font-semibold text-xs tracking-wider uppercase">
              <Users className="w-3.5 h-3.5 text-deva-maroon-700" />
              <span>Visitor Throughput Expectations</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Expected Visitors */}
              <div>
                <label htmlFor="input-expected-visitors" className="block text-xs font-medium text-stone-700 mb-1">
                  Expected Visitors <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-expected-visitors"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 5000"
                  value={expectedVisitors}
                  onChange={(e) => {
                    setExpectedVisitors(e.target.value);
                    if (errors.expectedVisitors) setErrors((prev) => ({ ...prev, expectedVisitors: null }));
                  }}
                  className={`w-full px-3.5 py-2.5 bg-deva-ivory-50 border rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.expectedVisitors
                      ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
                      : 'border-stone-200 focus:border-deva-maroon-700 focus:ring-deva-maroon-700/20'
                  }`}
                />
                {errors.expectedVisitors && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.expectedVisitors}</p>
                )}
              </div>

              {/* Peak Visitors At One Time */}
              <div>
                <label htmlFor="input-peak-visitors" className="block text-xs font-medium text-stone-700 mb-1">
                  Peak Visitors At One Time <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-peak-visitors"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 1500"
                  value={peakVisitors}
                  onChange={(e) => {
                    setPeakVisitors(e.target.value);
                    if (errors.peakVisitors) setErrors((prev) => ({ ...prev, peakVisitors: null }));
                  }}
                  className={`w-full px-3.5 py-2.5 bg-deva-ivory-50 border rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.peakVisitors
                      ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
                      : 'border-stone-200 focus:border-deva-maroon-700 focus:ring-deva-maroon-700/20'
                  }`}
                />
                {errors.peakVisitors && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.peakVisitors}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-3">
            <button
              type="submit"
              id="btn-create-3d-space"
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-deva-maroon-800 hover:bg-deva-maroon-900 active:scale-[0.99] text-white font-semibold rounded-xl shadow-medium hover:shadow-elevated transition-all duration-150 text-sm tracking-wide"
            >
              <span>{isModal ? 'Update 3D Spatial Environment' : 'Create 3D Space'}</span>
              <ArrowRight className="w-4 h-4 text-deva-gold-300" />
            </button>
          </div>

          {!isModal && (
            <div className="pt-2 text-center">
              <button
                type="button"
                id="btn-open-saved-plans-landing"
                onClick={() => setPlansModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-deva-maroon-800 hover:text-deva-maroon-950 hover:underline cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Or open an existing saved queue plan</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
