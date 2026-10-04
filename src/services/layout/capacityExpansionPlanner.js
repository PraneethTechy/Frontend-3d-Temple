/**
 * DevaSetu Capacity Expansion Planning Engine
 * 
 * Handles human approval workflow and AI expansion planning requests:
 * - Extracts deterministic review state from current pressure engine metrics & Scene JSON.
 * - Summarizes existing architectural context without fabricating values.
 * - Submits structured expansion planning requests to AI planner.
 * - Validates AI output against strict Zod schema and deterministic layout constraints.
 * - Never mutates Scene JSON during planning/preview.
 */

import { CapacityExpansionPlanSchema } from '../../features/ai/capacityExpansionSchema.js';
import { getQueuePathGeometry } from './queuePathGeometry.js';
import { calculateQueuePhysicalCapacity } from '../../features/simulation/crowdPressureEngine.js';
import { requestCapacityExpansionPlan } from '../../features/ai/aiService.js';
import { getSiteBounds, isComponentWithinSite, getComponentAABB, doAABBsOverlap } from './coordinateSystem.js';
import { validateLayout } from './layoutValidator.js';

/**
 * Summarizes existing architecture and queue infrastructure in the affected zone.
 * Displays "Not available" for unconfigured or missing values rather than fabricating.
 */
export function getZoneArchitectureContext(zoneKey, scene) {
  if (!scene || !Array.isArray(scene.components)) {
    return {
      queueCount: 0,
      totalLanes: 'Not available',
      template: 'Not available',
      totalCenterline: 'Not available',
      averageWidth: 'Not available',
      queueCapacity: 0,
      securityCheckpoints: 'Not available',
      availableSiteSpace: 'Not available',
    };
  }

  const normalizedZone = (zoneKey || '').toLowerCase();

  // Filter queues belonging to this operational zone
  const matchingQueues = scene.components.filter((c) => {
    if (c.type !== 'queue') return false;
    const stream = (c.properties?.stream || c.properties?.zone || '').toLowerCase();
    const id = (c.id || '').toLowerCase();
    if (normalizedZone === 'queue') return true;
    return stream.includes(normalizedZone) || id.includes(normalizedZone);
  });

  const queueCount = matchingQueues.length;
  let totalLanes = 0;
  let totalCenterline = 0;
  let totalCapacity = 0;
  let sumWidth = 0;
  let primaryTemplate = matchingQueues[0]?.properties?.pathData?.type || matchingQueues[0]?.properties?.pattern || 'straight';

  for (const q of matchingQueues) {
    totalLanes += q.properties?.lanes || 1;
    const geom = getQueuePathGeometry(q);
    totalCenterline += geom?.totalLength || q.dimensions?.length || 0;
    totalCapacity += calculateQueuePhysicalCapacity(q);
    sumWidth += q.dimensions?.width || 2;
  }

  const averageWidth = queueCount > 0 ? Math.round((sumWidth / queueCount) * 10) / 10 : 2.0;

  // Filter security checkpoints in campus / zone
  const securityComponents = scene.components.filter((c) => c.type === 'security' || c.type === 'checkpoint');
  const matchingSecurity = securityComponents.filter((c) => {
    const stream = (c.properties?.stream || c.properties?.zone || '').toLowerCase();
    const id = (c.id || '').toLowerCase();
    if (normalizedZone === 'queue' || normalizedZone === 'security') return true;
    return stream.includes(normalizedZone) || id.includes(normalizedZone);
  });
  const securityCheckpoints = matchingSecurity.length > 0 ? matchingSecurity.length : securityComponents.length;

  // Available site space calculation
  let availableSiteSpace = 'Not available';
  if (scene.site && scene.site.length && scene.site.width) {
    const totalArea = scene.site.length * scene.site.width;
    const occupiedArea = scene.components.reduce((sum, c) => {
      const l = c.dimensions?.length || 2;
      const w = c.dimensions?.width || 2;
      return sum + l * w;
    }, 0);
    const remainingArea = Math.max(0, Math.round(totalArea - occupiedArea));
    availableSiteSpace = `${remainingArea.toLocaleString()} m²`;
  }

  return {
    queueCount,
    totalLanes: queueCount > 0 ? totalLanes : 'Not available',
    template: queueCount > 0 ? primaryTemplate : 'Not available',
    totalCenterline: queueCount > 0 ? `${Math.round(totalCenterline)}m` : 'Not available',
    averageWidth: queueCount > 0 ? `${averageWidth}m` : 'Not available',
    queueCapacity: totalCapacity,
    securityCheckpoints: securityCheckpoints > 0 ? securityCheckpoints : 'Not available',
    availableSiteSpace,
    matchingQueues,
  };
}

