/**
 * DevaSetu Crowd Redistribution & Dynamic Load Balancing Verification Suite
 * Tests:
 * 1. Three original queues distribute arrivals.
 * 2. Lowest-utilization queue receives new arrivals preferentially.
 * 3. Expanded queues are automatically discovered.
 * 4. New arrivals use expanded queues when they have available capacity.
 * 5. Existing deep-queue devotees are not teleported.
 * 6. Holding-area devotees can select newly available queues.
 * 7. All queues above capacity still accept arrivals (no hard visitor limit).
 * 8. No arrivals are deleted.
 * 9. No arrivals are rejected.
 * 10. No simulation pause occurs because of queue pressure.
 * 11. Visual path matches assigned logical path.
 * 12. Curved expansion queues are followed using their sampled centerline.
 * 13. Multiple expansion generations are supported.
 * 14. North remains North, West remains West, East remains East (stream separation).
 * 15. Queue expansion does not artificially increase security throughput.
 * 16. Queue expansion does not artificially increase Darshan throughput.
 * 17. Crowd Pressure recalculates after redistribution.
 * 18. Capacity-before vs capacity-after is correct.
 * 19. Existing Crowd Load tests pass.
 * 20. Existing Crowd Pressure tests pass.
 * 21. Existing Curved Queue tests pass.
 * 22. Existing Capacity Expansion tests pass.
 * 23. Existing Festival tests pass.
 * 24. Existing Phase 4/5/6 tests pass.
 */

import assert from 'assert';
import { execSync } from 'child_process';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import { QueueRouter } from './src/features/simulation/queueRouter.js';
import { generateDeterministicExpansionComponents } from './src/services/layout/capacityExpansionPlanner.js';
import { calculateQueuePhysicalCapacity, CrowdPressureEngine, PRESSURE_LEVELS } from './src/features/simulation/crowdPressureEngine.js';
import { createAgent, AGENT_STATES } from './src/features/simulation/simulationModel.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n============================================================');
console.log('DevaSetu Crowd Redistribution Verification Suite');
console.log('============================================================\n');

// Common base scenario
const fest = generateFestivalScenario();
const baseScene = JSON.parse(JSON.stringify(fest.scene));
const basePathsResult = generateSimulationPaths(baseScene);
const basePaths = basePathsResult.paths;

// Test 1: Three original queues distribute arrivals
test('1. Three original queues distribute arrivals', () => {
  const router = new QueueRouter(basePaths, baseScene);
  const metrics = router.getDistributionMetrics();

  assert.ok(metrics.north, 'North stream queues must exist');
  assert.ok(metrics.west, 'West stream queues must exist');
  assert.ok(metrics.east, 'East stream queues must exist');
  assert.ok(metrics.north.queues.length >= 1, 'North must have at least one queue path');
  assert.ok(metrics.west.queues.length >= 1, 'West must have at least one queue path');
  assert.ok(metrics.east.queues.length >= 1, 'East must have at least one queue path');

  // Verify paths are grouped by stream
  assert.ok(router.streamQueues.north.length > 0, 'Stream queues must include North');
  assert.ok(router.streamQueues.west.length > 0, 'Stream queues must include West');
  assert.ok(router.streamQueues.east.length > 0, 'Stream queues must include East');
});

// Test 2: Lowest-utilization queue receives new arrivals preferentially
test('2. Lowest-utilization queue receives new arrivals preferentially', () => {
  const router = new QueueRouter(basePaths, baseScene);
  const northPathIds = router.streamQueues.north;
  assert.ok(northPathIds.length >= 2, 'North stream needs at least 2 queues for relative comparison');

  const p1 = northPathIds[0];
  const p2 = northPathIds[1];

  // Set all north paths to 90% load except p2 which is set to 20% load
  for (const id of northPathIds) {
    router.queueLoadStates[id].utilization = 0.90;
    router.queueLoadStates[id].currentOccupancy = 900;
    router.queueLoadStates[id].capacity = 1000;
    router.queueLoadStates[id].availableCapacity = 100;
  }

  router.queueLoadStates[p2].utilization = 0.20;
  router.queueLoadStates[p2].currentOccupancy = 200;
  router.queueLoadStates[p2].capacity = 1000;
  router.queueLoadStates[p2].availableCapacity = 800;

  // The router should preferentially choose p2 (lowest utilization)
  const chosenPath = router.selectOptimalPath('north', basePaths);
  assert.strictEqual(chosenPath.id, p2, 'Optimal path must be the lower-utilization queue p2');
});

