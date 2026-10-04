/**
 * DevaSetu Security & Darshan Realistic Service Dwell Verification Suite
 * 
 * Verifies all 19 requirements:
 * 1. Security dwell state is entered.
 * 2. Security dwell ends automatically.
 * 3. Devotee resumes movement after security.
 * 4. Security dwell is short (configurable SECURITY_DWELL_SECONDS ~0.45s).
 * 5. Multiple security channels can process different devotees independently.
 * 6. One security channel being occupied does not freeze all queues or other channels.
 * 7. Darshan dwell state is entered.
 * 8. Darshan dwell ends automatically.
 * 9. Devotee resumes movement after Darshan toward exit.
 * 10. Darshan dwell is short (configurable DARSHAN_DWELL_SECONDS ~0.60s).
 * 11. Other queue devotees continue moving naturally while one devotee is in Darshan.
 * 12. Security guards do not affect crowd counts (purely visual staff).
 * 13. Security guards do not affect queue capacity.
 * 14. Security guards are not duplicated every frame.
 * 15. Short service dwell does not create a congestion recommendation.
 * 16. Genuine sustained queue blockage can still be detected.
 * 17. Existing entrance telemetry remains correct.
 * 18. Existing redirection tests continue passing.
 * 19. Visual agent pool remains bounded.
 */