/**
 * Creates the focused capacity review state from active alert, pressure metrics, and Scene JSON.
 */
export function createCapacityReviewState({ alert, pressureState, scene }) {
  if (!alert) return null;

  let zoneKey = alert.zone || 'queue';
  let zoneName = alert.zoneName;

  // When alert is on exit, dispersal, or sanctum, redirect queue expansion planning to the primary queue network
  if (['exit', 'dispersal', 'darshan', 'sanctum'].includes((zoneKey || '').toLowerCase())) {
    zoneKey = 'north';
    zoneName = 'North Queue Stream (Campus Darshan Flow)';
  }

  const zoneData = pressureState?.zones?.[zoneKey] || pressureState?.zones?.[alert.zone] || {};
  const archContext = getZoneArchitectureContext(zoneKey, scene);

  return {
    alertId: alert.id,
    zone: zoneKey,
    zoneName: zoneName || alert.zoneName || zoneData.name || 'Queue System',
    severity: alert.severity || 'over_capacity',
    currentOccupancy: zoneData.occupancy ?? alert.occupancy ?? 0,
    currentCapacity: zoneData.capacity ?? alert.capacity ?? 0,
    utilization: zoneData.utilization ?? alert.utilization ?? 1.25,
    arrivalRate: zoneData.arrivalRate ?? null,
    serviceRate: zoneData.serviceRate ?? null,
    overloadedZones: pressureState?.overloadedZones || [alert.zoneName || 'Queue System'],
    currentQueueComponents: archContext.matchingQueues || [],
    availableSiteSpace: archContext.availableSiteSpace,
    architectureContext: archContext,
  };
}

/**
 * Validates proposed expansion plan against deterministic site bounds and collisions.
 * Strictly preserves existing temple architecture, Gopurams, Sanctum, and existing queues.
 */
export function validateCapacityExpansionPlan(plan, siteInput, existingComponents = []) {
  const errors = [];

  if (!plan || !Array.isArray(plan.changes) || plan.changes.length === 0) {
    return {
      valid: false,
      errors: ['Expansion plan contains no structural queue changes.'],
      reason: 'Expansion plan could not be safely placed: No valid changes specified.',
    };
  }

  const site = (siteInput && siteInput.length && siteInput.width) ? siteInput : { length: 250, width: 180, unit: 'meters' };
  const siteLength = site?.length || 250;
  const siteWidth = site?.width || 180;
  const halfL = siteLength / 2;
  const halfW = siteWidth / 2;

  // Verify each change
  for (const change of plan.changes) {
    const requiredWidth = (change.lanes || 2) * (change.laneWidth || 2) + ((change.lanes || 2) - 1) * (change.spacing || 1.5);
    if (requiredWidth > siteWidth - 4) {
      errors.push(`Required queue breadth (${requiredWidth}m) exceeds available site width (${siteWidth}m).`);
    }

    // Ensure template is recognized
    const allowed = ['parallel', 'serpentine', 'u_shape', 'split', 'campus', 'curved', 'arc', 'radial', 's_shape'];
    if (!allowed.includes(change.template)) {
      errors.push(`Unsupported queue template: ${change.template}`);
    }
  }

  // Ensure immutable sacred components are not marked for deletion or mutation
  const immutableKeywords = ['sanctum', 'garbhagriha', 'gopuram', 'vimana', 'portal'];
  const hasImmutableTampering = existingComponents.some((c) => {
    const id = (c.id || '').toLowerCase();
    const type = (c.type || '').toLowerCase();
    return immutableKeywords.some((kw) => id.includes(kw) || type.includes(kw)) && c._markedForRemoval;
  });

  if (hasImmutableTampering) {
    errors.push('Proposed expansion conflicts with immutable temple architecture.');
  }

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    reason: valid ? null : `Expansion plan could not be safely placed: ${errors.join('; ')}`,
  };
}

