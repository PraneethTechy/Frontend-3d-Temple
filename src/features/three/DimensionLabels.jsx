import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { toMeters, UNIT_LABELS, formatNumber } from '../../utils/units.js';
import { useQueueStore } from '../../store/useQueueStore.js';
import { useCapacityExpansionStore } from '../simulation/capacityExpansionStore.js';

const dimLineMaterial = new THREE.LineBasicMaterial({ color: '#A06E28', linewidth: 2 });

export function DimensionLabels({ length, width, unit }) {
  const isImmersive = useQueueStore((state) => state.isImmersive);
  const componentsCount = useQueueStore((state) => state.scene.components?.length || 0);
  const lengthMeters = useMemo(() => toMeters(length, unit), [length, unit]);
  const widthMeters = useMemo(() => toMeters(width, unit), [width, unit]);

  const halfL = lengthMeters / 2;
  const halfW = widthMeters / 2;

  // Dynamic offset based on floor size
  const offset = Math.max(1.5, Math.min(halfW * 0.15, 3.5));
  const tickSize = Math.max(0.6, Math.min(offset * 0.4, 1.2));

  // Length dimension line along Front (Z = +halfW + offset)
  const lengthLineGeom = useMemo(() => {
    const zPos = halfW + offset;
    const pts = [
      // Left tick
      new THREE.Vector3(-halfL, 0.05, zPos - tickSize / 2),
      new THREE.Vector3(-halfL, 0.05, zPos + tickSize / 2),
      // Back to center of left tick
      new THREE.Vector3(-halfL, 0.05, zPos),
      // Main span across X
      new THREE.Vector3(halfL, 0.05, zPos),
      // Right tick
      new THREE.Vector3(halfL, 0.05, zPos - tickSize / 2),
      new THREE.Vector3(halfL, 0.05, zPos + tickSize / 2),
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [halfL, halfW, offset, tickSize]);

  // Width dimension line along Side (X = +halfL + offset)
  const widthLineGeom = useMemo(() => {
    const xPos = halfL + offset;
    const pts = [
      // Top tick
      new THREE.Vector3(xPos - tickSize / 2, 0.05, -halfW),
      new THREE.Vector3(xPos + tickSize / 2, 0.05, -halfW),
      // Back to center of top tick
      new THREE.Vector3(xPos, 0.05, -halfW),
      // Main span across Z
      new THREE.Vector3(xPos, 0.05, halfW),
      // Bottom tick
      new THREE.Vector3(xPos - tickSize / 2, 0.05, halfW),
      new THREE.Vector3(xPos + tickSize / 2, 0.05, halfW),
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [halfL, halfW, offset, tickSize]);

  const showLabels = useQueueStore((state) => state.showLabels);
  const isCapacityModalOpen = useCapacityExpansionStore((state) => state.isOpen);
  const isSaveModalOpen = useQueueStore((state) => state.isSaveModalOpen);
  const isPlansModalOpen = useQueueStore((state) => state.isPlansModalOpen);

  // In Immersive mode, when showLabels is toggled OFF, or when any modal is open, hide dimension tape/labels
  if (isImmersive || !showLabels || isCapacityModalOpen || isSaveModalOpen || isPlansModalOpen) return null;

  const unitSuffix = UNIT_LABELS[unit] || 'm';

  return (
    <group>
      {/* Dimension Line Geometries */}
      <primitive object={new THREE.Line(lengthLineGeom, dimLineMaterial)} />
      <primitive object={new THREE.Line(widthLineGeom, dimLineMaterial)} />

      {/* Length Dimension Badge */}
      <Html
        position={[0, 0.1, halfW + offset]}
        center
        distanceFactor={28}
        zIndexRange={[100, 0]}
      >
        <div className="pointer-events-none select-none flex items-center gap-1.5 px-3 py-1 bg-white/95 backdrop-blur-sm border border-stone-300 rounded-full shadow-md text-stone-800 font-semibold text-xs whitespace-nowrap">
          <span className="text-amber-700 font-bold">&larr;</span>
          <span className="font-mono tracking-tight">{formatNumber(length)} {unitSuffix}</span>
          <span className="text-amber-700 font-bold">&rarr;</span>
          <span className="text-[10px] text-stone-600 uppercase font-medium ml-0.5 tracking-wider">Length</span>
        </div>
      </Html>

      {/* Width Dimension Badge */}
      <Html
        position={[halfL + offset, 0.1, 0]}
        center
        distanceFactor={28}
        zIndexRange={[100, 0]}
      >
        <div className="pointer-events-none select-none flex items-center gap-1.5 px-3 py-1 bg-white/95 backdrop-blur-sm border border-stone-300 rounded-full shadow-md text-stone-800 font-semibold text-xs whitespace-nowrap">
          <span className="text-amber-700 font-bold">&uarr;</span>
          <span className="font-mono tracking-tight">{formatNumber(width)} {unitSuffix}</span>
          <span className="text-amber-700 font-bold">&darr;</span>
          <span className="text-[10px] text-stone-600 uppercase font-medium ml-0.5 tracking-wider">Width</span>
        </div>
      </Html>

      {/* Center Floor Architectural Watermark (Only if site is completely empty) */}
      {componentsCount === 0 && (
        <Html
          position={[0, 0.02, 0]}
          center
          distanceFactor={32}
          zIndexRange={[50, 0]}
        >
          <div className="pointer-events-none select-none flex flex-col items-center justify-center p-3 text-center opacity-70">
            <div className="text-[11px] font-semibold tracking-widest text-deva-maroon-800 uppercase border-b border-deva-maroon-300 pb-0.5 mb-0.5">
              Crowd Management Space
            </div>
            <div className="text-[10px] font-medium text-stone-600 font-mono">
              {formatNumber(length)} {unitSuffix} &times; {formatNumber(width)} {unitSuffix} (Empty Zone)
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