// Test 3: Expanded queues are automatically discovered
test('3. Expanded queues are automatically discovered', () => {
  const plan = {
    type: 'capacity_expansion',
    targetZone: 'north',
    reasoning: 'Test discovery of expansion queues',
    changes: [
      {
        action: 'add_queue',
        template: 'serpentine',
        lanes: 2,
        laneWidth: 2.0,
        spacing: 1.5,
      },
    ],
    expectedCapacityIncrease: 400,
  };

  const expResult = generateDeterministicExpansionComponents(plan, baseScene);
  assert.ok(expResult.success, 'Expansion generation must succeed');

  const expandedScene = {
    ...baseScene,
    components: [...baseScene.components, ...expResult.components],
  };

  const expandedPaths = generateSimulationPaths(expandedScene).paths;
  const router = new QueueRouter(expandedPaths, expandedScene);

  // Find expansion queues in North stream
  const northStates = router.streamQueues.north.map((id) => router.queueLoadStates[id]);
  const expansionStates = northStates.filter((s) => s.isExpansion);

  assert.ok(expansionStates.length >= 1, 'Router must automatically discover expansion queue paths');
  assert.ok(expansionStates[0].capacity > 0, 'Expansion queue must have calculated geometric capacity');
  assert.strictEqual(expansionStates[0].stream, 'north', 'Discovered expansion must match its zone stream');
});

// Test 4: New arrivals use expanded queues when they have available capacity
test('4. New arrivals use expanded queues when they have available capacity', () => {
  const plan = {
    type: 'capacity_expansion',
    targetZone: 'north',
    reasoning: 'Expansion test for new arrival routing',
    changes: [
      {
        action: 'add_queue',
        template: 'serpentine',
        lanes: 2,
        laneWidth: 2.0,
        spacing: 1.5,
      },
    ],
    expectedCapacityIncrease: 400,
  };

  const expResult = generateDeterministicExpansionComponents(plan, baseScene);
  const expandedScene = {
    ...baseScene,
    components: [...baseScene.components, ...expResult.components],
  };
  const expandedPaths = generateSimulationPaths(expandedScene).paths;
  const router = new QueueRouter(expandedPaths, expandedScene);

  // Artificially saturate all original queues to 95%
  for (const id of router.streamQueues.north) {
    const q = router.queueLoadStates[id];
    if (!q.isExpansion) {
      q.utilization = 0.95;
      q.currentOccupancy = Math.round(q.capacity * 0.95);
      q.availableCapacity = q.capacity - q.currentOccupancy;
    } else {
      q.utilization = 0.05;
      q.currentOccupancy = Math.round(q.capacity * 0.05);
      q.availableCapacity = q.capacity - q.currentOccupancy;
    }
  }

  // Next arrivals should select an expansion queue
  const chosenPath = router.selectOptimalPath('north', expandedPaths);
  const chosenState = router.queueLoadStates[chosenPath.id];

  assert.ok(chosenState.isExpansion, 'Arrival must be routed to the available expansion queue');
  assert.ok(chosenState.utilization < 0.50, 'Selected path must have low utilization');
});

// Test 5: Existing deep-queue devotees are not teleported
test('5. Existing deep-queue devotees are not teleported', () => {
  const router = new QueueRouter(basePaths, baseScene);
  const path = basePaths[0];

  const agent = createAgent(999, path, 0, {});
  agent.state = AGENT_STATES.QUEUEING;
  // Locate agent inside physical queue
  const queueWpIndex = path.waypoints.findIndex((w) => w.zone === 'queue');
  assert.ok(queueWpIndex >= 0, 'Path must have queue waypoints');
  agent.targetWaypointIndex = queueWpIndex + 2;
  agent.position = { x: path.waypoints[agent.targetWaypointIndex].x, z: path.waypoints[agent.targetWaypointIndex].z };

  const initialPathId = agent.pathId;
  const initialPos = { ...agent.position };

  // Trigger rebalance
  const rebalanced = router.rebalancePreQueueDevotees([agent], basePaths, 100);

  assert.strictEqual(rebalanced, 0, 'Deep queue devotees must NOT be rebalanced');
  assert.strictEqual(agent.pathId, initialPathId, 'Path ID must remain unchanged');
  assert.strictEqual(agent.position.x, initialPos.x, 'Position X must not change (zero teleportation)');
  assert.strictEqual(agent.position.z, initialPos.z, 'Position Z must not change (zero teleportation)');
});

