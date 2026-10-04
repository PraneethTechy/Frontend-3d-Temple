/**
 * DevaSetu 3D Spatial Component Definitions & Defaults
 * Sacred Temple Architecture + Queue Crowd Infrastructure
 */

export const COMPONENT_CATEGORIES = {
  ARCHITECTURE: 'architecture',
  CROWD: 'crowd',
};

export const COMPONENT_TYPES = {
  // Temple Architecture Components
  ENTRANCE_GOPURAM: 'entrance_gopuram',
  MAIN_GOPURAM: 'main_gopuram',
  DARSHAN_SANCTUM: 'darshan_sanctum',
  TEMPLE_GATEWAY: 'temple_gateway',
  MANDAPAM: 'mandapam',
  PRAKARAM_WALL: 'prakaram_wall',

  // Crowd Management Infrastructure
  ENTRANCE: 'entrance',
  QUEUE: 'queue',
  BARRIER: 'barrier',
  SECURITY: 'security',
  WAITING: 'waiting',
  DARSHAN: 'darshan',
  EXIT: 'exit',
};

export const COMPONENT_METADATA = {
  // --- TEMPLE ARCHITECTURE CATEGORY ---
  [COMPONENT_TYPES.ENTRANCE_GOPURAM]: {
    name: 'Entrance Gopuram',
    shortName: 'GOPURAM-E',
    category: COMPONENT_CATEGORIES.ARCHITECTURE,
    icon: 'Landmark',
    description: 'Ceremonial Dravidian entrance gateway tower with stepped pyramidal tiers, central portal & golden kalasams',
    defaultDimensions: { length: 16, width: 8, height: 18 },
    defaultProperties: { tiers: 5, archWidth: 5, archHeight: 4.5, kalasams: 5, stoneColor: '#9CA3AF' },
  },
  [COMPONENT_TYPES.MAIN_GOPURAM]: {
    name: 'Main Gopuram',
    shortName: 'GOPURAM-M',
    category: COMPONENT_CATEGORIES.ARCHITECTURE,
    icon: 'Crown',
    description: 'Majestic Raja Gopuram landmark marking the threshold to the sacred inner temple sanctum',
    defaultDimensions: { length: 22, width: 12, height: 32 },
    defaultProperties: { tiers: 7, archWidth: 6, archHeight: 6.5, kalasams: 7, stoneColor: '#9CA3AF' },
  },
  [COMPONENT_TYPES.DARSHAN_SANCTUM]: {
    name: 'Darshan Sanctum',
    shortName: 'SANCTUM',
    category: COMPONENT_CATEGORIES.ARCHITECTURE,
    icon: 'Sparkles',
    description: 'Sacred Garbhagriha with Shiva Lingam, Yoni-Peetham, Prabhavali arch, Nandi, Vimana tower & diya illumination',
    defaultDimensions: { length: 18, width: 14, height: 14 },
    defaultProperties: { vimanaHeight: 14, sanctumPillars: 10, diyaGlow: true, showNandi: true, showPrabhavali: true, deity: 'Arunachaleswarar Shiva Lingam', stoneColor: '#9CA3AF' },
  },
  [COMPONENT_TYPES.TEMPLE_GATEWAY]: {
    name: 'Temple Gateway',
    shortName: 'GATEWAY',
    category: COMPONENT_CATEGORIES.ARCHITECTURE,
    icon: 'Columns3',
    description: 'Ceremonial pillared Mandapam pavilion gateway connecting temple crowd corridors',
    defaultDimensions: { length: 10, width: 6, height: 7 },
    defaultProperties: { pillars: 4, archHeight: 4.5 },
  },
  [COMPONENT_TYPES.MANDAPAM]: {
    name: 'Mandapam',
    shortName: 'MANDAPAM',
    category: COMPONENT_CATEGORIES.ARCHITECTURE,
    icon: 'Building2',
    description: 'Authentic Dravidian carved pillared hall pavilion for temple ceremonies and queue movement',
    defaultDimensions: { length: 16, width: 12, height: 6 },
    defaultProperties: { pillarSpacing: 3.5, stoneColor: '#9CA3AF' },
  },
  [COMPONENT_TYPES.PRAKARAM_WALL]: {
    name: 'Prakaram Wall',
    shortName: 'MADHIL',
    category: COMPONENT_CATEGORIES.ARCHITECTURE,
    icon: 'Shield',
    description: 'Colossal granite enclosure wall (Madhil) bounding sacred temple prakaram courtyards',
    defaultDimensions: { length: 20, width: 2.4, height: 5.6 },
    defaultProperties: { thickness: 2.4, stoneColor: '#BAAA94' },
  },

  // --- CROWD INFRASTRUCTURE CATEGORY ---
  [COMPONENT_TYPES.QUEUE]: {
    name: 'Queue Lane',
    shortName: 'QUEUE',
    category: COMPONENT_CATEGORIES.CROWD,
    icon: 'Rows',
    description: 'Physical crowd queue channel with stanchions, rails, and floor runner',
    defaultDimensions: { length: 12, width: 2, height: 1.0 },
    defaultProperties: { lanes: 1, direction: 'forward' },
  },
  [COMPONENT_TYPES.BARRIER]: {
    name: 'Barrier Rail',
    shortName: 'BARRIER',
    category: COMPONENT_CATEGORIES.CROWD,
    icon: 'Shield',
    description: 'Sturdy crowd demarcation railing with weighted brass/steel stanchion posts',
    defaultDimensions: { length: 6, width: 0.3, height: 1.0 },
    defaultProperties: { style: 'double-rail' },
  },
  [COMPONENT_TYPES.ENTRANCE]: {
    name: 'Entrance Gate',
    shortName: 'ENTRY',
    category: COMPONENT_CATEGORIES.CROWD,
    icon: 'LogIn',
    description: 'Entry checkpoint arch with directional guidance signage',
    defaultDimensions: { length: 4, width: 1.2, height: 3.2 },
    defaultProperties: { signage: 'ENTRY', archType: 'traditional' },
  },
  [COMPONENT_TYPES.SECURITY]: {
    name: 'Security Checkpoint',
    shortName: 'SECURITY',
    category: COMPONENT_CATEGORIES.CROWD,
    icon: 'ScanFace',
    description: 'Walk-through DFMD detector frame, baggage examination table & personnel counter',
    defaultDimensions: { length: 5, width: 3, height: 2.6 },
    defaultProperties: { metalDetector: true, baggageCounter: true },
  },
  [COMPONENT_TYPES.WAITING]: {
    name: 'Waiting Area',
    shortName: 'WAITING',
    category: COMPONENT_CATEGORIES.CROWD,
    icon: 'Armchair',
    description: 'Designated holding bay with boundary stanchions and bench seating markers',
    defaultDimensions: { length: 12, width: 8, height: 0.8 },
    defaultProperties: { seatingRows: 2, capacity: 50 },
  },
  [COMPONENT_TYPES.DARSHAN]: {
    name: 'Darshan Point',
    shortName: 'DARSHAN',
    category: COMPONENT_CATEGORIES.CROWD,
    icon: 'Sparkles',
    description: 'Sanctum viewing focal point with ceremonial step elevation & darshan barrier',
    defaultDimensions: { length: 6, width: 4, height: 2.8 },
    defaultProperties: { viewingWidth: 5, sanctumFocal: true },
  },
  [COMPONENT_TYPES.EXIT]: {
    name: 'Exit Corridor',
    shortName: 'EXIT',
    category: COMPONENT_CATEGORIES.CROWD,
    icon: 'LogOut',
    description: 'Regulated crowd egress channel with egress signage and dispersal floor markings',
    defaultDimensions: { length: 8, width: 2.5, height: 2.4 },
    defaultProperties: { signage: 'EXIT', oneWay: true },
  },
};

