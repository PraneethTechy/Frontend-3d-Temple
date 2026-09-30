import React, { useState, useMemo } from 'react';
import { 
  LogIn, 
  Rows, 
  ShieldAlert, 
  ScanFace, 
  Armchair, 
  Sparkles, 
  LogOut, 
  Plus,
  Layers,
  Landmark,
  Crown,
  DoorOpen,
  Columns3,
  Search,
  X
} from 'lucide-react';
import { useQueueStore } from '../../store/useQueueStore.js';
import { COMPONENT_TYPES } from '../../utils/componentDefaults.js';

// Section 1: TEMPLE ARCHITECTURE
const TEMPLE_COMPONENTS = [
  {
    type: COMPONENT_TYPES.ENTRANCE_GOPURAM,
    name: 'Entrance Gopuram',
    icon: Landmark,
    description: 'Public entry gateway',
  },
  {
    type: COMPONENT_TYPES.MAIN_GOPURAM,
    name: 'Main Gopuram',
    icon: Crown,
    description: 'Central 22m Raja Gopuram',
  },
  {
    type: COMPONENT_TYPES.DARSHAN_SANCTUM,
    name: 'Darshan Sanctum',
    icon: Sparkles,
    description: 'Sacred inner sanctum',
  },
  {
    type: COMPONENT_TYPES.ENTRANCE_GOPURAM, // Reusable with role or dedicated South Exit
    role: 'south-gopuram',
    name: 'Exit Gopuram',
    icon: DoorOpen,
    description: 'Dedicated public exit gateway',
  },
  {
    type: COMPONENT_TYPES.TEMPLE_GATEWAY,
    name: 'Temple Gateway',
    icon: Columns3,
    description: 'Pillared connecting gateway',
  },
];

// Section 2: CROWD MANAGEMENT
const CROWD_COMPONENTS = [
  {
    type: COMPONENT_TYPES.QUEUE,
    name: 'Queue Lane',
    icon: Rows,
    description: 'Guided queue channel',
  },
  {
    type: COMPONENT_TYPES.BARRIER,
    name: 'Barrier',
    icon: ShieldAlert,
    description: 'Separation barricade',
  },
  {
    type: COMPONENT_TYPES.SECURITY,
    name: 'Security',
    icon: ScanFace,
    description: 'Screening checkpoint',
  },
  {
    type: COMPONENT_TYPES.WAITING,
    name: 'Waiting Area',
    icon: Armchair,
    description: 'Holding and circulation bay',
  },
  {
    type: COMPONENT_TYPES.DARSHAN,
    name: 'Darshan',
    icon: Sparkles,
    description: 'Viewing focal point',
  },
  {
    type: COMPONENT_TYPES.EXIT,
    name: 'Exit Corridor',
    icon: LogOut,
    description: 'Regulated egress path',
  },
];

export function ComponentsPanel() {
  const addComponent = useQueueStore((state) => state.addComponent);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemple = useMemo(() => {
    if (!searchQuery.trim()) return TEMPLE_COMPONENTS;
    const q = searchQuery.toLowerCase();
    return TEMPLE_COMPONENTS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredCrowd = useMemo(() => {
    if (!searchQuery.trim()) return CROWD_COMPONENTS;
    const q = searchQuery.toLowerCase();
    return CROWD_COMPONENTS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleAdd = (item) => {
    if (item.name === 'Exit Gopuram') {
      addComponent(COMPONENT_TYPES.ENTRANCE_GOPURAM, {
        role: 'south-gopuram',
        name: 'South Exit Gopuram',
      });
    } else {
      addComponent(item.type);
    }
  };

  return (
    <aside className="w-68 h-full bg-white/95 backdrop-blur-md border-r border-stone-200/80 flex flex-col flex-shrink-0 select-none shadow-soft z-20">
      {/* Fixed Search Header */}
      <div className="p-3.5 border-b border-stone-200/80 space-y-2.5 bg-white/80 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 font-sans">
              COMPONENTS
            </h2>
            <p className="text-[11px] text-stone-500 mt-0.5">Place elements in the 3D scene</p>
          </div>
          <div className="w-6 h-6 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Clean Single Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search components..."
            className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border border-stone-200 bg-stone-50/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-deva-maroon-500 placeholder:text-stone-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Component Sections List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* TEMPLE SECTION */}
        {filteredTemple.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 pb-1 mb-1.5 border-b border-amber-200/80">
              <Landmark className="w-3 h-3 text-amber-700" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                TEMPLE
              </span>
            </div>
            <div className="space-y-1">
              {filteredTemple.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    id={`btn-add-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => handleAdd(item)}
                    className="w-full text-left p-2 rounded-xl border border-stone-200/80 bg-white hover:bg-amber-50/60 hover:border-amber-300 transition-all duration-150 group shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-between"
                    title={`Add ${item.name}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-800 group-hover:scale-105 transition-transform flex-shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-800 group-hover:text-amber-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-stone-500 truncate">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-stone-400 group-hover:text-amber-800 transition-colors flex-shrink-0 ml-1" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CROWD SECTION */}
        {filteredCrowd.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 pb-1 mb-1.5 border-b border-stone-200/80">
              <Rows className="w-3 h-3 text-deva-maroon-700" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-700">
                CROWD
              </span>
            </div>
            <div className="space-y-1">
              {filteredCrowd.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    id={`btn-add-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => handleAdd(item)}
                    className="w-full text-left p-2 rounded-xl border border-stone-200/80 bg-white hover:bg-stone-50/90 hover:border-deva-maroon-300 transition-all duration-150 group shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-between"
                    title={`Add ${item.name}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 group-hover:text-deva-maroon-800 group-hover:bg-deva-maroon-50 group-hover:border-deva-maroon-200 transition-all flex-shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-800 group-hover:text-deva-maroon-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-stone-500 truncate">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-stone-400 group-hover:text-deva-maroon-700 transition-colors flex-shrink-0 ml-1" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {filteredTemple.length === 0 && filteredCrowd.length === 0 && (
          <div className="text-center py-8 text-stone-400 space-y-1">
            <Search className="w-6 h-6 mx-auto text-stone-300" />
            <p className="text-xs font-semibold">No matching components</p>
          </div>
        )}
      </div>
    </aside>
  );
}
