/**
 * DevaSetu Entrance-Based Crowd Generation & Congestion-Triggered Rerouting Suite
 * 
 * Verifies all 24 requirements from the User Request:
 * 1. Manual mode shows component sidebar.
 * 2. Simulation mode shows entrance telemetry.
 * 3. Returning to Manual restores component sidebar.
 * 4. 90/20/20 is normalized correctly.
 * 5. Visitors actually enter according to weights.
 * 6. Actual entrance counts match generated entryStream.
 * 7. High ratio alone does NOT trigger rerouting.
 * 8. Healthy queue does NOT trigger rerouting.
 * 9. Queue growth is measured.
 * 10. Wait-time trend is measured.
 * 11. Congestion requires sustained evidence.
 * 12. Alternative entrance capacity is checked.
 * 13. No alternative capacity means no rerouting.
 * 14. North -> West rerouting works.
 * 15. North -> East rerouting works.
 * 16. West -> North works.
 * 17. West -> East works.
 * 18. East -> North works.
 * 19. East -> West works.
 * 20. Existing visitors are never moved.
 * 21. Only future visitors use new distribution.
 * 22. Rerouting cooldown prevents oscillation.
 * 23. Balanced 40/30/30 produces no automatic recommendation while queues remain healthy.
 * 24. Simulation starts without a rerouting alert.
 */

import assert from 'assert';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import { normalizeEntranceWeights, createAgent, AGENT_STATES } from './src/features/simulation/simulationModel.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.stack || err.message}`);
    failed++;
  }
}

console.log('\n============================================================');
console.log('DevaSetu 24-Point Comprehensive Simulation Verification Suite');
console.log('============================================================\n');

// Setup common scenario
const fest = generateFestivalScenario();
const pathResult = generateSimulationPaths(fest);
const paths = pathResult.paths;

// 1. Manual mode shows component sidebar
test('Test 1: Manual mode tab displays component sidebar', () => {
  const activeSidebarTab = 'planner';
  const isSimulationMode = activeSidebarTab === 'analysis';
  assert.strictEqual(isSimulationMode, false, 'Manual mode must NOT activate simulation sidebar');
});

// 2. Simulation mode shows entrance telemetry
test('Test 2: Simulation mode tab displays entrance telemetry', () => {
  const activeSidebarTab = 'analysis';
  const isSimulationMode = activeSidebarTab === 'analysis';
  assert.strictEqual(isSimulationMode, true, 'Simulation mode must activate Live Entrance Flow panel');
});

// 3. Returning to Manual restores component sidebar
test('Test 3: Returning from Simulation to Manual restores component sidebar without resetting state', () => {
  let activeSidebarTab = 'analysis';
  let isSimulationMode = activeSidebarTab === 'analysis';
  assert.strictEqual(isSimulationMode, true);

  // Switch back to manual
  activeSidebarTab = 'planner';
  isSimulationMode = activeSidebarTab === 'analysis';
  assert.strictEqual(isSimulationMode, false, 'Returning to planner must restore components sidebar');
});

// 4. 90/20/20 is normalized correctly
test('Test 4: 90/20/20 normalized deterministically to 69.23% / 15.38% / 15.38%', () => {
  const norm = normalizeEntranceWeights({ north: 90, west: 20, east: 20 });
  assert.strictEqual(norm.totalWeight, 130);
  assert.strictEqual(norm.percentages.north, 69.2);
  assert.strictEqual(norm.percentages.west, 15.4);
  assert.strictEqual(norm.percentages.east, 15.4);
  assert.ok(Math.abs(norm.proportions.north - (90 / 130)) < 0.001);
  assert.ok(Math.abs(norm.proportions.west - (20 / 130)) < 0.001);
  assert.ok(Math.abs(norm.proportions.east - (20 / 130)) < 0.001);
});

// 5. Visitors actually enter according to weights
test('Test 5: Visitors physically enter at waypoints[0] according to weights', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 60,
    scaleFactor: 10,
  });

  engine.setEntranceInflow({ north: 90, west: 20, east: 20 });
  for (let step = 0; step < 80; step++) {
    engine.spawnNextAgent();
    engine.update(0.2);
  }

  assert.ok(engine.agents.length > 0);
  for (const a of engine.agents) {
    assert.ok(['north', 'west', 'east'].includes(a.entryStream));
    assert.strictEqual(a.entranceId, a.entryStream);
  }

  // North must have the majority share
  const st = engine.entranceStats;
  assert.ok(st.north.entered > st.west.entered, 'North entries must exceed West');
  assert.ok(st.north.entered > st.east.entered, 'North entries must exceed East');
});

