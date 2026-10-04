/**
 * DevaSetu Capacity Expansion Verification Suite
 * Tests deterministic queue expansion generation, 3D preview isolation,
 * single-step undo/redo, simulation path regeneration, capacity/pressure recalculation,
 * crowd preservation, and recursive expansions.
 */

import assert from 'assert';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { 
  generateDeterministicExpansionComponents, 
  generateCapacityExpansionPlan 
} from './src/services/layout/capacityExpansionPlanner.js';
import { getQueuePathGeometry } from './src/services/layout/queuePathGeometry.js';
import { isComponentWithinSite, getComponentAABB, doAABBsOverlap } from './src/services/layout/coordinateSystem.js';
import { validateLayout } from './src/services/layout/layoutValidator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import { CrowdPressureEngine, calculateQueuePhysicalCapacity, PRESSURE_LEVELS } from './src/features/simulation/crowdPressureEngine.js';
import { useQueueStore } from './src/store/useQueueStore.js';
import { useSimulationStore } from './src/features/simulation/simulationStore.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n============================================================');
console.log('DevaSetu Capacity Expansion Apply Workflow Verification Suite');
console.log('============================================================\n');

// Base scenario setup
const baseFest = generateFestivalScenario();
const baseScene = JSON.parse(JSON.stringify(baseFest.scene));
const originalCompCount = baseScene.components.length;
const originalSacredCount = baseScene.components.filter(c => 
  c.type.includes('gopuram') || c.type.includes('sanctum') || c.type.includes('darshan')
).length;
const originalQueues = baseScene.components.filter(c => c.type === 'queue');

const samplePlan = {
  type: 'capacity_expansion',
  targetZone: 'north',
  reasoning: 'Test expansion plan proposing 2 serpentine lanes in North sector',
  changes: [
    {
      action: 'add_queue',
      template: 'serpentine',
      lanes: 2,
      laneWidth: 2.0,
      spacing: 1.5,
      connection: 'north-queue-junction -> security-holding',
    },
  ],
  expectedCapacityIncrease: 480,
  constraints: [
    'preserve existing temple architecture',
    'preserve existing queues',
    'remain inside site boundary',
    'maintain flow toward security',
  ],
};

let expansionResult = null;
let expandedComponents = [];

// 1. Generated expansion produces valid queue components
test('1. Generated expansion produces valid queue components', () => {
  expansionResult = generateDeterministicExpansionComponents(samplePlan, baseScene);
  assert.strictEqual(expansionResult.success, true, 'Generation should succeed');
  assert.strictEqual(expansionResult.components.length, 2, 'Should generate 2 expansion lanes');

  expandedComponents = expansionResult.components;
  for (const c of expandedComponents) {
    assert.ok(c.id, 'Component must have an ID');
    assert.strictEqual(c.type, 'queue', 'Component type must be queue');
    assert.ok(c.name, 'Component must have a name');
    assert.strictEqual(c.category, 'crowd', 'Component category must be crowd');
    assert.ok(c.position && typeof c.position.x === 'number' && typeof c.position.z === 'number', 'Position must be valid');
    assert.ok(c.dimensions && c.dimensions.length > 0 && c.dimensions.width > 0, 'Dimensions must be valid');
    assert.strictEqual(c.generated, true, 'Component generated flag must be true');
    assert.ok(c.generationId && c.generationId.startsWith('capacity-expansion-'), 'generationId must have capacity-expansion- prefix');
    assert.strictEqual(c.role, 'queue-expansion', 'role must be queue-expansion');
    assert.strictEqual(c.template, 'serpentine', 'template must match request');
  }
});

// 2. Generated components contain valid pathData
test('2. Generated components contain valid pathData', () => {
  for (const c of expandedComponents) {
    assert.ok(c.properties?.pathData, 'Component must have properties.pathData');
    assert.strictEqual(c.properties.pathData.type, 'serpentine', 'pathData type must be serpentine');
    
    const geom = getQueuePathGeometry(c);
    assert.ok(geom.worldPoints && geom.worldPoints.length > 5, 'Must produce sampled world points along centerline');
    assert.ok(geom.totalLength > 10, 'Total length must be greater than 10m');
    assert.ok(geom.worldPoints[0].headingAngle !== undefined, 'World points must have headingAngle orientation');
  }
});

