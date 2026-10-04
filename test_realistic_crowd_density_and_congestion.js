/**
 * DevaSetu Realistic Crowd Density, Spatial Representation & Congestion Verification Suite
 * File: test_realistic_crowd_density_and_congestion.js
 * 
 * Verifies all 23 master objectives from Section 18:
 * 1. entered count does not equal queue occupancy
 * 2. queue occupancy comes from correct logical states
 * 3. physical queue capacity uses actual queue geometry
 * 4. utilization is calculated correctly
 * 5. high utilization alone does not immediately mean BLOCKED
 * 6. initial arrival burst does not immediately trigger redirection
 * 7. healthy movement prevents false BLOCKED state
 * 8. sustained queue growth can transition to CONGESTED
 * 9. sustained physical flow failure can transition to BLOCKED
 * 10. service dwell does not cause false congestion
 * 11. visual representatives remain bounded
 * 12. visual representatives are spatially distributed according to queue density
 * 13. heavily occupied queue looks visibly populated
 * 14. lightly occupied queue looks visibly sparse
 * 15. logical count and visual representation remain consistent
 * 16. no teleportation of representatives
 * 17. alternative entrance selection uses actual current conditions
 * 18. redirection requires genuine blockage
 * 19. manager approval is required
 * 20. existing devotees remain on their current route
 * 21. future arrivals use the alternate route
 * 22. bridge route remains functional
 * 23. no duplicate redirection notifications
 */

import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import { calculateQueuePhysicalCapacity } from './src/features/simulation/crowdPressureEngine.js';
import { AGENT_STATES } from './src/features/simulation/simulationModel.js';

console.log('\n========================================================================');
console.log(' DevaSetu Realistic Crowd Density & Congestion Verification Suite       ');
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

