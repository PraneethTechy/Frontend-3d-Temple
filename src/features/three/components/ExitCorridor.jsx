import React from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useQueueStore } from '../../../store/useQueueStore.js';

export function ExitCorridor({ component, isSelected }) {
  const { dimensions } = component;
  const length = dimensions.length || 8;
  const width = dimensions.width || 2.5;
  const height = dimensions.height || 2.4;

  const { camera } = useThree();
  const showLabels = useQueueStore((state) => state.showLabels);

  // Intelligent Label Hierarchy (Part 9): only closer zoom or when selected
  const isCameraClose = camera ? camera.position.length() < 65 : false;
  const isLabelVisible = isSelected || (showLabels && isCameraClose);

  const halfL = length / 2;
  const halfW = width / 2;
  const numArrows = Math.max(1, Math.floor(length / 2.5));

  return (
    <group>
      {/* Corridor Floor Mat */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <boxGeometry args={[length, 0.02, width]} />
        <meshStandardMaterial color="#EAEAE5" roughness={0.8} />
      </mesh>

      {/* Directional Floor Chevrons (Pointing Outward / Forward along +X) */}
      {Array.from({ length: numArrows }).map((_, idx) => {
        const xPos = -halfL + (idx + 0.6) * (length / numArrows);
        return (
          <mesh key={idx} position={[xPos, 0.028, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.25, 0.5, 3]} />
            <meshBasicMaterial color="#059669" opacity={0.7} transparent />
          </mesh>
        );
      })}

      {/* Left Boundary Barrier Rail */}
      <mesh position={[0, 0.5, -halfW]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, length, 12]} />
        <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.6} />
      </mesh>
      {[-halfL, 0, halfL].map((pX, idx) => (
        <mesh key={idx} position={[pX, 0.25, -halfW]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5, 12]} />
          <meshStandardMaterial color="#4B5563" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}

      {/* Right Boundary Barrier Rail */}
      <mesh position={[0, 0.5, halfW]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, length, 12]} />
        <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.6} />
      </mesh>
      {[-halfL, 0, halfL].map((pX, idx) => (
        <mesh key={idx} position={[pX, 0.25, halfW]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5, 12]} />
          <meshStandardMaterial color="#4B5563" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}

      {/* Exit Portal Arch (At End of Corridor) */}
      <group position={[halfL - 0.2, 0, 0]}>
        {/* Left Post */}
        <mesh position={[0, height / 2, -halfW]}>
          <boxGeometry args={[0.15, height, 0.15]} />
          <meshStandardMaterial color="#1F2937" roughness={0.4} />
        </mesh>
        {/* Right Post */}
        <mesh position={[0, height / 2, halfW]}>
          <boxGeometry args={[0.15, height, 0.15]} />
          <meshStandardMaterial color="#1F2937" roughness={0.4} />
        </mesh>
        {/* Header Beam */}
        <mesh position={[0, height, 0]}>
          <boxGeometry args={[0.2, 0.3, width + 0.3]} />
          <meshStandardMaterial color="#111827" roughness={0.4} />
        </mesh>

        {/* EXIT Signage with LOD visibility */}
        {isLabelVisible && (
          <Html position={[0, height + 0.05, 0]} center distanceFactor={24} zIndexRange={[100, 0]}>
            <div className="pointer-events-none select-none px-3 py-1 rounded bg-emerald-950 border border-emerald-400 text-emerald-300 font-bold text-xs tracking-widest shadow-lg flex items-center gap-1.5 whitespace-nowrap">
              <span>EXIT</span>
              <span className="text-[10px] text-emerald-200/80 font-normal">| NIKAS &rarr;</span>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