/**
 * Creates a new component instance conforming strictly to the scene JSON schema
 */
export function createComponentInstance(type, countForType = 1, currentCount = 0) {
  const meta = COMPONENT_METADATA[type] || COMPONENT_METADATA[COMPONENT_TYPES.QUEUE];
  const uniqueSuffix = Math.random().toString(36).substring(2, 7);
  const id = `${type}-${uniqueSuffix}`;

  // Slightly stagger spawn positions so multiple added objects don't stack directly on top of each other
  const staggerOffset = (currentCount % 5) * 2 - 4;

  return {
    id,
    type,
    name: `${meta.name} ${countForType}`,
    category: meta.category,
    position: {
      x: staggerOffset,
      y: 0,
      z: (currentCount % 4) * 2 - 3,
    },
    rotation: 0, // In degrees (0, 90, 180, 270)
    scale: {
      x: 1,
      y: 1,
      z: 1,
    },
    dimensions: {
      ...meta.defaultDimensions,
    },
    properties: {
      ...meta.defaultProperties,
    },
  };
}

/**
 * Checks whether a component's footprint extends outside the site boundary
 */
export function checkSiteBounds(component, site) {
  if (!component || !site) {
    return { isViolating: false, details: {} };
  }

  const halfL = (site.length || 50) / 2;
  const halfW = (site.width || 30) / 2;

  const posX = component.position?.x ?? 0;
  const posZ = component.position?.z ?? 0;

  const dimL = component.dimensions?.length || 1;
  const dimW = component.dimensions?.width || 1;

  // Approximate radius based on rotation
  const rad = ((component.rotation || 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  const effHalfL = (dimL * cos + dimW * sin) / 2;
  const effHalfW = (dimL * sin + dimW * cos) / 2;

  const isOutX = (posX - effHalfL < -halfL) || (posX + effHalfL > halfL);
  const isOutZ = (posZ - effHalfW < -halfW) || (posZ + effHalfW > halfW);

  return {
    isViolating: Boolean(isOutX || isOutZ),
    details: {
      minX: posX - effHalfL,
      maxX: posX + effHalfL,
      minZ: posZ - effHalfW,
      maxZ: posZ + effHalfW,
      siteBoundX: halfL,
      siteBoundZ: halfW,
    },
  };
}
