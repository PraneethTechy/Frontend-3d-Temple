/**
 * DevaSetu 100K Festival Campus Crowd-State & Visual Synchronization Test Suite
 * 
 * Verifies all 12 requirements from the User Request:
 * 1. entered count is cumulative
 * 2. active count is correct
 * 3. completed count is correct
 * 4. entrance-specific counts are correct
 * 5. actual share is derived from simulation state
 * 6. visual representation is proportional
 * 7. visual agent pool remains bounded
 * 8. agents are not duplicated
 * 9. agents are not teleported between entrance streams
 * 10. queue occupancy comes from actual state
 * 11. recycling preserves valid entrance/path metadata
 * 12. 100K logical visitors do not create 100K visual agents
 */

import assert from 'assert';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import { AGENT_STATES, createAgent } from './src/features/simulation/simulationModel.js';

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
console.log('DevaSetu 100K Crowd-State & Visual Synchronization Verification Suite');
console.log('========================================================================\n');

const fest = generateFestivalScenario();
const pathResult = generateSimulationPaths(fest);
const paths = pathResult.paths;

// 1. entered count is cumulative
test('Test 1: Entered count is cumulative and non-decreasing', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 60,
  });

  engine.setArrivalRate(600); // 10 devotees/sec
  let lastEntered = 0;

  for (let step = 0; step < 30; step++) {
    engine.update(0.2);
    const m = engine.getMetrics();
    assert.ok(m.totalEntered >= lastEntered, `Entered (${m.totalEntered}) must be >= previous (${lastEntered})`);
    assert.ok(engine.entranceStats.north.entered >= 0);
    assert.ok(engine.entranceStats.west.entered >= 0);
    assert.ok(engine.entranceStats.east.entered >= 0);
    lastEntered = m.totalEntered;
  }
  assert.ok(lastEntered > 0, 'Total entered should have accumulated over time');
});

// 2. active count is correct
test('Test 2: Active count is correct (Active = Entered - Completed, Active <= Entered)', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 60,
  });

  engine.seedEntranceCrowd('north', { entered: 500, completed: 150 });
  engine.seedEntranceCrowd('west', { entered: 300, completed: 80 });
  engine.seedEntranceCrowd('east', { entered: 200, completed: 50 });

  engine.update(0.1);

  const m = engine.getMetrics();
  for (const s of ['north', 'west', 'east']) {
    const st = engine.entranceStats[s];
    assert.strictEqual(st.active, st.entered - st.completed, `${s} active must equal entered - completed`);
    assert.ok(st.active <= st.entered, `${s} active (${st.active}) must be <= entered (${st.entered})`);
  }

  assert.strictEqual(m.activeCrowd, m.totalEntered - m.completedCrowd);
  assert.ok(m.activeCrowd <= m.totalEntered);
});

// 3. completed count is correct
test('Test 3: Completed count is correct (Completed <= Entered, Entered === Active + Completed)', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 80,
  });

  engine.addCrowdBatch(2000);
  engine.update(0.1);

  for (const s of ['north', 'west', 'east']) {
    const st = engine.entranceStats[s];
    assert.ok(st.completed <= st.entered, `${s} completed <= entered`);
    assert.strictEqual(st.entered, st.active + st.completed, `${s} entered must equal active + completed`);
  }

  const m = engine.getMetrics();
  assert.ok(m.completedCrowd <= m.totalEntered);
  assert.strictEqual(m.totalEntered, m.activeCrowd + m.completedCrowd);
});