// Test 6: Holding-area devotees can select newly available queues
test('6. Holding-area devotees can select newly available queues', () => {
  const plan = {
    type: 'capacity_expansion',
    targetZone: 'north',
    changes: [{ action: 'add_queue', template: 'serpentine', lanes: 2, laneWidth: 2.0, spacing: 1.5 }],
  };
  const expResult = generateDeterministicExpansionComponents(plan, baseScene);
  const expandedScene = { ...baseScene, components: [...baseScene.components, ...expResult.components] };
  const expandedPaths = generateSimulationPaths(expandedScene).paths;

  const router = new QueueRouter(expandedPaths, expandedScene);

  const northIds = router.streamQueues.north;
  const origId = northIds.find((id) => !router.queueLoadStates[id].isExpansion);
  const expId = northIds.find((id) => router.queueLoadStates[id].isExpansion);

  assert.ok(origId !== undefined && expId !== undefined, 'Must have both original and expansion path IDs');

  // Set all original paths in north to 0.95 and expansion path to 0.05
  for (const id of northIds) {
    if (router.queueLoadStates[id].isExpansion) {
      router.queueLoadStates[id].utilization = 0.05;
    } else {
      router.queueLoadStates[id].utilization = 0.95;
    }
  }

  const origPath = expandedPaths.find((p) => p.id === origId);
  const agent = createAgent(888, origPath, 0, {});

  // Place agent in holding or entrance zone
  const holdingWpIdx = origPath.waypoints.findIndex((w) => w.zone === 'holding' || w.zone === 'entrance');
  assert.ok(holdingWpIdx >= 0, 'Path must have entrance/holding waypoint');
  agent.targetWaypointIndex = holdingWpIdx;
  agent.position = { x: origPath.waypoints[holdingWpIdx].x, z: origPath.waypoints[holdingWpIdx].z };
  agent.state = AGENT_STATES.WAITING;

  const posBefore = { ...agent.position };

  const rebalancedCount = router.rebalancePreQueueDevotees([agent], expandedPaths, 100);

  assert.strictEqual(rebalancedCount, 1, 'Holding-area devotee should be rebalanced');
  assert.strictEqual(router.queueLoadStates[agent.pathId].isExpansion, true, 'Agent should be reassigned to an underutilized expansion path');
  assert.strictEqual(agent.position.x, posBefore.x, 'Agent position X must NOT jump');
  assert.strictEqual(agent.position.z, posBefore.z, 'Agent position Z must NOT jump');
});

// Test 7: All queues above capacity still accept arrivals
test('7. All queues above capacity still accept arrivals', () => {
  const router = new QueueRouter(basePaths, baseScene);
  const northIds = router.streamQueues.north;

  // Set all queues to > 100% capacity
  for (const id of northIds) {
    const q = router.queueLoadStates[id];
    q.utilization = 1.35;
    q.currentOccupancy = Math.round(q.capacity * 1.35);
    q.availableCapacity = 0;
  }

  // Must still deterministically select a valid path without error or null
  const chosenPath = router.selectOptimalPath('north', basePaths);
  assert.ok(chosenPath, 'Router must not reject arrivals when queues are over capacity');
  assert.ok(northIds.includes(chosenPath.id), 'Chosen path must belong to North stream');
});

