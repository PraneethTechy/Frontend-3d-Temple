import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useQueueStore } from '../../../store/useQueueStore.js';

// Pre-allocated shared stanchion geometries across all queue components
const postBaseGeometry = new THREE.CylinderGeometry(0.16, 0.18, 0.04, 10);
const postUprightGeometry = new THREE.CylinderGeometry(0.035, 0.035, 1.0, 8);
const postCapGeometry = new THREE.SphereGeometry(0.05, 8, 8);
const arrowGeometry = new THREE.ConeGeometry(0.2, 0.45, 3);

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

  const { camera } = useThree();
  const showLabels = useQueueStore((state) => state.showLabels);

  // Stanchion post positions along the length
  const postSpacing = 2.0;
  const numPostsPerSide = Math.max(2, Math.floor(length / postSpacing) + 1);

  const postsData = useMemo(() => {
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
  }, [length, width, lanes, numPostsPerSide]);

  // Rail bars connecting posts along length
  const railsData = useMemo(() => {
    const rails = [];
    const numDividers = lanes + 1;
    const laneWidth = width / lanes;

    for (let d = 0; d < numDividers; d++) {
      const zPos = -width / 2 + d * laneWidth;
      rails.push({ z: zPos, y: height * 0.85 });
      rails.push({ z: zPos, y: height * 0.45 });
    }
    return rails;
  }, [width, lanes, height]);

  const railGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.02, 0.02, length, 8);
  }, [length]);

  // Visual pattern differentiation for 2D & 3D view
  const pattern = properties.pattern || 'parallel';
  let runnerColor = '#F2EDE4'; // Default Warm Cream
  let guideColor = '#E5DEC9';
  let arrowColor = '#B06F17';

  if (pattern === 'serpentine') {
    runnerColor = '#F4EFE6';
    guideColor = '#E8DFCE';
    arrowColor = '#B45309';
  } else if (pattern === 'switchback') {
    runnerColor = '#ECE5D8';
    guideColor = '#DFD3BE';
    arrowColor = '#9A3412';
  } else if (pattern === 'radial') {
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

  const numArrows = Math.max(1, Math.floor(length / 3));

  // Intelligent Label Hierarchy (Part 9): only closer zoom or when selected
  const isCameraClose = camera ? camera.position.length() < 65 : false;
  const isLabelVisible = isSelected || (showLabels && isCameraClose);

  return (
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
            {/* Center Guide Runner */}
            <mesh position={[0, 0.028, zCenter]}>
              <boxGeometry args={[length - 0.2, 0.005, laneW * 0.75]} />
              <meshStandardMaterial color={guideColor} roughness={0.7} />
            </mesh>

            {/* Direction Arrows with Shared Cone Geometry */}
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

      {/* Repeated Stanchion Posts using Shared Geometries & Materials */}
      {postsData.map((p, idx) => (
        <group key={idx} position={[p.x, 0, p.z]}>
          {/* Base Plate */}
          <mesh position={[0, 0.02, 0]} geometry={postBaseGeometry} material={postBaseMaterial} />
          {/* Vertical Post */}
          <mesh position={[0, height / 2, 0]} scale={[1, height, 1]} geometry={postUprightGeometry} material={postUprightMaterial} />
          {/* Ball Cap Finial */}
          <mesh position={[0, height + 0.04, 0]} geometry={postCapGeometry} material={postCapMaterial} />
        </group>
      ))}

      {/* Continuous Horizontal Stanchion Rails */}
      {railsData.map((r, idx) => (
        <mesh key={idx} position={[0, r.y, r.z]} rotation={[0, 0, Math.PI / 2]} geometry={railGeometry} material={railMaterial} />
      ))}

      {/* Label Badge with LOD visibility management */}
      {isLabelVisible && (
        <Html position={[0, height + 0.6, 0]} center distanceFactor={26} zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none px-2 py-0.5 rounded bg-amber-950/80 text-amber-100 font-mono text-[10px] font-bold tracking-wider backdrop-blur-sm whitespace-nowrap shadow-sm border border-amber-600/40">
            QUEUE ({length}m &times; {width}m)
          </div>
        </Html>
      )}
    </group>
  );
}