// 4. entrance-specific counts are correct
test('Test 4: Entrance-specific counts are correct (Campus sum === sum of entrances)', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 100,
  });

  engine.seedEntranceCrowd('north', { entered: 1200, completed: 200, queueOccupancy: 800 });
  engine.seedEntranceCrowd('west', { entered: 600, completed: 100, queueOccupancy: 400 });
  engine.seedEntranceCrowd('east', { entered: 400, completed: 50, queueOccupancy: 250 });

  engine.update(0.1);

  const st = engine.entranceStats;
  const m = engine.getMetrics();

  const expectedEntered = st.north.entered + st.west.entered + st.east.entered;
  const expectedActive = st.north.active + st.west.active + st.east.active;
  const expectedCompleted = st.north.completed + st.west.completed + st.east.completed;
  const expectedQueue = st.north.queueOccupancy + st.west.queueOccupancy + st.east.queueOccupancy;

  assert.strictEqual(m.totalEntered, expectedEntered, 'Total entered must equal sum of entrance entered');
  assert.strictEqual(m.activeCrowd, expectedActive, 'Active crowd must equal sum of entrance active');
  assert.strictEqual(m.completedCrowd, expectedCompleted, 'Completed crowd must equal sum of entrance completed');
  assert.strictEqual(m.visitorsInQueue, expectedQueue, 'In queue count must equal sum of entrance queueOccupancy');
});

// 5. actual share is derived from simulation state
test('Test 5: Actual share is derived strictly from simulation state, NOT static weights alone', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 60,
  });

  // Seed actual observed entries: North = 600, West = 250, East = 150 (Total = 1000)
  engine.seedEntranceCrowd('north', { entered: 600, completed: 0 });
  engine.seedEntranceCrowd('west', { entered: 250, completed: 0 });
  engine.seedEntranceCrowd('east', { entered: 150, completed: 0 });

  engine.update(0.1);

  const st = engine.entranceStats;
  assert.strictEqual(st.north.share, 60.0, 'North share must be 60.0% based on 600/1000');
  assert.strictEqual(st.west.share, 25.0, 'West share must be 25.0% based on 250/1000');
  assert.strictEqual(st.east.share, 15.0, 'East share must be 15.0% based on 150/1000');
});

// 6. visual representation is proportional
test('Test 6: Visual representation is proportional to active logical crowd', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 15000,
    targetVisualAgents: 100,
  });

  // North active: 6000 (60%), West active: 2000 (20%), East active: 2000 (20%)
  engine.seedEntranceCrowd('north', { entered: 6000, completed: 0 });
  engine.seedEntranceCrowd('west', { entered: 2000, completed: 0 });
  engine.seedEntranceCrowd('east', { entered: 2000, completed: 0 });

  // Spawn visual agents and step simulation so devotees progress along paths
  for (let i = 0; i < 250; i++) {
    engine.spawnNextAgent();
    engine.update(0.2);
  }

  const northVisual = engine.agents.filter((a) => a.entryStream === 'north').length;
  const westVisual = engine.agents.filter((a) => a.entryStream === 'west').length;
  const eastVisual = engine.agents.filter((a) => a.entryStream === 'east').length;
  const totalVisual = engine.agents.length;

  assert.ok(totalVisual > 20, 'Visual agents must be spawned');
  // North has 60% of active crowd, West 20%, East 20%
  // North visual count must be significantly higher than West and East
  assert.ok(northVisual > westVisual, `North (${northVisual}) must be greater than West (${westVisual})`);
  assert.ok(northVisual > eastVisual, `North (${northVisual}) must be greater than East (${eastVisual})`);
  const northRatio = northVisual / totalVisual;
  assert.ok(northRatio >= 0.35, `North visual ratio (${northRatio.toFixed(2)}) must reflect primary crowd concentration`);
});

// 7. visual agent pool remains bounded
test('Test 7: Visual agent pool remains strictly bounded under continuous arrival', () => {
  const maxPool = 120;
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 50000,
    targetVisualAgents: maxPool,
  });

  engine.setArrivalRate(1200);

  // Run 100 steps
  for (let step = 0; step < 100; step++) {
    engine.update(0.2);
    assert.ok(
      engine.agents.length <= maxPool,
      `Visual agent count (${engine.agents.length}) must never exceed targetVisualAgents (${maxPool})`
    );
  }
});

