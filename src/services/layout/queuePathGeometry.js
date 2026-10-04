/**
 * DevaSetu Path-Based Queue Geometry Engine
 * 
 * Mathematical Source of Truth for:
 * - Straight, Polyline, Arc, Bezier (Quadratic & Cubic), Serpentine, U-Shape, S-Shape, Radial.
 * - Centerline sampling at ~0.75m - 1.0m intervals.
 * - Local tangents, 2D normals, lateral left/right offsets for stanchions and rails.
 * - True arc-length calculation.
 * - World coordinate transformations (position + rotation).
 * 
 * STRICT RULE: Pure JSON-serializable output ({ x, z }). Never Vector3 in scene state.
 */

export const QUEUE_SHAPES = {
  STRAIGHT: 'straight',
  POLYLINE: 'polyline',
  ARC: 'arc',
  BEZIER: 'bezier',
  SERPENTINE: 'serpentine',
  U_SHAPE: 'u_shape',
  S_SHAPE: 's_shape',
  RADIAL: 'radial',
  L_SHAPE: 'l_shape',
};

export const DEFAULT_SAMPLING_STEP = 0.85; // Target ~0.85m between waypoints for smooth crowd kinematics

/**
 * 2D vector helpers on horizontal plane (X, Z)
 */
export function dist2D(p1, p2) {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function rotatePoint2D(p, angleRad) {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: p.x * cos - p.z * sin,
    z: p.x * sin + p.z * cos,
  };
}

/**
 * Computes tangent and normal vectors for a 2D polyline point
 */
export function computePointOrientation(pPrev, pCurr, pNext) {
  let dx = 1;
  let dz = 0;

  if (pNext && pPrev) {
    dx = pNext.x - pPrev.x;
    dz = pNext.z - pPrev.z;
  } else if (pNext) {
    dx = pNext.x - pCurr.x;
    dz = pNext.z - pCurr.z;
  } else if (pPrev) {
    dx = pCurr.x - pPrev.x;
    dz = pCurr.z - pPrev.z;
  }

  const len = Math.sqrt(dx * dx + dz * dz) || 1e-6;
  const tx = dx / len;
  const tz = dz / len;

  // Normal is perpendicular to tangent on X-Z plane: (-tz, tx)
  const nx = -tz;
  const nz = tx;

  const headingAngle = Math.atan2(dx, dz); // Y-axis rotation in Three.js coordinates

  return { tx, tz, nx, nz, headingAngle };
}

/**
 * Resamples an arbitrary 2D polyline into equidistant points spaced by targetStep
 */
export function resamplePolyline(rawPoints, targetStep = DEFAULT_SAMPLING_STEP) {
  if (!rawPoints || rawPoints.length < 2) {
    return rawPoints ? [...rawPoints] : [];
  }

  // Calculate cumulative distances
  const cumDist = [0];
  let totalLength = 0;
  for (let i = 1; i < rawPoints.length; i++) {
    const d = dist2D(rawPoints[i - 1], rawPoints[i]);
    totalLength += d;
    cumDist.push(totalLength);
  }

  if (totalLength < 0.001) {
    return [rawPoints[0], rawPoints[rawPoints.length - 1]];
  }

  const numSteps = Math.max(2, Math.round(totalLength / targetStep));
  const resampled = [];

  let curSegment = 0;
  for (let i = 0; i <= numSteps; i++) {
    const targetD = (i / numSteps) * totalLength;

    while (curSegment < cumDist.length - 1 && cumDist[curSegment + 1] < targetD) {
      curSegment++;
    }

    if (curSegment >= cumDist.length - 1) {
      resampled.push({ ...rawPoints[rawPoints.length - 1] });
      continue;
    }

    const segStartD = cumDist[curSegment];
    const segEndD = cumDist[curSegment + 1];
    const segLen = segEndD - segStartD;
    const t = segLen > 1e-6 ? (targetD - segStartD) / segLen : 0;

    const p0 = rawPoints[curSegment];
    const p1 = rawPoints[curSegment + 1];

    resampled.push({
      x: p0.x + (p1.x - p0.x) * t,
      z: p0.z + (p1.z - p0.z) * t,
    });
  }

  return resampled;
}

