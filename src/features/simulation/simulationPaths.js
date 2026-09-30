/**
 * DevaSetu Crowd Flow Simulation Path Generator
 * Deterministically constructs continuous traversal waypoints from the current Scene JSON:
 * ENTRANCE -> SECURITY -> QUEUE LANES -> DARSHAN -> EXIT
 * Supports Parallel, Serpentine, U-Shape, Split, and custom manual layouts.
 */

import { COMPONENT_TYPES } from '../../utils/componentDefaults.js';

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
  if (
    components.some(
      (c) =>
        c.role === 'north-gopuram' ||
        c.role === 'south-gopuram' ||
        c.role === 'west-gopuram' ||
        c.role === 'east-gopuram' ||
        c.properties?.pattern === 'switchback' ||
        (c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM &&
          components.filter((k) => k.type === COMPONENT_TYPES.ENTRANCE_GOPURAM).length >= 2)
    )
  ) {
    return 'campus';
  }

  if (queues.length === 0) return 'parallel';

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

    // Approach point into this lane
    waypoints.push({
      x: startX - 1.0,
      z: laneZ,
      zone: 'approach',
      name: `${lane.name} Entry`,
    });

    // Lane body waypoints
    waypoints.push({
      x: startX,
      z: laneZ,
      zone: 'queue',
      name: `${lane.name} Start`,
      componentId: lane.id,
    });
    waypoints.push({
      x: endX,
      z: laneZ,
      zone: 'queue',
      name: `${lane.name} End`,
      componentId: lane.id,
    });

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
      waypoints,
    });
  });

  return paths;
}

/**
 * Builds continuous serpentine zigzag path through all segments
 */
function buildSerpentinePath(queues, entrancePt, securityPt, darshanPt, exitPt, mainGopuram) {
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
      waypoints,
    },
  ];
}

/**
 * Builds continuous U-shape traversal path (Leg 1 -> Turn -> Leg 2)
 */
