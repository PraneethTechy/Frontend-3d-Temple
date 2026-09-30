/**
 * DevaSetu Plan Export Utilities
 * Exports Scene JSON and human-readable planning summary reports without runtime Three.js geometry.
 */

function downloadBlob(blob, filename) {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates human-readable summary text
 */
export function generatePlanSummaryText(sceneInput, planNameInput = 'Queue-Plan', simMetrics = null) {
  const scene = sceneInput?.scene ? sceneInput.scene : sceneInput;
  const planName = sceneInput?.name || planNameInput || 'Queue-Plan';

  const templeName = scene.temple?.name || 'Sanctuary';
  const site = scene.site || {};
  const req = scene.requirements || {};
  const metrics = scene.analysis?.metrics || {};
  const errors = scene.analysis?.errors || [];
  const warnings = scene.analysis?.warnings || [];
  const components = scene.components || [];

  const lines = [
    '==================================================================',
    '                 DEVASATU SMART QUEUE DESIGNER                    ',
    '                   Sacred Spatial Planning Report                 ',
    '==================================================================',
    '',
    `Plan Name:             ${planName}`,
    `Temple / Sanctuary:    ${templeName}`,
    `Generated On:          ${new Date().toLocaleString()}`,
    '',
    '------------------------------------------------------------------',
    '1. SITE & CROWD DEMAND SPECIFICATIONS',
    '------------------------------------------------------------------',
    `Footprint Dimensions:  ${site.length}m (Length) x ${site.width}m (Width)`,
    `Measurement Unit:      ${site.unit || 'meters'}`,
    `Expected Daily Crowd:  ${(req.expectedVisitors || 0).toLocaleString()} visitors`,
    `Peak Concurrent Demand: ${(req.peakVisitors || 0).toLocaleString()} visitors`,
    '',
    '------------------------------------------------------------------',
    '2. STATIC CAPACITY & THROUGHPUT METRICS',
    '------------------------------------------------------------------',
    `Calculated Capacity:   ${(metrics.queueCapacity || metrics.standingCapacity || 0).toLocaleString()} people`,
    `Physical Queue Length: ${metrics.totalQueueLength || 0} meters`,
    `Effective Queue Lanes: ${metrics.totalEffectiveLanes || 1}`,
    `Peak Space Utilization: ${metrics.utilization || 0}% (${metrics.utilizationLabel || 'N/A'})`,
    `Estimated Planning Wait: ${metrics.estimatedWaitMinutes || 0} minutes`,
    '',
    '------------------------------------------------------------------',
    '3. COMPONENT INVENTORY',
    '------------------------------------------------------------------',
    `Total Components:      ${components.length}`,
    ...components.map(
      (c, i) =>
        `  ${i + 1}. [${c.type.toUpperCase()}] ${c.name} - Pos: (${c.position?.x?.toFixed?.(1) ?? 0}m, ${c.position?.z?.toFixed?.(1) ?? 0}m) - Size: ${c.dimensions?.length ?? 1}m x ${c.dimensions?.width ?? 1}m`
    ),
    '',
  ];

  if (simMetrics && simMetrics.simTimeSeconds > 0) {
    lines.push(
      '------------------------------------------------------------------',
      '4. DYNAMIC CROWD SIMULATION SUMMARY',
      '------------------------------------------------------------------',
      `Simulation Run Time:   ${simMetrics.formattedTime}`,
      `Simulated Visitors In: ${(simMetrics.visitorsEntered || 0).toLocaleString()}`,
      `Currently In Queue:    ${(simMetrics.visitorsInQueue || 0).toLocaleString()}`,
      `Completed Egress:      ${(simMetrics.visitorsCompleted || 0).toLocaleString()}`,
      `Observed Average Wait: ${simMetrics.avgWaitMinutes || 0} minutes`,
      `Peak Concurrent Queue: ${(simMetrics.peakQueue || 0).toLocaleString()}`,
      `Simulated Throughput:  ${(simMetrics.throughputPerHour || 0).toLocaleString()} visitors / hour`,
      `Detected Bottleneck:   ${simMetrics.bottleneck?.zone || 'Queue Lane'} - ${simMetrics.bottleneck?.reason || 'Standard flow'}`,
      ''
    );
  }

  lines.push(
    '------------------------------------------------------------------',
    '5. SPATIAL VALIDATION & SAFETY OBSERVATIONS',
    '------------------------------------------------------------------',
    `Status:                ${errors.length === 0 ? 'VALID (No boundary or collision errors)' : 'INVALID'}`,
    `Errors Detected:       ${errors.length}`,
    ...errors.map((e) => `  * ERROR: ${e.message}`),
    `Warnings Detected:     ${warnings.length}`,
    ...warnings.map((w) => `  * WARNING: ${w.message}`),
    '',
    '==================================================================',
    'Notice: Planning estimates based on architectural crowd density.  ',
    'Does not substitute local statutory fire safety certifications.   ',
    '=================================================================='
  );

  return lines.join('\n');
}

/**
 * Exports clean Scene JSON design file
 */
export function exportPlanAsJson(sceneInput, planNameInput = 'Queue-Plan') {
  const scene = sceneInput?.scene ? sceneInput.scene : sceneInput;
  const planName = sceneInput?.name || planNameInput || 'Queue-Plan';

  const cleanScene = {
    metadata: {
      exportedAt: new Date().toISOString(),
      source: 'DevaSetu Smart Queue Designer',
      version: '1.0',
    },
    temple: scene.temple,
    site: scene.site,
    requirements: scene.requirements,
    components: (scene.components || []).map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      position: c.position,
      rotation: c.rotation,
      scale: c.scale,
      dimensions: c.dimensions,
      properties: c.properties,
      generated: c.generated,
      role: c.role,
      template: c.template,
    })),
    paths: scene.paths || [],
    analysis: scene.analysis || {},
  };

  const jsonStr = JSON.stringify(cleanScene, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const safeName = (planName || 'queue-plan').toLowerCase().replace(/[^a-z0-9]/gi, '-');
  downloadBlob(blob, `${safeName}.json`);
}

/**
 * Exports a clean human-readable planning report summary
 */
export function exportPlanSummary(sceneInput, planNameInput = 'Queue-Plan', simMetrics = null) {
  const planName = sceneInput?.name || planNameInput || 'Queue-Plan';
  const text = generatePlanSummaryText(sceneInput, planNameInput, simMetrics);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const safeName = (planName || 'queue-plan').toLowerCase().replace(/[^a-z0-9]/gi, '-');
  downloadBlob(blob, `${safeName}-summary.txt`);
}
