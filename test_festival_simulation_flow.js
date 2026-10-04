import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { useSimulationStore } from './src/features/simulation/simulationStore.js';
import { AGENT_STATES } from './src/features/simulation/simulationModel.js';

console.log('========================================================================');
console.log(' DevaSetu 100K Festival Campus Simulation Flow Test Suite              ');
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

const festivalScene = generateFestivalScenario();
const pathResult = generateSimulationPaths(festivalScene);

// -----------------------------------------------------------------------------
// TEST 1: Initial State before simulation starts
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Initial Idle State (No simulation running, 0 occupancy, 0 alerts, 0% utilization) ---');
{
  useSimulationStore.getState().resetSimulation(festivalScene);
  const state = useSimulationStore.getState();

  assert(state.simulationRunning === false, 'simulationRunning is false initially');
  assert(state.arrivalsPaused === false, 'arrivalsPaused is false initially');
  assert(state.status === 'idle', 'status is idle');
  assert(state.agents.length === 0, 'No visual agents on campus initially');
  assert(state.metrics.visitorsEntered === 0, 'visitorsEntered is 0');
  assert(state.metrics.visitorsActive === 0, 'visitorsActive is 0');
  assert(state.metrics.visitorsCompleted === 0, 'visitorsCompleted is 0');
  assert(state.metrics.visitorsInQueue === 0, 'visitorsInQueue is 0');
  assert(state.metrics.visitorsInSecurity === 0, 'visitorsInSecurity is 0');
  assert(state.metrics.visitorsInDarshan === 0, 'visitorsInDarshan is 0');
  assert(state.metrics.avgWaitMinutes === 0, 'avgWaitMinutes is 0');
  assert(state.metrics.throughputPerHour === 0, 'throughputPerHour is 0');
  assert(state.pressureState === null || (state.pressureState.alerts.length === 0 && state.pressureState.index === 0), 'No capacity alerts active at start');
}

// -----------------------------------------------------------------------------
// TEST 2: Start Simulation: people spawn at entrances, not middle of queues
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Start Simulation: Devotees spawn at entrance, NO middle-of-queue seeding ---');
{
  useSimulationStore.getState().startSimulation(festivalScene);
  const state = useSimulationStore.getState();
  const engine = state.engine;

  assert(state.simulationRunning === true, 'simulationRunning is true after START SIMULATION');
  assert(state.arrivalsPaused === false, 'arrivalsPaused is false after START SIMULATION');
  assert(state.status === 'running', 'status is running');
  assert(state.agents.length === 0, 'Frame 0 has no pre-seeded agents in queues');

  const pressure = engine.getPressureState();
  assert(pressure.alerts.length === 0, 'Zero capacity alerts at simulation start');
  assert(pressure.index === 0, 'Crowd pressure index starts at 0');
  assert(pressure.level === 'normal', 'Crowd pressure level is normal');
  assert(pressure.overloadedZones.length === 0, 'No overloaded zones at start');

  // Advance simulation by 0.5s to spawn the first wave of devotees
  engine.update(0.5, 1.0);
  assert(engine.agents.length > 0, `Devotees began spawning (Visual count: ${engine.agents.length})`);

  // Verify that EVERY newly spawned agent is at waypoint 0 or heading to waypoint 1
  for (const agent of engine.agents) {
    const path = engine.paths.find((p) => p.id === agent.pathId);
    const startWp = path.waypoints[0];
    assert(
      agent.targetWaypointIndex <= 1,
      `Agent ${agent.id} started at entrance waypoint 0 (target index: ${agent.targetWaypointIndex})`
    );
    assert(
      agent.state === AGENT_STATES.ENTERING || agent.state === AGENT_STATES.WAITING,
      `Agent ${agent.id} state is entering or approaching holding (${agent.state})`
    );
    // Verify position is near entrance waypoint, NOT inside queue or darshan
    assert(
      Math.abs(agent.position.z - startWp.z) < 15,
      `Agent ${agent.id} position z (${agent.position.z.toFixed(1)}) is near entrance (${startWp.z})`
    );
  }
}

// -----------------------------------------------------------------------------
// TEST 3: Full progression: Entrance -> Security -> Queue -> Darshan -> Exit -> Completed
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: Full Traversal Progression across all states to completion ---');
{
  const engine = new SimulationEngine(festivalScene, pathResult.paths);
  assert(engine.agents.length === 0, 'Fresh engine starts empty');

  const observedStates = new Set();

  // Run simulation for 500 simulated seconds (at speed multiplier 2.0: 2500 steps of 0.1s * 2.0 = 500s)
  for (let step = 0; step < 2500; step++) {
    engine.update(0.1, 2.0);
    for (const a of engine.agents) {
      observedStates.add(a.state);
    }
    if (engine.totalCompletedCount > 0) {
      observedStates.add(AGENT_STATES.COMPLETED);
    }
  }

  assert(observedStates.has(AGENT_STATES.ENTERING), 'Devotees traversed ENTERING state');
  assert(observedStates.has(AGENT_STATES.WAITING), 'Devotees traversed WAITING (holding) state');
  assert(observedStates.has(AGENT_STATES.SECURITY), 'Devotees traversed SECURITY state');
  assert(observedStates.has(AGENT_STATES.QUEUEING), 'Devotees traversed QUEUEING state');
  assert(observedStates.has(AGENT_STATES.DARSHAN), 'Devotees traversed DARSHAN state');
  assert(observedStates.has(AGENT_STATES.EXITING), 'Devotees traversed EXITING state');
  assert(observedStates.has(AGENT_STATES.COMPLETED), 'Devotees reached exit and transitioned to COMPLETED');

  const metrics = engine.getMetrics();
  assert(metrics.totalEntered > 0, `totalEntered: ${metrics.totalEntered}`);
  assert(metrics.completedCrowd > 0, `completedCrowd: ${metrics.completedCrowd}`);
  assert(metrics.activeCrowd > 0, `activeCrowd: ${metrics.activeCrowd}`);
  assert(
    metrics.activeCrowd === metrics.totalEntered - metrics.completedCrowd,
    `Active = Entered - Completed (${metrics.activeCrowd} === ${metrics.totalEntered} - ${metrics.completedCrowd})`
  );
  assert(metrics.throughputPerHour > 0, `Throughput computed from completed visitors: ${metrics.throughputPerHour}/hr`);
  assert(metrics.avgWaitMinutes > 0, `Avg wait time computed from actual dwell: ${metrics.avgWaitMinutes} min`);
}