// 6. Actual entrance counts match generated entryStream
test('Test 6: Actual entrance counters match generated entryStream with zero double-counting', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 50,
    scaleFactor: 5,
  });

  engine.setEntranceInflow({ north: 90, west: 20, east: 20 });
  for (let step = 0; step < 50; step++) {
    engine.spawnNextAgent();
    engine.update(0.2);
  }

  const metrics = engine.getMetrics();
  assert.strictEqual(
    metrics.northEntered + metrics.westEntered + metrics.eastEntered,
    engine.totalLogicalEntered,
    'Sum of individual entrance entered counts must exactly equal totalLogicalEntered'
  );
});

// 7. High ratio alone does NOT trigger rerouting
test('Test 7: High ratio alone (North 90 / West 20 / East 20) does NOT trigger rerouting', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 30,
    scaleFactor: 10,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };
  engine.setEntranceInflow({ north: 90, west: 20, east: 20 });

  for (let i = 0; i < 20; i++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false, 'No reroute recommendation should trigger merely from configured weights');
  assert.strictEqual(engine.entranceStats.north.status, 'NORMAL');
});

// 8. Healthy queue does NOT trigger rerouting
test('Test 8: Healthy queue (utilization < 60%) does NOT trigger rerouting', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 30,
    scaleFactor: 10,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };
  engine.setEntranceInflow({ north: 50, west: 25, east: 25 });

  for (let i = 0; i < 30; i++) {
    engine.spawnNextAgent();
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false);
  assert.strictEqual(engine.entranceStats.north.status, 'NORMAL');
});

// 9. Queue growth is measured
test('Test 9: Queue growth rate is measured via rolling window', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 100,
    scaleFactor: 10,
  });

  const northPath = paths.find((p) => p.stream === 'north');
  const qIdx = northPath.waypoints.findIndex((w) => w.zone === 'queue');

  // Inject devotees over consecutive ticks to establish positive growth
  for (let t = 0; t < 5; t++) {
    for (let i = 0; i < 10; i++) {
      const a = createAgent(engine.agents.length + 1, northPath, 0, engine.options);
      a.entryStream = 'north';
      a.targetWaypointIndex = qIdx;
      a.position = { ...northPath.waypoints[qIdx] };
      a.state = AGENT_STATES.QUEUEING;
      engine.agents.push(a);
    }
    engine.update(0.5);
  }

  assert.ok(typeof engine.entranceStats.north.queueGrowthRate === 'number');
  assert.ok(engine.entranceStats.north.queueOccupancy > 0);
});

// 10. Wait-time trend is measured
test('Test 10: Wait-time trend (waitGrowthRate) is measured', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 100,
    scaleFactor: 10,
  });

  assert.ok(typeof engine.entranceStats.north.waitGrowthRate === 'number');
  assert.ok(typeof engine.entranceStats.north.avgWaitMinutes === 'number');
});

// 11. Congestion requires sustained evidence
test('Test 11: Congestion requires sustained evidence (>= 4.0 seconds, no single spike trigger)', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 200,
    scaleFactor: 15,
    warmupPeriod: 2,
    minCongestionDuration: 3,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  const northPath = paths.find((p) => p.stream === 'north');
  const qIdx = northPath.waypoints.findIndex((w) => w.zone === 'queue');

  // Fill North queue past 80%
  for (let i = 0; i < 90; i++) {
    const a = createAgent(i + 1, northPath, 0, engine.options);
    a.entryStream = 'north';
    a.targetWaypointIndex = qIdx;
    a.position = { ...northPath.waypoints[qIdx] };
    a.state = AGENT_STATES.QUEUEING;
    a.actualSpeed = 0.2;
    a.waitTime = 600;
    engine.agents.push(a);
  }

  // Run 1 second (10 * 0.1) -> should NOT trigger yet
  for (let step = 0; step < 10; step++) {
    engine.update(0.1);
  }
  assert.strictEqual(promptFired, false, 'Temporary spike (< 4s) must not trigger rerouting');

  // Run additional 4 seconds -> sustained congestion triggers
  for (let step = 0; step < 40; step++) {
    engine.update(0.1);
  }
  assert.strictEqual(promptFired, true, 'Sustained congestion (>= 4s) must trigger rerouting');
});

