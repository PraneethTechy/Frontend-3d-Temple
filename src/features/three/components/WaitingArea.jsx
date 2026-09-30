import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useQueueStore } from '../../../store/useQueueStore.js';

export function WaitingArea({ component, isSelected }) {
  const { dimensions, properties } = component;
  const length = dimensions.length || 12;
  const width = dimensions.width || 8;
  const height = dimensions.height || 0.8;
  const numRows = Math.max(1, properties.seatingRows || 2);

  const { camera } = useThree();
  const showLabels = useQueueStore((state) => state.showLabels);

  // Intelligent Label Hierarchy (Part 9): only closer zoom or when selected
  const isCameraClose = camera ? camera.position.length() < 65 : false;
  const isLabelVisible = isSelected || (showLabels && isCameraClose);

  // Bench rows positions
  const benchRows = useMemo(() => {
    const rows = [];
    const stepZ = (width * 0.7) / (numRows + 1);
    const startZ = -width * 0.35 + stepZ;
    for (let r = 0; r < numRows; r++) {
      rows.push(startZ + r * stepZ);
    }
    return rows;
  }, [width, numRows]);

  const pattern = properties.pattern || '';
  const isOverflow = properties.isOverflow || false;

  let floorColor = '#F5F0E6';
  let borderColor = '#D8CFC0';
  let railColor = '#7A1C30';

  if (pattern === 'holding_loop') {
    floorColor = '#FDF7EB';
    borderColor = '#E2BA72';
    railColor = '#B45309';
  } else if (pattern === 'dispersal_plaza') {
    floorColor = '#EDF4EE';
    borderColor = '#B5D1BA';
    railColor = '#2D6A4F';
  } else if (isOverflow || pattern === 'overflow_loop') {
    floorColor = '#FFF5EE';
    borderColor = '#F59E0B';
    railColor = '#C2410C';
  }

  return (
    <group>
      {/* Defined Holding Bay Floor */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <boxGeometry args={[length, 0.03, width]} />
        <meshStandardMaterial color={floorColor} roughness={0.85} />
      </mesh>

      {/* Decorative Perimeter Footing Edge */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[length + 0.1, 0.01, width + 0.1]} />
        <meshStandardMaterial color={borderColor} roughness={0.9} />
      </mesh>

      {/* Holding Loop Inner Circulation Track Marking */}
      {pattern === 'holding_loop' && (
        <mesh position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.min(length, width) * 0.28, Math.min(length, width) * 0.35, 32]} />
          <meshBasicMaterial color="#D97706" opacity={0.4} transparent side={THREE?.DoubleSide ?? 2} />
        </mesh>
      )}

      {/* Perimeter Low Railing Posts (Back and Sides) */}
      {/* Back Boundary Rail */}
      <mesh position={[0, height * 0.45, -width / 2]}>
        <boxGeometry args={[length, 0.05, 0.05]} />
        <meshStandardMaterial color={railColor} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Left Boundary Rail */}
      <mesh position={[-length / 2, height * 0.45, 0]}>
        <boxGeometry args={[0.05, 0.05, width]} />
        <meshStandardMaterial color={railColor} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Right Boundary Rail */}
      <mesh position={[length / 2, height * 0.45, 0]}>
        <boxGeometry args={[0.05, 0.05, width]} />
        <meshStandardMaterial color={railColor} roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Bench Rows */}
      {benchRows.map((zPos, rIdx) => {
        const benchLen = length * 0.8;
        return (
          <group key={rIdx} position={[0, 0, zPos]}>
            {/* Bench Seat Plank */}
            <mesh position={[0, 0.32, 0]}>
              <boxGeometry args={[benchLen, 0.06, 0.45]} />
              <meshStandardMaterial color="#8C5212" roughness={0.7} />
            </mesh>
            {/* Bench Legs */}
            {[-benchLen * 0.4, 0, benchLen * 0.4].map((legX, lIdx) => (
              <mesh key={lIdx} position={[legX, 0.16, 0]}>
                <boxGeometry args={[0.08, 0.3, 0.4]} />
                <meshStandardMaterial color="#4A5568" roughness={0.5} metalness={0.3} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Label Badge with LOD visibility */}
      {isLabelVisible && (
        <Html position={[0, height + 0.8, 0]} center distanceFactor={28} zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none px-2.5 py-1 rounded bg-amber-900/90 text-amber-100 font-bold text-[10px] tracking-wider border border-amber-500/50 shadow-md whitespace-nowrap">
            WAITING AREA ({length}m &times; {width}m)
          </div>
        </Html>
      )}
    </group>
  );
}
