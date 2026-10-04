/**
 * DevaSetu Crowd Flow Simulation Path Generator
 * Deterministically constructs continuous traversal waypoints from the current Scene JSON:
 * ENTRANCE -> SECURITY -> QUEUE LANES -> DARSHAN -> EXIT
 * Supports Parallel, Serpentine, U-Shape, Split, and custom manual layouts.
 */

import { COMPONENT_TYPES } from '../../utils/componentDefaults.js';
import { getQueuePathGeometry } from '../../services/layout/queuePathGeometry.js';

/**
 * Validates whether the scene has the necessary components for crowd flow
 */
export function validateSimulationReadiness(components = []) {
  const entrances = components.filter(
    (c) => c.type === COMPONENT_TYPES.ENTRANCE || c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM
  );
  const queues = components.filter((c) => c.type === COMPONENT_TYPES.QUEUE);
  const darshans = components.filter(
    (c) => c.type === COMPONENT_TYPES.DARSHAN || c.type === COMPONENT_TYPES.DARSHAN_SANCTUM
  );
  const exits = components.filter((c) => c.type === COMPONENT_TYPES.EXIT);

  const missing = [];
  if (entrances.length === 0) missing.push('Entrance Gate or Entrance Gopuram');
  if (queues.length === 0) missing.push('Queue Lane');
  if (darshans.length === 0) missing.push('Darshan Point or Darshan Sanctum');
  if (exits.length === 0) missing.push('Exit Corridor');

  if (missing.length > 0) {
    return {
      ready: false,
      reason: `Create a valid entrance → queue → darshan → exit layout before starting simulation. (Missing: ${missing.join(', ')})`,
      missing,
    };
  }

  return { ready: true, reason: null, missing: [] };
}

/**
 * Finds the component from a list closest to a target Z coordinate
 */
function findClosestByZ(list, targetZ) {
  if (!list || list.length === 0) return null;
  return list.reduce((prev, curr) =>
    Math.abs(curr.position.z - targetZ) < Math.abs(prev.position.z - targetZ) ? curr : prev
  );
}

/**
 * Generates one or more discrete path waypoint arrays from current scene components.
 * Each path is an array of 3D points [{ x, z, zone, name }] that agents follow.
 */
export function generateSimulationPaths(scene) {
  const components = scene.components || [];
  const readiness = validateSimulationReadiness(components);

  if (!readiness.ready) {
    return { ready: false, reason: readiness.reason, paths: [] };
  }

  // 1. Identify Anchor Components
  const entrances = components.filter(
    (c) => c.type === COMPONENT_TYPES.ENTRANCE || c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM
  );
  const securities = components.filter((c) => c.type === COMPONENT_TYPES.SECURITY);
  const queues = components.filter((c) => c.type === COMPONENT_TYPES.QUEUE);
  const darshans = components.filter(
    (c) => c.type === COMPONENT_TYPES.DARSHAN || c.type === COMPONENT_TYPES.DARSHAN_SANCTUM
  );
  const exits = components.filter((c) => c.type === COMPONENT_TYPES.EXIT);
  const mainGopurams = components.filter((c) => c.type === COMPONENT_TYPES.MAIN_GOPURAM);

  // Primary anchors fallback
  const primaryEntrance = entrances.slice().sort((a, b) => a.position.x - b.position.x)[0];
  const entrancePt = {
    x: primaryEntrance.position.x,
    z: primaryEntrance.position.z,
    zone: 'entrance',
    name: primaryEntrance.name,
    componentId: primaryEntrance.id,
  };

  let securityPt = null;
  if (securities.length > 0) {
    const primarySecurity = securities.slice().sort((a, b) => a.position.x - b.position.x)[0];
    securityPt = {
      x: primarySecurity.position.x,
      z: primarySecurity.position.z,
      zone: 'security',
      name: primarySecurity.name,
      componentId: primarySecurity.id,
    };
  }

  const primaryDarshan = darshans.slice().sort((a, b) => a.position.x - b.position.x)[0];
  const darshanPt = {
    x: primaryDarshan.position.x,
    z: primaryDarshan.position.z,
    zone: 'darshan',
    name: primaryDarshan.name,
    componentId: primaryDarshan.id,
  };

  const primaryExit = exits.slice().sort((a, b) => a.position.x - b.position.x)[0];
  const exitPt = {
    x: primaryExit.position.x,
    z: primaryExit.position.z,
    zone: 'exit',
    name: primaryExit.name,
    componentId: primaryExit.id,
  };

  // Optional Main Gopuram landmark
  const mainGopuram = mainGopurams[0] || null;

  // 2. Detect Template Type or Layout Topology
  const template = detectQueueTopology(queues, components);

  let paths = [];

  switch (template) {
    case 'campus':
      paths = buildCampusPaths(scene);
      break;

    case 'single_curve':
      paths = buildSingleCurvedPath(queues[0], entrancePt, securityPt, darshanPt, exitPt, mainGopuram);
      break;

    case 'serpentine':
      paths = buildSerpentinePath(queues, entrancePt, securityPt, darshanPt, exitPt, mainGopuram);
      break;

    case 'u_shape':
      paths = buildUShapePath(queues, entrancePt, securityPt, darshanPt, exitPt, mainGopuram);
      break;

    case 'split':
      paths = buildSplitPaths(queues, entrancePt, securityPt, darshanPt, exitPt, mainGopuram);
      break;

    case 'parallel':
    default:
      paths = buildParallelPaths(
        queues,
        entrances,
        securities,
        darshans,
        exits,
        mainGopuram,
        entrancePt,
        securityPt,
        darshanPt,
        exitPt
      );
      break;
  }

  return {
    ready: true,
    template,
    paths,
    diversionPaths: paths.diversionPaths || [],
    allPaths: paths.allPaths || paths,
    componentsCount: components.length,
    entrancePt,
    securityPt,
    darshanPt,
    exitPt,
  };
}

/**
 * Detects whether the queue lanes follow parallel, serpentine, u_shape, split, or campus
 */
function detectQueueTopology(queues, components = []) {
  const isFestivalCampus =
    components.some((c) => c.role === 'post-darshan-plaza') ||
    components.some((c) => c.properties?.pattern === 'switchback') ||
    (components.some((c) => c.role === 'arrival-gate-north') &&
      components.some((c) => c.role === 'arrival-gate-west') &&
      components.some((c) => c.role === 'arrival-gate-east'));

  if (isFestivalCampus) {
    return 'campus';
  }

  if (queues.length === 0) return 'parallel';

  if (queues.length === 1 && queues[0].properties?.pathData && queues[0].properties.pathData.type !== 'straight') {
    return 'single_curve';
  }

  const explicitTemplate = queues[0].template;
  if (explicitTemplate) return explicitTemplate;

  if (queues.some((q) => q.role === 'queue-segment' || q.name?.toLowerCase().includes('serpentine'))) {
    return 'serpentine';
  }
  if (queues.some((q) => q.role === 'queue-arm' || q.role === 'queue-turn' || q.name?.toLowerCase().includes('u-shape'))) {
    return 'u_shape';
  }
  if (queues.some((q) => q.role === 'queue-branch' || q.name?.toLowerCase().includes('branch'))) {
    return 'split';
  }

  return 'parallel';
}

/**
 * Builds discrete path for a single path-based continuous queue (Arc, Bezier, S-Shape, Serpentine, U-Shape, Radial)
 */
function buildSingleCurvedPath(queue, entrancePt, securityPt, darshanPt, exitPt, mainGopuram) {
  const pathGeom = getQueuePathGeometry(queue, 0.85);
  const waypoints = [];

  waypoints.push({ ...entrancePt });
  if (securityPt) waypoints.push({ ...securityPt });

  const worldPts = pathGeom.worldPoints;
  if (worldPts && worldPts.length > 0) {
    const firstPt = worldPts[0];
    const secondPt = worldPts[1] || firstPt;
    const dx = secondPt.x - firstPt.x;
    const dz = secondPt.z - firstPt.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;

    waypoints.push({
      x: Math.round((firstPt.x - (dx / len) * 1.0) * 100) / 100,
      z: Math.round((firstPt.z - (dz / len) * 1.0) * 100) / 100,
      zone: 'approach',
      name: `${queue.name} Approach`,
    });

    worldPts.forEach((wp, idx) => {
      waypoints.push({
        x: wp.x,
        z: wp.z,
        zone: 'queue',
        name: `${queue.name} Node ${idx + 1}`,
        componentId: queue.id,
        headingAngle: wp.headingAngle,
      });
    });
  }

  if (mainGopuram) {
    waypoints.push({
      x: mainGopuram.position.x,
      z: 0,
      zone: 'approach',
      name: 'Main Gopuram Gateway Portal',
      componentId: mainGopuram.id,
    });
  }

  waypoints.push({ ...darshanPt });
  waypoints.push({ ...exitPt });

  return [
    {
      id: 0,
      name: `Curved Path (${queue.name})`,
      laneId: queue.id,
      stream: (queue.properties?.stream || 'main').toLowerCase(),
      waypoints,
    },
  ];
}