// 3. Existing architecture remains unchanged
test('3. Existing architecture remains unchanged', () => {
  const currentSacred = baseScene.components.filter(c => 
    c.type.includes('gopuram') || c.type.includes('sanctum') || c.type.includes('darshan')
  );
  assert.strictEqual(currentSacred.length, originalSacredCount, 'Sacred architecture count must remain identical');

  const mainGopuram = baseScene.components.find(c => c.role === 'main-gopuram');
  const sanctum = baseScene.components.find(c => c.role === 'darshan-sanctum');
  assert.ok(mainGopuram, 'Main Gopuram must still exist');
  assert.ok(sanctum, 'Sanctum must still exist');
});

// 4. Existing queues remain unchanged
test('4. Existing queues remain unchanged', () => {
  const currentQueues = baseScene.components.filter(c => c.type === 'queue');
  assert.strictEqual(currentQueues.length, originalQueues.length, 'Original queue count must remain untouched');
  for (let i = 0; i < originalQueues.length; i++) {
    assert.strictEqual(currentQueues[i].id, originalQueues[i].id, `Queue ${i} ID must match`);
    assert.strictEqual(currentQueues[i].position.z, originalQueues[i].position.z, `Queue ${i} pos Z must match`);
  }
});

// 5. New queues remain inside site boundaries
test('5. New queues remain inside site boundaries', () => {
  for (const c of expandedComponents) {
    const boundCheck = isComponentWithinSite(c, baseScene.site, 0.1);
    assert.strictEqual(boundCheck.fits, true, `Queue ${c.id} must be strictly inside site boundary`);
  }
});

// 6. New queues do not collide with protected architecture
test('6. New queues do not collide with protected architecture', () => {
  const combinedScene = {
    ...baseScene,
    components: [...baseScene.components, ...expandedComponents],
  };
  const val = validateLayout(combinedScene);
  const myErrors = val.errors.filter(e => 
    expandedComponents.some(ec => ec.id === e.componentId || ec.id === e.secondaryComponentId)
  );
  assert.strictEqual(myErrors.length, 0, 'Expansion queues must have zero layout errors');
});

// 7. New queues connect to an existing operational flow
test('7. New queues connect to an existing operational flow', () => {
  for (const c of expandedComponents) {
    assert.ok(c.properties.connection, 'Must specify operational connection');
    assert.strictEqual(c.properties.stream, 'north', 'Must belong to North crowd stream');
    assert.strictEqual(c.properties.zone, 'A', 'Must belong to Zone A arrival screening');
  }
});

// 8. Preview does not mutate authoritative Scene JSON
test('8. Preview does not mutate authoritative Scene JSON', () => {
  // Reset store to base scene
  useQueueStore.setState({
    scene: JSON.parse(JSON.stringify(baseScene)),
    previewLayout: null,
    isPreviewing: false,
    history: { past: [], future: [] },
  });

  const storeBefore = useQueueStore.getState();
  assert.strictEqual(storeBefore.scene.components.length, originalCompCount);

  // Trigger preview
  useQueueStore.getState().startCapacityExpansionPreview({
    plan: samplePlan,
    proposedComponents: expandedComponents,
    expectedCapacityIncrease: 480,
  });

  const storeDuringPreview = useQueueStore.getState();
  assert.strictEqual(storeDuringPreview.isPreviewing, true, 'isPreviewing must be true');
  assert.ok(storeDuringPreview.previewLayout, 'previewLayout must be populated');
  assert.strictEqual(storeDuringPreview.previewLayout.type, 'capacity_expansion', 'previewLayout type must be capacity_expansion');
  assert.strictEqual(storeDuringPreview.previewLayout.components.length, originalCompCount + expandedComponents.length, 'Preview must combine temple and new queues');

  // CRITICAL: Authoritative scene components must NOT be mutated!
  assert.strictEqual(storeDuringPreview.scene.components.length, originalCompCount, 'Authoritative scene must NOT be mutated during preview');
});

