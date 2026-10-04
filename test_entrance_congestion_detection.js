/**
 * DevaSetu Entrance Congestion Detection & Real-State Redirection Verification Suite
 * 
 * Verifies all 20 requirements:
 * 1. 90/20/20 distribution does NOT trigger immediate redirection.
 * 2. High configured percentage alone does NOT trigger congestion.
 * 3. High utilization alone does NOT trigger redirection.
 * 4. Flowing queue does NOT trigger redirection.
 * 5. Temporary slowdown does NOT trigger redirection.
 * 6. Persistent blocked queue triggers congestion detection.
 * 7. Blocked queue with no suitable alternative does NOT trigger redirection.
 * 8. Blocked North + healthy West triggers North -> West recommendation.
 * 9. Blocked North + healthy East triggers North -> East recommendation.
 * 10. Blocked West + healthy North can trigger West -> North.
 * 11. Blocked East + healthy North can trigger East -> North.
 * 12. Any entrance can become the congested source.
 * 13. Existing devotees are never reassigned.
 * 14. Accepted redirection affects only future arrivals.
 * 15. Declining a recommendation does not repeatedly spam the same popup.
 * 16. Recovery clears the congestion state.
 * 17. New congestion after recovery can create a new recommendation.
 * 18. Logical crowd counts remain unchanged by the recommendation itself.
 * 19. Visual representative count remains bounded.
 * 20. Existing entrance telemetry remains correct.
 */

import assert from 'assert';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
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
    console.error(`    ${err.stack || err.message}`);
    failed++;
  }
}

console.log('\n========================================================================');
console.log(' DevaSetu Entrance Congestion Detection & Real-State Verification Suite  ');
console.log('========================================================================\n');

const fest = generateFestivalScenario();
const pathResult = generateSimulationPaths(fest);
const paths = pathResult.paths;

// Test 1: 90/20/20 distribution does NOT trigger immediate redirection
test('Test 1: 90/20/20 distribution does NOT trigger immediate redirection', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 5,
    minCongestionDuration: 4,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };
  engine.setEntranceInflow({ north: 90, west: 20, east: 20 });

  for (let i = 0; i < 30; i++) {
    engine.spawnNextAgent();
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false, 'No redirection prompt should trigger at start with 90/20/20 distribution');
  assert.strictEqual(engine.diversionPromptPending, false);
  assert.strictEqual(engine.entranceStats.north.congestionState !== 'BLOCKED', true);
});

// Test 2: High configured percentage alone does NOT trigger congestion
test('Test 2: High configured percentage alone does NOT trigger congestion', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };
  // Extreme configuration: 100% North
  engine.setEntranceInflow({ north: 100, west: 0, east: 0 });

  for (let i = 0; i < 30; i++) {
    engine.spawnNextAgent();
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false, 'Extreme configured percentage alone must not trigger redirection');
  assert.ok(engine.entranceStats.north.congestionState !== 'BLOCKED');
});

// Test 3: High utilization alone does NOT trigger redirection
test('Test 3: High utilization alone does NOT trigger redirection if queue is flowing normally', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  // 85% utilization, but flowing at full speed with low dwell
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1200,
    completed: 200,
    queueOccupancy: 850,
    avgWaitMinutes: 0.5,
    avgSpeed: 1.2,
    arrivalRate: 400,
    serviceRate: 400,
    queueGrowthRate: 0,
  });

  for (let i = 0; i < 50; i++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false, 'High queue population that is flowing at 1.2 m/s must NOT trigger redirection');
  assert.strictEqual(engine.entranceStats.north.congestionState, 'FLOWING');
  assert.strictEqual(engine.entranceStats.north.blockedDuration, 0);
});

// Test 4: Flowing queue does NOT trigger redirection
test('Test 4: Flowing queue (queueProgress >= 0.70) does NOT trigger redirection', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1400,
    completed: 400,
    queueOccupancy: 880,
    avgWaitMinutes: 1.0,
    avgSpeed: 1.0,
    queueProgress: 0.83,
    arrivalRate: 300,
    serviceRate: 300,
    queueGrowthRate: 0,
  });

  for (let i = 0; i < 50; i++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false, 'Flowing queue with good progress must not trigger redirection');
  assert.strictEqual(engine.entranceStats.north.congestionState !== 'BLOCKED', true);
});

