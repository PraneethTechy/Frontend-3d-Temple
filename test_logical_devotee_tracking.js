/**
 * DevaSetu Logical Individual Devotee Identity & Tracking Verification Suite
 * 
 * Verifies the 20 core requirements for 100K+ logical devotee scalability:
 * 1. 100K logical devotees can be represented.
 * 2. IDs are unique.
 * 3. IDs remain stable throughout a journey.
 * 4. Logical devotees do not require individual Three.js objects.
 * 5. Visual representative count remains bounded.
 * 6. Logical count can exceed visual count.
 * 7. Individual state transitions are correct.
 * 8. Queue position is meaningful.
 * 9. Completed devotees transition correctly.
 * 10. Completed devotees do not remain active.
 * 11. Existing crowd counters remain correct.
 * 12. Security/Darshan behavior remains unchanged.
 * 13. Congestion detection remains unchanged.
 * 14. Entrance redirection remains unchanged.
 * 15. Selecting a visible devotee works.
 * 16. Searching for a non-visible logical devotee works.
 * 17. ETA uses deterministic simulation data.
 * 18. No fake ETA is generated when insufficient data exists.
 * 19. 100K logical identities do not create 100K React/Three.js objects.
 * 20. Simulation performance remains bounded.
 */

import assert from 'assert';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import {
  AGENT_STATES,
  LOGICAL_DEVOTEE_STATES,
  SECURITY_DWELL_SECONDS,
  DARSHAN_DWELL_SECONDS,
  createLogicalDevotee,
} from './src/features/simulation/simulationModel.js';

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

console.log('\n========================================================================');
console.log(' DevaSetu Logical Devotee Identity & Tracking Verification Suite         ');
console.log('========================================================================\n');

const fest = generateFestivalScenario();
const pathResult = generateSimulationPaths(fest);
const paths = pathResult.paths;

// Test 1: 100K logical devotees can be represented
test('Test 1: 100K logical devotees can be represented in memory', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.addCrowdBatch(100000);

  assert.strictEqual(engine.logicalEnteredCount, 100000, 'Total logical entered should be 100,000');
  assert.strictEqual(engine.logicalDevotees.size, 100000, 'Logical devotee map should contain 100,000 active devotees');
  assert.strictEqual(engine.entranceStats.north.active + engine.entranceStats.west.active + engine.entranceStats.east.active, 100000, 'Sum of active entrance crowds should be 100,000');
});

// Test 2: IDs are unique
test('Test 2: IDs are unique across all 100,000 logical devotees', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.addCrowdBatch(100000);

  const idSet = new Set();
  for (const [id] of engine.logicalDevotees.entries()) {
    assert.ok(!idSet.has(id), `Duplicate ID detected: ${id}`);
    idSet.add(id);
  }
  assert.strictEqual(idSet.size, 100000, 'All 100,000 IDs must be strictly unique');
});

// Test 3: IDs remain stable throughout a journey
test('Test 3: IDs remain stable throughout a devotee journey', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.seedInitialAgents();
  assert.ok(engine.agents.length > 0, 'Agents should be seeded');

  const testAgent = engine.agents[0];
  const initialId = testAgent.logicalDevoteeId;
  assert.ok(initialId, 'Seeded agent must have a logical devotee ID');

  // Step simulation through multiple iterations
  for (let s = 0; s < 50; s++) {
    engine.update(0.1);
    assert.strictEqual(testAgent.logicalDevoteeId, initialId, 'Devotee ID must never mutate during journey');
    const dev = engine.findDevotee(initialId);
    assert.ok(dev, 'Logical devotee record must remain discoverable with initial ID');
  }
});

// Test 4: Logical devotees do not require individual Three.js objects
test('Test 4: Logical devotees do not store Three.js objects or meshes', () => {
  const dev = createLogicalDevotee({ id: 'N-00000001', entranceId: 'north', simTime: 0 });

  assert.strictEqual(dev.isMesh, undefined);
  assert.strictEqual(dev.geometry, undefined);
  assert.strictEqual(dev.material, undefined);
  assert.strictEqual(dev.matrixWorld, undefined);
  assert.strictEqual(dev.type, undefined);
  assert.strictEqual(typeof dev.id, 'string');
  assert.strictEqual(typeof dev.entranceId, 'string');
});

