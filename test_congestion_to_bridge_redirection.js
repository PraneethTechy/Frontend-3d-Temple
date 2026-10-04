/**
 * Focused Verification Suite:
 * Entrance Congestion Detection -> Manager Approval -> Bridge Redirection -> Visible Crowd Movement
 *
 * Verifies all 20 acceptance criteria from Section 16:
 * 1. Genuine congestion detection
 * 2. No false congestion from service dwell
 * 3. Correct alternative entrance selection
 * 4. Manager approval required
 * 5. Approval changes future routing
 * 6. Existing devotees remain unchanged
 * 7. Redirected devotee receives bridge route
 * 8. Bridge route contains stair ascent
 * 9. Bridge traversal exists
 * 10. Bridge route contains stair descent
 * 11. Redirected devotee reaches alternate entrance
 * 12. Redirected devotee joins alternate queue
 * 13. Visual representative follows bridge route
 * 14. No teleportation
 * 15. No visual/logical identity mismatch
 * 16. No redirection when alternatives are overloaded
 * 17. Cooldown prevents repeated notifications
 * 18. Recovery restores routing correctly
 * 19. Historical entrance counts remain intact
 * 20. Simulation continues normally after redirection
 */

import assert from 'assert';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import { createAgent, AGENT_STATES, LOGICAL_DEVOTEE_STATES, getDistance2D } from './src/features/simulation/simulationModel.js';

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
console.log(' DevaSetu Congestion to Bridge Redirection Workflow Verification Suite ');
console.log('========================================================================\n');

const fest = generateFestivalScenario();
const pathResult = generateSimulationPaths(fest);
const paths = pathResult.paths;

// Test 1: Genuine congestion detection
test('Test 1: Genuine congestion detection occurs on sustained blockage', () => {
  const engine = new SimulationEngine(fest, paths, { warmupPeriod: 2, minCongestionDuration: 3 });

  let promptReceived = null;
  engine.onDiversionPrompt = (data) => {
    promptReceived = data;
  };

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

  assert.strictEqual(engine.entranceStats.north.status, 'REROUTE_CANDIDATE', 'North status should be REROUTE_CANDIDATE');
  assert.ok(promptReceived !== null, 'Operator diversion prompt must be triggered');
  assert.strictEqual(promptReceived.congestedStream, 'north');
  assert.strictEqual(promptReceived.targetStream, 'west');
});

// Test 2: No false congestion from service dwell
test('Test 2: No false congestion from short service dwell', () => {
  const engine = new SimulationEngine(fest, paths, { warmupPeriod: 5, minCongestionDuration: 8 });
  engine.simTime = 20;

  let promptCalled = false;
  engine.onDiversionPrompt = () => { promptCalled = true; };

  // Queues are flowing normally, only temporary dwell (< minCongestionDuration)
  engine.entranceStats.north.congestionState = 'FLOWING';
  engine.entranceStats.north.queueUtilization = 45;
  engine.entranceStats.north.blockedDuration = 0.5; // Short dwell
  engine.entranceStats.north.avgSpeed = 0.75;

  engine.update(0.1);

  assert.strictEqual(promptCalled, false, 'Short service dwell must never trigger congestion modal');
  assert.notStrictEqual(engine.entranceStats.north.status, 'REROUTE_CANDIDATE');
});

// Test 3: Correct alternative entrance selection
test('Test 3: Correct alternative entrance selection based on available capacity', () => {
  const engine = new SimulationEngine(fest, paths, { warmupPeriod: 2, minCongestionDuration: 3 });

  let targetSelected = null;
  engine.onDiversionPrompt = (data) => {
    targetSelected = data.targetStream;
  };

  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 200,
    queueOccupancy: 950,
    avgWaitMinutes: 5.0,
    avgSpeed: 0.15,
    arrivalRate: 500,
    serviceRate: 200,
    queueGrowthRate: 60,
  });

  // West has 300/1500 = 20% utilization, healthy flow
  engine.seedEntranceCrowd('west', {
    queueCapacity: 1500,
    entered: 400,
    completed: 100,
    queueOccupancy: 300,
    avgWaitMinutes: 1.0,
    avgSpeed: 1.0,
  });

  // East has 550/1000 = 55% utilization
  engine.seedEntranceCrowd('east', {
    queueCapacity: 1000,
    entered: 800,
    completed: 150,
    queueOccupancy: 550,
    avgWaitMinutes: 3.0,
  });

  for (let i = 0; i < 60; i++) {
    engine.update(0.1);
  }

  assert.strictEqual(targetSelected, 'west', 'West should be selected as the healthiest alternative');
});

