import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useQueueStore } from '../../../store/useQueueStore.js';
import { useCapacityExpansionStore } from '../../simulation/capacityExpansionStore.js';
import { calculateDravidianTierData } from './dravidianGeometry.js';

export { calculateDravidianTierData };

/**
 * Authentic Procedural 3D Dravidian Gopuram Architecture
 * Strictly faithful to classical South Indian temple architecture (Arunachaleswarar, Brihadisvara)
 * and matching the Master Prompt Reference Image.
 *
 * Core Rules:
 * 1. Gateways:
 *    - Entrance & Exit Gopurams (North, South, East, West): 100% EMPTY, OPEN, TRAVERSABLE PASSAGE.
 *      No deity idol inside. Devotees walk cleanly through.
 *    - Central Darshan Gopuram (isMain = true): The ONLY gopuram housing the sacred illuminated
 *      golden Shiva deity on the central sacred axis.
 * 2. Top Crown & Kalasam Alignment (Parametric & Perfectly Symmetrical):
 *    - Solid Shala barrel roof with elevated ridge plinth.
 *    - Perfectly centered, evenly spaced, vertically aligned golden Kalasams sitting on pedestals (no floating, no tilt).
 *    - Symmetrical high-relief Mahanaasika horseshoe arch gables with curved lateral horns on both ends.
 * 3. Base Mandapa & Pillars:
 *    - Stepped Adhishthana granite plinth (Upana, Jagati, Kumuda torus, Kantha shadow slot, Pattika shelf).
 *    - Classical Dravidian segmented pillars (Oma base, bulging Kalasa torus, Idal lotus capital, Bodika brackets).
 * 4. Dense Tala Tiers & Sculptural Hierarchy:
 *    - Central projecting Bhadra bay on vertical axis.
 *    - Recessed Harantara shadow channels.
 *    - Corner Karna Kuta pavilions with square domed roofs and golden stupis.
 *    - Continuous galleries of standing temple figures (Murtis) across all 4 faces.
 *    - Triple-layer Kapota cornices with dark shadow soffits and dense Kudu medallions.
 * 5. Spatial Orientation:
 *    - Respects each gopuram's unique coordinate and orientation in DevaSetu.
 */
