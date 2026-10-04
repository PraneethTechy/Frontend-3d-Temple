/**
 * DevaSetu Crowd Flow Simulation Model
 * Defines agent states, deterministic behavioral parameters, and queue physics.
 */

export const AGENT_STATES = {
  ENTERING: 'entering',
  SECURITY: 'security',
  WAITING: 'waiting',
  QUEUEING: 'queueing',
  DARSHAN: 'darshan',
  EXITING: 'exiting',
  COMPLETED: 'completed',
};

/**
 * Standardized logical devotee state machine reflecting full campus journey
 */
export const LOGICAL_DEVOTEE_STATES = {
  ENTERED: 'entered',
  ARRIVAL: 'arrival',
  BRIDGE_TRANSITION: 'bridge_transition',
  HOLDING: 'holding',
  SECURITY_QUEUE: 'security_queue',
  SECURITY_CHECK: 'security_check',
  QUEUEING: 'queueing',
  DARSHAN_APPROACH: 'darshan_approach',
  DARSHAN_DWELL: 'darshan_dwell',
  EXITING: 'exiting',
  COMPLETED: 'completed',
};

/**
 * Creates a lightweight logical individual devotee representation.
 * Stores only authoritative simulation telemetry without 3D objects, meshes, or React state.
 */
export function createLogicalDevotee({
  id,
  entranceId = 'north',
  simTime = 0,
  pathId = null,
  queuePosition = 0,
}) {
  const normEntrance = String(entranceId || 'north').toLowerCase();
  return {
    id,
    entranceId: normEntrance,
    status: 'active',
    logicalState: LOGICAL_DEVOTEE_STATES.ENTERED,
    zone: 'entrance',
    pathId,
    queuePosition,

    enteredAt: simTime,
    securityStartedAt: null,
    securityCompletedAt: null,
    darshanStartedAt: null,
    darshanCompletedAt: null,
    completedAt: null,

    waitTime: 0,
    serviceTime: 0,

    representativeId: null,
  };
}

// Deterministic service dwell duration standards (configurable simulation seconds)
export const SECURITY_DWELL_SECONDS = 0.45;
export const DARSHAN_DWELL_SECONDS = 1.2;

export const SIMULATION_DEFAULTS = {
  // Spacing between agents queuing in line (meters)
  MIN_QUEUE_SPACING: 0.9,
  // Stopping distance behind previous agent
  DECELERATION_DISTANCE: 1.8,
  // Base walking speed (m/s)
  BASE_SPEED: 1.4,
  // Duration spent undergoing security screening (seconds)
  SECURITY_CHECK_SECONDS: SECURITY_DWELL_SECONDS,
  SECURITY_DWELL_SECONDS,
  // Duration spent at darshan viewing point (seconds)
  DARSHAN_VIEWING_SECONDS: DARSHAN_DWELL_SECONDS,
  DARSHAN_DWELL_SECONDS,
  // Spawning interval in seconds (controlled flow)
  SPAWN_INTERVAL_SECONDS: 0.5,
  // Target visual agent sample count
  VISUAL_SAMPLE_CAP: 300,
};

/**
 * Creates a deterministic simulated visitor agent with natural human variety
 */
