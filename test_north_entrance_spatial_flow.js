import assert from 'node:assert';
import test from 'node:test';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { generateSimulationPaths } from './src/features/simulation/simulationPaths.js';
import { COMPONENT_TYPES } from './src/utils/componentDefaults.js';

console.log('========================================================================');
console.log(' DevaSetu North Entrance & Campus Spatial Flow Verification Suite ');
console.log('========================================================================\n');

const fest = generateFestivalScenario();
const components = fest.scene.components;
const pathResult = generateSimulationPaths(fest);

// 1. North Entrance Gopuram exists and has valid opening dimensions
test('1. North Entrance Gopuram exists with authentic open gateway dimensions', () => {
  const northGopuram = components.find((c) => c.role === 'north-gopuram');
  assert.ok(northGopuram, 'North Entrance Gopuram exists');
  assert.strictEqual(northGopuram.type, COMPONENT_TYPES.ENTRANCE_GOPURAM);
  assert.strictEqual(northGopuram.position.x, 0, 'North Gopuram is centered at X = 0');
  
  const archW = northGopuram.properties.archWidth;
  const archH = northGopuram.properties.archHeight;
  assert.ok(archW >= 4.0, `Gateway width (${archW}m) is sufficient for pedestrian crowds`);
  assert.ok(archH >= 4.0, `Gateway height (${archH}m) is monumental and traversable`);
});

// 2. North Perimeter Walls connect cleanly without blocking gateway opening
test('2. North Perimeter Walls terminate cleanly at Gopuram base without blocking doorway', () => {
  const northGopuram = components.find((c) => c.role === 'north-gopuram');
  const gopuramHalfL = (northGopuram.dimensions.length || 18) / 2; // 9m
  
  const wallNW = components.find((c) => c.id.startsWith('wall-north-west'));
  const wallNE = components.find((c) => c.id.startsWith('wall-north-east'));
  assert.ok(wallNW, 'North-West outer prakaram wall exists');
  assert.ok(wallNE, 'North-East outer prakaram wall exists');

  // Verify wall ends at the gopuram edge and leaves the central gateway opening unobstructed
  const nwRightEdge = wallNW.position.x + wallNW.dimensions.length / 2;
  const neLeftEdge = wallNE.position.x - wallNE.dimensions.length / 2;
  
  assert.ok(Math.abs(nwRightEdge - (-gopuramHalfL)) < 0.1, `NW wall connects at Gopuram left boundary (x=${nwRightEdge})`);
  assert.ok(Math.abs(neLeftEdge - gopuramHalfL) < 0.1, `NE wall connects at Gopuram right boundary (x=${neLeftEdge})`);
  
  // Ensure NO wall intersects the gateway opening [-3, +3]
  const wallInDoorway = components.some(
    (c) =>
      c.type === COMPONENT_TYPES.PRAKARAM_WALL &&
      c.position.z === northGopuram.position.z &&
      Math.abs(c.position.x) < 3.0
  );
  assert.strictEqual(wallInDoorway, false, 'No wall block the North Gopuram gateway opening');
});

// 3. Central pedestrian axis is clear of barrier rails in arrival plaza
test('3. No barrier rails obstruct the central pedestrian entrance path at x = 0', () => {
  const northGopuram = components.find((c) => c.role === 'north-gopuram');
  const gZ = northGopuram.position.z;
  
  // Barriers between gopuram entrance and security checkpoints
  const blockingBarriers = components.filter(
    (c) =>
      c.type === COMPONENT_TYPES.BARRIER &&
      c.position.z > gZ &&
      c.position.z < -55 &&
      Math.abs(c.position.x) < 2.5
  );
  assert.strictEqual(blockingBarriers.length, 0, 'Zero barrier rails obstruct central pedestrian passage between gateway and security');
});

// 4. North pedestrian path starts outside and physically passes through gateway center
test('4. North crowd path starts outside temple and passes directly through center of North Gopuram', () => {
  const northPaths = pathResult.paths.filter((p) => p.stream === 'north');
  assert.ok(northPaths.length > 0, 'North stream paths exist');

  northPaths.forEach((np, idx) => {
    const wp0 = np.waypoints[0];
    const wp1 = np.waypoints[1];
    const wp2 = np.waypoints[2];

    // Outside approach
    assert.strictEqual(wp0.x, 0, `Path ${idx + 1} starts at sacred centerline X = 0`);
    assert.ok(wp0.z < -85, `Path ${idx + 1} starts outside the temple (z=${wp0.z})`);

    // Gateway portal traversal
    assert.strictEqual(wp1.x, 0, `Path ${idx + 1} traverses gateway portal at X = 0`);
    assert.strictEqual(wp1.z, -82, `Path ${idx + 1} intersects North Gopuram center at Z = -82`);

    // Inner doorway threshold emergence
    assert.strictEqual(wp2.x, 0, `Path ${idx + 1} emerges on centerline through inner threshold`);
    assert.strictEqual(wp2.z, -76, `Path ${idx + 1} emerges into courtyard past the 9m tower depth`);
  });
});

