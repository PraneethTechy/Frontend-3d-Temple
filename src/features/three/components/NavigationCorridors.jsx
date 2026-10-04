import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSimulationStore } from '../../simulation/simulationStore.js';
import { useQueueStore } from '../../../store/useQueueStore.js';

// ============================================================================
// DEVASETU REALISTIC ELEVATED PEDESTRIAN REDIRECTION BRIDGE & STAIRS
// Monolithic Festival Campus Pedestrian Overpass Architecture
// Connects Congested North Entrance -> Alternate West / East Entrances
// Ground Landing -> Ascent Stairs -> Top Landing -> Elevated Deck -> Corner ->
// Elevated Deck -> Top Landing -> Descent Stairs -> Ground Landing
// ============================================================================

import {
  BRIDGE_HEIGHT,
  BRIDGE_DECK_WIDTH,
  NUM_STAIR_STEPS,
  STAIR_RUN_LENGTH,
  LANDING_DEPTH,
  NORTH_WEST_BRIDGE_CONFIG,
  NORTH_EAST_BRIDGE_CONFIG,
} from './overpassGeometry.js';

export {
  BRIDGE_HEIGHT,
  BRIDGE_DECK_WIDTH,
  NUM_STAIR_STEPS,
  STAIR_RUN_LENGTH,
  LANDING_DEPTH,
};

// --- Reusable Structural Geometries ---
const colBaseGeom = new THREE.BoxGeometry(0.85, 0.40, 0.85);
const colShaftGeom = new THREE.CylinderGeometry(0.26, 0.30, BRIDGE_HEIGHT - 0.70, 8);
const colCapitalGeom = new THREE.BoxGeometry(1.0, 0.35, 1.0);
const transverseBentGeom = new THREE.BoxGeometry(0.42, 0.36, BRIDGE_DECK_WIDTH);

const balusterPostGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.05, 8);
const balusterCapGeom = new THREE.SphereGeometry(0.065, 8, 8);

const portalPillarGeom = new THREE.BoxGeometry(0.55, 3.4, 0.55);
const portalLintelGeom = new THREE.BoxGeometry(BRIDGE_DECK_WIDTH + 1.2, 0.45, 0.60);
const portalFinialGeom = new THREE.ConeGeometry(0.22, 0.70, 6);
const portalBeaconGeom = new THREE.SphereGeometry(0.18, 12, 12);
const turnstileArmGeom = new THREE.CylinderGeometry(0.035, 0.035, 1.45, 8);

// --- Materials for Durable Temple Festival Infrastructure ---
const structuralColumnMaterial = new THREE.MeshStandardMaterial({
  color: '#423126', // Dressed heavy temple basalt / granite stone
  roughness: 0.88,
  metalness: 0.10,
});

const bridgeDeckMaterial = new THREE.MeshStandardMaterial({
  color: '#E8DED1', // Textured non-slip Rajasthan sandstone deck
  roughness: 0.82,
  metalness: 0.04,
});

const stairTreadMaterial = new THREE.MeshStandardMaterial({
  color: '#DECDBB', // Durable stone treads with high pedestrian grip
  roughness: 0.80,
  metalness: 0.05,
});

const stairNosingMaterial = new THREE.MeshStandardMaterial({
  color: '#7D4F28', // High-contrast safety nosing on step edge
  roughness: 0.60,
  metalness: 0.25,
});

const graniteCurbMaterial = new THREE.MeshStandardMaterial({
  color: '#2E1E14', // Heavy dark granite structural curbs & stringers
  roughness: 0.90,
  metalness: 0.15,
});

const railingSteelMaterial = new THREE.MeshStandardMaterial({
  color: '#B57922', // Heavy-duty architectural bronze / brass safety railing
  roughness: 0.35,
  metalness: 0.72,
});

const finialGoldMaterial = new THREE.MeshStandardMaterial({
  color: '#E5A93C', // Auspicious Kalasa pinnacle gold
  roughness: 0.25,
  metalness: 0.85,
});

const beaconActiveMaterial = new THREE.MeshBasicMaterial({
  color: '#10B981', // Emerald green when active redirection route
});

const beaconStandbyMaterial = new THREE.MeshBasicMaterial({
  color: '#F59E0B', // Amber standby beacon
});

const arrowStandbyMaterial = new THREE.MeshStandardMaterial({
  color: '#B45309',
  roughness: 0.4,
  metalness: 0.6,
});

const arrowActiveMaterial = new THREE.MeshStandardMaterial({
  color: '#10B981',
  emissive: '#10B981',
  emissiveIntensity: 0.85,
  roughness: 0.2,
  metalness: 0.7,
});

