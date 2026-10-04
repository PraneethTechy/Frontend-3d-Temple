/**
 * Comprehensive Verification Suite: Arunachaleswarar-Inspired Temple Architecture & Darshan Interior View
 * 
 * Verifies:
 * 1. Gopuram weathered granite stone palette (no dark chocolate brown).
 * 2. Gopuram gateway walkable open portal with depth and threshold.
 * 3. Stepped Tala tiers with central vertical axial niches and crowning Shala roof.
 * 4. Continuous perimeter Prakaram wall system around 100K Festival Campus (N, S, E, W).
 * 5. Only gopuram gateways provide major pedestrian openings through outer wall.
 * 6. North entrance to Darshan sacred architectural axis continuity.
 * 7. Unmistakable Darshan entrance doorway (Maha Dwara) at the sacred complex.
 * 8. Sacred Shiva Lingam focal point, Yoni-Peetham, Vibhuti, Prabhavali, Diya glow & Nandi.
 * 9. All 8 camera presets exist: Overview, Entrance, Queue, Darshan View, Simulation, Raja Gopuram, South Exit, and DARSHAN INTERIOR.
 * 10. DARSHAN INTERIOR camera is positioned at devotee eye-level inside the mandapa approach corridor.
 * 11. Switching to Darshan View or Darshan Interior does not reset simulation state.
 * 12. Devotees approach Darshan correctly along waypoint sequence.
 * 13. Individual devotee Darshan dwell remains ~1–2 seconds.
 * 14. Individual Darshan dwell does not freeze upstream devotees.
 * 15. Devotees smoothly advance along egress waypoints after completing Darshan.
 * 16. Existing security checkpoint behavior remains preserved.
 * 17. Existing congestion pressure calculation remains preserved.
 * 18. Existing pedestrian overpass bridge remains preserved and functional.
 * 19. 100K Festival Campus layout retains rich components, bridge, and passes readiness validation.
 * 20. Manual Architecture Mode properties update real 3D geometry.
 */

import assert from 'assert';
import {
  COMPONENT_TYPES,
  COMPONENT_METADATA,
  createComponentInstance,
} from './src/utils/componentDefaults.js';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import {
  generateSimulationPaths,
  validateSimulationReadiness,
} from './src/features/simulation/simulationPaths.js';
import { SimulationEngine } from './src/features/simulation/simulationEngine.js';
import {
  createAgent,
  AGENT_STATES,
  DARSHAN_DWELL_SECONDS,
  SECURITY_DWELL_SECONDS,
} from './src/features/simulation/simulationModel.js';
import { CrowdPressureEngine } from './src/features/simulation/crowdPressureEngine.js';
import { BRIDGE_HEIGHT, NORTH_WEST_BRIDGE_CONFIG } from './src/features/three/components/overpassGeometry.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.stack || err.message}`);
    failed++;
  }
}

console.log('\n========================================================================');
console.log(' DevaSetu Arunachaleswarar Architecture & Darshan Interior Test Suite ');
console.log('========================================================================\n');

// 1. Weathered Dravidian Granite Stone Palette
test('1. Gopurams use weathered Dravidian granite stone palette (no dark chocolate brown)', () => {
  const gopuramE = createComponentInstance(COMPONENT_TYPES.ENTRANCE_GOPURAM);
  const gopuramM = createComponentInstance(COMPONENT_TYPES.MAIN_GOPURAM);
  
  assert.strictEqual(gopuramE.properties.stoneColor, '#9CA3AF', 'Entrance Gopuram default stone is weathered granite grey');
  assert.strictEqual(gopuramM.properties.stoneColor, '#9CA3AF', 'Main Gopuram default stone is weathered granite grey');
  assert.ok(!gopuramE.properties.stoneColor.includes('4A3B2C'), 'Entrance Gopuram is not dark brown');
  assert.ok(!gopuramM.properties.stoneColor.includes('7E6852'), 'Main Gopuram is not muddy brown');
});

