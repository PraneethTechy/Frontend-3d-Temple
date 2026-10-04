import React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useQueueStore } from '../../../store/useQueueStore.js';

/**
 * Authentic Dravidian Temple Darshan Altar & Viewing Focal Point
 * Replacing any generic room with an authentic temple sanctum altar.
 */
export function DarshanPoint({ component, isSelected }) {
  const { dimensions = {}, properties = {} } = component;
  const length = dimensions.length || 6;
  const width = dimensions.width || 4;
  const height = dimensions.height || 3.2;

  const { camera } = useThree();
  const showLabels = useQueueStore((state) => state.showLabels);

  const isCameraClose = camera ? camera.position.length() < 65 : false;
  const isLabelVisible = showLabels && (isSelected || (isCameraClose && !properties.sanctumFocal));

  const stoneDark = '#4A3B2C';
  const stoneWarm = '#9E8265';
  const polishedMarble = '#FAF6F0';
  const goldBrass = '#E5B83A';
  const kumkumRed = '#80182C';

  return (
    <group>
      {/* 1. Sculpted Dravidian Peedam Stone Steps */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[length + 0.6, 0.24, width + 0.6]} />
        <meshStandardMaterial color={stoneDark} roughness={0.8} />
      </mesh>
      {/* Upper Polished Peedam Platform */}
      <mesh position={[0, 0.3, 0]} receiveShadow>
        <boxGeometry args={[length, 0.15, width]} />
        <meshStandardMaterial color={polishedMarble} roughness={0.4} />
      </mesh>

      {/* Gold Trim Border around platform */}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[length + 0.05, 0.03, width + 0.05]} />
        <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.8} />
      </mesh>

      {/* 2. Rear Sanctum Pillar Canopy & Vimana Roof */}
      <group position={[0, 0.38, -width * 0.35]}>
        {/* Left Carved Stone Pillar */}
        <mesh position={[-length * 0.4, height * 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, height * 0.85, 16]} />
          <meshStandardMaterial color={stoneWarm} roughness={0.65} />
        </mesh>
        {/* Right Carved Stone Pillar */}
        <mesh position={[length * 0.4, height * 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, height * 0.85, 16]} />
          <meshStandardMaterial color={stoneWarm} roughness={0.65} />
        </mesh>

        {/* Lintel Beam */}
        <mesh position={[0, height * 0.85, 0]} castShadow>
          <boxGeometry args={[length * 0.95, 0.3, 0.45]} />
          <meshStandardMaterial color={stoneDark} roughness={0.6} />
        </mesh>

        {/* Sloping Temple Canopy Eaves */}
        <mesh position={[0, height * 0.95, 0]} castShadow>
          <boxGeometry args={[length, 0.25, 0.8]} />
          <meshStandardMaterial color={kumkumRed} roughness={0.5} />
        </mesh>

        {/* Golden Kalasa Finial */}
        <group position={[0, height + 0.4, 0]}>
          <mesh castShadow>
            <coneGeometry args={[0.26, 0.7, 16]} />
            <meshStandardMaterial color={goldBrass} roughness={0.2} metalness={0.9} />
          </mesh>
          <mesh position={[0, -0.22, 0]}>
            <sphereGeometry args={[0.22, 14, 14]} />
            <meshStandardMaterial color={goldBrass} roughness={0.2} metalness={0.9} />
          </mesh>
        </group>
      </group>

      {/* 3. Front Darshan Viewing Barrier Rail (Devotees view from behind here) */}
      <group position={[0, 0.38, width * 0.4]}>
        {/* Brass Handrail */}
        <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, length * 0.88, 16]} />
          <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.85} />
        </mesh>
        {[-length * 0.4, -length * 0.15, length * 0.15, length * 0.4].map((pX, idx) => (
          <mesh key={idx} position={[pX, 0.28, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.56, 14]} />
            <meshStandardMaterial color={goldBrass} roughness={0.25} metalness={0.85} />
          </mesh>
        ))}
      </group>

      {/* 4. Center Sacred Altar with Glowing Diya Lamp */}
      <group position={[0, 0.38, 0]}>
        {/* Peedam Altar Stand */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.45, 0.6, 16]} />
          <meshStandardMaterial color={stoneDark} roughness={0.6} />
        </mesh>
        {/* Sacred Golden Lamp Bowl */}
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.25, 0.15, 0.12, 16]} />
          <meshStandardMaterial color={goldBrass} roughness={0.2} metalness={0.85} />
        </mesh>
        {/* Warm Golden Sacred Diya Glow */}
        <pointLight position={[0, 0.9, 0]} color="#F59E0B" intensity={2.2} distance={6} />
      </group>

      {/* 5. Label Badge with LOD visibility */}
      {isLabelVisible && (
        <Html position={[0, height + 1.2, 0]} center distanceFactor={28} zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none px-3 py-1 rounded bg-deva-maroon-900/95 border border-amber-400 text-amber-200 font-bold text-[10px] tracking-widest shadow-xl flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-amber-400 font-serif">🛕</span>
            <span>DARSHAN POINT</span>
            <span className="text-[9px] text-amber-300 font-normal">| SANCTUM ALTAR</span>
          </div>
        </Html>
      )}
    </group>
  );
}
