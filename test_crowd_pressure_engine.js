import { 
  CrowdPressureEngine, 
  PRESSURE_LEVELS, 
  PRESSURE_THRESHOLDS, 
  getPressureLevel, 
  calculateQueuePhysicalCapacity 
} from './src/features/simulation/crowdPressureEngine.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';

console.log('========================================================================');
console.log(' DevaSetu Crowd Pressure & Capacity Alert Engine Test Suite           ');
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
// 1. THRESHOLD BEHAVIOR & UNCLAMPED UTILIZATION
// -----------------------------------------------------------------------------
console.log('--- TEST 1 to 6: Deterministic Thresholds & Unclamped Utilization ---');
{
  assert(getPressureLevel(0.50) === PRESSURE_LEVELS.NORMAL, '0.50 (50%) -> NORMAL');
  assert(getPressureLevel(0.69) === PRESSURE_LEVELS.NORMAL, '0.69 (69%) -> NORMAL');
  assert(getPressureLevel(0.70) === PRESSURE_LEVELS.ELEVATED, '0.70 (70%) -> ELEVATED');
  assert(getPressureLevel(0.84) === PRESSURE_LEVELS.ELEVATED, '0.84 (84%) -> ELEVATED');
  assert(getPressureLevel(0.85) === PRESSURE_LEVELS.HIGH, '0.85 (85%) -> HIGH');
  assert(getPressureLevel(1.00) === PRESSURE_LEVELS.HIGH, '1.00 (100% boundary) -> HIGH');
  assert(getPressureLevel(1.20) === PRESSURE_LEVELS.OVER_CAPACITY, '1.20 (120%) -> OVER_CAPACITY');
  assert(getPressureLevel(1.85) === PRESSURE_LEVELS.OVER_CAPACITY, '1.85 (185%) -> OVER_CAPACITY');
}

// -----------------------------------------------------------------------------
// 2. CURVED QUEUE CAPACITY USES ACTUAL CENTERLINE GEOMETRY
// -----------------------------------------------------------------------------
console.log('\n--- TEST 12: Curved Queue Capacity uses actual path centerline geometry ---');
{
  // A straight queue of length 20m, width 2m @ 2.0 density = 20 * 2 * 2 = 80
  const straightQueue = {
    id: 'q-straight',
    type: 'queue',
    dimensions: { length: 20, width: 2 },
    properties: { pathData: { type: 'straight' } },
  };
  const straightCap = calculateQueuePhysicalCapacity(straightQueue);
  assert(straightCap === 80, `Straight queue capacity: ${straightCap} devotees`);

  // An arc queue with radius 20m spanning 90 degrees (arc length = 31.42m)
  // Width 2m @ 2.0 density = 31.42 * 2 * 2 = ~126
  const arcQueue = {
    id: 'q-arc',
    type: 'queue',
    dimensions: { length: 20, width: 2 }, // box length is only 20
    properties: {
      pathData: {
        type: 'arc',
        params: { radius: 20, startAngle: 0, endAngle: 90 },
      },
    },
  };
  const arcCap = calculateQueuePhysicalCapacity(arcQueue);
  assert(arcCap > 120, `Curved arc queue capacity (${arcCap}) uses centerline length (~31.4m) rather than box length (20m -> 80)`);
}

// -----------------------------------------------------------------------------
// 3. PRESSURE ENGINE ZONE EVALUATION & MULTIPLE OVERLOADED ZONES
// -----------------------------------------------------------------------------
console.log('\n--- TEST 7, 8, 9: Zone Pressure & Multiple Overloaded Zones Preservation ---');
{
  const festivalScenario = generateFestivalScenario();
  const pathResult = generateSimulationPaths(festivalScenario);
  const engine = new SimulationEngine(festivalScenario, pathResult.paths);
  engine.seedInitialAgents();

  // Inject a massive crowd surge to push multiple zones over capacity
  engine.addCrowdBatch(20000);

  const pressure = engine.getPressureState();

  assert(pressure.index > 100, `Crowd Pressure Index exceeds 100 during surge: ${pressure.index}`);
  assert(pressure.level === PRESSURE_LEVELS.OVER_CAPACITY, `Pressure level is OVER_CAPACITY`);
  assert(typeof pressure.highestPressureZone === 'string', `Identified highest pressure zone: ${pressure.highestPressureZone}`);
  assert(Array.isArray(pressure.overloadedZones), 'overloadedZones is an array');
  assert(pressure.overloadedZones.length > 0, `Preserved ${pressure.overloadedZones.length} overloaded zones: ${pressure.overloadedZones.join(', ')}`);

  // Verify that crowd is NOT blocked, stopped or deleted
  const initialDevotees = engine.agents.length;
  for (let i = 0; i < 20; i++) {
    engine.update(0.1, 1.0);
  }
  assert(engine.agents.length > 0, `Visual devotees continue moving (Active: ${engine.agents.length})`);
  assert(engine.getMetrics().totalEntered >= 20000, `totalEntered continued growing, not clamped (${engine.getMetrics().totalEntered})`);
}