/**
 * RailingSegment
 * Mathematically bulletproof cylindrical rail connecting p1 [x,y,z] to p2 [x,y,z].
 * Zero Euler rotation errors, zero flipped slopes.
 */
function RailingSegment({ p1, p2, radius = 0.035, material = railingSteelMaterial }) {
  const [geometry, mid, quat] = useMemo(() => {
    const v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
    const v2 = new THREE.Vector3(p2[0], p2[1], p2[2]);
    const length = v1.distanceTo(v2);
    if (length < 0.01) return [null, null, null];
    const midPoint = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(v2, v1).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
    const geom = new THREE.CylinderGeometry(radius, radius, length, 8);
    return [geom, midPoint, quaternion];
  }, [p1, p2, radius]);

  if (!geometry) return null;
  return (
    <mesh geometry={geometry} position={mid} quaternion={quat} material={material} castShadow />
  );
}

/**
 * PierBent
 * Heavy twin-column structural support bent anchored to ground.
 */
function PierBent({ position, rotationY = 0, width = BRIDGE_DECK_WIDTH, height = BRIDGE_HEIGHT }) {
  const halfW = width / 2;
  return (
    <group position={[position.x, 0, position.z]} rotation={[0, rotationY, 0]}>
      {/* Left Column */}
      <group position={[halfW - 0.40, 0, 0]}>
        <mesh position={[0, 0.20, 0]} geometry={colBaseGeom} material={structuralColumnMaterial} castShadow />
        <mesh position={[0, (height - 0.35) / 2, 0]} geometry={colShaftGeom} material={structuralColumnMaterial} castShadow />
        <mesh position={[0, height - 0.25, 0]} geometry={colCapitalGeom} material={structuralColumnMaterial} castShadow />
      </group>

      {/* Right Column */}
      <group position={[-halfW + 0.40, 0, 0]}>
        <mesh position={[0, 0.20, 0]} geometry={colBaseGeom} material={structuralColumnMaterial} castShadow />
        <mesh position={[0, (height - 0.35) / 2, 0]} geometry={colShaftGeom} material={structuralColumnMaterial} castShadow />
        <mesh position={[0, height - 0.25, 0]} geometry={colCapitalGeom} material={structuralColumnMaterial} castShadow />
      </group>

      {/* Transverse Crosshead Girder Beam */}
      <mesh position={[0, height - 0.18, 0]} geometry={transverseBentGeom} material={structuralColumnMaterial} />
    </group>
  );
}

/**
 * GroundLandingPad
 * Solid ground-level stone apron connecting the ground approach seamlessly to the stairs.
 * Includes grand temple entrance pylons and illuminated status beacons.
 */
function GroundLandingPad({
  position,      // Center of landing pad [x, z]
  rotationY = 0, // Heading along flow
  width = BRIDGE_DECK_WIDTH,
  depth = LANDING_DEPTH,
  isOpen = false,
  title = 'Bridge Ground Landing',
}) {
  const beaconRef = useRef();
  const halfW = width / 2;
  const halfD = depth / 2;

  useFrame(({ clock }) => {
    if (beaconRef.current) {
      const t = clock.getElapsedTime();
      const intensity = isOpen ? 0.85 + Math.sin(t * 6) * 0.25 : 0.35;
      beaconRef.current.material.opacity = intensity;
    }
  });

  return (
    <group position={[position.x, 0, position.z]} rotation={[0, rotationY, 0]}>
      {/* Solid Granite Apron Plinth */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[width + 0.4, 0.12, depth]} />
        <primitive object={graniteCurbMaterial} attach="material" />
      </mesh>
      {/* Top Sandstone Paver Surface */}
      <mesh position={[0, 0.125, 0]} receiveShadow>
        <boxGeometry args={[width, 0.02, depth - 0.1]} />
        <primitive object={bridgeDeckMaterial} attach="material" />
      </mesh>

      {/* Left Temple Pylon */}
      <mesh position={[halfW + 0.35, 1.7, -halfD + 0.3]} geometry={portalPillarGeom} material={structuralColumnMaterial} castShadow />
      <mesh position={[halfW + 0.35, 3.65, -halfD + 0.3]} geometry={portalFinialGeom} material={finialGoldMaterial} />

      {/* Right Temple Pylon */}
      <mesh position={[-halfW - 0.35, 1.7, -halfD + 0.3]} geometry={portalPillarGeom} material={structuralColumnMaterial} castShadow />
      <mesh position={[-halfW - 0.35, 3.65, -halfD + 0.3]} geometry={portalFinialGeom} material={finialGoldMaterial} />

      {/* Overhead Lintel Archway */}
      <mesh position={[0, 3.35, -halfD + 0.3]} geometry={portalLintelGeom} material={structuralColumnMaterial} castShadow />
      <mesh position={[0, 3.85, -halfD + 0.3]} geometry={portalFinialGeom} material={finialGoldMaterial} />

      {/* Dynamic Status LED Beacon */}
      <mesh
        ref={beaconRef}
        position={[0, 3.6, -halfD + 0.65]}
        geometry={portalBeaconGeom}
        material={isOpen ? beaconActiveMaterial : beaconStandbyMaterial}
      />

      {/* Crowd Turnstile Arms (swing open when active redirection occurs) */}
      <group position={[-halfW + 0.3, 0.85, -halfD + 0.3]} rotation={[0, isOpen ? 1.05 : 0.05, 0]}>
        <mesh position={[0.72, 0, 0]} rotation={[0, 0, Math.PI / 2]} geometry={turnstileArmGeom} material={railingSteelMaterial} />
      </group>
      <group position={[halfW - 0.3, 0.85, -halfD + 0.3]} rotation={[0, isOpen ? -1.05 : -0.05, 0]}>
        <mesh position={[-0.72, 0, 0]} rotation={[0, 0, Math.PI / 2]} geometry={turnstileArmGeom} material={railingSteelMaterial} />
      </group>

      {/* Left & Right Ground Apron Balustrades */}
      <RailingSegment
        p1={[halfW, 0.12 + 1.05, -halfD + 0.3]}
        p2={[halfW, 0.12 + 1.05, halfD]}
        radius={0.035}
      />
      <RailingSegment
        p1={[-halfW, 0.12 + 1.05, -halfD + 0.3]}
        p2={[-halfW, 0.12 + 1.05, halfD]}
        radius={0.035}
      />
    </group>
  );
}