/**
 * 1. Straight path generator (centered at origin locally from -L/2 to +L/2 along X axis)
 */
export function generateStraightCenterline(length = 10, step = DEFAULT_SAMPLING_STEP) {
  const l = Math.max(1, length);
  const numSteps = Math.max(2, Math.round(l / step));
  const points = [];
  const startX = -l / 2;
  const deltaX = l / (numSteps - 1);

  for (let i = 0; i < numSteps; i++) {
    points.push({
      x: startX + i * deltaX,
      z: 0,
    });
  }
  return { points, totalLength: l };
}

/**
 * 2. Arc path generator (radius, startAngle, endAngle in degrees)
 */
export function generateArcCenterline(params = {}, step = DEFAULT_SAMPLING_STEP) {
  const radius = Math.max(2, parseFloat(params.radius) || 12);
  const startDeg = parseFloat(params.startAngle ?? -45);
  const endDeg = parseFloat(params.endAngle ?? 45);

  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  const angularSpan = Math.abs(endRad - startRad);
  const totalLength = radius * angularSpan;

  const numSteps = Math.max(3, Math.round(totalLength / step));
  const points = [];

  // Arc center offset so that the arc's midpoint sits near local origin
  const midRad = (startRad + endRad) / 2;
  const offsetX = radius * Math.cos(midRad);
  const offsetZ = radius * Math.sin(midRad);

  for (let i = 0; i < numSteps; i++) {
    const t = i / (numSteps - 1);
    const angle = startRad + (endRad - startRad) * t;
    points.push({
      x: radius * Math.cos(angle) - offsetX,
      z: radius * Math.sin(angle) - offsetZ,
    });
  }

  return { points, totalLength };
}

/**
 * 3. Bezier curve generator (Quadratic or Cubic control points in local coords)
 */
export function generateBezierCenterline(controlPoints = [], step = DEFAULT_SAMPLING_STEP) {
  if (!controlPoints || controlPoints.length < 2) {
    return generateStraightCenterline(10, step);
  }

  const raw = [];
  const fineSamples = 60;

  if (controlPoints.length === 2) {
    // Linear
    return generateStraightCenterline(dist2D(controlPoints[0], controlPoints[1]), step);
  } else if (controlPoints.length === 3) {
    // Quadratic Bezier
    const [p0, p1, p2] = controlPoints;
    for (let i = 0; i <= fineSamples; i++) {
      const t = i / fineSamples;
      const u = 1 - t;
      raw.push({
        x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        z: u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z,
      });
    }
  } else {
    // Cubic Bezier (takes first 4 or interpolates chain)
    const [p0, p1, p2, p3] = controlPoints;
    for (let i = 0; i <= fineSamples; i++) {
      const t = i / fineSamples;
      const u = 1 - t;
      raw.push({
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        z: u * u * u * p0.z + 3 * u * u * t * p1.z + 3 * u * t * t * p2.z + t * t * t * p3.z,
      });
    }
  }

  // Calculate arc length
  let totalLength = 0;
  for (let i = 1; i < raw.length; i++) {
    totalLength += dist2D(raw[i - 1], raw[i]);
  }

  const points = resamplePolyline(raw, step);
  return { points, totalLength };
}

/**
 * 4. U-Shape continuous centerline generator
 */
export function generateUShapeCenterline(params = {}, step = DEFAULT_SAMPLING_STEP) {
  const armLength = Math.max(3, parseFloat(params.armLength || params.length || 16));
  const width = Math.max(2, parseFloat(params.width || params.spacing || 6));
  const turnRadius = width / 2;

  const raw = [];
  const startX = -armLength / 2;
  const endX = armLength / 2;

  // Leg 1: (startX, -turnRadius) -> (endX, -turnRadius)
  const legSamples = Math.max(4, Math.round(armLength / 1.0));
  for (let i = 0; i <= legSamples; i++) {
    const t = i / legSamples;
    raw.push({ x: startX + t * (endX - startX), z: -turnRadius });
  }

  // Turn: semi-circle connecting (endX, -turnRadius) to (endX, turnRadius)
  const turnSamples = 16;
  for (let i = 1; i < turnSamples; i++) {
    const angle = -Math.PI / 2 + (i / turnSamples) * Math.PI;
    raw.push({
      x: endX + turnRadius * Math.cos(angle),
      z: turnRadius * Math.sin(angle),
    });
  }

  // Leg 2: (endX, turnRadius) -> (startX, turnRadius)
  for (let i = 0; i <= legSamples; i++) {
    const t = i / legSamples;
    raw.push({ x: endX - t * (endX - startX), z: turnRadius });
  }

  let totalLength = 0;
  for (let i = 1; i < raw.length; i++) {
    totalLength += dist2D(raw[i - 1], raw[i]);
  }

  const points = resamplePolyline(raw, step);
  return { points, totalLength };
}