/**
 * Builds parallel paths (one distinct path per queue lane) with nearest-anchor matching
 */
function buildParallelPaths(
  queues,
  entrances,
  securities,
  darshans,
  exits,
  mainGopuram,
  fallbackEntrancePt,
  fallbackSecurityPt,
  fallbackDarshanPt,
  fallbackExitPt
) {
  const sortedLanes = queues.slice().sort((a, b) => a.position.z - b.position.z);
  const paths = [];

  sortedLanes.forEach((lane, index) => {
    const l = lane.dimensions.length;
    const startX = lane.position.x - l / 2;
    const endX = lane.position.x + l / 2;
    const laneZ = lane.position.z;

    // Pick closest entrance, security, darshan, exit for spatial alignment
    const matchedEntrance = findClosestByZ(entrances, laneZ);
    const matchedSecurity = findClosestByZ(securities, laneZ);
    const matchedDarshan = findClosestByZ(darshans, laneZ);
    const matchedExit = findClosestByZ(exits, matchedDarshan ? matchedDarshan.position.z : laneZ);

    const entPt = matchedEntrance
      ? { x: matchedEntrance.position.x, z: matchedEntrance.position.z, zone: 'entrance', name: matchedEntrance.name, componentId: matchedEntrance.id }
      : fallbackEntrancePt;

    const secPt = matchedSecurity
      ? { x: matchedSecurity.position.x, z: matchedSecurity.position.z, zone: 'security', name: matchedSecurity.name, componentId: matchedSecurity.id }
      : fallbackSecurityPt;

    const darPt = matchedDarshan
      ? { x: matchedDarshan.position.x, z: matchedDarshan.position.z, zone: 'darshan', name: matchedDarshan.name, componentId: matchedDarshan.id }
      : fallbackDarshanPt;

    const exPt = matchedExit
      ? { x: matchedExit.position.x, z: matchedExit.position.z, zone: 'exit', name: matchedExit.name, componentId: matchedExit.id }
      : fallbackExitPt;

    const waypoints = [];
    waypoints.push({ ...entPt });
    if (secPt) waypoints.push({ ...secPt });

    const isCurved = Boolean(lane.properties?.pathData && lane.properties.pathData.type !== 'straight');
    const pathGeom = getQueuePathGeometry(lane, 0.85);
    const worldPts = pathGeom.worldPoints;

    const startPt = (worldPts && worldPts[0]) ? worldPts[0] : { x: startX, z: laneZ };
    const endPt = (worldPts && worldPts[worldPts.length - 1]) ? worldPts[worldPts.length - 1] : { x: endX, z: laneZ };

    // Approach point into this lane
    waypoints.push({
      x: Math.round((startPt.x - 1.0) * 100) / 100,
      z: Math.round(startPt.z * 100) / 100,
      zone: 'approach',
      name: `${lane.name} Entry`,
    });

    if (isCurved && worldPts && worldPts.length > 0) {
      worldPts.forEach((wp, wIdx) => {
        waypoints.push({
          x: wp.x,
          z: wp.z,
          zone: 'queue',
          name: `${lane.name} Node ${wIdx + 1}`,
          componentId: lane.id,
          headingAngle: wp.headingAngle,
        });
      });
    } else {
      // Lane body waypoints
      waypoints.push({
        x: startPt.x,
        z: startPt.z,
        zone: 'queue',
        name: `${lane.name} Start`,
        componentId: lane.id,
      });
      waypoints.push({
        x: endPt.x,
        z: endPt.z,
        zone: 'queue',
        name: `${lane.name} End`,
        componentId: lane.id,
      });
    }

    // If Main Gopuram exists and lies between queue and Sanctum
    if (mainGopuram && mainGopuram.position.x > endX && darPt.x >= mainGopuram.position.x) {
      waypoints.push({
        x: mainGopuram.position.x - 3,
        z: laneZ * 0.4,
        zone: 'approach',
        name: 'Main Gopuram Forecourt',
      });
      waypoints.push({
        x: mainGopuram.position.x,
        z: 0,
        zone: 'approach',
        name: 'Main Gopuram Gateway Portal',
        componentId: mainGopuram.id,
      });
    }

    // Convergence towards Darshan Sanctum and Exit
    waypoints.push({ ...darPt });
    waypoints.push({ ...exPt });

    paths.push({
      id: index,
      name: `Parallel Lane ${index + 1} (${lane.name})`,
      laneId: lane.id,
      stream: (lane.properties?.stream || 'main').toLowerCase(),
      waypoints,
    });
  });

  return paths;
}

/**
 * Builds continuous serpentine zigzag path through all segments
 */
function buildSerpentinePath(queues, entrancePt, securityPt, darshanPt, exitPt, mainGopuram) {
  // If queue is a single continuous pathData serpentine
  if (queues.length === 1 && queues[0].properties?.pathData && queues[0].properties.pathData.type === 'serpentine') {
    return buildSingleCurvedPath(queues[0], entrancePt, securityPt, darshanPt, exitPt, mainGopuram);
  }

  // Sort segments by row index or Z coordinate
  const segments = queues.slice().sort((a, b) => a.position.z - b.position.z);
  const waypoints = [];

  waypoints.push({ ...entrancePt });
  if (securityPt) waypoints.push({ ...securityPt });

  segments.forEach((seg, i) => {
    const l = seg.dimensions.length;
    const isEven = i % 2 === 0;
    const xLeft = seg.position.x - l / 2;
    const xRight = seg.position.x + l / 2;
    const segZ = seg.position.z;

    if (isEven) {
      // Forward along +X: enter left, exit right
      waypoints.push({
        x: xLeft,
        z: segZ,
        zone: 'queue',
        name: `Serpentine Row ${i + 1} In`,
        componentId: seg.id,
      });
      waypoints.push({
        x: xRight,
        z: segZ,
        zone: 'queue',
        name: `Serpentine Row ${i + 1} Out`,
        componentId: seg.id,
      });

      // Smooth U-turn corner around barrier at right end
      if (i < segments.length - 1) {
        const nextSeg = segments[i + 1];
        const midZ = (segZ + nextSeg.position.z) / 2;
        waypoints.push({
          x: xRight + 1.2,
          z: midZ,
          zone: 'queue',
          name: `Serpentine Corner Turn ${i + 1}`,
          componentId: seg.id,
        });
      }
    } else {
      // Reverse along -X: enter right, exit left
      waypoints.push({
        x: xRight,
        z: segZ,
        zone: 'queue',
        name: `Serpentine Row ${i + 1} In`,
        componentId: seg.id,
      });
      waypoints.push({
        x: xLeft,
        z: segZ,
        zone: 'queue',
        name: `Serpentine Row ${i + 1} Out`,
        componentId: seg.id,
      });

      // Smooth U-turn corner around barrier at left end
      if (i < segments.length - 1) {
        const nextSeg = segments[i + 1];
        const midZ = (segZ + nextSeg.position.z) / 2;
        waypoints.push({
          x: xLeft - 1.2,
          z: midZ,
          zone: 'queue',
          name: `Serpentine Corner Turn ${i + 1}`,
          componentId: seg.id,
        });
      }
    }
  });

  if (mainGopuram) {
    waypoints.push({
      x: mainGopuram.position.x,
      z: 0,
      zone: 'approach',
      name: 'Main Gopuram Gateway Portal',
      componentId: mainGopuram.id,
    });
  }

  waypoints.push({ ...darshanPt });
  waypoints.push({ ...exitPt });

  return [
    {
      id: 0,
      name: 'Continuous Serpentine Circuit',
      laneId: 'serpentine-main',
      stream: (queues[0]?.properties?.stream || 'main').toLowerCase(),
      waypoints,
    },
  ];
}

/**
 * Builds continuous U-shape traversal path (Leg 1 -> Turn -> Leg 2)
 */