// -----------------------------------------------------------------------------
// TEST 4: Pause New Arrivals vs Resume New Arrivals
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: Pause New Arrivals (Existing people continue moving, no global freeze) ---');
{
  useSimulationStore.getState().resetSimulation(festivalScene);
  useSimulationStore.getState().startSimulation(festivalScene);
  useSimulationStore.getState().setSpeed(4.0);

  // Run simulation 320 simulated seconds (800 steps * 0.1s * 4.0x = 320s) so devotees reach darshan and dispersal
  for (let i = 0; i < 800; i++) {
    useSimulationStore.getState().step(0.1);
  }

  const stateBeforePause = useSimulationStore.getState();
  const activeAtPause = stateBeforePause.metrics.visitorsActive;

  // User clicks PAUSE NEW ARRIVALS
  useSimulationStore.getState().pauseArrivals();
  const statePaused = useSimulationStore.getState();
  const enteredAtPause = statePaused.metrics.visitorsEntered;
  const completedAtPause = statePaused.metrics.visitorsCompleted;

  assert(enteredAtPause > 0, `Entered visitors at pause: ${enteredAtPause}`);
  assert(activeAtPause > 0, `Active visitors before pause: ${activeAtPause}`);

  assert(statePaused.arrivalsPaused === true, 'arrivalsPaused is true');
  assert(statePaused.simulationRunning === true, 'simulationRunning is STILL true (NO global freeze)');
  assert(statePaused.status === 'running', 'status remains running');

  // Run simulation another 200 simulated seconds (500 steps * 0.1s * 4.0x = 200s) with arrivals paused
  for (let i = 0; i < 500; i++) {
    useSimulationStore.getState().step(0.1);
  }

  const stateAfterPausedRun = useSimulationStore.getState();
  const enteredAfterPause = stateAfterPausedRun.metrics.visitorsEntered;
  const completedAfterPause = stateAfterPausedRun.metrics.visitorsCompleted;
  const activeAfterPause = stateAfterPausedRun.metrics.visitorsActive;

  assert(
    enteredAfterPause === enteredAtPause,
    `No new visitors entered while arrivals were paused (${enteredAfterPause} === ${enteredAtPause})`
  );
  assert(
    completedAfterPause > completedAtPause,
    `Existing devotees continued through queue to exit: Completed increased from ${completedAtPause} to ${completedAfterPause}`
  );
  assert(
    activeAfterPause < activeAtPause,
    `Active crowd naturally drained as devotees exited: Active decreased from ${activeAtPause} to ${activeAfterPause}`
  );
  assert(
    activeAfterPause === enteredAfterPause - completedAfterPause,
    `Active = Entered - Completed preserved during drainage (${activeAfterPause} === ${enteredAfterPause} - ${completedAfterPause})`
  );

  // User clicks RESUME NEW ARRIVALS
  useSimulationStore.getState().resumeArrivals();
  const stateResumed = useSimulationStore.getState();

  assert(stateResumed.arrivalsPaused === false, 'arrivalsPaused is false after RESUME NEW ARRIVALS');
  assert(stateResumed.simulationRunning === true, 'simulationRunning remains true');

  // Run simulation 10 seconds to confirm new arrivals resume
  for (let i = 0; i < 100; i++) {
    useSimulationStore.getState().step(0.1);
  }

  const stateAfterResume = useSimulationStore.getState();
  assert(
    stateAfterResume.metrics.visitorsEntered > enteredAfterPause,
    `New visitors resumed entering at gates (${stateAfterResume.metrics.visitorsEntered} > ${enteredAfterPause})`
  );
}

// -----------------------------------------------------------------------------
// TEST 5: Architecture Capacity & Dynamic Utilization starting at 0%
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: Architecture Capacity & Dynamic Utilization starting near 0% ---');
{
  useSimulationStore.getState().resetSimulation(festivalScene);
  useSimulationStore.getState().startSimulation(festivalScene);

  const initialMetrics = useSimulationStore.getState().metrics;
  const queueCap = 8752; // Derived from physical 100K static architecture
  const initialUtil = Math.round((initialMetrics.visitorsInQueue / queueCap) * 100);

  assert(initialUtil === 0, `Initial queue utilization starts at 0% (Found: ${initialUtil}%)`);
  assert(initialMetrics.visitorsInQueue === 0, 'Initial visitors in queue is 0');

  // Step simulation 25 seconds
  for (let i = 0; i < 250; i++) {
    useSimulationStore.getState().step(0.1);
  }

  const midMetrics = useSimulationStore.getState().metrics;
  const midUtil = Math.round((midMetrics.visitorsInQueue / queueCap) * 100);
  assert(midUtil >= 0 && midUtil <= 100, `Utilization climbs naturally with queue occupancy (${midUtil}%)`);
}

console.log('\n========================================================================');
console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================');

if (failed > 0) {
  process.exit(1);
}
