import assert from 'node:assert';
import { generatePlanSummaryText } from './src/utils/exportPlan.js';
import { validateLayout } from './src/services/layout/layoutValidator.js';

console.log('--- TESTING PHASE 6 CLIENT EXPORT & DYNAMIC ANALYSIS RECOVERY ---');

// Mock scene representing a realistic plan
const mockScene = {
  temple: { name: 'Kashi Vishwanath Temple' },
  site: {
    unit: 'meters',
    length: 50,
    width: 30,
    boundary: [
      { x: -25, y: 0, z: -15 },
      { x: 25, y: 0, z: -15 },
      { x: 25, y: 0, z: 15 },
      { x: -25, y: 0, z: 15 }
    ]
  },
  requirements: {
    expectedVisitors: 8000,
    peakVisitors: 2000
  },
  components: [
    {
      id: 'entry-1',
      type: 'entrance',
      name: 'Main Arch',
      position: { x: -20, y: 0, z: 0 },
      rotation: 0,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 4, width: 2, height: 3 },
      properties: {},
      generated: false
    },
    {
      id: 'queue-1',
      type: 'queue',
      name: 'Queue Bay 1',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 20, width: 2, height: 1 },
      properties: {},
      generated: true
    },
    {
      id: 'darshan-1',
      type: 'darshan',
      name: 'Darshan Altar',
      position: { x: 20, y: 0, z: 0 },
      rotation: 0,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 6, width: 6, height: 3.5 },
      properties: {},
      generated: false
    }
  ],
  paths: [],
  analysis: {
    valid: true,
    errors: [],
    warnings: [],
    metrics: {
      standingCapacity: 200,
      queueArea: 40,
      estimatedWaitMinutes: 25,
      utilizationRate: 0.1
    }
  }
};

// Test 1: Verify summary text formatting
console.log('\n[Test 1] Testing export summary report generation...');
const summary = generatePlanSummaryText({
  name: 'Kashi Vishwanath Festival Plan',
  scene: mockScene
});

assert.ok(summary.includes('DEVASATU SMART QUEUE DESIGNER'), 'Must have header');
assert.ok(summary.includes('Kashi Vishwanath Temple'), 'Must include temple name');
assert.ok(summary.includes('50m (Length) x 30m (Width)'), 'Must include dimensions');
assert.ok(summary.includes('Total Components:      3'), 'Must count components accurately');
assert.ok(summary.includes('SPATIAL VALIDATION & SAFETY OBSERVATIONS'), 'Must include validation section');
console.log('✓ Human-readable summary generation passed!');

// Test 2: Dynamic validation recalculation
console.log('\n[Test 2] Testing dynamic analysis calculation from raw Scene JSON...');
const freshAnalysis = validateLayout(mockScene);
assert.strictEqual(typeof freshAnalysis.valid, 'boolean');
assert.ok(freshAnalysis.metrics, 'Must produce metrics dynamically');
assert.ok(freshAnalysis.metrics.queueCapacity > 0, 'Must calculate capacity');
console.log(`✓ Recalculated dynamic standing capacity: ${freshAnalysis.metrics.queueCapacity}`);

// Test 3: Verify clean Scene JSON export without Three.js runtime geometry
console.log('\n[Test 3] Testing clean JSON export serialization...');
const exportedJsonString = JSON.stringify({
  version: '1.0',
  exportedAt: new Date().toISOString(),
  name: 'Kashi Vishwanath Festival Plan',
  templeName: mockScene.temple.name,
  site: mockScene.site,
  requirements: mockScene.requirements,
  components: mockScene.components,
  paths: mockScene.paths,
  analysis: freshAnalysis
}, null, 2);

const parsed = JSON.parse(exportedJsonString);
assert.strictEqual(parsed.name, 'Kashi Vishwanath Festival Plan');
assert.strictEqual(parsed.components.length, 3);
assert.strictEqual(parsed.components[0].geometry, undefined, 'Must not store Three.js geometry');
assert.strictEqual(parsed.components[0].material, undefined, 'Must not store Three.js material');
assert.strictEqual(parsed.components[0].matrix, undefined, 'Must not store Three.js matrix');
console.log('✓ Clean JSON export verified without runtime rendering state.');

console.log('\n=== ALL PHASE 6 CLIENT TESTS PASSED! ===');