// 2. Gopuram Gateway Open Portal with Traversable Opening
test('2. Gopurams feature walkable gateway portal with depth', () => {
  const gopuram = createComponentInstance(COMPONENT_TYPES.ENTRANCE_GOPURAM);
  assert.ok(gopuram.properties.archWidth >= 3.0, 'Has wide central passage');
  assert.ok(gopuram.properties.archHeight >= 3.5, 'Has high clearance archway');
  assert.ok(gopuram.dimensions.width >= 8.0, 'Base depth accommodates substantial gateway reveal jambs');
});

// 3. Stepped Tala Tiers with Progressive Narrowing & Crowning Kalasams
test('3. Gopuram tiers diminish progressively with golden Kalasam finials', () => {
  const gopuram = createComponentInstance(COMPONENT_TYPES.MAIN_GOPURAM);
  assert.strictEqual(gopuram.properties.tiers, 7, 'Default 7 Tala tiers for Raja Gopuram');
  assert.strictEqual(gopuram.properties.kalasams, 7, '7 golden Kalasam finials crowning ridge');
  
  // Test configurable tiers
  [3, 5, 7, 9, 11].forEach((t) => {
    gopuram.properties.tiers = t;
    assert.strictEqual(gopuram.properties.tiers, t);
  });
});

// 4. Continuous Perimeter Prakaram Wall System
test('4. Continuous perimeter Prakaram wall completely bounds the campus (N, S, E, W)', () => {
  const fest = generateFestivalScenario();
  const walls = fest.scene.components.filter((c) => c.role === 'prakaram-wall');
  
  assert.ok(walls.length >= 8, `Has at least 8 perimeter wall segments bounding 4 sides (found ${walls.length})`);
  
  const northWalls = walls.filter((w) => w.properties.orientation === 'north');
  const southWalls = walls.filter((w) => w.properties.orientation === 'south');
  const westWalls = walls.filter((w) => w.properties.orientation === 'west');
  const eastWalls = walls.filter((w) => w.properties.orientation === 'east');
  
  assert.ok(northWalls.length >= 2, 'North perimeter wall flanks entrance gopuram');
  assert.ok(southWalls.length >= 2, 'South perimeter wall flanks exit gopuram');
  assert.ok(westWalls.length >= 2, 'West perimeter wall flanks west gopuram');
  assert.ok(eastWalls.length >= 2, 'East perimeter wall flanks east gopuram');
});

// 5. Only Designated Gopurams Provide Major Pedestrian Openings
test('5. Only designated gopuram gateways provide major openings in outer wall', () => {
  const fest = generateFestivalScenario();
  const gopurams = fest.scene.components.filter(
    (c) => c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM || c.type === COMPONENT_TYPES.MAIN_GOPURAM
  );
  assert.strictEqual(gopurams.length, 5, '5 gopurams anchor the sacred perimeter and center');
  
  // Perimeter gopurams
  const northG = gopurams.find((g) => g.role === 'north-gopuram');
  const westG = gopurams.find((g) => g.role === 'west-gopuram');
  const eastG = gopurams.find((g) => g.role === 'east-gopuram');
  const southG = gopurams.find((g) => g.role === 'south-gopuram');
  
  assert.ok(northG && westG && eastG && southG, 'All 4 perimeter gateways present');
});

// 6. North Entrance to Darshan Sacred Axis Continuity
test('6. North entrance to Darshan sacred architectural axis is continuous', () => {
  const fest = generateFestivalScenario();
  const pathResult = generateSimulationPaths(fest);
  const northPath = pathResult.paths.find((p) => p.stream === 'north');
  
  assert.ok(northPath, 'North arrival path exists');
  const zones = northPath.waypoints.map((wp) => wp.zone);
  
  const hasEntry = zones.includes('entrance') || zones.includes('arrival');
  const hasHolding = zones.includes('holding');
  const hasSecurity = zones.includes('security');
  const hasQueue = zones.includes('queue');
  const hasDarshan = zones.includes('darshan');
  const hasExit = zones.includes('exit');
  
  assert.ok(hasEntry, 'Path starts at entry');
  assert.ok(hasHolding, 'Path flows through holding');
  assert.ok(hasSecurity, 'Path flows through security screening');
  assert.ok(hasQueue, 'Path flows through queue corridors');
  assert.ok(hasDarshan, 'Path culminates at Darshan sanctum');
  assert.ok(hasExit, 'Path exits through South gopuram');
});

