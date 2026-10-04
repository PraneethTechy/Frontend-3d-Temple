/**
 * DevaSetu Capacity Alerts Redirection & Non-Expansion Regression Suite
 * 
 * Verifies all 8 master objectives:
 * 1. capacity pressure can still be calculated
 * 2. "Review & Expand" is no longer presented in the UI
 * 3. genuine entrance blockage still triggers redirection recommendation
 * 4. alternative entrance is selected using actual capacity/flow
 * 5. manager approval redirects future arrivals
 * 6. existing devotees are not redirected
 * 7. bridge redirection remains available with stairs & elevated deck
 * 8. no expansion action is triggered (scene architecture preserved)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { CrowdPressureEngine, PRESSURE_LEVELS } from './src/features/simulation/crowdPressureEngine.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { useCapacityExpansionStore } from './src/features/simulation/capacityExpansionStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log(' DevaSetu Capacity Alerts & Flow Redirection Verification Suite        ');
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

async function runTests() {
  const scene = generateFestivalScenario();
  const initialComponentCount = scene.components.length;
  const initialComponentsSnapshot = JSON.stringify(scene.components);

  // --------------------------------------------------------------------------
  // TEST 1: Capacity pressure can still be calculated
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Underlying Capacity Calculations Preserved ---');
  const pressureEngine = new CrowdPressureEngine();

  const mockScene = {
    components: [
      {
        id: 'north-queue-1',
        name: 'North Queue Stream',
        type: 'queue',
        dimensions: { length: 250, width: 2 }, // 250 * 2 * 2 = 1,000 cap
        properties: { stream: 'north' },
      },
      {
        id: 'west-queue-1',
        name: 'West Queue Stream',
        type: 'queue',
        dimensions: { length: 250, width: 2 }, // 1,000 cap
        properties: { stream: 'west' },
      },
    ],
  };

  const mockCrowdState = {
    activeCrowd: 2270,
    currentArrivalRate: 2000,
    zones: {
      north: { count: 1850 }, // 1850 / 1000 = 185%
      west: { count: 420 },   // 420 / 1000 = 42%
    },
  };

  const pressureResult = pressureEngine.evaluatePressure(mockScene, mockCrowdState, 120);

  assert(pressureResult !== null, 'CrowdPressureEngine returns valid pressure telemetry');
  assert(pressureResult.index === 185, `Headline index correctly reflects 185% peak pressure (got ${pressureResult.index})`);
  assert(pressureResult.level === PRESSURE_LEVELS.OVER_CAPACITY, 'Pressure level is OVER_CAPACITY');
  assert(pressureResult.highestPressureZone === 'North Queue Stream', 'Highest pressure zone identified as North Queue Stream');
  assert(pressureResult.zones.north.utilizationPercent === 185, 'North zone utilization is 185%');
  assert(pressureResult.zones.west.utilizationPercent === 42, 'West zone utilization is 42%');
  assert(pressureResult.alerts.length >= 1, `Active capacity alert generated (found ${pressureResult.alerts.length})`);
  assert(pressureResult.alerts[0].utilization === 1.85, 'Alert utilization reflects 1.85 (185%)');

  // --------------------------------------------------------------------------
  // TEST 2: "Review & Expand" is no longer presented in UI
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: "Review & Expand" & Expansion Workflow Removed From UI ---');
  const crowdPanelPath = path.join(__dirname, 'src/features/analytics/CrowdPressurePanel.jsx');
  const crowdPanelCode = fs.readFileSync(crowdPanelPath, 'utf8');

  assert(!crowdPanelCode.includes('Review & Expand'), 'CrowdPressurePanel.jsx does NOT contain "Review & Expand"');
  assert(!crowdPanelCode.includes('btn-review-expand'), 'CrowdPressurePanel.jsx does NOT contain "btn-review-expand"');
  assert(!crowdPanelCode.includes('useCapacityExpansionStore'), 'CrowdPressurePanel.jsx does NOT import useCapacityExpansionStore');
  assert(!crowdPanelCode.includes('openReview'), 'CrowdPressurePanel.jsx does NOT call openReview');

  // Verify operational redirection action is present
  assert(crowdPanelCode.includes('Redirect Future Arrivals'), 'CrowdPressurePanel.jsx provides "Redirect Future Arrivals"');
  assert(crowdPanelCode.includes('Keep Current Routing'), 'CrowdPressurePanel.jsx provides "Keep Current Routing"');
  assert(crowdPanelCode.includes('ENTRANCE BLOCKED'), 'CrowdPressurePanel.jsx displays entrance blocked status');

  const appPath = path.join(__dirname, 'src/App.jsx');
  const appCode = fs.readFileSync(appPath, 'utf8');
  assert(!appCode.includes('<CapacityExpansionModal />') && !appCode.includes('<CapacityExpansionModal/>'), 'App.jsx does NOT render CapacityExpansionModal');
  assert(!appCode.includes("import { CapacityExpansionModal }"), 'App.jsx does NOT import CapacityExpansionModal');

  // --------------------------------------------------------------------------
  // TEST 3: Genuine entrance blockage triggers redirection recommendation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Genuine Blockage Triggers Redirection Recommendation ---');
  const pathResult = generateSimulationPaths(scene);
  const paths = pathResult.paths;

  // Verify brief service dwell does NOT trigger redirection
  {
    const engineDwell = new SimulationEngine(scene, paths, { warmupPeriod: 5, minCongestionDuration: 8 });
    engineDwell.simTime = 20;
    let promptCalled = false;
    engineDwell.onDiversionPrompt = () => { promptCalled = true; };

    engineDwell.entranceStats.north.congestionState = 'FLOWING';
    engineDwell.entranceStats.north.queueUtilization = 45;
    engineDwell.entranceStats.north.blockedDuration = 0.5;
    engineDwell.entranceStats.north.avgSpeed = 0.75;
    engineDwell.update(0.1);

    assert(promptCalled === false, 'Short service dwell does not trigger redirection recommendation');
    assert(engineDwell.entranceStats.north.status !== 'REROUTE_CANDIDATE', 'North is not marked as candidate during short dwell');
  }

  // Sustained genuine blockage triggers redirection recommendation
  const engine = new SimulationEngine(scene, paths, { warmupPeriod: 2, minCongestionDuration: 3 });

  let capturedPrompt = null;
  engine.onDiversionPrompt = (data) => {
    capturedPrompt = data;
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

  assert(engine.entranceStats.north.status === 'REROUTE_CANDIDATE', 'North marked as REROUTE_CANDIDATE');
  assert(engine.aiNavigationState.pendingApproval === true, 'AI Navigation state flagged pendingApproval = true');
  assert(capturedPrompt !== null, 'onDiversionPrompt callback was triggered');
  assert(capturedPrompt.congestedStream === 'north', 'Captured congested stream is north');
  assert(capturedPrompt.congestedUtil >= 80, `Captured congested utilization is >= 80% (got ${capturedPrompt.congestedUtil}%)`);

  // --------------------------------------------------------------------------
  // TEST 4: Alternative entrance selected using actual capacity/flow
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Alternative Entrance Selected By Actual Capacity/Flow ---');
  assert(capturedPrompt.targetStream === 'west', 'West entrance selected as healthiest alternative (lower util than East)');
  assert(capturedPrompt.targetMovementSpeed === 'Normal', 'West entrance movement status is Normal/Flowing');

  // --------------------------------------------------------------------------
  // TEST 5: Manager approval redirects future arrivals
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Manager Approval Redirects Future Arrivals ---');
  const baseNorthWeight = engine.activeEntranceWeights.north;
  const baseWestWeight = engine.activeEntranceWeights.west;

  engine.approveDiversion(true);

  assert(engine.diversionApproved === true, 'Diversion is approved');
  assert(engine.activeEntranceWeights.north < baseNorthWeight, `North arrival weight decreased (from ${baseNorthWeight} to ${engine.activeEntranceWeights.north})`);
  assert(engine.activeEntranceWeights.west > baseWestWeight, `West arrival weight increased (from ${baseWestWeight} to ${engine.activeEntranceWeights.west})`);

  // --------------------------------------------------------------------------
  // TEST 6: Existing devotees are NOT redirected
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Existing Devotees Inside Queues Remain Untouched ---');
  const engineExisting = new SimulationEngine(scene, paths);
  const northPath = engineExisting.paths.find((p) => p.stream === 'north');

  engineExisting.spawnTimer = 10;
  const existingAgent = engineExisting.spawnNextAgent();
  existingAgent.pathId = northPath.id;
  existingAgent.entryStream = 'north';
  existingAgent.stream = 'north';
  existingAgent.targetWaypointIndex = 8;
  existingAgent.position = { x: -24, y: 0, z: -35 };

  const initialPathId = existingAgent.pathId;
  const initialEntryStream = existingAgent.entryStream;
  const initialIndex = existingAgent.targetWaypointIndex;

  // Manager approves redirection
  engineExisting.approveRerouting('north', 'west', 20);

  // Existing devotee must not be altered, redirected, or transferred to another path
  assert(existingAgent.pathId === initialPathId, 'Existing agent retains original pathId');
  assert(existingAgent.entryStream === initialEntryStream, 'Existing agent retains original entryStream (north)');
  assert(existingAgent.stream === 'north', 'Existing agent stream remains north');
  assert(existingAgent.targetWaypointIndex === initialIndex, 'Existing agent waypoint index untouched');
  assert(existingAgent.isDiverted !== true, 'Existing agent is never marked as diverted');

  // --------------------------------------------------------------------------
  // TEST 7: Bridge redirection remains available
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Bridge Route With Elevated Overpass Deck Active ---');
  const engineBridge = new SimulationEngine(scene, paths);
  engineBridge.approveRerouting('north', 'west', 25);

  const divPath = engineBridge.diversionPaths.find((p) => p.stream === 'north' && p.targetStream === 'west');
  assert(divPath !== undefined, 'North-to-West bridge diversion path exists in engine');

  const ascentBase = divPath.waypoints.find((w) => w.name && w.name.includes('Ascent Stairs Base'));
  const topCrest = divPath.waypoints.find((w) => w.name && w.name.includes('Top Landing Crest'));

  assert(ascentBase !== undefined, 'Ascent stairs base waypoint exists');
  assert(topCrest !== undefined, 'Top landing crest waypoint exists');
  assert(ascentBase.y === 0.0, 'Ascent base starts at ground elevation (0.0m)');
  assert(topCrest.y === 4.8, 'Top crest reaches elevated bridge deck height (4.8m)');

  // Spawn new devotee under diversion
  engineBridge.spawnTimer = 10;
  const newAgent = engineBridge.spawnNextAgent();
  assert(newAgent !== null, 'Spawned next agent under active diversion');
  assert(newAgent.isDiverted === true, 'Future arrival is marked as isDiverted = true');
  assert(newAgent.pathId === divPath.id, `Diverted arrival assigned bridge path ${divPath.id}`);
  assert(newAgent.entryStream === 'north', 'Origin entrance is North');
  assert(newAgent.targetStream === 'west', 'Destination entrance is West');

  // --------------------------------------------------------------------------
  // TEST 8: No expansion action is triggered
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: Zero Expansion Action Triggered ---');
  assert(scene.components.length === initialComponentCount, `Scene component count strictly unchanged (${scene.components.length} === ${initialComponentCount})`);
  assert(JSON.stringify(scene.components) === initialComponentsSnapshot, 'Scene components JSON strictly identical (no expansion lines added)');

  const expansionStore = useCapacityExpansionStore.getState();
  assert(expansionStore.planResult === null, 'CapacityExpansionStore planResult remains null');
  assert(expansionStore.isOpen === false, 'CapacityExpansionStore isOpen remains false');

  console.log('\n========================================================================');
  console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