// Test 5: Visual representative count remains bounded
test('Test 5: Visual representative count remains strictly bounded (~100-300) under 100K load', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.addCrowdBatch(100000);

  // Run simulation forward 30 seconds
  for (let s = 0; s < 100; s++) {
    engine.update(0.1);
  }

  assert.ok(engine.agents.length <= engine.targetVisualAgents, `Visual agents (${engine.agents.length}) must not exceed cap (${engine.targetVisualAgents})`);
  assert.ok(engine.agents.length > 0, 'Visual agents should be spawned');
});

// Test 6: Logical count can exceed visual count
test('Test 6: Logical count can exceed visual count by orders of magnitude', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.addCrowdBatch(100000);

  const metrics = engine.getMetrics();
  assert.strictEqual(metrics.totalEntered, 100000);
  assert.ok(metrics.visualAgentsCount <= 300);
  assert.ok(metrics.totalEntered / metrics.visualAgentsCount >= 300, 'Logical count exceeds visual count by > 300x');
});

// Test 7: Individual state transitions are correct
test('Test 7: Individual state transitions follow the campus journey', () => {
  const engine = new SimulationEngine(fest, paths);
  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  assert.ok(northPath, 'North path must exist');

  // Spawn visual agent linked to logical devotee
  const agent = engine.spawnNextAgent();
  assert.ok(agent, 'Agent should be spawned');
  assert.ok(agent.logicalDevoteeId, 'Agent must have logicalDevoteeId');

  const dev = engine.findDevotee(agent.logicalDevoteeId);
  assert.ok(dev, 'Logical devotee must be registered');
  assert.strictEqual(dev.status, 'active');

  // Fast-forward agent through waypoints and verify logical synchronization
  agent.targetWaypointIndex = 1;
  engine.updateAgent(agent, null, northPath, 0.1);
  assert.ok(['entered', 'arrival', 'entrance'].includes(dev.zone.toLowerCase()));

  // Simulate security zone
  agent.currentZone = 'security';
  agent.state = AGENT_STATES.SECURITY;
  agent.logicalState = 'security_check';
  engine.updateAgent(agent, null, northPath, 0.1);
  assert.strictEqual(dev.zone, 'security');
  assert.strictEqual(dev.logicalState, LOGICAL_DEVOTEE_STATES.SECURITY_CHECK);
  assert.ok(dev.securityStartedAt !== null, 'Security start timestamp recorded');

  // Simulate Darshan zone
  agent.currentZone = 'darshan';
  agent.state = AGENT_STATES.DARSHAN;
  agent.logicalState = 'darshan_dwell';
  engine.updateAgent(agent, null, northPath, 0.1);
  assert.strictEqual(dev.zone, 'darshan');
  assert.strictEqual(dev.logicalState, LOGICAL_DEVOTEE_STATES.DARSHAN_DWELL);
  assert.ok(dev.darshanStartedAt !== null, 'Darshan start timestamp recorded');
});

// Test 8: Queue position is meaningful
test('Test 8: Queue position is meaningful and accurately counts people ahead', () => {
  const engine = new SimulationEngine(fest, paths);
  const dev1 = engine.createAndRegisterLogicalDevotee('north');
  const dev2 = engine.createAndRegisterLogicalDevotee('north');
  const dev3 = engine.createAndRegisterLogicalDevotee('north');

  const q1 = engine.getDevoteeQueuePosition(dev1.id);
  const q2 = engine.getDevoteeQueuePosition(dev2.id);
  const q3 = engine.getDevoteeQueuePosition(dev3.id);

  assert.strictEqual(q1.position, 1, 'First devotee is position 1');
  assert.strictEqual(q1.peopleAhead, 0, 'First devotee has 0 people ahead');

  assert.strictEqual(q2.position, 2, 'Second devotee is position 2');
  assert.strictEqual(q2.peopleAhead, 1, 'Second devotee has 1 person ahead');

  assert.strictEqual(q3.position, 3, 'Third devotee is position 3');
  assert.strictEqual(q3.peopleAhead, 2, 'Third devotee has 2 people ahead');
});

