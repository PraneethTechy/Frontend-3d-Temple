import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useQueueStore } from '../../../store/useQueueStore.js';

/**
 * Authentic Dravidian Entrance Gopuram
 * Stepped pyramidal gateway tower with open central portal and golden Kalasams.
 */
export function EntranceGopuram({ component, isSelected, showLabels: propShowLabels }) {
  const { dimensions = {}, properties = {} } = component;
  const length = dimensions.length || 16; // Width across facade (X)
  const width = dimensions.width || 8;   // Depth along axis (Z)
  const height = dimensions.height || 18; // Vertical height (Y)
  const cameraMode = useQueueStore((state) => state.cameraMode);
  const storeShowLabels = useQueueStore((state) => state.showLabels);
  const showLabels = propShowLabels !== undefined ? propShowLabels : (storeShowLabels ?? true);

  const tiers = properties.tiers || 5;
  const kalasamCount = properties.kalasams || 5;
  const archWidth = properties.archWidth || Math.min(length * 0.35, 5);
  const archHeight = properties.archHeight || Math.min(height * 0.28, 5);

  // Materials & Colors (Sacred Dravidian Temple Stone Palette)
  const stoneColor = properties.stoneColor || '#B59975'; // Warm sandstone
  const darkStone = '#7A5C3D'; // Basal molding
  const goldColor = '#D4AF37'; // Temple gold brass
  const redOchre = '#8B263E';  // Kumkum red decorative band

  // Generate tier dimensions for stepped pyramid
  const tierData = useMemo(() => {
    const list = [];
    const baseHeight = archHeight + 1.2;
    const remainingHeight = height - baseHeight - 1.8; // Leave space for shala roof
    const tierH = remainingHeight / tiers;

    for (let i = 0; i < tiers; i++) {
      const taper = 1 - (i / tiers) * 0.52;
      const tL = (length - 1.5) * taper;
      const tW = (width - 1.2) * taper;
      const tY = baseHeight + i * tierH + tierH / 2;
      list.push({ index: i, length: tL, width: tW, height: tierH, y: tY });
    }
    return list;
  }, [length, width, height, tiers, archHeight]);

  const pylonWidth = (length - archWidth) / 2;
  const baseHeight = archHeight + 1.2;

  return (
    <group>
      {/* 1. Stone Plinth / Upana Foundation */}
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[length + 1.2, 0.5, width + 1.0]} />
        <meshStandardMaterial color={darkStone} roughness={0.8} />
      </mesh>

      {/* 2. Lower Gateway Pylons (Left & Right flanking gateway passage) */}
      {/* Left Gateway Pylon */}
      <mesh position={[-(archWidth / 2 + pylonWidth / 2), baseHeight / 2 + 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[pylonWidth, baseHeight, width]} />
        <meshStandardMaterial color={stoneColor} roughness={0.7} />
      </mesh>

      {/* Right Gateway Pylon */}
      <mesh position={[(archWidth / 2 + pylonWidth / 2), baseHeight / 2 + 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[pylonWidth, baseHeight, width]} />
        <meshStandardMaterial color={stoneColor} roughness={0.7} />
      </mesh>

      {/* Decorative Pilasters on Base Pylons */}
      {[-1, 1].map((side) => (
        <group key={`pylon-pilasters-${side}`} position={[side * (archWidth / 2 + pylonWidth / 2), 0.25, 0]}>
          {[-pylonWidth * 0.35, pylonWidth * 0.35].map((offX, pIdx) => (
            <mesh key={pIdx} position={[offX, baseHeight / 2, width / 2 + 0.08]} castShadow>
              <boxGeometry args={[0.35, baseHeight * 0.9, 0.16]} />
              <meshStandardMaterial color={darkStone} roughness={0.6} />
            </mesh>
          ))}
          {/* Rear pilasters */}
          {[-pylonWidth * 0.35, pylonWidth * 0.35].map((offX, pIdx) => (
            <mesh key={`rear-${pIdx}`} position={[offX, baseHeight / 2, -width / 2 - 0.08]} castShadow>
              <boxGeometry args={[0.35, baseHeight * 0.9, 0.16]} />
              <meshStandardMaterial color={darkStone} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 3. Gateway Archway Lintel Beam (Spans over the open central portal) */}
      <mesh position={[0, archHeight + 0.6 + 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[length + 0.4, 1.2, width + 0.3]} />
        <meshStandardMaterial color={darkStone} roughness={0.65} />
      </mesh>

      {/* Ornamental Kumkum / Terracotta Band above lintel */}
      <mesh position={[0, archHeight + 1.35 + 0.25, 0]}>
        <boxGeometry args={[length + 0.5, 0.3, width + 0.4]} />
        <meshStandardMaterial color={redOchre} roughness={0.5} />
      </mesh>

      {/* 4. Stepped Pyramidal Tiers (Tala storeys) */}
      {tierData.map((tier) => (
        <group key={`tier-${tier.index}`}>
          {/* Main Tier Body */}
          <mesh position={[0, tier.y, 0]} castShadow receiveShadow>
            <boxGeometry args={[tier.length, tier.height * 0.85, tier.width]} />
            <meshStandardMaterial color={stoneColor} roughness={0.7} />
          </mesh>

          {/* Projecting Cornice / Kapota Rooflet */}
          <mesh position={[0, tier.y + tier.height * 0.42, 0]} castShadow>
            <boxGeometry args={[tier.length + 0.6, tier.height * 0.15, tier.width + 0.6]} />
            <meshStandardMaterial color={darkStone} roughness={0.6} />
          </mesh>

          {/* Center Niche Relief (Kudu / Miniature shrine) */}
          <mesh position={[0, tier.y, tier.width / 2 + 0.1]}>
            <boxGeometry args={[tier.length * 0.28, tier.height * 0.6, 0.2]} />
            <meshStandardMaterial color={goldColor} roughness={0.35} metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* 5. Crowning Shala Barrel-Vault Roof (Dravidian Crest) */}
      {(() => {
        const topTier = tierData[tierData.length - 1];
        if (!topTier) return null;
        const shalaY = topTier.y + topTier.height * 0.5 + 0.9;
        const shalaL = topTier.length * 0.88;
        const shalaW = topTier.width * 0.85;

        return (
          <group position={[0, shalaY, 0]}>
            {/* Shala Barrel Ridge */}
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[shalaW * 0.45, shalaW * 0.52, shalaL, 16, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color={darkStone} roughness={0.55} />
            </mesh>

            {/* Golden Kalasam Finials crowning the gopuram apex */}
            {Array.from({ length: kalasamCount }).map((_, kIdx) => {
              const spacing = shalaL / (kalasamCount + 1);
              const posX = -shalaL / 2 + spacing * (kIdx + 1);
              return (
                <group key={`kalasa-${kIdx}`} position={[posX, shalaW * 0.45 + 0.45, 0]}>
                  {/* Conical Brass Kalasa Pot */}
                  <mesh castShadow>
                    <coneGeometry args={[0.28, 0.9, 16]} />
                    <meshStandardMaterial color={goldColor} roughness={0.2} metalness={0.85} />
                  </mesh>
                  {/* Spherical Base */}
                  <mesh position={[0, -0.35, 0]}>
                    <sphereGeometry args={[0.25, 12, 12]} />
                    <meshStandardMaterial color={goldColor} roughness={0.2} metalness={0.85} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })()}

      {/* 6. Threshold Torana / Portal Passage Visual */}
      <pointLight 
        position={[0, archHeight * 0.6, 0]} 
        color={component.role === 'south-gopuram' ? '#10B981' : '#F59E0B'} 
        intensity={component.role === 'south-gopuram' ? 2.2 : 1.8} 
        distance={9} 
      />

      {/* Directional Indicator Arrow on Ground (Ingress inwards or South Egress outwards) */}
      <mesh 
        position={[0, 0.05, component.role === 'south-gopuram' ? -(width / 2 + 1.2) : (width / 2 + 1.2)]} 
        rotation={component.role === 'south-gopuram' ? [Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, 0]}
      >
        <coneGeometry args={[0.6, 1.4, 3]} />
        <meshBasicMaterial 
          color={component.role === 'south-gopuram' ? '#10B981' : '#EAB308'} 
          transparent 
          opacity={0.7} 
        />
      </mesh>

      {/* 7. Label Badge for Precision Identification */}
      {showLabels && (
        <Html position={[0, height + 1.8, 0]} center distanceFactor={35} zIndexRange={[100, 0]}>
          {component.role === 'south-gopuram' ? (
            <div className="pointer-events-none select-none px-3 py-1 rounded-lg bg-emerald-950/95 border border-emerald-400 text-emerald-200 font-bold text-[11px] tracking-wider shadow-xl flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-emerald-400 font-serif font-black">🚪</span>
              <span>SOUTH EXIT GOPURAM</span>
              <span className="text-[9px] text-emerald-300 font-normal">| NISHKRAMANA DVARAM (EXIT)</span>
            </div>
          ) : component.role === 'north-gopuram' ? (
            <div className="pointer-events-none select-none px-3 py-1 rounded-lg bg-deva-maroon-900/90 border border-amber-400/80 text-amber-200 font-bold text-[11px] tracking-wider shadow-xl flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-amber-400 font-serif font-black">🛕</span>
              <span>NORTH ENTRANCE GOPURAM</span>
              <span className="text-[9px] text-amber-300 font-normal">| UTTARA DVARAM</span>
            </div>
          ) : component.role === 'west-gopuram' ? (
            <div className="pointer-events-none select-none px-3 py-1 rounded-lg bg-deva-maroon-900/90 border border-amber-400/80 text-amber-200 font-bold text-[11px] tracking-wider shadow-xl flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-amber-400 font-serif font-black">🛕</span>
              <span>WEST ENTRANCE GOPURAM</span>
              <span className="text-[9px] text-amber-300 font-normal">| PASHCHIMA DVARAM</span>
            </div>
          ) : component.role === 'east-gopuram' ? (
            <div className="pointer-events-none select-none px-3 py-1 rounded-lg bg-deva-maroon-900/90 border border-amber-400/80 text-amber-200 font-bold text-[11px] tracking-wider shadow-xl flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-amber-400 font-serif font-black">🛕</span>
              <span>EAST ENTRANCE GOPURAM</span>
              <span className="text-[9px] text-amber-300 font-normal">| PURVA DVARAM</span>
            </div>
          ) : (
            <div className="pointer-events-none select-none px-3 py-1 rounded-lg bg-deva-maroon-900/90 border border-amber-400/80 text-amber-200 font-bold text-[11px] tracking-wider shadow-xl flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-amber-400 font-serif font-black">🛕</span>
              <span>ENTRANCE GOPURAM</span>
              <span className="text-[9px] text-amber-300 font-normal">| RAJA DVARAM</span>
            </div>
          )}
        </Html>
      )}
    </group>
  );
}