// Test 5: Temporary slowdown does NOT trigger redirection
test('Test 5: Temporary slowdown (< minCongestionDuration) does NOT trigger redirection', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 6.0,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  // Blocked condition
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 200,
    queueOccupancy: 950,
    avgWaitMinutes: 4.0,
    avgSpeed: 0.2,
    arrivalRate: 500,
    serviceRate: 200,
    queueGrowthRate: 40,
  });

  // Advance simulation past warmup (2s) but only 3s into congestion (< 6s persistence)
  for (let i = 0; i < 40; i++) {
    engine.update(0.1); // total 4s
  }

  assert.strictEqual(promptFired, false, 'Temporary slowdown must not trigger redirection before minimum observation period');
  assert.ok(engine.entranceStats.north.blockedDuration > 0, 'Blocked duration should be accumulating');
  assert.ok(engine.entranceStats.north.blockedDuration < 6.0);
});

// Test 6: Persistent blocked queue triggers congestion detection
test('Test 6: Persistent blocked queue (>= minCongestionDuration) triggers congestion detection', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 4.0,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 200,
    queueOccupancy: 950,
    avgWaitMinutes: 4.5,
    avgSpeed: 0.2,
    arrivalRate: 500,
    serviceRate: 200,
    queueGrowthRate: 50,
  });

  // West has spare capacity
  engine.seedEntranceCrowd('west', {
    queueCapacity: 1500,
    entered: 300,
    completed: 100,
    queueOccupancy: 200,
    avgWaitMinutes: 1.0,
    avgSpeed: 1.1,
    arrivalRate: 100,
    serviceRate: 100,
    queueGrowthRate: 0,
  });

  // Advance past 2s warmup + 5s sustained
  for (let i = 0; i < 70; i++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, true, 'Persistent blocked queue past observation period must trigger recommendation');
  assert.strictEqual(engine.entranceStats.north.congestionState, 'BLOCKED');
  assert.ok(engine.entranceStats.north.blockedDuration >= 4.0);
});

// Test 7: Blocked queue with no suitable alternative does NOT trigger redirection
test('Test 7: Blocked queue with no suitable alternative does NOT trigger redirection', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3.0,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  // North is blocked
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 200,
    queueOccupancy: 950,
    avgWaitMinutes: 4.5,
    avgSpeed: 0.2,
    arrivalRate: 500,
    serviceRate: 200,
    queueGrowthRate: 50,
  });

  // West is ALSO overloaded (util >= 60%)
  engine.seedEntranceCrowd('west', {
    queueCapacity: 1000,
    entered: 900,
    completed: 100,
    queueOccupancy: 750, // 75%
    avgWaitMinutes: 3.8,
  });

  // East is ALSO overloaded (util >= 60%)
  engine.seedEntranceCrowd('east', {
    queueCapacity: 1000,
    entered: 900,
    completed: 100,
    queueOccupancy: 800, // 80%
    avgWaitMinutes: 4.2,
  });

  for (let i = 0; i < 60; i++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false, 'No redirection when all alternate entrances lack capacity');
  assert.strictEqual(engine.aiNavigationState.allQueuesOverloaded, true);
  assert.strictEqual(engine.aiNavigationState.message, 'ALL ENTRANCE QUEUES UNDER HIGH LOAD: There is currently no suitable alternate entrance.');
});

// Test 8: Blocked North + healthy West triggers North -> West recommendation
test('Test 8: Blocked North + healthy West triggers North -> West recommendation with measured metrics', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3.0,
  });

  let receivedData = null;
  engine.onDiversionPrompt = (data) => { receivedData = data; };

  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 200,
    queueOccupancy: 920,
    avgWaitMinutes: 4.5,
    avgSpeed: 0.2,
    arrivalRate: 480,
    serviceRate: 220,
    queueGrowthRate: 55,
  });

  engine.seedEntranceCrowd('west', {
    queueCapacity: 1500,
    entered: 400,
    completed: 100,
    queueOccupancy: 300,
    avgWaitMinutes: 1.0,
    avgSpeed: 1.1,
    arrivalRate: 120,
    serviceRate: 120,
    queueGrowthRate: 0,
  });

  engine.seedEntranceCrowd('east', {
    queueCapacity: 1000,
    entered: 800,
    completed: 150,
    queueOccupancy: 700,
    avgWaitMinutes: 3.5,
  });

  for (let i = 0; i < 60; i++) {
    engine.update(0.1);
  }

  assert.ok(receivedData !== null, 'Recommendation data must be generated');
  assert.strictEqual(receivedData.congestedStream, 'north');
  assert.strictEqual(receivedData.targetStream, 'west');
  assert.strictEqual(receivedData.congestedUtil, 92);
  assert.strictEqual(receivedData.targetUtil, 20);
  assert.ok(receivedData.divertPercent >= 10 && receivedData.divertPercent <= 25, 'Divert percentage must be bounded between 10% and 25%');
  assert.strictEqual(receivedData.movementSpeed, 'Very Slow');
});