/**
 * TopLandingPlatform
 * Elevated horizontal platform at y = BRIDGE_HEIGHT (2.6m).
 * Bridges the top of the stairs flush into the bridge span deck.
 * Supported by a heavy pier bent directly underneath.
 */
function TopLandingPlatform({
  position,      // Center [x, z]
  rotationY = 0, // Orientation
  width = BRIDGE_DECK_WIDTH,
  depth = LANDING_DEPTH,
  height = BRIDGE_HEIGHT,
  isActive = false,
}) {
  const halfW = width / 2;
  const halfD = depth / 2;

  return (
    <group position={[position.x, 0, position.z]} rotation={[0, rotationY, 0]}>
      {/* Supporting Pier Bent directly under the top landing */}
      <PierBent position={{ x: 0, z: 0 }} rotationY={0} width={width} height={height} />

      {/* Solid Sandstone Deck Slab */}
      <mesh position={[0, height - 0.10, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, 0.20, depth]} />
        <primitive object={bridgeDeckMaterial} attach="material" />
      </mesh>

      {/* Granite Side Curbs */}
      <mesh position={[halfW + 0.06, height + 0.08, 0]}>
        <boxGeometry args={[0.12, 0.16, depth]} />
        <primitive object={graniteCurbMaterial} attach="material" />
      </mesh>
      <mesh position={[-halfW - 0.06, height + 0.08, 0]}>
        <boxGeometry args={[0.12, 0.16, depth]} />
        <primitive object={graniteCurbMaterial} attach="material" />
      </mesh>

      {/* Left Side Safety Railings */}
      <RailingSegment p1={[halfW, height + 1.05, -halfD]} p2={[halfW, height + 1.05, halfD]} radius={0.035} />
      <RailingSegment p1={[halfW, height + 0.58, -halfD]} p2={[halfW, height + 0.58, halfD]} radius={0.024} />

      {/* Right Side Safety Railings */}
      <RailingSegment p1={[-halfW, height + 1.05, -halfD]} p2={[-halfW, height + 1.05, halfD]} radius={0.035} />
      <RailingSegment p1={[-halfW, height + 0.58, -halfD]} p2={[-halfW, height + 0.58, halfD]} radius={0.024} />

      {/* Baluster Posts */}
      <group position={[halfW, height + 0.52, 0]}>
        <mesh geometry={balusterPostGeom} material={railingSteelMaterial} />
        <mesh position={[0, 0.55, 0]} geometry={balusterCapGeom} material={finialGoldMaterial} />
      </group>
      <group position={[-halfW, height + 0.52, 0]}>
        <mesh geometry={balusterPostGeom} material={railingSteelMaterial} />
        <mesh position={[0, 0.55, 0]} geometry={balusterCapGeom} material={finialGoldMaterial} />
      </group>
    </group>
  );
}

