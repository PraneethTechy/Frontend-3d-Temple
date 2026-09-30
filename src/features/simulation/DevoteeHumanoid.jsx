import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AGENT_STATES } from './simulationModel.js';

// ============================================================================
// PRE-ALLOCATED SHARED SINGLETON GEOMETRIES
// Reused across all 300 visual agents for 60+ FPS performance with zero per-frame allocations
// ============================================================================

// --- HEAD & HAIR ---
const headGeometry = new THREE.SphereGeometry(0.165, 12, 10);
headGeometry.scale(0.92, 1.05, 0.95); // Natural contoured human head

const neckGeometry = new THREE.CylinderGeometry(0.065, 0.075, 0.14, 8);

const hairMaleCropGeom = new THREE.SphereGeometry(0.172, 10, 8);
hairMaleCropGeom.scale(0.95, 1.02, 1.0);
hairMaleCropGeom.translate(0, 0.03, -0.015);

const hairMaleTopKnotGeom = new THREE.SphereGeometry(0.065, 8, 6);
hairMaleTopKnotGeom.translate(0, 0.17, -0.05);

const hairFemaleBunGeom = new THREE.SphereGeometry(0.11, 10, 8);
hairFemaleBunGeom.scale(1.1, 0.95, 0.9);
hairFemaleBunGeom.translate(0, 0.02, -0.14);

const jasmineGajraGeom = new THREE.TorusGeometry(0.125, 0.034, 8, 16);
jasmineGajraGeom.translate(0, 0.02, -0.14);

const tilakGeometry = new THREE.BoxGeometry(0.024, 0.055, 0.015);
const bindiGeometry = new THREE.SphereGeometry(0.020, 6, 6);

// --- TORSO & SHOULDERS ---
// Male Chest / Kurta Upper
const maleChestGeom = new THREE.BoxGeometry(0.44, 0.42, 0.26);
// Female Chest / Blouse & Saree Drape
const femaleChestGeom = new THREE.BoxGeometry(0.38, 0.38, 0.24);

// Shoulder Caps (smooth connector to arms)
const shoulderCapGeom = new THREE.SphereGeometry(0.08, 8, 6);

// Male Kurta Lower Tunic
const maleKurtaLowerGeom = new THREE.BoxGeometry(0.45, 0.30, 0.27);
maleKurtaLowerGeom.translate(0, -0.15, 0);

// Sacred Angavastram / Shawl folded across male shoulder
const shawlGeom = new THREE.BoxGeometry(0.48, 0.12, 0.30);

// Saree Diagonal Pallu Drape crossing torso from waist over left shoulder
const sareePalluGeom = new THREE.BoxGeometry(0.15, 0.44, 0.28);
sareePalluGeom.rotateZ(0.28);

// Female Saree Lower Skirt (flowing silhouette)
const sareeSkirtGeom = new THREE.CylinderGeometry(0.22, 0.30, 0.68, 12);
sareeSkirtGeom.translate(0, -0.34, 0);

// --- ARMS & HANDS (Dual-articulated: Upper Arm + Forearm with natural forward bend) ---
const upperArmGeom = new THREE.CylinderGeometry(0.052, 0.046, 0.28, 8);
upperArmGeom.translate(0, -0.14, 0);

const forearmGeom = new THREE.CylinderGeometry(0.044, 0.038, 0.26, 8);
forearmGeom.translate(0, -0.13, 0.03); // Natural slight forward angle

const handGeom = new THREE.BoxGeometry(0.065, 0.085, 0.035);
handGeom.translate(0, -0.04, 0.02);

// --- LEGS & FEET (Dual-articulated: Upper Leg + Lower Leg with knee flex) ---
const upperLegGeom = new THREE.CylinderGeometry(0.075, 0.062, 0.38, 8);
upperLegGeom.translate(0, -0.19, 0);

const lowerLegGeom = new THREE.CylinderGeometry(0.060, 0.048, 0.38, 8);
lowerLegGeom.translate(0, -0.19, 0);