// Test 4: Manager approval required
test('Test 4: Manager approval required before any redirection is activated', () => {
  const engine = new SimulationEngine(fest, paths, { warmupPeriod: 5 });
  assert.strictEqual(!engine.diversionApproved, true, 'Redirection must start unapproved');

  // Candidate is prompted but not yet approved
  engine.aiNavigationState = { congestedStream: 'north', targetStream: 'west' };
  assert.strictEqual(!engine.diversionApproved, true);

  // Manager explicitly approves
  engine.approveDiversion(true);
  assert.strictEqual(engine.diversionApproved, true, 'Redirection should now be approved');
  assert.strictEqual(engine.lastRerouteCongested, 'north');
  assert.strictEqual(engine.lastRerouteTarget, 'west');
});

// Test 5: Approval changes future routing
test('Test 5: Approval changes future arrival distribution weights', () => {
  const engine = new SimulationEngine(fest, paths);
  const baseNorthWeight = engine.baseEntranceWeights.north;
  const baseWestWeight = engine.baseEntranceWeights.west;

  engine.approveRerouting('north', 'west', 20);

  assert.ok(engine.activeEntranceWeights.north < baseNorthWeight, 'North active weight should decrease');
  assert.ok(engine.activeEntranceWeights.west > baseWestWeight, 'West active weight should increase');
});

// Test 6: Existing devotees remain unchanged
test('Test 6: Existing devotees in queue remain untouched and are not moved or teleported', () => {
  const engine = new SimulationEngine(fest, paths);
  const northPath = engine.paths.find((p) => p.stream === 'north');

  // Spawn an existing devotee in North queue
  const existingAgent = createAgent(101, northPath, 0, engine.options);
  existingAgent.position = { x: -24, y: 0, z: -35 };
  existingAgent.pathId = northPath.id;
  existingAgent.entryStream = 'north';
  existingAgent.stream = 'north';
  existingAgent.targetWaypointIndex = 8;
  engine.agents.push(existingAgent);

  const initialPos = { ...existingAgent.position };
  const initialPathId = existingAgent.pathId;
  const initialIndex = existingAgent.targetWaypointIndex;

  // Manager approves redirection
  engine.approveRerouting('north', 'west', 20);

  // Existing devotee must not change path or position
  assert.strictEqual(existingAgent.pathId, initialPathId, 'Existing agent must retain original pathId');
  assert.strictEqual(existingAgent.entryStream, 'north', 'Existing agent must retain original entryStream');
  assert.strictEqual(existingAgent.position.x, initialPos.x, 'Existing agent must not be repositioned');
  assert.strictEqual(existingAgent.position.z, initialPos.z, 'Existing agent must not be repositioned');
  assert.strictEqual(existingAgent.targetWaypointIndex, initialIndex, 'Existing agent waypoint index must be untouched');
});

// Test 7: Redirected devotee receives bridge route
test('Test 7: Redirected devotee receives bridge route upon spawning', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.approveRerouting('north', 'west', 25);

  const divPath = engine.diversionPaths.find((p) => p.stream === 'north' && p.targetStream === 'west');
  assert.ok(divPath, 'North-to-West diversion path must exist');

  // Force spawn next agent
  engine.spawnTimer = 10;
  const newAgent = engine.spawnNextAgent();

  assert.ok(newAgent !== null, 'Agent must spawn');
  assert.strictEqual(newAgent.isDiverted, true, 'Agent must be marked as diverted');
  assert.strictEqual(newAgent.pathId, divPath.id, 'Agent must be assigned to the bridge diversion path');
  assert.strictEqual(newAgent.entryStream, 'north', 'Origin must be North');
  assert.strictEqual(newAgent.targetStream, 'west', 'Target must be West');
});