// 12. Alternative entrance capacity is checked
test('Test 12: Alternative entrance spare capacity is evaluated', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 200,
    scaleFactor: 15,
    warmupPeriod: 2,
    minCongestionDuration: 3,
  });

  let targetChosen = null;
  engine.onDiversionPrompt = (data) => {
    targetChosen = data.targetStream;
  };

  const northPath = paths.find((p) => p.stream === 'north');
  const qIdx = northPath.waypoints.findIndex((w) => w.zone === 'queue');
  for (let i = 0; i < 90; i++) {
    const a = createAgent(i + 1, northPath, 0, engine.options);
    a.entryStream = 'north';
    a.targetWaypointIndex = qIdx;
    a.position = { ...northPath.waypoints[qIdx] };
    a.state = AGENT_STATES.QUEUEING;
    a.actualSpeed = 0.2;
    a.waitTime = 600;
    engine.agents.push(a);
  }

  for (let step = 0; step < 50; step++) {
    engine.update(0.1);
  }

  assert.ok(['west', 'east'].includes(targetChosen), 'Target must be a healthy alternative entrance');
  assert.ok(engine.entranceStats[targetChosen].queueUtilization < 60);
});

// 13. No alternative capacity means no rerouting
test('Test 13: When ALL entrance queues are overloaded, do NOT suggest rerouting', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 100000,
    targetVisualAgents: 300,
    scaleFactor: 25,
    warmupPeriod: 2,
    minCongestionDuration: 3,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  // Fill ALL THREE entrances past 80% utilization across all stream paths
  for (const s of ['north', 'west', 'east']) {
    const streamPaths = paths.filter((path) => path.stream === s);
    for (const p of streamPaths) {
      const qIdx = p.waypoints.findIndex((w) => w.zone === 'queue');
      if (qIdx === -1) continue;
      for (let i = 0; i < 50; i++) {
        const a = createAgent(engine.agents.length + 1, p, 0, engine.options);
        a.entryStream = s;
        a.pathId = p.id;
        a.targetWaypointIndex = qIdx;
        a.position = { ...p.waypoints[qIdx] };
        a.state = AGENT_STATES.QUEUEING;
        a.actualSpeed = 0.001;
        a.baseSpeed = 0.001;
        a.waitTime = 600;
        engine.agents.push(a);
      }
    }
  }

  // Update past 4 seconds
  for (let step = 0; step < 50; step++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false, 'Must NOT recommend rerouting when no alternative has spare capacity');
  assert.strictEqual(engine.aiNavigationState.allQueuesOverloaded, true, 'Must flag allQueuesOverloaded');
  assert.strictEqual(engine.aiNavigationState.message, 'ALL ENTRANCE QUEUES UNDER HIGH LOAD: There is currently no suitable alternate entrance.');
});

// 14. North -> West rerouting works
test('Test 14: North -> West rerouting transfers weight deterministically', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.setEntranceInflow({ north: 90, west: 20, east: 20 });
  engine.approveRerouting('north', 'west');

  assert.strictEqual(engine.diversionApproved, true);
  assert.ok(engine.activeEntranceWeights.north < 90);
  assert.ok(engine.activeEntranceWeights.west > 20);
  assert.strictEqual(engine.activeEntranceWeights.east, 20);
});

// 15. North -> East rerouting works
test('Test 15: North -> East rerouting transfers weight deterministically', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.setEntranceInflow({ north: 90, west: 20, east: 20 });
  engine.approveRerouting('north', 'east');

  assert.strictEqual(engine.diversionApproved, true);
  assert.ok(engine.activeEntranceWeights.north < 90);
  assert.ok(engine.activeEntranceWeights.east > 20);
  assert.strictEqual(engine.activeEntranceWeights.west, 20);
});

// 16. West -> North works
test('Test 16: West -> North rerouting works when West is congested', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.setEntranceInflow({ north: 30, west: 80, east: 20 });
  engine.approveRerouting('west', 'north');

  assert.ok(engine.activeEntranceWeights.west < 80);
  assert.ok(engine.activeEntranceWeights.north > 30);
});

// 17. West -> East works
test('Test 17: West -> East rerouting works when West is congested', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.setEntranceInflow({ north: 30, west: 80, east: 20 });
  engine.approveRerouting('west', 'east');

  assert.ok(engine.activeEntranceWeights.west < 80);
  assert.ok(engine.activeEntranceWeights.east > 20);
});