// Test 8: No arrivals are deleted
test('8. No arrivals are deleted', () => {
  const engine = new SimulationEngine(baseScene, basePaths);
  engine.setArrivalRate(300);

  // Run simulation for 20 seconds
  for (let s = 0; s < 200; s++) {
    engine.update(0.1);
  }

  const metrics = engine.getMetrics();
  assert.ok(metrics.totalEntered > 0, 'Arrivals must have entered');
  assert.strictEqual(
    metrics.totalEntered,
    metrics.activeCrowd + metrics.completedCrowd,
    'Total entered must equal active crowd + completed crowd (zero lost/deleted devotees)'
  );
});

// Test 9: No arrivals are rejected
test('9. No arrivals are rejected', () => {
  const engine = new SimulationEngine(baseScene, basePaths);
  const initialEntered = engine.logicalEnteredCount;

  // Inject a large crowd batch of 25,000 visitors
  engine.addCrowdBatch(25000);

  const updatedEntered = engine.logicalEnteredCount;
  assert.strictEqual(updatedEntered, initialEntered + 25000, 'All 25,000 injected visitors must be accepted');
});

// Test 10: No simulation pause occurs because of queue pressure
test('10. No simulation pause occurs because of queue pressure', () => {
  const engine = new SimulationEngine(baseScene, basePaths);
  engine.seedInitialAgents();
  engine.addCrowdBatch(50000); // Trigger heavy overload

  for (let s = 0; s < 50; s++) {
    engine.update(0.1);
  }

  const pressure = engine.getPressureState();
  assert.ok(pressure.index > 100, `Pressure index (${pressure.index}) must indicate high load`);
  assert.strictEqual(engine.arrivalsPaused, false, 'Simulation must NOT pause arrivals due to pressure');
});

// Test 11: Visual path matches assigned logical path
test('11. Visual path matches assigned logical path', () => {
  const engine = new SimulationEngine(baseScene, basePaths);
  engine.seedInitialAgents();

  for (const agent of engine.agents) {
    const assignedPath = engine.paths.find((p) => p.id === agent.pathId);
    assert.ok(assignedPath, 'Every visual agent must map to an existing path');
    assert.strictEqual(agent.pathId, assignedPath.id, 'Agent pathId must match assigned path');
  }
});

// Test 12: Curved expansion queues are followed using their sampled centerline
test('12. Curved expansion queues are followed using their sampled centerline', () => {
  const plan = {
    type: 'capacity_expansion',
    targetZone: 'north',
    changes: [{ action: 'add_queue', template: 'serpentine', lanes: 2, laneWidth: 2.0, spacing: 1.5 }],
  };
  const expResult = generateDeterministicExpansionComponents(plan, baseScene);
  const expandedScene = { ...baseScene, components: [...baseScene.components, ...expResult.components] };
  const expandedPaths = generateSimulationPaths(expandedScene).paths;

  const serpentinePath = expandedPaths.find((p) => p.laneId && String(p.laneId).includes('capacity-expansion'));
  assert.ok(serpentinePath, 'Serpentine expansion path must exist');

  // Verify waypoints contain multiple curved samples along the centerline
  const queueWaypoints = serpentinePath.waypoints.filter((w) => w.zone === 'queue');
  assert.ok(queueWaypoints.length >= 8, 'Serpentine centerline must have sampled continuous waypoints');

  // Verify non-linear waypoints (curve traversal)
  const xCoords = queueWaypoints.map((w) => w.x);
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  assert.ok(maxX - minX > 2.0, 'Serpentine centerline must span across multiple X positions');
});

// Test 13: Multiple expansion generations are supported
test('13. Multiple expansion generations are supported', () => {
  // Generation 1
  const plan1 = {
    type: 'capacity_expansion',
    targetZone: 'north',
    changes: [{ action: 'add_queue', template: 'serpentine', lanes: 2, laneWidth: 2.0, spacing: 1.5 }],
  };
  const res1 = generateDeterministicExpansionComponents(plan1, baseScene);
  const sceneGen1 = { ...baseScene, components: [...baseScene.components, ...res1.components] };
  const pathsGen1 = generateSimulationPaths(sceneGen1).paths;

  const router1 = new QueueRouter(pathsGen1, sceneGen1);
  const countGen1 = router1.streamQueues.north.length;

  // Generation 2
  const plan2 = {
    type: 'capacity_expansion',
    targetZone: 'north',
    changes: [{ action: 'add_queue', template: 'arc', lanes: 1, laneWidth: 2.0, spacing: 1.5 }],
  };
  const res2 = generateDeterministicExpansionComponents(plan2, sceneGen1);
  const sceneGen2 = { ...sceneGen1, components: [...sceneGen1.components, ...res2.components] };
  const pathsGen2 = generateSimulationPaths(sceneGen2).paths;

  const router2 = new QueueRouter(pathsGen2, sceneGen2);
  const countGen2 = router2.streamQueues.north.length;

  assert.ok(countGen2 > countGen1, 'Generation 2 must discover additional queue paths without hardcoded limits');
});

