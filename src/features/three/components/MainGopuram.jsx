import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useQueueStore } from '../../../store/useQueueStore.js';

/**
 * Authentic Dravidian Main Raja Gopuram (Major Architectural Landmark)
 * Majestic 7-tier stepped tower terminating queue approach before inner sanctum.
 */
export function MainGopuram({ component, isSelected, showLabels: propShowLabels }) {
  const { dimensions = {}, properties = {} } = component;
  const length = dimensions.length || 22; // Width across facade (X)
  const width = dimensions.width || 12;   // Depth along axis (Z)
  const height = dimensions.height || 32; // Tower height (Y)
  const storeShowLabels = useQueueStore((state) => state.showLabels);
  const showLabels = propShowLabels !== undefined ? propShowLabels : (storeShowLabels ?? true);

  const tiers = properties.tiers || 7;
  const kalasamCount = properties.kalasams || 7;
  const archWidth = properties.archWidth || Math.min(length * 0.32, 6);
  const archHeight = properties.archHeight || Math.min(height * 0.22, 6.5);

  // Sacred Temple Palette
  const graniteBase = '#6B543D'; // Heavy carved base plinth
  const warmStone = properties.stoneColor || '#9C7A5B'; // Tower tier stone
  const decorativeRed = '#80182C'; // Crimson temple ochre
  const pureGold = '#E5B83A'; // Temple brass/gold

  // Compute 7 tapering tiers
  const tierData = useMemo(() => {
    const list = [];
    const baseH = archHeight + 1.8;
    const remainingH = height - baseH - 2.8;
    const tierH = remainingH / tiers;

    for (let i = 0; i < tiers; i++) {
      const taper = 1 - (i / tiers) * 0.58;
      const tL = (length - 2.0) * taper;
      const tW = (width - 1.8) * taper;
      const tY = baseH + i * tierH + tierH / 2;
      list.push({ index: i, length: tL, width: tW, height: tierH, y: tY });
    }
    return list;
  }, [length, width, height, tiers, archHeight]);

  const pylonWidth = (length - archWidth) / 2;
  const baseH = archHeight + 1.8;

  return (
    <group>
      {/* 0. Grand Temple Forecourt Platform & Ceremonial Courtyard Terrace */}
      <mesh position={[0, 0.12, 1.5]} receiveShadow>
        <boxGeometry args={[length + 8.0, 0.24, width + 11.0]} />
        <meshStandardMaterial color="#7E6852" roughness={0.82} />
      </mesh>
      {/* Polished stone inner courtyard paving */}
      <mesh position={[0, 0.25, 1.5]} receiveShadow>
        <boxGeometry args={[length + 6.8, 0.04, width + 9.8]} />
        <meshStandardMaterial color="#9F886E" roughness={0.72} />
      </mesh>
      {/* Forecourt Perimeter Diya Stambhas (Sacred Brass Oil Lamps) at Courtyard Corners */}
      {[
        [-(length / 2 + 3.2), width / 2 + 6.0],
        [(length / 2 + 3.2), width / 2 + 6.0],
        [-(length / 2 + 3.2), -width / 2 - 3.0],
        [(length / 2 + 3.2), -width / 2 - 3.0],
      ].map(([cX, cZ], lampIdx) => (
        <group key={`courtyard-diya-${lampIdx}`} position={[cX, 0.25, cZ]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.24, 1.0, 12]} />
            <meshStandardMaterial color={graniteBase} roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.15, 0]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color={pureGold} roughness={0.2} metalness={0.9} />
          </mesh>
          <pointLight position={[0, 1.3, 0]} color="#F59E0B" intensity={0.8} distance={7} />
        </group>
      ))}

      {/* Connecting Mandapa Walkway toward Darshan Sanctum */}
      <group position={[0, 0.25, -width / 2 - 3.2]}>
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <boxGeometry args={[archWidth + 3.0, 0.16, 6.4]} />
          <meshStandardMaterial color={graniteBase} roughness={0.75} />
        </mesh>
        {[-archWidth / 2 - 1.0, archWidth / 2 + 1.0].map((colX, sideIdx) => (
          <group key={`colonnade-${sideIdx}`}>
            {[-2.0, 0, 2.0].map((colZ, pIdx) => (
              <mesh key={`pillar-${pIdx}`} position={[colX, (archHeight * 0.72) / 2, colZ]} castShadow>
                <cylinderGeometry args={[0.2, 0.26, archHeight * 0.72, 12]} />
                <meshStandardMaterial color={warmStone} roughness={0.65} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0, archHeight * 0.72 + 0.18, 0]} castShadow>
          <boxGeometry args={[archWidth + 3.2, 0.36, 6.5]} />
          <meshStandardMaterial color={graniteBase} roughness={0.7} />
        </mesh>
      </group>

      {/* 1. Grand Adhisthana Sculpted Plinth Foundation */}
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <boxGeometry args={[length + 2.0, 0.8, width + 1.8]} />
        <meshStandardMaterial color={graniteBase} roughness={0.85} />
      </mesh>
      {/* Upper Plinth Step */}
      <mesh position={[0, 0.85, 0]} receiveShadow>
        <boxGeometry args={[length + 1.2, 0.3, width + 1.0]} />
        <meshStandardMaterial color={warmStone} roughness={0.75} />
      </mesh>

      {/* 2. Lower Gateway Pylons (Left & Right flanking ceremonial portal) */}
      <mesh position={[-(archWidth / 2 + pylonWidth / 2), baseH / 2 + 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[pylonWidth, baseH, width]} />
        <meshStandardMaterial color={warmStone} roughness={0.7} />
      </mesh>
      <mesh position={[(archWidth / 2 + pylonWidth / 2), baseH / 2 + 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[pylonWidth, baseH, width]} />
        <meshStandardMaterial color={warmStone} roughness={0.7} />
      </mesh>

      {/* Sculpted Pilasters / Stambha Columns along facade */}
      {[-1, 1].map((side) => (
        <group key={`mg-pylon-${side}`} position={[side * (archWidth / 2 + pylonWidth / 2), 0.85, 0]}>
          {[-pylonWidth * 0.38, 0, pylonWidth * 0.38].map((offX, pIdx) => (
            <mesh key={pIdx} position={[offX, baseH / 2, width / 2 + 0.12]} castShadow>
              <boxGeometry args={[0.5, baseH * 0.92, 0.22]} />
              <meshStandardMaterial color={graniteBase} roughness={0.65} />
            </mesh>
          ))}
          {/* Rear pilasters */}
          {[-pylonWidth * 0.38, 0, pylonWidth * 0.38].map((offX, pIdx) => (
            <mesh key={`rear-mg-${pIdx}`} position={[offX, baseH / 2, -width / 2 - 0.12]} castShadow>
              <boxGeometry args={[0.5, baseH * 0.92, 0.22]} />
              <meshStandardMaterial color={graniteBase} roughness={0.65} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 3. Grand Gateway Lintel Beam */}
      <mesh position={[0, archHeight + 1.2 + 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[length + 0.8, 1.5, width + 0.5]} />
        <meshStandardMaterial color={graniteBase} roughness={0.7} />
      </mesh>
      {/* Decorative Red Ochre Band */}
      <mesh position={[0, archHeight + 2.1 + 0.85, 0]}>
        <boxGeometry args={[length + 1.0, 0.35, width + 0.6]} />
        <meshStandardMaterial color={decorativeRed} roughness={0.5} />
      </mesh>

      {/* 4. 7 Stepped Pyramidal Tiers (Raja Tala Storeys) */}
      {tierData.map((tier) => (
        <group key={`mg-tier-${tier.index}`}>
          {/* Tier Core Body */}
          <mesh position={[0, tier.y, 0]} castShadow receiveShadow>
            <boxGeometry args={[tier.length, tier.height * 0.84, tier.width]} />
            <meshStandardMaterial color={warmStone} roughness={0.68} />
          </mesh>

          {/* Projecting Eaves Cornice (Kapota) */}
          <mesh position={[0, tier.y + tier.height * 0.42, 0]} castShadow>
            <boxGeometry args={[tier.length + 0.8, tier.height * 0.16, tier.width + 0.8]} />
            <meshStandardMaterial color={graniteBase} roughness={0.6} />
          </mesh>

          {/* Golden Center Shrine Niche Relief */}
          <mesh position={[0, tier.y, tier.width / 2 + 0.12]}>
            <boxGeometry args={[tier.length * 0.32, tier.height * 0.65, 0.25]} />
            <meshStandardMaterial color={pureGold} roughness={0.3} metalness={0.7} />
          </mesh>
          {/* Flanking Niches */}
          {[-tier.length * 0.3, tier.length * 0.3].map((sideX, nIdx) => (
            <mesh key={nIdx} position={[sideX, tier.y, tier.width / 2 + 0.12]}>
              <boxGeometry args={[tier.length * 0.16, tier.height * 0.5, 0.2]} />
              <meshStandardMaterial color={decorativeRed} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 5. Majestic Shala Barrel-Vaulted Crest Roof */}
      {(() => {
        const topTier = tierData[tierData.length - 1];
        if (!topTier) return null;
        const shalaY = topTier.y + topTier.height * 0.5 + 1.2;
        const shalaL = topTier.length * 0.9;
        const shalaW = topTier.width * 0.85;

        return (
          <group position={[0, shalaY, 0]}>
            {/* Shala Vault Body */}
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[shalaW * 0.48, shalaW * 0.55, shalaL, 20, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color={graniteBase} roughness={0.55} />
            </mesh>

            {/* 7 Sacred Golden Kalasam Finials */}
            {Array.from({ length: kalasamCount }).map((_, kIdx) => {
              const spacing = shalaL / (kalasamCount + 1);
              const posX = -shalaL / 2 + spacing * (kIdx + 1);
              return (
                <group key={`mg-kalasa-${kIdx}`} position={[posX, shalaW * 0.48 + 0.65, 0]}>
                  {/* Conical Kalasa Peak */}
                  <mesh castShadow>
                    <coneGeometry args={[0.38, 1.3, 16]} />
                    <meshStandardMaterial color={pureGold} roughness={0.18} metalness={0.9} />
                  </mesh>
                  {/* Kalasa Brass Pot Bulb */}
                  <mesh position={[0, -0.45, 0]}>
                    <sphereGeometry args={[0.34, 14, 14]} />
                    <meshStandardMaterial color={pureGold} roughness={0.18} metalness={0.9} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })()}

      {/* 6. Sacred Dhwaja Stambha (Golden Flag Post) standing on the Temple Axis in front */}
      <group position={[0, 0, width / 2 + 4.5]}>
        {/* Stone Pedestal */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.2, 1.4, 0.8, 16]} />
          <meshStandardMaterial color={graniteBase} roughness={0.7} />
        </mesh>
        {/* Golden Brass Mast */}
        <mesh position={[0, 6.0, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.22, 11.2, 16]} />
          <meshStandardMaterial color={pureGold} roughness={0.2} metalness={0.88} />
        </mesh>
        {/* Flag Pennant */}
        <mesh position={[0.65, 10.5, 0]} rotation={[0, 0, -0.2]}>
          <boxGeometry args={[1.2, 0.6, 0.04]} />
          <meshStandardMaterial color="#EA580C" roughness={0.4} />
        </mesh>
      </group>

      {/* 7. Portal Illumination & Destination Beacon Light */}
      <pointLight position={[0, archHeight * 0.7, 0]} color="#F59E0B" intensity={2.5} distance={14} />

      {/* 8. Label Badge for Precision Identification */}
      {showLabels && (
        <Html position={[0, height + 2.5, 0]} center distanceFactor={40} zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none px-3.5 py-1.5 rounded-xl bg-deva-maroon-900/95 border border-amber-400 text-amber-200 font-bold text-xs tracking-wider shadow-2xl flex items-center gap-2 whitespace-nowrap">
            <span className="text-amber-400 font-serif font-black text-sm">👑</span>
            <span>MAIN DARSHAN GOPURAM</span>
            <span className="text-[10px] text-amber-300 font-normal">| RAJA GOPURAM (32m)</span>
          </div>
        </Html>
      )}
    </group>
  );
}