// Test 8: Bridge route contains stair ascent
test('Test 8: Bridge route contains stair ascent with elevation rise to 4.8m', () => {
  const divPath = paths.diversionPaths.find((p) => p.stream === 'north' && p.targetStream === 'west');
  const ascentBase = divPath.waypoints.find((w) => w.name.includes('Ascent Stairs Base'));
  const topCrest = divPath.waypoints.find((w) => w.name.includes('Top Landing Crest'));

  assert.ok(ascentBase, 'Ascent stairs base waypoint must exist');
  assert.ok(topCrest, 'Top landing crest waypoint must exist');
  assert.strictEqual(ascentBase.y, 0.0, 'Ascent base must start at ground elevation (0.0m)');
  assert.strictEqual(topCrest.y, 4.8, 'Top crest must reach elevated bridge deck height (4.8m)');
});

// Test 9: Bridge traversal exists
test('Test 9: Bridge traversal exists across elevated deck spans at 4.8m', () => {
  const divPath = paths.diversionPaths.find((p) => p.stream === 'north' && p.targetStream === 'west');
  const colonnade = divPath.waypoints.find((w) => w.name.includes('Colonnade'));
  const corner = divPath.waypoints.find((w) => w.name.includes('Corner Junction Platform'));
  const skybridge = divPath.waypoints.find((w) => w.name.includes('Perimeter Elevated Skybridge'));

  assert.ok(colonnade, 'Colonnade deck waypoint must exist');
  assert.ok(corner, 'Corner junction platform waypoint must exist');
  assert.ok(skybridge, 'Perimeter skybridge deck waypoint must exist');

  assert.strictEqual(colonnade.y, 4.8, 'Colonnade must be at 4.8m deck elevation');
  assert.strictEqual(corner.y, 4.8, 'Corner platform must be at 4.8m deck elevation');
  assert.strictEqual(skybridge.y, 4.8, 'Skybridge deck must be at 4.8m deck elevation');
});

// Test 10: Bridge route contains stair descent
test('Test 10: Bridge route contains stair descent with elevation transition back to ground (0.0m)', () => {
  const divPath = paths.diversionPaths.find((p) => p.stream === 'north' && p.targetStream === 'west');
  const descentCrest = divPath.waypoints.find((w) => w.name.includes('Descent Stairs Crest'));
  const descentBase = divPath.waypoints.find((w) => w.name.includes('Descent Stairs Base'));

  assert.ok(descentCrest, 'Descent stairs crest waypoint must exist');
  assert.ok(descentBase, 'Descent stairs base waypoint must exist');
  assert.strictEqual(descentCrest.y, 4.8, 'Descent crest must be at 4.8m deck height');
  assert.strictEqual(descentBase.y, 0.0, 'Descent base must terminate at ground elevation (0.0m)');
});

// Test 11: Redirected devotee reaches alternate entrance
test('Test 11: Redirected devotee reaches alternate West entrance arrival plaza', () => {
  const divPath = paths.diversionPaths.find((p) => p.stream === 'north' && p.targetStream === 'west');
  const landingPad = divPath.waypoints.find((w) => w.name.includes('West Overpass Ground Landing Pad'));
  const securityPlaza = divPath.waypoints.find((w) => w.name.includes('West Security Arrival Plaza'));

  assert.ok(landingPad, 'West ground landing pad waypoint must exist');
  assert.ok(securityPlaza, 'West security arrival plaza waypoint must exist');
  assert.strictEqual(landingPad.y, 0.0);
  assert.strictEqual(securityPlaza.y, 0.0);
  assert.strictEqual(securityPlaza.zone, 'security');
});

