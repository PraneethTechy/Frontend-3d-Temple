/**
 * Pure Mathematical & Geometric Calculations for Dravidian Gopuram Hierarchy
 * Exported as plain JavaScript for universal compatibility across Three.js/R3F components and Node.js test runners.
 */

export function calculateDravidianTierData({
  length = 18,
  width = 9,
  height = 20,
  tiers = 5,
  baseHeight = 6.5,
  isMain = false,
}) {
  const list = [];
  const remainingHeight = Math.max(6.0, height - baseHeight - (isMain ? 3.4 : 2.6));

  const weights = [];
  let totalWeight = 0;
  const decay = isMain ? 0.86 : 0.85;
  for (let i = 0; i < tiers; i++) {
    const w = Math.pow(decay, i);
    weights.push(w);
    totalWeight += w;
  }

  let currentY = baseHeight;
  for (let i = 0; i < tiers; i++) {
    const tierH = (weights[i] / totalWeight) * remainingHeight;
    const progress = i / Math.max(1, tiers - 1);
    const taper = 1 - Math.pow(progress, 0.90) * (isMain ? 0.46 : 0.50);
    const tL = (length - (isMain ? 1.6 : 1.2)) * taper;
    const tW = (width - (isMain ? 1.2 : 1.0)) * taper;
    const tY = currentY + tierH / 2;

    const kutaW = Math.max(1.2, tL * 0.20);
    const kutaD = Math.max(1.2, tW * 0.22);
    const bhadraW = Math.max(2.2, tL * 0.32);
    const bhadraD = Math.max(1.8, tW * 0.36);

    const projBhadraZ = Math.min(0.85, 0.45 + (1 - progress) * 0.40);
    const projBhadraX = Math.min(0.75, 0.40 + (1 - progress) * 0.35);
    const recessHarantara = Math.min(0.55, 0.30 + (1 - progress) * 0.25);
    const corniceOverhang = Math.min(0.70, 0.45 + (1 - progress) * 0.25);

    list.push({
      index: i,
      length: tL,
      width: tW,
      height: tierH,
      y: tY,
      taper,
      kutaW,
      kutaD,
      bhadraW,
      bhadraD,
      projBhadraZ,
      projBhadraX,
      recessHarantara,
      corniceOverhang,
    });
    currentY += tierH;
  }
  return list;
}