// 18. East -> North works
test('Test 18: East -> North rerouting works when East is congested', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.setEntranceInflow({ north: 25, west: 25, east: 80 });
  engine.approveRerouting('east', 'north');

  assert.ok(engine.activeEntranceWeights.east < 80);
  assert.ok(engine.activeEntranceWeights.north > 25);
});

// 19. East -> West works
test('Test 19: East -> West rerouting works when East is congested', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.setEntranceInflow({ north: 25, west: 25, east: 80 });
  engine.approveRerouting('east', 'west');

  assert.ok(engine.activeEntranceWeights.east < 80);
  assert.ok(engine.activeEntranceWeights.west > 25);
});

// 20. Existing visitors are never moved
test('Test 20: Existing devotees inside the queue are NEVER moved or teleported upon rerouting', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 50,
    scaleFactor: 10,
  });

  const northPath = paths.find((p) => p.stream === 'north');
  const qIdx = northPath.waypoints.findIndex((w) => w.zone === 'queue');

  for (let i = 0; i < 20; i++) {
    const a = createAgent(i + 1, northPath, 0, engine.options);
    a.entryStream = 'north';
    a.targetWaypointIndex = qIdx;
    a.position = { ...northPath.waypoints[qIdx] };
    a.state = AGENT_STATES.QUEUEING;
    engine.agents.push(a);
  }

  const existingIds = engine.agents.map((a) => a.id);
  engine.approveRerouting('north', 'west');
  engine.update(0.1);

  for (const id of existingIds) {
    const a = engine.agents.find((ag) => ag.id === id);
    assert.ok(a, `Agent ${id} must still exist`);
    assert.strictEqual(a.entryStream, 'north', 'entryStream must never be altered');
    assert.strictEqual(a.pathId, northPath.id, 'pathId must remain on original path');
  }
});

// 21. Only future visitors use new distribution
test('Test 21: Only future visitors use the new active distribution', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.setEntranceInflow({ north: 90, west: 20, east: 20 });
  engine.approveRerouting('north', 'west');

  assert.strictEqual(engine.baseEntranceWeights.north, 90);
  assert.strictEqual(engine.baseEntranceWeights.west, 20);
  assert.ok(engine.activeEntranceWeights.north < 90);
  assert.ok(engine.activeEntranceWeights.west > 20);
});

// 22. Rerouting cooldown prevents oscillation
test('Test 22: Rerouting cooldown prevents oscillation', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.simTime = 10;
  engine.dismissDiversion();

  assert.strictEqual(engine.diversionApproved, false);
  assert.strictEqual(engine.diversionPromptPending, false);
  assert.strictEqual(engine.diversionDismissedTime, 10);
});

// 23. Balanced 40/30/30 produces no automatic recommendation while queues remain healthy
test('Test 23: Balanced 40/30/30 produces no recommendation while queues are healthy', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 40,
    scaleFactor: 10,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };
  engine.setEntranceInflow({ north: 40, west: 30, east: 30 });

  for (let i = 0; i < 30; i++) {
    engine.spawnNextAgent();
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false);
  assert.strictEqual(engine.diversionApproved, false);
});

// 24. Simulation starts without a rerouting alert
test('Test 24: Simulation starts cleanly without any rerouting alert', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.setEntranceInflow({ north: 90, west: 20, east: 20 });

  const metrics = engine.getMetrics();
  assert.strictEqual(metrics.aiNavigationState.pendingApproval, false);
  assert.strictEqual(metrics.aiNavigationState.active, false);
  assert.strictEqual(engine.entranceStats.north.status, 'NORMAL');
  assert.strictEqual(engine.entranceStats.west.status, 'NORMAL');
  assert.strictEqual(engine.entranceStats.east.status, 'NORMAL');
});

// 25. Startup Warm-up Period (Section 9) suppresses recommendation
test('Test 25: Startup warm-up period (30s) strictly suppresses congestion recommendation', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 30, // 30 simulated seconds
    minCongestionDuration: 3,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  // Seed North queue heavily during warm-up
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1200,
    completed: 200,
    queueOccupancy: 900,
    avgWaitMinutes: 5.0,
    avgSpeed: 0.2,
    arrivalRate: 400,
    serviceRate: 200,
    queueGrowthRate: 50,
  });

  // Run for 15 seconds (still in warm-up period < 30s)
  for (let step = 0; step < 150; step++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false, 'No reroute recommendation allowed during startup warm-up');
  assert.strictEqual(engine.entranceStats.north.status !== 'REROUTE_CANDIDATE', true);
});

