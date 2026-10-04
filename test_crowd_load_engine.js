import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';

console.log('========================================================================');
console.log(' DevaSetu Crowd Load Engine Test Suite                                 ');
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

// -----------------------------------------------------------------------------
// TEST SCENE SETUP
// -----------------------------------------------------------------------------
const festivalScenario = generateFestivalScenario();
const pathResult = generateSimulationPaths(festivalScenario);
assert(pathResult.ready, 'Festival scenario passes simulation readiness');

// -----------------------------------------------------------------------------
// 1. EXPECTED CROWD DOES NOT LIMIT TOTAL ENTERED
// -----------------------------------------------------------------------------
console.log('\n--- TEST 1 & 2: Expected Crowd (10,000) does NOT limit totalEntered (can reach 15,000+) ---');
{
  const customScene = {
    ...festivalScenario,
    requirements: {
      expectedVisitors: 10000,
      peakVisitors: 10000,
    },
  };

  const engine = new SimulationEngine(customScene, pathResult.paths);
  engine.seedInitialAgents();

  assert(engine.plannedCrowd === 10000, `Planned crowd registered as 10,000`);

  // Inject batches beyond planned crowd
  engine.addCrowdBatch(6000);
  let metrics = engine.getMetrics();
  assert(metrics.totalEntered >= 15000, `totalEntered (${metrics.totalEntered}) exceeds 15,000+ (planned crowd: 10,000)`);
  assert(metrics.plannedCrowd === 10000, `plannedCrowd remains stable at 10,000`);
}

// -----------------------------------------------------------------------------
// 3. MULTIPLE BATCH ADDITIONS ACCUMULATE RECURSIVELY
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: Multiple recursive batch additions accumulate correctly ---');
{
  const engine = new SimulationEngine(festivalScenario, pathResult.paths);
  engine.seedInitialAgents();
  const initialEntered = engine.getMetrics().totalEntered;

  engine.addCrowdBatch(1000);
  assert(engine.getMetrics().totalEntered === initialEntered + 1000, 'Batch +1,000 applied');

  engine.addCrowdBatch(5000);
  assert(engine.getMetrics().totalEntered === initialEntered + 6000, 'Batch +5,000 applied (total +6,000)');

  engine.addCrowdBatch(10000);
  assert(engine.getMetrics().totalEntered === initialEntered + 16000, 'Batch +10,000 applied (total +16,000)');
}

// -----------------------------------------------------------------------------
// 4. CONTINUOUS ARRIVAL RATE
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: Continuous arrival rate creates logical visitors at specified rate ---');
{
  const engine = new SimulationEngine(festivalScenario, pathResult.paths);
  engine.seedInitialAgents();
  engine.setArrivalRate(600); // 600 visitors/minute = 10 visitors/second

  const startEntered = engine.getMetrics().totalEntered;

  // Run simulation for 10 simulated seconds (100 steps of 0.1s)
  for (let i = 0; i < 100; i++) {
    engine.update(0.1, 1.0);
  }

  const endEntered = engine.getMetrics().totalEntered;
  const delta = endEntered - startEntered;
  // In 10s at 10/s, expected delta is ~100 visitors
  assert(delta >= 95 && delta <= 105, `Continuous arrivals delivered ~100 visitors in 10s (Observed: ${delta})`);
}

// -----------------------------------------------------------------------------
// 5. CROWD SURGE MODIFIES ARRIVAL DEMAND
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: Surge increases arrival demand correctly (+1,500/min) ---');
{
  const engine = new SimulationEngine(festivalScenario, pathResult.paths);
  engine.setArrivalRate(600); // 600/min
  assert(engine.getEffectiveArrivalRate() === 600, 'Base arrival rate is 600/min');

  engine.toggleSurge(true);
  // 600 + 1500 = 2100/min
  assert(engine.getEffectiveArrivalRate() === 2100, `Surge active: effective arrival rate is 2,100/min`);

  engine.toggleSurge(false);
  assert(engine.getEffectiveArrivalRate() === 600, 'Surge toggled off: effective rate restores to 600/min');
}

