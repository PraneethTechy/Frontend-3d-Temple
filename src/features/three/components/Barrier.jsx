import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useQueueStore } from '../../../store/useQueueStore.js';

// Pre-allocated shared barrier geometries
const barrierBaseGeometry = new THREE.CylinderGeometry(0.16, 0.18, 0.04, 10);
const barrierUprightGeometry = new THREE.CylinderGeometry(0.035, 0.035, 1.0, 8);
const barrierCapGeometry = new THREE.SphereGeometry(0.045, 8, 8);

// Pre-allocated shared barrier materials
const barrierBaseMaterial = new THREE.MeshStandardMaterial({ color: '#5B1425', roughness: 0.4, metalness: 0.6 });
const barrierPostMaterial = new THREE.MeshStandardMaterial({ color: '#7A1C30', roughness: 0.35, metalness: 0.6 });
const barrierCapMaterial = new THREE.MeshStandardMaterial({ color: '#D4AC4C', roughness: 0.3, metalness: 0.8 });
const barrierRailTopMaterial = new THREE.MeshStandardMaterial({ color: '#7A1C30', roughness: 0.35, metalness: 0.6 });
const barrierRailMidMaterial = new THREE.MeshStandardMaterial({ color: '#5B1425', roughness: 0.4, metalness: 0.6 });

export function Barrier({ component, isSelected }) {
  const { dimensions } = component;
  const length = dimensions.length || 6;
  const height = dimensions.height || 1.0;

  const { camera } = useThree();
  const showLabels = useQueueStore((state) => state.showLabels);

  const numPosts = Math.max(2, Math.floor(length / 2) + 1);

  const posts = useMemo(() => {
    const list = [];
    const step = length / (numPosts - 1);
    const startX = -length / 2;
    for (let i = 0; i < numPosts; i++) {
      list.push(startX + i * step);
    }
    return list;
  }, [length, numPosts]);

  const topRailGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.025, 0.025, length, 8);
  }, [length]);

  const midRailGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.02, 0.02, length, 8);
  }, [length]);

  // Intelligent Label Hierarchy (Part 9): only show barrier label when selected
  const isLabelVisible = isSelected;

  return (
    <group>
      {/* Posts using Shared Geometries & Materials */}
      {posts.map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, 0]}>
          {/* Base plate */}
          <mesh position={[0, 0.02, 0]} geometry={barrierBaseGeometry} material={barrierBaseMaterial} />
          {/* Vertical Post */}
          <mesh position={[0, height / 2, 0]} scale={[1, height, 1]} geometry={barrierUprightGeometry} material={barrierPostMaterial} />
          {/* Top Cap */}
          <mesh position={[0, height + 0.03, 0]} geometry={barrierCapGeometry} material={barrierCapMaterial} />
        </group>
      ))}

      {/* Top Rail */}
      <mesh position={[0, height * 0.88, 0]} rotation={[0, 0, Math.PI / 2]} geometry={topRailGeometry} material={barrierRailTopMaterial} />

      {/* Middle Rail */}
      <mesh position={[0, height * 0.45, 0]} rotation={[0, 0, Math.PI / 2]} geometry={midRailGeometry} material={barrierRailMidMaterial} />

      {/* Label Badge with LOD visibility management */}
      {isLabelVisible && (
        <Html position={[0, height + 0.5, 0]} center distanceFactor={26} zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none px-2 py-0.5 rounded bg-stone-900/80 text-stone-200 font-mono text-[9px] font-bold tracking-wider backdrop-blur-sm whitespace-nowrap shadow-sm border border-stone-600/50">
            BARRIER ({length}m)
          </div>
        </Html>
      )}
    </group>
  );
}