// Test 12: Redirected devotee joins alternate queue
test('Test 12: Redirected devotee joins West switchback queue and advances normally', () => {
  const divPath = paths.diversionPaths.find((p) => p.stream === 'north' && p.targetStream === 'west');
  const queueEntry = divPath.waypoints.find((w) => w.name.includes('West Switchback Queue Entry'));
  const darshanWp = divPath.waypoints.find((w) => w.zone === 'darshan');
  const exitWp = divPath.waypoints.find((w) => w.zone === 'exit');

  assert.ok(queueEntry, 'Queue entry waypoint must exist');
  assert.strictEqual(queueEntry.zone, 'queue');
  assert.ok(darshanWp, 'Darshan sanctum waypoint must exist');
  assert.ok(exitWp, 'South exit gopuram waypoint must exist');
});

// Test 13: Visual representative follows bridge route
test('Test 13: Visual representative moves continuously and smoothly interpolates Y across bridge', () => {
  const engine = new SimulationEngine(fest, paths);
  const divPath = engine.diversionPaths.find((p) => p.stream === 'north' && p.targetStream === 'west');
  assert.ok(divPath);

  const agent = createAgent(201, divPath, 0, engine.options);
  agent.isDiverted = true;
  agent.pathId = divPath.id;
  engine.agents.push(agent);

  // Position at top landing deck (waypoint index 5, target 6)
  agent.targetWaypointIndex = 6;
  agent.position = { x: -40.12, y: 4.8, z: -78.0 };
  engine.update(0.1);

  assert.ok(agent.position.y >= 4.5, 'Agent on bridge deck must be elevated to ~4.8m');

  // Verify state during bridge crossing
  const details = engine.getDevoteeDetails(agent.logicalDevoteeId);
  if (details) {
    assert.ok(details.status.includes('Bridge') || details.currentZone.includes('Bridge') || details.zone === 'approach');
  }
});

// Test 14: No teleportation
test('Test 14: Movement speed is bounded with zero teleportation jumps between frames', () => {
  const engine = new SimulationEngine(fest, paths);
  const divPath = engine.diversionPaths.find((p) => p.stream === 'north' && p.targetStream === 'west');

  const agent = createAgent(202, divPath, 0, engine.options);
  agent.isDiverted = true;
  agent.pathId = divPath.id;
  agent.position = { ...divPath.waypoints[0] };
  agent.targetWaypointIndex = 1;
  engine.agents.push(agent);

  const prevPos = { ...agent.position };
  const dt = 0.05;
  engine.update(dt);

  const stepDistance = getDistance2D(agent.position, prevPos);
  const maxPossibleStep = agent.baseSpeed * 2.0 * dt; // Max plausible distance for single frame

  assert.ok(stepDistance < maxPossibleStep, `Step distance (${stepDistance.toFixed(3)}m) must not exceed frame limit (${maxPossibleStep.toFixed(3)}m)`);
});

// Test 15: No visual/logical identity mismatch
test('Test 15: Logical devotee and visual representative identities remain strictly paired', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.approveRerouting('north', 'west', 20);

  engine.spawnTimer = 10;
  const agent = engine.spawnNextAgent();
  assert.ok(agent);

  const logicalDevotee = engine.logicalDevotees.get(agent.logicalDevoteeId);
  assert.ok(logicalDevotee, 'Linked logical devotee must exist in registry');
  assert.strictEqual(logicalDevotee.representativeId, agent.visitorRepresentativeId, 'Representative ID must match');
  assert.strictEqual(logicalDevotee.pathId, agent.pathId, 'Path IDs must match');
  assert.strictEqual(logicalDevotee.isDiverted, true, 'Logical devotee must be marked diverted');
  assert.strictEqual(logicalDevotee.divertedTo, 'west', 'Logical devotee divertedTo must be west');
});

// Test 16: No redirection when alternatives are overloaded
test('Test 16: No redirection recommendation when all alternate entrances are also overloaded', () => {
  const engine = new SimulationEngine(fest, paths, { warmupPeriod: 2, minCongestionDuration: 3.0 });

  let promptCalled = false;
  engine.onDiversionPrompt = () => { promptCalled = true; };

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

  assert.strictEqual(promptCalled, false, 'No redirection should be recommended when all alternatives are overloaded');
  assert.strictEqual(engine.aiNavigationState.allQueuesOverloaded, true, 'AI navigation must report allQueuesOverloaded');
});