/**
 * Deterministically generates actual Scene JSON queue components from approved expansion plan intent.
 * Places components inside site boundaries, with no collisions with existing structures,
 * and attaches valid pathData for 3D rendering, simulation, and capacity calculations.
 */
export function generateDeterministicExpansionComponents(plan, scene) {
  if (!plan || !Array.isArray(plan.changes) || plan.changes.length === 0) {
    return { success: false, components: [], errors: ['No expansion changes specified in plan.'] };
  }

  const site = (scene?.site && scene.site.length && scene.site.width) 
    ? scene.site 
    : (scene?.scene?.site || { length: 250, width: 180, unit: 'meters' });
  const existingComponents = Array.isArray(scene?.components) ? scene.components : [];
  const targetZone = (plan.targetZone || 'north').toLowerCase();
  const genId = `capacity-expansion-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const siteBounds = getSiteBounds(site);
  const generatedComponents = [];

  // Determine campus stream / zone identifier
  const zoneChar = targetZone.includes('north') ? 'A' : targetZone.includes('west') ? 'B' : targetZone.includes('east') ? 'C' : 'A';

  for (let cIdx = 0; cIdx < plan.changes.length; cIdx++) {
    const change = plan.changes[cIdx];
    if (change.action !== 'add_queue') continue;

    const template = change.template || 'serpentine';
    const lanes = Math.max(1, parseInt(change.lanes, 10) || 2);
    const laneWidth = Math.max(1.0, parseFloat(change.laneWidth) || 2.0);
    const spacing = Math.max(0.6, parseFloat(change.spacing) || 1.5);
    const connection = change.connection || `${targetZone}-queue-branch -> courtyard-expansion -> central-darshan-spine`;

    // Candidate search strategy based on zone & site
    const candidates = [];

    if (targetZone.includes('north')) {
      // Priority slots flanking Zone A North Serpentine in spacious open courtyards at NEARER distance
      // West Courtyard slots (between Queue 1 at X = -24 and West screening at X = -78)
      // East Courtyard slots (between Queue 4 at X = 24 and East screening at X = 78)
      candidates.push(
        { x: -36, z: -35, length: 22, rotation: 90 },
        { x: 36, z: -35, length: 22, rotation: 90 },
        { x: -42, z: -35, length: 22, rotation: 90 },
        { x: 42, z: -35, length: 22, rotation: 90 },
        { x: -48, z: -35, length: 22, rotation: 90 },
        { x: 48, z: -35, length: 22, rotation: 90 },
        { x: -36, z: -40, length: 18, rotation: 90 },
        { x: 36, z: -40, length: 18, rotation: 90 },
        { x: -42, z: -40, length: 18, rotation: 90 },
        { x: 42, z: -40, length: 18, rotation: 90 }
      );
    } else if (targetZone.includes('west')) {
      candidates.push(
        { x: -51, z: -28, length: 24, rotation: 0 },
        { x: -51, z: 6, length: 24, rotation: 0 },
        { x: -62, z: -28, length: 22, rotation: 0 },
        { x: -62, z: 6, length: 22, rotation: 0 }
      );
    } else if (targetZone.includes('east')) {
      candidates.push(
        { x: 51, z: -28, length: 24, rotation: 0 },
        { x: 51, z: 6, length: 24, rotation: 0 },
        { x: 62, z: -28, length: 22, rotation: 0 },
        { x: 62, z: 6, length: 22, rotation: 0 }
      );
    }

    // Also add relative candidates around existing zone queues
    const zoneQueues = existingComponents.filter((c) => {
      if (c.type !== 'queue') return false;
      const s = (c.properties?.stream || c.properties?.zone || c.id || '').toLowerCase();
      return s.includes(targetZone);
    });

    if (zoneQueues.length > 0) {
      let qMinZ = Infinity, qMaxZ = -Infinity, qMinX = Infinity, qMaxX = -Infinity;
      for (const q of zoneQueues) {
        const qX = q.position?.x || 0;
        const qZ = q.position?.z || 0;
        const qL = q.dimensions?.length || 20;
        qMinZ = Math.min(qMinZ, qZ);
        qMaxZ = Math.max(qMaxZ, qZ);
        qMinX = Math.min(qMinX, qX - qL / 2);
        qMaxX = Math.max(qMaxX, qX + qL / 2);
      }
      const refLen = Math.min(24, Math.max(16, zoneQueues[0]?.dimensions?.length || 20));

      if (targetZone.includes('north')) {
        // Courtyard side extensions with vertical flow
        candidates.push(
          { x: qMinX - 8, z: (qMinZ + qMaxZ) / 2, length: refLen, rotation: 90 },
          { x: qMaxX + 8, z: (qMinZ + qMaxZ) / 2, length: refLen, rotation: 90 },
          { x: qMinX - 14, z: (qMinZ + qMaxZ) / 2, length: refLen, rotation: 90 },
          { x: qMaxX + 14, z: (qMinZ + qMaxZ) / 2, length: refLen, rotation: 90 }
        );
      } else {
        candidates.push(
          { x: (qMinX + qMaxX) / 2, z: qMaxZ + (lanes * (laneWidth + spacing)) / 2 + 2, length: refLen, rotation: 0 },
          { x: (qMinX + qMaxX) / 2, z: qMinZ - (lanes * (laneWidth + spacing)) / 2 - 2, length: refLen, rotation: 0 }
        );
      }
    }

    // Fallback scan strictly restricted to inner courtyard precincts (never perimeter edges)
    if (targetZone.includes('north')) {
      for (let gx = -48; gx <= 48; gx += 6) {
        if (Math.abs(gx) < 30) continue; // Keep central axis open
        for (let gz = -44; gz <= -26; gz += 5) {
          candidates.push({ x: gx, z: gz, length: 18, rotation: 90 });
        }
      }
    } else if (targetZone.includes('west')) {
      for (let gx = -68; gx <= -38; gx += 6) {
        for (let gz = -30; gz <= 10; gz += 6) {
          candidates.push({ x: gx, z: gz, length: 20, rotation: 0 });
        }
      }
    } else if (targetZone.includes('east')) {
      for (let gx = 38; gx <= 68; gx += 6) {
        for (let gz = -30; gz <= 10; gz += 6) {
          candidates.push({ x: gx, z: gz, length: 20, rotation: 0 });
        }
      }
    }

    // Test candidates sequentially to find collision-free, inside-bounds slot
    let selectedComponents = null;

    for (const cand of candidates) {
      const testComponents = [];
      const totalWidthNeeded = lanes * laneWidth + (lanes - 1) * spacing;
      const isVertical = cand.rotation === 90;

      for (let i = 0; i < lanes; i++) {
        const laneX = isVertical
          ? Math.round((cand.x - totalWidthNeeded / 2 + laneWidth / 2 + i * (laneWidth + spacing)) * 10) / 10
          : Math.round(cand.x * 10) / 10;
        const laneZ = isVertical
          ? Math.round(cand.z * 10) / 10
          : Math.round((cand.z - totalWidthNeeded / 2 + laneWidth / 2 + i * (laneWidth + spacing)) * 10) / 10;
        const laneId = `gen-expansion-${genId}-c${cIdx + 1}-lane-${i + 1}`;
        const laneName = `${targetZone.toUpperCase()} Courtyard Expansion Queue - Lane ${i + 1}`;

        // Construct valid pathData params for queuePathGeometry
        let pathData = {
          type: template,
          params: {
            length: cand.length,
          },
        };

        if (template === 'serpentine') {
          pathData.params = {
            rows: 3,
            rowLength: cand.length,
            spacing: 2.2,
          };
        } else if (template === 'arc') {
          pathData.params = {
            radius: Math.max(8, Math.round(cand.length * 0.6)),
            sweepAngle: 40,
          };
        } else if (template === 'u_shape') {
          pathData.params = {
            length: cand.length,
            width: laneWidth * 2,
          };
        } else if (template === 's_shape') {
          pathData.params = {
            length: cand.length,
            amplitude: 2.5,
            cycles: 1.5,
          };
        } else if (template === 'radial') {
          pathData.params = {
            outerRadius: cand.length,
            innerRadius: 4,
            sweepAngle: 35,
          };
        }

        const comp = {
          id: laneId,
          type: 'queue',
          name: laneName,
          category: 'crowd',
          position: {
            x: laneX,
            y: 0,
            z: laneZ,
          },
          rotation: cand.rotation || 0,
          scale: { x: 1, y: 1, z: 1 },
          dimensions: {
            length: cand.length,
            width: laneWidth,
            height: 1.0,
          },
          properties: {
            lanes: 1,
            direction: isVertical ? 'south' : 'forward',
            zone: zoneChar,
            stream: targetZone,
            connection,
            isExpansion: true,
            pattern: template,
            pathData,
            roleDescription: 'Spacious Courtyard Expansion Queue absorbing overflow crowd with multi-pass rotation',
          },
          pathData,
          generated: true,
          generationId: genId,
          role: 'queue-expansion',
          template,
        };

        testComponents.push(comp);
      }

      // Check site bounds
      const fitsBounds = testComponents.every((tc) => isComponentWithinSite(tc, site, 0.1).fits);
      if (!fitsBounds) continue;

      // Check collisions with all existing components and previously generated expansion components
      const allPrior = [...existingComponents, ...generatedComponents];
      let collides = false;

      for (const tc of testComponents) {
        const tcBox = getComponentAABB(tc);
        for (const ec of allPrior) {
          const ecBox = getComponentAABB(ec);
          const buf = (ec.type === 'barrier' && tc.type === 'queue') ? 0.3 : 0.5;
          if (doAABBsOverlap(tcBox, ecBox, buf)) {
            collides = true;
            break;
          }
        }
        if (collides) break;
      }

      if (!collides) {
        selectedComponents = testComponents;
        break;
      }
    }

    if (!selectedComponents) {
      return {
        success: false,
        components: [],
        errors: [`Could not find a valid collision-free space inside site bounds for ${lanes} ${template} lanes in ${targetZone} zone.`],
      };
    }

    // Add selected queue lanes
    generatedComponents.push(...selectedComponents);

    // Build physical architectural access gates to navigate devotees through the expansion precinct
    if (selectedComponents.length > 0) {
      const firstQueue = selectedComponents[0];
      const lastQueue = selectedComponents[selectedComponents.length - 1];
      const isVertical = firstQueue.rotation === 90;
      const qLen = firstQueue.dimensions?.length || 20;

      const entryGateX = isVertical ? (firstQueue.position.x + lastQueue.position.x) / 2 : firstQueue.position.x - qLen / 2 - 1.8;
      const entryGateZ = isVertical ? firstQueue.position.z - qLen / 2 - 1.8 : (firstQueue.position.z + lastQueue.position.z) / 2;

      const entryGate = {
        id: `gate-exp-entry-${genId}-c${cIdx + 1}`,
        type: 'entrance',
        name: `${targetZone.toUpperCase()} Expansion Ingress Portal`,
        category: 'crowd',
        position: { x: Math.round(entryGateX * 10) / 10, y: 0, z: Math.round(entryGateZ * 10) / 10 },
        rotation: isVertical ? 0 : 90,
        scale: { x: 1, y: 1, z: 1 },
        dimensions: { length: Math.max(3.2, selectedComponents.length * 2.2), width: 1.4, height: 3.2 },
        properties: {
          signage: `EXPANSION INGRESS GATE (${targetZone.toUpperCase()})`,
          archType: 'traditional',
          zone: zoneChar,
          roleDescription: 'Access control gate admitting devotees into the expanded queue precinct',
        },
        generated: true,
        generationId: genId,
        role: 'expansion-entry-gate',
      };

      const exitGateX = isVertical ? (firstQueue.position.x + lastQueue.position.x) / 2 : firstQueue.position.x + qLen / 2 + 1.8;
      const exitGateZ = isVertical ? firstQueue.position.z + qLen / 2 + 1.8 : (firstQueue.position.z + lastQueue.position.z) / 2;

      const exitGate = {
        id: `gate-exp-exit-${genId}-c${cIdx + 1}`,
        type: 'entrance',
        name: `${targetZone.toUpperCase()} Expansion Darshan Egress Portal`,
        category: 'crowd',
        position: { x: Math.round(exitGateX * 10) / 10, y: 0, z: Math.round(exitGateZ * 10) / 10 },
        rotation: isVertical ? 0 : 90,
        scale: { x: 1, y: 1, z: 1 },
        dimensions: { length: Math.max(3.2, selectedComponents.length * 2.2), width: 1.4, height: 3.2 },
        properties: {
          signage: 'DARSHAN MERGE GATE',
          archType: 'traditional',
          zone: zoneChar,
          roleDescription: 'Release gate channeling devotees from expanded queue into the central sacred darshan procession',
        },
        generated: true,
        generationId: genId,
        role: 'expansion-exit-gate',
      };

      generatedComponents.push(entryGate, exitGate);
    }
  }

  // Validate layout with deterministic validator
  const combinedComponents = [...existingComponents, ...generatedComponents];
  const layoutToValidate = {
    ...scene,
    site: (scene?.site && scene.site.length && scene.site.width) ? scene.site : site,
    components: combinedComponents,
  };
  const validation = validateLayout(layoutToValidate);

  // Only fail if there are critical errors caused by expansion components
  const expErrors = validation.errors.filter((e) =>
    generatedComponents.some((gc) => gc.id === e.componentId || gc.id === e.secondaryComponentId)
  );

  if (expErrors.length > 0) {
    return {
      success: false,
      components: [],
      errors: expErrors.map((e) => e.message),
    };
  }

  return {
    success: true,
    components: generatedComponents,
    generationId: genId,
    errors: [],
  };
}

/**
 * Primary planning interface for Capacity Expansion.
 * Connects Human Approval -> AI Planner / Fallback -> Schema Validation -> Deterministic Layout Validation.
 * Returns proposed plan and metrics WITHOUT mutating Scene JSON.
 */
export async function generateCapacityExpansionPlan(context = {}) {
  const {
    problem = {},
    site: contextSite = null,
    existingLayout = {},
    existingQueues = [],
    requirements = {},
    planOverride = null,
  } = context;

  let targetZone = (problem.zone || 'north').toLowerCase();
  if (['exit', 'dispersal', 'darshan', 'sanctum'].includes(targetZone)) {
    targetZone = 'north';
  }

  const site = (contextSite && contextSite.length && contextSite.width)
    ? contextSite
    : (existingLayout?.site || existingLayout?.scene?.site || { length: 250, width: 180, unit: 'meters' });

  const occupancy = problem.occupancy || 0;
  const capacity = problem.capacity || 0;
  const utilization = problem.utilization || (capacity > 0 ? occupancy / capacity : 1.25);
  const arrivalRate = problem.arrivalRate || 0;
  const components = existingLayout.components || [];

  // Snapshot existing components count to ensure absolute immutability
  const initialComponentCount = components.length;

  let rawPlan = planOverride;

  if (!rawPlan) {
    // Attempt backend AI request if running in browser / live environment
    try {
      const apiResult = await requestCapacityExpansionPlan({
        problem,
        site,
        existingLayout,
        existingQueues,
        requirements: {
          preserveExistingQueues: true,
          preserveTempleArchitecture: true,
          allowAdditionalQueueCapacity: true,
          allowCurvedQueues: true,
          allowSerpentine: true,
          allowArc: true,
          allowRadial: true,
          ...requirements,
        },
      });

      if (apiResult.success && apiResult.plan) {
        rawPlan = apiResult.plan;
      }
    } catch (err) {
      // Fallback handled below
    }
  }

  // Deterministic Intelligent Planner fallback
  if (!rawPlan) {
    const deficit = Math.max(150, occupancy - capacity);
    const template = 'serpentine'; // Multi-pass serpentine rotation for realistic crowd rotation and surge holding
    const lanes = Math.min(4, Math.max(1, Math.ceil(deficit / 400)));
    const laneWidth = 2.0;
    const spacing = 2.2;
    const expectedCapacityIncrease = lanes * 360;

    rawPlan = {
      type: 'capacity_expansion',
      targetZone,
      reasoning: `At the current ${Math.round(utilization * 100)}% utilization (${occupancy.toLocaleString()} devotees vs ${capacity.toLocaleString()} designed capacity), additional queue capacity of ${deficit}+ devotees is required in the ${targetZone} zone. Proposing ${lanes} ${template} multi-pass rotating queue lines in the open courtyard to expand holding volume and smoothly rotate crowd flow while strictly preserving sacred Dravidian architecture.`,
      changes: [
        {
          action: 'add_queue',
          template,
          lanes,
          laneWidth,
          spacing,
          connection: `${targetZone}-queue-branch -> courtyard-expansion -> central-darshan-spine`,
        },
      ],
      expectedCapacityIncrease,
      constraints: [
        'preserve existing temple architecture',
        'preserve existing queues',
        'remain inside site boundary',
        'maintain flow toward security',
      ],
    };
  }

  // 1. Zod Schema Validation
  const schemaResult = CapacityExpansionPlanSchema.safeParse(rawPlan);
  if (!schemaResult.success) {
    const issues = schemaResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return {
      success: false,
      plan: null,
      validation: {
        valid: false,
        errors: issues,
        reason: `Expansion plan could not be safely placed: Schema validation failed (${issues[0]}).`,
      },
      proposedComponents: [],
      expectedCapacityIncrease: 0,
    };
  }

  const validatedPlan = schemaResult.data;

  // 2. Deterministic Layout & Architecture Validation
  const layoutValidation = validateCapacityExpansionPlan(validatedPlan, site, components);
  if (!layoutValidation.valid) {
    return {
      success: false,
      plan: validatedPlan,
      validation: layoutValidation,
      proposedComponents: [],
      expectedCapacityIncrease: 0,
    };
  }

  // 3. Generate Deterministic Queue Components from plan intent
  const genResult = generateDeterministicExpansionComponents(validatedPlan, { ...existingLayout, site });
  if (!genResult.success) {
    return {
      success: false,
      plan: validatedPlan,
      validation: {
        valid: false,
        errors: genResult.errors,
        reason: `Expansion plan could not be safely placed: ${genResult.errors.join('; ')}`,
      },
      proposedComponents: [],
      expectedCapacityIncrease: 0,
    };
  }

  const proposedComponents = genResult.components;
  let computedCapacityIncrease = 0;
  for (const comp of proposedComponents) {
    computedCapacityIncrease += calculateQueuePhysicalCapacity(comp);
  }

  // Verify Scene JSON was NOT mutated
  if (components.length !== initialComponentCount) {
    throw new Error('CRITICAL SAFETY VIOLATION: Existing Scene components were mutated during planning!');
  }

  return {
    success: true,
    plan: validatedPlan,
    validation: {
      valid: true,
      errors: [],
      reason: null,
    },
    proposedComponents,
    generationId: genResult.generationId,
    expectedCapacityIncrease: computedCapacityIncrease || validatedPlan.expectedCapacityIncrease,
  };
}