function buildUShapePath(queues, entrancePt, securityPt, darshanPt, exitPt, mainGopuram) {
  if (queues.length === 1 && queues[0].properties?.pathData && queues[0].properties.pathData.type === 'u_shape') {
    return buildSingleCurvedPath(queues[0], entrancePt, securityPt, darshanPt, exitPt, mainGopuram);
  }

  const arm1 = queues.find((q) => q.role === 'queue-arm' && q.rotation === 0) || queues[0];
  const turn = queues.find((q) => q.role === 'queue-turn' || q.rotation === 90);
  const arm2 = queues.find((q) => q.role === 'queue-arm' && q.rotation === 180) || queues[queues.length - 1];

  const waypoints = [];
  waypoints.push({ ...entrancePt });
  if (securityPt) waypoints.push({ ...securityPt });

  // Arm 1 forward
  if (arm1) {
    const l1 = arm1.dimensions.length;
    waypoints.push({
      x: arm1.position.x - l1 / 2,
      z: arm1.position.z,
      zone: 'queue',
      name: 'U-Shape Forward Leg Start',
      componentId: arm1.id,
    });
    waypoints.push({
      x: arm1.position.x + l1 / 2,
      z: arm1.position.z,
      zone: 'queue',
      name: 'U-Shape Forward Leg End',
      componentId: arm1.id,
    });
  }

  // Turn Connector
  if (turn) {
    waypoints.push({
      x: turn.position.x,
      z: turn.position.z,
      zone: 'queue',
      name: 'U-Shape Turn',
      componentId: turn.id,
    });
  }

  // Arm 2 return
  if (arm2) {
    const l2 = arm2.dimensions.length;
    waypoints.push({
      x: arm2.position.x + l2 / 2,
      z: arm2.position.z,
      zone: 'queue',
      name: 'U-Shape Return Leg Start',
      componentId: arm2.id,
    });
    waypoints.push({
      x: arm2.position.x - l2 / 2,
      z: arm2.position.z,
      zone: 'queue',
      name: 'U-Shape Return Leg End',
      componentId: arm2.id,
    });
  }

  if (mainGopuram) {
    waypoints.push({
      x: mainGopuram.position.x,
      z: 0,
      zone: 'approach',
      name: 'Main Gopuram Gateway Portal',
      componentId: mainGopuram.id,
    });
  }

  waypoints.push({ ...darshanPt });
  waypoints.push({ ...exitPt });

  return [
    {
      id: 0,
      name: 'U-Shape Continuous Circuit',
      laneId: 'ushape-main',
      stream: (queues[0]?.properties?.stream || 'main').toLowerCase(),
      waypoints,
    },
  ];
}

/**
 * Builds split branch paths
 */
function buildSplitPaths(queues, entrancePt, securityPt, darshanPt, exitPt, mainGopuram) {
  const branches = queues.slice().sort((a, b) => a.position.z - b.position.z);
  const paths = [];

  branches.forEach((branch, index) => {
    const l = branch.dimensions.length;
    const startX = branch.position.x - l / 2;
    const endX = branch.position.x + l / 2;
    const branchZ = branch.position.z;

    const waypoints = [];
    waypoints.push({ ...entrancePt });
    if (securityPt) waypoints.push({ ...securityPt });

    const isCurved = Boolean(branch.properties?.pathData && branch.properties.pathData.type !== 'straight');
    const pathGeom = getQueuePathGeometry(branch, 0.85);
    const worldPts = pathGeom.worldPoints;
    const startPt = (worldPts && worldPts[0]) ? worldPts[0] : { x: startX, z: branchZ };
    const endPt = (worldPts && worldPts[worldPts.length - 1]) ? worldPts[worldPts.length - 1] : { x: endX, z: branchZ };

    waypoints.push({
      x: Math.round((startPt.x - 1.0) * 100) / 100,
      z: Math.round(startPt.z * 100) / 100,
      zone: 'approach',
      name: `Branch ${String.fromCharCode(65 + index)} Split Point`,
    });

    if (isCurved && worldPts && worldPts.length > 0) {
      worldPts.forEach((wp, wIdx) => {
        waypoints.push({
          x: wp.x,
          z: wp.z,
          zone: 'queue',
          name: `Branch ${String.fromCharCode(65 + index)} Node ${wIdx + 1}`,
          componentId: branch.id,
          headingAngle: wp.headingAngle,
        });
      });
    } else {
      waypoints.push({
        x: startPt.x,
        z: startPt.z,
        zone: 'queue',
        name: `Branch ${String.fromCharCode(65 + index)} Start`,
        componentId: branch.id,
      });
      waypoints.push({
        x: endPt.x,
        z: endPt.z,
        zone: 'queue',
        name: `Branch ${String.fromCharCode(65 + index)} End`,
        componentId: branch.id,
      });
    }

    if (mainGopuram) {
      waypoints.push({
        x: mainGopuram.position.x,
        z: 0,
        zone: 'approach',
        name: 'Main Gopuram Gateway Portal',
        componentId: mainGopuram.id,
      });
    }

    waypoints.push({ ...darshanPt });
    waypoints.push({ ...exitPt });

    paths.push({
      id: index,
      name: `Split Branch ${String.fromCharCode(65 + index)}`,
      laneId: branch.id,
      stream: (branch.properties?.stream || 'main').toLowerCase(),
      waypoints,
    });
  });

  return paths;
}

/**
 * Builds discrete multi-zone continuous traversal paths for the Distributed Temple Campus:
 * 16 total discrete paths:
 * - 6 North paths (Path IDs 0..5): North Gopuram -> North Gates -> Holding Loop -> 6 Security Channels -> Serpentine Queue -> Radial D1/D2 -> Central Main Gopuram -> Darshan Sanctum -> Post-Darshan Plaza -> South Corridors -> South Exit Gopuram
 * - 5 West paths (Path IDs 6..10): West Gopuram -> West Gates -> Holding Loop -> 5 Security Channels -> Switchback Queue -> Radial D3 -> Central Main Gopuram -> Darshan Sanctum -> Post-Darshan Plaza -> South Corridors -> South Exit Gopuram
 * - 5 East paths (Path IDs 11..15): East Gopuram -> East Gates -> Holding Loop -> 5 Security Channels -> Switchback Queue -> Radial D4 -> Central Main Gopuram -> Darshan Sanctum -> Post-Darshan Plaza -> South Corridors -> South Exit Gopuram
 */
