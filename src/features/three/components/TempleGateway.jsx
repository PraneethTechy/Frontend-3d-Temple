import React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useQueueStore } from '../../../store/useQueueStore.js';
import { useCapacityExpansionStore } from '../../simulation/capacityExpansionStore.js';

/**
 * Authentic Dravidian Temple Gateway / Torana Mandapam
 * Ceremonial pillared stone pavilion gateway.
 */
export function TempleGateway({ component, isSelected }) {
  const { dimensions = {}, properties = {} } = component;
  const length = dimensions.length || 10;
  const width = dimensions.width || 6;
  const height = dimensions.height || 7;
  const storeShowLabels = useQueueStore((state) => state.showLabels);
  const isCapacityModalOpen = useCapacityExpansionStore((state) => state.isOpen);
  const isSaveModalOpen = useQueueStore((state) => state.isSaveModalOpen);
  const isPlansModalOpen = useQueueStore((state) => state.isPlansModalOpen);
  const isAnyModalOpen = isCapacityModalOpen || isSaveModalOpen || isPlansModalOpen;
  const showLabels = !isAnyModalOpen && (storeShowLabels ?? true);

  const stoneColor = '#9E8265';
  const darkStone = '#5C4733';
  const goldColor = '#D4AF37';

  return (
    <group>
      {/* Stone Base Plinth */}
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <boxGeometry args={[length + 0.8, 0.4, width + 0.8]} />
        <meshStandardMaterial color={darkStone} roughness={0.8} />
      </mesh>

      {/* 4 Corner Stone Pillars */}
      {[-length * 0.4, length * 0.4].map((pX, colIdx) =>
        [-width * 0.38, width * 0.38].map((pZ, rowIdx) => (
          <group key={`gw-pillar-${colIdx}-${rowIdx}`} position={[pX, 0.4, pZ]}>
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshStandardMaterial color={darkStone} roughness={0.7} />
            </mesh>
            <mesh position={[0, height * 0.45, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.24, height * 0.8, 16]} />
              <meshStandardMaterial color={stoneColor} roughness={0.65} />
            </mesh>
            <mesh position={[0, height * 0.88, 0]}>
              <boxGeometry args={[0.55, 0.25, 0.55]} />
              <meshStandardMaterial color={darkStone} roughness={0.6} />
            </mesh>
          </group>
        ))
      )}

      {/* Lintel Beam Structure */}
      <mesh position={[0, height * 0.9 + 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[length + 0.4, 0.45, width + 0.4]} />
        <meshStandardMaterial color={darkStone} roughness={0.65} />
      </mesh>

      {/* Sloping Dravidian Roof Canopy */}
      <mesh position={[0, height * 0.9 + 0.8, 0]} castShadow>
        <boxGeometry args={[length + 0.8, 0.35, width + 0.8]} />
        <meshStandardMaterial color={stoneColor} roughness={0.6} />
      </mesh>

      {/* Center Kalasa Finial */}
      <mesh position={[0, height * 0.9 + 1.4, 0]} castShadow>
        <coneGeometry args={[0.25, 0.8, 16]} />
        <meshStandardMaterial color={goldColor} roughness={0.2} metalness={0.85} />
      </mesh>

      {/* Label Badge */}
      {showLabels && (
        <Html position={[0, height + 1.8, 0]} center distanceFactor={30} zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none px-2.5 py-1 rounded bg-deva-maroon-900/90 border border-amber-400/80 text-amber-200 font-bold text-[10px] tracking-wider shadow-lg flex items-center gap-1 whitespace-nowrap">
            <span>TEMPLE GATEWAY</span>
            <span className="text-[9px] text-amber-300 font-normal">| MANDAPAM</span>
          </div>
        </Html>
      )}
    </group>
  );
}