// -----------------------------------------------------------------------------
// 6. PAUSING ARRIVALS STOPS NEW ARRIVALS WITHOUT DELETING PEOPLE
// -----------------------------------------------------------------------------
console.log('\n--- TEST 6: Pausing arrivals stops new arrivals without deleting existing people ---');
{
  const engine = new SimulationEngine(festivalScenario, pathResult.paths);
  engine.seedInitialAgents();
  engine.setArrivalRate(1200);

  // Run 5s to establish flow
  for (let i = 0; i < 50; i++) engine.update(0.1, 1.0);

  const activeBeforePause = engine.agents.length;
  assert(activeBeforePause > 0, `Active visual agents present before pause: ${activeBeforePause}`);

  // Pause arrivals
  engine.pauseArrivals();
  assert(engine.getEffectiveArrivalRate() === 0, 'Effective arrival rate drops to 0 when paused');

  const enteredAtPause = engine.getMetrics().totalEntered;

  // Run another 5s while arrivals paused
  for (let i = 0; i < 50; i++) engine.update(0.1, 1.0);

  const enteredAfter = engine.getMetrics().totalEntered;
  assert(enteredAfter === enteredAtPause, `No new visitors entered while arrivals paused (${enteredAfter} === ${enteredAtPause})`);
  assert(engine.agents.length > 0, `Existing people continue progressing (Active visual: ${engine.agents.length})`);
}

// -----------------------------------------------------------------------------
// 7. VISUAL AGENT RECYCLING DOES NOT REDUCE LOGICAL COUNTS
// -----------------------------------------------------------------------------
console.log('\n--- TEST 7: Visual-agent recycling does NOT reduce totalEntered, activeCrowd, or completedCrowd ---');
{
  const engine = new SimulationEngine(festivalScenario, pathResult.paths);
  engine.seedInitialAgents();
  engine.addCrowdBatch(5000);

  let initialEntered = engine.getMetrics().totalEntered;
  let prevCompleted = 0;
  let allEnteredValid = true;
  let allCompletedValid = true;

  // Run simulation for 200 steps to trigger visual agent completions and recycling
  for (let i = 0; i < 200; i++) {
    engine.update(0.1, 2.0);
    const m = engine.getMetrics();
    if (m.totalEntered < initialEntered) allEnteredValid = false;
    if (m.completedCrowd < prevCompleted) allCompletedValid = false;
    prevCompleted = m.completedCrowd;
    initialEntered = m.totalEntered;
  }

  assert(allEnteredValid, 'totalEntered is strictly non-decreasing across all update steps');
  assert(allCompletedValid, 'completedCrowd is strictly non-decreasing across all update steps');
  assert(prevCompleted > 0, `Devotees completed path and exited: ${prevCompleted} completed`);
}

// -----------------------------------------------------------------------------
// 8. NORMALIZED CROWD STATE COMPATIBILITY
// -----------------------------------------------------------------------------
console.log('\n--- TEST 8: Normalized crowdState schema compatibility ---');
{
  const engine = new SimulationEngine(festivalScenario, pathResult.paths);
  engine.seedInitialAgents();
  engine.addCrowdBatch(3000);

  const state = engine.getCrowdState();
  assert(state.source === 'simulation', 'crowdState source is "simulation"');
  assert(typeof state.plannedCrowd === 'number', 'has numeric plannedCrowd');
  assert(typeof state.totalEntered === 'number', 'has numeric totalEntered');
  assert(typeof state.activeCrowd === 'number', 'has numeric activeCrowd');
  assert(typeof state.completedCrowd === 'number', 'has numeric completedCrowd');
  assert(typeof state.currentArrivalRate === 'number', 'has numeric currentArrivalRate');
  assert(state.zones && state.zones.north && state.zones.security && state.zones.darshan && state.zones.exit,
    'zones contains north, security, darshan, and exit channels');
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================\n');

if (failed > 0) process.exit(1);