function buildCampusPaths(scene) {
  const components = scene.components || [];
  const paths = [];

  // Key architectural landmarks
  const northGopuram = components.find((c) => c.role === 'north-gopuram') || { position: { x: 0, z: -82 }, id: 'ng-fallback' };
  const westGopuram = components.find((c) => c.role === 'west-gopuram') || { position: { x: -112, z: -10 }, id: 'wg-fallback' };
  const eastGopuram = components.find((c) => c.role === 'east-gopuram') || { position: { x: 112, z: -10 }, id: 'eg-fallback' };
  const southGopuram = components.find((c) => c.role === 'south-gopuram') || { position: { x: 0, z: 82 }, id: 'sg-fallback' };
  const mainGopuram = components.find((c) => c.type === COMPONENT_TYPES.MAIN_GOPURAM) || { position: { x: 0, z: -10 }, id: 'mg-fallback' };
  const sanctum = components.find((c) => c.type === COMPONENT_TYPES.DARSHAN_SANCTUM || c.type === COMPONENT_TYPES.DARSHAN) || { position: { x: 0, z: -26 }, id: 'ds-fallback' };

  const northGates = components.filter((c) => c.role === 'arrival-gate-north').sort((a, b) => a.position.x - b.position.x);
  const northSecurities = components.filter((c) => (c.properties?.zone === 'A' || c.properties?.stream === 'north') && c.type === COMPONENT_TYPES.SECURITY).sort((a, b) => a.position.x - b.position.x);
  const northQueues = components.filter((c) => c.role === 'queue-lane' && (c.properties?.zone === 'A' || c.properties?.stream === 'north' || (c.id || '').includes('north'))).sort((a, b) => a.position.x - b.position.x);

  const westGates = components.filter((c) => c.role === 'arrival-gate-west').sort((a, b) => a.position.z - b.position.z);
  const westSecurities = components.filter((c) => (c.properties?.zone === 'B' || c.properties?.stream === 'west') && c.type === COMPONENT_TYPES.SECURITY).sort((a, b) => a.position.z - b.position.z);
  const westQueues = components.filter((c) => c.role === 'queue-lane' && (c.properties?.zone === 'B' || c.properties?.stream === 'west' || (c.id || '').includes('west'))).sort((a, b) => a.position.z - b.position.z);

  const eastGates = components.filter((c) => c.role === 'arrival-gate-east').sort((a, b) => a.position.z - b.position.z);
  const eastSecurities = components.filter((c) => (c.properties?.zone === 'C' || c.properties?.stream === 'east') && c.type === COMPONENT_TYPES.SECURITY).sort((a, b) => a.position.z - b.position.z);
  const eastQueues = components.filter((c) => c.role === 'queue-lane' && (c.properties?.zone === 'C' || c.properties?.stream === 'east' || (c.id || '').includes('east'))).sort((a, b) => a.position.z - b.position.z);

  const dispersalPlaza = components.find((c) => c.role === 'post-darshan-plaza') || { position: { x: 0, z: 22 }, id: 'plaza-fallback' };
  const exitChannels = components.filter((c) => c.properties?.zone === 'G' && c.type === COMPONENT_TYPES.QUEUE).sort((a, b) => a.position.x - b.position.x);
  const exitGates = components.filter((c) => c.type === COMPONENT_TYPES.EXIT).sort((a, b) => a.position.x - b.position.x);

  const plazaZ = dispersalPlaza.position.z;

  // STREAM 1: NORTH INCOMING STREAM (Matches physical vertical North queue lanes)
  const numNorthPaths = northQueues.length > 0 ? northQueues.length : 4;
  for (let i = 0; i < numNorthPaths; i++) {
    const waypoints = [];
    const queueLane = northQueues[i] || {
      position: { x: -6 + i * 4, z: -34 },
      dimensions: { length: 30, width: 2.2 },
      rotation: 90,
      name: `North Queue ${i + 1}`,
      id: `nq-${i}`,
      properties: { orientation: 'vertical', direction: 'south' },
    };
    
    // Match nearest security channel to queueLane entry to avoid diagonal lines across the courtyard
    const targetX = queueLane.position?.x ?? 0;
    const sortedSec = northSecurities.length > 0 
      ? northSecurities.slice().sort((a, b) => Math.abs(a.position.x - targetX) - Math.abs(b.position.x - targetX))
      : [];
    const sec = sortedSec[0] || northSecurities[i % (northSecurities.length || 1)] || { position: { x: targetX, z: -55 }, name: `North Security ${(i % 6) + 1}`, id: `ns-${i}` };

    const sortedGates = northGates.length > 0
      ? northGates.slice().sort((a, b) => Math.abs(a.position.x - sec.position.x) - Math.abs(b.position.x - sec.position.x))
      : [];
    const gate = sortedGates[0] || northGates[i % (northGates.length || 1)] || { position: { x: -25 + (i % 6) * 10, z: -74 }, name: `North Gate ${(i % 6) + 1}`, id: `ng-${i}` };
    const exitChan = exitChannels[i % (exitChannels.length || 1)] || { position: { x: -12 + (i % 4) * 8, z: 54 }, name: `Exit Channel ${i + 1}`, id: `ec-${i}` };
    const exitGate = exitGates[i % (exitGates.length || 1)] || { position: { x: -12 + (i % 4) * 8, z: 72 }, name: `Exit Gate ${i + 1}`, id: `eg-${i}` };

    // 1. North Exterior Temple Approach & Gopuram Gateway Portal
    waypoints.push({
      x: 0,
      z: northGopuram.position.z - 10,
      zone: 'entrance',
      name: 'North Exterior Temple Approach',
    });
    waypoints.push({
      x: 0,
      z: northGopuram.position.z,
      zone: 'entrance',
      name: 'North Entrance Gopuram (Uttara Raja Dvaram) Gateway Portal',
      componentId: northGopuram.id,
    });
    // Emerge through inner portal threshold into entry courtyard
    waypoints.push({
      x: 0,
      z: northGopuram.position.z + 6,
      zone: 'entrance',
      name: 'North Gopuram Inner Gateway Threshold',
    });

    // 2. North Entry Plaza (Pravesha Courtyard)
    waypoints.push({
      x: Math.round(sec.position.x * 0.35 * 10) / 10,
      z: -72,
      zone: 'entrance',
      name: 'North Entry Plaza (Pravesha Courtyard)',
    });

    // 3. North Holding Bay (Orthogonally aligned with security lane)
    waypoints.push({
      x: sec.position.x,
      z: -66,
      zone: 'holding',
      name: 'North Holding Circulation Bay',
    });
    waypoints.push({
      x: sec.position.x,
      z: -60,
      zone: 'holding',
      name: 'North Holding Release Gate',
    });

    // 4. North Security Screening Channel (Parallel DFMD)
    waypoints.push({
      x: sec.position.x,
      z: sec.position.z,
      zone: 'security',
      name: sec.name,
      componentId: sec.id,
    });

    // 5. North Queue Lane Traversal (Direct straight lanes vs Extended Free serpentine queues)
    const isCurved = Boolean(queueLane.properties?.pathData && queueLane.properties.pathData.type !== 'straight');
    const pathGeom = getQueuePathGeometry(queueLane, 0.85);
    const worldPts = pathGeom.worldPoints;
    const isVertical = queueLane.rotation === 90 || queueLane.properties?.orientation === 'vertical' || queueLane.properties?.direction === 'south';

    if (isCurved && worldPts && worldPts.length > 2) {
      // Free Darshan Queue: devotees step out of Security towards queue start
      const firstWp = worldPts[0];
      const lastWp = worldPts[worldPts.length - 1];

      waypoints.push({
        x: firstWp.x,
        z: -51,
        zone: 'queue',
        name: `${queueLane.name} Entry Approach`,
        componentId: queueLane.id,
        headingAngle: firstWp.headingAngle !== undefined ? firstWp.headingAngle : Math.PI,
      });

      // Follow full sampled centerline points (straight runs + semi-curved turnaround bends)
      worldPts.forEach((wp, wIdx) => {
        waypoints.push({
          x: wp.x,
          z: wp.z,
          zone: 'queue',
          name: `${queueLane.name} Point ${wIdx + 1}`,
          componentId: queueLane.id,
          headingAngle: wp.headingAngle,
        });
      });

      // 6. Smooth Ingress Funnel: multiple lanes taper inward towards central axis
      waypoints.push({
        x: Math.round(lastWp.x * 0.35 * 10) / 10,
        z: -19,
        zone: 'queue',
        name: `North Convergence Funnel Chute ${(i % 6) + 1}`,
        componentId: queueLane.id,
        headingAngle: Math.PI,
      });

      // 7. Central Unified Darshan Spine Queue (One Single Queue connecting to Darshan)
      waypoints.push({
        x: 0,
        z: -16,
        zone: 'queue',
        name: 'North Central Unified Darshan Queue Entry',
        headingAngle: Math.PI,
      });
      waypoints.push({
        x: 0,
        z: mainGopuram.position.z,
        zone: 'queue',
        name: 'Main Gopuram Gateway Portal',
        componentId: mainGopuram.id,
        headingAngle: Math.PI,
      });

      // 8. Central Darshan Sanctum (Single Queue at Darshan viewing point)
      waypoints.push({
        x: 0,
        z: -6,
        zone: 'darshan',
        name: 'Sri Ganesha Maha Garbhagriha Sacred Viewing Point',
        componentId: sanctum.id,
        headingAngle: Math.PI,
      });
    } else if (isVertical) {
      const laneX = queueLane.position.x;

      // Start of vertical queue lane right after security
      waypoints.push({
        x: laneX,
        z: -51,
        zone: 'queue',
        name: `${queueLane.name} Entry`,
        componentId: queueLane.id,
        headingAngle: Math.PI,
      });
      // Midpoint of vertical queue lane
      waypoints.push({
        x: laneX,
        z: -38,
        zone: 'queue',
        name: `${queueLane.name} Centerline`,
        componentId: queueLane.id,
        headingAngle: Math.PI,
      });
      // Base of vertical queue lane
      waypoints.push({
        x: laneX,
        z: -24,
        zone: 'queue',
        name: `${queueLane.name} Base`,
        componentId: queueLane.id,
        headingAngle: Math.PI,
      });

      // 6. Smooth Ingress Funnel: multiple lanes taper inward towards central axis
      waypoints.push({
        x: Math.round(laneX * 0.35 * 10) / 10,
        z: -19,
        zone: 'queue',
        name: `North Convergence Funnel Chute ${(i % 6) + 1}`,
        componentId: queueLane.id,
        headingAngle: Math.PI,
      });

      // 7. Central Unified Darshan Spine Queue (One Single Queue connecting to Darshan)
      waypoints.push({
        x: 0,
        z: -16,
        zone: 'queue',
        name: 'North Central Unified Darshan Queue Entry',
        headingAngle: Math.PI,
      });
      waypoints.push({
        x: 0,
        z: mainGopuram.position.z,
        zone: 'queue',
        name: 'Main Gopuram Gateway Portal',
        componentId: mainGopuram.id,
        headingAngle: Math.PI,
      });

      // 8. Central Darshan Sanctum (Single Queue at Darshan viewing point)
      waypoints.push({
        x: 0,
        z: -6,
        zone: 'darshan',
        name: 'Sri Ganesha Maha Garbhagriha Sacred Viewing Point',
        componentId: sanctum.id,
        headingAngle: Math.PI,
      });
    } else if (isCurved && worldPts && worldPts.length > 0) {
      waypoints.push({
        x: sec.position.x,
        z: queueLane.position.z,
        zone: 'approach',
        name: `${queueLane.name} Entry`,
      });
      worldPts.forEach((wp, wIdx) => {
        waypoints.push({
          x: wp.x,
          z: wp.z,
          zone: 'queue',
          name: `${queueLane.name} Node ${wIdx + 1}`,
          componentId: queueLane.id,
          headingAngle: wp.headingAngle,
        });
      });
      waypoints.push({
        x: 0,
        z: -16,
        zone: 'queue',
        name: 'North Central Unified Darshan Queue Entry',
        headingAngle: Math.PI,
      });
      waypoints.push({
        x: 0,
        z: mainGopuram.position.z,
        zone: 'queue',
        name: 'Main Gopuram Gateway Portal',
        componentId: mainGopuram.id,
        headingAngle: Math.PI,
      });
      waypoints.push({
        x: 0,
        z: -6,
        zone: 'darshan',
        name: 'Sri Ganesha Maha Garbhagriha Sacred Viewing Point',
        componentId: sanctum.id,
        headingAngle: Math.PI,
      });
    } else {
      const laneX = queueLane.position?.x ?? (-6 + i * 4);

      // Start of vertical queue lane right after security
      waypoints.push({
        x: laneX,
        z: -51,
        zone: 'queue',
        name: `${queueLane.name} Entry`,
        componentId: queueLane.id,
        headingAngle: Math.PI,
      });
      // Midpoint of vertical queue lane
      waypoints.push({
        x: laneX,
        z: -38,
        zone: 'queue',
        name: `${queueLane.name} Centerline`,
        componentId: queueLane.id,
        headingAngle: Math.PI,
      });
      // Base of vertical queue lane
      waypoints.push({
        x: laneX,
        z: -24,
        zone: 'queue',
        name: `${queueLane.name} Base`,
        componentId: queueLane.id,
        headingAngle: Math.PI,
      });

      // Smooth Ingress Funnel towards central axis
      waypoints.push({
        x: Math.round(laneX * 0.35 * 10) / 10,
        z: -19,
        zone: 'queue',
        name: `North Convergence Funnel Chute ${(i % 6) + 1}`,
        componentId: queueLane.id,
        headingAngle: Math.PI,
      });

      // Central Unified Darshan Spine Queue
      waypoints.push({
        x: 0,
        z: -16,
        zone: 'queue',
        name: 'North Central Unified Darshan Queue Entry',
        headingAngle: Math.PI,
      });
      waypoints.push({
        x: 0,
        z: mainGopuram.position.z,
        zone: 'queue',
        name: 'Main Gopuram Gateway Portal',
        componentId: mainGopuram.id,
        headingAngle: Math.PI,
      });
      waypoints.push({
        x: 0,
        z: -6,
        zone: 'darshan',
        name: 'Sri Ganesha Maha Garbhagriha Sacred Viewing Point',
        componentId: sanctum.id,
        headingAngle: Math.PI,
      });
    }

    // 9. Sanctum South Egress Portal
    waypoints.push({
      x: 0,
      z: 6,
      zone: 'darshan',
      name: 'Maha Garbhagriha South Egress Portal',
      headingAngle: Math.PI,
    });

    // 10. Sacred South Promenade
    waypoints.push({
      x: 0,
      z: 14,
      zone: 'dispersal',
      name: 'Sacred South Dispersal Promenade',
      headingAngle: Math.PI,
    });

    // 11. Post-Darshan Dispersal Plaza (Zone F)
    waypoints.push({
      x: exitChan.position.x,
      z: plazaZ,
      zone: 'dispersal',
      name: 'Post-Darshan Dispersal & Prasad Plaza',
      componentId: dispersalPlaza.id,
    });

    // 12. South Dispersal Corridor (Zone G)
    waypoints.push({
      x: exitChan.position.x,
      z: exitChan.position.z,
      zone: 'exit',
      name: exitChan.name,
      componentId: exitChan.id,
    });

    // 13. South Exit Corridor Gate
    waypoints.push({
      x: exitGate.position.x,
      z: exitGate.position.z,
      zone: 'exit',
      name: exitGate.name,
      componentId: exitGate.id,
    });

    // 14. South Exit Gopuram & Exterior Egress
    waypoints.push({
      x: 0,
      z: southGopuram.position.z - 6,
      zone: 'exit',
      name: 'South Exit Courtyard Approach',
    });
    waypoints.push({
      x: 0,
      z: southGopuram.position.z,
      zone: 'exit',
      name: 'South Exit Gopuram (Dakshina Nirgamana Dvaram)',
      componentId: southGopuram.id,
    });
    waypoints.push({
      x: 0,
      z: southGopuram.position.z + 10,
      zone: 'exit',
      name: 'South Exterior Temple Grounds',
    });

    paths.push({
      id: i,
      name: `North Campus Stream - Lane ${i + 1}`,
      laneId: queueLane.id,
      stream: 'north',
      waypoints,
    });
  }

  // STREAM 2: WEST INCOMING STREAM (At least 5 lanes, expanding with new lanes)
  const numWestPaths = Math.max(5, westQueues.length);
  for (let j = 0; j < numWestPaths; j++) {
    const pathIdx = numNorthPaths + j;
    const waypoints = [];
    const queueLane = westQueues[j] || { position: { x: -51, z: -20 + j * 5 }, dimensions: { length: 32 }, name: `West Queue ${j + 1}`, id: `wq-${j}` };
    const targetZ = queueLane.position?.z ?? 0;
    const sortedSec = westSecurities.length > 0
      ? westSecurities.slice().sort((a, b) => Math.abs(a.position.z - targetZ) - Math.abs(b.position.z - targetZ))
      : [];
    const sec = sortedSec[0] || westSecurities[j % (westSecurities.length || 1)] || { position: { x: -78, z: -20 + (j % 5) * 5 }, name: `West Security ${(j % 5) + 1}`, id: `ws-${j}` };
    const sortedGates = westGates.length > 0
      ? westGates.slice().sort((a, b) => Math.abs(a.position.z - sec.position.z) - Math.abs(b.position.z - sec.position.z))
      : [];
    const gate = sortedGates[0] || westGates[j % (westGates.length || 1)] || { position: { x: -104, z: -20 + (j % 5) * 5 }, name: `West Gate ${(j % 5) + 1}`, id: `wg-${j}` };
    const exitChan = exitChannels[(j + 1) % (exitChannels.length || 1)] || { position: { x: -4, z: 54 }, name: 'West Dispersal Channel', id: `ec-w-${j}` };
    const exitGate = exitGates[(j + 1) % (exitGates.length || 1)] || { position: { x: -4, z: 72 }, name: 'West Exit Gate', id: `eg-w-${j}` };

    // 1. West Exterior Temple Approach & Gopuram Gateway
    waypoints.push({
      x: westGopuram.position.x - 10,
      z: westGopuram.position.z,
      zone: 'entrance',
      name: 'West Exterior Temple Approach',
    });
    waypoints.push({
      x: westGopuram.position.x,
      z: westGopuram.position.z,
      zone: 'entrance',
      name: 'West Entrance Gopuram (Pashchima Dvaram) Gateway Portal',
      componentId: westGopuram.id,
    });
    // Emerge through inner portal threshold into entry courtyard
    waypoints.push({
      x: westGopuram.position.x + 6,
      z: westGopuram.position.z,
      zone: 'entrance',
      name: 'West Gopuram Inner Gateway Threshold',
    });

    // 2. West Entry Plaza
    waypoints.push({
      x: -98,
      z: Math.round((westGopuram.position.z + (sec.position.z - westGopuram.position.z) * 0.4) * 10) / 10,
      zone: 'entrance',
      name: 'West Entry Plaza (Pravesha Courtyard)',
    });

    // 3. West Holding Bay (Circulation loop)
    waypoints.push({
      x: -90,
      z: sec.position.z,
      zone: 'holding',
      name: 'West Holding Circulation Bay',
    });
    waypoints.push({
      x: -84,
      z: sec.position.z,
      zone: 'holding',
      name: 'West Holding Release Gate',
    });

    // 4. West Security Screening Channel (Parallel DFMD)
    waypoints.push({
      x: sec.position.x,
      z: sec.position.z,
      zone: 'security',
      name: sec.name,
      componentId: sec.id,
    });

    // 5. West Switchback Queue Lane Egress into Convergence Funnel
    const laneZ = queueLane.position.z;
    waypoints.push({
      x: -66,
      z: laneZ,
      zone: 'queue',
      name: `${queueLane.name} Entry`,
      componentId: queueLane.id,
    });
    // 5. West Switchback Queue Egress (Entering the mouth of the V-shape convergence queue)
    waypoints.push({
      x: -35,
      z: laneZ,
      zone: 'queue',
      name: `${queueLane.name} Egress`,
      componentId: queueLane.id,
    });

    // 6. West 5-to-1 V-Shape Queue Convergence Pavilion (Covered)
    // Smooth convergence from the 5 parallel lane levels towards the single central neck
    const westMidZ = -10 + (laneZ - (-10)) * 0.45;
    const westNeckZ = -10 + (laneZ - (-10)) * 0.08;
    waypoints.push({
      x: -28,
      z: westMidZ,
      zone: 'queue',
      name: 'West V-Shape Convergence Arcade Mid-Span',
      headingAngle: Math.PI / 2,
    });
    waypoints.push({
      x: -21,
      z: westNeckZ,
      zone: 'queue',
      name: 'West V-Shape Convergence Throat',
      headingAngle: Math.PI / 2,
    });

    // 7. West Unified Darshan Merge Queue (Covered Single Line to Darshan)
    waypoints.push({
      x: -13,
      z: -10,
      zone: 'queue',
      name: 'West Unified Merge Queue (Covered Arcade Corridor)',
      headingAngle: Math.PI / 2,
    });
    waypoints.push({
      x: -4,
      z: -10,
      zone: 'queue',
      name: 'West Unified Merge Queue Terminal Portal',
      headingAngle: Math.PI / 2,
    });

    // 8. Central Main Gopuram Portal
    waypoints.push({
      x: 0,
      z: mainGopuram.position.z,
      zone: 'approach',
      name: 'Main Gopuram Gateway Portal',
      componentId: mainGopuram.id,
    });

    // 8. Central Darshan Sanctum
    waypoints.push({
      x: 0,
      z: -6,
      zone: 'darshan',
      name: 'Sri Ganesha Maha Garbhagriha (Darshan D3)',
      componentId: sanctum.id,
    });

    // 9. Sanctum South Egress Portal
    waypoints.push({
      x: 0,
      z: 6,
      zone: 'darshan',
      name: 'Maha Garbhagriha South Egress Portal',
    });

    // 10. Sacred South Promenade
    waypoints.push({
      x: 0,
      z: 14,
      zone: 'dispersal',
      name: 'Sacred South Dispersal Promenade',
    });

    // 11. Post-Darshan Dispersal Plaza
    waypoints.push({
      x: exitChan.position.x,
      z: plazaZ,
      zone: 'dispersal',
      name: 'Post-Darshan Dispersal & Prasad Plaza',
      componentId: dispersalPlaza.id,
    });

    // 10. South Dispersal Corridor
    waypoints.push({
      x: exitChan.position.x,
      z: exitChan.position.z,
      zone: 'exit',
      name: exitChan.name,
      componentId: exitChan.id,
    });

    // 11. South Exit Corridor Gate
    waypoints.push({
      x: exitGate.position.x,
      z: exitGate.position.z,
      zone: 'exit',
      name: exitGate.name,
      componentId: exitGate.id,
    });

    // 12. South Exit Gopuram & Exterior Egress
    waypoints.push({
      x: 0,
      z: southGopuram.position.z - 6,
      zone: 'exit',
      name: 'South Exit Courtyard Approach',
    });
    waypoints.push({
      x: 0,
      z: southGopuram.position.z,
      zone: 'exit',
      name: 'South Exit Gopuram (Dakshina Nirgamana Dvaram)',
      componentId: southGopuram.id,
    });
    waypoints.push({
      x: 0,
      z: southGopuram.position.z + 10,
      zone: 'exit',
      name: 'South Exterior Temple Grounds',
    });

    paths.push({
      id: pathIdx,
      name: `West Campus Stream - Lane ${j + 1}`,
      laneId: queueLane.id,
      stream: 'west',
      waypoints,
    });
  }

  // STREAM 3: EAST INCOMING STREAM (At least 5 lanes, expanding with new lanes)
  const numEastPaths = Math.max(5, eastQueues.length);
  for (let k = 0; k < numEastPaths; k++) {
    const pathIdx = numNorthPaths + numWestPaths + k;
    const waypoints = [];
    const queueLane = eastQueues[k] || { position: { x: 51, z: -20 + k * 5 }, dimensions: { length: 32 }, name: `East Queue ${k + 1}`, id: `eq-${k}` };
    const targetZ = queueLane.position?.z ?? 0;
    const sortedSec = eastSecurities.length > 0
      ? eastSecurities.slice().sort((a, b) => Math.abs(a.position.z - targetZ) - Math.abs(b.position.z - targetZ))
      : [];
    const sec = sortedSec[0] || eastSecurities[k % (eastSecurities.length || 1)] || { position: { x: 78, z: -20 + (k % 5) * 5 }, name: `East Security ${(k % 5) + 1}`, id: `es-${k}` };
    const sortedGates = eastGates.length > 0
      ? eastGates.slice().sort((a, b) => Math.abs(a.position.z - sec.position.z) - Math.abs(b.position.z - sec.position.z))
      : [];
    const gate = sortedGates[0] || eastGates[k % (eastGates.length || 1)] || { position: { x: 104, z: -20 + (k % 5) * 5 }, name: `East Gate ${(k % 5) + 1}`, id: `eg-${k}` };
    const exitChan = exitChannels[(k + 2) % (exitChannels.length || 1)] || { position: { x: 4, z: 54 }, name: 'East Dispersal Channel', id: `ec-e-${k}` };
    const exitGate = exitGates[(k + 2) % (exitGates.length || 1)] || { position: { x: 4, z: 72 }, name: 'East Exit Gate', id: `eg-e-${k}` };

    // 1. East Exterior Temple Approach & Gopuram Gateway
    waypoints.push({
      x: eastGopuram.position.x + 10,
      z: eastGopuram.position.z,
      zone: 'entrance',
      name: 'East Exterior Temple Approach',
    });
    waypoints.push({
      x: eastGopuram.position.x,
      z: eastGopuram.position.z,
      zone: 'entrance',
      name: 'East Entrance Gopuram (Purva Dvaram) Gateway Portal',
      componentId: eastGopuram.id,
    });
    // Emerge through inner portal threshold into entry courtyard
    waypoints.push({
      x: eastGopuram.position.x - 6,
      z: eastGopuram.position.z,
      zone: 'entrance',
      name: 'East Gopuram Inner Gateway Threshold',
    });

    // 2. East Entry Plaza
    waypoints.push({
      x: 98,
      z: Math.round((eastGopuram.position.z + (sec.position.z - eastGopuram.position.z) * 0.4) * 10) / 10,
      zone: 'entrance',
      name: 'East Entry Plaza (Pravesha Courtyard)',
    });

    // 3. East Holding Bay (Circulation loop)
    waypoints.push({
      x: 90,
      z: sec.position.z,
      zone: 'holding',
      name: 'East Holding Circulation Bay',
    });
    waypoints.push({
      x: 84,
      z: sec.position.z,
      zone: 'holding',
      name: 'East Holding Release Gate',
    });

    // 4. East Security Screening Channel (Parallel DFMD)
    waypoints.push({
      x: sec.position.x,
      z: sec.position.z,
      zone: 'security',
      name: sec.name,
      componentId: sec.id,
    });

    // 5. East Switchback Queue Lane
    const laneZ = queueLane.position.z;
    waypoints.push({
      x: 66,
      z: laneZ,
      zone: 'queue',
      name: `${queueLane.name} Entry`,
      componentId: queueLane.id,
    });
    // 5. East Switchback Queue Egress (Entering the mouth of the V-shape convergence queue)
    waypoints.push({
      x: 35,
      z: laneZ,
      zone: 'queue',
      name: `${queueLane.name} Egress`,
      componentId: queueLane.id,
    });

    // 6. East 5-to-1 V-Shape Queue Convergence Pavilion (Covered)
    // Smooth convergence from the 5 parallel lane levels towards the single central neck
    const eastMidZ = -10 + (laneZ - (-10)) * 0.45;
    const eastNeckZ = -10 + (laneZ - (-10)) * 0.08;
    waypoints.push({
      x: 28,
      z: eastMidZ,
      zone: 'queue',
      name: 'East V-Shape Convergence Arcade Mid-Span',
      headingAngle: -Math.PI / 2,
    });
    waypoints.push({
      x: 21,
      z: eastNeckZ,
      zone: 'queue',
      name: 'East V-Shape Convergence Throat',
      headingAngle: -Math.PI / 2,
    });

    // 7. East Unified Darshan Merge Queue (Covered Single Line to Darshan)
    waypoints.push({
      x: 13,
      z: -10,
      zone: 'queue',
      name: 'East Unified Merge Queue (Covered Arcade Corridor)',
      headingAngle: -Math.PI / 2,
    });
    waypoints.push({
      x: 4,
      z: -10,
      zone: 'queue',
      name: 'East Unified Merge Queue Terminal Portal',
      headingAngle: -Math.PI / 2,
    });

    // 8. Central Main Gopuram Portal
    waypoints.push({
      x: 0,
      z: mainGopuram.position.z,
      zone: 'approach',
      name: 'Main Gopuram Gateway Portal',
      componentId: mainGopuram.id,
    });

    // 8. Central Darshan Sanctum
    waypoints.push({
      x: 0,
      z: -6,
      zone: 'darshan',
      name: 'Sri Ganesha Maha Garbhagriha (Darshan D4)',
      componentId: sanctum.id,
    });

    // 9. Sanctum South Egress Portal
    waypoints.push({
      x: 0,
      z: 6,
      zone: 'darshan',
      name: 'Maha Garbhagriha South Egress Portal',
    });

    // 10. Sacred South Promenade
    waypoints.push({
      x: 0,
      z: 14,
      zone: 'dispersal',
      name: 'Sacred South Dispersal Promenade',
    });

    // 11. Post-Darshan Dispersal Plaza
    waypoints.push({
      x: exitChan.position.x,
      z: plazaZ,
      zone: 'dispersal',
      name: 'Post-Darshan Dispersal & Prasad Plaza',
      componentId: dispersalPlaza.id,
    });

    // 10. South Dispersal Corridor
    waypoints.push({
      x: exitChan.position.x,
      z: exitChan.position.z,
      zone: 'exit',
      name: exitChan.name,
      componentId: exitChan.id,
    });

    // 11. South Exit Corridor Gate
    waypoints.push({
      x: exitGate.position.x,
      z: exitGate.position.z,
      zone: 'exit',
      name: exitGate.name,
      componentId: exitGate.id,
    });

    // 12. South Exit Gopuram & Exterior Egress
    waypoints.push({
      x: 0,
      z: southGopuram.position.z - 6,
      zone: 'exit',
      name: 'South Exit Courtyard Approach',
    });
    waypoints.push({
      x: 0,
      z: southGopuram.position.z,
      zone: 'exit',
      name: 'South Exit Gopuram (Dakshina Nirgamana Dvaram)',
      componentId: southGopuram.id,
    });
    waypoints.push({
      x: 0,
      z: southGopuram.position.z + 10,
      zone: 'exit',
      name: 'South Exterior Temple Grounds',
    });

    paths.push({
      id: pathIdx,
      name: `East Campus Stream - Lane ${k + 1}`,
      laneId: queueLane.id,
      stream: 'east',
      waypoints,
    });
  }

  // DYNAMIC CROSS-STREAM DIVERSION PATHS FOR AI QUEUE NAVIGATION
  // Used by AI Queue Router when one entrance faces a crowd surge and dynamically navigates to less-crowded entrances
  const diversionBaseIdx = numNorthPaths + numWestPaths + numEastPaths;
  const BRIDGE_Y = 4.8; // Elevated Temple Overpass Deck Height (~4.5m clear headroom)

  // Diversion 1: North Entrance -> West Gopuram Queues (North-to-West Elevated Overpass)
  const nToWWaypoints = [
    { x: -22.0, z: -78.0, y: 0.0, zone: 'entrance', name: 'North Gate 1 Approach' },
    { x: -26.0, z: -78.0, y: 0.0, zone: 'entrance', name: 'Westbound Overpass Ground Landing Pad' },
    { x: -27.6, z: -78.0, y: 0.0, zone: 'approach', name: 'Westbound Overpass Ascent Stairs Base' },
    { x: -33.0, z: -78.0, y: 2.4, zone: 'approach', name: 'Westbound Overpass Mid-Stair Ascent' },
    { x: -38.52, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'Westbound Overpass Top Landing Crest' },
    { x: -40.12, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'Westbound Elevated Walkway Deck' },
    { x: -65.0, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'North-West Elevated Bridge Colonnade' },
    { x: -90.0, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'Elevated Overpass Corner Junction Platform' },
    { x: -90.0, z: -60.0, y: BRIDGE_Y, zone: 'approach', name: 'West Perimeter Elevated Skybridge Deck' },
    { x: -90.0, z: -44.0, y: BRIDGE_Y, zone: 'approach', name: 'West Skybridge Top Landing' },
    { x: -90.0, z: -42.40, y: BRIDGE_Y, zone: 'approach', name: 'West Skybridge Descent Stairs Crest' },
    { x: -90.0, z: -37.0, y: 2.4, zone: 'approach', name: 'West Skybridge Mid-Stair Descent' },
    { x: -90.0, z: -31.48, y: 0.0, zone: 'approach', name: 'West Skybridge Descent Stairs Base' },
    { x: -90.0, z: -29.88, y: 0.0, zone: 'security', name: 'West Overpass Ground Landing Pad' },
    { x: -84.0, z: -25.0, y: 0.0, zone: 'security', name: 'West Security Arrival Plaza' },
    { x: -66.0, z: -20.0, y: 0.0, zone: 'queue', name: 'West Switchback Queue Entry' },
    { x: -35.0, z: -20.0, y: 0.0, zone: 'queue', name: 'West Switchback Queue Egress' },
    { x: -28.0, z: -15.0, y: 0.0, zone: 'queue', name: 'West V-Shape Convergence Arcade' },
    { x: -21.0, z: -10.0, y: 0.0, zone: 'queue', name: 'West V-Shape Convergence Throat' },
    { x: -13.0, z: -10.0, y: 0.0, zone: 'queue', name: 'West Unified Merge Queue (Covered Arcade)' },
    { x: -4.0, z: -10.0, y: 0.0, zone: 'queue', name: 'West Unified Merge Queue Portal' },
    { x: 0, z: mainGopuram.position.z, y: 0, zone: 'approach', name: 'Main Gopuram Gateway Portal' },
    { x: 0, z: -6, y: 0, zone: 'darshan', name: 'Sri Ganesha Maha Garbhagriha' },
    { x: 0, z: 6, y: 0, zone: 'darshan', name: 'Maha Garbhagriha South Egress Portal' },
    { x: 0, z: 14, y: 0, zone: 'dispersal', name: 'Sacred South Dispersal Promenade' },
    { x: -4, z: plazaZ, y: 0, zone: 'dispersal', name: 'Post-Darshan Dispersal Plaza' },
    { x: -4, z: 54, y: 0, zone: 'exit', name: 'South Dispersal Channel' },
    { x: 0, z: southGopuram.position.z, y: 0, zone: 'exit', name: 'South Exit Gopuram' },
  ];

  // Diversion 2: North Entrance -> East Gopuram Queues (North-to-East Elevated Overpass)
  const nToEWaypoints = [
    { x: 22.0, z: -78.0, y: 0.0, zone: 'entrance', name: 'North Gate 6 Approach' },
    { x: 26.0, z: -78.0, y: 0.0, zone: 'entrance', name: 'Eastbound Overpass Ground Landing Pad' },
    { x: 27.6, z: -78.0, y: 0.0, zone: 'approach', name: 'Eastbound Overpass Ascent Stairs Base' },
    { x: 33.0, z: -78.0, y: 2.4, zone: 'approach', name: 'Eastbound Overpass Mid-Stair Ascent' },
    { x: 38.52, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'Eastbound Overpass Top Landing Crest' },
    { x: 40.12, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'Eastbound Elevated Walkway Deck' },
    { x: 65.0, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'North-East Elevated Bridge Colonnade' },
    { x: 90.0, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'Elevated Overpass Corner Junction Platform' },
    { x: 90.0, z: -60.0, y: BRIDGE_Y, zone: 'approach', name: 'East Perimeter Elevated Skybridge Deck' },
    { x: 90.0, z: -44.0, y: BRIDGE_Y, zone: 'approach', name: 'East Skybridge Top Landing' },
    { x: 90.0, z: -42.40, y: BRIDGE_Y, zone: 'approach', name: 'East Skybridge Descent Stairs Crest' },
    { x: 90.0, z: -37.0, y: 2.4, zone: 'approach', name: 'East Skybridge Mid-Stair Descent' },
    { x: 90.0, z: -31.48, y: 0.0, zone: 'approach', name: 'East Skybridge Descent Stairs Base' },
    { x: 90.0, z: -29.88, y: 0.0, zone: 'security', name: 'East Overpass Ground Landing Pad' },
    { x: 84.0, z: -25.0, y: 0.0, zone: 'security', name: 'East Security Arrival Plaza' },
    { x: 66.0, z: -20.0, y: 0.0, zone: 'queue', name: 'East Switchback Queue Entry' },
    { x: 35.0, z: -20.0, y: 0.0, zone: 'queue', name: 'East Switchback Queue Egress' },
    { x: 28.0, z: -15.0, y: 0.0, zone: 'queue', name: 'East V-Shape Convergence Arcade' },
    { x: 21.0, z: -10.0, y: 0.0, zone: 'queue', name: 'East V-Shape Convergence Throat' },
    { x: 13.0, z: -10.0, y: 0.0, zone: 'queue', name: 'East Unified Merge Queue (Covered Arcade)' },
    { x: 4.0, z: -10.0, y: 0.0, zone: 'queue', name: 'East Unified Merge Queue Portal' },
    { x: 0, z: mainGopuram.position.z, y: 0, zone: 'approach', name: 'Main Gopuram Gateway Portal' },
    { x: 0, z: -6, y: 0, zone: 'darshan', name: 'Sri Ganesha Maha Garbhagriha' },
    { x: 0, z: 6, y: 0, zone: 'darshan', name: 'Maha Garbhagriha South Egress Portal' },
    { x: 0, z: 14, y: 0, zone: 'dispersal', name: 'Sacred South Dispersal Promenade' },
    { x: 4, z: plazaZ, y: 0, zone: 'dispersal', name: 'Post-Darshan Dispersal Plaza' },
    { x: 4, z: 54, y: 0, zone: 'exit', name: 'South Dispersal Channel' },
    { x: 0, z: southGopuram.position.z, y: 0, zone: 'exit', name: 'South Exit Gopuram' },
  ];

  // Diversion 3: West Entrance -> North Queues (Via Uttara-Pashchima Setu Overpass)
  const wToNWaypoints = [
    { x: -84.0, z: -25.0, y: 0.0, zone: 'entrance', name: 'West Security Arrival Plaza' },
    { x: -90.0, z: -29.88, y: 0.0, zone: 'entrance', name: 'West Overpass Ground Landing Pad' },
    { x: -90.0, z: -31.48, y: 0.0, zone: 'approach', name: 'West Overpass Ascent Stairs Base' },
    { x: -90.0, z: -37.0, y: 2.4, zone: 'approach', name: 'West Overpass Mid-Stair Ascent' },
    { x: -90.0, z: -42.40, y: BRIDGE_Y, zone: 'approach', name: 'West Overpass Top Landing Crest' },
    { x: -90.0, z: -44.0, y: BRIDGE_Y, zone: 'approach', name: 'West Skybridge Deck' },
    { x: -90.0, z: -60.0, y: BRIDGE_Y, zone: 'approach', name: 'West Perimeter Elevated Skybridge' },
    { x: -90.0, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'Corner Transition Platform' },
    { x: -65.0, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'North-West Elevated Bridge Colonnade' },
    { x: -40.12, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'North Skybridge Top Landing' },
    { x: -38.52, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'North Skybridge Descent Stairs Crest' },
    { x: -33.0, z: -78.0, y: 2.4, zone: 'approach', name: 'North Skybridge Mid-Stair Descent' },
    { x: -27.6, z: -78.0, y: 0.0, zone: 'approach', name: 'North Skybridge Descent Stairs Base' },
    { x: -26.0, z: -78.0, y: 0.0, zone: 'approach', name: 'North Overpass Ground Landing Pad' },
    { x: -22.0, z: -78.0, y: 0.0, zone: 'approach', name: 'North Arrival Plaza' },
    { x: -20, z: -55, y: 0, zone: 'security', name: 'North Security (AI Diverted)' },
    { x: -24, z: -46, y: 0, zone: 'queue', name: 'North Free Courtyard Queue Entry' },
    { x: -24, z: -24, y: 0, zone: 'queue', name: 'North Free Courtyard Queue Exit' },
    { x: -8, z: -19, y: 0, zone: 'queue', name: 'North Convergence Funnel Chute' },
    { x: 0, z: -16, y: 0, zone: 'queue', name: 'North Central Unified Darshan Spine' },
    { x: 0, z: mainGopuram.position.z, y: 0, zone: 'approach', name: 'Main Gopuram Gateway Portal' },
    { x: 0, z: -6, y: 0, zone: 'darshan', name: 'Sri Ganesha Maha Garbhagriha' },
    { x: 0, z: 6, y: 0, zone: 'darshan', name: 'Maha Garbhagriha South Egress Portal' },
    { x: 0, z: 14, y: 0, zone: 'dispersal', name: 'Sacred South Dispersal Promenade' },
    { x: 0, z: plazaZ, y: 0, zone: 'dispersal', name: 'Post-Darshan Dispersal Plaza' },
    { x: 0, z: southGopuram.position.z, y: 0, zone: 'exit', name: 'South Exit Gopuram' },
  ];

  // Diversion 4: East Entrance -> North Queues (Via Uttara-Purva Setu Overpass)
  const eToNWaypoints = [
    { x: 84.0, z: -25.0, y: 0.0, zone: 'entrance', name: 'East Security Arrival Plaza' },
    { x: 90.0, z: -29.88, y: 0.0, zone: 'entrance', name: 'East Overpass Ground Landing Pad' },
    { x: 90.0, z: -31.48, y: 0.0, zone: 'approach', name: 'East Overpass Ascent Stairs Base' },
    { x: 90.0, z: -37.0, y: 2.4, zone: 'approach', name: 'East Overpass Mid-Stair Ascent' },
    { x: 90.0, z: -42.40, y: BRIDGE_Y, zone: 'approach', name: 'East Overpass Top Landing Crest' },
    { x: 90.0, z: -44.0, y: BRIDGE_Y, zone: 'approach', name: 'East Skybridge Deck' },
    { x: 90.0, z: -60.0, y: BRIDGE_Y, zone: 'approach', name: 'East Perimeter Elevated Skybridge' },
    { x: 90.0, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'East Corner Transition Platform' },
    { x: 65.0, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'North-East Elevated Bridge Colonnade' },
    { x: 40.12, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'North-East Skybridge Top Landing' },
    { x: 38.52, z: -78.0, y: BRIDGE_Y, zone: 'approach', name: 'North-East Skybridge Descent Stairs Crest' },
    { x: 33.0, z: -78.0, y: 2.4, zone: 'approach', name: 'North-East Skybridge Mid-Stair Descent' },
    { x: 27.6, z: -78.0, y: 0.0, zone: 'approach', name: 'North-East Skybridge Descent Stairs Base' },
    { x: 26.0, z: -78.0, y: 0.0, zone: 'approach', name: 'North-East Overpass Ground Landing Pad' },
    { x: 22.0, z: -78.0, y: 0.0, zone: 'approach', name: 'North Arrival Plaza' },
    { x: 20, z: -55, y: 0, zone: 'security', name: 'North Security (AI Diverted)' },
    { x: 24, z: -46, y: 0, zone: 'queue', name: 'North Free Courtyard Queue Entry' },
    { x: 24, z: -24, y: 0, zone: 'queue', name: 'North Free Courtyard Queue Exit' },
    { x: 8, z: -19, y: 0, zone: 'queue', name: 'North Convergence Funnel Chute' },
    { x: 0, z: -16, y: 0, zone: 'queue', name: 'North Central Unified Darshan Spine' },
    { x: 0, z: mainGopuram.position.z, y: 0, zone: 'approach', name: 'Main Gopuram Gateway Portal' },
    { x: 0, z: -6, y: 0, zone: 'darshan', name: 'Sri Ganesha Maha Garbhagriha' },
    { x: 0, z: 6, y: 0, zone: 'darshan', name: 'Maha Garbhagriha South Egress Portal' },
    { x: 0, z: 14, y: 0, zone: 'dispersal', name: 'Sacred South Dispersal Promenade' },
    { x: 0, z: plazaZ, y: 0, zone: 'dispersal', name: 'Post-Darshan Dispersal Plaza' },
    { x: 0, z: southGopuram.position.z, y: 0, zone: 'exit', name: 'South Exit Gopuram' },
  ];

  const diversionPaths = [
    {
      id: diversionBaseIdx,
      name: 'AI Cross-Stream Diversion (North → West)',
      stream: 'north',
      targetStream: 'west',
      isDiversion: true,
      laneId: 'diversion-n-to-w',
      waypoints: nToWWaypoints,
    },
    {
      id: diversionBaseIdx + 1,
      name: 'AI Cross-Stream Diversion (North → East)',
      stream: 'north',
      targetStream: 'east',
      isDiversion: true,
      laneId: 'diversion-n-to-e',
      waypoints: nToEWaypoints,
    },
    {
      id: diversionBaseIdx + 2,
      name: 'AI Cross-Stream Diversion (West → North)',
      stream: 'west',
      targetStream: 'north',
      isDiversion: true,
      laneId: 'diversion-w-to-n',
      waypoints: wToNWaypoints,
    },
    {
      id: diversionBaseIdx + 3,
      name: 'AI Cross-Stream Diversion (East → North)',
      stream: 'east',
      targetStream: 'north',
      isDiversion: true,
      laneId: 'diversion-e-to-n',
      waypoints: eToNWaypoints,
    },
  ];

  paths.diversionPaths = diversionPaths;
  paths.allPaths = [...paths, ...diversionPaths];

  return paths;
}
