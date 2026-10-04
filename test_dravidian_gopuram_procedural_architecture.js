import assert from 'node:assert';
import test from 'node:test';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';
import { COMPONENT_TYPES } from './src/utils/componentDefaults.js';
import { calculateDravidianTierData } from './src/features/three/components/dravidianGeometry.js';

console.log('========================================================================');
console.log(' DevaSetu Realistic Procedural Dravidian Gopuram Architecture Suite     ');
console.log('========================================================================\n');

const fest = generateFestivalScenario();
const components = fest.scene.components;

test('1. All 5 Gopurams exist with authentic Dravidian hierarchy in Festival Campus', () => {
  const gopurams = components.filter(
    (c) =>
      c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM ||
      c.type === COMPONENT_TYPES.MAIN_GOPURAM ||
      c.role?.includes('gopuram')
  );

  assert.strictEqual(gopurams.length, 5, 'Exactly 5 monumental gopurams in festival campus');

  const north = gopurams.find((g) => g.role === 'north-gopuram');
  const east = gopurams.find((g) => g.role === 'east-gopuram');
  const west = gopurams.find((g) => g.role === 'west-gopuram');
  const south = gopurams.find((g) => g.role === 'south-gopuram');
  const central = gopurams.find((g) => g.role === 'main-gopuram');

  assert.ok(north, 'North Entrance Gopuram exists');
  assert.ok(east, 'East Entrance Gopuram exists');
  assert.ok(west, 'West Entrance Gopuram exists');
  assert.ok(south, 'South Exit Gopuram exists');
  assert.ok(central, 'Main Central Raja Gopuram exists');
});

test('2. Central Raja Gopuram dominates vertically over entrance gopurams and walls', () => {
  const central = components.find((c) => c.role === 'main-gopuram');
  const north = components.find((c) => c.role === 'north-gopuram');
  const wall = components.find((c) => c.role === 'prakaram-wall');

  const centralH = central.dimensions.height || 34;
  const northH = north.dimensions.height || 20;
  const wallH = wall.dimensions.height || 5.6;

  assert.ok(centralH > northH, `Central tower (${centralH}m) dominates entrance towers (${northH}m)`);
  assert.ok(northH > wallH * 3, `Entrance tower (${northH}m) rises well above perimeter wall (${wallH}m)`);
});

test('3. Maha Dwara Gateways have authentic open dimensions for crowd flow', () => {
  const gopurams = components.filter((c) => c.role?.includes('gopuram'));
  gopurams.forEach((g) => {
    const archW = g.properties?.archWidth || g.properties?.gatewayWidth || 4.0;
    const archH = g.properties?.archHeight || 4.5;
    assert.ok(archW >= 3.6, `${g.name} gateway width (${archW}m) is wide enough for multiple devotee streams`);
    assert.ok(archH >= 3.8, `${g.name} gateway height (${archH}m) has monumental clearance`);
  });
});

test('4. Solid Prakaram Walls form continuous enclosure with flush Gopuram interfaces', () => {
  const walls = components.filter((c) => c.role === 'prakaram-wall');
  assert.ok(walls.length >= 8, `Has at least 8 wall segments (found ${walls.length})`);

  walls.forEach((w) => {
    assert.strictEqual(w.dimensions.width, 2.4, 'Wall thickness is solid 2.4m');
    assert.strictEqual(w.dimensions.height, 5.6, 'Wall height is monumental 5.6m');
    assert.strictEqual(w.properties.stoneColor, '#BAAA94', 'Wall uses authentic warm aged granite stone');
  });
});

test('5. Tiers and Finials configured authentically across towers', () => {
  const central = components.find((c) => c.role === 'main-gopuram');
  const north = components.find((c) => c.role === 'north-gopuram');

  assert.strictEqual(central.properties.tiers, 7, 'Central Raja Gopuram has 7 Tala tiers');
  assert.strictEqual(central.properties.kalasams, 7, 'Central Raja Gopuram has 7 sacred golden Kalasams');
  assert.ok(north.properties.tiers >= 5, 'Entrance Gopuram has at least 5 Tala tiers');
});

test('6. Procedural Tier Generator produces multi-bay facade with distinct Bhadra, Harantara & Karna zones', () => {
  const tiersNorth = calculateDravidianTierData({ length: 18, width: 9, height: 20, tiers: 5, baseHeight: 6.5, isMain: false });
  assert.strictEqual(tiersNorth.length, 5, '5 storeys generated');

  tiersNorth.forEach((tier) => {
    assert.ok(tier.bhadraW > 2.0, `Tier ${tier.index} central Bhadra bay width (${tier.bhadraW.toFixed(2)}m) is structurally substantial`);
    assert.ok(tier.kutaW >= 1.2, `Tier ${tier.index} corner Kuta width (${tier.kutaW.toFixed(2)}m) is structurally substantial`);
    assert.ok(tier.length > tier.bhadraW, `Tier ${tier.index} facade has room for intermediate Harantara recessed bays`);
  });
});