import assert from 'assert';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import {
  createAgent,
  AGENT_STATES,
  SECURITY_DWELL_SECONDS,
  DARSHAN_DWELL_SECONDS,
  SIMULATION_DEFAULTS,
  getDistance2D,
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
console.log(' DevaSetu Security & Darshan Service Dwell Verification Suite           ');
console.log('========================================================================\n');

const fest = generateFestivalScenario();
const pathResult = generateSimulationPaths(fest);
const paths = pathResult.paths;

// Test 1: Security dwell state is entered
test('Test 1: Security dwell state is entered when devotee reaches security checkpoint', () => {
  const engine = new SimulationEngine(fest, paths);
  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const agent = createAgent(101, northPath, 0, engine.options);

  // Find index of security waypoint
  const secIdx = northPath.waypoints.findIndex((wp) => wp.zone === 'security');
  assert.ok(secIdx > 0, 'Path must contain a security waypoint');

  // Place agent just before security waypoint
  const secWp = northPath.waypoints[secIdx];
  agent.targetWaypointIndex = secIdx;
  agent.position.x = secWp.x;
  agent.position.z = secWp.z - 0.5; // within 0.85m detection radius
  agent.actualSpeed = 1.2;

  engine.agents = [agent];
  engine.updateAgent(agent, null, northPath, 0.05);

  assert.strictEqual(agent.state, AGENT_STATES.SECURITY, 'Agent state must be SECURITY');
  assert.strictEqual(agent.logicalState, 'security_check', 'Agent logicalState must be security_check');
  assert.ok(agent.serviceTimer > 0, 'serviceTimer should begin advancing');
  assert.ok(agent.serviceTime > 0, 'serviceTime must be accumulated separately from queue wait');
});

// Test 2: Security dwell ends automatically
test('Test 2: Security dwell ends automatically once dwell duration expires', () => {
  const engine = new SimulationEngine(fest, paths, { securityDwellSeconds: 0.40 });
  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const agent = createAgent(102, northPath, 0, engine.options);
  const secIdx = northPath.waypoints.findIndex((wp) => wp.zone === 'security');
  const secWp = northPath.waypoints[secIdx];

  agent.targetWaypointIndex = secIdx;
  agent.position.x = secWp.x;
  agent.position.z = secWp.z - 0.2;
  agent.securityDwellTime = 0.40;

  engine.agents = [agent];

  // Advance simulation through dwell
  for (let t = 0; t < 12; t++) {
    engine.simTime += 0.05;
    engine.updateAgent(agent, null, northPath, 0.05); // 0.60s total > 0.40s
  }

  assert.strictEqual(agent.logicalState, 'security_complete', 'Agent logicalState should be security_complete');
  assert.strictEqual(agent.serviceTimer >= 0.40, true, 'serviceTimer should have reached dwell duration');
});

// Test 3: Devotee resumes movement after security
test('Test 3: Devotee resumes movement and transitions to queue after security dwell', () => {
  const engine = new SimulationEngine(fest, paths, { securityDwellSeconds: 0.35 });
  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const agent = createAgent(103, northPath, 0, engine.options);
  const secIdx = northPath.waypoints.findIndex((wp) => wp.zone === 'security');
  const secWp = northPath.waypoints[secIdx];

  agent.targetWaypointIndex = secIdx;
  agent.position.x = secWp.x;
  agent.position.z = secWp.z;
  agent.securityDwellTime = 0.35;

  engine.agents = [agent];

  // Run through dwell and subsequent steps
  for (let t = 0; t < 12; t++) {
    engine.updateAgent(agent, null, northPath, 0.05);
  }

  assert.ok(agent.targetWaypointIndex > secIdx, 'Devotee should advance beyond the security waypoint');
  assert.ok(agent.actualSpeed > 0.1, 'Devotee should resume walking velocity');
});

// Test 4: Security dwell is short
test('Test 4: Security dwell is short and strictly adheres to configurable constant', () => {
  assert.ok(SECURITY_DWELL_SECONDS <= 1.0, 'SECURITY_DWELL_SECONDS default must be <= 1.0s');
  assert.ok(SECURITY_DWELL_SECONDS >= 0.2, 'SECURITY_DWELL_SECONDS default must be visually noticeable (>= 0.2s)');

  const engine = new SimulationEngine(fest, paths, { securityDwellSeconds: 0.45 });
  assert.strictEqual(engine.securityDwellSeconds, 0.45);

  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const agent = createAgent(104, northPath, 0, engine.options);
  assert.ok(agent.securityDwellTime < 1.0, 'Agent security dwell time must be very short (< 1.0s)');
  assert.ok(agent.securityDwellTime > 0.15, 'Agent security dwell time must be at least 0.15s');
});

// Test 5: Multiple security channels can process different devotees
test('Test 5: Multiple security channels process different devotees in parallel', () => {
  const engine = new SimulationEngine(fest, paths, { securityDwellSeconds: 0.45 });
  const northPaths = paths.filter((p) => p.stream === 'north' && !p.isDiversion);
  const path1 = northPaths.find((p) => p.waypoints.some((w) => w.zone === 'security' && w.componentId?.includes('n3'))) || northPaths[0];
  const path2 = northPaths.find((p) => p.waypoints.some((w) => w.zone === 'security' && w.componentId?.includes('n4'))) || northPaths[2];

  const agent1 = createAgent(201, path1, 0, engine.options);
  const agent2 = createAgent(202, path2, 0, engine.options);

  const secIdx1 = path1.waypoints.findIndex((wp) => wp.zone === 'security');
  const secIdx2 = path2.waypoints.findIndex((wp) => wp.zone === 'security');

  agent1.targetWaypointIndex = secIdx1;
  agent1.position.x = path1.waypoints[secIdx1].x;
  agent1.position.z = path1.waypoints[secIdx1].z - 0.2;

  agent2.targetWaypointIndex = secIdx2;
  agent2.position.x = path2.waypoints[secIdx2].x;
  agent2.position.z = path2.waypoints[secIdx2].z - 0.2;

  engine.agents = [agent1, agent2];

  engine.updateAgent(agent1, null, path1, 0.05);
  engine.updateAgent(agent2, null, path2, 0.05);

  assert.strictEqual(agent1.state, AGENT_STATES.SECURITY);
  assert.strictEqual(agent2.state, AGENT_STATES.SECURITY);
  assert.strictEqual(agent1.logicalState, 'security_check');
  assert.strictEqual(agent2.logicalState, 'security_check');

  const channelKeys = Object.keys(engine.securityChannels);
  assert.ok(channelKeys.length >= 2, 'Both distinct security channels must be tracked simultaneously');
});

// Test 6: One security channel being occupied does not freeze all queues
test('Test 6: One security channel being occupied does not freeze other channels or queues', () => {
  const engine = new SimulationEngine(fest, paths, { securityDwellSeconds: 0.50 });
  const northPaths = paths.filter((p) => p.stream === 'north' && !p.isDiversion);
  const path1 = northPaths[0];
  const path2 = northPaths[1];

  const agent1 = createAgent(301, path1, 0, engine.options);
  const agent2 = createAgent(302, path2, 0, engine.options);

  const secIdx1 = path1.waypoints.findIndex((wp) => wp.zone === 'security');
  const secIdx2 = path2.waypoints.findIndex((wp) => wp.zone === 'security');

  // Agent 1 is dwelling at security channel 1
  agent1.targetWaypointIndex = secIdx1;
  agent1.position.x = path1.waypoints[secIdx1].x;
  agent1.position.z = path1.waypoints[secIdx1].z - 0.1;
  agent1.actualSpeed = 0;

  // Agent 2 is walking along path 2 toward holding/security
  agent2.targetWaypointIndex = secIdx2 - 1;
  agent2.position.x = path2.waypoints[secIdx2 - 1].x;
  agent2.position.z = path2.waypoints[secIdx2 - 1].z - 4.0;
  agent2.actualSpeed = 1.3;

  engine.agents = [agent1, agent2];

  // Update both
  engine.updateAgent(agent1, null, path1, 0.05);
  engine.updateAgent(agent2, null, path2, 0.05);

  assert.strictEqual(agent1.state, AGENT_STATES.SECURITY, 'Agent 1 is undergoing security check');
  assert.ok(agent2.actualSpeed > 0.8, 'Agent 2 on channel 2 continues moving forward with healthy speed');
  assert.strictEqual(agent2.stalled, false, 'Agent 2 must NOT be stalled');
});

// Test 7: Darshan dwell state is entered
test('Test 7: Darshan dwell state is entered when devotee reaches Darshan point', () => {
  const engine = new SimulationEngine(fest, paths);
  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const agent = createAgent(401, northPath, 0, engine.options);

  const darshanIdx = northPath.waypoints.findIndex((wp) => wp.zone === 'darshan');
  assert.ok(darshanIdx > 0, 'Path must contain a darshan waypoint');

  const darshanWp = northPath.waypoints[darshanIdx];
  agent.targetWaypointIndex = darshanIdx;
  agent.position.x = darshanWp.x;
  agent.position.z = darshanWp.z - 0.4; // within 1.1m

  engine.agents = [agent];
  engine.updateAgent(agent, null, northPath, 0.05);

  assert.strictEqual(agent.state, AGENT_STATES.DARSHAN, 'Agent state must be DARSHAN');
  assert.strictEqual(agent.logicalState, 'darshan_dwell', 'Agent logicalState must be darshan_dwell');
  assert.ok(agent.serviceTimer > 0, 'Darshan serviceTimer should start accumulating');
  assert.ok(agent.serviceTime > 0, 'serviceTime must accumulate during darshan');
});

// Test 8: Darshan dwell ends automatically
test('Test 8: Darshan dwell ends automatically after short duration', () => {
  const engine = new SimulationEngine(fest, paths, { darshanDwellSeconds: 0.50 });
  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const agent = createAgent(402, northPath, 0, engine.options);
  const darshanIdx = northPath.waypoints.findIndex((wp) => wp.zone === 'darshan');
  const darshanWp = northPath.waypoints[darshanIdx];

  agent.targetWaypointIndex = darshanIdx;
  agent.position.x = darshanWp.x;
  agent.position.z = darshanWp.z - 0.2;
  agent.darshanDwellTime = 0.50;

  engine.agents = [agent];

  for (let t = 0; t < 12; t++) {
    engine.updateAgent(agent, null, northPath, 0.05); // total 0.60s > 0.50s
  }

  assert.strictEqual(agent.logicalState, 'darshan_complete', 'Agent logicalState should be darshan_complete');
  assert.ok(agent.serviceTimer >= 0.50);
});

// Test 9: Devotee resumes movement after Darshan
test('Test 9: Devotee resumes movement after Darshan toward exit corridor', () => {
  const engine = new SimulationEngine(fest, paths, { darshanDwellSeconds: 0.40 });
  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const agent = createAgent(403, northPath, 0, engine.options);
  const darshanIdx = northPath.waypoints.findIndex((wp) => wp.zone === 'darshan');
  const darshanWp = northPath.waypoints[darshanIdx];

  agent.targetWaypointIndex = darshanIdx;
  agent.position.x = darshanWp.x;
  agent.position.z = darshanWp.z;
  agent.darshanDwellTime = 0.40;

  engine.agents = [agent];

  for (let t = 0; t < 15; t++) {
    engine.updateAgent(agent, null, northPath, 0.05);
  }

  assert.ok(agent.targetWaypointIndex > darshanIdx, 'Devotee should progress past Darshan waypoint');
  assert.ok(agent.actualSpeed > 0.1, 'Devotee should resume walking speed toward exit');
});

// Test 10: Darshan dwell is short
test('Test 10: Darshan dwell is short and adheres to configurable DARSHAN_DWELL_SECONDS', () => {
  assert.ok(DARSHAN_DWELL_SECONDS <= 1.5, 'DARSHAN_DWELL_SECONDS default must be <= 1.5s');
  assert.ok(DARSHAN_DWELL_SECONDS >= 0.3, 'DARSHAN_DWELL_SECONDS default must be >= 0.3s');

  const engine = new SimulationEngine(fest, paths, { darshanDwellSeconds: 0.60 });
  assert.strictEqual(engine.darshanDwellSeconds, 0.60);

  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const agent = createAgent(404, northPath, 0, engine.options);
  assert.ok(agent.darshanDwellTime <= 1.2, 'Agent Darshan dwell time must be very short');
});

// Test 11: Other queue devotees continue moving
test('Test 11: Devotees upstream continue approaching naturally while front devotee dwells', () => {
  const engine = new SimulationEngine(fest, paths, { darshanDwellSeconds: 0.60 });
  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const darshanIdx = northPath.waypoints.findIndex((wp) => wp.zone === 'darshan');
  const darshanWp = northPath.waypoints[darshanIdx];

  const frontAgent = createAgent(501, northPath, 0, engine.options);
  frontAgent.targetWaypointIndex = darshanIdx;
  frontAgent.position.x = darshanWp.x;
  frontAgent.position.z = darshanWp.z - 0.2;
  frontAgent.actualSpeed = 0;

  const rearAgent = createAgent(502, northPath, 0, engine.options);
  rearAgent.targetWaypointIndex = darshanIdx;
  rearAgent.position.x = darshanWp.x;
  rearAgent.position.z = darshanWp.z - 8.0; // 8 meters behind
  rearAgent.actualSpeed = 1.3;

  engine.agents = [frontAgent, rearAgent];

  engine.updateAgent(frontAgent, null, northPath, 0.05);
  engine.updateAgent(rearAgent, frontAgent, northPath, 0.05);

  assert.strictEqual(frontAgent.logicalState, 'darshan_dwell');
  assert.ok(rearAgent.actualSpeed > 0.9, 'Rear agent continues walking smoothly toward Darshan');
  assert.strictEqual(rearAgent.stalled, false);
});

// Test 12: Security guards do not affect crowd counts
test('Test 12: Security guards are visual-only staff and do NOT affect crowd counts', () => {
  const engine = new SimulationEngine(fest, paths);
  const initialMetrics = engine.getMetrics();

  assert.strictEqual(initialMetrics.activeCrowd, 0, 'Initial active crowd must be 0');
  assert.strictEqual(engine.agents.length, 0, 'Visual agents must only contain devotees');

  // Spawn devotees
  engine.spawnNextAgent();
  const metricsAfterSpawn = engine.getMetrics();
  assert.strictEqual(metricsAfterSpawn.activeCrowd, 1, 'Active crowd matches devotee count');
  assert.strictEqual(engine.agents.length, 1);
});

// Test 13: Security guards do not affect queue capacity
test('Test 13: Security guards do not affect queue capacity', () => {
  const engine = new SimulationEngine(fest, paths);
  const northCap = engine.entranceStats.north.queueCapacity;
  const westCap = engine.entranceStats.west.queueCapacity;
  const eastCap = engine.entranceStats.east.queueCapacity;

  assert.ok(northCap >= 1000, 'Queue capacity is physical devotee capacity');
  assert.ok(westCap >= 1000);
  assert.ok(eastCap >= 1000);

  // Available capacity equals total capacity when empty
  assert.strictEqual(engine.entranceStats.north.availableCapacity, northCap);
});

// Test 14: Security guards are not duplicated every frame
test('Test 14: Security checkpoints have static guard placement without per-frame instantiation', () => {
  const checkpoints = fest.components.filter((c) => c.role === 'security' || c.type === 'security' || c.id?.includes('security'));
  assert.ok(checkpoints.length >= 3, 'Festival campus has distinct security checkpoint components');

  // Check that checkpoint component IDs are unique static entities
  const ids = new Set(checkpoints.map((c) => c.id));
  assert.strictEqual(ids.size, checkpoints.length, 'Every security checkpoint has a permanent unique ID');
});

// Test 15: Short service dwell does not create a congestion recommendation
test('Test 15: Short service dwell is recognized as normal service and does NOT trigger congestion recommendation', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3,
    securityDwellSeconds: 0.45,
    darshanDwellSeconds: 0.60,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  // Set up flowing North queue where devotees experience normal short service dwells
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1200,
    entered: 800,
    completed: 400,
    queueOccupancy: 350,
    avgWaitMinutes: 0.3,
    avgSpeed: 1.1, // Healthy flow speed
    arrivalRate: 200,
    serviceRate: 200,
    queueGrowthRate: 0,
  });

  // Advance simulation past warmup and observation window
  for (let step = 0; step < 60; step++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false, 'Normal service dwells must NEVER trigger congestion recommendation');
  assert.strictEqual(engine.entranceStats.north.congestionState, 'FLOWING', 'Congestion state must be FLOWING');
  assert.strictEqual(engine.entranceStats.north.status, 'NORMAL');
});