/**
 * SolidStairsFlight
 * Monolithic, gapless staircase rising from ground (y=0) to deck (y=BRIDGE_HEIGHT).
 * Every step is a solid stone mass anchored all the way to y=0 (NO floating steps).
 * Solid granite cheek balustrade walls flank both sides.
 * Handrails connect directly from bottom landing to top landing.
 */
function SolidStairsFlight({
  pStart, // Ground edge [x, z]
  pEnd,   // Deck edge [x, z]
  height = BRIDGE_HEIGHT,
  width = BRIDGE_DECK_WIDTH,
  isDescent = false,
  isActive = false,
}) {
  const dx = pEnd.x - pStart.x;
  const dz = pEnd.z - pStart.z;
  const runLength = Math.sqrt(dx * dx + dz * dz);
  if (runLength < 0.5) return null;

  const headingAngle = Math.atan2(dx, dz);
  const midX = (pStart.x + pEnd.x) / 2;
  const midZ = (pStart.z + pEnd.z) / 2;
  const halfW = width / 2;

  const numSteps = NUM_STAIR_STEPS;
  const stepRise = height / numSteps;    // ~0.1857m
  const stepTread = runLength / numSteps; // ~0.45m

  // Compute step geometry and railing points in local space
  // Local coordinate system: local Z runs along pStart -> pEnd (from -runLength/2 to +runLength/2)
  const stepBoxes = [];
  for (let i = 0; i < numSteps; i++) {
    // If descent: i=0 is near pStart (at top deck, height - stepRise), i=numSteps-1 is at ground (stepRise)
    // If ascent: i=0 is near pStart (at ground, stepRise), i=numSteps-1 is at deck (height)
    const stepTopY = isDescent
      ? height - i * stepRise
      : (i + 1) * stepRise;

    const zCenter = -runLength / 2 + (i + 0.5) * stepTread;

    stepBoxes.push({
      idx: i,
      boxHeight: stepTopY,
      centerY: stepTopY / 2,
      topY: stepTopY,
      z: zCenter,
    });
  }

  // Calculate rail start and end points in local space
  const startRailY = isDescent ? height + 1.05 : 1.05;
  const endRailY = isDescent ? 1.05 : height + 1.05;
  const startMidRailY = isDescent ? height + 0.58 : 0.58;
  const endMidRailY = isDescent ? 0.58 : height + 0.58;

  // Stanchion posts spaced along the 26-step flight
  const postStepIndices = [1, 5, 9, 13, 17, 21, 25];

  return (
    <group position={[midX, 0, midZ]} rotation={[0, headingAngle, 0]}>
      {/* 1. Solid Monolithic Stone Steps (Extending solid mass to ground - ZERO GAPS) */}
      {stepBoxes.map((st) => (
        <group key={`solid-step-${st.idx}`} position={[0, 0, st.z]}>
          {/* Solid Substructure Mass from y = 0 to step height */}
          <mesh position={[0, st.centerY, 0]} receiveShadow castShadow>
            <boxGeometry args={[width, st.boxHeight, stepTread + 0.02]} />
            <primitive object={structuralColumnMaterial} attach="material" />
          </mesh>
          {/* Finished Rajasthan Sandstone Tread Cap */}
          <mesh position={[0, st.topY - 0.02, 0]} receiveShadow castShadow>
            <boxGeometry args={[width, 0.04, stepTread + 0.03]} />
            <primitive object={stairTreadMaterial} attach="material" />
          </mesh>
          {/* Contrast High-Grip Safety Nosing on Step Front Edge */}
          <mesh position={[0, st.topY - 0.015, stepTread / 2]}>
            <boxGeometry args={[width - 0.02, 0.03, 0.04]} />
            <primitive object={stairNosingMaterial} attach="material" />
          </mesh>
        </group>
      ))}

      {/* 2. Solid Granite Flanking Balustrade Cheek Walls (Left & Right) */}
      {stepBoxes.map((st) => (
        <group key={`cheek-wall-${st.idx}`} position={[0, 0, st.z]}>
          {/* Left Cheek Block */}
          <mesh position={[halfW + 0.10, (st.topY + 0.35) / 2, 0]} castShadow>
            <boxGeometry args={[0.20, st.topY + 0.35, stepTread + 0.02]} />
            <primitive object={graniteCurbMaterial} attach="material" />
          </mesh>
          {/* Right Cheek Block */}
          <mesh position={[-halfW - 0.10, (st.topY + 0.35) / 2, 0]} castShadow>
            <boxGeometry args={[0.20, st.topY + 0.35, stepTread + 0.02]} />
            <primitive object={graniteCurbMaterial} attach="material" />
          </mesh>
        </group>
      ))}

      {/* 3. Continuous Inclined Safety Handrails (Left & Right) */}
      {/* Left Top Handrail */}
      <RailingSegment
        p1={[halfW + 0.10, startRailY, -runLength / 2]}
        p2={[halfW + 0.10, endRailY, runLength / 2]}
        radius={0.038}
      />
      {/* Left Knee Rail */}
      <RailingSegment
        p1={[halfW + 0.10, startMidRailY, -runLength / 2]}
        p2={[halfW + 0.10, endMidRailY, runLength / 2]}
        radius={0.024}
      />
      {/* Right Top Handrail */}
      <RailingSegment
        p1={[-halfW - 0.10, startRailY, -runLength / 2]}
        p2={[-halfW - 0.10, endRailY, runLength / 2]}
        radius={0.038}
      />
      {/* Right Knee Rail */}
      <RailingSegment
        p1={[-halfW - 0.10, startMidRailY, -runLength / 2]}
        p2={[-halfW - 0.10, endMidRailY, runLength / 2]}
        radius={0.024}
      />

      {/* 4. Vertical Baluster Stanchions Anchored into Stringers */}
      {postStepIndices.map((pIdx) => {
        const st = stepBoxes[pIdx];
        if (!st) return null;
        const postY = st.topY + 0.52;
        return (
          <group key={`stair-post-${pIdx}`}>
            {/* Left Post */}
            <group position={[halfW + 0.10, postY, st.z]}>
              <mesh geometry={balusterPostGeom} material={railingSteelMaterial} />
              <mesh position={[0, 0.55, 0]} geometry={balusterCapGeom} material={finialGoldMaterial} />
            </group>
            {/* Right Post */}
            <group position={[-halfW - 0.10, postY, st.z]}>
              <mesh geometry={balusterPostGeom} material={railingSteelMaterial} />
              <mesh position={[0, 0.55, 0]} geometry={balusterCapGeom} material={finialGoldMaterial} />
            </group>
          </group>
        );
      })}

      {/* 5. Inlaid Directional Arrow on Stair Run */}
      <mesh
        position={[0, height / 2 + 0.15, 0]}
        rotation={[-Math.PI / 2 + (isDescent ? -0.38 : 0.38), 0, 0]}
      >
        <coneGeometry args={[0.30, 0.65, 3]} />
        <primitive object={isActive ? arrowActiveMaterial : arrowStandbyMaterial} attach="material" />
      </mesh>
    </group>
  );
}