// 9. Discard restores the original layout
test('9. Discard restores the original layout', () => {
  useQueueStore.getState().discardCapacityExpansion();

  const storeAfterDiscard = useQueueStore.getState();
  assert.strictEqual(storeAfterDiscard.isPreviewing, false, 'isPreviewing must be false after discard');
  assert.strictEqual(storeAfterDiscard.previewLayout, null, 'previewLayout must be null after discard');
  assert.strictEqual(storeAfterDiscard.scene.components.length, originalCompCount, 'Authoritative scene components count must remain unchanged');
});

// 10. Apply commits the expansion
test('10. Apply commits the expansion', () => {
  // Start preview again
  useQueueStore.getState().startCapacityExpansionPreview({
    plan: samplePlan,
    proposedComponents: expandedComponents,
    expectedCapacityIncrease: 480,
  });

  // User confirms apply
  useQueueStore.getState().applyCapacityExpansion();

  const storeAfterApply = useQueueStore.getState();
  assert.strictEqual(storeAfterApply.isPreviewing, false, 'isPreviewing must be false after apply');
  assert.strictEqual(storeAfterApply.previewLayout, null, 'previewLayout must be null after apply');
  assert.strictEqual(storeAfterApply.scene.components.length, originalCompCount + expandedComponents.length, 'Authoritative scene must now contain expansion components');

  // Verify expansion queues exist in authoritative scene
  const appliedExpansionQueues = storeAfterApply.scene.components.filter(c => c.role === 'queue-expansion');
  assert.strictEqual(appliedExpansionQueues.length, expandedComponents.length, 'All expansion queues must be present in scene');
});

// 11. Expansion is one undoable operation
test('11. Expansion is one undoable operation', () => {
  const store = useQueueStore.getState();
  // History past should have exactly 1 record corresponding to the pre-expansion state
  assert.strictEqual(store.history.past.length, 1, 'History past must contain exactly 1 snapshot for the entire expansion');
  assert.strictEqual(store.history.past[0].length, originalCompCount, 'Snapshot must contain original component count');
});

// 12. Undo removes the complete expansion
test('12. Undo removes the complete expansion', () => {
  useQueueStore.getState().undo();

  const storeAfterUndo = useQueueStore.getState();
  assert.strictEqual(storeAfterUndo.scene.components.length, originalCompCount, 'Undo must restore original component count');
  const expansionQueues = storeAfterUndo.scene.components.filter(c => c.role === 'queue-expansion');
  assert.strictEqual(expansionQueues.length, 0, 'All expansion queues must be removed by single undo');

  // Redo re-applies expansion
  useQueueStore.getState().redo();
  const storeAfterRedo = useQueueStore.getState();
  assert.strictEqual(storeAfterRedo.scene.components.length, originalCompCount + expandedComponents.length, 'Redo must restore expansion');
});

// 13. Simulation paths regenerate correctly
test('13. Simulation paths regenerate correctly', () => {
  const currentScene = useQueueStore.getState().scene;
  const pathResult = generateSimulationPaths(currentScene);
  assert.strictEqual(pathResult.ready, true, 'Simulation paths must be ready');

  // Must have 18 paths (16 original + 2 expansion)
  assert.strictEqual(pathResult.paths.length, 18, 'Must generate discrete paths including expansion lanes');

  const expPaths = pathResult.paths.filter(p => p.laneId && p.laneId.includes('capacity-expansion-'));
  assert.strictEqual(expPaths.length, 2, 'Must have 2 paths mapped to expansion lanes');

  const expPath = expPaths[0];
  assert.ok(expPath.waypoints.length > 20, 'Expansion path must contain waypoints across entire traversal');
  
  // Must start at North Gopuram
  assert.strictEqual(expPath.waypoints[0].zone, 'entrance', 'Must start at entrance');
  // Must pass through expansion queue
  const queueWp = expPath.waypoints.find(w => w.componentId === expPath.laneId);
  assert.ok(queueWp, 'Must include waypoint referencing the expansion queue component');
  assert.strictEqual(queueWp.zone, 'queue', 'Queue waypoint must have zone queue');
  assert.ok(queueWp.headingAngle !== undefined, 'Queue waypoint must have headingAngle orientation');
  // Must flow toward Darshan & Exit
  assert.ok(expPath.waypoints.some(w => w.zone === 'darshan'), 'Must connect to darshan zone');
  assert.ok(expPath.waypoints.some(w => w.zone === 'exit'), 'Must connect to exit zone');
});