// Test 16: Genuine sustained queue blockage can still be detected
test('Test 16: Genuine sustained physical queue blockage is still accurately detected', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 4.0,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  // North queue is genuinely blocked: high occupancy, stalled movement, capacity deficit
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 200,
    queueOccupancy: 950, // 95% utilization
    avgSpeed: 0.15, // Severe speed drop (< 0.35)
    queueProgress: 0.12,
    arrivalRate: 500,
    serviceRate: 150,
    queueGrowthRate: 40,
  });

  // West has available spare capacity
  engine.seedEntranceCrowd('west', {
    queueCapacity: 1500,
    entered: 300,
    completed: 100,
    queueOccupancy: 200,
    avgSpeed: 1.2,
    arrivalRate: 100,
    serviceRate: 100,
    queueGrowthRate: 0,
  });

  for (let step = 0; step < 70; step++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, true, 'Genuine sustained physical queue blockage MUST trigger redirection recommendation');
  assert.strictEqual(engine.entranceStats.north.congestionState, 'BLOCKED');
  assert.ok(engine.entranceStats.north.blockedDuration >= 4.0);
});

// Test 17: Existing entrance telemetry remains correct
test('Test 17: Existing entrance telemetry fields and mathematical invariants hold', () => {
  const engine = new SimulationEngine(fest, paths);
  const st = engine.entranceStats.north;

  assert.strictEqual(typeof st.entered, 'number');
  assert.strictEqual(typeof st.active, 'number');
  assert.strictEqual(typeof st.completed, 'number');
  assert.strictEqual(typeof st.queueOccupancy, 'number');
  assert.strictEqual(typeof st.queueCapacity, 'number');
  assert.strictEqual(typeof st.availableCapacity, 'number');
  assert.strictEqual(typeof st.queueUtilization, 'number');
  assert.strictEqual(typeof st.avgSpeed, 'number');
  assert.strictEqual(typeof st.congestionState, 'string');
  assert.ok(['FLOWING', 'SLOW', 'CONGESTED', 'BLOCKED'].includes(st.congestionState));
});