// Test 9: Blocked North + healthy East triggers North -> East recommendation
test('Test 9: Blocked North + healthy East triggers North -> East recommendation', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3.0,
  });

  let receivedData = null;
  engine.onDiversionPrompt = (data) => { receivedData = data; };

  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 200,
    queueOccupancy: 940,
    avgWaitMinutes: 4.8,
    avgSpeed: 0.18,
    arrivalRate: 500,
    serviceRate: 200,
    queueGrowthRate: 60,
  });

  // West is overloaded
  engine.seedEntranceCrowd('west', {
    queueCapacity: 1000,
    entered: 800,
    completed: 100,
    queueOccupancy: 720,
    avgWaitMinutes: 3.5,
  });

  // East is healthy
  engine.seedEntranceCrowd('east', {
    queueCapacity: 1200,
    entered: 350,
    completed: 100,
    queueOccupancy: 250,
    avgWaitMinutes: 1.0,
    avgSpeed: 1.15,
    arrivalRate: 150,
    serviceRate: 150,
    queueGrowthRate: 0,
  });

  for (let i = 0; i < 60; i++) {
    engine.update(0.1);
  }

  assert.ok(receivedData !== null);
  assert.strictEqual(receivedData.congestedStream, 'north');
  assert.strictEqual(receivedData.targetStream, 'east');
});

// Test 10: Blocked West + healthy North can trigger West -> North
test('Test 10: Blocked West + healthy North can trigger West -> North', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3.0,
  });

  let receivedData = null;
  engine.onDiversionPrompt = (data) => { receivedData = data; };

  // West is blocked
  engine.seedEntranceCrowd('west', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 200,
    queueOccupancy: 930,
    avgWaitMinutes: 5.0,
    avgSpeed: 0.2,
    arrivalRate: 480,
    serviceRate: 210,
    queueGrowthRate: 50,
  });

  // North is healthy
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1500,
    entered: 400,
    completed: 100,
    queueOccupancy: 300,
    avgWaitMinutes: 1.0,
    avgSpeed: 1.1,
    arrivalRate: 100,
    serviceRate: 100,
    queueGrowthRate: 0,
  });

  // East is overloaded
  engine.seedEntranceCrowd('east', {
    queueCapacity: 1000,
    entered: 800,
    completed: 100,
    queueOccupancy: 700,
  });

  for (let i = 0; i < 60; i++) {
    engine.update(0.1);
  }

  assert.ok(receivedData !== null);
  assert.strictEqual(receivedData.congestedStream, 'west');
  assert.strictEqual(receivedData.targetStream, 'north');
});

// Test 11: Blocked East + healthy North can trigger East -> North
test('Test 11: Blocked East + healthy North can trigger East -> North', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3.0,
  });

  let receivedData = null;
  engine.onDiversionPrompt = (data) => { receivedData = data; };

  // East is blocked
  engine.seedEntranceCrowd('east', {
    queueCapacity: 1000,
    entered: 1600,
    completed: 200,
    queueOccupancy: 950,
    avgWaitMinutes: 5.2,
    avgSpeed: 0.15,
    arrivalRate: 500,
    serviceRate: 200,
    queueGrowthRate: 60,
  });

  // North is healthy
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1500,
    entered: 400,
    completed: 100,
    queueOccupancy: 280,
    avgWaitMinutes: 0.8,
    avgSpeed: 1.2,
    arrivalRate: 120,
    serviceRate: 120,
    queueGrowthRate: 0,
  });

  // West is overloaded
  engine.seedEntranceCrowd('west', {
    queueCapacity: 1000,
    entered: 800,
    completed: 100,
    queueOccupancy: 750,
  });

  for (let i = 0; i < 60; i++) {
    engine.update(0.1);
  }

  assert.ok(receivedData !== null);
  assert.strictEqual(receivedData.congestedStream, 'east');
  assert.strictEqual(receivedData.targetStream, 'north');
});