/**
 * PedestrianBridgeSpan
 * Elevated horizontal walking deck span at y = BRIDGE_HEIGHT (2.6m).
 * Features twin-column pier bents spaced every 6.0m underneath,
 * non-slip sandstone deck, dark granite curbs, and code-compliant side safety railings.
 */
function PedestrianBridgeSpan({
  p1,
  p2,
  height = BRIDGE_HEIGHT,
  width = BRIDGE_DECK_WIDTH,
  isActive = false,
}) {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length < 0.5) return null;

  const headingAngle = Math.atan2(dx, dz);
  const midX = (p1.x + p2.x) / 2;
  const midZ = (p1.z + p2.z) / 2;
  const halfW = width / 2;
  const halfL = length / 2;

  // Support column bents spaced every 6.0m
  const columnInterval = 6.0;
  const colCount = Math.max(1, Math.floor(length / columnInterval));
  const columnZ = [];
  for (let i = 0; i <= colCount; i++) {
    const t = -0.5 + (i + 0.5) / (colCount + 1);
    columnZ.push(t * length);
  }

  // Safety railing posts every 2.0m
  const railingInterval = 2.0;
  const postCount = Math.max(2, Math.floor(length / railingInterval));
  const postZ = [];
  for (let p = 0; p <= postCount; p++) {
    const t = -0.5 + p / postCount;
    postZ.push(t * length);
  }

  // Directional chevrons every 4.0m
  const chevronCount = Math.max(1, Math.floor(length / 4.0));
  const chevronZ = [];
  for (let c = 1; c <= chevronCount; c++) {
    const t = -0.5 + c / (chevronCount + 1);
    chevronZ.push(t * length);
  }

  return (
    <group position={[midX, 0, midZ]} rotation={[0, headingAngle, 0]}>
      {/* 1. Structural Support Column Bents beneath deck (leaving 2.35m clearance underneath) */}
      {columnZ.map((zPos, idx) => (
        <PierBent
          key={`col-bent-${idx}`}
          position={{ x: 0, z: zPos }}
          width={width}
          height={height}
        />
      ))}

      {/* 2. Longitudinal Structural Box Girders beneath deck */}
      <mesh position={[halfW - 0.40, height - 0.16, 0]} castShadow>
        <boxGeometry args={[0.36, 0.32, length]} />
        <primitive object={graniteCurbMaterial} attach="material" />
      </mesh>
      <mesh position={[-halfW + 0.40, height - 0.16, 0]} castShadow>
        <boxGeometry args={[0.36, 0.32, length]} />
        <primitive object={graniteCurbMaterial} attach="material" />
      </mesh>

      {/* 3. Solid Sandstone Walking Deck Floor */}
      <mesh position={[0, height - 0.10, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, 0.20, length]} />
        <primitive object={bridgeDeckMaterial} attach="material" />
      </mesh>

      {/* 4. Granite Perimeter Safety Curbs */}
      <mesh position={[halfW + 0.06, height + 0.08, 0]}>
        <boxGeometry args={[0.12, 0.16, length]} />
        <primitive object={graniteCurbMaterial} attach="material" />
      </mesh>
      <mesh position={[-halfW - 0.06, height + 0.08, 0]}>
        <boxGeometry args={[0.12, 0.16, length]} />
        <primitive object={graniteCurbMaterial} attach="material" />
      </mesh>

      {/* 5. Continuous Pedestrian Safety Railings */}
      {/* Left Top Handrail */}
      <RailingSegment p1={[halfW, height + 1.05, -halfL]} p2={[halfW, height + 1.05, halfL]} radius={0.035} />
      {/* Left Mid-Rail */}
      <RailingSegment p1={[halfW, height + 0.58, -halfL]} p2={[halfW, height + 0.58, halfL]} radius={0.024} />
      {/* Right Top Handrail */}
      <RailingSegment p1={[-halfW, height + 1.05, -halfL]} p2={[-halfW, height + 1.05, halfL]} radius={0.035} />
      {/* Right Mid-Rail */}
      <RailingSegment p1={[-halfW, height + 0.58, -halfL]} p2={[-halfW, height + 0.58, halfL]} radius={0.024} />

      {/* 6. Vertical Stanchion Posts every 2.0m */}
      {postZ.map((zPos, idx) => (
        <group key={`deck-post-${idx}`}>
          {/* Left Post */}
          <group position={[halfW, height + 0.52, zPos]}>
            <mesh geometry={balusterPostGeom} material={railingSteelMaterial} />
            <mesh position={[0, 0.55, 0]} geometry={balusterCapGeom} material={finialGoldMaterial} />
          </group>
          {/* Right Post */}
          <group position={[-halfW, height + 0.52, zPos]}>
            <mesh geometry={balusterPostGeom} material={railingSteelMaterial} />
            <mesh position={[0, 0.55, 0]} geometry={balusterCapGeom} material={finialGoldMaterial} />
          </group>
        </group>
      ))}

      {/* 7. Directional Inlaid Chevron Arrows along center walkway */}
      {chevronZ.map((zPos, idx) => (
        <mesh
          key={`deck-chev-${idx}`}
          position={[0, height + 0.015, zPos]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <coneGeometry args={[0.28, 0.60, 3]} />
          <primitive object={isActive ? arrowActiveMaterial : arrowStandbyMaterial} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/**
 * PedestrianBridgeCorner
 * Elevated 4.0m × 4.0m square turning junction at y = BRIDGE_HEIGHT (2.6m).
 * Supported by 4 heavy corner columns underneath.
 */
function PedestrianBridgeCorner({
  corner,
  height = BRIDGE_HEIGHT,
  width = 4.5,
  isActive = false,
}) {
  const beaconRef = useRef();
  const halfW = width / 2;

  useFrame(({ clock }) => {
    if (beaconRef.current) {
      const t = clock.getElapsedTime();
      const intensity = isActive ? 0.90 + Math.sin(t * 7) * 0.20 : 0.40;
      beaconRef.current.material.opacity = intensity;
    }
  });

  return (
    <group position={[corner.x, 0, corner.z]}>
      {/* 4 Heavy Structural Corner Columns */}
      {[-halfW + 0.45, halfW - 0.45].map((colX) =>
        [-halfW + 0.45, halfW - 0.45].map((colZ) => (
          <group key={`corner-col-${colX}-${colZ}`} position={[colX, 0, colZ]}>
            <mesh position={[0, 0.20, 0]} geometry={colBaseGeom} material={structuralColumnMaterial} castShadow />
            <mesh position={[0, (height - 0.35) / 2, 0]} geometry={colShaftGeom} material={structuralColumnMaterial} castShadow />
            <mesh position={[0, height - 0.25, 0]} geometry={colCapitalGeom} material={structuralColumnMaterial} castShadow />
          </group>
        ))
      )}

      {/* Elevated Solid Corner Platform Deck */}
      <mesh position={[0, height - 0.10, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, 0.20, width]} />
        <primitive object={bridgeDeckMaterial} attach="material" />
      </mesh>

      {/* Outer Perimeter Curb */}
      <mesh position={[0, height + 0.08, -halfW - 0.06]}>
        <boxGeometry args={[width + 0.24, 0.16, 0.12]} />
        <primitive object={graniteCurbMaterial} attach="material" />
      </mesh>
      <mesh position={[-halfW - 0.06, height + 0.08, 0]}>
        <boxGeometry args={[0.12, 0.16, width + 0.24]} />
        <primitive object={graniteCurbMaterial} attach="material" />
      </mesh>

      {/* Outer Safety Railings */}
      <RailingSegment p1={[-halfW, height + 1.05, -halfW]} p2={[halfW, height + 1.05, -halfW]} radius={0.038} />
      <RailingSegment p1={[-halfW, height + 0.58, -halfW]} p2={[halfW, height + 0.58, -halfW]} radius={0.024} />
      <RailingSegment p1={[-halfW, height + 1.05, -halfW]} p2={[-halfW, height + 1.05, halfW]} radius={0.038} />
      <RailingSegment p1={[-halfW, height + 0.58, -halfW]} p2={[-halfW, height + 0.58, halfW]} radius={0.024} />

      {/* Corner Posts */}
      <group position={[-halfW, height + 0.52, -halfW]}>
        <mesh geometry={balusterPostGeom} material={railingSteelMaterial} />
        <mesh position={[0, 0.55, 0]} geometry={balusterCapGeom} material={finialGoldMaterial} />
      </group>

      {/* Overhead Directional Guidance Beacon on Stone Pillar */}
      <mesh position={[-halfW + 0.5, height + 0.85, -halfW + 0.5]} geometry={portalPillarGeom} material={structuralColumnMaterial} />
      <mesh position={[-halfW + 0.5, height + 2.65, -halfW + 0.5]} geometry={portalFinialGeom} material={finialGoldMaterial} />
      <mesh
        ref={beaconRef}
        position={[-halfW + 0.5, height + 2.3, -halfW + 0.5]}
        geometry={portalBeaconGeom}
        material={isActive ? beaconActiveMaterial : beaconStandbyMaterial}
      />
    </group>
  );
}

/**
 * PedestrianBridgeSystem
 * Unified pedestrian overpass bridge connecting congested entrance to alternate entrance:
 * 1. Ground Landing Pad 1 (North approach)
 * 2. Ascent SolidStairsFlight (rising smoothly towards bridge deck)
 * 3. Top Landing Platform 1 (supported by pier bent underneath)
 * 4. Elevated Bridge Deck Span 1 (with support columns and ~2.35m clearance)
 * 5. Corner Platform (turning smoothly 90°)
 * 6. Elevated Bridge Deck Span 2 (with support columns and ~2.35m clearance)
 * 7. Top Landing Platform 2 (supported by pier bent underneath)
 * 8. Descent SolidStairsFlight (descending smoothly towards destination approach)
 * 9. Ground Landing Pad 2 (West/East destination plaza)
 */
function PedestrianBridgeSystem({
  id,
  name,
  // North approach ground landing
  groundLanding1Center,
  groundLanding1RotationY,
  // Ascent stairs
  stairAscentStart,
  stairAscentEnd,
  // Top landing 1
  topLanding1Center,
  topLanding1RotationY,
  // Deck span 1
  span1Start,
  span1End,
  // Corner platform
  corner,
  // Deck span 2
  span2Start,
  span2End,
  // Top landing 2
  topLanding2Center,
  topLanding2RotationY,
  // Descent stairs
  stairDescentStart,
  stairDescentEnd,
  // Destination ground landing
  groundLanding2Center,
  groundLanding2RotationY,
  // Shared properties
  height = BRIDGE_HEIGHT,
  width = BRIDGE_DECK_WIDTH,
  isActive = false,
}) {
  return (
    <group name={`pedestrian-bridge-${id}`}>
      {/* 1. North Ground Landing Pad */}
      <GroundLandingPad
        position={groundLanding1Center}
        rotationY={groundLanding1RotationY}
        width={width}
        depth={LANDING_DEPTH}
        isOpen={isActive}
        title={`${name} Ingress Landing`}
      />

      {/* 2. Ascent Stairs Flight (Aligned with walking direction towards bridge deck) */}
      <SolidStairsFlight
        pStart={stairAscentStart}
        pEnd={stairAscentEnd}
        height={height}
        width={width}
        isDescent={false}
        isActive={isActive}
      />

      {/* 3. Top Landing Platform 1 (Directly supported by pier bent underneath) */}
      <TopLandingPlatform
        position={topLanding1Center}
        rotationY={topLanding1RotationY}
        width={width}
        depth={LANDING_DEPTH}
        height={height}
        isActive={isActive}
      />

      {/* 4. Elevated Bridge Deck Span 1 */}
      <PedestrianBridgeSpan
        p1={span1Start}
        p2={span1End}
        height={height}
        width={width}
        isActive={isActive}
      />

      {/* 5. Corner Platform */}
      <PedestrianBridgeCorner
        corner={corner}
        height={height}
        width={4.5}
        isActive={isActive}
      />

      {/* 6. Elevated Bridge Deck Span 2 */}
      <PedestrianBridgeSpan
        p1={span2Start}
        p2={span2End}
        height={height}
        width={width}
        isActive={isActive}
      />

      {/* 7. Top Landing Platform 2 (Directly supported by pier bent underneath) */}
      <TopLandingPlatform
        position={topLanding2Center}
        rotationY={topLanding2RotationY}
        width={width}
        depth={LANDING_DEPTH}
        height={height}
        isActive={isActive}
      />

      {/* 8. Descent Stairs Flight (Aligned with walking direction towards destination) */}
      <SolidStairsFlight
        pStart={stairDescentStart}
        pEnd={stairDescentEnd}
        height={height}
        width={width}
        isDescent={true}
        isActive={isActive}
      />

      {/* 9. Destination Ground Landing Pad */}
      <GroundLandingPad
        position={groundLanding2Center}
        rotationY={groundLanding2RotationY}
        width={width}
        depth={LANDING_DEPTH}
        isOpen={isActive}
        title={`${name} Egress Landing`}
      />
    </group>
  );
}

// ============================================================================
// CONTINUOUS INTEGRATED OVERPASS BRIDGE CONFIGURATIONS (100K Festival Campus)
//
// North-to-West Bridge:
// - North Ground Landing: center x = -19.5, z = -74.0 (runs x: -18.25 to -20.75)
// - Ascent Stairs: starts x = -20.75, ends x = -27.05, z = -74.0 (run = 6.30m, rise = 0 -> 2.6m)
// - Top Landing 1: center x = -28.3, z = -74.0 (runs x: -27.05 to -29.55)
// - Bridge Span 1: x = -29.55 to -76.0, z = -74.0 (y = 2.6m, length = 46.45m)
// - Corner Platform: center x = -78.0, z = -74.0 (4m x 4m)
// - Bridge Span 2: z = -72.0 to -29.55, x = -78.0 (y = 2.6m, length = 42.45m)
// - Top Landing 2: center x = -78.0, z = -28.3 (runs z: -29.55 to -27.05)
// - Descent Stairs: starts z = -27.05, ends z = -20.75, x = -78.0 (run = 6.30m, drop = 2.6m -> 0)
// - West Ground Landing: center x = -78.0, z = -19.5 (runs z: -20.75 to -18.25)
// ============================================================================


/**
 * NavigationCorridors
 * Renders the realistic elevated pedestrian overpass bridge system ONLY in the 100K Festival Campus.
 * In a new/empty temple site or manual mode, returns null (scene remains completely empty).
 */
export function NavigationCorridors() {
  const components = useQueueStore((state) => state.scene?.components) || [];
  const aiNavigationState = useSimulationStore((state) => state.aiNavigationState);
  const diversionApproved = useSimulationStore((state) => state.diversionApproved);

  const isDiverting = Boolean(diversionApproved && aiNavigationState?.active);
  const targetStream = aiNavigationState?.targetStream;

  // CRITICAL REQUIREMENT: 100K FESTIVAL ONLY
  // When user creates a new/empty temple site or manual designer:
  // Scene must remain completely empty. Never show bridge structures on empty stage!
  const isFestivalCampus = components.some(
    (c) => c.role === 'north-gopuram' || c.generationId?.startsWith('fest')
  );

  if (!isFestivalCampus) {
    return null;
  }

  const isNwActive = isDiverting && targetStream === 'west';
  const isNeActive = isDiverting && targetStream === 'east';

  return (
    <group name="festival-pedestrian-redirection-bridges">
      {/* 1. North-to-West Monolithic Elevated Pedestrian Bridge */}
      <PedestrianBridgeSystem
        {...NORTH_WEST_BRIDGE_CONFIG}
        isActive={isNwActive}
      />

      {/* 2. North-to-East Monolithic Elevated Pedestrian Bridge */}
      <PedestrianBridgeSystem
        {...NORTH_EAST_BRIDGE_CONFIG}
        isActive={isNeActive}
      />
    </group>
  );
}