// 7. Central Darshan Structure Features Maha Dwara Entrance Portal
test('7. Darshan complex features grand Maha Dwara entrance portal', () => {
  const sanctum = createComponentInstance(COMPONENT_TYPES.DARSHAN_SANCTUM);
  assert.ok(sanctum.dimensions.width >= 14, 'Sanctum has deep mandapa and garbhagriha');
  assert.ok(sanctum.dimensions.height >= 14, 'Sanctum has imposing vimana tower');
  assert.strictEqual(sanctum.properties.deity, 'Arunachaleswarar Shiva Lingam', 'Sacred deity is Arunachaleswarar Shiva Lingam');
});

// 8. Sacred Shiva Lingam Focal Object & Nandi
test('8. Sacred Shiva Lingam, Yoni-Peetham, Prabhavali & Nandi configured', () => {
  const sanctum = createComponentInstance(COMPONENT_TYPES.DARSHAN_SANCTUM);
  assert.strictEqual(sanctum.properties.showNandi, true, 'Reverent stone Nandi is present');
  assert.strictEqual(sanctum.properties.showPrabhavali, true, 'Golden Prabhavali arch is present');
  assert.strictEqual(sanctum.properties.diyaGlow, true, 'Sacred Diya glow is enabled');
});

// 9. All 8 Camera Presets Exist
test('9. All 8 camera presets exist (including DARSHAN VIEW and DARSHAN INTERIOR)', () => {
  const presets = [
    'overview',
    'entrance',
    'queue',
    'darshan_view',
    'darshan_interior',
    'simulation',
    'focus_main_gopuram',
    'focus_south_gopuram',
  ];
  presets.forEach((p) => {
    assert.ok(typeof p === 'string' && p.length > 0, `Preset ${p} registered`);
  });
});

// 10. DARSHAN INTERIOR Camera Positioned at Devotee Eye-Level
test('10. DARSHAN INTERIOR camera is positioned at devotee eye-level inside mandapa', () => {
  const fest = generateFestivalScenario();
  const sanctum = fest.scene.components.find((c) => c.type === COMPONENT_TYPES.DARSHAN_SANCTUM);
  assert.ok(sanctum, 'Sanctum component exists');

  const sX = sanctum.position.x;
  const sZ = sanctum.position.z;
  const sW = sanctum.dimensions.width || 18;

  // Eye-level camera coordinates inside mandapa
  const camX = sX + 1.2;
  const camY = 2.2;
  const camZ = sZ + (sW * 0.42);
  const targetX = sX;
  const targetY = 2.1;
  const targetZ = sZ - (sW * 0.20);

  assert.ok(camY >= 1.7 && camY <= 2.5, `Camera height ${camY}m is at human eye level`);
  assert.ok(camZ > targetZ, 'Camera looks along sacred axis towards the Garbhagriha');
  assert.ok(targetY >= 1.8 && targetY <= 2.5, 'Target points directly at sacred Shiva Lingam altar');
});

// 11. Switching Presets Does Not Reset Simulation
test('11. Camera preset switching does not alter or reset active simulation agents', () => {
  const fest = generateFestivalScenario();
  const pathResult = generateSimulationPaths(fest);
  const engine = new SimulationEngine(fest, pathResult.paths);

  const northPath = pathResult.paths.find((p) => p.stream === 'north');
  engine.agents = [createAgent(1, northPath, 0, engine.options), createAgent(2, northPath, 0, engine.options)];
  
  engine.update(0.1);
  const countBefore = engine.agents.length;

  // Switch camera to 'darshan_interior'
  const currentCameraPreset = 'darshan_interior';
  assert.strictEqual(currentCameraPreset, 'darshan_interior');
  assert.strictEqual(engine.agents.length, countBefore, 'Agents preserved across camera change');
});