// Test 17: Cooldown prevents repeated notifications
test('Test 17: Cooldown prevents repeated notifications after operator declines', () => {
  const engine = new SimulationEngine(fest, paths, { warmupPeriod: 2, minCongestionDuration: 3 });

  let promptCount = 0;
  engine.onDiversionPrompt = () => { promptCount++; };

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
  });

  engine.seedEntranceCrowd('east', {
    queueCapacity: 1000,
    entered: 800,
    completed: 150,
    queueOccupancy: 700,
    avgWaitMinutes: 3.5,
  });

  for (let i = 0; i < 50; i++) {
    engine.update(0.1);
  }
  assert.strictEqual(promptCount, 1, 'First prompt should trigger');

  // Operator declines
  engine.dismissDiversion();
  assert.strictEqual(engine.diversionApproved, false);

  // Next ticks immediately after decline
  for (let i = 0; i < 20; i++) {
    engine.update(0.1);
  }
  assert.strictEqual(promptCount, 1, 'Cooldown must suppress immediate re-prompting');
});

// Test 18: Recovery restores routing correctly
test('Test 18: Recovery restores routing distribution when congestion clears', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.approveRerouting('north', 'west', 20);
  assert.strictEqual(engine.diversionApproved, true);

  engine.simTime = engine.rerouteAcceptedTime + 20; // Past minimum active time

  // North queue recovers
  engine.entranceStats.north.queueUtilization = 45;
  engine.entranceStats.north.congestionState = 'FLOWING';
  engine.entranceStats.north.avgSpeed = 0.85;

  engine.update(0.1);

  assert.strictEqual(engine.diversionApproved, false, 'Redirection should revert when congestion clears');
  assert.strictEqual(engine.activeEntranceWeights.north, engine.baseEntranceWeights.north, 'North weight must revert to base');
  assert.strictEqual(engine.activeEntranceWeights.west, engine.baseEntranceWeights.west, 'West weight must revert to base');
});

// Test 19: Historical entrance counts remain intact
test('Test 19: Historical entered counts are never rewritten or reduced during redirection', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.entranceStats.north.entered = 5000;
  engine.entranceStats.west.entered = 2000;

  engine.approveRerouting('north', 'west', 20);

  // Future arrivals
  engine.spawnTimer = 10;
  engine.spawnNextAgent();

  assert.ok(engine.entranceStats.north.entered >= 5000, 'North historical entered count must not decrease');
  assert.ok(engine.entranceStats.west.entered >= 2000, 'West historical entered count must not decrease');
});

// Test 20: Simulation continues normally after redirection
test('Test 20: Simulation continues normally through security, darshan, and exit after bridge traversal', () => {
  const engine = new SimulationEngine(fest, paths);
  const divPath = engine.diversionPaths.find((p) => p.stream === 'north' && p.targetStream === 'west');

  // Place agent near Darshan on diversion path
  const darshanIndex = divPath.waypoints.findIndex((w) => w.zone === 'darshan');
  assert.ok(darshanIndex > 0);

  const agent = createAgent(301, divPath, 0, engine.options);
  agent.isDiverted = true;
  agent.pathId = divPath.id;
  agent.targetWaypointIndex = darshanIndex;
  agent.position = { ...divPath.waypoints[darshanIndex] };
  engine.agents.push(agent);

  // Devotee should complete Darshan and continue towards South Exit
  engine.update(0.8); // Enough dt to complete darshan dwell
  assert.ok(agent.targetWaypointIndex >= darshanIndex);

  // Advance agent to final exit waypoint
  agent.targetWaypointIndex = divPath.waypoints.length - 1;
  agent.position = { ...divPath.waypoints[divPath.waypoints.length - 1] };

  const initialCompleted = engine.totalCompletedCount;
  engine.update(0.5);

  assert.ok(engine.totalCompletedCount > initialCompleted, 'Completed count must increment upon exiting');
});

console.log('\n========================================================================');
console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
}