export function DravidianGopuram({
  component,
  isMain = false,
  isSelected = false,
  showLabels: propShowLabels,
}) {
  const { dimensions = {}, properties = {} } = component || {};
  const length = Number(dimensions.length) || (isMain ? 24 : 18);
  const width = Number(dimensions.width) || Number(properties.baseWidth) || (isMain ? 12 : 9);
  const height = Number(dimensions.height) || (isMain ? 34 : 20);

  const storeShowLabels = useQueueStore((state) => state.showLabels);
  const isCapacityModalOpen = useCapacityExpansionStore((state) => state.isOpen);
  const isSaveModalOpen = useQueueStore((state) => state.isSaveModalOpen);
  const isPlansModalOpen = useQueueStore((state) => state.isPlansModalOpen);
  const isAnyModalOpen = isCapacityModalOpen || isSaveModalOpen || isPlansModalOpen;
  const showLabels = !isAnyModalOpen && (propShowLabels !== undefined ? propShowLabels : (storeShowLabels ?? true));

  const tiers = Math.max(3, Math.min(13, Number(properties.tiers) || (isMain ? 7 : 5)));
  // Odd number of Kalasams ensures an exact central peak finial (traditional temple agama rule)
  const baseKalasams = Number(properties.kalasams) || (isMain ? 7 : 5);
  const kalasamCount = baseKalasams % 2 === 0 ? baseKalasams + 1 : baseKalasams;

  const archWidth = Math.min(
    length * 0.65,
    Math.max(3.6, Number(properties.gatewayWidth || properties.archWidth) || (isMain ? 7.2 : 5.2))
  );
  const archHeight = Math.min(
    height * 0.35,
    Math.max(3.8, Number(properties.archHeight) || (isMain ? 6.5 : 5.0))
  );

  // Authentic Historic Dravidian Stone Palette
  const baseGranite = '#7A6E5F'; // Heavy foundation plinth granite
  const stoneColor = '#B5A693'; // Warm weathered temple limestone/sandstone
  const moldStone = '#8E8070'; // Carved architectural moldings & pilasters
  const stoneHighlight = '#D8CEBD'; // Dressed stone sculptures, capitals, and relief highlights
  const turquoiseBand = '#4A7882'; // Weathered temple verdigris blue band
  const terracottaBand = '#9C4E36'; // Traditional terracotta / red ochre frieze band
  const deepShadow = '#221A14'; // Deep niche cavities, ceiling, and undercut shadow soffits
  const antiqueGold = '#D4AF37'; // Sacred temple brass/gold for Kalasams & sanctum deity
  const doorWood = '#382619'; // Seasoned carved dark teak doors

  const baseHeight = archHeight + (isMain ? 1.8 : 1.5);
  const pylonWidth = Math.max(1.0, (length - archWidth) / 2);

  const tierData = useMemo(() => {
    return calculateDravidianTierData({ length, width, height, tiers, baseHeight, isMain });
  }, [length, width, height, tiers, baseHeight, isMain]);

  return (
    <group>
      {/* ========================================================================= */}
      {/* 1. MONUMENTAL ADHISHTHANA PLINTH (Stepped Dravidian Foundation Courses)   */}
      {/* ========================================================================= */}
      {[-1, 1].map((side) => {
        const pylonCenterX = side * (archWidth / 2 + pylonWidth / 2);
        return (
          <group key={`plinth-pylon-${side}`}>
            {/* 1.1 Upana: Bottom foundation footing */}
            <mesh position={[pylonCenterX, 0.22, 0]} receiveShadow>
              <boxGeometry args={[pylonWidth + 1.1, 0.44, width + 1.6]} />
              <meshStandardMaterial color={baseGranite} roughness={0.88} />
            </mesh>
            {/* 1.2 Jagati: Vertical dressed ashlar block course */}
            <mesh position={[pylonCenterX, 0.54, 0]} receiveShadow>
              <boxGeometry args={[pylonWidth + 0.85, 0.24, width + 1.3]} />
              <meshStandardMaterial color={moldStone} roughness={0.82} />
            </mesh>
            {/* 1.3 Kumuda: Bold projecting torus/bullnose molding course */}
            <mesh position={[pylonCenterX, 0.76, 0]} receiveShadow>
              <boxGeometry args={[pylonWidth + 0.98, 0.20, width + 1.45]} />
              <meshStandardMaterial color={baseGranite} roughness={0.76} />
            </mesh>
            {/* 1.4 Kantha: Recessed necking band with dark shadow slot */}
            <mesh position={[pylonCenterX, 0.92, 0]} receiveShadow>
              <boxGeometry args={[pylonWidth + 0.50, 0.12, width + 1.05]} />
              <meshStandardMaterial color={deepShadow} roughness={0.92} />
            </mesh>
            {/* 1.5 Pattika: Upper plinth coping shelf */}
            <mesh position={[pylonCenterX, 1.04, 0]} receiveShadow>
              <boxGeometry args={[pylonWidth + 0.70, 0.14, width + 1.2]} />
              <meshStandardMaterial color={stoneHighlight} roughness={0.72} />
            </mesh>
          </group>
        );
      })}

      {/* ========================================================================= */}
      {/* 2. GRAND WALKABLE MAHA DWARA GATEWAY                                      */}
      {/* ========================================================================= */}
      {/* Continuous Ground Threshold Stone Course (Flush, Walkable) */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[archWidth, 0.06, width + 0.8]} />
        <meshStandardMaterial color={baseGranite} roughness={0.85} />
      </mesh>
      {/* Continuing Dressed Stone Walkway Pavement */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[archWidth - 0.1, 0.04, width + 0.5]} />
        <meshStandardMaterial color="#9E907E" roughness={0.75} />
      </mesh>

      {/* Heavy Stone Gateway Ceiling Overhead with Transverse Beams */}
      <mesh position={[0, archHeight + 0.20, 0]} castShadow receiveShadow>
        <boxGeometry args={[archWidth + 0.6, 0.40, width - 0.1]} />
        <meshStandardMaterial color={deepShadow} roughness={0.88} />
      </mesh>
      {[-width * 0.32, 0, width * 0.32].map((bZ, bIdx) => (
        <mesh key={`ceiling-beam-${bIdx}`} position={[0, archHeight + 0.04, bZ]} castShadow>
          <boxGeometry args={[archWidth + 0.3, 0.24, 0.45]} />
          <meshStandardMaterial color={moldStone} roughness={0.75} />
        </mesh>
      ))}

      {/* Folded Open Carved Teak Doors against Jamb Reveals (Leaving Central Passage 100% Open) */}
      {[-1, 1].map((doorSide) => (
        <group
          key={`open-door-${doorSide}`}
          position={[doorSide * (archWidth / 2 - 0.28), 0.08, -width * 0.12]}
          rotation={[0, doorSide * THREE.MathUtils.degToRad(84), 0]}
        >
          <mesh position={[doorSide * (archWidth * 0.22), archHeight * 0.46, 0]} castShadow>
            <boxGeometry args={[archWidth * 0.45, archHeight * 0.90, 0.18]} />
            <meshStandardMaterial color={doorWood} roughness={0.65} metalness={0.15} />
          </mesh>
          {[-1.2, -0.6, 0, 0.6, 1.2].map((sZ, bIdx) => (
            <mesh key={`boss-${bIdx}`} position={[doorSide * (archWidth * 0.22), archHeight * 0.46 + sZ, 0.11]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color={antiqueGold} roughness={0.3} metalness={0.8} />
            </mesh>
          ))}
        </group>
      ))}

      {/* SACRED ILLUMINATED DEITY — EXCLUSIVELY IN CENTRAL DARSHAN GOPURAM (isMain = true) */}
      {isMain && (
        <group position={[0, archHeight * 0.40, 0]}>
          {/* Stone Pedestal */}
          <mesh position={[0, -archHeight * 0.22, 0]} castShadow>
            <boxGeometry args={[1.2, 0.45, 1.0]} />
            <meshStandardMaterial color={baseGranite} roughness={0.8} />
          </mesh>
          {/* Golden Deity Figure */}
          <mesh position={[0, 0.1, 0]} castShadow>
            <capsuleGeometry args={[0.34, archHeight * 0.36, 8, 12]} />
            <meshStandardMaterial color={antiqueGold} roughness={0.25} metalness={0.85} />
          </mesh>
          {/* Golden Mukuta Crown */}
          <mesh position={[0, archHeight * 0.28, 0]} castShadow>
            <coneGeometry args={[0.28, 0.55, 12]} />
            <meshStandardMaterial color={antiqueGold} roughness={0.22} metalness={0.9} />
          </mesh>
          {/* Prabhavali Aureole Halo */}
          <mesh position={[0, 0.15, -0.15]} castShadow>
            <boxGeometry args={[1.4, archHeight * 0.58, 0.14]} />
            <meshStandardMaterial color={antiqueGold} roughness={0.3} metalness={0.75} />
          </mesh>
          {/* Sanctum Diya Lantern Glow */}
          <pointLight position={[0, 0.5, 0.8]} color="#F59E0B" intensity={3.5} distance={14} />
        </group>
      )}

      {/* ========================================================================= */}
      {/* 3. LOWER GOPURAM MANDAPA: CARVED TEMPLE PILLARS (Ref Image 2 & 3)        */}
      {/* ========================================================================= */}
      {/* Front & Rear Facades: Authentic Dravidian Pillar Colonnade */}
      {[-1, 1].map((faceZ) => {
        const posZ = faceZ * (width / 2 + 0.35);
        const colCount = Math.max(6, Math.round(length / 2.6));
        const stepX = (length - archWidth) / 2 / (colCount / 2);

        return (
          <group key={`mandapa-colonnade-${faceZ}`}>
            {/* Left and Right Pillared Porticos flanking the gateway */}
            {[-1, 1].map((side) => {
              const startX = side * (archWidth / 2 + 0.4);
              const pCountHalf = Math.floor(colCount / 2);

              return Array.from({ length: pCountHalf }).map((_, pIdx) => {
                const posX = startX + side * pIdx * stepX;

                return (
                  <group key={`stambha-${side}-${pIdx}`} position={[posX, 1.04, posZ]}>
                    {/* Oma: Square Carved Plinth */}
                    <mesh position={[0, 0.22, 0]} castShadow>
                      <boxGeometry args={[0.62, 0.44, 0.62]} />
                      <meshStandardMaterial color={baseGranite} roughness={0.76} />
                    </mesh>
                    {/* Segmented Lower Shaft */}
                    <mesh position={[0, 0.85, 0]} castShadow>
                      <cylinderGeometry args={[0.22, 0.25, 0.82, 12]} />
                      <meshStandardMaterial color={moldStone} roughness={0.70} />
                    </mesh>
                    {/* Kalasa: Bulging Pot Torus Ring */}
                    <mesh position={[0, 1.45, 0]} castShadow>
                      <cylinderGeometry args={[0.34, 0.34, 0.32, 14]} />
                      <meshStandardMaterial color={stoneHighlight} roughness={0.65} />
                    </mesh>
                    {/* Idal: Flaring Lotus Capital */}
                    <mesh position={[0, 1.82, 0]} castShadow>
                      <coneGeometry args={[0.42, 0.40, 14]} rotation={[Math.PI, 0, 0]} />
                      <meshStandardMaterial color={moldStone} roughness={0.65} />
                    </mesh>
                    {/* Bodika: Projecting Pushpa-Potika Corbel Bracket Capital */}
                    <mesh position={[0, 2.15, 0]} castShadow>
                      <boxGeometry args={[0.82, 0.26, 0.82]} />
                      <meshStandardMaterial color={stoneHighlight} roughness={0.60} />
                    </mesh>
                    {/* Upper Extension Shaft to Beam */}
                    <mesh position={[0, (archHeight - 1.04) * 0.78, 0]} castShadow>
                      <cylinderGeometry args={[0.24, 0.24, (archHeight - 1.04) * 0.44, 12]} />
                      <meshStandardMaterial color={moldStone} roughness={0.70} />
                    </mesh>
                  </group>
                );
              });
            })}
          </group>
        );
      })}

      {/* Side Facades (East & West): Side Mandapa Colonnade */}
      {[-1, 1].map((faceX) => {
        const posX = faceX * (length / 2 + 0.35);
        const colCount = Math.max(3, Math.round(width / 3.0));
        const stepZ = (width - 1.4) / (colCount + 1);

        return (
          <group key={`side-colonnade-${faceX}`}>
            {Array.from({ length: colCount }).map((_, cIdx) => {
              const posZ = -width / 2 + 0.7 + (cIdx + 1) * stepZ;
              return (
                <group key={`side-stambha-${cIdx}`} position={[posX, 1.04, posZ]}>
                  <mesh position={[0, 0.22, 0]} castShadow>
                    <boxGeometry args={[0.58, 0.44, 0.58]} />
                    <meshStandardMaterial color={baseGranite} roughness={0.76} />
                  </mesh>
                  <mesh position={[0, (archHeight - 1.04) * 0.45, 0]} castShadow>
                    <cylinderGeometry args={[0.22, 0.24, (archHeight - 1.04) * 0.85, 12]} />
                    <meshStandardMaterial color={moldStone} roughness={0.70} />
                  </mesh>
                  <mesh position={[0, archHeight - 1.04 - 0.15, 0]} castShadow>
                    <boxGeometry args={[0.76, 0.26, 0.76]} />
                    <meshStandardMaterial color={stoneHighlight} roughness={0.60} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}

      {/* Monumental Torana Arch & Doorposts flanking Portal Opening */}
      {[-1, 1].map((face) => (
        <group key={`outer-torana-${face}`} position={[0, 0.55, face * (width / 2 + 0.18)]}>
          <mesh position={[-archWidth / 2 - 0.32, archHeight / 2, 0]} castShadow>
            <boxGeometry args={[0.64, archHeight, 0.42]} />
            <meshStandardMaterial color={baseGranite} roughness={0.70} />
          </mesh>
          <mesh position={[archWidth / 2 + 0.32, archHeight / 2, 0]} castShadow>
            <boxGeometry args={[0.64, archHeight, 0.42]} />
            <meshStandardMaterial color={baseGranite} roughness={0.70} />
          </mesh>
          <mesh position={[0, archHeight + 0.35, 0]} castShadow>
            <boxGeometry args={[archWidth + 2.0, 0.70, 0.45]} />
            <meshStandardMaterial color={moldStone} roughness={0.68} />
          </mesh>
          <mesh position={[0, archHeight + 0.90, 0.10]} castShadow>
            <boxGeometry args={[archWidth * 0.52, 0.52, 0.28]} />
            <meshStandardMaterial color={terracottaBand} roughness={0.62} />
          </mesh>
        </group>
      ))}

      {/* Massive Gateway Entablature Beam course over entrance */}
      <mesh position={[0, archHeight + 0.90 + 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[length + 1.2, 1.60, width + 1.1]} />
        <meshStandardMaterial color={baseGranite} roughness={0.74} />
      </mesh>

      {/* Base Projecting Kapota Cornice with Drip Mold over Pillars */}
      <mesh position={[0, archHeight + 1.85 + 0.55, 0]} castShadow>
        <boxGeometry args={[length + 2.0, 0.45, width + 1.8]} />
        <meshStandardMaterial color={moldStone} roughness={0.65} />
      </mesh>

      {/* ========================================================================= */}
      {/* 4. DENSE SCULPTURAL TALA TIERS (Matching Reference Image 2 & 3)          */}
      {/* ========================================================================= */}
      {tierData.map((tier) => {
        const halfL = tier.length / 2;
        const halfW = tier.width / 2;

        const frontSculptureCount = Math.max(8, Math.round(tier.length / 1.5));
        const sideSculptureCount = Math.max(4, Math.round(tier.width / 1.7));
        const frontStep = (tier.length - 1.4) / (frontSculptureCount + 1);
        const sideStep = (tier.width - 1.2) / (sideSculptureCount + 1);

        return (
          <group key={`tier-${tier.index}`}>
            {/* 4.1 Structural Tier Hub */}
            <mesh position={[0, tier.y, 0]} castShadow receiveShadow>
              <boxGeometry args={[tier.length * 0.72, tier.height * 0.86, tier.width * 0.68]} />
              <meshStandardMaterial color={deepShadow} roughness={0.85} />
            </mesh>

            {/* 4.2 Lower Terracotta Frieze Band */}
            <mesh position={[0, tier.y - tier.height * 0.38, 0]} castShadow>
              <boxGeometry args={[tier.length + 0.3, tier.height * 0.12, tier.width + 0.3]} />
              <meshStandardMaterial color={terracottaBand} roughness={0.70} />
            </mesh>

            {/* 4.3 Upper Turquoise / Verdigris Cornice Band */}
            <mesh position={[0, tier.y + tier.height * 0.36, 0]} castShadow>
              <boxGeometry args={[tier.length + 0.4, tier.height * 0.14, tier.width + 0.4]} />
              <meshStandardMaterial color={turquoiseBand} roughness={0.65} />
            </mesh>

            {/* 4.4 Four Corner Karna Pavilions (Kutas with Golden Stupis) */}
            {[-1, 1].map((cx) =>
              [-1, 1].map((cz) => {
                const posX = cx * (halfL - tier.kutaW / 2);
                const posZ = cz * (halfW - tier.kutaD / 2);

                return (
                  <group key={`kuta-${cx}-${cz}`} position={[posX, tier.y, posZ]}>
                    <mesh position={[0, 0, 0]} castShadow receiveShadow>
                      <boxGeometry args={[tier.kutaW, tier.height * 0.72, tier.kutaD]} />
                      <meshStandardMaterial color={stoneHighlight} roughness={0.65} />
                    </mesh>
                    <mesh position={[cx * (tier.kutaW * 0.40), 0, cz * (tier.kutaD * 0.40)]}>
                      <boxGeometry args={[0.32, tier.height * 0.76, 0.32]} />
                      <meshStandardMaterial color={moldStone} roughness={0.62} />
                    </mesh>
                    <mesh position={[0, -tier.height * 0.04, cz * (tier.kutaD * 0.52)]}>
                      <capsuleGeometry args={[0.16, tier.height * 0.34, 6, 8]} />
                      <meshStandardMaterial color={stoneHighlight} roughness={0.60} />
                    </mesh>
                    <mesh position={[0, tier.height * 0.44, 0]}>
                      <coneGeometry args={[tier.kutaW * 0.75, tier.height * 0.32, 4]} rotation={[0, Math.PI / 4, 0]} />
                      <meshStandardMaterial color={moldStone} roughness={0.60} />
                    </mesh>
                    <mesh position={[0, tier.height * 0.64, 0]}>
                      <coneGeometry args={[0.15, tier.height * 0.24, 8]} />
                      <meshStandardMaterial color={antiqueGold} roughness={0.28} metalness={0.80} />
                    </mesh>
                  </group>
                );
              })
            )}

            {/* 4.5 Central Axial Bhadra / Sala Pavilions (Front & Rear) */}
            {[-1, 1].map((faceZ) => {
              const posZ = faceZ * (halfW + tier.projBhadraZ / 2);

              return (
                <group key={`bhadra-z-${faceZ}`} position={[0, tier.y, posZ]}>
                  <mesh position={[0, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[tier.bhadraW, tier.height * 0.82, tier.projBhadraZ + 0.15]} />
                    <meshStandardMaterial color={stoneHighlight} roughness={0.65} />
                  </mesh>
                  {/* Central Deep Sanctum Alcove */}
                  <mesh position={[0, -tier.height * 0.02, faceZ * (tier.projBhadraZ * 0.38)]}>
                    <boxGeometry args={[tier.bhadraW * 0.44, tier.height * 0.60, 0.42]} />
                    <meshStandardMaterial color={deepShadow} roughness={0.92} />
                  </mesh>
                  {/* Central Sacred Deity Relief */}
                  <group position={[0, -tier.height * 0.05, faceZ * (tier.projBhadraZ * 0.42)]}>
                    <mesh position={[0, 0, 0]}>
                      <capsuleGeometry args={[0.22, tier.height * 0.34, 6, 10]} />
                      <meshStandardMaterial color={antiqueGold} roughness={0.3} metalness={0.7} />
                    </mesh>
                    <mesh position={[0, tier.height * 0.24, 0]}>
                      <coneGeometry args={[0.20, 0.28, 8]} />
                      <meshStandardMaterial color={antiqueGold} roughness={0.25} metalness={0.8} />
                    </mesh>
                  </group>
                  {/* Sala Shikhara Barrel Roof */}
                  <mesh position={[0, tier.height * 0.46, 0]}>
                    <boxGeometry args={[tier.bhadraW * 0.96, tier.height * 0.22, tier.projBhadraZ * 0.85]} />
                    <meshStandardMaterial color={moldStone} roughness={0.62} />
                  </mesh>
                  {/* Golden Stupi */}
                  <mesh position={[0, tier.height * 0.66, 0]}>
                    <coneGeometry args={[0.15, tier.height * 0.24, 8]} />
                    <meshStandardMaterial color={antiqueGold} roughness={0.25} metalness={0.85} />
                  </mesh>
                </group>
              );
            })}

            {/* 4.6 DENSE ROW OF STANDING TEMPLE FIGURES (MURTIS) - FRONT & REAR */}
            {[-1, 1].map((faceZ) => {
              const posZ = faceZ * (halfW + 0.24);

              return (
                <group key={`sculpture-row-z-${faceZ}`}>
                  {Array.from({ length: frontSculptureCount }).map((_, sIdx) => {
                    const posX = -halfL + 0.7 + (sIdx + 1) * frontStep;
                    if (Math.abs(posX) < tier.bhadraW * 0.42) return null;

                    return (
                      <group key={`murti-z-${sIdx}`} position={[posX, tier.y - tier.height * 0.05, posZ]}>
                        <mesh position={[0, 0, -faceZ * 0.12]}>
                          <boxGeometry args={[0.65, tier.height * 0.68, 0.26]} />
                          <meshStandardMaterial color={deepShadow} roughness={0.92} />
                        </mesh>
                        <mesh position={[0, -tier.height * 0.26, 0]}>
                          <boxGeometry args={[0.52, tier.height * 0.12, 0.42]} />
                          <meshStandardMaterial color={baseGranite} roughness={0.78} />
                        </mesh>
                        <mesh position={[0, -tier.height * 0.12, 0]}>
                          <cylinderGeometry args={[0.18, 0.24, tier.height * 0.24, 10]} />
                          <meshStandardMaterial color={stoneHighlight} roughness={0.62} />
                        </mesh>
                        <mesh position={[0, tier.height * 0.06, 0]}>
                          <boxGeometry args={[0.38, tier.height * 0.22, 0.24]} />
                          <meshStandardMaterial color={stoneHighlight} roughness={0.60} />
                        </mesh>
                        <mesh position={[0, tier.height * 0.22, 0]}>
                          <cylinderGeometry args={[0.13, 0.16, tier.height * 0.15, 10]} />
                          <meshStandardMaterial color={stoneHighlight} roughness={0.60} />
                        </mesh>
                        <mesh position={[0, tier.height * 0.32, 0]}>
                          <coneGeometry args={[0.14, tier.height * 0.16, 10]} />
                          <meshStandardMaterial color={antiqueGold} roughness={0.3} metalness={0.6} />
                        </mesh>
                        <mesh position={[0, tier.height * 0.15, -faceZ * 0.08]}>
                          <boxGeometry args={[0.55, tier.height * 0.46, 0.08]} />
                          <meshStandardMaterial color={moldStone} roughness={0.65} />
                        </mesh>
                        <mesh position={[frontStep * 0.48, 0, 0]}>
                          <cylinderGeometry args={[0.08, 0.10, tier.height * 0.70, 8]} />
                          <meshStandardMaterial color={moldStone} roughness={0.68} />
                        </mesh>
                      </group>
                    );
                  })}
                </group>
              );
            })}

            {/* 4.7 DENSE ROW OF STANDING TEMPLE FIGURES (MURTIS) - SIDES (East & West) */}
            {[-1, 1].map((faceX) => {
              const posX = faceX * (halfL + 0.24);

              return (
                <group key={`sculpture-row-x-${faceX}`}>
                  {Array.from({ length: sideSculptureCount }).map((_, sIdx) => {
                    const posZ = -halfW + 0.6 + (sIdx + 1) * sideStep;

                    return (
                      <group key={`murti-x-${sIdx}`} position={[posX, tier.y - tier.height * 0.05, posZ]}>
                        <mesh position={[-faceX * 0.12, 0, 0]}>
                          <boxGeometry args={[0.26, tier.height * 0.65, 0.65]} />
                          <meshStandardMaterial color={deepShadow} roughness={0.92} />
                        </mesh>
                        <mesh position={[0, -tier.height * 0.25, 0]}>
                          <boxGeometry args={[0.42, tier.height * 0.12, 0.50]} />
                          <meshStandardMaterial color={baseGranite} roughness={0.78} />
                        </mesh>
                        <mesh position={[0, -tier.height * 0.08, 0]}>
                          <cylinderGeometry args={[0.18, 0.22, tier.height * 0.32, 8]} />
                          <meshStandardMaterial color={stoneHighlight} roughness={0.62} />
                        </mesh>
                        <mesh position={[0, tier.height * 0.22, 0]}>
                          <coneGeometry args={[0.14, tier.height * 0.25, 8]} />
                          <meshStandardMaterial color={antiqueGold} roughness={0.3} metalness={0.6} />
                        </mesh>
                        <mesh position={[0, 0, sideStep * 0.48]}>
                          <cylinderGeometry args={[0.08, 0.10, tier.height * 0.68, 8]} />
                          <meshStandardMaterial color={moldStone} roughness={0.68} />
                        </mesh>
                      </group>
                    );
                  })}
                </group>
              );
            })}

            {/* 4.8 THREE-TIER KAPOTA CORNICE WITH UNDERCUT SHADOW & KUDU MEDALLIONS */}
            <group position={[0, tier.y + tier.height * 0.44, 0]}>
              <mesh position={[0, -0.09, 0]} castShadow receiveShadow>
                <boxGeometry args={[tier.length + 0.20, 0.18, tier.width + 0.20]} />
                <meshStandardMaterial color={deepShadow} roughness={0.94} />
              </mesh>
              <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
                <boxGeometry
                  args={[
                    tier.length + tier.corniceOverhang * 2,
                    tier.height * 0.18,
                    tier.width + tier.corniceOverhang * 2,
                  ]}
                />
                <meshStandardMaterial color={moldStone} roughness={0.62} />
              </mesh>
              <mesh position={[0, tier.height * 0.15, 0]} castShadow>
                <boxGeometry
                  args={[
                    tier.length + tier.corniceOverhang * 1.5,
                    tier.height * 0.08,
                    tier.width + tier.corniceOverhang * 1.5,
                  ]}
                />
                <meshStandardMaterial color={stoneHighlight} roughness={0.60} />
              </mesh>

              {/* Dense Rows of Kudu Horseshoe Arch Medallions on ALL 4 Facades */}
              {[-1, 1].map((faceZ) => {
                const count = Math.max(6, Math.round(tier.length / 1.8));
                const step = tier.length / (count + 1);

                return (
                  <group key={`kudu-row-z-${faceZ}`} position={[0, 0.09, faceZ * (halfW + tier.corniceOverhang + 0.09)]}>
                    {Array.from({ length: count }).map((_, kIdx) => {
                      const kX = -halfL + (kIdx + 1) * step;
                      return (
                        <mesh key={`kudu-z-${kIdx}`} position={[kX, 0, 0]} castShadow>
                          <boxGeometry args={[0.38, tier.height * 0.16, 0.20]} />
                          <meshStandardMaterial color={stoneHighlight} roughness={0.58} />
                        </mesh>
                      );
                    })}
                  </group>
                );
              })}

              {[-1, 1].map((faceX) => {
                const count = Math.max(4, Math.round(tier.width / 2.0));
                const step = tier.width / (count + 1);

                return (
                  <group key={`kudu-row-x-${faceX}`} position={[faceX * (halfL + tier.corniceOverhang + 0.09), 0.09, 0]}>
                    {Array.from({ length: count }).map((_, kIdx) => {
                      const kZ = -halfW + (kIdx + 1) * step;
                      return (
                        <mesh key={`kudu-x-${kIdx}`} position={[0, 0, kZ]} castShadow>
                          <boxGeometry args={[0.20, tier.height * 0.16, 0.38]} />
                          <meshStandardMaterial color={stoneHighlight} roughness={0.58} />
                        </mesh>
                      );
                    })}
                  </group>
                );
              })}
            </group>
          </group>
        );
      })}

      {/* ========================================================================= */}
      {/* 5. FINISHED SYMMETRICAL CROWN & PERFECTLY ALIGNED KALASAMS (Ref Image 3)  */}
      {/* ========================================================================= */}
      {(() => {
        const topTier = tierData[tierData.length - 1];
        if (!topTier) return null;
        const shalaY = topTier.y + topTier.height * 0.5 + (isMain ? 1.6 : 1.3);
        const shalaL = topTier.length * 0.88;
        const shalaW = topTier.width * 0.82;
        const ridgeH = shalaW * 0.52;

        return (
          <group position={[0, shalaY, 0]}>
            {/* 5.1 Upper Terrace / Vedi Platform Base (Molded Parapet) */}
            <mesh position={[0, -0.65, 0]} receiveShadow>
              <boxGeometry args={[shalaL + 0.8, 0.38, shalaW + 0.8]} />
              <meshStandardMaterial color={baseGranite} roughness={0.76} />
            </mesh>
            <mesh position={[0, -0.38, 0]} receiveShadow>
              <boxGeometry args={[shalaL + 0.4, 0.20, shalaW + 0.4]} />
              <meshStandardMaterial color={stoneHighlight} roughness={0.65} />
            </mesh>

            {/* 5.2 Four Corner Symmetrical Golden Stupis on the crowning terrace */}
            {[-1, 1].map((cx) =>
              [-1, 1].map((cz) => (
                <group
                  key={`corner-stupi-${cx}-${cz}`}
                  position={[cx * (shalaL / 2 + 0.15), -0.25, cz * (shalaW / 2 + 0.15)]}
                >
                  <mesh position={[0, 0.10, 0]} castShadow>
                    <boxGeometry args={[0.42, 0.24, 0.42]} />
                    <meshStandardMaterial color={moldStone} roughness={0.68} />
                  </mesh>
                  <mesh position={[0, 0.44, 0]} castShadow>
                    <coneGeometry args={[0.22, 0.65, 10]} />
                    <meshStandardMaterial color={antiqueGold} roughness={0.25} metalness={0.85} />
                  </mesh>
                </group>
              ))
            )}

            {/* 5.3 Shala Wagon-Vault Barrel Roof (Ayatasra Shikhara) */}
            <mesh position={[0, ridgeH * 0.42, 0]} castShadow>
              <boxGeometry args={[shalaL, ridgeH * 0.84, shalaW * 0.92]} />
              <meshStandardMaterial color={baseGranite} roughness={0.68} />
            </mesh>
            <mesh position={[0, ridgeH * 0.78, 0]} castShadow>
              <boxGeometry args={[shalaL * 0.96, ridgeH * 0.32, shalaW * 0.72]} />
              <meshStandardMaterial color={moldStone} roughness={0.65} />
            </mesh>
            <mesh position={[0, ridgeH * 0.50, 0]}>
              <boxGeometry args={[shalaL + 0.1, 0.12, shalaW + 0.05]} />
              <meshStandardMaterial color={terracottaBand} roughness={0.65} />
            </mesh>

            {/* 5.4 Elevated Solid Ridge Plinth (Kalasam-Peetha) - GUARANTEES ZERO FLOATING */}
            <mesh position={[0, ridgeH + 0.12, 0]} castShadow receiveShadow>
              <boxGeometry args={[shalaL * 0.94, 0.24, 0.72]} />
              <meshStandardMaterial color={moldStone} roughness={0.62} />
            </mesh>

            {/* 5.5 Symmetrical High-Relief Mahanaasika Horseshoe Gable Arches on Both Ends (Ref Image 3) */}
            {[-shalaL / 2, shalaL / 2].map((endX, eIdx) => (
              <group key={`end-kudu-${eIdx}`} position={[endX, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                {/* Outer Gable Wall */}
                <mesh castShadow>
                  <circleGeometry args={[ridgeH * 1.05, 24]} />
                  <meshStandardMaterial color={moldStone} roughness={0.62} side={THREE.DoubleSide} />
                </mesh>
                {/* Concentric Turquoise / Verdigris Medallion Ring */}
                <mesh position={[0, 0, 0.06]} castShadow>
                  <ringGeometry args={[ridgeH * 0.65, ridgeH * 0.95, 24]} />
                  <meshStandardMaterial color={turquoiseBand} roughness={0.60} side={THREE.DoubleSide} />
                </mesh>
                {/* Terracotta Inner Medallion */}
                <mesh position={[0, 0, 0.08]} castShadow>
                  <circleGeometry args={[ridgeH * 0.55, 18]} />
                  <meshStandardMaterial color={terracottaBand} roughness={0.65} side={THREE.DoubleSide} />
                </mesh>
                {/* Symmetrical Left and Right Upward-Curving Gable Horns (Simhamukha / Cornucopia scrolls) */}
                {[-1, 1].map((hornSide) => (
                  <mesh
                    key={`gable-horn-${hornSide}`}
                    position={[hornSide * (ridgeH * 0.78), ridgeH * 0.62, 0.08]}
                    rotation={[0, 0, hornSide * THREE.MathUtils.degToRad(-35)]}
                    castShadow
                  >
                    <boxGeometry args={[0.24, ridgeH * 0.65, 0.20]} />
                    <meshStandardMaterial color={stoneHighlight} roughness={0.58} />
                  </mesh>
                ))}
                {/* Central Apex Flame Finial */}
                <mesh position={[0, ridgeH * 1.12, 0.10]} castShadow>
                  <coneGeometry args={[0.26, 0.60, 10]} />
                  <meshStandardMaterial color={antiqueGold} roughness={0.25} metalness={0.8} />
                </mesh>
              </group>
            ))}

            {/* 5.6 PERFECTLY CENTERED, SYMMETRICAL & VERTICALLY ALIGNED GOLDEN KALASAMS */}
            {(() => {
              // Calculate parametric spacing so kalasams span the ridge symmetrically
              const kalasaSpan = shalaL * 0.88;
              const spacing = kalasaSpan / (kalasamCount - 1);
              const startX = -kalasaSpan / 2;

              return Array.from({ length: kalasamCount }).map((_, kIdx) => {
                const posX = startX + kIdx * spacing;
                const isCenter = kIdx === Math.floor(kalasamCount / 2);
                // Center kalasam is slightly grander (+12% scale) per classical Agama hierarchy
                const scaleK = isCenter ? 1.14 : 1.0;
                const potR = (isMain ? 0.32 : 0.26) * scaleK;
                const spireH = (isMain ? 1.25 : 1.0) * scaleK;

                return (
                  <group
                    key={`kalasa-${kIdx}`}
                    position={[posX, ridgeH + 0.24, 0]}
                  >
                    {/* Molded Base Pedestal Sitting Firmly on Ridge Plinth */}
                    <mesh position={[0, 0.08, 0]} castShadow>
                      <cylinderGeometry args={[potR * 0.95, potR * 1.1, 0.16, 14]} />
                      <meshStandardMaterial color={baseGranite} roughness={0.72} />
                    </mesh>
                    {/* Spherical Pot Body (Kumbha / Ghatam) */}
                    <mesh position={[0, 0.16 + potR, 0]} castShadow>
                      <sphereGeometry args={[potR, 16, 16]} />
                      <meshStandardMaterial color={antiqueGold} roughness={0.20} metalness={0.90} />
                    </mesh>
                    {/* Necking Ring */}
                    <mesh position={[0, 0.16 + potR * 1.85, 0]} castShadow>
                      <cylinderGeometry args={[potR * 0.45, potR * 0.55, 0.12, 14]} />
                      <meshStandardMaterial color={antiqueGold} roughness={0.22} metalness={0.88} />
                    </mesh>
                    {/* Tapered Needle Spire (Stupika) */}
                    <mesh position={[0, 0.16 + potR * 1.95 + spireH / 2, 0]} castShadow>
                      <coneGeometry args={[potR * 0.42, spireH, 16]} />
                      <meshStandardMaterial color={antiqueGold} roughness={0.18} metalness={0.92} />
                    </mesh>
                    {/* Tip Finial Needle Pearl */}
                    <mesh position={[0, 0.16 + potR * 1.95 + spireH + 0.06, 0]} castShadow>
                      <sphereGeometry args={[0.08 * scaleK, 10, 10]} />
                      <meshStandardMaterial color={antiqueGold} roughness={0.15} metalness={0.95} />
                    </mesh>
                  </group>
                );
              });
            })()}
          </group>
        );
      })()}

      {/* ========================================================================= */}
      {/* 6. CENTRAL RAJA GOPURAM MANDAPA WALKWAY (Only for Main Darshan Gopuram)   */}
      {/* ========================================================================= */}
      {isMain && (
        <group position={[0, 0.25, -width / 2 - 3.2]}>
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <boxGeometry args={[archWidth + 3.0, 0.16, 6.4]} />
            <meshStandardMaterial color={baseGranite} roughness={0.75} />
          </mesh>
          {[-archWidth / 2 - 1.0, archWidth / 2 + 1.0].map((colX, sideIdx) => (
            <group key={`colonnade-${sideIdx}`}>
              {[-2.0, 0, 2.0].map((colZ, pIdx) => (
                <mesh key={`pillar-${pIdx}`} position={[colX, (archHeight * 0.72) / 2, colZ]} castShadow>
                  <cylinderGeometry args={[0.22, 0.28, archHeight * 0.72, 12]} />
                  <meshStandardMaterial color={stoneColor} roughness={0.65} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}

      {/* Contextual Identification Badge */}
      {showLabels && (
        <Html position={[0, height + 2.4, 0]} center distanceFactor={40} zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none px-3.5 py-1.5 rounded-xl bg-stone-950/95 border border-amber-400 text-amber-200 font-bold text-xs tracking-wider shadow-2xl flex items-center gap-2 whitespace-nowrap">
            <span className="text-amber-400 font-serif font-black text-sm">
              {isMain ? '👑' : '⛩️'}
            </span>
            <span>{component.name || (isMain ? 'MAIN DARSHAN GOPURAM' : 'ENTRANCE GOPURAM')}</span>
            <span className="text-[10px] text-amber-300 font-normal">
              | {tiers} TALAS ({height}m)
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
