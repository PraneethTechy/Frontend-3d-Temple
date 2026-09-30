import React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useQueueStore } from '../../../store/useQueueStore.js';

/**
 * Authentic Dravidian Darshan Sanctum (Garbhagriha & Mukha Mandapam)
 * Grand temple destination replacing generic wooden box representation.
 */
export function DarshanSanctum({ component, isSelected, showLabels: propShowLabels }) {
  const { dimensions = {}, properties = {} } = component;
  const length = dimensions.length || 18; // Width across facade (X)
  const width = dimensions.width || 16;   // Depth along axis (Z)
  const height = dimensions.height || 14; // Vimana height (Y)
  const storeShowLabels = useQueueStore((state) => state.showLabels);
  const showLabels = propShowLabels !== undefined ? propShowLabels : (storeShowLabels ?? true);

  const deityName = properties.deity || 'Sri Ganesha';
  const vimanaHeight = properties.vimanaHeight || height;

  // Authentic Dravidian temple stone palette
  const darkGranite = '#4A3B2C';
  const templeStone = '#947859';
  const polishedMarble = '#FAF6F0';
  const goldBrass = '#E5B83A';
  const kumkumRed = '#7F1D1D';

  const sanctumDepth = width * 0.45;
  const mandapamDepth = width * 0.55;
  const sanctumWidth = length * 0.65;

  return (
    <group>
      {/* 1. Grand Polished Marble / Peedam Elevated Foundation Plinth */}
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[length + 1.6, 0.5, width + 1.6]} />
        <meshStandardMaterial color={darkGranite} roughness={0.8} />
      </mesh>
      {/* Upper Tier Steps */}
      <mesh position={[0, 0.6, 0]} receiveShadow>
        <boxGeometry args={[length + 0.8, 0.25, width + 0.8]} />
        <meshStandardMaterial color={polishedMarble} roughness={0.4} />
      </mesh>

      {/* 2. Rear Garbhagriha (Inner Sanctum Chamber) */}
      <group position={[0, 0.72, -width / 2 + sanctumDepth / 2]}>
        {/* Outer Sanctum Walls */}
        <mesh position={[0, 2.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[sanctumWidth, 5.6, sanctumDepth]} />
          <meshStandardMaterial color={templeStone} roughness={0.7} />
        </mesh>

        {/* Sanctum Portal Doorway Frame */}
        <mesh position={[0, 1.8, sanctumDepth / 2 + 0.05]}>
          <boxGeometry args={[sanctumWidth * 0.38, 3.6, 0.2]} />
          <meshStandardMaterial color={darkGranite} roughness={0.6} />
        </mesh>
        {/* Doorway Interior Recess */}
        <mesh position={[0, 1.8, sanctumDepth / 2 - 0.2]}>
          <boxGeometry args={[sanctumWidth * 0.3, 3.3, 0.5]} />
          <meshStandardMaterial color="#1F150B" roughness={0.9} />
        </mesh>

        {/* Sacred Altar & Diya Illumination inside Garbhagriha */}
        <group position={[0, 0.8, sanctumDepth * 0.1]}>
          {/* Peedam / Deity Altar Pedestal */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[1.0, 1.2, 1.0, 16]} />
            <meshStandardMaterial color={darkGranite} roughness={0.5} />
          </mesh>
          {/* Sacred Golden Focal Murti Silhouette */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.7, 1.2, 16]} />
            <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.85} />
          </mesh>
          {/* Sacred Diya Light Glow (Focal beacon) */}
          <pointLight position={[0, 1.6, 0.5]} color="#F59E0B" intensity={3.5} distance={10} castShadow />
        </group>

        {/* 3. Dravidian Vimana Pyramidal Tower atop Garbhagriha */}
        {(() => {
          const vTiers = 4;
          const vimanaBaseH = 5.6;
          const remainingH = vimanaHeight - vimanaBaseH;
          const tierH = remainingH / vTiers;

          return (
            <group position={[0, vimanaBaseH, 0]}>
              {Array.from({ length: vTiers }).map((_, idx) => {
                const taper = 1 - (idx / vTiers) * 0.65;
                const tL = sanctumWidth * 0.92 * taper;
                const tW = sanctumDepth * 0.92 * taper;
                const tY = idx * tierH + tierH / 2;

                return (
                  <group key={`vimana-tier-${idx}`}>
                    <mesh position={[0, tY, 0]} castShadow receiveShadow>
                      <boxGeometry args={[tL, tierH * 0.82, tW]} />
                      <meshStandardMaterial color={templeStone} roughness={0.65} />
                    </mesh>
                    {/* Tier Eaves */}
                    <mesh position={[0, tY + tierH * 0.42, 0]} castShadow>
                      <boxGeometry args={[tL + 0.4, tierH * 0.18, tW + 0.4]} />
                      <meshStandardMaterial color={darkGranite} roughness={0.6} />
                    </mesh>
                  </group>
                );
              })}

              {/* Apex Golden Kalasa Finial */}
              <group position={[0, remainingH + 0.6, 0]}>
                <mesh castShadow>
                  <coneGeometry args={[0.5, 1.4, 16]} />
                  <meshStandardMaterial color={goldBrass} roughness={0.2} metalness={0.9} />
                </mesh>
                <mesh position={[0, -0.4, 0]}>
                  <sphereGeometry args={[0.45, 16, 16]} />
                  <meshStandardMaterial color={goldBrass} roughness={0.2} metalness={0.9} />
                </mesh>
              </group>
            </group>
          );
        })()}
      </group>

      {/* 4. Mukha Mandapam (Pillared Front Viewing Pavilion) */}
      <group position={[0, 0.72, width / 2 - mandapamDepth / 2]}>
        {/* Carved Stone Pillars supporting the Mandapam Ceiling */}
        {[-length * 0.38, -length * 0.18, length * 0.18, length * 0.38].map((pX, colIdx) =>
          [-mandapamDepth * 0.35, 0, mandapamDepth * 0.35].map((pZ, rowIdx) => (
            <group key={`pillar-${colIdx}-${rowIdx}`} position={[pX, 0, pZ]}>
              {/* Pillar Base */}
              <mesh position={[0, 0.3, 0]}>
                <boxGeometry args={[0.55, 0.6, 0.55]} />
                <meshStandardMaterial color={darkGranite} roughness={0.7} />
              </mesh>
              {/* Shaft */}
              <mesh position={[0, 2.2, 0]} castShadow>
                <cylinderGeometry args={[0.22, 0.25, 3.2, 16]} />
                <meshStandardMaterial color={templeStone} roughness={0.65} />
              </mesh>
              {/* Capital / Bracket (Bodika) */}
              <mesh position={[0, 3.9, 0]}>
                <boxGeometry args={[0.6, 0.3, 0.6]} />
                <meshStandardMaterial color={darkGranite} roughness={0.6} />
              </mesh>
            </group>
          ))
        )}

        {/* Mandapam Flat Stone Ceiling & Parapet */}
        <mesh position={[0, 4.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[length * 0.9, 0.45, mandapamDepth * 0.95]} />
          <meshStandardMaterial color={darkGranite} roughness={0.7} />
        </mesh>
        {/* Decorative Parapet Band */}
        <mesh position={[0, 4.5, 0]}>
          <boxGeometry args={[length * 0.92, 0.35, mandapamDepth * 0.98]} />
          <meshStandardMaterial color={kumkumRed} roughness={0.5} />
        </mesh>
      </group>

      {/* 5. Front Darshan Viewing Barrier & Queue Arrival Threshold */}
      <group position={[0, 0.72, width / 2 - 0.2]}>
        {/* Brass Stanchion Handrail */}
        <mesh position={[0, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, length * 0.75, 16]} />
          <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.85} />
        </mesh>
        {[-length * 0.35, -length * 0.15, length * 0.15, length * 0.35].map((sX, bIdx) => (
          <mesh key={bIdx} position={[sX, 0.45, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.9, 16]} />
            <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.85} />
          </mesh>
        ))}
      </group>

      {/* 6. Label Badge for Precision Identification */}
      {showLabels && (
        <Html position={[0, vimanaHeight + 2.2, 0]} center distanceFactor={35} zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none px-3.5 py-1.5 rounded-xl bg-deva-maroon-900/95 border border-amber-400 text-amber-200 font-bold text-xs tracking-wider shadow-2xl flex items-center gap-2 whitespace-nowrap">
            <span className="text-amber-400 font-serif font-black text-sm">🛕</span>
            <span>DARSHAN SANCTUM</span>
            <span className="text-[10px] text-amber-300 font-normal">| {deityName.toUpperCase()} GARBHAGRIHA</span>
          </div>
        </Html>
      )}
    </group>
  );
}