// Dhoti Wrap Leg (wider traditional silhouette with gold hem)
const dhotiLegGeom = new THREE.CylinderGeometry(0.11, 0.09, 0.72, 8);
dhotiLegGeom.translate(0, -0.36, 0);

const dhotiBorderGeom = new THREE.CylinderGeometry(0.095, 0.092, 0.04, 8);
dhotiBorderGeom.translate(0, -0.68, 0);

// Traditional Sandal / Paduka Foot
const sandalFootGeom = new THREE.BoxGeometry(0.11, 0.055, 0.23);
sandalFootGeom.translate(0, 0.02, 0.04);

// Darshan Reverence Aura
const haloGeometry = new THREE.RingGeometry(0.24, 0.38, 16);

// ============================================================================
// PRE-ALLOCATED SHARED PALETTE MATERIALS
// Authentic Indian Temple Attire, Skin Tones, and Sacred Accents
// ============================================================================

// Traditional Devotee Garment Swatches (Saffron, Maroon, Turmeric, Ivory Kurta, Mustard, Forest Green, Silk Navy, Terracotta, Rose Pink, Sandstone)
const CLOTHING_COLORS = [
  '#EA580C', // Sacred Saffron
  '#7F1D1D', // Deep Temple Maroon
  '#D97706', // Turmeric Ochre
  '#FAF7F0', // Pristine White / Ivory Kurta
  '#CA8A04', // Golden Mustard
  '#047857', // Temple Forest Green
  '#1E3A8A', // Deep Silk Navy
  '#854D0E', // Earthy Terracotta Sandstone
  '#9D174D', // Deep Rose Kumkum
  '#A88B6B', // Natural Sandstone Beige
];

// Secondary accent colors for sarees and shawls
const ACCENT_COLORS = [
  '#D4AF37', // Temple Gold Zari
  '#FAF5EE', // Ivory Silk
  '#B45309', // Warm Ochre
  '#831843', // Deep Crimson
  '#065F46', // Deep Emerald
];

const CLOTHING_MATERIALS = CLOTHING_COLORS.map(
  (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05 })
);

const ACCENT_MATERIALS = ACCENT_COLORS.map(
  (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.50, metalness: 0.25 })
);

// Natural Indian skin tones
const SKIN_TONES = ['#6D4023', '#8D5524', '#A66B38', '#C68642', '#E0AC69'];
const SKIN_MATERIALS = SKIN_TONES.map(
  (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.0 })
);

const HAIR_DARK = new THREE.MeshStandardMaterial({ color: '#171412', roughness: 0.85, metalness: 0.0 });
const HAIR_BROWN = new THREE.MeshStandardMaterial({ color: '#2C1D11', roughness: 0.85, metalness: 0.0 });

const GAJRA_JASMINE_MATERIAL = new THREE.MeshStandardMaterial({ color: '#FFFDF0', roughness: 0.6, metalness: 0.0 });
const GOLD_ZARI_MATERIAL = new THREE.MeshStandardMaterial({ color: '#D4AF37', roughness: 0.35, metalness: 0.75 });
const SANDAL_MATERIAL = new THREE.MeshStandardMaterial({ color: '#4A3B32', roughness: 0.8, metalness: 0.1 });
const TILAK_VERMILION = new THREE.MeshBasicMaterial({ color: '#DC2626' });
const TILAK_CHANDAN = new THREE.MeshBasicMaterial({ color: '#FDE68A' });

const DARSHAN_HALO_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#F59E0B',
  transparent: true,
  opacity: 0.65,
  side: THREE.DoubleSide,
});

/**
 * Realistic Stylized 3D Temple Visitor
 * Features natural human anatomy, authentic Indian temple attire (Kurta/Dhoti, Saree, Salwar),
 * time-based gait with counter-swinging arms, knee flexion, torso bob, queue micro-movement,
 * Namaste prayer posture during Darshan, and smooth frame-rate independent kinematics.
 */
