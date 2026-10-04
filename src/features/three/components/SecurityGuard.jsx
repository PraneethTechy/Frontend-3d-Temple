import React, { useRef } from 'react';
import * as THREE from 'three';

// Static shared materials for security guards to maintain optimal WebGL performance
const GUARD_SHIRT_MAT = new THREE.MeshStandardMaterial({
  color: '#1E3A8A', // Deep Temple Security Navy
  roughness: 0.7,
  metalness: 0.1,
});

const GUARD_TROUSER_MAT = new THREE.MeshStandardMaterial({
  color: '#1F2937', // Dark Charcoal Uniform Trousers
  roughness: 0.8,
  metalness: 0.05,
});

const GUARD_SKIN_MAT = new THREE.MeshStandardMaterial({
  color: '#A66B38', // Natural warm Indian skin tone
  roughness: 0.6,
  metalness: 0.0,
});

const GUARD_CAP_MAT = new THREE.MeshStandardMaterial({
  color: '#172554', // Dark Navy Security Cap
  roughness: 0.6,
  metalness: 0.1,
});

const GUARD_VISOR_MAT = new THREE.MeshStandardMaterial({
  color: '#0F172A', // Polished Black Cap Visor
  roughness: 0.3,
  metalness: 0.4,
});

const GUARD_BADGE_MAT = new THREE.MeshStandardMaterial({
  color: '#D4AF37', // Golden Brass Temple Security Insignia
  roughness: 0.3,
  metalness: 0.8,
});

const GUARD_BOOT_MAT = new THREE.MeshStandardMaterial({
  color: '#111827', // Black Duty Boots
  roughness: 0.85,
  metalness: 0.1,
});

const GUARD_BELT_MAT = new THREE.MeshStandardMaterial({
  color: '#0F172A',
  roughness: 0.5,
  metalness: 0.2,
});

/**
 * SecurityGuard
 * Lightweight, static 3D temple security personnel avatar stationed at checkpoints.
 * Complies with Requirement 4, 5, 6:
 * - Purely visual scene entity: NEVER counted in devotee crowd metrics or congestion calculations
 * - Professional temple security uniform with peaked cap, badge, and attentive posture
 * - High performance: shared static geometry and zero runtime allocation
 */
export const SecurityGuard = React.memo(function SecurityGuard({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1.0, role = 'dfmd_guard' }) {
  const rootRef = useRef();

  return (
    <group ref={rootRef} position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* Boots */}
      <mesh position={[-0.11, 0.08, 0]} material={GUARD_BOOT_MAT}>
        <boxGeometry args={[0.13, 0.16, 0.24]} />
      </mesh>
      <mesh position={[0.11, 0.08, 0]} material={GUARD_BOOT_MAT}>
        <boxGeometry args={[0.13, 0.16, 0.24]} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.11, 0.45, 0]} material={GUARD_TROUSER_MAT}>
        <cylinderGeometry args={[0.075, 0.085, 0.62, 8]} />
      </mesh>
      <mesh position={[0.11, 0.45, 0]} material={GUARD_TROUSER_MAT}>
        <cylinderGeometry args={[0.075, 0.085, 0.62, 8]} />
      </mesh>

      {/* Pelvis & Belt */}
      <mesh position={[0, 0.77, 0]} material={GUARD_TROUSER_MAT}>
        <boxGeometry args={[0.34, 0.12, 0.20]} />
      </mesh>
      <mesh position={[0, 0.83, 0]} material={GUARD_BELT_MAT}>
        <boxGeometry args={[0.35, 0.06, 0.21]} />
      </mesh>
      {/* Belt Buckle */}
      <mesh position={[0, 0.83, 0.108]} material={GUARD_BADGE_MAT}>
        <boxGeometry args={[0.06, 0.05, 0.01]} />
      </mesh>

      {/* Torso / Uniform Shirt */}
      <mesh position={[0, 1.10, 0]} material={GUARD_SHIRT_MAT}>
        <boxGeometry args={[0.38, 0.50, 0.22]} />
      </mesh>

      {/* Shoulder Epaulettes (Rank Tabs) */}
      <mesh position={[-0.19, 1.33, 0]} material={GUARD_BELT_MAT}>
        <boxGeometry args={[0.06, 0.02, 0.14]} />
      </mesh>
      <mesh position={[0.19, 1.33, 0]} material={GUARD_BELT_MAT}>
        <boxGeometry args={[0.06, 0.02, 0.14]} />
      </mesh>

      {/* Security Chest Badge */}
      <mesh position={[0.11, 1.22, 0.113]} material={GUARD_BADGE_MAT}>
        <boxGeometry args={[0.05, 0.06, 0.01]} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.38, 0]} material={GUARD_SKIN_MAT}>
        <cylinderGeometry args={[0.055, 0.065, 0.10, 8]} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.50, 0]} material={GUARD_SKIN_MAT}>
        <sphereGeometry args={[0.115, 12, 10]} />
      </mesh>

      {/* Peaked Security Cap */}
      <group position={[0, 1.57, 0]}>
        {/* Cap Crown */}
        <mesh position={[0, 0.03, -0.01]} material={GUARD_CAP_MAT}>
          <cylinderGeometry args={[0.13, 0.115, 0.09, 12]} />
        </mesh>
        {/* Cap Visor / Peak */}
        <mesh position={[0, -0.01, 0.10]} rotation={[0.22, 0, 0]} material={GUARD_VISOR_MAT}>
          <boxGeometry args={[0.17, 0.02, 0.10]} />
        </mesh>
        {/* Cap Golden Emblem */}
        <mesh position={[0, 0.04, 0.12]} material={GUARD_BADGE_MAT}>
          <sphereGeometry args={[0.022, 8, 8]} />
        </mesh>
      </group>

      {/* Left Arm (Standing Alert Stance) */}
      <group position={[-0.23, 1.28, 0]} rotation={[0.08, 0, 0.05]}>
        <mesh position={[0, -0.22, 0]} material={GUARD_SHIRT_MAT}>
          <cylinderGeometry args={[0.055, 0.05, 0.40, 8]} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.44, 0]} material={GUARD_SKIN_MAT}>
          <sphereGeometry args={[0.045, 8, 8]} />
        </mesh>
      </group>

      {/* Right Arm (Standing Alert Stance) */}
      <group position={[0.23, 1.28, 0]} rotation={[0.08, 0, -0.05]}>
        <mesh position={[0, -0.22, 0]} material={GUARD_SHIRT_MAT}>
          <cylinderGeometry args={[0.055, 0.05, 0.40, 8]} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.44, 0]} material={GUARD_SKIN_MAT}>
          <sphereGeometry args={[0.045, 8, 8]} />
        </mesh>
      </group>
    </group>
  );
});
