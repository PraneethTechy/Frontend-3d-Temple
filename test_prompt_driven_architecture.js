/**
 * DevaSetu Prompt-Driven Temple Architecture Acceptance Tests
 * Validates TEST A, TEST B, TEST C and ensures:
 * 1. User prompts directly drive gopuram, entrance, exit, sanctum, and queue counts.
 * 2. Different prompts generate materially different Scene JSONs.
 * 3. 100K Festival Demo remains unchanged.
 * 4. Queue shapes (e.g. U-shaped pathData) are preserved.
 * 5. Layout validation passes cleanly without bounding or overlap errors.
 */

import { extractArchitecturalIntentFromPrompt } from './src/services/layout/promptArchitectureExtractor.js';
import { generateProceduralLayout, QUEUE_TEMPLATES } from './src/services/layout/layoutGenerator.js';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { validateLayout } from './src/services/layout/layoutValidator.js';
import { COMPONENT_TYPES } from './src/utils/componentDefaults.js';

console.log('========================================================================');
console.log(' DevaSetu Prompt-Driven Temple Architecture Test Suite                  ');
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
// TEST A: 4 Gopurams, Central Sanctum, 3 Queue Systems
// -----------------------------------------------------------------------------
console.log('--- TEST A: "Temple with 4 gopurams: North, South, East, West. Central sanctum. 3 entrance queues." ---');
const promptA = 'Temple with 4 gopurams: North, South, East, West. Central sanctum. 3 entrance queues.';
const sceneA = {
  site: { length: 80, width: 50, unit: 'meters' },
  requirements: { peakVisitors: 2000 },
};

const resultA = generateProceduralLayout(sceneA, { prompt: promptA });
assert(resultA.success === true, 'Test A generated successfully');

const gopuramsA = resultA.components.filter(
  (c) => c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM || c.type === COMPONENT_TYPES.MAIN_GOPURAM
);
assert(gopuramsA.length === 4, `Test A has exactly 4 gopurams (found ${gopuramsA.length})`);

const hasNorthA = gopuramsA.some((g) => g.role === 'north-gopuram' || g.properties?.direction === 'North');
const hasSouthA = gopuramsA.some((g) => g.role === 'south-gopuram' || g.properties?.direction === 'South');
const hasEastA = gopuramsA.some((g) => g.role === 'east-gopuram' || g.properties?.direction === 'East');
const hasWestA = gopuramsA.some((g) => g.role === 'west-gopuram' || g.properties?.direction === 'West');
assert(hasNorthA && hasSouthA && hasEastA && hasWestA, 'Test A has all 4 cardinal gopurams (North, South, East, West)');

const sanctumA = resultA.components.find((c) => c.type === COMPONENT_TYPES.DARSHAN_SANCTUM);
assert(Boolean(sanctumA), 'Test A has Darshan Sanctum');
assert(sanctumA && Math.abs(sanctumA.position.x) <= 1 && Math.abs(sanctumA.position.z) <= 1, `Test A sanctum is central at (0, 0) (actual: ${sanctumA?.position.x}, ${sanctumA?.position.z})`);

const queuesA = resultA.components.filter((c) => c.type === COMPONENT_TYPES.QUEUE);
assert(queuesA.length === 3, `Test A has 3 distinct queue systems (found ${queuesA.length})`);

// -----------------------------------------------------------------------------
// TEST B: 6 Gopurams, 4 Entrances, 2 Exits, Large Central Sanctum, VIP Entrance
// -----------------------------------------------------------------------------
console.log('\n--- TEST B: "Temple with 6 gopurams. 4 entrances and 2 exits. Large central sanctum. VIP entrance." ---');
const promptB = 'Temple with 6 gopurams. 4 entrances and 2 exits. Large central sanctum. VIP entrance.';
const sceneB = {
  site: { length: 100, width: 60, unit: 'meters' },
  requirements: { peakVisitors: 4000 },
};

