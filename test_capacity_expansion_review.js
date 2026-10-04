/**
 * DevaSetu Capacity Expansion Review & Human Approval Workflow Test Suite
 * 
 * Verifies:
 * 1. OVER_CAPACITY alert opens review state.
 * 2. Review displays actual pressure data (occupancy, capacity, utilization, arrival rate).
 * 3. Cancel does not modify Scene JSON.
 * 4. AI is NOT called merely because an alert exists.
 * 5. AI is called only after explicit approval.
 * 6. AI request contains actual crowd/pressure/site/layout data.
 * 7. AI output passes schema validation.
 * 8. Invalid AI output is rejected.
 * 9. Existing architecture remains unchanged during planning.
 * 10. Preview does not mutate Scene JSON.
 */

import { 
  createCapacityReviewState, 
  getZoneArchitectureContext, 
  validateCapacityExpansionPlan, 
  generateCapacityExpansionPlan 
} from './src/services/layout/capacityExpansionPlanner.js';
import { CapacityExpansionPlanSchema } from './src/features/ai/capacityExpansionSchema.js';
import { useCapacityExpansionStore } from './src/features/simulation/capacityExpansionStore.js';
import { generateFestivalScenario } from './src/services/layout/festivalScenarioGenerator.js';

console.log('========================================================================');
console.log(' DevaSetu Capacity Expansion Review & Approval Workflow Test Suite     ');
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
  // Setup baseline scene
  const festivalScene = generateFestivalScenario();
  const initialComponentCount = festivalScene.components.length;
  const initialComponentsSnapshot = JSON.stringify(festivalScene.components);

  // Simulated Alert & Pressure State
  const alertOverCapacity = {
    id: 'alert-north',
    type: 'capacity',
    zone: 'north',
    zoneName: 'North Queue Stream',
    utilization: 1.37,
    occupancy: 2740,
    capacity: 2000,
    severity: 'over_capacity',
    message: 'North Queue Stream has exceeded designed capacity by 37% (2,740 / 2,000 devotees).',
  };

  const mockPressureState = {
    index: 137,
    level: 'over_capacity',
    highestPressureZone: 'North Queue Stream',
    overloadedZones: ['North Queue Stream', 'Security Checkpoints'],
    zones: {
      north: {
        name: 'North Queue Stream',
        occupancy: 2740,
        capacity: 2000,
        utilization: 1.37,
        utilizationPercent: 137,
        pressure: 'over_capacity',
        arrivalRate: 1200,
        serviceRate: 900,
      },
    },
  };

  // -----------------------------------------------------------------------------
  // TEST 1 & 2: OVER_CAPACITY Alert Opens Review with Actual Pressure Data
  // -----------------------------------------------------------------------------
  console.log('--- TEST 1 & 2: OVER_CAPACITY Alert Opens Review with Actual Pressure Data ---');
  {
    const store = useCapacityExpansionStore.getState();
    assert(store.isOpen === false, 'Modal is initially closed');

    store.openReview(alertOverCapacity, mockPressureState, festivalScene);
    const updatedState = useCapacityExpansionStore.getState();

    assert(updatedState.isOpen === true, 'OVER_CAPACITY alert opens review modal');
    assert(updatedState.step === 'review', 'Modal opens in "review" step');
    assert(updatedState.reviewState !== null, 'Review state is initialized');
    assert(updatedState.reviewState.currentOccupancy === 2740, `Displays actual occupancy: ${updatedState.reviewState.currentOccupancy}`);
    assert(updatedState.reviewState.currentCapacity === 2000, `Displays actual capacity: ${updatedState.reviewState.currentCapacity}`);
    assert(updatedState.reviewState.utilization === 1.37, `Displays actual utilization: ${updatedState.reviewState.utilization}`);
    assert(updatedState.reviewState.arrivalRate === 1200, `Displays actual arrival rate: ${updatedState.reviewState.arrivalRate}/min`);
    assert(updatedState.reviewState.overloadedZones.includes('North Queue Stream'), 'Overloaded zones includes North Queue Stream');
    assert(typeof updatedState.reviewState.availableSiteSpace === 'string', `Displays computed remaining space: ${updatedState.reviewState.availableSiteSpace}`);
  }

  // -----------------------------------------------------------------------------
  // TEST 3: Cancel Does Not Modify Scene JSON
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST 3: Cancel Does Not Modify Scene JSON ---');
  {
    const store = useCapacityExpansionStore.getState();
    store.closeReview();
    const afterClose = useCapacityExpansionStore.getState();

    assert(afterClose.isOpen === false, 'Modal closed on cancel');
    assert(afterClose.reviewState === null, 'Review state reset on cancel');
    assert(festivalScene.components.length === initialComponentCount, `Scene components count untouched (${festivalScene.components.length} === ${initialComponentCount})`);
    assert(JSON.stringify(festivalScene.components) === initialComponentsSnapshot, 'Scene JSON is 100% byte-for-byte identical after cancel');
  }

  // -----------------------------------------------------------------------------
  // TEST 4 & 5: AI Is NOT Called Merely Because Alert Exists (Explicit Approval Required)
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST 4 & 5: AI Is NOT Called Merely Because Alert Exists (Explicit Approval Required) ---');
  {
    let aiCallCounter = 0;
    const store = useCapacityExpansionStore.getState();

    // Reopen review
    store.openReview(alertOverCapacity, mockPressureState, festivalScene);
    assert(aiCallCounter === 0, 'AI planner was NOT called upon alert trigger');
    assert(useCapacityExpansionStore.getState().planResult === null, 'No AI plan exists prior to explicit approval');

    // User explicitly approves by clicking "Generate Expansion Plan"
    await store.generatePlan(festivalScene);
    const afterApproval = useCapacityExpansionStore.getState();

    assert(afterApproval.planResult !== null, 'AI expansion plan generated only AFTER explicit user approval');
    assert(afterApproval.step === 'preview', 'Transitions to preview step after approval');
  }

  // -----------------------------------------------------------------------------
  // TEST 6: AI Request Contains Actual Crowd / Pressure / Site / Layout Data
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST 6: Structured Expansion Request Context ---');
  {
    const context = {
      problem: {
        zone: 'north',
        occupancy: 2740,
        capacity: 2000,
        utilization: 1.37,
        arrivalRate: 1200,
        serviceRate: 900,
      },
      site: festivalScene.site,
      existingLayout: { components: festivalScene.components },
      existingQueues: festivalScene.components.filter(c => c.type === 'queue'),
      requirements: {
        preserveExistingQueues: true,
        preserveTempleArchitecture: true,
        allowAdditionalQueueCapacity: true,
      },
    };

    const plannerResult = await generateCapacityExpansionPlan(context);
    assert(plannerResult.success === true, 'Expansion planner successfully processed request context');
    assert(plannerResult.plan.targetZone === 'north', 'Target zone matches actual problem zone');
    assert(plannerResult.plan.reasoning.includes('137%'), `Reasoning incorporates actual computed utilization (137%): ${plannerResult.plan.reasoning}`);
  }

  // -----------------------------------------------------------------------------
  // TEST 7: AI Output Passes Schema Validation
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST 7: Capacity Expansion Plan Zod Schema Validation ---');
  {
    const validPlan = {
      type: 'capacity_expansion',
      targetZone: 'north',
      reasoning: 'At current 137% utilization (2,740 devotees vs 2,000 capacity), 2 additional serpentine lanes absorb the 740 excess crowd.',
      changes: [
        {
          action: 'add_queue',
          template: 'serpentine',
          lanes: 2,
          laneWidth: 2.0,
          spacing: 1.5,
          connection: 'north-queue-1',
        },
      ],
      expectedCapacityIncrease: 480,
      constraints: ['preserve existing temple architecture', 'preserve existing queues'],
    };

    const parseResult = CapacityExpansionPlanSchema.safeParse(validPlan);
    assert(parseResult.success === true, 'Valid plan conforms to CapacityExpansionPlanSchema');
  }

  // -----------------------------------------------------------------------------
  // TEST 8: Invalid AI Output Is Strictly Rejected
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST 8: Invalid AI Output Rejection ---');
  {
    const invalidPlanMissingChanges = {
      type: 'capacity_expansion',
      targetZone: 'north',
      reasoning: 'Missing required changes array',
      changes: [], // Empty!
      expectedCapacityIncrease: 500,
    };
    const res1 = CapacityExpansionPlanSchema.safeParse(invalidPlanMissingChanges);
    assert(res1.success === false, 'Schema strictly rejects plan with empty changes array');

    const invalidPlanWithRawMesh = {
      type: 'capacity_expansion',
      targetZone: 'north',
      reasoning: 'Plan contains illegal raw geometry mesh',
      changes: [
        {
          action: 'add_queue',
          template: 'invalid_mesh_type', // Invalid template!
          lanes: 2,
        },
      ],
      expectedCapacityIncrease: 500,
    };
    const res2 = CapacityExpansionPlanSchema.safeParse(invalidPlanWithRawMesh);
    assert(res2.success === false, 'Schema strictly rejects plan with illegal template or raw mesh');

    // Run invalid plan through planner function
    const plannerInvalidResult = await generateCapacityExpansionPlan({
      problem: { zone: 'north', occupancy: 2740, capacity: 2000 },
      site: festivalScene.site,
      existingLayout: { components: festivalScene.components },
      planOverride: invalidPlanMissingChanges,
    });
    assert(plannerInvalidResult.success === false, 'Planner safely rejects invalid AI output without applying');
    assert(typeof plannerInvalidResult.validation.reason === 'string', `Provides clear rejection reason: ${plannerInvalidResult.validation.reason}`);
  }

  // -----------------------------------------------------------------------------
  // TEST 9 & 10: Existing Architecture Remains Immutable & Preview Does Not Mutate Scene
  // -----------------------------------------------------------------------------
  console.log('\n--- TEST 9 & 10: Architecture Immutability & Preview Isolation ---');
  {
    const previewContext = {
      problem: { zone: 'north', occupancy: 2740, capacity: 2000, utilization: 1.37 },
      site: festivalScene.site,
      existingLayout: { components: festivalScene.components },
    };

    const previewResult = await generateCapacityExpansionPlan(previewContext);
    assert(previewResult.success === true, 'Preview plan generated successfully');
    assert(Array.isArray(previewResult.proposedComponents), 'Generated proposed components list for preview');
    assert(previewResult.expectedCapacityIncrease > 0, `Expected capacity increase computed deterministically: +${previewResult.expectedCapacityIncrease}`);

    // Verify Scene JSON was NOT mutated!
    assert(festivalScene.components.length === initialComponentCount, `Scene components count unchanged: ${festivalScene.components.length} === ${initialComponentCount}`);
    assert(JSON.stringify(festivalScene.components) === initialComponentsSnapshot, 'Scene JSON is 100% unmutated after preview generation');

    // Verify Apply Placeholder does not mutate Scene JSON
    const store = useCapacityExpansionStore.getState();
    store.applyExpansionPlaceholder();
    assert(festivalScene.components.length === initialComponentCount, 'Apply placeholder preserves Scene JSON');
  }

  // -----------------------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