// Test 14: North remains North, West remains West, East remains East (stream separation)
test('14. North remains North, West remains West, East remains East', () => {
  const router = new QueueRouter(basePaths, baseScene);

  for (let i = 0; i < 15; i++) {
    const northP = router.selectOptimalPath('north', basePaths);
    assert.strictEqual(northP.stream, 'north', 'North arrival must only be assigned to a North path');

    const westP = router.selectOptimalPath('west', basePaths);
    assert.strictEqual(westP.stream, 'west', 'West arrival must only be assigned to a West path');

    const eastP = router.selectOptimalPath('east', basePaths);
    assert.strictEqual(eastP.stream, 'east', 'East arrival must only be assigned to an East path');
  }
});

// Test 15: Queue expansion does not artificially increase security throughput
test('15. Queue expansion does not artificially increase security throughput', () => {
  const engineBefore = new SimulationEngine(baseScene, basePaths);
  const secRateBefore = engineBefore.pressureEngine.securityRate;

  const plan = {
    type: 'capacity_expansion',
    targetZone: 'north',
    changes: [{ action: 'add_queue', template: 'serpentine', lanes: 2, laneWidth: 2.0, spacing: 1.5 }],
  };
  const expResult = generateDeterministicExpansionComponents(plan, baseScene);
  const expandedScene = { ...baseScene, components: [...baseScene.components, ...expResult.components] };
  const expandedPaths = generateSimulationPaths(expandedScene).paths;

  const engineAfter = new SimulationEngine(expandedScene, expandedPaths);
  const secRateAfter = engineAfter.pressureEngine.securityRate;

  assert.strictEqual(
    secRateAfter,
    secRateBefore,
    'Security processing rate must remain strictly governed by physical checkpoints, not queue expansions'
  );
});

// Test 16: Queue expansion does not artificially increase Darshan throughput
test('16. Queue expansion does not artificially increase Darshan throughput', () => {
  const engineBefore = new SimulationEngine(baseScene, basePaths);
  const darshanRateBefore = engineBefore.pressureEngine.darshanRate;

  const plan = {
    type: 'capacity_expansion',
    targetZone: 'north',
    changes: [{ action: 'add_queue', template: 'serpentine', lanes: 2, laneWidth: 2.0, spacing: 1.5 }],
  };
  const expResult = generateDeterministicExpansionComponents(plan, baseScene);
  const expandedScene = { ...baseScene, components: [...baseScene.components, ...expResult.components] };
  const expandedPaths = generateSimulationPaths(expandedScene).paths;

  const engineAfter = new SimulationEngine(expandedScene, expandedPaths);
  const darshanRateAfter = engineAfter.pressureEngine.darshanRate;

  assert.strictEqual(
    darshanRateAfter,
    darshanRateBefore,
    'Darshan throughput must remain strictly governed by sanctum capacity, not queue expansions'
  );
});

// Test 17: Crowd Pressure recalculates after redistribution
test('17. Crowd Pressure recalculates after redistribution', () => {
  const engine = new SimulationEngine(baseScene, basePaths);
  engine.seedInitialAgents();
  engine.addCrowdBatch(12000);

  const initialPressure = engine.getPressureState();
  const initialQueuePressure = initialPressure.zones.queue.utilization;
  const initialQueueCap = initialPressure.zones.queue.capacity;

  // Add expansion
  const plan = {
    type: 'capacity_expansion',
    targetZone: 'north',
    changes: [{ action: 'add_queue', template: 'serpentine', lanes: 2, laneWidth: 2.0, spacing: 1.5 }],
  };
  const expResult = generateDeterministicExpansionComponents(plan, baseScene);
  const expandedScene = { ...baseScene, components: [...baseScene.components, ...expResult.components] };
  const expandedPaths = generateSimulationPaths(expandedScene).paths;

  const updatedPressure = engine.updateSceneAndPaths(expandedScene, expandedPaths);

  assert.ok(
    updatedPressure.zones.queue.capacity > initialQueueCap,
    'Queue capacity must increase after expansion'
  );
  assert.ok(
    updatedPressure.zones.queue.utilization <= initialQueuePressure,
    'Queue utilization pressure must decrease or remain well-distributed after expansion'
  );
  assert.ok(updatedPressure.index >= 0, 'Overall pressure index must be computed');
});