export function createAgent(id, path, enteredAt = 0, config = SIMULATION_DEFAULTS) {
  const waypoints = path.waypoints || [];
  const startPt = waypoints[0] || { x: 0, z: 0 };
  const nextPt = waypoints[1] || startPt;

  // Robust deterministic hash from agent id
  const numId = typeof id === 'number' ? id : parseInt(String(id).replace(/\D/g, '') || '1', 10);
  const safeId = isNaN(numId) ? 1 : numId;
  const hash = (safeId * 2654435761) >>> 0;

  // Walking speed variation: 0.88x to 1.14x (Point 17)
  const speedVariationRatio = 0.88 + ((hash % 26) / 100);
  const speed = config.BASE_SPEED * speedVariationRatio;

  // Staggered initial walk cycle phase so crowd never walks in lockstep (Point 18)
  const initialPhase = ((hash >>> 3) % 100) * 0.06283; // 0 to 2*PI

  // Quick visual security screening dwell: short deterministic duration centered around SECURITY_DWELL_SECONDS
  const baseSecDwell = config.SECURITY_DWELL_SECONDS !== undefined ? config.SECURITY_DWELL_SECONDS : (config.SECURITY_CHECK_SECONDS || SECURITY_DWELL_SECONDS);
  const securityDwellTime = Math.max(0.20, baseSecDwell + (((hash >>> 5) % 9) - 4) * 0.025);

  // Darshan reverent viewing dwell: short reverent viewing centered around DARSHAN_DWELL_SECONDS
  const baseDarshanDwell = config.DARSHAN_DWELL_SECONDS !== undefined ? config.DARSHAN_DWELL_SECONDS : (config.DARSHAN_VIEWING_SECONDS || DARSHAN_DWELL_SECONDS);
  const darshanDwellTime = Math.max(0.30, baseDarshanDwell + (((hash >>> 7) % 9) - 4) * 0.035);

  // Gender and attire variation (Point 3 & 4)
  const isFemale = ((hash >>> 2) % 2) === 0;
  const gender = isFemale ? 'female' : 'male';
  const attireIndex = (hash >>> 4) % 2;
  const attireType = isFemale
    ? (attireIndex === 0 ? 'saree' : 'salwar')
    : (attireIndex === 0 ? 'kurta_dhoti' : 'kurta_pyjama');

  // Height / scale variation: realistic 1.6m to 1.88m (Point 19)
  const baseScale = isFemale ? 1.32 : 1.44;
  const scaleVariance = ((hash % 15) / 100) * 0.12;
  const scaleFactor = baseScale + scaleVariance;

  const dx = nextPt.x - startPt.x;
  const dz = nextPt.z - startPt.z;
  const angle = Math.atan2(dx, dz);

  const stream = (path.stream || 'north').toLowerCase();
  const visitorRepresentativeId = `REP-${String(safeId).padStart(4, '0')}`;
  const currentZone = startPt.zone || 'entrance';

  return {
    id,
    visitorRepresentativeId,
    pathId: path.id,
    entryStream: stream,
    entranceId: stream.toUpperCase(),
    streamId: stream,
    stream: stream,
    targetStream: path.targetStream || null,
    isDiverted: Boolean(path.isDiversion),
    position: { x: startPt.x, y: startPt.y || 0, z: startPt.z },
    targetWaypointIndex: 1,
    speed,
    baseSpeed: speed,
    actualSpeed: 0, // Starts at 0 and accelerates smoothly (Point 6)
    desiredSpeed: speed,
    state: AGENT_STATES.ENTERING,
    logicalState: AGENT_STATES.ENTERING,
    currentZone,
    representedDevotees: 1,
    waitTime: 0,
    serviceTime: 0,
    totalJourneyTime: 0,
    serviceTimer: 0,
    securityDwellTime,
    darshanDwellTime,
    gender,
    attireType,
    scaleFactor,
    walkSpeedMultiplier: speedVariationRatio,
    walkCycle: initialPhase,
    enteredAt,
    completedAt: null,
    stalled: false,
    rotationY: angle,
    targetHeading: angle,
    distanceToNext: 0,
    idleTimer: (hash % 50) * 0.1, // Staggered idle breathing
  };
}

/**
 * Normalizes user-specified entrance distribution weights (e.g. 90/20/20 or 40/30/30)
 * into exact deterministic mathematical proportions and percentages.
 */
export function normalizeEntranceWeights(inflow = {}) {
  const wNorth = Math.max(0, Number(inflow.north) || 0);
  const wWest = Math.max(0, Number(inflow.west) || 0);
  const wEast = Math.max(0, Number(inflow.east) || 0);
  const total = wNorth + wWest + wEast;

  if (total <= 0) {
    return {
      weights: { north: 1, west: 1, east: 1 },
      totalWeight: 3,
      percentages: { north: 33.3, west: 33.3, east: 33.3 },
      proportions: { north: 1 / 3, west: 1 / 3, east: 1 / 3 },
    };
  }

  const pNorth = wNorth / total;
  const pWest = wWest / total;
  const pEast = wEast / total;

  return {
    weights: { north: wNorth, west: wWest, east: wEast },
    totalWeight: total,
    percentages: {
      north: Math.round(pNorth * 1000) / 10,
      west: Math.round(pWest * 1000) / 10,
      east: Math.round(pEast * 1000) / 10,
    },
    proportions: {
      north: pNorth,
      west: pWest,
      east: pEast,
    },
  };
}

/**
 * Computes Euclidean distance on X/Z plane
 */
export function getDistance2D(p1, p2) {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dz * dz);
}