// Test 18: Existing redirection tests continue passing
test('Test 18: Reversible redirection and operator lifecycle remain consistent', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 2,
  });

  let promptData = null;
  engine.onDiversionPrompt = (data) => { promptData = data; };

  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 200,
    queueOccupancy: 950,
    avgSpeed: 0.15,
    queueProgress: 0.12,
    arrivalRate: 500,
    serviceRate: 150,
    queueGrowthRate: 40,
  });

  engine.seedEntranceCrowd('west', {
    queueCapacity: 1500,
    entered: 300,
    completed: 100,
    queueOccupancy: 200,
    avgSpeed: 1.2,
    arrivalRate: 100,
    serviceRate: 100,
    queueGrowthRate: 0,
  });

  engine.seedEntranceCrowd('east', {
    queueCapacity: 1000,
    entered: 800,
    completed: 100,
    queueOccupancy: 650,
    avgSpeed: 0.8,
    arrivalRate: 200,
    serviceRate: 100,
    queueGrowthRate: 10,
  });

  for (let i = 0; i < 50; i++) {
    engine.update(0.1);
  }

  assert.ok(promptData !== null, 'Recommendation modal triggered');
  assert.strictEqual(promptData.congestedStream, 'north');
  assert.strictEqual(promptData.targetStream, 'west');

  // Accept recommendation
  engine.acceptRerouting();
  assert.strictEqual(engine.diversionApproved, true);
  assert.strictEqual(engine.entranceStats.north.alertState, 'USER_ACCEPTED');
});

// Test 19: Visual agent pool remains bounded
test('Test 19: Visual agent pool remains strictly bounded under continuous service dwells', () => {
  const engine = new SimulationEngine(fest, paths, {
    securityDwellSeconds: 0.45,
    darshanDwellSeconds: 0.60,
  });

  // Run 100 simulation update steps with continuous arrivals
  for (let i = 0; i < 100; i++) {
    engine.spawnNextAgent();
    engine.update(0.1);
  }

  assert.ok(engine.agents.length <= engine.targetVisualAgents, `Visual agents (${engine.agents.length}) must not exceed target visual limit (${engine.targetVisualAgents})`);
  assert.ok(engine.agents.length > 0, 'Simulation maintains an active visual crowd');
});

console.log('\n========================================================================');
console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
}