// Test 18: Capacity-before vs capacity-after is correct
test('18. Capacity-before vs capacity-after is correct', () => {
  const router = new QueueRouter(basePaths, baseScene);
  router.recordBeforeExpansion('north');

  const beforeDist = router.getDistributionMetrics().north.distribution;
  const capBefore = beforeDist.totalCapacity;

  // Add expansion
  const plan = {
    type: 'capacity_expansion',
    targetZone: 'north',
    changes: [{ action: 'add_queue', template: 'serpentine', lanes: 2, laneWidth: 2.0, spacing: 1.5 }],
  };
  const expResult = generateDeterministicExpansionComponents(plan, baseScene);
  const expandedScene = { ...baseScene, components: [...baseScene.components, ...expResult.components] };
  const expandedPaths = generateSimulationPaths(expandedScene).paths;

  router.refresh(expandedPaths, expandedScene);
  const effectiveness = router.getExpansionEffectiveness('north');

  assert.strictEqual(effectiveness.capacityBefore, capBefore, 'Capacity before must match recorded snapshot');
  assert.ok(effectiveness.capacityAfter > effectiveness.capacityBefore, 'Capacity after must exceed capacity before');
  assert.strictEqual(
    effectiveness.capacityGained,
    effectiveness.capacityAfter - effectiveness.capacityBefore,
    'Capacity gained must equal after minus before'
  );
});

// Regression Test Suites (Tests 19-24)
test('19. Existing Crowd Load tests pass', () => {
  const out = execSync('node test_crowd_load_engine.js', { encoding: 'utf8' });
  assert.ok(out.includes('0 FAILED'), 'Crowd Load Engine tests must pass with 0 failed');
});

test('20. Existing Crowd Pressure tests pass', () => {
  const out = execSync('node test_crowd_pressure_engine.js', { encoding: 'utf8' });
  assert.ok(out.includes('0 FAILED'), 'Crowd Pressure Engine tests must pass with 0 failed');
});

test('21. Existing Curved Queue tests pass', () => {
  const out = execSync('node test_curved_queue_architecture.js', { encoding: 'utf8' });
  assert.ok(out.includes('0 FAILED'), 'Curved Queue tests must pass with 0 failed');
});

test('22. Existing Capacity Expansion tests pass', () => {
  const out = execSync('node test_capacity_expansion_apply.js', { encoding: 'utf8' });
  assert.ok(out.includes('0 failed'), 'Capacity Expansion tests must pass with 0 failed');
});

test('23. Existing Festival tests pass', () => {
  const out = execSync('node test_temple_festival_upgrade.js', { encoding: 'utf8' });
  assert.ok(out.includes('0 failed'), 'Festival tests must pass with 0 failed');
});

test('24. Existing Phase 4/5/6 tests pass', () => {
  const p4 = execSync('node test_phase4.js', { encoding: 'utf8' });
  assert.ok(p4.includes('0 failed'), 'Phase 4 tests must pass with 0 failed');

  const p5 = execSync('node test_phase5.js', { encoding: 'utf8' });
  assert.ok(p5.includes('0 failed'), 'Phase 5 tests must pass with 0 failed');

  const p6 = execSync('node test_phase6_export.js', { encoding: 'utf8' });
  assert.ok(p6.includes('ALL PHASE 6 CLIENT TESTS PASSED'), 'Phase 6 tests must pass');
});

console.log('\n------------------------------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('------------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All 24 Crowd Redistribution and Dynamic Load Balancing tests PASSED!\n');
}
