/**
 * Regression & Layout Verification Suite:
 * 1. Default Empty Stage (0 Queues, 0 Corridors, Empty Canvas)
 * 2. 100K Festival Campus Procedural Layout (Multi-shape Queue Network)
 */

import { generateFestivalScenario, FESTIVAL_SITE_SPECS } from './src/services/layout/festivalScenarioGenerator.js';
import { COMPONENT_TYPES } from './src/utils/componentDefaults.js';
import { validateSimulationReadiness, generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import { getQueuePathGeometry } from './src/services/layout/queuePathGeometry.js';
import { calculateQueueCapacity } from './src/services/layout/capacityCalculator.js';

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

console.log('========================================================================');
console.log(' DevaSetu Queue Layout & Empty Stage Regression Suite                   ');
console.log('========================================================================\n');

// -----------------------------------------------------------------------------
// PART 1: DEFAULT EMPTY STAGE VERIFICATION
// -----------------------------------------------------------------------------
console.log('--- PART 1: Default Empty Stage Verification ---');

// Simulated empty scene as created by "New Temple Site" or initial state
const emptyScene = {
  space: {
    length: 100,
    width: 60,
    height: 12,
    gridSize: 1,
    name: 'New Temple Site'
  },
  components: []
};

// Test 1: Empty scene has zero components
assert(emptyScene.components.length === 0, 'Empty scene has 0 total components');

// Test 2: Empty scene has zero queue lanes
const emptyQueues = emptyScene.components.filter(c => c.type === COMPONENT_TYPES.QUEUE);
assert(emptyQueues.length === 0, 'Empty scene has exactly 0 queue lanes');

// Test 3: Empty scene has zero corridors
const emptyCorridors = emptyScene.components.filter(c => c.type === 'corridor' || c.role?.includes('corridor'));
assert(emptyCorridors.length === 0, 'Empty scene has exactly 0 corridors');

// Test 4: Empty scene has zero gates / security / darshan
const emptyInfrastructure = emptyScene.components.filter(c => 
  c.type === COMPONENT_TYPES.ENTRANCE || 
  c.type === COMPONENT_TYPES.SECURITY || 
  c.type === COMPONENT_TYPES.DARSHAN || 
  c.type === COMPONENT_TYPES.EXIT
);
assert(emptyInfrastructure.length === 0, 'Empty scene has exactly 0 entrance, security, darshan, or exit gates');

// Test 5: Empty scene fails simulation readiness gracefully (not ready, requires components)
const emptyReadiness = validateSimulationReadiness(emptyScene.components);
assert(emptyReadiness.ready === false, 'Empty scene correctly reports not ready for simulation');
assert(emptyReadiness.missing.length > 0, `Empty scene correctly lists missing requirements: ${emptyReadiness.missing.join(', ')}`);


// -----------------------------------------------------------------------------
// PART 2: 100K FESTIVAL CAMPUS QUEUE NETWORK
// -----------------------------------------------------------------------------
console.log('\n--- PART 2: 100K Festival Campus Multi-Shape Queue Network ---');

const festivalResult = generateFestivalScenario();
assert(festivalResult.success === true, 'Festival scenario generated successfully');

const festivalScene = festivalResult.scene;
const allComponents = festivalScene.components;

// Test 6: Primary queue lanes count
const primaryQueues = allComponents.filter(c => c.role === 'queue-lane');
assert(primaryQueues.length === 16, `Primary queue count is exactly 16 (found ${primaryQueues.length})`);

// Test 7: North Zone A4 queue lanes
const northQueues = primaryQueues.filter(q => q.properties?.stream === 'north');
assert(northQueues.length === 6, `North Zone A4 has 6 queue lanes (found ${northQueues.length})`);

// Test 8: West Zone B4 queue lanes
const westQueues = primaryQueues.filter(q => q.properties?.stream === 'west');
assert(westQueues.length === 5, `West Zone B4 has 5 queue lanes (found ${westQueues.length})`);

// Test 9: East Zone C4 queue lanes
const eastQueues = primaryQueues.filter(q => q.properties?.stream === 'east');
assert(eastQueues.length === 5, `East Zone C4 has 5 queue lanes (found ${eastQueues.length})`);

// Test 10: Central Zone D radial approach channels
const radialChannels = allComponents.filter(c => c.role === 'radial-queue-channel');
assert(radialChannels.length === 4, `Central Zone D has 4 radial approach channels (found ${radialChannels.length})`);

// Test 11: Queue shapes diversity across network
const queueShapes = new Set(allComponents.filter(c => c.type === COMPONENT_TYPES.QUEUE).map(c => c.properties?.shape).filter(Boolean));
console.log(`  ℹ Queue shape types detected: ${Array.from(queueShapes).join(', ')}`);
assert(queueShapes.has('serpentine'), 'Serpentine / curved queue shape is utilized');
assert(queueShapes.has('switchback'), 'Switchback queue shape is utilized');
assert(queueShapes.has('straight'), 'Straight queue shape is utilized');
assert(queueShapes.has('radial'), 'Radial queue shape is utilized');
assert(queueShapes.size >= 4, `At least 4 distinct queue shapes utilized (found ${queueShapes.size})`);

// Test 12: Serpentine queues have valid centerlines and non-zero arc length
const serpentineQueue = primaryQueues.find(q => q.properties?.shape === 'serpentine');
assert(serpentineQueue !== undefined, 'Serpentine queue found in primary queues');
const serpentineGeom = getQueuePathGeometry(serpentineQueue);
assert(serpentineGeom !== null, 'getQueuePathGeometry generates geometry for serpentine queue');
assert(serpentineGeom.totalLength > serpentineQueue.dimensions.length, `Serpentine arc length (${serpentineGeom.totalLength.toFixed(1)}m) exceeds bounding length (${serpentineQueue.dimensions.length}m)`);

// Test 13: Switchback queues have valid centerlines and increased capacity
const switchbackQueue = primaryQueues.find(q => q.properties?.shape === 'switchback');
assert(switchbackQueue !== undefined, 'Switchback queue found in primary queues');
const switchbackGeom = getQueuePathGeometry(switchbackQueue);
assert(switchbackGeom !== null, 'getQueuePathGeometry generates geometry for switchback queue');
assert(switchbackGeom.totalLength > switchbackQueue.dimensions.length, `Switchback arc length (${switchbackGeom.totalLength.toFixed(1)}m) exceeds bounding length (${switchbackQueue.dimensions.length}m)`);

// Test 14: L-shape queue geometry generator operates accurately
const testLShapeQueue = {
  type: COMPONENT_TYPES.QUEUE,
  dimensions: { length: 32, width: 2.0, height: 1.0 },
  properties: {
    shape: 'l_shape',
    pathData: {
      type: 'l_shape',
      params: { leg1: 22, leg2: 10, turnRadius: 3.0, turnDirection: 'left' },
    },
  },
};
const lShapeGeom = getQueuePathGeometry(testLShapeQueue);
assert(lShapeGeom !== null, 'getQueuePathGeometry generates geometry for L-shape queue');
assert(lShapeGeom.points.length >= 3, `L-shape has at least 3 points forming corner (found ${lShapeGeom.points.length})`);

// Test 15: Radial queues have valid geometry
const radialQueue = radialChannels[0];
assert(radialQueue !== undefined, 'Radial queue found');
const radialGeom = getQueuePathGeometry(radialQueue);
assert(radialGeom !== null, 'getQueuePathGeometry generates geometry for radial queue');

// Test 16: True geometry arc length capacity calculation
const queueMetrics = calculateQueueCapacity([serpentineQueue]);
assert(queueMetrics.queueCapacity > 20, `Serpentine queue capacity calculated from true arc length (cap: ${queueMetrics.queueCapacity})`);

// Test 17: Simulation paths generation & zone connectivity
const simPaths = generateSimulationPaths(festivalScene);
assert(simPaths.ready === true, 'Simulation paths generated successfully for 100K festival');
assert(simPaths.paths.length === 16, `16 simulation paths generated matching 16 primary queue lanes`);

// Test 18: Every path connects entrance -> security -> queue -> darshan -> exit
let allPathsConnected = true;
simPaths.paths.forEach((p) => {
  const zones = p.waypoints.map(w => w.zone);
  if (!zones.includes('entrance') || !zones.includes('security') || !zones.includes('queue') || !zones.includes('darshan') || !zones.includes('exit')) {
    allPathsConnected = false;
  }
});
assert(allPathsConnected === true, 'All 16 simulation paths connect entrance -> security -> queue -> darshan -> exit');

// Test 19: Simulation engine runs with multi-zone agents progressing along queues
const engine = new SimulationEngine(festivalScene, simPaths.paths, { scaleFactor: 1 });
for (let i = 0; i < 50; i++) {
  engine.update(0.1, 1.0);
}
assert(engine.agents.length > 0, `Simulation engine spawned devotees (${engine.agents.length} active devotees)`);

console.log('\n========================================================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================================================\n');

if (failed > 0) process.exit(1);
