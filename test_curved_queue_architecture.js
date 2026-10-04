import {
  getQueuePathGeometry,
  QUEUE_SHAPES,
  dist2D,
} from './src/services/layout/queuePathGeometry.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { calculateQueueCapacity } from './src/services/layout/capacityCalculator.js';
import { getComponentAABB } from './src/services/layout/coordinateSystem.js';

console.log('========================================================================');
console.log(' DevaSetu Path-Based Curved Queue Architecture Test Suite               ');
console.log('========================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// 1. GEOMETRY GENERATOR TESTS (ALL 8 SHAPES)
// -----------------------------------------------------------------------------
console.log('--- TEST 1: All 8 Shape Generators produce valid points, tangents & offsets ---');

const shapes = [
  {
    name: 'straight',
    pathData: { type: 'straight' },
    dimensions: { length: 20, width: 2 },
  },
  {
    name: 'arc',
    pathData: {
      type: 'arc',
      params: { radius: 15, startAngle: -45, endAngle: 45 },
    },
    dimensions: { width: 2 },
  },
  {
    name: 'bezier',
    pathData: {
      type: 'bezier',
      controlPoints: [
        { x: -10, z: 0 },
        { x: -3, z: 8 },
        { x: 3, z: -8 },
        { x: 10, z: 0 },
      ],
    },
    dimensions: { width: 2 },
  },
  {
    name: 'polyline',
    pathData: {
      type: 'polyline',
      controlPoints: [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        { x: 10, z: 10 },
        { x: 20, z: 10 },
      ],
    },
    dimensions: { width: 2 },
  },
  {
    name: 'u_shape',
    pathData: {
      type: 'u_shape',
      params: { length: 15, width: 6, turnRadius: 3 },
    },
    dimensions: { width: 2 },
  },
  {
    name: 's_shape',
    pathData: {
      type: 's_shape',
      params: { length: 25, amplitude: 5, cycles: 1 },
    },
    dimensions: { width: 2 },
  },
  {
    name: 'serpentine',
    pathData: {
      type: 'serpentine',
      params: { rows: 4, rowLength: 20, spacing: 3, turnRadius: 1.5 },
    },
    dimensions: { width: 2 },
  },
  {
    name: 'radial',
    pathData: {
      type: 'radial',
      params: { innerRadius: 10, outerRadius: 25, sweepAngle: 60, direction: 1 },
    },
    dimensions: { width: 2 },
  },
];

for (const s of shapes) {
  const comp = {
    id: `queue-${s.name}`,
    type: 'queue',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: s.dimensions || { length: 20, width: 2, height: 1 },
    properties: { pathData: s.pathData },
  };

  const geom = getQueuePathGeometry(comp, 0.85);

  assert(geom.points.length >= 2, `${s.name.toUpperCase()} has ${geom.points.length} sampled points`);
  assert(geom.totalLength > 0, `${s.name.toUpperCase()} has non-zero length: ${geom.totalLength.toFixed(2)}m`);
  assert(geom.worldPoints.length === geom.points.length, `${s.name.toUpperCase()} has matching world points`);
  assert(geom.leftRailPoints.length === geom.points.length, `${s.name.toUpperCase()} has matching left rail offsets`);
  assert(geom.rightRailPoints.length === geom.points.length, `${s.name.toUpperCase()} has matching right rail offsets`);

  // Verify pure {x, z} objects (never Three.js Vector3 in data)
  const isPlainObj = geom.worldPoints.every((pt) => typeof pt.x === 'number' && typeof pt.z === 'number' && !pt.isVector3);
  assert(isPlainObj, `${s.name.toUpperCase()} points are pure JSON-safe {x, z} objects`);
}

// -----------------------------------------------------------------------------
// 2. SAMPLING DENSITY & INTERVAL VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Sampling density conforms to 0.75m–1.0m intervals ---');
{
  const arcComp = {
    id: 'test-arc-density',
    type: 'queue',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 2 },
    properties: {
      pathData: {
        type: 'arc',
        params: { radius: 20, startAngle: 0, endAngle: 90 }, // Quarter circle: ~31.4m
      },
    },
  };
  const geom = getQueuePathGeometry(arcComp, 0.85);
  const expectedLength = (Math.PI / 2) * 20; // 31.415m
  const diff = Math.abs(geom.totalLength - expectedLength);
  assert(diff < 0.2, `Arc length (${geom.totalLength.toFixed(2)}m) matches theoretical quarter circle (${expectedLength.toFixed(2)}m)`);

  let maxStep = 0;
  for (let i = 1; i < geom.points.length; i++) {
    const dx = geom.points[i].x - geom.points[i - 1].x;
    const dz = geom.points[i].z - geom.points[i - 1].z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > maxStep) maxStep = dist;
  }
  assert(maxStep <= 1.05, `Max sample step is within reasonable bounds (~${maxStep.toFixed(2)}m <= 1.05m)`);
}