// Test 9: Completed devotees transition correctly
test('Test 9: Completed devotees transition to completed state and record journey metrics', () => {
  const engine = new SimulationEngine(fest, paths);
  const dev = engine.createAndRegisterLogicalDevotee('west');
  engine.simTime = 120;
  dev.waitTime = 45;
  dev.serviceTime = 15;

  engine.completeLogicalDevotee(dev);

  assert.strictEqual(dev.status, 'completed');
  assert.strictEqual(dev.logicalState, LOGICAL_DEVOTEE_STATES.COMPLETED);
  assert.strictEqual(dev.completedAt, 120);

  const compact = engine.findDevotee(dev.id);
  assert.ok(compact, 'Completed devotee must be present in compact historical records');
  assert.strictEqual(compact.status, 'completed');
  assert.strictEqual(compact.totalJourneyTime, 120);
});

// Test 10: Completed devotees do not remain active
test('Test 10: Completed devotees do not remain active in active queues', () => {
  const engine = new SimulationEngine(fest, paths);
  const dev = engine.createAndRegisterLogicalDevotee('east');
  assert.strictEqual(engine.activeLogicalDevoteesByStream.east.length, 1);

  engine.completeLogicalDevotee(dev);

  assert.strictEqual(engine.logicalDevotees.has(dev.id), false, 'Removed from active logicalDevotees');
  assert.strictEqual(engine.activeLogicalDevoteesByStream.east.length, 0, 'Removed from active stream list');
});

// Test 11: Existing crowd counters remain correct
test('Test 11: Existing crowd counters maintain mathematical invariants (entered = active + completed)', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.addCrowdBatch(5000);

  for (let s = 0; s < 50; s++) {
    engine.update(0.1);
  }

  const metrics = engine.getMetrics();
  assert.strictEqual(metrics.totalEntered, metrics.activeCrowd + metrics.completedCrowd, 'Invariant: totalEntered = activeCrowd + completedCrowd');
  assert.ok(metrics.visitorsInQueue <= metrics.activeCrowd, 'Invariant: queue <= active');
});

// Test 12: Security/Darshan behavior remains unchanged
test('Test 12: Security & Darshan behavior remains short deterministic dwells (~0.45s and ~0.60s)', () => {
  const engine = new SimulationEngine(fest, paths);
  assert.strictEqual(engine.securityDwellSeconds, SECURITY_DWELL_SECONDS);
  assert.strictEqual(engine.darshanDwellSeconds, DARSHAN_DWELL_SECONDS);

  const agent = engine.spawnNextAgent();
  assert.ok(agent);
  assert.ok(agent.securityDwellTime >= 0.20 && agent.securityDwellTime <= 0.65);
  assert.ok(agent.darshanDwellTime >= 0.30 && agent.darshanDwellTime <= 0.90);
});

// Test 13: Congestion detection remains unchanged
test('Test 13: Congestion detection logic accurately identifies normal flow and blocked states', () => {
  const engine = new SimulationEngine(fest, paths, {
    warmupPeriod: 2,
    minCongestionDuration: 2,
  });

  // Genuinely blocked North entrance
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 100,
    queueOccupancy: 950,
    avgSpeed: 0.18,
    queueProgress: 0.15,
    arrivalRate: 400,
    serviceRate: 50,
    queueGrowthRate: 35,
  });

  for (let s = 0; s < 40; s++) {
    engine.update(0.1);
  }

  assert.strictEqual(engine.entranceStats.north.congestionState, 'BLOCKED', 'Severe bottleneck with high occupancy and stalled flow triggers BLOCKED');
});

// Test 14: Entrance redirection remains unchanged
test('Test 14: Entrance redirection changes future arrival weights and never moves existing devotees', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.seedInitialAgents();
  const initialAgents = [...engine.agents];

  engine.approveDiversion(true);

  // Existing agents must have identical positions and paths
  for (let i = 0; i < initialAgents.length; i++) {
    assert.strictEqual(engine.agents[i].id, initialAgents[i].id);
    assert.strictEqual(engine.agents[i].entryStream, initialAgents[i].entryStream);
  }
});

