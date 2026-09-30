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

export const SIMULATION_DEFAULTS = {
  // Spacing between agents queuing in line (meters)
  MIN_QUEUE_SPACING: 0.9,
  // Stopping distance behind previous agent
  DECELERATION_DISTANCE: 1.8,
  // Base walking speed (m/s)
  BASE_SPEED: 1.4,
  // Duration spent undergoing security screening (seconds)
  SECURITY_CHECK_SECONDS: 2.8,
  // Duration spent at darshan viewing point (seconds)
  DARSHAN_VIEWING_SECONDS: 2.4,
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

  // Quick visual security screening dwell: 0.22s to 0.75s with deterministic variation (PART 1)
  const securityDwellTime = 0.22 + ((hash >>> 5) % 8) * 0.075;

  // Darshan reverent viewing dwell: 1.8s to 2.5s (Point 15)
  const darshanDwellTime = 1.8 + ((hash >>> 7) % 8) * 0.10;

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

  return {
    id,
    pathId: path.id,
    position: { x: startPt.x, y: 0.55, z: startPt.z },
    targetWaypointIndex: 1,
    speed,
    baseSpeed: speed,
    actualSpeed: 0, // Starts at 0 and accelerates smoothly (Point 6)
    desiredSpeed: speed,
    state: AGENT_STATES.ENTERING,
    waitTime: 0,
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
 * Computes Euclidean distance on X/Z plane
 */
export function getDistance2D(p1, p2) {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dz * dz);
}
