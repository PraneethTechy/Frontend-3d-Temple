import React from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useQueueStore } from '../../../store/useQueueStore.js';

export function SecurityCheckpoint({ component, isSelected }) {
  const { dimensions } = component;
  const length = dimensions.length || 5;
  const width = dimensions.width || 3;
  const height = dimensions.height || 2.6;

  const { camera } = useThree();
  const showLabels = useQueueStore((state) => state.showLabels);

  // Intelligent Label Hierarchy (Part 9): only closer zoom or when selected
  const isCameraClose = camera ? camera.position.length() < 65 : false;
  const isLabelVisible = isSelected || (showLabels && isCameraClose);

  return (
    <group>
      {/* Base Security Mat */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <boxGeometry args={[length, 0.02, width]} />
        <meshStandardMaterial color="#EAE5DC" roughness={0.8} />
      </mesh>

      {/* DFMD Walk-Through Metal Detector Portal (Left Side) */}
      <group position={[-length * 0.25, 0, 0]}>
        {/* Left Detector Post */}
        <mesh position={[-0.45, height * 0.45, 0]}>
          <boxGeometry args={[0.12, height * 0.9, 0.6]} />
          <meshStandardMaterial color="#4A5568" roughness={0.4} metalness={0.4} />
        </mesh>
        {/* Right Detector Post */}
        <mesh position={[0.45, height * 0.45, 0]}>
          <boxGeometry args={[0.12, height * 0.9, 0.6]} />
          <meshStandardMaterial color="#4A5568" roughness={0.4} metalness={0.4} />
        </mesh>
        {/* Overhead Sensor Unit */}
        <mesh position={[0, height * 0.9, 0]}>
          <boxGeometry args={[1.05, 0.2, 0.6]} />
          <meshStandardMaterial color="#2D3748" roughness={0.3} metalness={0.6} />
        </mesh>
        {/* Sensor Light indicator */}
        <mesh position={[0, height * 0.9, 0.31]}>
          <planeGeometry args={[0.3, 0.08]} />
          <meshBasicMaterial color="#10B981" />
        </mesh>
      </group>

      {/* Baggage Inspection Counter / Conveyor (Right Side) */}
      <group position={[length * 0.28, 0, 0]}>
        {/* Counter Table Body */}
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[1.6, 0.9, width * 0.6]} />
          <meshStandardMaterial color="#718096" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Conveyor Belt Top */}
        <mesh position={[0, 0.92, 0]}>
          <boxGeometry args={[1.5, 0.04, width * 0.5]} />
          <meshStandardMaterial color="#1A202C" roughness={0.8} />
        </mesh>
        {/* Scanner Hood */}
        <mesh position={[0, 1.25, 0]}>
          <boxGeometry args={[0.9, 0.6, width * 0.55]} />
          <meshStandardMaterial color="#2D3748" roughness={0.4} metalness={0.5} />
        </mesh>
      </group>

      {/* Label Badge with LOD visibility */}
      {isLabelVisible && (
        <Html position={[0, height + 0.4, 0]} center distanceFactor={26} zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none px-2.5 py-1 rounded bg-stone-900/90 text-stone-100 font-bold text-[10px] tracking-wider border border-blue-400/50 shadow-md flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>SECURITY CHECK</span>
          </div>
        </Html>
      )}
    </group>
  );
}