function buildUShapePath(queues, entrancePt, securityPt, darshanPt, exitPt, mainGopuram) {
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

    waypoints.push({
      x: startX - 1.0,
      z: branchZ,
      zone: 'approach',
      name: `Branch ${String.fromCharCode(65 + index)} Split Point`,
    });

    waypoints.push({
      x: startX,
      z: branchZ,
      zone: 'queue',
      name: `Branch ${String.fromCharCode(65 + index)} Start`,
      componentId: branch.id,
    });

    waypoints.push({
      x: endX,
      z: branchZ,
      zone: 'queue',
      name: `Branch ${String.fromCharCode(65 + index)} End`,
      componentId: branch.id,
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

    paths.push({
      id: index,
      name: `Split Branch ${String.fromCharCode(65 + index)}`,
      laneId: branch.id,
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

  // Gates & security
  const northGates = components.filter((c) => c.role === 'arrival-gate-north').sort((a, b) => a.position.x - b.position.x);
  const northSecurities = components.filter((c) => c.properties?.zone === 'A' && c.type === COMPONENT_TYPES.SECURITY).sort((a, b) => a.position.x - b.position.x);
  const northQueues = components.filter((c) => c.properties?.zone === 'A' && c.type === COMPONENT_TYPES.QUEUE).sort((a, b) => a.position.z - b.position.z);

  const westGates = components.filter((c) => c.role === 'arrival-gate-west').sort((a, b) => a.position.z - b.position.z);
  const westSecurities = components.filter((c) => c.properties?.zone === 'B' && c.type === COMPONENT_TYPES.SECURITY).sort((a, b) => a.position.z - b.position.z);
  const westQueues = components.filter((c) => c.properties?.zone === 'B' && c.type === COMPONENT_TYPES.QUEUE).sort((a, b) => a.position.z - b.position.z);

  const eastGates = components.filter((c) => c.role === 'arrival-gate-east').sort((a, b) => a.position.z - b.position.z);
  const eastSecurities = components.filter((c) => c.properties?.zone === 'C' && c.type === COMPONENT_TYPES.SECURITY).sort((a, b) => a.position.z - b.position.z);
  const eastQueues = components.filter((c) => c.properties?.zone === 'C' && c.type === COMPONENT_TYPES.QUEUE).sort((a, b) => a.position.z - b.position.z);

  const dispersalPlaza = components.find((c) => c.role === 'post-darshan-plaza') || { position: { x: 0, z: 22 }, id: 'plaza-fallback' };
  const exitChannels = components.filter((c) => c.properties?.zone === 'G' && c.type === COMPONENT_TYPES.QUEUE).sort((a, b) => a.position.x - b.position.x);
  const exitGates = components.filter((c) => c.type === COMPONENT_TYPES.EXIT).sort((a, b) => a.position.x - b.position.x);

  const plazaZ = dispersalPlaza.position.z;

  // STREAM 1: NORTH INCOMING STREAM (6 LANES, Paths 0..5)
  for (let i = 0; i < 6; i++) {
    const waypoints = [];
    const gate = northGates[i] || { position: { x: -25 + i * 10, z: -74 }, name: `North Gate ${i + 1}`, id: `ng-${i}` };
    const sec = northSecurities[i] || { position: { x: -20 + i * 8, z: -55 }, name: `North Security ${i + 1}`, id: `ns-${i}` };
    const queueLane = northQueues[i] || { position: { x: 0, z: -46 + i * 5 }, dimensions: { length: 56 }, name: `North Queue ${i + 1}`, id: `nq-${i}` };
    const exitChan = exitChannels[i % (exitChannels.length || 1)] || { position: { x: -12 + (i % 4) * 8, z: 54 }, name: `Exit Channel ${i + 1}`, id: `ec-${i}` };
    const exitGate = exitGates[i % (exitGates.length || 1)] || { position: { x: -12 + (i % 4) * 8, z: 72 }, name: `Exit Gate ${i + 1}`, id: `eg-${i}` };

    // 1. North Gopuram Primary Entrance
    waypoints.push({
      x: 0,
      z: northGopuram.position.z,
      zone: 'entrance',
      name: 'North Entrance Gopuram (Uttara Raja Dvaram)',
      componentId: northGopuram.id,
    });

    // 2. North Arrival Gate
    waypoints.push({
      x: gate.position.x,
      z: gate.position.z,
      zone: 'entrance',
      name: gate.name,
      componentId: gate.id,
    });

    // 3. North Holding Bay (Circulation loop)
    waypoints.push({
      x: gate.position.x * 0.6,
      z: -68,
      zone: 'holding',
      name: 'North Holding Circulation Bay',
    });
    waypoints.push({
      x: sec.position.x,
      z: -62,
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

    // 5. Approach into North Serpentine Queue Lane
    const laneZ = queueLane.position.z;
    const laneL = queueLane.dimensions?.length || 56;
    const halfL = laneL / 2 - 2;
    const dirEast = i % 2 === 0;

    waypoints.push({
      x: sec.position.x,
      z: laneZ,
      zone: 'approach',
      name: `${queueLane.name} Entry`,
    });

    if (dirEast) {
      waypoints.push({
        x: -halfL,
        z: laneZ,
        zone: 'queue',
        name: `${queueLane.name} West Apex`,
        componentId: queueLane.id,
      });
      waypoints.push({
        x: halfL,
        z: laneZ,
        zone: 'queue',
        name: `${queueLane.name} East Apex`,
        componentId: queueLane.id,
      });
      // Smooth corner apex turn
      waypoints.push({
        x: halfL + 1.2,
        z: laneZ + 2.0,
        zone: 'queue',
        name: `${queueLane.name} Turn Apex`,
      });
    } else {
      waypoints.push({
        x: halfL,
        z: laneZ,
        zone: 'queue',
        name: `${queueLane.name} East Apex`,
        componentId: queueLane.id,
      });
      waypoints.push({
        x: -halfL,
        z: laneZ,
        zone: 'queue',
        name: `${queueLane.name} West Apex`,
        componentId: queueLane.id,
      });
      // Smooth corner apex turn
      waypoints.push({
        x: -halfL - 1.2,
        z: laneZ + 2.0,
        zone: 'queue',
        name: `${queueLane.name} Turn Apex`,
      });
    }

    // 6. Central Forecourt Radial / Fan Approach Corridor (Zone D)
    const radialX = i < 3 ? -6 + i * 2 : -1 + (i - 3) * 2;
    waypoints.push({
      x: radialX,
      z: -14,
      zone: 'approach',
      name: `Radial Approach Channel D${(i % 2) + 1}`,
    });

    // 7. Central Main Gopuram Portal
    waypoints.push({
      x: 0,
      z: mainGopuram.position.z,
      zone: 'approach',
      name: 'Main Gopuram Gateway Portal',
      componentId: mainGopuram.id,
    });

    // 8. Central Darshan Sanctum (Garbhagriha)
    waypoints.push({
      x: radialX * 0.8,
      z: sanctum.position.z + 6,
      zone: 'darshan',
      name: 'Sri Ganesha Maha Garbhagriha Viewing Corridor',
      componentId: sanctum.id,
    });

    // 9. Post-Darshan Dispersal Plaza (Zone F)
    waypoints.push({
      x: -15 + i * 6,
      z: plazaZ,
      zone: 'dispersal',
      name: 'Post-Darshan Dispersal & Prasad Plaza',
      componentId: dispersalPlaza.id,
    });

    // 10. South Dispersal Corridor (Zone G)
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

    // 12. South Exit Gopuram
    waypoints.push({
      x: 0,
      z: southGopuram.position.z,
      zone: 'exit',
      name: 'South Exit Gopuram (Dakshina Nirgamana Dvaram)',
      componentId: southGopuram.id,
    });

    paths.push({
      id: i,
      name: `North Campus Stream - Lane ${i + 1}`,
      laneId: queueLane.id,
      stream: 'north',
      waypoints,
    });
  }

  // STREAM 2: WEST INCOMING STREAM (5 LANES, Paths 6..10)
  for (let j = 0; j < 5; j++) {
    const pathIdx = 6 + j;
    const waypoints = [];
    const gate = westGates[j % (westGates.length || 1)] || { position: { x: -104, z: -20 + j * 5 }, name: `West Gate ${j + 1}`, id: `wg-${j}` };
    const sec = westSecurities[j % (westSecurities.length || 1)] || { position: { x: -78, z: -20 + j * 5 }, name: `West Security ${j + 1}`, id: `ws-${j}` };
    const queueLane = westQueues[j % (westQueues.length || 1)] || { position: { x: -51, z: -20 + j * 5 }, dimensions: { length: 32 }, name: `West Queue ${j + 1}`, id: `wq-${j}` };
    const exitChan = exitChannels[(j + 1) % (exitChannels.length || 1)] || { position: { x: -4, z: 54 }, name: 'West Dispersal Channel', id: `ec-w-${j}` };
    const exitGate = exitGates[(j + 1) % (exitGates.length || 1)] || { position: { x: -4, z: 72 }, name: 'West Exit Gate', id: `eg-w-${j}` };

    // 1. West Gopuram Secondary Entrance
    waypoints.push({
      x: westGopuram.position.x,
      z: westGopuram.position.z,
      zone: 'entrance',
      name: 'West Entrance Gopuram (Pashchima Dvaram)',
      componentId: westGopuram.id,
    });

    // 2. West Arrival Gate
    waypoints.push({
      x: gate.position.x,
      z: gate.position.z,
      zone: 'entrance',
      name: gate.name,
      componentId: gate.id,
    });

    // 3. West Holding Bay (Circulation loop)
    waypoints.push({
      x: -92,
      z: gate.position.z,
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

    // 5. West Switchback Queue Lane
    const laneZ = queueLane.position.z;
    waypoints.push({
      x: -66,
      z: laneZ,
      zone: 'queue',
      name: `${queueLane.name} Entry`,
      componentId: queueLane.id,
    });
    waypoints.push({
      x: -36,
      z: laneZ,
      zone: 'queue',
      name: `${queueLane.name} Egress`,
      componentId: queueLane.id,
    });

    // 6. Central Forecourt Radial / Fan Approach Corridor (Zone D - West approach)
    waypoints.push({
      x: -16,
      z: -10,
      zone: 'approach',
      name: 'Radial Approach Corridor D3 (West Stream)',
    });
    waypoints.push({
      x: -3,
      z: -12,
      zone: 'approach',
      name: 'Central Forecourt Convergence D3',
    });

    // 7. Central Main Gopuram Portal
    waypoints.push({
      x: 0,
      z: mainGopuram.position.z,
      zone: 'approach',
      name: 'Main Gopuram Gateway Portal',
      componentId: mainGopuram.id,
    });

    // 8. Central Darshan Sanctum
    waypoints.push({
      x: 2,
      z: sanctum.position.z + 6,
      zone: 'darshan',
      name: 'Sri Ganesha Maha Garbhagriha (Darshan D3)',
      componentId: sanctum.id,
    });

    // 9. Post-Darshan Dispersal Plaza
    waypoints.push({
      x: -18 + j * 7,
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

    // 12. South Exit Gopuram
    waypoints.push({
      x: 0,
      z: southGopuram.position.z,
      zone: 'exit',
      name: 'South Exit Gopuram (Dakshina Nirgamana Dvaram)',
      componentId: southGopuram.id,
    });

    paths.push({
      id: pathIdx,
      name: `West Campus Stream - Lane ${j + 1}`,
      laneId: queueLane.id,
      stream: 'west',
      waypoints,
    });
  }

  // STREAM 3: EAST INCOMING STREAM (5 LANES, Paths 11..15)
  for (let k = 0; k < 5; k++) {
    const pathIdx = 11 + k;
    const waypoints = [];
    const gate = eastGates[k % (eastGates.length || 1)] || { position: { x: 104, z: -20 + k * 5 }, name: `East Gate ${k + 1}`, id: `eg-${k}` };
    const sec = eastSecurities[k % (eastSecurities.length || 1)] || { position: { x: 78, z: -20 + k * 5 }, name: `East Security ${k + 1}`, id: `es-${k}` };
    const queueLane = eastQueues[k % (eastQueues.length || 1)] || { position: { x: 51, z: -20 + k * 5 }, dimensions: { length: 32 }, name: `East Queue ${k + 1}`, id: `eq-${k}` };
    const exitChan = exitChannels[(k + 2) % (exitChannels.length || 1)] || { position: { x: 4, z: 54 }, name: 'East Dispersal Channel', id: `ec-e-${k}` };
    const exitGate = exitGates[(k + 2) % (exitGates.length || 1)] || { position: { x: 4, z: 72 }, name: 'East Exit Gate', id: `eg-e-${k}` };

    // 1. East Gopuram Secondary Entrance
    waypoints.push({
      x: eastGopuram.position.x,
      z: eastGopuram.position.z,
      zone: 'entrance',
      name: 'East Entrance Gopuram (Purva Dvaram)',
      componentId: eastGopuram.id,
    });

    // 2. East Arrival Gate
    waypoints.push({
      x: gate.position.x,
      z: gate.position.z,
      zone: 'entrance',
      name: gate.name,
      componentId: gate.id,
    });

    // 3. East Holding Bay (Circulation loop)
    waypoints.push({
      x: 92,
      z: gate.position.z,
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
    waypoints.push({
      x: 36,
      z: laneZ,
      zone: 'queue',
      name: `${queueLane.name} Egress`,
      componentId: queueLane.id,
    });

    // 6. Central Forecourt Radial / Fan Approach Corridor (Zone D - East approach)
    waypoints.push({
      x: 16,
      z: -10,
      zone: 'approach',
      name: 'Radial Approach Corridor D4 (East Stream)',
    });
    waypoints.push({
      x: 3,
      z: -12,
      zone: 'approach',
      name: 'Central Forecourt Convergence D4',
    });

    // 7. Central Main Gopuram Portal
    waypoints.push({
      x: 0,
      z: mainGopuram.position.z,
      zone: 'approach',
      name: 'Main Gopuram Gateway Portal',
      componentId: mainGopuram.id,
    });

    // 8. Central Darshan Sanctum
    waypoints.push({
      x: 6,
      z: sanctum.position.z + 6,
      zone: 'darshan',
      name: 'Sri Ganesha Maha Garbhagriha (Darshan D4)',
      componentId: sanctum.id,
    });

    // 9. Post-Darshan Dispersal Plaza
    waypoints.push({
      x: 5 + k * 7,
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

    // 12. South Exit Gopuram
    waypoints.push({
      x: 0,
      z: southGopuram.position.z,
      zone: 'exit',
      name: 'South Exit Gopuram (Dakshina Nirgamana Dvaram)',
      componentId: southGopuram.id,
    });

    paths.push({
      id: pathIdx,
      name: `East Campus Stream - Lane ${k + 1}`,
      laneId: queueLane.id,
      stream: 'east',
      waypoints,
    });
  }

  return paths;
}
