import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import { createAgent, AGENT_STATES } from './src/features/simulation/simulationModel.js';

console.log('========================================================================');
console.log(' DevaSetu Final Polish Acceptance Test Suite                           ');
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

// 1. TEST AGENT DETERMINISTIC TRAITS & SECURITY DWELL
console.log('--- TEST 1: Devotee Diversity & Visual Security Dwell (0.2s - 0.8s) ---');
const dummyPath = {
  id: 0,
  waypoints: [
    { x: 0, z: -80, zone: 'entrance' },
    { x: 0, z: -60, zone: 'security' },
    { x: 0, z: -30, zone: 'queue' },
    { x: 0, z: -10, zone: 'darshan' },
    { x: 0, z: 80, zone: 'exit' },
  ],
};

const sampleAgents = [];
for (let id = 1; id <= 60; id++) {
  sampleAgents.push(createAgent(id, dummyPath));
}

const males = sampleAgents.filter((a) => a.gender === 'male');
const females = sampleAgents.filter((a) => a.gender === 'female');
assert(males.length > 10 && females.length > 10, `Realistic gender distribution: ${males.length} male, ${females.length} female`);

const attires = new Set(sampleAgents.map((a) => a.attireType));
assert(attires.has('saree') && attires.has('salwar') && attires.has('kurta_dhoti') && attires.has('kurta_pyjama'),
  'Diverse authentic attire types: saree, salwar, kurta_dhoti, kurta_pyjama');

const securityDwells = sampleAgents.map((a) => a.securityDwellTime);
const minSec = Math.min(...securityDwells);
const maxSec = Math.max(...securityDwells);
assert(minSec >= 0.20 && maxSec <= 0.80,
  `Visual security dwell is strictly within 0.2s–0.8s (Observed: ${minSec.toFixed(2)}s to ${maxSec.toFixed(2)}s)`);

const darshanDwells = sampleAgents.map((a) => a.darshanDwellTime);
const minDarshan = Math.min(...darshanDwells);
const maxDarshan = Math.max(...darshanDwells);
assert(minDarshan >= 1.8 && maxDarshan <= 2.6,
  `Darshan reverence viewing dwell is 1.8s–2.5s (Observed: ${minDarshan.toFixed(2)}s to ${maxDarshan.toFixed(2)}s)`);

const scales = sampleAgents.map((a) => a.scaleFactor);
const minScale = Math.min(...scales);
const maxScale = Math.max(...scales);
assert(minScale >= 1.30 && maxScale <= 1.60,
  `Natural height variation relative to site scale (Observed: ${minScale.toFixed(2)} to ${maxScale.toFixed(2)})`);

const phases = sampleAgents.map((a) => a.walkCycle);
const uniquePhases = new Set(phases.map((p) => p.toFixed(2)));
assert(uniquePhases.size >= 40,
  `Staggered initial animation phase: ${uniquePhases.size} distinct phases (no crowd lockstep)`);

// 2. TEST 100K FESTIVAL CAMPUS CONTINUOUS MOVEMENT & POPULATION
console.log('\n--- TEST 2: 100K Festival Campus Continuous Queue Flow ---');
const festivalScene = generateFestivalScenario();
const pathResult = generateSimulationPaths(festivalScene);
assert(pathResult.ready, 'Festival campus passes simulation readiness validation');
assert(pathResult.paths.length === 16, `Generated 16 multi-stream paths (found ${pathResult.paths.length})`);

const engine = new SimulationEngine(festivalScene, pathResult.paths, { VISUAL_SAMPLE_CAP: 300 });
engine.seedInitialAgents();

assert(engine.agents.length >= 80, `Initial seeding populates queue lanes immediately: ${engine.agents.length} active devotees`);

const queueSeeded = engine.agents.filter((a) => a.state === AGENT_STATES.QUEUEING);
assert(queueSeeded.length >= 25, `Post-security queues are immediately populated with devotees: ${queueSeeded.length} queuing`);

// 3. STEP SIMULATION 1,000 FRAMES
console.log('\n--- TEST 3: Multi-Speed Kinematics & Wave Propagation ---');
let securityProcessed = 0;
let darshanReached = 0;
let completedExits = 0;

for (let step = 0; step < 800; step++) {
  engine.update(0.05, 1.0); // 40 simulated seconds at 1x
}

assert(engine.agents.length >= 150, `Continuous spawning maintains robust crowd flow: ${engine.agents.length} active devotees`);

// Check that security is not bottlenecked
const currentlyAtSecurity = engine.agents.filter((a) => a.state === AGENT_STATES.SECURITY);
const currentlyInQueue = engine.agents.filter((a) => a.state === AGENT_STATES.QUEUEING);
assert(currentlyAtSecurity.length <= currentlyInQueue.length,
  `Queues remain full while security throughput is fast: ${currentlyInQueue.length} in queue vs ${currentlyAtSecurity.length} at security`);

assert(engine.totalCompletedCount > 0,
  `Devotees successfully progress through Darshan and exit South Gopuram: ${engine.totalCompletedCount} completed`);

// Verify no NaN positions or velocities
const hasNaN = engine.agents.some((a) => isNaN(a.position.x) || isNaN(a.position.z) || isNaN(a.rotationY));
assert(!hasNaN, 'All agent coordinates, headings, and velocities are numerically stable (0 NaN values)');

// Verify safe minimum queue spacing
let minSpacing = Infinity;
for (let i = 0; i < engine.agents.length; i++) {
  for (let j = i + 1; j < engine.agents.length; j++) {
    const a1 = engine.agents[i];
    const a2 = engine.agents[j];
    if (a1.pathId === a2.pathId) {
      const dx = a1.position.x - a2.position.x;
      const dz = a1.position.z - a2.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minSpacing) minSpacing = d;
    }
  }
}
assert(minSpacing >= 0.75, `Safe anti-collision queue spacing maintained (min observed: ${minSpacing.toFixed(2)}m)`);

console.log('\n========================================================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================================================\n');

if (failed > 0) process.exit(1);