// Test 12: Any entrance can become the congested source
test('Test 12: Any entrance can become the congested source (East -> West)', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3.0,
  });

  let receivedData = null;
  engine.onDiversionPrompt = (data) => { receivedData = data; };

  // East is blocked
  engine.seedEntranceCrowd('east', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 200,
    queueOccupancy: 930,
    avgWaitMinutes: 5.0,
    avgSpeed: 0.2,
    arrivalRate: 450,
    serviceRate: 200,
    queueGrowthRate: 50,
  });

  // North is overloaded
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 800,
    completed: 100,
    queueOccupancy: 700,
  });

  // West is healthy
  engine.seedEntranceCrowd('west', {
    queueCapacity: 1500,
    entered: 350,
    completed: 100,
    queueOccupancy: 250,
    avgWaitMinutes: 0.9,
    avgSpeed: 1.2,
    arrivalRate: 100,
    serviceRate: 100,
    queueGrowthRate: 0,
  });

  for (let i = 0; i < 60; i++) {
    engine.update(0.1);
  }

  assert.ok(receivedData !== null);
  assert.strictEqual(receivedData.congestedStream, 'east');
  assert.strictEqual(receivedData.targetStream, 'west');
});

// Test 13: Existing devotees are never reassigned
test('Test 13: Existing devotees are never reassigned upon redirection', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  const northPath = paths.find((p) => p.stream === 'north');

  for (let i = 0; i < 20; i++) {
    const a = createAgent(i + 1, northPath, 0, engine.options);
    a.entryStream = 'north';
    a.entranceId = 'north';
    engine.agents.push(a);
  }

  const snapshot = engine.agents.map((a) => ({ id: a.id, entryStream: a.entryStream, entranceId: a.entranceId, pathId: a.pathId }));

  engine.approveRerouting('north', 'west');

  for (let i = 0; i < engine.agents.length; i++) {
    assert.strictEqual(engine.agents[i].id, snapshot[i].id);
    assert.strictEqual(engine.agents[i].entryStream, snapshot[i].entryStream);
    assert.strictEqual(engine.agents[i].entranceId, snapshot[i].entranceId);
    assert.strictEqual(engine.agents[i].pathId, snapshot[i].pathId);
  }
});

// Test 14: Accepted redirection affects only future arrivals
test('Test 14: Accepted redirection affects only future arrivals with bounded transfer', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.setEntranceInflow({ north: 90, west: 20, east: 20 });
  engine.approveRerouting('north', 'west', 18);

  assert.strictEqual(engine.diversionApproved, true);
  assert.strictEqual(engine.activeEntranceWeights.east, 20);
  assert.ok(engine.activeEntranceWeights.north < 90);
  assert.ok(engine.activeEntranceWeights.west > 20);
  assert.strictEqual(engine.activeEntranceWeights.north + engine.activeEntranceWeights.west, 110);
});

// Test 15: Declining a recommendation does not repeatedly spam the same popup
test('Test 15: Declining a recommendation does not repeatedly spam the same popup (cooldown active)', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 2.0,
  });

  let promptCount = 0;
  engine.onDiversionPrompt = () => { promptCount++; };

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

  engine.seedEntranceCrowd('west', {
    queueCapacity: 1500,
    entered: 300,
    completed: 100,
    queueOccupancy: 200,
    avgWaitMinutes: 0.8,
    avgSpeed: 1.2,
  });

  // Advance to trigger first prompt
  for (let i = 0; i < 40; i++) {
    engine.update(0.1);
  }
  assert.strictEqual(promptCount, 1);

  // User declines ("NOT NOW")
  engine.dismissDiversion();
  assert.strictEqual(engine.entranceStats.north.alertState, 'USER_DECLINED');

  // Advance 10 more seconds (less than 30s cooldown and util unchanged)
  for (let i = 0; i < 100; i++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptCount, 1, 'Should NOT prompt again during decline cooldown');
});

// Test 16: Recovery clears the congestion state
test('Test 16: Recovery clears the congestion state and reverts distribution', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000, warmupPeriod: 2 });
  engine.setEntranceInflow({ north: 90, west: 20, east: 20 });
  engine.approveRerouting('north', 'west');

  // North queue drains and recovers
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 2000,
    completed: 1600,
    queueOccupancy: 400, // 40% util < 60%
    avgWaitMinutes: 0.8,
    avgSpeed: 1.15,
  });

  // Advance 20 seconds
  for (let i = 0; i < 200; i++) {
    engine.update(0.1);
  }

  assert.strictEqual(engine.diversionApproved, false, 'Redirection should revert upon natural recovery');
  assert.strictEqual(engine.entranceStats.north.congestionState, 'FLOWING');
  assert.strictEqual(engine.entranceStats.north.alertState, 'RECOVERED');
  assert.strictEqual(engine.entranceStats.north.blockedDuration, 0);
  assert.strictEqual(engine.activeEntranceWeights.north, 90);
});