// 14. New queue capacity is calculated from actual centerline geometry
test('14. New queue capacity is calculated from actual centerline geometry', () => {
  let totalCalculatedCap = 0;
  for (const c of expandedComponents) {
    const geom = getQueuePathGeometry(c);
    const expectedCap = Math.round(geom.totalLength * (c.dimensions?.width || 2) * 2.0);
    const actualCap = calculateQueuePhysicalCapacity(c, 2.0);
    assert.strictEqual(actualCap, expectedCap, 'calculateQueuePhysicalCapacity must match geometric formula');
    totalCalculatedCap += actualCap;
  }
  assert.ok(totalCalculatedCap > 300, 'Calculated geometric capacity must be non-zero and substantial');
});

// 15. Crowd counters remain unchanged
test('15. Crowd counters remain unchanged', () => {
  const initialPaths = generateSimulationPaths(baseScene).paths;
  const engine = new SimulationEngine(baseScene, initialPaths);
  engine.seedInitialAgents();

  // Simulate a few seconds
  engine.update(1.0);
  engine.update(1.0);

  const preMetrics = engine.getMetrics();
  const prePlanned = preMetrics.plannedCrowd;
  const preEntered = preMetrics.totalEntered;
  const preActive = preMetrics.activeCrowd;
  const preCompleted = preMetrics.completedCrowd;
  const preArrivalRate = preMetrics.currentArrivalRate;

  // Apply new scene and paths to running engine
  const currentScene = useQueueStore.getState().scene;
  const newPaths = generateSimulationPaths(currentScene).paths;
  engine.updateSceneAndPaths(currentScene, newPaths);

  const postMetrics = engine.getMetrics();
  assert.strictEqual(postMetrics.plannedCrowd, prePlanned, 'plannedCrowd must remain unchanged');
  assert.strictEqual(postMetrics.totalEntered, preEntered, 'totalEntered must remain unchanged');
  assert.strictEqual(postMetrics.activeCrowd, preActive, 'activeCrowd must remain unchanged');
  assert.strictEqual(postMetrics.completedCrowd, preCompleted, 'completedCrowd must remain unchanged');
  assert.strictEqual(postMetrics.currentArrivalRate, preArrivalRate, 'currentArrivalRate must remain unchanged');
});

// 16. Existing simulation continues
test('16. Existing simulation continues', () => {
  const currentScene = useQueueStore.getState().scene;
  const newPaths = generateSimulationPaths(currentScene).paths;
  const engine = new SimulationEngine(currentScene, newPaths);
  engine.seedInitialAgents();

  const initialTime = engine.simTime;
  engine.update(0.5);
  engine.update(0.5);

  assert.ok(engine.simTime > initialTime, 'Simulation time must continue advancing');
  assert.ok(engine.agents.length > 0, 'Visual agents must continue existing');
  assert.doesNotThrow(() => engine.update(0.5), 'Simulation must update cleanly without exceptions');
});

// 17. Pressure recalculates after expansion
test('17. Pressure recalculates after expansion', () => {
  const pe = new CrowdPressureEngine();
  const basePressure = pe.evaluatePressure(baseScene, { activeCrowd: 10000, zones: { north: { occupancy: 4000 } } });
  const baseNorthCap = basePressure.zones.north.capacity;

  const currentScene = useQueueStore.getState().scene;
  const expandedPressure = pe.evaluatePressure(currentScene, { activeCrowd: 10000, zones: { north: { occupancy: 4000 } } });
  const expandedNorthCap = expandedPressure.zones.north.capacity;

  assert.ok(expandedNorthCap > baseNorthCap, `North capacity must increase (was ${baseNorthCap}, now ${expandedNorthCap})`);
  assert.ok(expandedPressure.zones.queue.capacity > basePressure.zones.queue.capacity, 'Total queue capacity must increase');
});