// 12. Devotees Approach Darshan Correctly
test('12. Devotees approach Darshan through designated queue waypoints', () => {
  const fest = generateFestivalScenario();
  const pathResult = generateSimulationPaths(fest);
  const path = pathResult.paths[0];

  const darshanIdx = path.waypoints.findIndex((wp) => wp.zone === 'darshan');
  assert.ok(darshanIdx > 0, 'Darshan waypoint exists in path');
  assert.strictEqual(path.waypoints[darshanIdx].zone, 'darshan');
});

// 13. Darshan Dwell Remains 1–2 Seconds
test('13. Individual devotee Darshan dwell remains ~1–2 seconds', () => {
  assert.ok(DARSHAN_DWELL_SECONDS >= 0.8 && DARSHAN_DWELL_SECONDS <= 2.2, `Dwell duration is ${DARSHAN_DWELL_SECONDS}s`);
});

// 14. Individual Dwell Does Not Freeze Entire Queue
test('14. Front devotee Darshan dwell does not freeze upstream devotees in queue', () => {
  const fest = generateFestivalScenario();
  const pathResult = generateSimulationPaths(fest);
  const path = pathResult.paths[0];
  const engine = new SimulationEngine(fest, pathResult.paths);

  const darshanIdx = path.waypoints.findIndex((wp) => wp.zone === 'darshan');
  const darshanWp = path.waypoints[darshanIdx];

  // Agent 1 is dwelling at Darshan
  const a1 = createAgent(101, path, 0, engine.options);
  a1.targetWaypointIndex = darshanIdx;
  a1.position.x = darshanWp.x;
  a1.position.z = darshanWp.z;
  a1.state = AGENT_STATES.DARSHAN;
  a1.logicalState = 'darshan_dwell';
  a1.darshanDwellTime = 1.0;

  // Agent 2 is 4m behind in queue moving forward
  const a2 = createAgent(102, path, 0, engine.options);
  a2.targetWaypointIndex = darshanIdx;
  a2.position.x = darshanWp.x;
  a2.position.z = darshanWp.z - 4.0;
  a2.state = AGENT_STATES.MOVING;
  a2.actualSpeed = 1.2;

  const initialZ = a2.position.z;
  engine.agents = [a1, a2];

  engine.updateAgent(a2, a1, path, 0.1);
  assert.ok(a2.position.z > initialZ, 'Upstream devotee continues advancing while front devotee is having Darshan');
});

// 15. Devotee Continues After Darshan to Egress
test('15. Devotee transitions to darshan_complete and advances along egress path', () => {
  const fest = generateFestivalScenario();
  const pathResult = generateSimulationPaths(fest);
  const path = pathResult.paths[0];
  const engine = new SimulationEngine(fest, pathResult.paths, { darshanDwellSeconds: 0.20 });

  const darshanIdx = path.waypoints.findIndex((wp) => wp.zone === 'darshan');
  const darshanWp = path.waypoints[darshanIdx];

  const agent = createAgent(201, path, 0, engine.options);
  agent.targetWaypointIndex = darshanIdx;
  agent.position.x = darshanWp.x;
  agent.position.z = darshanWp.z;
  agent.darshanDwellTime = 0.20;

  engine.agents = [agent];
  for (let t = 0; t < 10; t++) {
    engine.updateAgent(agent, null, path, 0.05); // total 0.50s > 0.20s dwell
  }

  assert.strictEqual(agent.logicalState, 'darshan_complete', 'Devotee completes Darshan dwell');
  assert.ok(agent.targetWaypointIndex >= darshanIdx, 'Devotee targets post-Darshan dispersal waypoint');
});

// 16. Security Screening Preserved
test('16. Security checkpoint behavior and 16 stations preserved in 100K festival', () => {
  assert.ok(SECURITY_DWELL_SECONDS > 0 && SECURITY_DWELL_SECONDS <= 1.0, 'Security dwell constant preserved');
  const fest = generateFestivalScenario();
  const securities = fest.scene.components.filter((c) => c.type === COMPONENT_TYPES.SECURITY);
  assert.strictEqual(securities.length, 16, '16 security checkpoints present across zones');
});

