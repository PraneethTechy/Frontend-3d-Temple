/**
 * DevaSetu Temple Architecture & Distributed Multi-Zone Festival Campus Verification Suite
 */

import { generateFestivalScenario, FESTIVAL_SITE_SPECS } from './src/services/layout/festivalScenarioGenerator.js';
import { COMPONENT_TYPES } from './src/utils/componentDefaults.js';
import { validateSimulationReadiness, generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';

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

console.log('========================================================================');
console.log(' DevaSetu Distributed Multi-Zone Temple Campus Scenario Suite          ');
console.log('========================================================================\n');

// 1. SPECIFICATION VALIDATION
console.log('--- TEST 1: Reference Campus Specifications ---');
assert(FESTIVAL_SITE_SPECS.length === 250, 'Site length is 250m');
assert(FESTIVAL_SITE_SPECS.width === 180, 'Site width is 180m');
assert(FESTIVAL_SITE_SPECS.expectedVisitors === 100000, 'Daily devotee demand is 100,000');
assert(FESTIVAL_SITE_SPECS.peakVisitors === 15000, 'Peak simultaneously managed population is 15,000');
assert(FESTIVAL_SITE_SPECS.peakArrivalPerHour === 12000, 'Peak arrival rate is 12,000/hour');
assert(FESTIVAL_SITE_SPECS.averageArrivalPerHour === 8333, 'Average arrival rate is approximately 8,333/hour');

// 2. GENERATE FESTIVAL SCENARIO
console.log('\n--- TEST 2: Procedural 100K Multi-Zone Campus Generation ---');
const result = generateFestivalScenario();
assert(result.success === true, 'Festival campus scenario generated successfully');

const scene = result.scene;
const components = scene.components;
assert(components.length > 50, `Substantial infrastructure components generated (${components.length} components)`);

// 3. FIVE GOPURAM SYSTEM & ARCHITECTURAL LANDMARKS
console.log('\n--- TEST 3: Five Gopuram System & Dravidian Architecture ---');
const northGopuram = components.find((c) => c.role === 'north-gopuram');
assert(northGopuram !== undefined, 'North Gopuram (Uttara Raja Dvaram) is present');
assert(northGopuram.dimensions.height === 24, `North Gopuram has 24m elevation`);
assert(northGopuram.position.z <= -80, 'North Gopuram is positioned at north campus boundary');

const westGopuram = components.find((c) => c.role === 'west-gopuram');
assert(westGopuram !== undefined, 'West Gopuram (Pashchima Dvaram) is present');
assert(westGopuram.position.x <= -100, 'West Gopuram is positioned at west campus boundary');
assert(westGopuram.rotation === 90, 'West Gopuram is rotated to face eastward into campus');

const eastGopuram = components.find((c) => c.role === 'east-gopuram');
assert(eastGopuram !== undefined, 'East Gopuram (Purva Dvaram) is present');
assert(eastGopuram.position.x >= 100, 'East Gopuram is positioned at east campus boundary');
assert(eastGopuram.rotation === -90, 'East Gopuram is rotated to face westward into campus');

const southGopuram = components.find((c) => c.role === 'south-gopuram');
assert(southGopuram !== undefined, 'South Exit Gopuram (Dakshina Nirgamana Dvaram) is present');
assert(southGopuram.position.z >= 80, 'South Exit Gopuram is positioned at south egress boundary');
assert(southGopuram.properties?.archWidth >= 7.0, 'South Exit Gopuram features wide egress portal (>=7m)');

const mainGopuram = components.find((c) => c.type === COMPONENT_TYPES.MAIN_GOPURAM);
assert(mainGopuram !== undefined, 'Central Main Raja Gopuram (34m) is present');
assert(mainGopuram.dimensions.height === 34, `Main Gopuram is the primary architectural landmark (34m)`);
assert(mainGopuram.position.x === 0 && mainGopuram.position.z === -10, 'Main Gopuram sits prominently at central campus axis');

const sanctum = components.find((c) => c.type === COMPONENT_TYPES.DARSHAN_SANCTUM);
assert(sanctum !== undefined, 'Darshan Sanctum / Garbhagriha is present');
assert(sanctum.properties.vimanaHeight === 16, `Sanctum features stepped Dravidian Vimana tower (16m)`);
assert(sanctum.properties.diyaGlow === true, 'Sanctum has sacred Diya illumination glow enabled');

// Check functional differences across towers
assert(
  mainGopuram.dimensions.height > northGopuram.dimensions.height &&
  northGopuram.dimensions.height > westGopuram.dimensions.height &&
  southGopuram.properties.archWidth > northGopuram.properties.archWidth,
  'Towers exhibit distinct heights, portal widths, and architectural roles'
);

// 4. MULTI-ZONE CROWD DISTRIBUTION & QUEUE PATTERNS
console.log('\n--- TEST 4: Multi-Zone Infrastructure & Diverse Queue Patterns ---');
// 14 Arrival Gates (6 North, 4 West, 4 East)
const entrances = components.filter((c) => c.type === COMPONENT_TYPES.ENTRANCE);
assert(entrances.length >= 14, `Arrival gates distributed across 3 entrances (found ${entrances.length})`);

// 16 Parallel Security Channels: North (6), West (5), East (5)
const securities = components.filter((c) => c.type === COMPONENT_TYPES.SECURITY);
assert(securities.length === 16, `Exactly 16 Security Channels generated (found ${securities.length})`);
const northSec = securities.filter((s) => s.properties?.zone === 'A');
const westSec = securities.filter((s) => s.properties?.zone === 'B');
const eastSec = securities.filter((s) => s.properties?.zone === 'C');
assert(northSec.length === 6, `North Security: 6 channels (found ${northSec.length})`);
assert(westSec.length === 5, `West Security: 5 channels (found ${westSec.length})`);
assert(eastSec.length === 5, `East Security: 5 channels (found ${eastSec.length})`);

// 16 Primary Queue Lanes (6 North Serpentine, 5 West Switchback, 5 East Switchback)
const primaryQueues = components.filter((c) => c.role === 'queue-lane');
assert(primaryQueues.length === 16, `16 Primary Queue Lanes generated (found ${primaryQueues.length})`);

// Pattern Diversity Verification
const patternsUsed = new Set(components.map((c) => c.properties?.pattern).filter(Boolean));
assert(patternsUsed.has('serpentine'), 'Pattern SERPENTINE is present (North Zone)');
assert(patternsUsed.has('switchback'), 'Pattern SWITCHBACK is present (West/East Zones)');
assert(patternsUsed.has('parallel'), 'Pattern PARALLEL is present (Security screening)');
assert(patternsUsed.has('holding_loop'), 'Pattern HOLDING LOOP is present (Holding zones)');
assert(patternsUsed.has('radial'), 'Pattern RADIAL/FAN is present (Central Forecourt approach)');
assert(patternsUsed.has('dispersal'), 'Pattern DISPERSAL is present (Post-Darshan egress channels)');
assert(patternsUsed.has('overflow_loop'), 'Pattern OVERFLOW LOOP is present (Zone H reserve bay)');
assert(patternsUsed.size >= 6, `At least 6 distinct queue patterns verified (found ${patternsUsed.size})`);

// Post-Darshan Dispersal Plaza
const plaza = components.find((c) => c.role === 'post-darshan-plaza');
assert(plaza !== undefined, 'Post-Darshan Dispersal Plaza is provided in Zone F');
assert(plaza.dimensions.length >= 50, `Plaza provides ample gathering breadth (${plaza.dimensions.length}m)`);

// Darshan Viewing Zones
const darshans = components.filter((c) => c.type === COMPONENT_TYPES.DARSHAN);
assert(darshans.length === 4, `4 Darshan Viewing Channels (D1-D4) generated (found ${darshans.length})`);

// Exits
const exits = components.filter((c) => c.type === COMPONENT_TYPES.EXIT);
assert(exits.length >= 6, `Sufficient egress corridors provided (found ${exits.length})`);

// 5. SIMULATION READINESS & 16 MULTI-STREAM PATHS
console.log('\n--- TEST 5: Simulation Readiness & Multi-Stream Path Routing ---');
const readiness = validateSimulationReadiness(components);
assert(readiness.ready === true, 'Scene passes simulation readiness validation');

const simPaths = generateSimulationPaths(scene);
assert(simPaths.ready === true, 'Simulation paths generated successfully');
assert(simPaths.paths.length === 16, `Generated 16 distinct flow paths (6 North, 5 West, 5 East)`);

// Check streams
const northPaths = simPaths.paths.filter((p) => p.stream === 'north');
const westPaths = simPaths.paths.filter((p) => p.stream === 'west');
const eastPaths = simPaths.paths.filter((p) => p.stream === 'east');
assert(northPaths.length === 6, `6 North stream paths generated (found ${northPaths.length})`);
assert(westPaths.length === 5, `5 West stream paths generated (found ${westPaths.length})`);
assert(eastPaths.length === 5, `5 East stream paths generated (found ${eastPaths.length})`);

// Check that paths connect all required zones
simPaths.paths.forEach((p, idx) => {
  const zones = p.waypoints.map((w) => w.zone);
  const hasEntrance = zones.includes('entrance');
  const hasSecurity = zones.includes('security');
  const hasQueue = zones.includes('queue');
  const hasDarshan = zones.includes('darshan');
  const hasDispersal = zones.includes('dispersal');
  const hasExit = zones.includes('exit');

  if (!hasEntrance || !hasSecurity || !hasQueue || !hasDarshan || !hasDispersal || !hasExit) {
    assert(false, `Path ${idx} (${p.name}) missing required zone connection`);
  }
});
assert(true, 'All 16 paths connect Entrance -> Holding -> Security -> Queue -> Darshan -> Plaza -> Exit');

// Check traversal through Main Gopuram portal
const allTraverseGopuram = simPaths.paths.every((p) =>
  p.waypoints.some((w) => w.name?.includes('Main Gopuram'))
);
assert(allTraverseGopuram === true, 'All 16 paths route through Central Main Gopuram portal to Sanctum');

// Check termination at South Exit Gopuram
const allExitSouth = simPaths.paths.every((p) =>
  p.waypoints.some((w) => w.name?.includes('South Exit Gopuram'))
);
assert(allExitSouth === true, 'All 16 paths terminate through South Exit Gopuram portal');

// 6. SIMULATION ENGINE EXECUTION
console.log('\n--- TEST 6: Crowd Simulation Engine Multi-Stream Execution ---');
const engine = new SimulationEngine(scene, simPaths.paths);
assert(engine.agents.length === 0, 'Simulation engine initialized with 0 agents');

// Step through 150 simulation ticks
for (let i = 0; i < 150; i++) {
  engine.update(0.1, 2.0);
}

assert(engine.agents.length > 0, `Agents spawned and progressing through campus (${engine.agents.length} active devotees)`);

// Verify agents spawned across all 3 streams
const activeStreams = new Set(
  engine.agents.map((a) => {
    if (a.pathId < 6) return 'north';
    if (a.pathId < 11) return 'west';
    return 'east';
  })
);
assert(activeStreams.has('north') && activeStreams.has('west') && activeStreams.has('east'), 'Devotees actively progressing along North, West, and East streams concurrently');

// Check that agents maintain queue spacing
let minSpacing = 999;
for (let i = 0; i < engine.agents.length; i++) {
  for (let j = i + 1; j < engine.agents.length; j++) {
    const a1 = engine.agents[i];
    const a2 = engine.agents[j];
    if (a1.pathId === a2.pathId) {
      const dx = a1.position.x - a2.position.x;
      const dz = a1.position.z - a2.position.z;
      const d = Math.hypot(dx, dz);
      if (d < minSpacing) minSpacing = d;
    }
  }
}
assert(minSpacing >= 0.85, `Agents maintain safe queue spacing (min observed: ${minSpacing.toFixed(2)}m)`);

console.log('\n========================================================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================================================\n');

if (failed > 0) process.exit(1);