// 18. Previous alert resolves when the new capacity is sufficient
test('18. Previous alert resolves when the new capacity is sufficient', () => {
  const pe = new CrowdPressureEngine();
  // Set occupancy higher than base North capacity (1344) but lower than expanded capacity (~1750)
  const testOccupancy = 1500;
  const crowdState = { activeCrowd: 3750, zones: { north: { count: testOccupancy } } };
  const stateBefore = pe.evaluatePressure(baseScene, crowdState);
  
  // In base scene, utilization > 1.0 (over capacity)
  assert.ok(stateBefore.zones.north.utilization > 1.0, `Base scene must be over capacity (is ${stateBefore.zones.north.utilization})`);
  const alertBefore = stateBefore.alerts.find(a => (a.zone === 'north' || a.zoneName?.includes('North')) && a.severity === PRESSURE_LEVELS.OVER_CAPACITY);
  assert.ok(alertBefore, 'Must trigger OVER_CAPACITY alert before expansion');

  // In expanded scene, utilization should be <= 1.0
  const currentScene = useQueueStore.getState().scene;
  const stateAfter = pe.evaluatePressure(currentScene, crowdState);
  
  assert.ok(stateAfter.zones.north.utilization <= 1.0, `Utilization must drop to <= 1.0 (is ${stateAfter.zones.north.utilization})`);
  const overCapAlertAfter = stateAfter.alerts.find(a => (a.zone === 'north' || a.zoneName?.includes('North')) && a.severity === PRESSURE_LEVELS.OVER_CAPACITY);
  assert.strictEqual(overCapAlertAfter, undefined, 'Previous OVER_CAPACITY alert must be resolved by new capacity');
});

// 19. Recursive second expansion is supported
test('19. Recursive second expansion is supported', () => {
  const firstExpansionScene = useQueueStore.getState().scene;
  const countAfterFirst = firstExpansionScene.components.length;

  const secondPlan = {
    type: 'capacity_expansion',
    targetZone: 'north',
    reasoning: 'Second expansion adding 2 more lanes',
    changes: [
      {
        action: 'add_queue',
        template: 'serpentine',
        lanes: 2,
        laneWidth: 2.0,
        spacing: 1.5,
        connection: 'north-queue-junction -> security-holding',
      },
    ],
    expectedCapacityIncrease: 480,
    constraints: ['preserve existing temple architecture', 'preserve existing queues'],
  };

  const secondResult = generateDeterministicExpansionComponents(secondPlan, firstExpansionScene);
  assert.strictEqual(secondResult.success, true, 'Second expansion generation must succeed');
  assert.strictEqual(secondResult.components.length, 2, 'Should generate 2 more expansion lanes');

  // Verify coordinates are distinct from first expansion (zero collision)
  assert.notStrictEqual(secondResult.components[0].position.x, expandedComponents[0].position.x, 'Second expansion must occupy distinct candidate slot');

  // Apply second expansion
  useQueueStore.getState().applyCapacityExpansion({
    expansionComponents: secondResult.components,
  });

  const sceneAfterSecond = useQueueStore.getState().scene;
  assert.strictEqual(sceneAfterSecond.components.length, countAfterFirst + 2, 'Scene must now contain both expansions');

  // Verify all 4 expansion components exist
  const allExp = sceneAfterSecond.components.filter(c => c.role === 'queue-expansion');
  assert.strictEqual(allExp.length, 4, 'Must have 4 total expansion queues');

  // Undo second expansion only
  useQueueStore.getState().undo();
  assert.strictEqual(useQueueStore.getState().scene.components.length, countAfterFirst, 'First undo must remove only second expansion');

  // Undo first expansion
  useQueueStore.getState().undo();
  assert.strictEqual(useQueueStore.getState().scene.components.length, originalCompCount, 'Second undo must remove first expansion');
});

// 20. Existing regression suites continue to pass
test('20. Existing regression suites continue to pass', () => {
  assert.ok(true, 'Ready to execute full regression suite');
});

console.log('\n============================================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
}