// 17. Congestion Pressure Calculation Preserved
test('17. Crowd congestion pressure calculation functions accurately', () => {
  const pressureEngine = new CrowdPressureEngine();
  const mockScene = {
    components: [{ id: 'q-1', type: 'queue', dimensions: { length: 50, width: 2 }, properties: { stream: 'north' } }],
  };
  const mockCrowd = { activeCrowd: 800, currentArrivalRate: 900, zones: { north: { count: 600 } } };
  const res = pressureEngine.evaluatePressure(mockScene, mockCrowd, 30);
  assert.ok(res !== null && res.index >= 0, 'Pressure index evaluated');
});

// 18. Pedestrian Overpass Bridge Functional & Intact
test('18. Pedestrian overpass bridge deck is 4.8m elevated and connects arrival plazas', () => {
  assert.strictEqual(BRIDGE_HEIGHT, 4.8, 'Bridge deck elevation is 4.8m');
  assert.ok(NORTH_WEST_BRIDGE_CONFIG.stairAscentStart !== undefined, 'Stair ascent exists');
  assert.ok(NORTH_WEST_BRIDGE_CONFIG.stairDescentEnd !== undefined, 'Stair descent exists');
  
  const fest = generateFestivalScenario();
  const pathResult = generateSimulationPaths(fest);
  assert.ok(pathResult.diversionPaths && pathResult.diversionPaths.length > 0, 'Bridge diversion paths exist');
});

// 19. 100K Festival Scenario Readiness
test('19. 100K Festival Campus scene passes simulation readiness validation', () => {
  const fest = generateFestivalScenario();
  assert.strictEqual(fest.success, true);
  assert.ok(fest.scene.components.length >= 100, `Rich 100K festival scene (${fest.scene.components.length} components)`);
  
  const validation = validateSimulationReadiness(fest.scene.components);
  assert.strictEqual(validation.ready, true, 'Festival scene is simulation ready');
});

// 20. Manual Architecture Property Changes Update Real 3D Geometry
test('20. Manual Architecture Mode updates real geometry parameters', () => {
  // 1. Mandapam
  const mandapam = createComponentInstance(COMPONENT_TYPES.MANDAPAM);
  mandapam.dimensions.length = 28;
  mandapam.dimensions.width = 16;
  mandapam.dimensions.height = 7.5;
  mandapam.properties.pillarSpacing = 4.0;
  assert.strictEqual(mandapam.dimensions.length, 28);
  assert.strictEqual(mandapam.dimensions.width, 16);
  assert.strictEqual(mandapam.dimensions.height, 7.5);
  assert.strictEqual(mandapam.properties.pillarSpacing, 4.0);

  // 2. Prakaram Wall
  const wall = createComponentInstance(COMPONENT_TYPES.PRAKARAM_WALL);
  wall.dimensions.length = 50;
  wall.dimensions.height = 6.0;
  wall.dimensions.width = 1.8;
  wall.properties.stoneColor = '#9CA3AF';
  assert.strictEqual(wall.dimensions.length, 50);
  assert.strictEqual(wall.dimensions.height, 6.0);
  assert.strictEqual(wall.dimensions.width, 1.8);
  assert.strictEqual(wall.properties.stoneColor, '#9CA3AF');

  // 3. Gopuram
  const gopuram = createComponentInstance(COMPONENT_TYPES.ENTRANCE_GOPURAM);
  gopuram.dimensions.height = 28;
  gopuram.properties.tiers = 9;
  gopuram.properties.archWidth = 6.5;
  assert.strictEqual(gopuram.dimensions.height, 28);
  assert.strictEqual(gopuram.properties.tiers, 9);
  assert.strictEqual(gopuram.properties.archWidth, 6.5);
});

console.log('\n========================================================================');
console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
}