// 8. agents are not duplicated
test('Test 8: Visual agents are not duplicated (unique IDs and unique visitorRepresentativeId)', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 100,
  });

  for (let i = 0; i < 120; i++) {
    engine.spawnNextAgent();
  }

  const ids = engine.agents.map((a) => a.id);
  const repIds = engine.agents.map((a) => a.visitorRepresentativeId);

  assert.strictEqual(new Set(ids).size, ids.length, 'All visual agent IDs must be unique');
  assert.strictEqual(new Set(repIds).size, repIds.length, 'All visitorRepresentativeIds must be unique');
});

// 9. agents are not teleported between entrance streams
test('Test 9: Existing devotees inside queue are never teleported between streams when ratios change', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 60,
  });

  engine.setEntranceInflow({ north: 80, west: 10, east: 10 });
  for (let i = 0; i < 40; i++) {
    engine.spawnNextAgent();
  }

  const initialStreams = new Map();
  for (const a of engine.agents) {
    initialStreams.set(a.id, a.entryStream);
  }

  // Drastically shift distribution to West
  engine.setEntranceInflow({ north: 10, west: 80, east: 10 });

  // Update simulation
  for (let i = 0; i < 20; i++) {
    engine.update(0.1);
  }

  // Check that NO existing active agent had its entryStream changed or teleported
  for (const a of engine.agents) {
    if (initialStreams.has(a.id)) {
      assert.strictEqual(
        a.entryStream,
        initialStreams.get(a.id),
        `Agent ${a.id} must retain original entryStream ${initialStreams.get(a.id)}`
      );
    }
  }
});

// 10. queue occupancy comes from actual state
test('Test 10: Queue occupancy comes from actual simulation state (0 people in queue = 0 occupancy)', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 50,
  });

  // Seed entrance with devotees, but NO visual agents in queue
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 500,
    completed: 0,
    // customOccupancy not set, so it computes from visual agents
  });

  // Empty agents array
  engine.agents = [];
  engine.update(0.1);

  const st = engine.entranceStats.north;
  assert.strictEqual(st.queueOccupancy, 0, 'Empty queue with 0 visual devotees must report 0 occupancy');
  assert.strictEqual(st.queueUtilization, 0, 'Empty queue must report 0% utilization');
});

// 11. recycling preserves valid entrance/path metadata
test('Test 11: Agent recycling preserves valid entrance, stream, zone, and representative metadata', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: 50,
  });

  const agent = engine.spawnNextAgent();
  assert.ok(agent !== null, 'Spawned agent must not be null');
  assert.ok(agent.visitorRepresentativeId.startsWith('REP-'), 'Must have REP- prefix');
  assert.ok(['north', 'west', 'east'].includes(agent.entryStream));
  assert.ok(['north', 'west', 'east'].includes(agent.streamId));
  assert.strictEqual(agent.logicalState, AGENT_STATES.ENTERING);
  assert.ok(agent.currentZone === 'entrance' || agent.currentZone === 'approach');
  assert.ok(agent.representedDevotees >= 1);
  assert.ok(agent.pathId !== undefined);
});

// 12. 100K logical visitors do not create 100K visual agents
test('Test 12: 100K logical visitors do not create 100K visual agents (bounded pool with explicit representation ratio)', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 100000,
    targetVisualAgents: 300,
  });

  // Inject large logical crowd
  engine.addCrowdBatch(50000);
  engine.addCrowdBatch(50000);

  engine.update(0.1);

  const m = engine.getMetrics();
  assert.ok(m.totalEntered >= 100000, 'Total entered must be >= 100,000');
  assert.ok(engine.agents.length <= 300, `Visual agents (${engine.agents.length}) must be <= 300`);

  // Representation ratio must be mathematically explicit: e.g. 100,000 / 300 ≈ 333
  const expectedRatio = Math.round((m.activeCrowd / Math.max(1, engine.agents.length)) * 10) / 10;
  assert.strictEqual(m.representationRatio, expectedRatio, 'Representation ratio must match activeCrowd / visualCount');
  assert.ok(m.representationRatio > 100, `Representation ratio (${m.representationRatio}) must reflect 100K crowd scaling`);
});

console.log(`\n========================================================================`);
console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================================================\n`);

if (failed > 0) {
  process.exit(1);
}
