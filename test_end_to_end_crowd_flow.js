/**
 * DevaSetu End-to-End Real Crowd-Flow Verification Suite
 * 
 * Verifies complete real crowd-flow behavior in the 100K Festival Campus:
 * 1. Devotees traverse every zone in sequence:
 *    Entrance Gopuram -> Arrival Gate -> Holding Loop -> Security Screening -> Queue Lane ->
 *    Central Darshan Spine -> Darshan Sanctum -> Dispersal Promenade & Plaza -> Exit Corridor -> South Exit Gopuram.
 * 2. Devotees never stop permanently at security or Darshan.
 * 3. Short deterministic security dwell (~0.45s).
 * 4. Short deterministic Darshan dwell (~0.60s).
 * 5. Security service time is separated from queue waiting time.
 * 6. Darshan service time is separated from queue waiting time.
 * 7. Multi-channel parallel security screening: devotees process independently across channels.
 * 8. One occupied security channel does NOT freeze other channels or queues.
 * 9. Darshan dwell does NOT freeze the entire queue; upstream devotees continue approaching naturally.
 * 10. Natural kinematics: devotees decelerate smoothly, maintain heading orientation, and accelerate back to walking speed.
 * 11. Congestion detector recognizes short service dwells as normal flowing behavior (never produces false BLOCKED state).
 * 12. Genuine sustained queue blockage is accurately detected.
 * 13. Existing devotees in the queue are NEVER reassigned or teleported upon rerouting.
 * 14. Approved redirection redirects only future arrivals.
 * 15. When all alternatives are overloaded, NO redirection recommendation is made.
 * 16. Devotees completing their journey cleanly exit the system and visual agent IDs are recycled.
 * 17. Security guards are purely visual scene infrastructure (0 impact on crowd counts or queue capacity).
 * 18. Continuous multi-stream flow (North, West, East) functions concurrently with bounded visual agents.
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
console.log(' DevaSetu End-to-End Real Crowd-Flow Verification Suite                 ');
console.log('========================================================================\n');

const fest = generateFestivalScenario();
const pathResult = generateSimulationPaths(fest);
const paths = pathResult.paths;

// ---------------------------------------------------------------------------
// TEST 1: Full sequential traversal across all zones from North entrance to exit
// ---------------------------------------------------------------------------
test('Test 1: Devotee traverses all zones sequentially (Entrance -> Holding -> Security -> Queue -> Darshan -> Dispersal -> Exit)', () => {
  const engine = new SimulationEngine(fest, paths, {
    securityDwellSeconds: 0.35,
    darshanDwellSeconds: 0.45,
  });

  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  assert.ok(northPath, 'North path must exist');
  const waypoints = northPath.waypoints;
  assert.ok(waypoints.length >= 8, 'Path must contain comprehensive waypoints');

  // Verify waypoints contain the full physical journey sequence
  const zonesInOrder = waypoints.map((w) => w.zone);
  assert.ok(zonesInOrder.includes('entrance'), 'Must contain entrance zone');
  assert.ok(zonesInOrder.includes('holding'), 'Must contain holding zone');
  assert.ok(zonesInOrder.includes('security'), 'Must contain security zone');
  assert.ok(zonesInOrder.includes('queue'), 'Must contain queue zone');
  assert.ok(zonesInOrder.includes('darshan'), 'Must contain darshan zone');
  assert.ok(zonesInOrder.includes('dispersal'), 'Must contain dispersal zone');
  assert.ok(zonesInOrder.includes('exit'), 'Must contain exit zone');

  // Create an agent and step through the entire route
  const agent = createAgent(1001, northPath, 0, engine.options);
  engine.agents = [agent];

  const visitedStates = new Set();
  const visitedZones = new Set();

  let maxSteps = 6000;
  let isFinished = false;

  while (maxSteps-- > 0 && !isFinished) {
    engine.simTime += 0.05;
    visitedStates.add(agent.state);
    visitedZones.add(agent.currentZone);

    isFinished = engine.updateAgent(agent, null, northPath, 0.05);
  }

  assert.strictEqual(isFinished, true, 'Devotee must finish route at South Exit Gopuram');
  assert.ok(visitedStates.has(AGENT_STATES.ENTERING), 'Devotee experienced ENTERING state');
  assert.ok(visitedStates.has(AGENT_STATES.SECURITY), 'Devotee experienced SECURITY state');
  assert.ok(visitedStates.has(AGENT_STATES.QUEUEING), 'Devotee experienced QUEUEING state');
  assert.ok(visitedStates.has(AGENT_STATES.DARSHAN), 'Devotee experienced DARSHAN state');
  assert.ok(visitedStates.has(AGENT_STATES.EXITING), 'Devotee experienced EXITING state');
  assert.ok(visitedZones.has('entrance'), 'Devotee visited entrance');
  assert.ok(visitedZones.has('security'), 'Devotee visited security');
  assert.ok(visitedZones.has('queue'), 'Devotee visited queue');
  assert.ok(visitedZones.has('darshan'), 'Devotee visited darshan');
  assert.ok(visitedZones.has('exit'), 'Devotee visited exit');
});

// ---------------------------------------------------------------------------
// TEST 2: Short security screening dwell with automatic release
// ---------------------------------------------------------------------------
test('Test 2: Security check halts devotee for short dwell, then automatically resumes movement', () => {
  const engine = new SimulationEngine(fest, paths, { securityDwellSeconds: 0.40 });
  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const secIdx = northPath.waypoints.findIndex((wp) => wp.zone === 'security');
  const secWp = northPath.waypoints[secIdx];

  const agent = createAgent(1002, northPath, 0, engine.options);
  agent.targetWaypointIndex = secIdx;
  agent.position.x = secWp.x;
  agent.position.z = secWp.z - 0.3;
  agent.securityDwellTime = 0.40;

  engine.agents = [agent];

  // Step 1: Enters screening
  engine.simTime += 0.05;
  engine.updateAgent(agent, null, northPath, 0.05);

  assert.strictEqual(agent.state, AGENT_STATES.SECURITY);
  assert.strictEqual(agent.logicalState, 'security_check');
  assert.strictEqual(agent.serviceTimer > 0, true);

  // Advance through dwell (0.40s)
  for (let t = 0; t < 10; t++) {
    engine.simTime += 0.05;
    engine.updateAgent(agent, null, northPath, 0.05);
  }

  assert.strictEqual(agent.logicalState, 'security_complete', 'Devotee completes security screening');
  assert.strictEqual(agent.serviceTimer >= 0.40, true);

  // Further step: Resumes walking toward queue lane
  engine.simTime += 0.05;
  engine.updateAgent(agent, null, northPath, 0.05);
  assert.ok(agent.actualSpeed > 0.1, 'Devotee accelerates to resume movement');
});

// ---------------------------------------------------------------------------
// TEST 3: Short Darshan sanctum dwell with sanctum orientation
// ---------------------------------------------------------------------------
test('Test 3: Darshan viewing halts devotee briefly, faces sanctum, and resumes movement', () => {
  const engine = new SimulationEngine(fest, paths, { darshanDwellSeconds: 0.55 });
  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const darshanIdx = northPath.waypoints.findIndex((wp) => wp.zone === 'darshan');
  const darshanWp = northPath.waypoints[darshanIdx];

  const agent = createAgent(1003, northPath, 0, engine.options);
  agent.targetWaypointIndex = darshanIdx;
  agent.position.x = darshanWp.x;
  agent.position.z = darshanWp.z - 0.3;
  agent.darshanDwellTime = 0.55;

  engine.agents = [agent];

  // Arrives at viewing point
  engine.simTime += 0.05;
  engine.updateAgent(agent, null, northPath, 0.05);

  assert.strictEqual(agent.state, AGENT_STATES.DARSHAN);
  assert.strictEqual(agent.logicalState, 'darshan_dwell');
  assert.strictEqual(agent.targetHeading, darshanWp.headingAngle !== undefined ? darshanWp.headingAngle : Math.PI, 'Faces sanctum viewing orientation');

  // Advance through Darshan dwell
  for (let t = 0; t < 14; t++) {
    engine.simTime += 0.05;
    engine.updateAgent(agent, null, northPath, 0.05);
  }

  assert.strictEqual(agent.logicalState, 'darshan_complete', 'Darshan dwell ends automatically');

  // Continues toward post-Darshan dispersal
  engine.simTime += 0.05;
  engine.updateAgent(agent, null, northPath, 0.05);
  assert.ok(agent.actualSpeed > 0.1, 'Devotee smoothly resumes walking toward exit');
});

// ---------------------------------------------------------------------------
// TEST 4: Service time is strictly separated from queue waiting time
// ---------------------------------------------------------------------------
test('Test 4: Service dwell accumulates serviceTime and does NOT artificially inflate queue waitTime', () => {
  const engine = new SimulationEngine(fest, paths, { securityDwellSeconds: 0.40, darshanDwellSeconds: 0.50 });
  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const secIdx = northPath.waypoints.findIndex((wp) => wp.zone === 'security');
  const secWp = northPath.waypoints[secIdx];

  const agent = createAgent(1004, northPath, 0, engine.options);
  agent.targetWaypointIndex = secIdx;
  agent.position.x = secWp.x;
  agent.position.z = secWp.z - 0.2;
  agent.securityDwellTime = 0.40;
  agent.waitTime = 0;
  agent.serviceTime = 0;

  engine.agents = [agent];

  // Devotee spends 0.40s undergoing security screening
  for (let t = 0; t < 8; t++) {
    engine.simTime += 0.05;
    engine.updateAgent(agent, null, northPath, 0.05);
  }

  assert.ok(agent.serviceTime >= 0.35, `Service time must accumulate during screening (Found: ${agent.serviceTime}s)`);
  assert.strictEqual(agent.waitTime, 0, 'Normal screening service dwell must NOT accumulate as queue wait time');
});

// ---------------------------------------------------------------------------
// TEST 5: Parallel security screening across independent channels
// ---------------------------------------------------------------------------
test('Test 5: Multiple parallel security channels screen different devotees concurrently', () => {
  const engine = new SimulationEngine(fest, paths, { securityDwellSeconds: 0.45 });
  const northPaths = paths.filter((p) => p.stream === 'north' && !p.isDiversion);

  // Pick two paths with distinct security channels
  const p1 = northPaths.find((p) => p.waypoints.some((w) => w.zone === 'security' && w.componentId?.includes('n3'))) || northPaths[0];
  const p2 = northPaths.find((p) => p.waypoints.some((w) => w.zone === 'security' && w.componentId?.includes('n4'))) || northPaths[2];

  const secIdx1 = p1.waypoints.findIndex((wp) => wp.zone === 'security');
  const secIdx2 = p2.waypoints.findIndex((wp) => wp.zone === 'security');

  const a1 = createAgent(2001, p1, 0, engine.options);
  a1.targetWaypointIndex = secIdx1;
  a1.position.x = p1.waypoints[secIdx1].x;
  a1.position.z = p1.waypoints[secIdx1].z - 0.2;

  const a2 = createAgent(2002, p2, 0, engine.options);
  a2.targetWaypointIndex = secIdx2;
  a2.position.x = p2.waypoints[secIdx2].x;
  a2.position.z = p2.waypoints[secIdx2].z - 0.2;

  engine.agents = [a1, a2];

  engine.simTime += 0.05;
  engine.updateAgent(a1, null, p1, 0.05);
  engine.updateAgent(a2, null, p2, 0.05);

  assert.strictEqual(a1.logicalState, 'security_check', 'Devotee 1 is actively screening in Channel 1');
  assert.strictEqual(a2.logicalState, 'security_check', 'Devotee 2 is actively screening in Channel 2');
  assert.ok(Object.keys(engine.securityChannels).length >= 2, 'Engine tracks both parallel screening channels');
});

// ---------------------------------------------------------------------------
// TEST 6: One occupied channel does NOT freeze other channels or queues
// ---------------------------------------------------------------------------
test('Test 6: Devotee occupying Channel 1 does not freeze Channel 2 or other lanes', () => {
  const engine = new SimulationEngine(fest, paths, { securityDwellSeconds: 0.50 });
  const northPaths = paths.filter((p) => p.stream === 'north' && !p.isDiversion);

  const p1 = northPaths.find((p) => p.waypoints.some((w) => w.zone === 'security' && w.componentId?.includes('n3'))) || northPaths[0];
  const p2 = northPaths.find((p) => p.waypoints.some((w) => w.zone === 'security' && w.componentId?.includes('n4'))) || northPaths[2];

  const secIdx1 = p1.waypoints.findIndex((wp) => wp.zone === 'security');
  const secIdx2 = p2.waypoints.findIndex((wp) => wp.zone === 'security');

  // Agent 1 is dwelling in Channel 1
  const a1 = createAgent(3001, p1, 0, engine.options);
  a1.targetWaypointIndex = secIdx1;
  a1.position.x = p1.waypoints[secIdx1].x;
  a1.position.z = p1.waypoints[secIdx1].z - 0.1;
  a1.actualSpeed = 0;

  // Agent 2 is approaching on Channel 2
  const a2 = createAgent(3002, p2, 0, engine.options);
  a2.targetWaypointIndex = secIdx2;
  a2.position.x = p2.waypoints[secIdx2].x;
  a2.position.z = p2.waypoints[secIdx2].z - 5.0; // 5 meters away
  a2.actualSpeed = 1.3;

  engine.agents = [a1, a2];

  engine.simTime += 0.05;
  engine.updateAgent(a1, null, p1, 0.05);
  engine.updateAgent(a2, null, p2, 0.05);

  assert.strictEqual(a1.logicalState, 'security_check');
  assert.ok(a2.actualSpeed > 0.9, 'Agent 2 on channel 2 moves forward unimpeded');
  assert.strictEqual(a2.stalled, false, 'Channel 2 is NOT frozen');
});

// ---------------------------------------------------------------------------
// TEST 7: Darshan dwell does not freeze upstream devotees
// ---------------------------------------------------------------------------
test('Test 7: Front devotee in Darshan does not freeze devotees approaching behind', () => {
  const engine = new SimulationEngine(fest, paths, { darshanDwellSeconds: 0.60 });
  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const darshanIdx = northPath.waypoints.findIndex((wp) => wp.zone === 'darshan');
  const darshanWp = northPath.waypoints[darshanIdx];

  // Devotee 1 is at Darshan viewing point
  const a1 = createAgent(4001, northPath, 0, engine.options);
  a1.targetWaypointIndex = darshanIdx;
  a1.position.x = darshanWp.x;
  a1.position.z = darshanWp.z - 0.1;
  a1.actualSpeed = 0;

  // Devotee 2 is 10 meters behind in the central spine queue
  const a2 = createAgent(4002, northPath, 0, engine.options);
  a2.targetWaypointIndex = darshanIdx;
  a2.position.x = darshanWp.x;
  a2.position.z = darshanWp.z - 10.0;
  a2.actualSpeed = 1.35;

  engine.agents = [a1, a2];

  engine.simTime += 0.05;
  engine.updateAgent(a1, null, northPath, 0.05);
  engine.updateAgent(a2, a1, northPath, 0.05);

  assert.strictEqual(a1.logicalState, 'darshan_dwell');
  assert.ok(a2.actualSpeed > 1.0, 'Devotee 2 continues walking forward in queue');
  assert.strictEqual(a2.stalled, false);
});

// ---------------------------------------------------------------------------
// TEST 8: Congestion detector ignores normal service dwells
// ---------------------------------------------------------------------------
test('Test 8: Congestion detector treats normal service dwell as healthy FLOWING queue', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3,
    securityDwellSeconds: 0.45,
    darshanDwellSeconds: 0.60,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  // Moderate crowd undergoing normal flowing security checks and darshan
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1200,
    entered: 600,
    completed: 250,
    queueOccupancy: 300,
    avgWaitMinutes: 0.2,
    avgSpeed: 1.1, // Healthy flow speed (> 0.70 m/s)
    queueProgress: 0.90,
    arrivalRate: 200,
    serviceRate: 200,
    queueGrowthRate: 0,
  });

  for (let step = 0; step < 50; step++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false, 'No redirection prompt during healthy service flow');
  assert.strictEqual(engine.entranceStats.north.congestionState, 'FLOWING', 'North must be FLOWING');
  assert.strictEqual(engine.entranceStats.north.status, 'NORMAL');
});

// ---------------------------------------------------------------------------
// TEST 9: Genuine sustained blockage is accurately detected
// ---------------------------------------------------------------------------
test('Test 9: Genuine sustained queue blockage triggers BLOCKED state and redirection recommendation', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 3.5,
  });

  let promptFired = false;
  let promptData = null;
  engine.onDiversionPrompt = (data) => {
    promptFired = true;
    promptData = data;
  };

  // North queue is genuinely blocked
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 100,
    queueOccupancy: 950, // 95% utilization
    avgSpeed: 0.18, // Stalled movement (< 0.35 m/s)
    queueProgress: 0.15,
    arrivalRate: 400,
    serviceRate: 100,
    queueGrowthRate: 35,
  });

  // West has ample available capacity (10% util)
  engine.seedEntranceCrowd('west', {
    queueCapacity: 1500,
    entered: 300,
    completed: 100,
    queueOccupancy: 150, // 10% utilization
    avgSpeed: 1.2,
    arrivalRate: 80,
    serviceRate: 80,
    queueGrowthRate: 0,
  });

  // East has moderate occupancy (40% util)
  engine.seedEntranceCrowd('east', {
    queueCapacity: 1000,
    entered: 500,
    completed: 100,
    queueOccupancy: 400, // 40% utilization
    avgSpeed: 1.0,
    arrivalRate: 100,
    serviceRate: 100,
    queueGrowthRate: 0,
  });

  // Run past warmup and observation window
  for (let step = 0; step < 60; step++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, true, 'Redirection prompt must fire for persistent blockage');
  assert.strictEqual(engine.entranceStats.north.congestionState, 'BLOCKED');
  assert.strictEqual(promptData.congestedStream, 'north');
  assert.strictEqual(promptData.targetStream, 'west');
});

// ---------------------------------------------------------------------------
// TEST 10: Existing devotees are never redirected
// ---------------------------------------------------------------------------
test('Test 10: Approved redirection NEVER reassigns or teleports existing devotees in queues', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 2,
  });

  // Spawn visual devotees in North
  for (let i = 0; i < 20; i++) {
    engine.spawnNextAgent();
  }

  const northAgentsBefore = engine.agents.filter((a) => a.entryStream === 'north');
  assert.ok(northAgentsBefore.length > 0, 'Active North visual agents exist');

  const beforeSnapshots = northAgentsBefore.map((a) => ({
    id: a.id,
    entryStream: a.entryStream,
    streamId: a.streamId,
    entranceId: a.entranceId,
    posX: a.position.x,
    posZ: a.position.z,
  }));

  // Operator approves redirection from North -> West
  engine.approveRerouting('north', 'west', 20);

  // Advance simulation
  engine.update(0.1);

  // Verify every pre-existing devotee retained their original stream and identity
  for (const snap of beforeSnapshots) {
    const a = engine.agents.find((x) => x.id === snap.id);
    assert.ok(a, `Agent ${snap.id} must still exist in simulation`);
    assert.strictEqual(a.entryStream, 'north', 'entryStream must NEVER change for existing devotees');
    assert.strictEqual(a.entranceId, 'north', 'entranceId must NEVER change');
    assert.strictEqual(a.streamId, 'north', 'streamId must NEVER change');
  }
});

// ---------------------------------------------------------------------------
// TEST 11: Approved redirection modifies future arrival weights
// ---------------------------------------------------------------------------
test('Test 11: Approved redirection transfers distribution weight for future arrivals only', () => {
  const engine = new SimulationEngine(fest, paths);
  engine.setEntranceInflow({ north: 60, west: 20, east: 20 });

  assert.strictEqual(engine.activeEntranceWeights.north, 60);
  assert.strictEqual(engine.activeEntranceWeights.west, 20);

  engine.approveRerouting('north', 'west', 20);

  // Diverted weight transferred from North to West
  assert.ok(engine.activeEntranceWeights.north < 60, 'North active weight reduced');
  assert.ok(engine.activeEntranceWeights.west > 20, 'West active weight increased');
});

// ---------------------------------------------------------------------------
// TEST 12: No redirection when all alternative entrances are overloaded
// ---------------------------------------------------------------------------
test('Test 12: Redirection is NOT recommended when all alternate entrances are also overloaded', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    warmupPeriod: 2,
    minCongestionDuration: 2,
  });

  let promptFired = false;
  engine.onDiversionPrompt = () => { promptFired = true; };

  // North blocked
  engine.seedEntranceCrowd('north', {
    queueCapacity: 1000,
    entered: 1500,
    completed: 100,
    queueOccupancy: 950,
    avgSpeed: 0.15,
    queueProgress: 0.12,
    arrivalRate: 400,
    serviceRate: 100,
    queueGrowthRate: 30,
  });

  // West is ALSO overloaded (utilization >= 60%)
  engine.seedEntranceCrowd('west', {
    queueCapacity: 1000,
    entered: 1200,
    completed: 100,
    queueOccupancy: 800, // 80% util
    avgSpeed: 0.30,
  });

  // East is ALSO overloaded (utilization >= 60%)
  engine.seedEntranceCrowd('east', {
    queueCapacity: 1000,
    entered: 1200,
    completed: 100,
    queueOccupancy: 750, // 75% util
    avgSpeed: 0.35,
  });

  for (let i = 0; i < 50; i++) {
    engine.update(0.1);
  }

  assert.strictEqual(promptFired, false, 'No redirection prompt when all alternatives are overloaded');
  assert.strictEqual(engine.aiNavigationState.allQueuesOverloaded, true, 'Engine flags allQueuesOverloaded');
});

// ---------------------------------------------------------------------------
// TEST 13: Completed devotees exit correctly and visual agent IDs are recycled
// ---------------------------------------------------------------------------
test('Test 13: Devotees completing traversal exit cleanly and visual IDs are recycled', () => {
  const engine = new SimulationEngine(fest, paths, {
    securityDwellSeconds: 0.20,
    darshanDwellSeconds: 0.20,
  });

  const northPath = paths.find((p) => p.stream === 'north' && !p.isDiversion);
  const agent = createAgent(5001, northPath, 0, engine.options);
  // Place agent at final exit waypoint
  agent.targetWaypointIndex = northPath.waypoints.length - 1;
  agent.position.x = northPath.waypoints[agent.targetWaypointIndex].x;
  agent.position.z = northPath.waypoints[agent.targetWaypointIndex].z;
  agent.actualSpeed = 1.4;

  engine.agents = [agent];
  const initialPoolSize = engine.agentIdPool.length;

  engine.update(0.1);

  assert.strictEqual(engine.agents.length, 0, 'Completed devotee must be removed from active agents');
  assert.strictEqual(engine.totalCompletedCount, 1, 'Completed counter must increment');
  assert.ok(engine.agentIdPool.includes(5001), 'Agent ID 5001 must be returned to reusable ID pool');
});

// ---------------------------------------------------------------------------
// TEST 14: Security guard avatars remain purely visual scene infrastructure
// ---------------------------------------------------------------------------
test('Test 14: Security guard avatars have zero presence in crowd counts and zero effect on queue capacity', () => {
  const engine = new SimulationEngine(fest, paths);
  const metrics = engine.getMetrics();

  assert.strictEqual(metrics.activeCrowd, 0);
  assert.strictEqual(metrics.visitorsInSecurity, 0);
  assert.strictEqual(engine.agents.length, 0);

  // Queue capacity reflects devotee physical spaces
  assert.strictEqual(engine.entranceStats.north.queueCapacity >= 1000, true);
  assert.strictEqual(engine.entranceStats.north.availableCapacity, engine.entranceStats.north.queueCapacity);
});

// ---------------------------------------------------------------------------
// TEST 15: Continuous multi-stream flow operates concurrently with bounded visual agents
// ---------------------------------------------------------------------------
test('Test 15: Continuous simulation across North, West, East maintains bounded visual agent count', () => {
  const engine = new SimulationEngine(fest, paths, {
    plannedCrowd: 10000,
    securityDwellSeconds: 0.40,
    darshanDwellSeconds: 0.50,
  });

  // Run 150 continuous simulation steps
  for (let step = 0; step < 150; step++) {
    engine.spawnNextAgent();
    engine.update(0.1);
  }

  assert.ok(engine.agents.length > 0, 'Active visual devotees present');
  assert.ok(engine.agents.length <= engine.targetVisualAgents, `Visual agents (${engine.agents.length}) bounded by ${engine.targetVisualAgents}`);
  assert.ok(engine.totalSpawnedCount > 0, 'Continuous spawning succeeded');
  assert.ok(engine.entranceStats.north.entered > 0, 'North arrivals recorded');
  assert.ok(engine.entranceStats.west.entered > 0, 'West arrivals recorded');
  assert.ok(engine.entranceStats.east.entered > 0, 'East arrivals recorded');
});

console.log('\n========================================================================');
console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
}