/**
 * 5. S-Shape continuous smooth centerline generator
 */
export function generateSShapeCenterline(params = {}, step = DEFAULT_SAMPLING_STEP) {
  const spanX = Math.max(6, parseFloat(params.length || 24));
  const amplitude = Math.max(1.5, parseFloat(params.amplitude || params.width || 4));
  const cycles = Math.max(1, parseFloat(params.cycles || 1.5));

  const samples = Math.max(30, Math.round(spanX / 0.5));
  const raw = [];
  const halfSpan = spanX / 2;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = -halfSpan + t * spanX;
    const z = Math.sin(t * cycles * Math.PI * 2) * (amplitude / 2);
    raw.push({ x, z });
  }

  let totalLength = 0;
  for (let i = 1; i < raw.length; i++) {
    totalLength += dist2D(raw[i - 1], raw[i]);
  }

  const points = resamplePolyline(raw, step);
  return { points, totalLength };
}

/**
 * 6. Serpentine continuous zigzag with rounded turnaround bends
 */
export function generateSerpentineCenterline(params = {}, step = DEFAULT_SAMPLING_STEP) {
  const rows = Math.max(2, parseInt(params.rows || params.lanes || 4, 10));
  const rowLength = Math.max(4, parseFloat(params.rowLength || params.length || 24));
  const rowSpacing = Math.max(1.2, parseFloat(params.spacing || 2.2));
  const turnRadius = rowSpacing / 2;

  const totalHeight = (rows - 1) * rowSpacing;
  const startZ = -totalHeight / 2;
  const halfLen = rowLength / 2;

  const raw = [];

  for (let r = 0; r < rows; r++) {
    const z = startZ + r * rowSpacing;
    const isEven = r % 2 === 0;

    const xStart = isEven ? -halfLen : halfLen;
    const xEnd = isEven ? halfLen : -halfLen;

    const rowSamples = Math.max(4, Math.round(rowLength / 1.0));
    for (let i = 0; i <= rowSamples; i++) {
      const t = i / rowSamples;
      raw.push({
        x: xStart + t * (xEnd - xStart),
        z,
      });
    }

    // Connect with smooth semi-circular turnaround bend to next row
    if (r < rows - 1) {
      const nextZ = z + rowSpacing;
      const turnCenterZ = (z + nextZ) / 2;
      const turnCenterX = isEven ? halfLen : -halfLen;
      const turnAngleStart = -Math.PI / 2;
      const angleDir = isEven ? 1 : -1;

      const turnSamples = 12;
      for (let j = 1; j < turnSamples; j++) {
        const theta = turnAngleStart + angleDir * (j / turnSamples) * Math.PI;
        raw.push({
          x: turnCenterX + turnRadius * Math.cos(theta),
          z: turnCenterZ + turnRadius * Math.sin(theta),
        });
      }
    }
  }

  let totalLength = 0;
  for (let i = 1; i < raw.length; i++) {
    totalLength += dist2D(raw[i - 1], raw[i]);
  }

  const points = resamplePolyline(raw, step);
  return { points, totalLength };
}

/**
 * 7. Radial approach centerline (curving radially towards a sacred focal point)
 */
