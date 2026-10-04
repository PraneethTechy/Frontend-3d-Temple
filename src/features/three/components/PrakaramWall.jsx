import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useQueueStore } from '../../../store/useQueueStore.js';
import { useCapacityExpansionStore } from '../../simulation/capacityExpansionStore.js';

/**
 * Authentic Dravidian Solid Masonry Prakaram Wall (Sacred Temple Madhil Enclosure)
 * Inspired by the monumental granite outer walls of Arunachaleswarar and Brihadisvara temples.
 * 
 * 100% SOLID ARCHITECTURAL MASONRY:
 * - Heavy stepped granite foundation plinth (Adhishthana / Upana)
 * - Solid stone wall mass with continuous ashlar stone courses (no railings, no fences, no transparency)
 * - Broad dressed stone coping cornice (Kapota)
 * - Continuous solid stone crest parapet ridge (Vritta Shikhara top)
 * - Regular structural stone pilasters integrated into the stone face
 * - Warm aged temple stone palette matching the gopurams (no black, no metal)
 */
export function PrakaramWall({ component, isSelected, showLabels: propShowLabels }) {
  const { dimensions = {}, properties = {} } = component;
  const length = Number(dimensions.length) || 20; // Length along X
  const height = Number(dimensions.height) || 5.6; // Wall height along Y (monumental solid stone)
  const thickness = Number(dimensions.width) || Number(properties.thickness) || 2.4; // Substantial solid stone thickness

  const storeShowLabels = useQueueStore((state) => state.showLabels);
  const isCapacityModalOpen = useCapacityExpansionStore((state) => state.isOpen);
  const isSaveModalOpen = useQueueStore((state) => state.isSaveModalOpen);
  const isPlansModalOpen = useQueueStore((state) => state.isPlansModalOpen);
  const isAnyModalOpen = isCapacityModalOpen || isSaveModalOpen || isPlansModalOpen;
  const showLabels = !isAnyModalOpen && (propShowLabels !== undefined ? propShowLabels : (storeShowLabels ?? true));

  // Authentic Dravidian Weathered Granite & Aged Sandstone Palette (Warm, Solid, No Black)
  const stoneColor = properties.stoneColor && !properties.stoneColor.toLowerCase().includes('7e6852') && !properties.stoneColor.toLowerCase().includes('374151') && !properties.stoneColor.toLowerCase().includes('3b362f')
    ? properties.stoneColor 
    : '#BAAA94'; // Warm aged temple granite / limestone beige-grey
  const baseGranite = '#7E705D'; // Solid weathered granite foundation plinth (warm stony tone, NOT black)
  const moldStone = '#968670'; // Carved stone courses, pilasters, and coping cornice
  const stoneHighlight = '#C8BBA9'; // Dressed stone upper course highlight
  const ochreFrieze = '#8C6040'; // Weathered traditional stone frieze trim

  const plinthH = Math.min(0.85, height * 0.15);
  const copingH = 0.50;
  const wallH = height - plinthH - copingH;

  // Structural pilasters spaced evenly every ~5m along the wall length
  const pilasterPositions = useMemo(() => {
    const list = [];
    const count = Math.max(2, Math.round(length / 5.0) + 1);
    const step = (length - 1.0) / (count - 1);
    for (let i = 0; i < count; i++) {
      list.push(-length / 2 + 0.5 + i * step);
    }
    return list;
  }, [length]);

  return (
    <group>
      {/* 1. Heavy Stepped Granite Foundation Plinth (Upana & Jagati) */}
      {/* Lower Upana Foundation Course */}
      <mesh position={[0, plinthH * 0.35, 0]} receiveShadow>
        <boxGeometry args={[length, plinthH * 0.70, thickness + 0.6]} />
        <meshStandardMaterial color={baseGranite} roughness={0.88} />
      </mesh>
      {/* Upper Jagati Plinth Step */}
      <mesh position={[0, plinthH * 0.85, 0]} receiveShadow>
        <boxGeometry args={[length, plinthH * 0.30, thickness + 0.3]} />
        <meshStandardMaterial color={moldStone} roughness={0.82} />
      </mesh>

      {/* 2. Massive Solid Granite Stone Wall Body (Continuous, Opaque, Monumental) */}
      <mesh position={[0, plinthH + wallH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, wallH, thickness]} />
        <meshStandardMaterial color={stoneColor} roughness={0.76} />
      </mesh>

      {/* 3. Horizontal Dressed Ashlar Stone Courses (Carved relief bands along wall) */}
      {[-wallH * 0.25, 0, wallH * 0.25].map((yOff, cIdx) => (
        <mesh key={`course-${cIdx}`} position={[0, plinthH + wallH / 2 + yOff, 0]}>
          <boxGeometry args={[length + 0.05, 0.12, thickness + 0.08]} />
          <meshStandardMaterial color={moldStone} roughness={0.72} />
        </mesh>
      ))}

      {/* Upper Frieze Trim Band under Coping */}
      <mesh position={[0, plinthH + wallH - 0.20, 0]}>
        <boxGeometry args={[length + 0.08, 0.22, thickness + 0.12]} />
        <meshStandardMaterial color={ochreFrieze} roughness={0.65} />
      </mesh>

      {/* 4. Integrated Structural Stone Pilasters (Front and Rear Masonry Relief) */}
      {pilasterPositions.map((posX, pIdx) => (
        <group key={`prakaram-pilaster-${pIdx}`} position={[posX, plinthH, 0]}>
          {/* Front / Exterior Pilaster Buttress */}
          <group position={[0, 0, thickness / 2 + 0.12]}>
            <mesh position={[0, wallH / 2, 0]} castShadow>
              <boxGeometry args={[0.55, wallH * 0.95, 0.24]} />
              <meshStandardMaterial color={moldStone} roughness={0.72} />
            </mesh>
            {/* Pilaster Capital Corbel Bracket */}
            <mesh position={[0, wallH * 0.96, 0]} castShadow>
              <boxGeometry args={[0.72, 0.18, 0.30]} />
              <meshStandardMaterial color={stoneHighlight} roughness={0.65} />
            </mesh>
          </group>
          {/* Rear / Interior Pilaster Buttress */}
          <group position={[0, 0, -thickness / 2 - 0.12]}>
            <mesh position={[0, wallH / 2, 0]} castShadow>
              <boxGeometry args={[0.55, wallH * 0.95, 0.24]} />
              <meshStandardMaterial color={moldStone} roughness={0.72} />
            </mesh>
            {/* Pilaster Capital Corbel Bracket */}
            <mesh position={[0, wallH * 0.96, 0]} castShadow>
              <boxGeometry args={[0.72, 0.18, 0.30]} />
              <meshStandardMaterial color={stoneHighlight} roughness={0.65} />
            </mesh>
          </group>
        </group>
      ))}

      {/* 5. Projecting Heavy Stone Coping Cornice (Kapota) */}
      <mesh position={[0, plinthH + wallH + 0.15, 0]} castShadow>
        <boxGeometry args={[length + 0.1, 0.30, thickness + 0.50]} />
        <meshStandardMaterial color={moldStone} roughness={0.70} />
      </mesh>

      {/* 6. Solid Stone Crest Parapet Ridge (Dressed Stone Coping Ridge) */}
      <mesh position={[0, plinthH + wallH + 0.35, 0]} castShadow>
        <boxGeometry args={[length + 0.05, 0.25, thickness + 0.20]} />
        <meshStandardMaterial color={baseGranite} roughness={0.72} />
      </mesh>

      {/* 7. Parapet Crest Ornamental Stone Stupis / Merlons (as seen in Wall Detail reference) */}
      {pilasterPositions.map((posX, pIdx) => (
        <group key={`wall-stupi-${pIdx}`} position={[posX, plinthH + wallH + 0.50, 0]}>
          <mesh position={[0, 0.08, 0]} castShadow>
            <boxGeometry args={[0.38, 0.16, 0.38]} />
            <meshStandardMaterial color={moldStone} roughness={0.70} />
          </mesh>
          <mesh position={[0, 0.32, 0]} castShadow>
            <coneGeometry args={[0.16, 0.38, 8]} />
            <meshStandardMaterial color={stoneHighlight} roughness={0.65} />
          </mesh>
        </group>
      ))}

      {/* Contextual Identification Badge */}
      {showLabels && isSelected && (
        <Html position={[0, height + 1.0, 0]} center distanceFactor={35} zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none px-3 py-1 rounded-lg bg-stone-900/90 border border-amber-400 text-amber-200 font-bold text-xs tracking-wider shadow-2xl flex items-center gap-2 whitespace-nowrap">
            <span className="text-amber-400 font-serif font-black">🧱</span>
            <span>PRAKARAM WALL</span>
            <span className="text-[10px] text-amber-300 font-normal">| MADHIL ENCLOSURE ({height}m)</span>
          </div>
        </Html>
      )}
    </group>
  );
}