const resultB = generateProceduralLayout(sceneB, { prompt: promptB });
assert(resultB.success === true, 'Test B generated successfully');

const gopuramsB = resultB.components.filter(
  (c) => c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM || c.type === COMPONENT_TYPES.MAIN_GOPURAM
);
assert(gopuramsB.length === 6, `Test B has exactly 6 gopurams (found ${gopuramsB.length})`);

const entrancesB = resultB.components.filter((c) => c.type === COMPONENT_TYPES.ENTRANCE);
// 4 general entrances + 1 VIP entrance = 5 total entrance components (or at least 4 entrances + VIP)
const vipEntranceB = entrancesB.find((e) => e.role === 'entrance-vip' || e.properties?.isVip);
assert(Boolean(vipEntranceB), 'Test B has dedicated VIP Entrance Gate');
assert(entrancesB.length >= 4, `Test B has at least 4 entrance gates (found ${entrancesB.length})`);

const exitsB = resultB.components.filter((c) => c.type === COMPONENT_TYPES.EXIT);
assert(exitsB.length === 2, `Test B has exactly 2 exits (found ${exitsB.length})`);

const sanctumB = resultB.components.find((c) => c.type === COMPONENT_TYPES.DARSHAN_SANCTUM);
assert(Boolean(sanctumB), 'Test B has Darshan Sanctum');
assert(sanctumB && Math.abs(sanctumB.position.x) <= 1 && Math.abs(sanctumB.position.z) <= 1, 'Test B sanctum is central at (0, 0)');
assert(sanctumB && sanctumB.dimensions.length >= 18, `Test B sanctum is large scale (length: ${sanctumB?.dimensions?.length})`);

// -----------------------------------------------------------------------------
// TEST C: 2 Gopurams, 1 Entrance, 1 Exit, U-Shaped Queue
// -----------------------------------------------------------------------------
console.log('\n--- TEST C: "Small temple with 2 gopurams, one entrance, one exit and one U-shaped queue." ---');
const promptC = 'Small temple with 2 gopurams, one entrance, one exit and one U-shaped queue.';
const sceneC = {
  site: { length: 60, width: 35, unit: 'meters' },
  requirements: { peakVisitors: 1000 },
};

const resultC = generateProceduralLayout(sceneC, { prompt: promptC });
assert(resultC.success === true, 'Test C generated successfully');

const gopuramsC = resultC.components.filter(
  (c) => c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM || c.type === COMPONENT_TYPES.MAIN_GOPURAM
);
assert(gopuramsC.length === 2, `Test C has exactly 2 gopurams (found ${gopuramsC.length})`);

const entrancesC = resultC.components.filter((c) => c.type === COMPONENT_TYPES.ENTRANCE);
assert(entrancesC.length === 1, `Test C has exactly 1 entrance (found ${entrancesC.length})`);

const exitsC = resultC.components.filter((c) => c.type === COMPONENT_TYPES.EXIT);
assert(exitsC.length === 1, `Test C has exactly 1 exit (found ${exitsC.length})`);

const queuesC = resultC.components.filter((c) => c.type === COMPONENT_TYPES.QUEUE);
const uShapeQueueC = queuesC.find(
  (q) => q.template === 'u_shape' || q.properties?.pathData?.type === 'u_shape' || q.name.includes('U-Shape')
);
assert(Boolean(uShapeQueueC), 'Test C has U-shaped queue structure');
assert(uShapeQueueC?.properties?.pathData?.type === 'u_shape', 'Test C preserves U-shaped queue pathData');