// -----------------------------------------------------------------------------
// 3. BACKWARD COMPATIBILITY: LEGACY QUEUES WITHOUT pathData
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: Backward compatibility for legacy queues without pathData ---');
{
  const legacyComp = {
    id: 'queue-legacy-straight',
    type: 'queue',
    position: { x: 10, y: 0, z: 25 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    dimensions: { length: 30, width: 2.5, height: 1.1 },
    properties: {
      // No pathData!
      pattern: 'straight',
      lanes: 1,
    },
  };

  const geom = getQueuePathGeometry(legacyComp);
  assert(geom !== null, 'getQueuePathGeometry succeeds without properties.pathData');
  assert(Math.abs(geom.totalLength - 30) < 0.001, `Legacy total length matches box length (30m)`);
  assert(geom.worldPoints.length >= 2, `Legacy queue generated sampled points: ${geom.worldPoints.length}`);

  // Test capacity calculation on legacy component
  const legacyCap = calculateQueueCapacity([legacyComp]);
  assert(legacyCap.totalQueueLength === 30, `Legacy total length preserved: ${legacyCap.totalQueueLength}m`);
  assert(legacyCap.physicalQueueCapacity === 150, `Legacy capacity preserved: ${legacyCap.physicalQueueCapacity} devotees (75m² @ 2.0/m²)`);
}

// -----------------------------------------------------------------------------
// 4. CAPACITY CALCULATIONS FOR CURVED QUEUES
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: Capacity calculation uses true centerline arc length ---');
{
  // A serpentine queue with 4 rows of 20m = 80m + turns (~85m)
  const serpentineComp = {
    id: 'queue-serpentine-cap',
    type: 'queue',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { length: 20, width: 2 }, // legacy box length is only 20
    properties: {
      lanes: 1,
      pathData: {
        type: 'serpentine',
        params: { rows: 4, rowLength: 20, spacing: 3, turnRadius: 1.5 },
      },
    },
  };

  const serpCap = calculateQueueCapacity([serpentineComp]);
  // If it used box length 20: 20 * 2 * 2.0 = 80 devotees.
  // With true serpentine length > 80m: > 320 devotees.
  assert(serpCap.totalQueueLength > 80, `Serpentine true arc length calculated: ${serpCap.totalQueueLength}m (vs box length 20m)`);
  assert(serpCap.physicalQueueCapacity >= 320, `Serpentine capacity accurately calculated: ${serpCap.physicalQueueCapacity} devotees`);
}

// -----------------------------------------------------------------------------
// 5. SIMULATION PATH GENERATION UNIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: Devotee simulation paths follow curved centerline waypoints ---');
{
  const curvedLayout = {
    dimensions: { width: 100, length: 100 },
    components: [
      {
        id: 'entry-gopuram',
        type: 'entrance',
        position: { x: 0, y: 0, z: -40 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 10, length: 8, height: 12 },
        properties: {},
      },
      {
        id: 'curved-queue-1',
        type: 'queue',
        position: { x: 0, y: 0, z: -20 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { length: 20, width: 2 },
        properties: {
          pathData: {
            type: 'arc',
            params: { radius: 20, startAngle: -30, endAngle: 30 },
          },
        },
      },
      {
        id: 'sanctum',
        type: 'darshan',
        position: { x: 0, y: 0, z: 20 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 12, length: 12, height: 8 },
        properties: {},
      },
      {
        id: 'exit-gopuram',
        type: 'exit',
        position: { x: 0, y: 0, z: 40 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { width: 8, length: 6, height: 10 },
        properties: {},
      },
    ],
  };

  const simResult = generateSimulationPaths(curvedLayout);
  const simPaths = simResult.paths || [];
  assert(simPaths.length > 0, `Generated ${simPaths.length} simulation paths`);

  const primaryPath = simPaths[0];
  const queueWaypoints = primaryPath.waypoints.filter((w) => w.zone === 'queue');
  assert(queueWaypoints.length >= 8, `Simulation path contains ${queueWaypoints.length} intermediate curve waypoints instead of just 2 endpoints!`);

  // Verify waypoints include headingAngle
  const hasHeading = queueWaypoints.some((w) => typeof w.headingAngle === 'number');
  assert(hasHeading, 'Waypoints include smooth local headingAngle for devotees');
}

// -----------------------------------------------------------------------------
// 6. VALIDATION BOUNDS USING PATH FOOTPRINT
// -----------------------------------------------------------------------------
console.log('\n--- TEST 6: Layout validator uses actual path footprint bounds ---');
{
  const arcComp = {
    id: 'arc-bounds-test',
    type: 'queue',
    position: { x: 10, y: 0, z: 10 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { length: 20, width: 2 },
    properties: {
      pathData: {
        type: 'arc',
        params: { radius: 10, startAngle: 0, endAngle: 90 },
      },
    },
  };

  const bounds = getComponentAABB(arcComp);
  assert(bounds.minX !== undefined && bounds.maxX !== undefined, 'Computed tight path bounds');
  assert(bounds.spanX > 0 && bounds.spanZ > 0, `Bounds dimensions: ${bounds.spanX.toFixed(2)}m x ${bounds.spanZ.toFixed(2)}m`);
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All path-based queue architecture tests passed successfully!\n');
}