export const DevoteeHumanoid = React.memo(function DevoteeHumanoid({ agent }) {
  const rootRef = useRef();
  const torsoRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const leftLowerLegRef = useRef();
  const rightLowerLegRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const leftForearmRef = useRef();
  const rightForearmRef = useRef();
  const headRef = useRef();
  const haloRef = useRef();

  // Deterministic appearance traits derived from agent ID (Point 3, 4, 18, 19)
  const traits = useMemo(() => {
    const rawId = agent?.id ?? 1;
    const numId = typeof rawId === 'number' ? rawId : parseInt(String(rawId).replace(/\D/g, '') || '1', 10);
    const safeId = isNaN(numId) ? 1 : numId;
    const hash = (safeId * 2654435761) >>> 0;

    const isFemale = ((hash >>> 2) % 2) === 0;
    const gender = isFemale ? 'female' : 'male';

    // Height variation (Point 19: 1.6m to 1.88m)
    const baseScale = isFemale ? 1.34 : 1.45;
    const scale = baseScale + ((hash % 16) / 100) * 0.14;

    const clothingIdx = hash % CLOTHING_MATERIALS.length;
    const accentIdx = (hash >>> 3) % ACCENT_MATERIALS.length;
    const skinIdx = (hash >>> 5) % SKIN_MATERIALS.length;
    const hairMat = (hash % 3 === 0) ? HAIR_BROWN : HAIR_DARK;
    const hairStyle = isFemale ? 'bun_gajra' : ((hash >>> 6) % 3 === 0 ? 'topknot' : 'cropped');

    // Attire styling (Point 4)
    const attire = isFemale
      ? ((hash >>> 4) % 2 === 0 ? 'saree' : 'salwar')
      : ((hash >>> 4) % 2 === 0 ? 'kurta_dhoti' : 'kurta_pyjama');

    const walkSpeedMult = 0.90 + ((hash >>> 7) % 22) / 100;
    const initialPhase = ((hash >>> 8) % 100) * 0.06283;

    return {
      gender,
      scale,
      clothingMaterial: CLOTHING_MATERIALS[clothingIdx] || CLOTHING_MATERIALS[0],
      accentMaterial: ACCENT_MATERIALS[accentIdx] || ACCENT_MATERIALS[0],
      skinMaterial: SKIN_MATERIALS[skinIdx] || SKIN_MATERIALS[0],
      hairMaterial: hairMat,
      hairStyle,
      attire,
      walkSpeedMult,
      initialPhase,
      hasShawl: !isFemale && (hash % 2 === 0),
    };
  }, [agent?.id]);

  // Per-frame walking kinematics, turning, and idle/Darshan postures (Point 5, 6, 7, 8, 11, 15)
  useFrame(({ clock }, delta) => {
    if (!rootRef.current) return;

    // 1. Synchronize Position
    rootRef.current.position.set(agent.position.x, 0, agent.position.z);

    // 2. Smooth Whole-Body Orientation toward Travel Heading (Point 7 & 8)
    const targetHeading = agent.targetHeading !== undefined ? agent.targetHeading : (agent.rotationY || 0);
    let diff = (targetHeading - rootRef.current.rotation.y) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;

    const turnSpeed = agent.stalled ? 6.0 : 9.5;
    rootRef.current.rotation.y += diff * (1 - Math.exp(-delta * turnSpeed));

    // 3. Smooth Velocity / Walk-to-Idle Interpolation (Point 6 & 11)
    const speed = agent.currentSpeed || 0;
    const isMoving = !agent.stalled && speed > 0.06;
    const targetAnimWeight = isMoving ? 1.0 : 0.0;
    agent.animWeight = (agent.animWeight ?? 0) + (targetAnimWeight - (agent.animWeight ?? 0)) * (1 - Math.exp(-delta * 8.5));

    const isDarshan = agent.state === AGENT_STATES.DARSHAN;
    agent.darshanWeight = (agent.darshanWeight ?? 0) + ((isDarshan ? 1.0 : 0.0) - (agent.darshanWeight ?? 0)) * (1 - Math.exp(-delta * 6.0));

    if (agent.animWeight > 0.01) {
      // Advance continuous walk cycle (never resets abruptly across waypoints)
      const walkRate = Math.max(0.6, speed) * 7.2 * traits.walkSpeedMult;
      agent.walkCycle = (agent.walkCycle || traits.initialPhase) + delta * walkRate;
      const phase = agent.walkCycle;

      // Leg stride kinematics (Point 5)
      const stride = Math.sin(phase) * 0.62 * agent.animWeight;
      if (leftLegRef.current) leftLegRef.current.rotation.x = stride;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -stride;

      // Knee flexion during forward leg swing (foot ground clearance)
      const leftKneeFlex = Math.max(0, -Math.sin(phase)) * 0.32 * agent.animWeight;
      const rightKneeFlex = Math.max(0, Math.sin(phase)) * 0.32 * agent.animWeight;
      if (leftLowerLegRef.current) leftLowerLegRef.current.rotation.x = leftKneeFlex;
      if (rightLowerLegRef.current) rightLowerLegRef.current.rotation.x = rightKneeFlex;

      // Natural counter-swinging arms
      const armSwing = -Math.sin(phase) * 0.44 * agent.animWeight * (1 - agent.darshanWeight);
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = armSwing;
        leftArmRef.current.rotation.z = 0.05; // Natural slight lateral clearance
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -armSwing;
        rightArmRef.current.rotation.z = -0.05;
      }

      // Forearm natural 20° forward flexion while walking
      if (leftForearmRef.current) leftForearmRef.current.rotation.x = 0.22 * agent.animWeight * (1 - agent.darshanWeight);
      if (rightForearmRef.current) rightForearmRef.current.rotation.x = 0.22 * agent.animWeight * (1 - agent.darshanWeight);

      // Torso vertical bobbing (2 bobs per full walk stride cycle)
      if (torsoRef.current) {
        const bob = Math.abs(Math.sin(phase)) * 0.034 * agent.animWeight;
        const sway = Math.sin(phase) * 0.018 * agent.animWeight;
        torsoRef.current.position.y = 0.82 + bob;
        torsoRef.current.rotation.z = sway;
      }

      if (headRef.current) {
        headRef.current.rotation.x = -0.04 * agent.animWeight; // Slight forward focus while walking
      }
    } else {
      // Idle / Queue Waiting Behavior (Point 11)
      agent.idleTimer = (agent.idleTimer || 0) + delta;
      const breathing = Math.sin(agent.idleTimer * 2.3) * 0.012;
      const weightShift = Math.sin(agent.idleTimer * 0.6) * 0.022;

      if (torsoRef.current) {
        torsoRef.current.position.y = 0.82 + breathing;
        torsoRef.current.rotation.z = weightShift * (1 - agent.darshanWeight);
      }

      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftLowerLegRef.current) leftLowerLegRef.current.rotation.x = 0;
      if (rightLowerLegRef.current) rightLowerLegRef.current.rotation.x = 0;

      // Normal resting arm hang when not in Darshan
      if (agent.darshanWeight < 0.05) {
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = 0;
          leftArmRef.current.rotation.z = 0.04;
        }
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = 0;
          rightArmRef.current.rotation.z = -0.04;
        }
        if (leftForearmRef.current) leftForearmRef.current.rotation.x = 0.12;
        if (rightForearmRef.current) rightForearmRef.current.rotation.x = 0.12;
      }
    }

    // 4. Sacred Darshan Prayer (Anjali Mudra / Namaste Gesture) (Point 15)
    if (agent.darshanWeight > 0.01) {
      const dw = agent.darshanWeight;
      // Both arms smoothly rise and fold into prayer in front of chest
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -0.65 * dw;
        leftArmRef.current.rotation.y = 0.55 * dw;
        leftArmRef.current.rotation.z = 0.35 * dw;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -0.65 * dw;
        rightArmRef.current.rotation.y = -0.55 * dw;
        rightArmRef.current.rotation.z = -0.35 * dw;
      }
      if (leftForearmRef.current) leftForearmRef.current.rotation.x = 0.85 * dw;
      if (rightForearmRef.current) rightForearmRef.current.rotation.x = 0.85 * dw;

      // Devotional bow (torso tilts forward reverently)
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.10 * dw;
      }
      if (headRef.current) {
        headRef.current.rotation.x = 0.12 * dw;
      }
      if (haloRef.current) {
        haloRef.current.rotation.z += delta * 1.8;
      }
    } else {
      if (torsoRef.current && agent.animWeight < 0.05) {
        torsoRef.current.rotation.x = 0;
      }
      if (headRef.current && agent.animWeight < 0.05) {
        headRef.current.rotation.x = 0;
      }
    }
  });

  const {
    gender,
    scale,
    clothingMaterial,
    accentMaterial,
    skinMaterial,
    hairMaterial,
    hairStyle,
    attire,
    hasShawl,
  } = traits;

  const isFemale = gender === 'female';

  return (
    <group ref={rootRef} scale={[scale, scale, scale]}>
      {/* ==================================================================== */}
      {/* LEGS & FEET (Articulated at Hips Y = 0.80) */}
      {/* ==================================================================== */}
      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.13, 0.78, 0]}>
        {attire === 'kurta_dhoti' ? (
          // Traditional Dhoti Wrap with Golden Hem
          <group>
            <mesh geometry={dhotiLegGeom} material={clothingMaterial} />
            <mesh geometry={dhotiBorderGeom} material={GOLD_ZARI_MATERIAL} />
          </group>
        ) : (
          // Articulated Trouser / Salwar Leg
          <group>
            <mesh geometry={upperLegGeom} material={clothingMaterial} />
            <group ref={leftLowerLegRef} position={[0, -0.38, 0]}>
              <mesh geometry={lowerLegGeom} material={clothingMaterial} />
              {/* Foot Sandal */}
              <mesh position={[0, -0.38, 0]} geometry={sandalFootGeom} material={SANDAL_MATERIAL} />
            </group>
          </group>
        )}
        {attire === 'kurta_dhoti' && (
          <mesh position={[0, -0.74, 0]} geometry={sandalFootGeom} material={SANDAL_MATERIAL} />
        )}
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.13, 0.78, 0]}>
        {attire === 'kurta_dhoti' ? (
          <group>
            <mesh geometry={dhotiLegGeom} material={clothingMaterial} />
            <mesh geometry={dhotiBorderGeom} material={GOLD_ZARI_MATERIAL} />
          </group>
        ) : (
          <group>
            <mesh geometry={upperLegGeom} material={clothingMaterial} />
            <group ref={rightLowerLegRef} position={[0, -0.38, 0]}>
              <mesh geometry={lowerLegGeom} material={clothingMaterial} />
              {/* Foot Sandal */}
              <mesh position={[0, -0.38, 0]} geometry={sandalFootGeom} material={SANDAL_MATERIAL} />
            </group>
          </group>
        )}
        {attire === 'kurta_dhoti' && (
          <mesh position={[0, -0.74, 0]} geometry={sandalFootGeom} material={SANDAL_MATERIAL} />
        )}
      </group>

      {/* Saree Lower Flared Skirt (Female Saree Attire) */}
      {attire === 'saree' && (
        <group position={[0, 0.76, 0]}>
          <mesh geometry={sareeSkirtGeom} material={clothingMaterial} />
          {/* Zari Gold Hem Border */}
          <mesh position={[0, -0.66, 0]} geometry={dhotiBorderGeom} scale={[2.8, 1, 2.8]} material={GOLD_ZARI_MATERIAL} />
        </group>
      )}

      {/* ==================================================================== */}
      {/* TORSO & UPPER BODY (Articulated at Waist Y = 0.82) */}
      {/* ==================================================================== */}
      <group ref={torsoRef} position={[0, 0.82, 0]}>
        {/* Main Chest - SOLE SHADOW CASTER for ultra-efficient 60+ FPS rendering */}
        <mesh
          position={[0, 0.22, 0]}
          geometry={isFemale ? femaleChestGeom : maleChestGeom}
          material={clothingMaterial}
          castShadow
        />

        {/* Kurta Lower Tunic Extension (Male) */}
        {!isFemale && (
          <mesh position={[0, 0.02, 0]} geometry={maleKurtaLowerGeom} material={clothingMaterial} />
        )}

        {/* Shoulders Caps */}
        <mesh position={[-0.24, 0.36, 0]} geometry={shoulderCapGeom} material={clothingMaterial} />
        <mesh position={[0.24, 0.36, 0]} geometry={shoulderCapGeom} material={clothingMaterial} />

        {/* Sacred Angavastram / Shawl (Male) */}
        {hasShawl && (
          <mesh position={[0, 0.38, 0]} geometry={shawlGeom} material={accentMaterial} />
        )}

        {/* Diagonal Saree Pallu Drape (Female Saree) */}
        {attire === 'saree' && (
          <group position={[-0.04, 0.24, 0.02]}>
            <mesh geometry={sareePalluGeom} material={accentMaterial} />
          </group>
        )}

        {/* Neck */}
        <mesh position={[0, 0.48, 0]} geometry={neckGeometry} material={skinMaterial} />

        {/* Head */}
        <group ref={headRef} position={[0, 0.66, 0]}>
          <mesh geometry={headGeometry} material={skinMaterial} />

          {/* Hair & Ornaments */}
          {hairStyle === 'cropped' && (
            <mesh geometry={hairMaleCropGeom} material={hairMaterial} />
          )}

          {hairStyle === 'topknot' && (
            <group>
              <mesh geometry={hairMaleCropGeom} material={hairMaterial} />
              <mesh geometry={hairMaleTopKnotGeom} material={hairMaterial} />
            </group>
          )}

          {hairStyle === 'bun_gajra' && (
            <group>
              <mesh geometry={hairMaleCropGeom} material={hairMaterial} />
              {/* Traditional Low Hair Bun (Kondai) */}
              <mesh geometry={hairFemaleBunGeom} material={hairMaterial} />
              {/* Fragrant White Jasmine Gajra Garland */}
              <mesh geometry={jasmineGajraGeom} material={GAJRA_JASMINE_MATERIAL} />
            </group>
          )}

          {/* Tilak / Bindi */}
          {isFemale ? (
            <mesh position={[0, 0.02, 0.16]} geometry={bindiGeometry} material={TILAK_VERMILION} />
          ) : (
            <group position={[0, 0.02, 0.16]}>
              <mesh geometry={tilakGeometry} material={TILAK_VERMILION} />
              <mesh position={[0, -0.015, -0.002]} scale={[1.6, 0.4, 0.5]} geometry={tilakGeometry} material={TILAK_CHANDAN} />
            </group>
          )}
        </group>

        {/* ==================================================================== */}
        {/* ARMS (Dual-articulated at Shoulders Y = 0.36) */}
        {/* ==================================================================== */}
        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.26, 0.36, 0]}>
          <mesh geometry={upperArmGeom} material={clothingMaterial} />
          <group ref={leftForearmRef} position={[0, -0.28, 0]}>
            <mesh geometry={forearmGeom} material={skinMaterial} />
            <mesh position={[0, -0.26, 0.03]} geometry={handGeom} material={skinMaterial} />
          </group>
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef} position={[0.26, 0.36, 0]}>
          <mesh geometry={upperArmGeom} material={clothingMaterial} />
          <group ref={rightForearmRef} position={[0, -0.28, 0]}>
            <mesh geometry={forearmGeom} material={skinMaterial} />
            <mesh position={[0, -0.26, 0.03]} geometry={handGeom} material={skinMaterial} />
          </group>
        </group>
      </group>

      {/* Sacred Darshan Reverence Aura (Radially illuminated halo when viewing deity) */}
      {agent.state === AGENT_STATES.DARSHAN && (
        <mesh
          ref={haloRef}
          position={[0, 1.88, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={haloGeometry}
          material={DARSHAN_HALO_MATERIAL}
        />
      )}
    </group>
  );
});