export function generateRadialCenterline(params = {}, step = DEFAULT_SAMPLING_STEP) {
  const outerRadius = Math.max(8, parseFloat(params.outerRadius || params.length || 20));
  const innerRadius = Math.max(2, parseFloat(params.innerRadius || 4));
  const sweepAngleDeg = parseFloat(params.sweepAngle || 35);
  const sweepRad = (sweepAngleDeg * Math.PI) / 180;

  const span = outerRadius - innerRadius;
  const samples = Math.max(10, Math.round(span / 0.8));
  const raw = [];

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const r = outerRadius - t * span;
    // Mild logarithmic or linear spiral sweep
    const theta = (1 - t) * sweepRad;
    raw.push({
      x: r * Math.sin(theta),
      z: -r * Math.cos(theta) + (outerRadius + innerRadius) / 2,
    });
  }

  let totalLength = 0;
  for (let i = 1; i < raw.length; i++) {
    totalLength += dist2D(raw[i - 1], raw[i]);
  }

  const points = resamplePolyline(raw, step);
  return { points, totalLength };
}

/**
 * 8. L-Shape continuous centerline generator with smooth 90-degree corner
 */
export function generateLShapeCenterline(params = {}, step = DEFAULT_SAMPLING_STEP) {
  const leg1 = Math.max(3, parseFloat(params.leg1 || params.length || 20));
  const leg2 = Math.max(3, parseFloat(params.leg2 || params.width || 16));
  const turnRadius = Math.min(Math.min(leg1, leg2) * 0.45, Math.max(1.5, parseFloat(params.turnRadius || 3.0)));
  const turnDirection = params.turnDirection === 'left' ? -1 : 1; // +1: right (+Z), -1: left (-Z)

  const raw = [];

  // Leg 1: straight along X from (-leg1/2, 0) to (leg1/2 - turnRadius, 0)
  const startX = -leg1 / 2;
  const cornerX = leg1 / 2 - turnRadius;
  const leg1Samples = Math.max(4, Math.round((cornerX - startX) / 1.0));
  for (let i = 0; i <= leg1Samples; i++) {
    const t = i / leg1Samples;
    raw.push({ x: startX + t * (cornerX - startX), z: 0 });
  }

  // Smooth quarter-circle corner arc
  const arcSamples = 12;
  const centerZ = turnDirection * turnRadius;
  const startAngle = -turnDirection * Math.PI / 2;
  const endAngle = 0;
  for (let i = 1; i <= arcSamples; i++) {
    const t = i / arcSamples;
    const ang = startAngle + (endAngle - startAngle) * t;
    raw.push({
      x: cornerX + turnRadius * Math.cos(ang),
      z: centerZ + turnRadius * Math.sin(ang),
    });
  }

  // Leg 2: straight along Z from corner exit towards leg2 end
  const leg2Samples = Math.max(4, Math.round(leg2 / 1.0));
  for (let i = 1; i <= leg2Samples; i++) {
    const t = i / leg2Samples;
    raw.push({
      x: leg1 / 2,
      z: centerZ + turnDirection * (t * leg2),
    });
  }

  let totalLength = 0;
  for (let i = 1; i < raw.length; i++) {
    totalLength += dist2D(raw[i - 1], raw[i]);
  }

  const points = resamplePolyline(raw, step);
  return { points, totalLength };
}

/**
 * MASTER FUNCTION: Resolves any queue's centerline into sample points and world coordinates.
 * BACKWARD COMPATIBLE: If component has no pathData, seamlessly generates straight path.
 */