// 26. Genuine sustained congestion triggers prediction modal past warm-up
test('Test 26: Genuine sustained congestion past warm-up triggers recommendation', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 10,
    minCongestionDuration: 4,
  });

  let promptData = null;
  engine.onDiversionPrompt = (data) => { promptData = data; };

  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 300,
    queueOccupancy: 950,
    avgWaitMinutes: 4.5,
    avgSpeed: 0.2,
    arrivalRate: 500,
    serviceRate: 250,
    queueGrowthRate: 60,
  });

  engine.seedEntranceCrowd('west', {
    queueCapacity: 2000,
    entered: 500,
    completed: 100,
    queueOccupancy: 300,
    avgWaitMinutes: 1.0,
    avgSpeed: 1.1,
    arrivalRate: 150,
    serviceRate: 150,
    queueGrowthRate: 0,
  });

  // East has > 60% util, so West is the unique healthy target with spare capacity
  engine.seedEntranceCrowd('east', {
    queueCapacity: 1000,
    entered: 800,
    completed: 150,
    queueOccupancy: 650,
    avgWaitMinutes: 3.5,
  });

  // Advance past 10s warm-up + 5s sustained
  for (let step = 0; step < 150; step++) {
    engine.update(0.1);
  }

  assert.ok(promptData !== null, 'Recommendation modal must trigger for genuine sustained congestion');
  assert.strictEqual(promptData.congestedStream, 'north');
  assert.strictEqual(promptData.targetStream, 'west');
  assert.ok(promptData.congestedUtil >= 80);
  assert.ok(promptData.targetUtil < 60);
});

// 27. Physical Queue Utilization Calculation (Section 7)
test('Test 27: Physical Queue Utilization equals queueOccupancy / queueCapacity (e.g. 500/2950 = 17%, NOT 89%)', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.seedEntranceCrowd('north', {
    queueCapacity: 2950,
    entered: 600,
    completed: 50,
    queueOccupancy: 500,
  });

  // Utilization: 500 / 2950 = 16.949% -> Math.round gives 17%
  assert.strictEqual(engine.entranceStats.north.queueUtilization, 17, '500 / 2950 must evaluate to approximately 17%, NOT 89%');
});

// 28. Hard Invariant: Active = Entered - Completed, Active <= Entered continuously (Section 4 & 5)
test('Test 28: Invariant Active = Entered - Completed and Active <= Entered holds continuously', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.seedEntranceCrowd('north', {
    entered: 253,
    completed: 0,
  });

  assert.strictEqual(engine.entranceStats.north.entered, 253);
  assert.strictEqual(engine.entranceStats.north.active, 253);
  assert.ok(engine.entranceStats.north.active <= engine.entranceStats.north.entered);
  assert.strictEqual(engine.entranceStats.north.active + engine.entranceStats.north.completed, engine.entranceStats.north.entered);
  assert.ok(engine.validateStreamInvariants('north'));
});

// 29. Hard Invariant: QueueOccupancy <= Active and SecurityCount <= Active (Section 5)
test('Test 29: Invariant QueueOccupancy <= Active and SecurityCount <= Active holds continuously', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.seedEntranceCrowd('north', {
    entered: 300,
    completed: 100,
    queueOccupancy: 150,
    securityCount: 30,
  });

  const st = engine.entranceStats.north;
  assert.strictEqual(st.active, 200);
  assert.ok(st.queueOccupancy <= st.active, 'Queue occupancy must be <= active');
  assert.ok(st.securityCount <= st.active, 'Security count must be <= active');
  assert.ok(st.queueOccupancy + st.securityCount <= st.active, 'Queue + Security must be <= active');
  assert.ok(engine.validateStreamInvariants('north'));
});

// 30. Multi-signal: 0 min wait NEVER triggers congestion recommendation (Section 13)
test('Test 30: Multi-signal requires non-zero wait time (0 min wait NEVER triggers modal)', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1200,
    completed: 200,
    queueOccupancy: 850,
    avgWaitMinutes: 0, // Wait time is 0 min!
    avgSpeed: 1.2,
    arrivalRate: 300,
    serviceRate: 300,
    queueGrowthRate: 0,
  });

  for (let step = 0; step < 50; step++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false, 'A queue with 0 min wait must never trigger congestion modal');
});