// Test 17: New congestion after recovery can create a new recommendation
test('Test 17: New congestion after recovery can create a new recommendation', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3.0,
  });

  let promptCount = 0;
  engine.onDiversionPrompt = () => { promptCount++; };

  // 1. First congestion
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 200,
    queueOccupancy: 950,
    avgWaitMinutes: 5.0,
    avgSpeed: 0.2,
  });
  engine.seedEntranceCrowd('west', {
    queueCapacity: 1500,
    entered: 300,
    completed: 100,
    queueOccupancy: 200,
    avgSpeed: 1.2,
  });

  for (let i = 0; i < 50; i++) {
    engine.update(0.1);
  }
  assert.strictEqual(promptCount, 1);

  // 2. Approve and recover
  engine.approveRerouting('north', 'west');
  engine.seedEntranceCrowd('north', {
    queueOccupancy: 300,
    avgWaitMinutes: 0.5,
    avgSpeed: 1.2,
  });
  for (let i = 0; i < 200; i++) {
    engine.update(0.1);
  }
  assert.strictEqual(engine.diversionApproved, false);

  // 3. New second congestion wave
  engine.seedEntranceCrowd('north', {
    queueOccupancy: 960,
    avgWaitMinutes: 5.5,
    avgSpeed: 0.18,
  });
  for (let i = 0; i < 50; i++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptCount, 2, 'New congestion after recovery must generate new recommendation');
});

// Test 18: Logical crowd counts remain unchanged by the recommendation itself
test('Test 18: Logical crowd counts remain unchanged by the recommendation itself', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.seedEntranceCrowd('north', { entered: 1200, completed: 300, queueOccupancy: 800 });
  engine.seedEntranceCrowd('west', { entered: 600, completed: 200, queueOccupancy: 300 });
  engine.seedEntranceCrowd('east', { entered: 500, completed: 100, queueOccupancy: 200 });

  const totalBefore = engine.totalLogicalEntered;
  const northEnteredBefore = engine.entranceStats.north.entered;
  const westEnteredBefore = engine.entranceStats.west.entered;

  engine.approveRerouting('north', 'west');

  assert.strictEqual(engine.totalLogicalEntered, totalBefore, 'totalLogicalEntered must not jump on recommendation approval');
  assert.strictEqual(engine.entranceStats.north.entered, northEnteredBefore);
  assert.strictEqual(engine.entranceStats.west.entered, westEnteredBefore);
});

// Test 19: Visual representative count remains bounded
test('Test 19: Visual representative count remains bounded under continuous simulation', () => {
  const targetAgents = 50;
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    targetVisualAgents: targetAgents,
    scaleFactor: 10,
  });

  for (let i = 0; i < 150; i++) {
    engine.spawnNextAgent();
    engine.update(0.1);
  }

  assert.ok(engine.agents.length <= targetAgents, `Visual agents (${engine.agents.length}) must not exceed target pool (${targetAgents})`);
});

// Test 20: Existing entrance telemetry remains correct
test('Test 20: Deterministic congestion state and telemetry fields are correct and continuous', () => {
  const engine = new SimulationEngine(fest, paths, { plannedCrowd: 10000 });
  engine.update(0.1);

  for (const s of ['north', 'west', 'east']) {
    const st = engine.entranceStats[s];
    assert.strictEqual(st.entranceId, s);
    assert.ok(typeof st.entered === 'number');
    assert.ok(typeof st.active === 'number');
    assert.ok(typeof st.queueOccupancy === 'number');
    assert.ok(typeof st.queueCapacity === 'number');
    assert.ok(typeof st.utilization === 'number');
    assert.ok(typeof st.queueUtilization === 'number');
    assert.strictEqual(st.utilization, st.queueUtilization);
    assert.ok(typeof st.arrivalRate === 'number');
    assert.ok(typeof st.serviceRate === 'number');
    assert.ok(typeof st.queueGrowthRate === 'number');
    assert.ok(typeof st.movementSpeed === 'number');
    assert.ok(typeof st.queueProgress === 'number');
    assert.ok(typeof st.blockedDuration === 'number');
    assert.ok(['FLOWING', 'SLOW', 'CONGESTED', 'BLOCKED'].includes(st.congestionState));
    assert.ok(st.entered === st.active + st.completed);
    assert.ok(st.queueOccupancy <= st.active);
  }
});

console.log('\n========================================================================');
console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
}