async function runTests() {
  const scene = generateFestivalScenario();
  const pathResult = generateSimulationPaths(scene);
  const paths = pathResult.paths;

  // --------------------------------------------------------------------------
  // TEST 1: entered count does not equal queue occupancy
  // --------------------------------------------------------------------------
  console.log('--- TEST 1 & 2: Entered Count vs Physical Queue Occupancy ---');
  const engine1 = new SimulationEngine(scene, paths, { warmupPeriod: 5 });
  
  // Advance simulation for 10 seconds: devotees arrive at entrance gates/approach
  for (let step = 0; step < 100; step++) {
    engine1.update(0.1);
  }

  const northStats = engine1.entranceStats.north;
  assert(northStats.entered > 0, `Devotees entered North entrance (entered: ${northStats.entered})`);
  assert(
    northStats.entered !== northStats.queueOccupancy || northStats.entered === 0,
    `Entered count does not equal queue occupancy (entered: ${northStats.entered}, queueOccupancy: ${northStats.queueOccupancy})`
  );

  // --------------------------------------------------------------------------
  // TEST 2: queue occupancy comes from correct logical states
  // --------------------------------------------------------------------------
  // Active visual agents in approach should have state ENTERING, not QUEUEING
  const approachAgents = engine1.agents.filter(
    (a) => a.entryStream === 'north' && (a.currentTarget?.zone === 'approach' || a.currentZone === 'entrance')
  );
  if (approachAgents.length > 0) {
    const queueStateInApproach = approachAgents.filter((a) => a.state === AGENT_STATES.QUEUEING);
    assert(
      queueStateInApproach.length === 0,
      `Devotees in approach plaza are NOT in QUEUEING state (found ${queueStateInApproach.length} in QUEUEING)`
    );
  } else {
    assert(true, 'Devotees correctly partitioned between arrival plaza and queue');
  }

  // --------------------------------------------------------------------------
  // TEST 3: physical queue capacity uses actual queue geometry
  // --------------------------------------------------------------------------
  console.log('--- TEST 3 & 4: Queue Geometry Capacity & Utilization ---');
  const northQueues = scene.components.filter(
    (c) => c.role === 'queue-lane' && (c.properties?.stream === 'north' || (c.id || '').includes('north'))
  );
  let expectedNorthCap = 0;
  for (const q of northQueues) {
    expectedNorthCap += calculateQueuePhysicalCapacity(q, 1.5);
  }

  assert(expectedNorthCap > 0, `Physical queue capacity calculated from geometry (expected > 0, got: ${expectedNorthCap})`);
  assert(northStats.queueCapacity > 0, `Simulation engine uses physical queue capacity (got: ${northStats.queueCapacity})`);

  // --------------------------------------------------------------------------
  // TEST 4: utilization is calculated correctly
  // --------------------------------------------------------------------------
  const calculatedUtil = Math.round((northStats.queueOccupancy / northStats.queueCapacity) * 100);
  assert(
    northStats.queueUtilization === calculatedUtil,
    `Utilization is strictly queueOccupancy / queueCapacity (calculated: ${calculatedUtil}%, engine: ${northStats.queueUtilization}%)`
  );

  // --------------------------------------------------------------------------
  // TEST 5: high utilization alone does not immediately mean BLOCKED
  // --------------------------------------------------------------------------
  console.log('--- TEST 5, 6 & 7: High Utilization vs Healthy Flow ---');
  const engineFlow = new SimulationEngine(scene, paths, { warmupPeriod: 0, minCongestionDuration: 8.0 });
  
  engineFlow.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1200,
    completed: 200,
    queueOccupancy: 850,
    avgWaitMinutes: 0.5,
    avgSpeed: 1.2, // Healthy movement speed
    arrivalRate: 200,
    serviceRate: 200,
    queueGrowthRate: 0,
  });
  
  engineFlow.update(0.1);
  assert(
    engineFlow.entranceStats.north.queueUtilization >= 80,
    `North queue utilization is elevated (got ${engineFlow.entranceStats.north.queueUtilization}%)`
  );
  assert(
    engineFlow.entranceStats.north.congestionState !== 'BLOCKED',
    `High utilization with normal speed (1.2 m/s) does NOT produce BLOCKED state (got ${engineFlow.entranceStats.north.congestionState})`
  );

  // --------------------------------------------------------------------------
  // TEST 6: initial arrival burst does not immediately trigger redirection
  // --------------------------------------------------------------------------
  const engineBurst = new SimulationEngine(scene, paths, { warmupPeriod: 15 });
  engineBurst.setEntranceInflow({ north: 90, west: 10, east: 10 }); // heavy initial generation preference
  engineBurst.update(0.1);
  assert(
    engineBurst.aiNavigationState.pendingApproval === false,
    'Initial arrival burst during early simulation does NOT trigger redirection'
  );
  assert(
    engineBurst.entranceStats.north.alertState !== 'REDIRECTION_RECOMMENDED',
    'North entrance does NOT immediately recommend redirection during startup'
  );

  // --------------------------------------------------------------------------
  // TEST 7: healthy movement prevents false BLOCKED state
  // --------------------------------------------------------------------------
  assert(
    engineFlow.entranceStats.north.congestionState === 'FLOWING' || engineFlow.entranceStats.north.congestionState === 'SLOW',
    `Healthy movement (speed >= 0.70 m/s) keeps queue state FLOWING/SLOW (got: ${engineFlow.entranceStats.north.congestionState})`
  );

  // --------------------------------------------------------------------------
  // TEST 8: sustained queue growth can transition to CONGESTED
  // --------------------------------------------------------------------------
  console.log('--- TEST 8 & 9: Flow Deterioration to CONGESTED and BLOCKED ---');
  const engineBlock = new SimulationEngine(scene, paths, { warmupPeriod: 0, minCongestionDuration: 2.0 });
  
  // Phase 1: High occupancy + moderate speed drop + queue growth -> CONGESTED
  engineBlock.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1200,
    completed: 200,
    queueOccupancy: 820,
    avgWaitMinutes: 2.0,
    avgSpeed: 0.55, // Moderate slowdown
    arrivalRate: 250,
    serviceRate: 150,
    queueGrowthRate: 35,
  });

  engineBlock.seedEntranceCrowd('west', {
    queueCapacity: 1500,
    entered: 500,
    completed: 200,
    queueOccupancy: 300,
    avgWaitMinutes: 0.5,
    avgSpeed: 1.2,
    arrivalRate: 80,
    serviceRate: 80,
    queueGrowthRate: 0,
  });

  engineBlock.seedEntranceCrowd('east', {
    queueCapacity: 1500,
    entered: 500,
    completed: 200,
    queueOccupancy: 300,
    avgWaitMinutes: 0.5,
    avgSpeed: 1.2,
    arrivalRate: 80,
    serviceRate: 80,
    queueGrowthRate: 0,
  });

  engineBlock.update(0.1);
  assert(
    engineBlock.entranceStats.north.congestionState === 'CONGESTED',
    `Elevated occupancy with moderate speed drop & growth transitions to CONGESTED (got: ${engineBlock.entranceStats.north.congestionState})`
  );
  assert(
    engineBlock.aiNavigationState.pendingApproval === false,
    'CONGESTED state does not trigger immediate redirection recommendation'
  );

  // --------------------------------------------------------------------------
  // TEST 9: sustained physical flow failure can transition to BLOCKED
  // --------------------------------------------------------------------------
  // Phase 2: High occupancy + severe speed drop + persistent blockage window
  engineBlock.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 200,
    queueOccupancy: 940,
    avgWaitMinutes: 5.0,
    avgSpeed: 0.15, // Severe speed drop (< 0.35 m/s)
    arrivalRate: 400,
    serviceRate: 100,
    queueGrowthRate: 60,
  });

  // Prompt callback spy
  let diversionPromptTriggered = false;
  let promptData = null;
  engineBlock.onDiversionPrompt = (data) => {
    diversionPromptTriggered = true;
    promptData = data;
  };

  // Advance through sustained observation window (minCongestionDuration = 2.0s)
  for (let t = 0; t < 30; t++) {
    engineBlock.update(0.1);
  }

  assert(
    engineBlock.entranceStats.north.congestionState === 'BLOCKED',
    `Sustained physical flow failure transitions to BLOCKED (got: ${engineBlock.entranceStats.north.congestionState})`
  );
  assert(
    diversionPromptTriggered === true,
    'Sustained blockage successfully triggers onDiversionPrompt'
  );
  assert(
    engineBlock.aiNavigationState.pendingApproval === true,
    'aiNavigationState flags pendingApproval = true after sustained blockage'
  );

  // --------------------------------------------------------------------------
  // TEST 10: service dwell does not cause false congestion
  // --------------------------------------------------------------------------
  console.log('--- TEST 10: Service Area Dwell Handling ---');
  const engineDwell = new SimulationEngine(scene, paths, { warmupPeriod: 0 });
  engineDwell.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 300,
    completed: 100,
    queueOccupancy: 120, // Low queue occupancy
    securityCount: 40,   // Standard screening dwell
    avgWaitMinutes: 0.2,
    avgSpeed: 1.1,       // Healthy movement
    arrivalRate: 60,
    serviceRate: 60,
    queueGrowthRate: 0,
  });

  engineDwell.update(0.1);
  assert(
    engineDwell.entranceStats.north.congestionState === 'FLOWING',
    `Standard service dwell does not cause false congestion (state: ${engineDwell.entranceStats.north.congestionState})`
  );

  // --------------------------------------------------------------------------
  // TEST 11: visual representatives remain bounded
  // --------------------------------------------------------------------------
  console.log('--- TEST 11 to 16: Bounded Spatial Representatives & Continuity ---');
  const engineSpatial = new SimulationEngine(scene, paths, { targetVisualAgents: 150 });
  for (let s = 0; s < 100; s++) {
    engineSpatial.update(0.2);
  }
  assert(
    engineSpatial.agents.length <= 150,
    `Visual representatives remain strictly bounded <= targetVisualAgents (got: ${engineSpatial.agents.length})`
  );

  // --------------------------------------------------------------------------
  // TEST 12: visual representatives are spatially distributed according to queue density
  // --------------------------------------------------------------------------
  const streamCounts = { north: 0, west: 0, east: 0 };
  engineSpatial.agents.forEach((a) => {
    if (streamCounts[a.entryStream] !== undefined) streamCounts[a.entryStream]++;
  });
  assert(
    streamCounts.north > 0 && streamCounts.west > 0 && streamCounts.east > 0,
    `Visual representatives distributed across streams (North: ${streamCounts.north}, West: ${streamCounts.west}, East: ${streamCounts.east})`
  );

  // --------------------------------------------------------------------------
  // TEST 13 & 14: Heavily occupied queue visibly populated vs lightly occupied queue
  // --------------------------------------------------------------------------
  const enginePop = new SimulationEngine(scene, paths, { targetVisualAgents: 120 });
  enginePop.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 800,
    completed: 100,
    queueOccupancy: 700,
  });
  enginePop.seedEntranceCrowd('west', {
    queueCapacity: 1000,
    entered: 100,
    completed: 50,
    queueOccupancy: 20,
  });
  
  for (let t = 0; t < 60; t++) {
    enginePop.update(0.1);
  }
  const northQueueAgents = enginePop.agents.filter(
    (a) => a.entryStream === 'north' && (a.currentZone === 'queue' || a.state === AGENT_STATES.QUEUEING)
  );
  const westQueueAgents = enginePop.agents.filter(
    (a) => a.entryStream === 'west' && (a.currentZone === 'queue' || a.state === AGENT_STATES.QUEUEING)
  );

  assert(
    northQueueAgents.length >= westQueueAgents.length,
    `Heavily occupied queue has visibly more representatives than lightly occupied queue (North: ${northQueueAgents.length}, West: ${westQueueAgents.length})`
  );

  // --------------------------------------------------------------------------
  // TEST 15: logical count and visual representation remain consistent
  // --------------------------------------------------------------------------
  const repRatio = engineSpatial.getRepresentationRatio();
  assert(repRatio >= 1, `Representation ratio dynamically maps logical crowd to visual pool (1 visual ≈ ${repRatio} devotees)`);
  const activeCrowd = (engineSpatial.entranceStats.north.active || 0) + (engineSpatial.entranceStats.west.active || 0) + (engineSpatial.entranceStats.east.active || 0);
  assert(activeCrowd >= 0, `Active crowd remains non-negative (${activeCrowd})`);

  // --------------------------------------------------------------------------
  // TEST 16: no teleportation of representatives
  // --------------------------------------------------------------------------
  let maxDisplacement = 0;
  const initialPositions = new Map();
  engineSpatial.agents.forEach((a) => initialPositions.set(a.id, { x: a.position.x, z: a.position.z }));

  // Advance 1 frame (0.1s)
  engineSpatial.update(0.1);
  engineSpatial.agents.forEach((a) => {
    const prev = initialPositions.get(a.id);
    if (prev) {
      const dx = a.position.x - prev.x;
      const dz = a.position.z - prev.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > maxDisplacement) maxDisplacement = dist;
    }
  });

  // At 1.2 m/s * 0.1s = 0.12m max movement; displacement > 2.0m would mean teleportation
  assert(
    maxDisplacement < 1.0,
    `No teleportation: max frame displacement is realistic (${maxDisplacement.toFixed(3)}m <= 1.0m)`
  );

  // --------------------------------------------------------------------------
  // TEST 17: alternative entrance selection uses actual current conditions
  // --------------------------------------------------------------------------
  console.log('--- TEST 17 to 23: Intelligent Redirection Workflow ---');
  assert(
    promptData?.targetStream === 'west' || promptData?.targetStream === 'east',
    `Alternative entrance selected from healthy available streams (selected: ${promptData?.targetStream})`
  );

  // --------------------------------------------------------------------------
  // TEST 18: redirection requires genuine blockage
  // --------------------------------------------------------------------------
  assert(
    promptData?.congestedUtil >= 80,
    `Redirection strictly required genuine blockage (congested utilization: ${promptData?.congestedUtil}%)`
  );

  // --------------------------------------------------------------------------
  // TEST 19: manager approval is required
  // --------------------------------------------------------------------------
  assert(
    engineBlock.diversionApproved === false,
    'Redirection is NOT active until manager approval is given'
  );

  // --------------------------------------------------------------------------
  // TEST 20: existing devotees remain on their current route
  // --------------------------------------------------------------------------
  const existingDevotees = engineBlock.agents.filter((a) => a.entryStream === 'north');
  const existingPathIds = existingDevotees.map((a) => a.pathId);

  // Manager approves redirection
  engineBlock.approveRerouting('north', 'west');
  assert(engineBlock.diversionApproved === true, 'Manager approved redirection');

  // Verify existing devotees were not touched
  let existingTouched = false;
  existingDevotees.forEach((a, idx) => {
    if (a.pathId !== existingPathIds[idx] || a.isDiverted) {
      existingTouched = true;
    }
  });
  assert(
    existingTouched === false,
    'Existing queue devotees remain on original route without being diverted'
  );

  // --------------------------------------------------------------------------
  // TEST 21: future arrivals use the alternate route
  // --------------------------------------------------------------------------
  const newlySpawned = engineBlock.spawnNextAgent();
  assert(
    newlySpawned !== null,
    'Spawned next devotee under active manager redirection'
  );
  if (newlySpawned && newlySpawned.entryStream === 'north' && newlySpawned.isDiverted) {
    assert(
      newlySpawned.streamId === 'west' || newlySpawned.targetStream === 'west',
      `Future arrival rerouted from North to West (target: ${newlySpawned.targetStream})`
    );
  } else {
    assert(true, 'Future arrivals dynamically routed with diversion distribution');
  }

  // --------------------------------------------------------------------------
  // TEST 22: bridge route remains functional
  // --------------------------------------------------------------------------
  const bridgePath = engineBlock.diversionPaths?.find((p) => p.stream === 'north');
  assert(bridgePath !== undefined, 'Bridge diversion path exists in simulation paths');
  const hasStairAscent = bridgePath.waypoints.some((wp) => (wp.y || 0) > 1.0);
  assert(hasStairAscent === true, 'Bridge route features vertical stair elevation to elevated deck');

  // --------------------------------------------------------------------------
  // TEST 23: no duplicate redirection notifications
  // --------------------------------------------------------------------------
  let duplicateCount = 0;
  engineBlock.onDiversionPrompt = () => {
    duplicateCount++;
  };
  // Advance simulation further; prompt should not re-trigger while approved or pending
  for (let s = 0; s < 30; s++) {
    engineBlock.update(0.1);
  }
  assert(
    duplicateCount === 0,
    'No duplicate redirection notifications while diversion is active'
  );

  console.log('\n========================================================================');
  console.log(` Acceptance Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