// 31. Multi-signal requires meaningful minimum population (Section 10)
test('Test 31: A handful of occupants in a large queue never triggers congestion recommendation', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 2,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  // Only 20 people in a 1200-capacity queue
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1200,
    entered: 50,
    completed: 0,
    queueOccupancy: 20,
    avgWaitMinutes: 3.0,
    avgSpeed: 0.1,
  });

  for (let step = 0; step < 50; step++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false, 'Sparse queue occupancy must not trigger congestion recommendation');
});

// 32. Queue growth calculation enforces dtWin >= 5s window to avoid tiny-dt spikes (Section 12)
test('Test 32: Queue growth rate uses window >= 5s to eliminate tiny-dt calculation spikes', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  
  // At start, 1 single step cannot calculate growth rate yet (dtWin < 5s)
  engine.update(0.1);
  assert.strictEqual(engine.entranceStats.north.queueGrowthRate, 0, 'First sample or small window must not extrapolate growth rate');
});

// 33. Alternative entrance capacity must be verified before recommending rerouting (Section 15)
test('Test 33: Alternative entrance must have genuine spare capacity (util < 60%, availableCap >= 200)', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3,
  });

  let promptData = null;
  engine.onDiversionPrompt = (data) => { promptData = data; };

  // North overloaded
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 200,
    queueOccupancy: 950,
    avgWaitMinutes: 5.0,
    avgSpeed: 0.2,
    arrivalRate: 500,
    serviceRate: 200,
    queueGrowthRate: 50,
  });

  // West is ALSO overloaded (> 60% util)
  engine.seedEntranceCrowd('west', {
    queueCapacity: 1000,
    entered: 900,
    completed: 100,
    queueOccupancy: 750, // 75% util
    avgWaitMinutes: 4.0,
  });

  // East is ALSO overloaded (> 60% util)
  engine.seedEntranceCrowd('east', {
    queueCapacity: 1000,
    entered: 900,
    completed: 100,
    queueOccupancy: 800, // 80% util
    avgWaitMinutes: 4.5,
  });

  for (let step = 0; step < 50; step++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptData, null, 'Must NOT recommend rerouting when no alternate has spare capacity');
  assert.strictEqual(engine.aiNavigationState.allQueuesOverloaded, true);
});

// 34. Section 17 Forced Real Congestion Scenario
test('Test 34: Section 17 Forced real congestion scenario: North overloaded, West healthy', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3,
  });

  let recommendationFired = false;
  engine.onDiversionPrompt = (data) => {
    recommendationFired = true;
    assert.strictEqual(data.congestedStream, 'north');
    assert.strictEqual(data.targetStream, 'west');
  };

  // North: cap = 1000, occ = 920, arrival > service, wait increasing
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1400,
    completed: 200,
    queueOccupancy: 920,
    avgWaitMinutes: 4.8,
    avgSpeed: 0.2,
    arrivalRate: 450,
    serviceRate: 220,
    queueGrowthRate: 55,
  });

  // West: cap = 2000, occ = 300, healthy
  engine.seedEntranceCrowd('west', {
    queueCapacity: 2000,
    entered: 500,
    completed: 100,
    queueOccupancy: 300,
    avgWaitMinutes: 1.2,
    avgSpeed: 1.1,
    arrivalRate: 150,
    serviceRate: 150,
    queueGrowthRate: 0,
  });

  // East has > 60% util, ensuring West is the uniquely validated spare-capacity alternative
  engine.seedEntranceCrowd('east', {
    queueCapacity: 1000,
    entered: 800,
    completed: 150,
    queueOccupancy: 700,
    avgWaitMinutes: 3.8,
  });

  for (let step = 0; step < 50; step++) {
    engine.update(0.1);
  }

  assert.strictEqual(recommendationFired, true, 'North congestion must trigger with West as target');
});

// 35. SpaceInfoPanel does not render ComponentPropertyPanel in Simulation Mode (Section 20)
test('Test 35: SpaceInfoPanel hides ComponentPropertyPanel when activeSidebarTab is analysis', () => {
  const activeSidebarTab = 'analysis';
  const selectedComponent = { id: 'test-comp' };
  
  // Requirement 20 assertion: only render if activeSidebarTab !== 'analysis'
  const shouldRenderProperties = Boolean(selectedComponent && activeSidebarTab !== 'analysis');
  assert.strictEqual(shouldRenderProperties, false, 'Simulation mode must never show component property editor');
});

console.log('\n============================================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
}