// -----------------------------------------------------------------------------
// MATERIAL DIFFERENTIATION TEST
// -----------------------------------------------------------------------------
console.log('\n--- MATERIAL DIFFERENTIATION TEST ---');
assert(gopuramsA.length !== gopuramsB.length, 'Test A and Test B have different gopuram counts (4 vs 6)');
assert(gopuramsB.length !== gopuramsC.length, 'Test B and Test C have different gopuram counts (6 vs 2)');
assert(entrancesB.length !== entrancesC.length, 'Test B and Test C have different entrance counts');
assert(exitsB.length !== exitsC.length, 'Test B and Test C have different exit counts (2 vs 1)');
assert(queuesA.length !== queuesC.length, 'Test A and Test C have different queue system counts (3 vs 1)');

// -----------------------------------------------------------------------------
// 100K FESTIVAL DEMO PRESERVATION TEST
// -----------------------------------------------------------------------------
console.log('\n--- 100K FESTIVAL DEMO PRESERVATION TEST ---');
const festScene = generateFestivalScenario({ length: 250, width: 180 });
assert(festScene.success === true, '100K festival scenario generates successfully');
assert(festScene.components.length >= 100, `100K festival has full multi-zone campus scale (components: ${festScene.components.length})`);

// Procedural layout with template 'campus' without prompt must generate the festival scenario
const campusProcedural = generateProceduralLayout(
  { site: { length: 250, width: 180 }, requirements: { peakVisitors: 15000 } },
  { template: QUEUE_TEMPLATES.CAMPUS }
);
assert(campusProcedural.success === true, 'Campus procedural generation succeeds');
assert(campusProcedural.components.length >= 100, 'Festival demo components preserved for template: campus');

// But an AI prompt on a large site must NOT be hijacked by the 100K festival demo
const promptOnLargeSite = generateProceduralLayout(
  { site: { length: 250, width: 180 }, requirements: { peakVisitors: 15000 } },
  { prompt: 'Small temple with 2 gopurams, one entrance, one exit and one U-shaped queue.' }
);
const largeSiteGopurams = promptOnLargeSite.components.filter(
  (c) => c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM || c.type === COMPONENT_TYPES.MAIN_GOPURAM
);
assert(largeSiteGopurams.length === 2, `Prompt on large site respects requested 2 gopurams instead of festival 5 gopurams (found ${largeSiteGopurams.length})`);

// -----------------------------------------------------------------------------
// LAYOUT VALIDATION
// -----------------------------------------------------------------------------
console.log('\n--- LAYOUT VALIDATION CHECKS ---');
const valA = validateLayout(resultA.components, sceneA.site, sceneA.requirements);
assert(valA.valid === true, `Layout A passes validation without errors (errors: ${valA.errors.length})`);

const valB = validateLayout(resultB.components, sceneB.site, sceneB.requirements);
assert(valB.valid === true, `Layout B passes validation without errors (errors: ${valB.errors.length})`);

const valC = validateLayout(resultC.components, sceneC.site, sceneC.requirements);
assert(valC.valid === true, `Layout C passes validation without errors (errors: ${valC.errors.length})`);

// -----------------------------------------------------------------------------
// SIMULATION PATHS CHECK
// -----------------------------------------------------------------------------
console.log('\n--- SIMULATION PATH CHECKS ---');
import('./src/features/simulation/simulationPaths.js').then(({ generateSimulationPaths }) => {
  const pathsA = generateSimulationPaths({ site: sceneA.site, components: resultA.components });
  assert(pathsA.ready === true, 'Simulation paths A ready');
  assert(pathsA.paths.length === 3, `Simulation paths A has 3 distinct paths (found ${pathsA.paths.length})`);

  const pathsB = generateSimulationPaths({ site: sceneB.site, components: resultB.components });
  assert(pathsB.ready === true, 'Simulation paths B ready');
  assert(pathsB.paths.length >= 1, `Simulation paths B generated paths (found ${pathsB.paths.length})`);

  const pathsC = generateSimulationPaths({ site: sceneC.site, components: resultC.components });
  assert(pathsC.ready === true, 'Simulation paths C ready');
  assert(pathsC.paths.length >= 1, `Simulation paths C generated paths (found ${pathsC.paths.length})`);

  console.log('\n========================================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
});