export function getQueuePathGeometry(component, step = DEFAULT_SAMPLING_STEP) {
  if (!component) {
    return {
      points: [],
      worldPoints: [],
      leftRailPoints: [],
      rightRailPoints: [],
      totalLength: 0,
      shape: QUEUE_SHAPES.STRAIGHT,
    };
  }

  const pathData = component.properties?.pathData;
  const shape = pathData?.type || component.properties?.pattern || QUEUE_SHAPES.STRAIGHT;
  const length = Number(component.dimensions?.length) || 12;
  const width = Number(component.dimensions?.width) || 2.0;

  let localResult;

  switch (shape) {
    case QUEUE_SHAPES.ARC:
      localResult = generateArcCenterline(pathData?.params, step);
      break;

    case QUEUE_SHAPES.BEZIER:
      localResult = generateBezierCenterline(pathData?.controlPoints, step);
      break;

    case QUEUE_SHAPES.POLYLINE:
      if (pathData?.controlPoints && pathData.controlPoints.length >= 2) {
        localResult = {
          points: resamplePolyline(pathData.controlPoints, step),
          totalLength: pathData.controlPoints.reduce((acc, p, idx, arr) => {
            return idx > 0 ? acc + dist2D(arr[idx - 1], p) : 0;
          }, 0),
        };
      } else {
        localResult = generateStraightCenterline(length, step);
      }
      break;

    case QUEUE_SHAPES.U_SHAPE:
      localResult = generateUShapeCenterline(pathData?.params || { length, width }, step);
      break;

    case QUEUE_SHAPES.S_SHAPE:
      localResult = generateSShapeCenterline(pathData?.params || { length, width }, step);
      break;

    case 'switchback':
    case QUEUE_SHAPES.SERPENTINE:
      localResult = generateSerpentineCenterline(
        pathData?.params || {
          rows: component.properties?.lanes || 4,
          rowLength: length,
          spacing: 2.0,
        },
        step
      );
      break;

    case QUEUE_SHAPES.RADIAL:
      localResult = generateRadialCenterline(pathData?.params || { length }, step);
      break;

    case QUEUE_SHAPES.L_SHAPE:
      localResult = generateLShapeCenterline(
        pathData?.params || {
          leg1: length,
          leg2: Math.max(8, width * 4),
          turnRadius: Math.max(2, width * 1.2),
          turnDirection: pathData?.params?.turnDirection || 'right',
        },
        step
      );
      break;

    case QUEUE_SHAPES.STRAIGHT:
    default:
      localResult = generateStraightCenterline(length, step);
      break;
  }

  const { points: localPoints, totalLength } = localResult;

  // Compute orientation normals and lateral left/right offsets
  const halfW = width / 2;
  const posX = component.position?.x || 0;
  const posZ = component.position?.z || 0;
  let rotRad = 0;
  if (typeof component.rotation === 'number') {
    rotRad = (component.rotation * Math.PI) / 180;
  } else if (component.rotation && typeof component.rotation.y === 'number') {
    rotRad = component.rotation.y;
  }

  const worldPoints = [];
  const leftRailPoints = [];
  const rightRailPoints = [];
  const orientations = [];

  for (let i = 0; i < localPoints.length; i++) {
    const pPrev = i > 0 ? localPoints[i - 1] : null;
    const pCurr = localPoints[i];
    const pNext = i < localPoints.length - 1 ? localPoints[i + 1] : null;

    const orient = computePointOrientation(pPrev, pCurr, pNext);
    orientations.push(orient);

    // Left and Right offsets in local space
    const leftLocal = {
      x: pCurr.x + orient.nx * halfW,
      z: pCurr.z + orient.nz * halfW,
    };
    const rightLocal = {
      x: pCurr.x - orient.nx * halfW,
      z: pCurr.z - orient.nz * halfW,
    };

    // Transform to world space
    const pWorldRot = rotatePoint2D(pCurr, rotRad);
    worldPoints.push({
      x: Math.round((pWorldRot.x + posX) * 100) / 100,
      z: Math.round((pWorldRot.z + posZ) * 100) / 100,
      headingAngle: (orient.headingAngle + rotRad) % (Math.PI * 2),
    });

    const leftWorldRot = rotatePoint2D(leftLocal, rotRad);
    leftRailPoints.push({
      x: Math.round((leftWorldRot.x + posX) * 100) / 100,
      z: Math.round((leftWorldRot.z + posZ) * 100) / 100,
    });

    const rightWorldRot = rotatePoint2D(rightLocal, rotRad);
    rightRailPoints.push({
      x: Math.round((rightWorldRot.x + posX) * 100) / 100,
      z: Math.round((rightWorldRot.z + posZ) * 100) / 100,
    });
  }

  return {
    shape,
    totalLength: Math.round(totalLength * 100) / 100,
    points: localPoints,
    localPoints,
    worldPoints,
    leftRailPoints,
    rightRailPoints,
    orientations,
  };
}
