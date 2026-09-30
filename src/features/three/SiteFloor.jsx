import React, { useMemo } from 'react';
import * as THREE from 'three';
import { toMeters } from '../../utils/units.js';

export function SiteFloor({ length, width, unit }) {
  const lengthMeters = useMemo(() => toMeters(length, unit), [length, unit]);
  const widthMeters = useMemo(() => toMeters(width, unit), [width, unit]);

  // Height/thickness of the elevated crowd management foundation slab
  const slabHeight = 0.25;

  return (
    <group position={[0, -slabHeight / 2, 0]}>
      {/* Main Elevated Floor Slab */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[lengthMeters, slabHeight, widthMeters]} />
        <meshStandardMaterial
          color="#FAF7F2"
          roughness={0.88}
          metalness={0.06}
        />
      </mesh>

      {/* Decorative Perimeter Base Border (recessed footing) */}
      <mesh position={[0, -slabHeight * 0.45, 0]}>
        <boxGeometry args={[lengthMeters + 0.15, slabHeight * 0.2, widthMeters + 0.15]} />
        <meshStandardMaterial
          color="#E4DDD2"
          roughness={0.95}
          metalness={0.02}
        />
      </mesh>
    </group>
  );
}