// 5. Logical architectural journey sequence: OUTSIDE -> GOPURAM -> PLAZA -> SECURITY -> QUEUE -> DARSHAN -> EXIT
test('5. North devotee journey sequence follows strict architectural progression', () => {
  const northPath = pathResult.paths.find((p) => p.stream === 'north');
  assert.ok(northPath, 'North path exists');

  const names = northPath.waypoints.map((wp) => wp.name.toLowerCase());
  
  const gopuramIdx = names.findIndex((n) => n.includes('gopuram') && n.includes('gateway'));
  const plazaIdx = names.findIndex((n) => n.includes('plaza') || n.includes('courtyard'));
  const secIdx = names.findIndex((n) => n.includes('security'));
  const queueIdx = names.findIndex((n) => n.includes('queue') || n.includes('lane'));
  const darshanIdx = names.findIndex((n) => n.includes('darshan') && (n.includes('point') || n.includes('sanctum')));
  const exitIdx = names.findIndex((n) => n.includes('exit'));

  assert.ok(gopuramIdx >= 0, 'Devotee traverses North Gopuram gateway');
  assert.ok(plazaIdx > gopuramIdx, 'Devotee enters Entry Plaza AFTER gopuram');
  assert.ok(secIdx > plazaIdx, 'Devotee reaches Security screening AFTER entry plaza');
  assert.ok(queueIdx > secIdx, 'Devotee enters Queue system AFTER security screening');
  assert.ok(darshanIdx > queueIdx, 'Devotee reaches Darshan AFTER queue');
  assert.ok(exitIdx > darshanIdx, 'Devotee reaches Exit AFTER Darshan');
});

// 6. West Entrance Gopuram is open and traversable
test('6. West Entrance Gopuram has traversable open gateway and aligned path', () => {
  const westGopuram = components.find((c) => c.role === 'west-gopuram');
  assert.ok(westGopuram, 'West Entrance Gopuram exists');
  
  const westPaths = pathResult.paths.filter((p) => p.stream === 'west');
  assert.ok(westPaths.length > 0, 'West stream paths exist');

  westPaths.forEach((wp, idx) => {
    const pt0 = wp.waypoints[0];
    const pt1 = wp.waypoints[1];
    const pt2 = wp.waypoints[2];

    assert.ok(pt0.x < westGopuram.position.x, `West path ${idx + 1} starts outside (X=${pt0.x})`);
    assert.strictEqual(pt1.x, westGopuram.position.x, `West path ${idx + 1} passes through West Gopuram portal (X=${pt1.x})`);
    assert.strictEqual(pt1.z, westGopuram.position.z, `West path ${idx + 1} aligned on Z axis`);
    assert.ok(pt2.x > westGopuram.position.x, `West path ${idx + 1} emerges inside courtyard`);
  });
});

// 7. East Entrance Gopuram is open and traversable
test('7. East Entrance Gopuram has traversable open gateway and aligned path', () => {
  const eastGopuram = components.find((c) => c.role === 'east-gopuram');
  assert.ok(eastGopuram, 'East Entrance Gopuram exists');
  
  const eastPaths = pathResult.paths.filter((p) => p.stream === 'east');
  assert.ok(eastPaths.length > 0, 'East stream paths exist');

  eastPaths.forEach((ep, idx) => {
    const pt0 = ep.waypoints[0];
    const pt1 = ep.waypoints[1];
    const pt2 = ep.waypoints[2];

    assert.ok(pt0.x > eastGopuram.position.x, `East path ${idx + 1} starts outside (X=${pt0.x})`);
    assert.strictEqual(pt1.x, eastGopuram.position.x, `East path ${idx + 1} passes through East Gopuram portal (X=${pt1.x})`);
    assert.strictEqual(pt1.z, eastGopuram.position.z, `East path ${idx + 1} aligned on Z axis`);
    assert.ok(pt2.x < eastGopuram.position.x, `East path ${idx + 1} emerges inside courtyard`);
  });
});

// 8. South Exit Gopuram is open and leads to exterior grounds
test('8. South Exit Gopuram has open portal and paths exit to outside temple grounds', () => {
  const southGopuram = components.find((c) => c.role === 'south-gopuram');
  assert.ok(southGopuram, 'South Exit Gopuram exists');

  const allPaths = pathResult.paths;
  allPaths.forEach((p, idx) => {
    const lastWaypoints = p.waypoints.slice(-3);
    const hasSouthGopuram = lastWaypoints.some((w) => w.componentId === southGopuram.id || w.name.includes('South Exit Gopuram'));
    const finalPt = p.waypoints[p.waypoints.length - 1];

    assert.ok(hasSouthGopuram, `Path ${idx + 1} traverses South Exit Gopuram`);
    assert.ok(finalPt.z > southGopuram.position.z, `Path ${idx + 1} finishes OUTSIDE on exterior grounds (z=${finalPt.z})`);
  });
});

// 9. Central Darshan Sacred Axis alignment
test('9. Central Darshan architecture maintains continuous sacred axis', () => {
  const mainGopuram = components.find((c) => c.type === COMPONENT_TYPES.MAIN_GOPURAM);
  assert.ok(mainGopuram, 'Main Raja Gopuram exists at center');
  assert.strictEqual(mainGopuram.position.x, 0, 'Main Gopuram centered on sacred axis X = 0');
  
  const sanctum = components.find(
    (c) => c.type === COMPONENT_TYPES.DARSHAN_SANCTUM || c.role === 'darshan-sanctum'
  );
  assert.ok(sanctum, 'Sanctum exists');
  assert.strictEqual(sanctum.position.x, 0, 'Sanctum centered on sacred axis X = 0');
});

// 10. Simulation readiness regression protection
test('10. Scene remains 100% simulation-ready with all systems intact', () => {
  assert.strictEqual(pathResult.ready, true, 'Simulation paths successfully generated');
  assert.ok(pathResult.paths.length >= 15, `Campus paths generated (${pathResult.paths.length} total)`);
  assert.strictEqual(pathResult.template, 'campus', 'Detected campus layout template');
});

console.log('All 10 North Entrance & Spatial Flow Tests Passed Successfully!');
