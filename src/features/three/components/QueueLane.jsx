import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useQueueStore } from '../../../store/useQueueStore.js';
import { getQueuePathGeometry, dist2D } from '../../../services/layout/queuePathGeometry.js';

// Pre-allocated shared stanchion geometries across all queue components
const postBaseGeometry = new THREE.CylinderGeometry(0.16, 0.18, 0.04, 10);
const postUprightGeometry = new THREE.CylinderGeometry(0.035, 0.035, 1.0, 8);
const postCapGeometry = new THREE.SphereGeometry(0.05, 8, 8);
const arrowGeometry = new THREE.ConeGeometry(0.2, 0.45, 3);

// Covered Queue Canopy Geometries and Materials
const canopyPillarGeom = new THREE.CylinderGeometry(0.08, 0.09, 3.0, 8);
const lanternGeom = new THREE.CylinderGeometry(0.07, 0.1, 0.18, 6);
const canopyTileMaterial = new THREE.MeshStandardMaterial({ color: '#8B3A1C', roughness: 0.65, metalness: 0.15 });
const canopyWoodMaterial = new THREE.MeshStandardMaterial({ color: '#5C3317', roughness: 0.7, metalness: 0.1 });
const lanternGlowMaterial = new THREE.MeshStandardMaterial({ color: '#F59E0B', emissive: '#F59E0B', emissiveIntensity: 0.75, roughness: 0.2 });

// Pre-allocated shared materials
const postBaseMaterial = new THREE.MeshStandardMaterial({ color: '#B06F17', roughness: 0.35, metalness: 0.65 });
const postUprightMaterial = new THREE.MeshStandardMaterial({ color: '#C88722', roughness: 0.35, metalness: 0.65 });
const postCapMaterial = new THREE.MeshStandardMaterial({ color: '#E5A93C', roughness: 0.25, metalness: 0.8 });
const railMaterial = new THREE.MeshStandardMaterial({ color: '#C88722', roughness: 0.35, metalness: 0.65 });

