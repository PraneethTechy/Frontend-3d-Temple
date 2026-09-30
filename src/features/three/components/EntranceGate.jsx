import React from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useQueueStore } from '../../../store/useQueueStore.js';

export function EntranceGate({ component, isSelected }) {
  const { dimensions } = component;
  const span = dimensions.length || 4; // Gate opening width
  const depth = dimensions.width || 1.2;
  const height = dimensions.height || 3.2;

  const { camera } = useThree();
  const showLabels = useQueueStore((state) => state.showLabels);

  const isCameraClose = camera ? camera.position.length() < 135 : true;
  const isLabelVisible = showLabels && (isSelected || isCameraClose);

  const pillarSize = 0.35;
  const halfSpan = span / 2;

  return (
    <group>
      {/* Threshold Floor Plate */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[span + 0.6, 0.03, depth]} />
        <meshStandardMaterial color="#EAE4D7" roughness={0.75} />
      </mesh>

      {/* Directional Entry Floor Chevron */}
      <mesh position={[0, 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.35, 0.6, 3]} />
        <meshBasicMaterial color="#B06F17" />
      </mesh>

      {/* Left Pillar */}
      <group position={[-halfSpan, 0, 0]}>
        {/* Plinth */}
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[pillarSize + 0.15, 0.3, pillarSize + 0.15]} />
          <meshStandardMaterial color="#5B1425" roughness={0.5} />
        </mesh>
        {/* Shaft */}
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[pillarSize, height - 0.6, pillarSize]} />
          <meshStandardMaterial color="#FAF5EE" roughness={0.7} />
        </mesh>
        {/* Capital */}
        <mesh position={[0, height - 0.2, 0]}>
          <boxGeometry args={[pillarSize + 0.12, 0.25, pillarSize + 0.12]} />
          <meshStandardMaterial color="#D4AC4C" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>

      {/* Right Pillar */}
      <group position={[halfSpan, 0, 0]}>
        {/* Plinth */}
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[pillarSize + 0.15, 0.3, pillarSize + 0.15]} />
          <meshStandardMaterial color="#5B1425" roughness={0.5} />
        </mesh>
        {/* Shaft */}
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[pillarSize, height - 0.6, pillarSize]} />
          <meshStandardMaterial color="#FAF5EE" roughness={0.7} />
        </mesh>
        {/* Capital */}
        <mesh position={[0, height - 0.2, 0]}>
          <boxGeometry args={[pillarSize + 0.12, 0.25, pillarSize + 0.12]} />
          <meshStandardMaterial color="#D4AC4C" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>

      {/* Top Architectural Beam */}
      <mesh position={[0, height - 0.05, 0]}>
        <boxGeometry args={[span + 0.8, 0.3, depth * 0.7]} />
        <meshStandardMaterial color="#5B1425" roughness={0.5} />
      </mesh>

      {/* Ornamental Arch Crown */}
      <mesh position={[0, height + 0.2, 0]}>
        <boxGeometry args={[span * 0.7, 0.22, depth * 0.5]} />
        <meshStandardMaterial color="#D4AC4C" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Kalash / Finial on Top */}
      <mesh position={[0, height + 0.42, 0]}>
        <coneGeometry args={[0.15, 0.3, 16]} />
        <meshStandardMaterial color="#E5A93C" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Signage Display with LOD visibility */}
      {isLabelVisible && (
        <Html position={[0, height + 0.08, depth * 0.36]} center distanceFactor={24} zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none px-3 py-1 rounded-md bg-deva-maroon-900 border border-amber-400 text-amber-300 font-bold text-xs tracking-widest shadow-lg flex items-center gap-1.5 whitespace-nowrap">
            <span>ENTRY</span>
            <span className="text-[10px] text-amber-200/80 font-normal">| PRAVESH</span>
          </div>
        </Html>
      )}
    </group>
  );
}