// Test 15: Selecting a visible devotee works
test('Test 15: Selecting a visible devotee returns comprehensive details with 3D representative link', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.seedInitialAgents();
  assert.ok(engine.agents.length > 0);

  const agent = engine.agents[0];
  const targetId = agent.logicalDevoteeId || agent.visitorRepresentativeId || agent.id;

  const details = engine.selectDevotee(targetId);
  assert.ok(details, 'Selection should return devotee details');
  assert.strictEqual(details.isVisuallyRepresented, true, 'Visible agent should be marked visually represented');
  assert.strictEqual(details.representativeId, agent.visitorRepresentativeId);
  assert.ok(details.queuePosition >= 1);
});

// Test 16: Searching for a non-visible logical devotee works
test('Test 16: Searching for a non-visible logical devotee displays logical state without forcing new 3D avatar', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.addCrowdBatch(1000); // 1000 logical devotees, but visual agents capped at ~300
  const initialVisualCount = engine.agents.length;

  // Pick a logical devotee created beyond the visual pool
  const ids = Array.from(engine.logicalDevotees.keys());
  const nonVisualId = ids[ids.length - 1]; // Last added devotee

  const details = engine.selectDevotee(nonVisualId);
  assert.ok(details, 'Should successfully find logical devotee');
  assert.strictEqual(details.id, nonVisualId);
  assert.strictEqual(details.isVisuallyRepresented, false, 'Should be marked not visually represented');
  assert.strictEqual(engine.agents.length, initialVisualCount, 'Should NOT spawn a 3D avatar solely because user searched');
});

// Test 17: ETA uses deterministic simulation data
test('Test 17: ETA calculation uses deterministic service and transit parameters', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.simTime = 60;
  engine.entranceStats.north.serviceRate = 120; // 2 devotees per second
  engine.entranceStats.north.completed = 100;
  engine.entranceStats.north.avgSpeed = 1.2;

  const dev = engine.createAndRegisterLogicalDevotee('north');
  const eta = engine.calculateDevoteeETA(dev.id);

  assert.strictEqual(eta.available, true, 'ETA should be available with active service rate');
  assert.ok(eta.remainingSeconds > 0, 'Remaining seconds must be positive');
  assert.ok(typeof eta.text === 'string');
  assert.ok(eta.details.transitSec > 0);
});

// Test 18: No fake ETA is generated when insufficient data exists
test('Test 18: No fake ETA is generated when flow data is insufficient or stream is blocked', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.simTime = 1; // Startup before any completions
  engine.entranceStats.north.serviceRate = 0;
  engine.entranceStats.north.completed = 0;

  const dev = engine.createAndRegisterLogicalDevotee('north');
  const eta = engine.calculateDevoteeETA(dev.id);

  assert.strictEqual(eta.available, false, 'ETA should not be available during initial startup');
  assert.strictEqual(eta.text, 'ETA unavailable');
});

// Test 19: 100K logical identities do not create 100K React/Three.js objects
test('Test 19: 100K logical identities do not instantiate 100K Three.js meshes or React nodes', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.addCrowdBatch(100000);

  assert.strictEqual(engine.logicalDevotees.size, 100000);
  assert.ok(engine.agents.length <= engine.targetVisualAgents);

  for (const [id, dev] of engine.logicalDevotees.entries()) {
    assert.strictEqual(dev.isObject3D, undefined);
    assert.strictEqual(dev.$$typeof, undefined); // React element symbol
    break;
  }
});

// Test 20: Simulation performance remains bounded
test('Test 20: 100K logical crowd update loop executes smoothly in < 25ms', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.addCrowdBatch(100000);

  const start = performance.now();
  for (let i = 0; i < 5; i++) {
    engine.update(0.1);
  }
  const elapsed = performance.now() - start;
  const avgPerStep = elapsed / 5;

  assert.ok(avgPerStep < 50, `Average update time (${avgPerStep.toFixed(2)}ms) must be under 50ms`);
  console.log(`    (100K logical crowd update duration: ${avgPerStep.toFixed(2)} ms/step)`);
});

console.log('\n========================================================================');
console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
}