export function QueueLane({ component, isSelected }) {
  const { dimensions, properties } = component;
  const length = dimensions.length || 10;
  const width = dimensions.width || 2;
  const height = dimensions.height || 1.0;
  const lanes = Math.max(1, properties.lanes || 1);

  const isCovered = Boolean(
    properties?.covered ||
    properties?.hasCanopy ||
    properties?.isMergeSpine ||
    component.role?.includes('unified-darshan-queue')
  );

  const { camera } = useThree();
  const showLabels = useQueueStore((state) => state.showLabels);

  const isPathBased = Boolean(
    (properties?.pathData && properties.pathData.type !== 'straight') ||
    ['arc', 'bezier', 'serpentine', 'u_shape', 's_shape', 'radial', 'l_shape'].includes(properties?.shape) ||
    ['arc', 'bezier', 'serpentine', 'u_shape', 's_shape', 'radial', 'l_shape'].includes(properties?.pattern)
  );

  // Compute Path Geometry using centralized mathematical source of truth
  const pathGeom = useMemo(() => {
    return getQueuePathGeometry(component, 0.85);
  }, [component]);

  // Color schemes based on pattern/role
  const pattern = properties.pattern || properties.pathData?.type || 'parallel';
  const isExpansion = Boolean(properties.isExpansion || component.role === 'queue-expansion');
  const isFunnel = pattern === 'v_shape' || pattern === 'funnel' || Boolean(properties.widthStart && properties.widthEnd);

  let runnerColor = '#F2EDE4';
  let guideColor = '#E5DEC9';
  let arrowColor = '#B06F17';

  if (isFunnel) {
    // Authentic sacred temple courtyard sandstone runner for V-shape convergence
    runnerColor = '#ECE4D6';
    guideColor = '#DFD3BE';
    arrowColor = '#B45309';
  } else if (isExpansion) {
    // Authentic courtyard terracotta runner with vibrant golden borders for queue expansion
    runnerColor = '#C25E2E';
    guideColor = '#F59E0B';
    arrowColor = '#FEF08A';
  } else if (pattern === 'serpentine') {
    runnerColor = '#F4EFE6';
    guideColor = '#E8DFCE';
    arrowColor = '#B45309';
  } else if (pattern === 'switchback') {
    runnerColor = '#ECE5D8';
    guideColor = '#DFD3BE';
    arrowColor = '#9A3412';
  } else if (pattern === 'radial' || pattern === 'arc') {
    runnerColor = '#EAE5F2';
    guideColor = '#DAD0E6';
    arrowColor = '#6B21A8';
  } else if (pattern === 'parallel') {
    runnerColor = '#E6ECF0';
    guideColor = '#D4DFE8';
    arrowColor = '#0369A1';
  } else if (pattern === 'dispersal') {
    runnerColor = '#E8EFE8';
    guideColor = '#D2E2D2';
    arrowColor = '#15803D';
  }

  // --- CURVED QUEUE 3D MESH GENERATION ---
  const curvedMesh = useMemo(() => {
    if (!isPathBased || !pathGeom.localPoints || pathGeom.localPoints.length < 2) return null;

    const localPts = pathGeom.localPoints;
    const orients = pathGeom.orientations;
    const n = localPts.length;
    const halfW = width / 2;

    // 1. Extruded Curved Floor Ribbon BufferGeometry
    const floorPositions = [];
    const floorNormals = [];
    const floorUvs = [];
    const floorIndices = [];

    // Also build left and right rail point arrays in local space
    const leftRailLocal = [];
    const rightRailLocal = [];

    for (let i = 0; i < n; i++) {
      const p = localPts[i];
      const o = orients[i] || { nx: 0, nz: 1 };

      const lx = p.x + o.nx * halfW;
      const lz = p.z + o.nz * halfW;
      const rx = p.x - o.nx * halfW;
      const rz = p.z - o.nz * halfW;

      leftRailLocal.push(new THREE.Vector3(lx, 0, lz));
      rightRailLocal.push(new THREE.Vector3(rx, 0, rz));

      // Floor vertices (slightly elevated above site floor: y = 0.015)
      floorPositions.push(lx, 0.015, lz);
      floorPositions.push(rx, 0.015, rz);

      floorNormals.push(0, 1, 0);
      floorNormals.push(0, 1, 0);

      const v = i / (n - 1);
      floorUvs.push(0, v);
      floorUvs.push(1, v);

      if (i < n - 1) {
        const i0 = i * 2;
        const i1 = i * 2 + 1;
        const i2 = (i + 1) * 2;
        const i3 = (i + 1) * 2 + 1;
        floorIndices.push(i0, i1, i2);
        floorIndices.push(i1, i3, i2);
      }
    }

    const floorGeom = new THREE.BufferGeometry();
    floorGeom.setAttribute('position', new THREE.Float32BufferAttribute(floorPositions, 3));
    floorGeom.setAttribute('normal', new THREE.Float32BufferAttribute(floorNormals, 3));
    floorGeom.setAttribute('uv', new THREE.Float32BufferAttribute(floorUvs, 2));
    floorGeom.setIndex(floorIndices);

    // 2. Curved Rails using CatmullRomCurve3 and TubeGeometry
    const leftCurve = new THREE.CatmullRomCurve3(leftRailLocal);
    const rightCurve = new THREE.CatmullRomCurve3(rightRailLocal);

    const tubeSegments = Math.max(16, n * 2);
    const leftUpperRail = new THREE.TubeGeometry(leftCurve, tubeSegments, 0.02, 6, false);
    const leftLowerRail = new THREE.TubeGeometry(leftCurve, tubeSegments, 0.02, 6, false);
    const rightUpperRail = new THREE.TubeGeometry(rightCurve, tubeSegments, 0.02, 6, false);
    const rightLowerRail = new THREE.TubeGeometry(rightCurve, tubeSegments, 0.02, 6, false);

    // 3. Stanchion Posts along left and right borders (~2.0m spacing)
    const stanchions = [];
    const postInterval = 2.0;
    let distSoFar = 0;

    for (let i = 0; i < n; i++) {
      if (i > 0) {
        distSoFar += dist2D(localPts[i - 1], localPts[i]);
      }
      if (i === 0 || i === n - 1 || distSoFar >= postInterval) {
        if (i !== 0 && i !== n - 1) distSoFar = 0;

        const o = orients[i] || { nx: 0, nz: 1 };
        const p = localPts[i];
        // Left post
        stanchions.push({
          x: p.x + o.nx * halfW,
          z: p.z + o.nz * halfW,
        });
        // Right post
        stanchions.push({
          x: p.x - o.nx * halfW,
          z: p.z - o.nz * halfW,
        });
      }
    }

    // 4. Directional Arrows along centerline
    const arrows = [];
    const arrowInterval = 3.0;
    let arrowDist = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i > 0) {
        arrowDist += dist2D(localPts[i - 1], localPts[i]);
      }
      if (i === 1 || arrowDist >= arrowInterval) {
        arrowDist = 0;
        const p = localPts[i];
        const heading = orients[i]?.headingAngle || 0;
        arrows.push({
          x: p.x,
          z: p.z,
          rotationY: heading,
        });
      }
    }

    return {
      floorGeom,
      leftUpperRail,
      leftLowerRail,
      rightUpperRail,
      rightLowerRail,
      stanchions,
      arrows,
    };
  }, [isPathBased, pathGeom, width]);

  // --- LEGACY STRAIGHT QUEUE DATA (100% Backwards Compatible) ---
  const postSpacing = 2.0;
  const numPostsPerSide = Math.max(2, Math.floor(length / postSpacing) + 1);

  const postsData = useMemo(() => {
    if (isPathBased) return [];
    const posts = [];
    const step = length / (numPostsPerSide - 1);
    const startX = -length / 2;

    const numDividers = lanes + 1;
    const laneWidth = width / lanes;

    for (let d = 0; d < numDividers; d++) {
      const zPos = -width / 2 + d * laneWidth;
      for (let i = 0; i < numPostsPerSide; i++) {
        const xPos = startX + i * step;
        posts.push({ x: xPos, z: zPos });
      }
    }
    return posts;
  }, [isPathBased, length, width, lanes, numPostsPerSide]);

  const railsData = useMemo(() => {
    if (isPathBased) return [];
    const rails = [];
    const numDividers = lanes + 1;
    const laneWidth = width / lanes;

    for (let d = 0; d < numDividers; d++) {
      const zPos = -width / 2 + d * laneWidth;
      rails.push({ z: zPos, y: height * 0.85 });
      rails.push({ z: zPos, y: height * 0.45 });
    }
    return rails;
  }, [isPathBased, width, lanes, height]);

  const railGeometry = useMemo(() => {
    if (isPathBased) return null;
    return new THREE.CylinderGeometry(0.02, 0.02, length, 8);
  }, [isPathBased, length]);

  const numArrows = Math.max(1, Math.floor(length / 3));

  const direction = properties.direction || 'west';
  const widthStart = Number(properties.widthStart) || width || 23.5;
  const widthEnd = Number(properties.widthEnd) || 3.2;

  // --- V-SHAPE / FUNNEL QUEUE GEOMETRY ---
  const vFunnelData = useMemo(() => {
    if (!isFunnel) return null;

    const xStart = direction === 'west' ? length / 2 : -length / 2;
    const xEnd = direction === 'west' ? -length / 2 : length / 2;
    const halfWStart = widthStart / 2;
    const halfWEnd = widthEnd / 2;

    const floorPositions = [
      xStart, 0.015, -halfWStart,
      xStart, 0.015,  halfWStart,
      xEnd,   0.015, -halfWEnd,
      xEnd,   0.015,  halfWEnd,
    ];
    const floorNormals = [
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
    ];
    const floorUvs = [
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ];
    const floorIndices = direction === 'west' ? [0, 1, 2, 1, 3, 2] : [0, 2, 1, 1, 2, 3];

    const floorGeom = new THREE.BufferGeometry();
    floorGeom.setAttribute('position', new THREE.Float32BufferAttribute(floorPositions, 3));
    floorGeom.setAttribute('normal', new THREE.Float32BufferAttribute(floorNormals, 3));
    floorGeom.setAttribute('uv', new THREE.Float32BufferAttribute(floorUvs, 2));
    floorGeom.setIndex(floorIndices);

    // Left Arm (top edge in Z: z = -halfW)
    const leftP1 = { x: xStart, z: -halfWStart };
    const leftP2 = { x: xEnd,   z: -halfWEnd };
    const leftArmLen = Math.hypot(leftP2.x - leftP1.x, leftP2.z - leftP1.z);
    const leftAngle = Math.atan2(leftP2.z - leftP1.z, leftP2.x - leftP1.x);
    const leftMid = { x: (leftP1.x + leftP2.x) / 2, z: (leftP1.z + leftP2.z) / 2 };

    // Right Arm (bottom edge in Z: z = +halfW)
    const rightP1 = { x: xStart, z: halfWStart };
    const rightP2 = { x: xEnd,   z: halfWEnd };
    const rightArmLen = Math.hypot(rightP2.x - rightP1.x, rightP2.z - rightP1.z);
    const rightAngle = Math.atan2(rightP2.z - rightP1.z, rightP2.x - rightP1.x);
    const rightMid = { x: (rightP1.x + rightP2.x) / 2, z: (rightP1.z + rightP2.z) / 2 };

    const leftRailGeometry = new THREE.CylinderGeometry(0.02, 0.02, leftArmLen, 8);
    const rightRailGeometry = new THREE.CylinderGeometry(0.02, 0.02, rightArmLen, 8);

    // Stanchions and Canopy pillars along left and right arms
    const numPosts = Math.max(4, Math.floor(leftArmLen / 1.8));
    const stanchions = [];
    const canopyPillars = [];
    for (let i = 0; i <= numPosts; i++) {
      const t = i / numPosts;
      const lx = leftP1.x + t * (leftP2.x - leftP1.x);
      const lz = leftP1.z + t * (leftP2.z - leftP1.z);
      const rx = rightP1.x + t * (rightP2.x - rightP1.x);
      const rz = rightP1.z + t * (rightP2.z - rightP1.z);
      stanchions.push({ x: lx, z: lz });
      stanchions.push({ x: rx, z: rz });
      if (i % 2 === 0 || i === numPosts) {
        canopyPillars.push({ x: lx, z: lz });
        canopyPillars.push({ x: rx, z: rz });
      }
    }

    // Hanging lanterns along central axis
    const numLanterns = Math.max(2, Math.floor(length / 4));
    const lanterns = [];
    for (let i = 0; i < numLanterns; i++) {
      const t = (i + 0.5) / numLanterns;
      lanterns.push({ x: xStart + t * (xEnd - xStart), z: 0 });
    }

    // Roof Canopy Slab Geometry (Trapezoid elevated at y = 3.1)
    const roofOverhang = 0.6;
    const roofPositions = [
      xStart + (direction === 'west' ? roofOverhang : -roofOverhang), 3.1, -halfWStart - roofOverhang,
      xStart + (direction === 'west' ? roofOverhang : -roofOverhang), 3.1,  halfWStart + roofOverhang,
      xEnd   - (direction === 'west' ? roofOverhang : -roofOverhang), 3.1, -halfWEnd - roofOverhang,
      xEnd   - (direction === 'west' ? roofOverhang : -roofOverhang), 3.1,  halfWEnd + roofOverhang,
    ];
    const roofGeom = new THREE.BufferGeometry();
    roofGeom.setAttribute('position', new THREE.Float32BufferAttribute(roofPositions, 3));
    roofGeom.setAttribute('normal', new THREE.Float32BufferAttribute(floorNormals, 3));
    roofGeom.setAttribute('uv', new THREE.Float32BufferAttribute(floorUvs, 2));
    roofGeom.setIndex(floorIndices);

    return {
      floorGeom,
      roofGeom,
      leftRailGeometry,
      rightRailGeometry,
      leftMid,
      leftArmLen,
      leftAngle,
      rightMid,
      rightArmLen,
      rightAngle,
      stanchions,
      canopyPillars,
      lanterns,
      xStart,
      xEnd,
    };
  }, [isFunnel, length, widthStart, widthEnd, direction]);

  const canopyPillars = useMemo(() => {
    if (!isCovered || isFunnel) return [];
    const count = Math.max(2, Math.floor(length / 3.5));
    const pillars = [];
    const halfW = (width + 0.4) / 2;
    for (let i = 0; i <= count; i++) {
      const x = -length / 2 + (i / count) * length;
      pillars.push({ x, z: halfW });
      pillars.push({ x, z: -halfW });
    }
    return pillars;
  }, [isCovered, isFunnel, length, width]);

  const canopyLanterns = useMemo(() => {
    if (!isCovered || isFunnel) return [];
    const count = Math.max(1, Math.floor(length / 4.5));
    const lanterns = [];
    for (let i = 0; i < count; i++) {
      const x = -length / 2 + ((i + 0.5) / count) * length;
      lanterns.push({ x });
    }
    return lanterns;
  }, [isCovered, isFunnel, length]);

  const isCameraClose = camera ? camera.position.length() < 65 : false;
  const isLabelVisible = isSelected || (showLabels && isCameraClose && !isFunnel);

  // Effective visual length for display badge
  const displayLength = isPathBased ? Math.round(pathGeom.totalLength) : Math.round(length);

  return (
    <group>
      {/* ---------------- V-SHAPE / FUNNEL CONVERGENCE QUEUE RENDERER ---------------- */}
      {isFunnel && vFunnelData && (
        <group name="v-shape-funnel-queue">
          {/* Sacred Temple Courtyard Sandstone Runner Floor Surface */}
          <mesh geometry={vFunnelData.floorGeom} receiveShadow>
            <meshStandardMaterial
              color="#ECE4D6"
              roughness={0.65}
              metalness={0.06}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Stone Plinth Curbs beneath Left & Right Stanchion Arms */}
          <mesh
            position={[vFunnelData.leftMid.x, 0.025, vFunnelData.leftMid.z]}
            rotation={[0, -vFunnelData.leftAngle, 0]}
            receiveShadow
          >
            <boxGeometry args={[vFunnelData.leftArmLen + 0.3, 0.04, 0.32]} />
            <meshStandardMaterial color="#8C7355" roughness={0.7} />
          </mesh>
          <mesh
            position={[vFunnelData.rightMid.x, 0.025, vFunnelData.rightMid.z]}
            rotation={[0, -vFunnelData.rightAngle, 0]}
            receiveShadow
          >
            <boxGeometry args={[vFunnelData.rightArmLen + 0.3, 0.04, 0.32]} />
            <meshStandardMaterial color="#8C7355" roughness={0.7} />
          </mesh>

          {/* Golden Brass Inlay Thresholds along Curb Edge */}
          <mesh
            position={[vFunnelData.leftMid.x, 0.046, vFunnelData.leftMid.z]}
            rotation={[0, -vFunnelData.leftAngle, 0]}
          >
            <boxGeometry args={[vFunnelData.leftArmLen, 0.005, 0.035]} />
            <meshStandardMaterial color="#D4AF37" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh
            position={[vFunnelData.rightMid.x, 0.046, vFunnelData.rightMid.z]}
            rotation={[0, -vFunnelData.rightAngle, 0]}
          >
            <boxGeometry args={[vFunnelData.rightArmLen, 0.005, 0.035]} />
            <meshStandardMaterial color="#D4AF37" roughness={0.3} metalness={0.8} />
          </mesh>

          {/* Left Angled Rails & Stanchions (Upper & Lower Double Rails) */}
          <mesh
            position={[vFunnelData.leftMid.x, height * 0.85, vFunnelData.leftMid.z]}
            rotation={[0, -vFunnelData.leftAngle, Math.PI / 2]}
            geometry={vFunnelData.leftRailGeometry}
            material={railMaterial}
          />
          <mesh
            position={[vFunnelData.leftMid.x, height * 0.45, vFunnelData.leftMid.z]}
            rotation={[0, -vFunnelData.leftAngle, Math.PI / 2]}
            geometry={vFunnelData.leftRailGeometry}
            material={railMaterial}
          />
          <mesh
            position={[vFunnelData.leftMid.x, height * 0.45, vFunnelData.leftMid.z]}
            rotation={[0, -vFunnelData.leftAngle, Math.PI / 2]}
            geometry={vFunnelData.leftRailGeometry}
            material={railMaterial}
          />

          {/* Right Angled Rails & Stanchions (Upper & Lower Double Rails) */}
          <mesh
            position={[vFunnelData.rightMid.x, height * 0.85, vFunnelData.rightMid.z]}
            rotation={[0, -vFunnelData.rightAngle, Math.PI / 2]}
            geometry={vFunnelData.rightRailGeometry}
            material={railMaterial}
          />
          <mesh
            position={[vFunnelData.rightMid.x, height * 0.45, vFunnelData.rightMid.z]}
            rotation={[0, -vFunnelData.rightAngle, Math.PI / 2]}
            geometry={vFunnelData.rightRailGeometry}
            material={railMaterial}
          />

          {/* Stanchion Posts along both Angled Arms */}
          {vFunnelData.stanchions.map((p, idx) => (
            <group key={`vp-${idx}`} position={[p.x, 0, p.z]}>
              <mesh position={[0, 0.02, 0]} geometry={postBaseGeometry} material={postBaseMaterial} />
              <mesh position={[0, height / 2, 0]} scale={[1, height, 1]} geometry={postUprightGeometry} material={postUprightMaterial} />
              <mesh position={[0, height + 0.04, 0]} geometry={postCapGeometry} material={postCapMaterial} />
            </group>
          ))}

          {/* V-Shape Arcade Canopy Pavilion */}
          {isCovered && (
            <group name="v-shape-covered-canopy">
              {/* Trapezoid Pitched Roof Slab */}
              <mesh geometry={vFunnelData.roofGeom} castShadow receiveShadow>
                <primitive object={canopyTileMaterial} attach="material" />
              </mesh>

              {/* Central Ridge Beam */}
              <mesh
                position={[(vFunnelData.xStart + vFunnelData.xEnd) / 2, 3.26, 0]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.09, 0.09, length + 0.8, 8]} />
                <primitive object={canopyWoodMaterial} attach="material" />
              </mesh>

              {/* Supporting Pillars along both V-arms */}
              {vFunnelData.canopyPillars.map((p, idx) => (
                <group key={`vcp-${idx}`} position={[p.x, 0, p.z]}>
                  <mesh position={[0, 0.1, 0]}>
                    <boxGeometry args={[0.26, 0.2, 0.26]} />
                    <meshStandardMaterial color="#5C4033" roughness={0.8} />
                  </mesh>
                  <mesh position={[0, 1.55, 0]} geometry={canopyPillarGeom} material={canopyWoodMaterial} castShadow />
                  <mesh position={[0, 3.0, 0]}>
                    <boxGeometry args={[0.3, 0.15, 0.3]} />
                    <meshStandardMaterial color="#B06F17" roughness={0.4} metalness={0.6} />
                  </mesh>
                </group>
              ))}

              {/* Suspended Brass Lanterns along Centerline */}
              {vFunnelData.lanterns.map((l, idx) => (
                <group key={`vcl-${idx}`} position={[l.x, 2.7, l.z]}>
                  <mesh position={[0, 0.15, 0]}>
                    <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
                    <meshStandardMaterial color="#C88722" metalness={0.8} />
                  </mesh>
                  <mesh geometry={lanternGeom} material={lanternGlowMaterial} />
                </group>
              ))}
            </group>
          )}
        </group>
      )}

      {/* ---------------- AUTHENTIC COVERED QUEUE CANOPY PAVILION (STRAIGHT) ---------------- */}
      {isCovered && !isFunnel && (
        <group name="temple-covered-queue-canopy">
          {/* Canopy Roof Structure (Pitched Terracotta / Copper Shingle Roof) */}
          <group position={[0, 3.1, 0]}>
            {/* Primary Pitched Roof Slab */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[length + 0.6, 0.16, width + 0.9]} />
              <primitive object={canopyTileMaterial} attach="material" />
            </mesh>
            {/* Central Peak Ridge */}
            <mesh position={[0, 0.16, 0]} castShadow>
              <boxGeometry args={[length + 0.7, 0.12, 0.28]} />
              <primitive object={canopyWoodMaterial} attach="material" />
            </mesh>
            {/* Ornamental Gold Eaves Border */}
            <mesh position={[0, -0.09, (width + 0.9) / 2]}>
              <boxGeometry args={[length + 0.6, 0.05, 0.05]} />
              <meshStandardMaterial color="#E5A93C" roughness={0.25} metalness={0.8} />
            </mesh>
            <mesh position={[0, -0.09, -(width + 0.9) / 2]}>
              <boxGeometry args={[length + 0.6, 0.05, 0.05]} />
              <meshStandardMaterial color="#E5A93C" roughness={0.25} metalness={0.8} />
            </mesh>
          </group>

          {/* Supporting Carved Wooden/Stone Arcade Pillars along both sides */}
          {canopyPillars.map((p, idx) => (
            <group key={`cp-${idx}`} position={[p.x, 0, p.z]}>
              <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[0.26, 0.2, 0.26]} />
                <meshStandardMaterial color="#5C4033" roughness={0.8} />
              </mesh>
              <mesh position={[0, 1.55, 0]} geometry={canopyPillarGeom} material={canopyWoodMaterial} castShadow />
              <mesh position={[0, 3.0, 0]}>
                <boxGeometry args={[0.3, 0.15, 0.3]} />
                <meshStandardMaterial color="#B06F17" roughness={0.4} metalness={0.6} />
              </mesh>
            </group>
          ))}

          {/* Overhead Hanging Temple Brass Lanterns */}
          {canopyLanterns.map((l, idx) => (
            <group key={`cl-${idx}`} position={[l.x, 2.7, 0]}>
              <mesh position={[0, 0.15, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
                <meshStandardMaterial color="#C88722" metalness={0.8} />
              </mesh>
              <mesh geometry={lanternGeom} material={lanternGlowMaterial} />
            </group>
          ))}
        </group>
      )}
      {/* ---------------- PATH-BASED CURVED RENDERER ---------------- */}
      {isPathBased && !isFunnel && curvedMesh && (
        <group>
          {/* Continuous Curved Floor Ribbon */}
          <mesh geometry={curvedMesh.floorGeom} receiveShadow>
            <meshStandardMaterial color={runnerColor} roughness={0.8} metalness={0.05} side={THREE.DoubleSide} />
          </mesh>

          {/* Direction Arrows following curve heading */}
          {curvedMesh.arrows.map((a, idx) => (
            <mesh
              key={idx}
              position={[a.x, 0.032, a.z]}
              rotation={[-Math.PI / 2, 0, a.rotationY - Math.PI / 2]}
              geometry={arrowGeometry}
            >
              <meshBasicMaterial color={arrowColor} opacity={0.75} transparent />
            </mesh>
          ))}

          {/* Stanchion Posts along left and right curves */}
          {curvedMesh.stanchions.map((p, idx) => (
            <group key={idx} position={[p.x, 0, p.z]}>
              <mesh position={[0, 0.02, 0]} geometry={postBaseGeometry} material={postBaseMaterial} />
              <mesh position={[0, height / 2, 0]} scale={[1, height, 1]} geometry={postUprightGeometry} material={postUprightMaterial} />
              <mesh position={[0, height + 0.04, 0]} geometry={postCapGeometry} material={postCapMaterial} />
            </group>
          ))}

          {/* Continuous 3D Curved Rails */}
          <mesh position={[0, height * 0.85, 0]} geometry={curvedMesh.leftUpperRail} material={railMaterial} />
          <mesh position={[0, height * 0.45, 0]} geometry={curvedMesh.leftLowerRail} material={railMaterial} />
          <mesh position={[0, height * 0.85, 0]} geometry={curvedMesh.rightUpperRail} material={railMaterial} />
          <mesh position={[0, height * 0.45, 0]} geometry={curvedMesh.rightLowerRail} material={railMaterial} />
        </group>
      )}

      {/* ---------------- LEGACY STRAIGHT QUEUE RENDERER ---------------- */}
      {!isPathBased && !isFunnel && (
        <group>
          {/* Queue Runner Floor Surface */}
          <mesh position={[0, 0.015, 0]} receiveShadow>
            <boxGeometry args={[length, 0.025, width]} />
            <meshStandardMaterial color={runnerColor} roughness={0.8} metalness={0.05} />
          </mesh>

          {/* Lane Border Guide Lines */}
          {Array.from({ length: lanes }).map((_, i) => {
            const laneW = width / lanes;
            const zCenter = -width / 2 + (i + 0.5) * laneW;
            return (
              <group key={i}>
                <mesh position={[0, 0.028, zCenter]}>
                  <boxGeometry args={[length - 0.2, 0.005, laneW * 0.75]} />
                  <meshStandardMaterial color={guideColor} roughness={0.7} />
                </mesh>

                {Array.from({ length: numArrows }).map((_, aIdx) => {
                  const xPos = -length / 2 + (aIdx + 0.8) * (length / (numArrows + 0.5));
                  return (
                    <mesh key={aIdx} position={[xPos, 0.032, zCenter]} rotation={[-Math.PI / 2, 0, 0]} geometry={arrowGeometry}>
                      <meshBasicMaterial color={arrowColor} opacity={0.75} transparent />
                    </mesh>
                  );
                })}
              </group>
            );
          })}

          {/* Repeated Stanchion Posts */}
          {postsData.map((p, idx) => (
            <group key={idx} position={[p.x, 0, p.z]}>
              <mesh position={[0, 0.02, 0]} geometry={postBaseGeometry} material={postBaseMaterial} />
              <mesh position={[0, height / 2, 0]} scale={[1, height, 1]} geometry={postUprightGeometry} material={postUprightMaterial} />
              <mesh position={[0, height + 0.04, 0]} geometry={postCapGeometry} material={postCapMaterial} />
            </group>
          ))}

          {/* Continuous Horizontal Stanchion Rails */}
          {railGeometry && railsData.map((r, idx) => (
            <mesh key={idx} position={[0, r.y, r.z]} rotation={[0, 0, Math.PI / 2]} geometry={railGeometry} material={railMaterial} />
          ))}
        </group>
      )}

      {/* Label Badge with true path-length info */}
      {isLabelVisible && (
        <Html position={[0, height + 0.6, 0]} center distanceFactor={26} zIndexRange={[100, 0]}>
          <div className={`pointer-events-none select-none px-2.5 py-1 rounded font-mono text-[10px] font-bold tracking-wider backdrop-blur-sm whitespace-nowrap shadow-md border ${
            isExpansion
              ? 'bg-amber-950/95 text-amber-200 border-amber-500 ring-1 ring-amber-400/50 shadow-amber-900/40'
              : 'bg-amber-950/80 text-amber-100 border-amber-600/40'
          }`}>
            {isExpansion ? '⚡ COURTYARD EXPANSION: ' : 'QUEUE: '}
            {isFunnel
              ? `V-SHAPE MERGE ${Math.round(widthStart)}m→${Math.round(widthEnd)}m`
              : isPathBased
              ? `${pattern.toUpperCase()} ${displayLength}m × ${width}m`
              : `${displayLength}m × ${width}m`}
          </div>
        </Html>
      )}
    </group>
  );
}