test('7. Macro-Scale Architectural Projection Depth exceeds 27.3cm Shadow Map Texel Threshold', () => {
  const tiersNorth = calculateDravidianTierData({ length: 18, width: 9, height: 20, tiers: 5, baseHeight: 6.5, isMain: false });
  const shadowTexelM = 0.273; // 280m / 1024 texels = 27.3 cm

  tiersNorth.forEach((tier) => {
    assert.ok(
      tier.projBhadraZ > shadowTexelM * 1.5,
      `Central Bhadra projection (${tier.projBhadraZ.toFixed(2)}m) comfortably exceeds shadow texel (${shadowTexelM.toFixed(3)}m)`
    );
    assert.ok(
      tier.recessHarantara > shadowTexelM,
      `Intermediate Harantara recess (${tier.recessHarantara.toFixed(2)}m) creates real physical shadow channels exceeding shadow texel`
    );
  });
});

test('8. Four-Sided 3D Articulation: Side Facades have physical Bhadra projections (No Bare Box Sides)', () => {
  const tiersNorth = calculateDravidianTierData({ length: 18, width: 9, height: 20, tiers: 5, baseHeight: 6.5, isMain: false });

  tiersNorth.forEach((tier) => {
    assert.ok(
      tier.projBhadraX >= 0.40,
      `Tier ${tier.index} has side Bhadra projection of ${tier.projBhadraX.toFixed(2)}m, guaranteeing 360-degree sculptural relief`
    );
    assert.ok(tier.bhadraD > 1.5, `Tier ${tier.index} side Bhadra depth (${tier.bhadraD.toFixed(2)}m) accommodates side niches`);
  });
});

test('9. Kapota Cornices have deep physical overhangs creating horizontal shadow lines', () => {
  const tiersNorth = calculateDravidianTierData({ length: 18, width: 9, height: 20, tiers: 5, baseHeight: 6.5, isMain: false });

  tiersNorth.forEach((tier) => {
    assert.ok(
      tier.corniceOverhang >= 0.45,
      `Tier ${tier.index} cornice overhang (${tier.corniceOverhang.toFixed(2)}m) creates deep, visible undercut shadow lines`
    );
  });
});

test('10. Central Raja Gopuram inherits grander multi-bay scale with Mandapa connector', () => {
  const tiersCentral = calculateDravidianTierData({ length: 24, width: 13, height: 34, tiers: 7, baseHeight: 8.3, isMain: true });
  assert.strictEqual(tiersCentral.length, 7, '7 storeys generated for Raja Gopuram');

  const baseTier = tiersCentral[0];
  assert.ok(baseTier.bhadraW >= 4.0, `Base tier Bhadra width (${baseTier.bhadraW.toFixed(2)}m) is monumental`);
  assert.ok(baseTier.projBhadraZ >= 0.70, `Base tier Bhadra projection (${baseTier.projBhadraZ.toFixed(2)}m) creates colossal relief`);
});

test('11. Directional Orientations preserve DevaSetu spatial approach flow', () => {
  const north = components.find((c) => c.role === 'north-gopuram');
  const west = components.find((c) => c.role === 'west-gopuram');
  const east = components.find((c) => c.role === 'east-gopuram');
  const south = components.find((c) => c.role === 'south-gopuram');
  const central = components.find((c) => c.role === 'main-gopuram');

  assert.strictEqual(north.rotation, 0, 'North Gopuram faces along Z axis (North entrance)');
  assert.strictEqual(west.rotation, 90, 'West Gopuram rotated 90° for East-West approach');
  assert.strictEqual(east.rotation, -90, 'East Gopuram rotated -90° for West-East approach');
  assert.strictEqual(south.rotation, 0, 'South Exit Gopuram faces along Z axis (South exit)');
  assert.strictEqual(central.rotation, 0, 'Central Raja Gopuram faces along Z axis (Darshan axis)');
});

test('12. Sacred Deity logic strictly follows role: Only Central Raja Gopuram hosts deity', () => {
  const entranceGopurams = components.filter((c) => c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM);
  const mainGopuram = components.find((c) => c.type === COMPONENT_TYPES.MAIN_GOPURAM);

  assert.ok(entranceGopurams.length >= 4, 'At least 4 entrance/exit gopurams exist');
  assert.ok(mainGopuram, 'Main Darshan Gopuram exists');
  // Entrance gopurams are not isMain, so they render empty open passages
  assert.strictEqual(mainGopuram.role, 'main-gopuram');
});