// -----------------------------------------------------------------------------
// 4. ALERT LIFECYCLE & DEDUPLICATION
// -----------------------------------------------------------------------------
console.log('\n--- TEST 10 & 11: Alert Lifecycle & Deduplication (ACTIVE -> RESOLVED) ---');
{
  const pressureEngine = new CrowdPressureEngine();

  // Mock scene with a single queue of capacity 1,000
  const mockScene = {
    components: [
      {
        id: 'north-queue-1',
        name: 'North Queue Stream',
        type: 'queue',
        dimensions: { length: 250, width: 2 }, // 250 * 2 * 2 = 1,000 cap
        properties: { stream: 'north' },
      },
    ],
  };

  // Step A: Occupancy at 600 (60%) -> NORMAL (<70%), 0 alerts
  const stateNormal = {
    activeCrowd: 600,
    currentArrivalRate: 600,
    zones: { north: { count: 600 } },
  };
  let result = pressureEngine.evaluatePressure(mockScene, stateNormal, 10);
  assert(result.alerts.length === 0, 'No alerts generated when utilization is 60% (< 70%)');

  // Step B: Occupancy at 800 (80%) -> ELEVATED (>=70%), 1 ACTIVE alert
  const stateElevated = {
    activeCrowd: 800,
    currentArrivalRate: 800,
    zones: { north: { count: 800 } },
  };
  result = pressureEngine.evaluatePressure(mockScene, stateElevated, 20);
  assert(result.alerts.length === 1, '1 active alert generated when utilization reaches 80%');
  assert(result.alerts[0].severity === PRESSURE_LEVELS.ELEVATED, 'Alert severity is ELEVATED');
  assert(result.alerts[0].status === 'ACTIVE', 'Alert status is ACTIVE');

  // Step C: DEDUPLICATION CHECK - Run 10 ticks while remaining in alert state
  for (let t = 21; t <= 30; t++) {
    result = pressureEngine.evaluatePressure(mockScene, stateElevated, t);
  }
  assert(result.alerts.length === 1, `Alert is deduplicated: exactly 1 active alert maintained (found ${result.alerts.length})`);

  // Step D: Occupancy surges to 1,350 (135%) -> OVER_CAPACITY, existing alert updated in place
  const stateOver = {
    activeCrowd: 1350,
    currentArrivalRate: 1500,
    zones: { north: { count: 1350 } },
  };
  result = pressureEngine.evaluatePressure(mockScene, stateOver, 40);
  assert(result.alerts.length === 1, 'Still 1 alert, updated in place without duplicate card creation');
  assert(result.alerts[0].severity === PRESSURE_LEVELS.OVER_CAPACITY, 'Alert escalated to OVER_CAPACITY');
  assert(result.alerts[0].utilization === 1.35, 'Alert utilization reflects 135% (1.35)');

  // Step E: RESOLUTION CHECK - Crowd recedes to 500 (50%) -> Alert resolves
  const stateResolved = {
    activeCrowd: 500,
    currentArrivalRate: 400,
    zones: { north: { count: 500 } },
  };
  result = pressureEngine.evaluatePressure(mockScene, stateResolved, 50);
  assert(result.alerts.length === 0, 'Active alerts cleared when utilization recedes below 70%');
  assert(pressureEngine.alertHistory.length === 1, 'Resolved alert archived in alertHistory');
  assert(pressureEngine.alertHistory[0].status === 'RESOLVED', 'Archived alert status is RESOLVED');
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================\n');

if (failed > 0) process.exit(1);
