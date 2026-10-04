import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useQueueStore } from '../../../store/useQueueStore.js';
import { useCapacityExpansionStore } from '../../simulation/capacityExpansionStore.js';

/**
 * Authentic Dravidian Pillared Mandapam (Sacred Pavilion Hall)
 * Inspired by the 1000-pillared hall and prakaram mandapas of Arunachaleswarar Temple.
 * Responds dynamically to length, width, height, and pillar spacing.
 */
export function Mandapam({ component, isSelected, showLabels: propShowLabels }) {
  const { dimensions = {}, properties = {} } = component;
  const length = Number(dimensions.length) || 16; // Width along X (facade)
  const width = Number(dimensions.width) || 12;   // Depth along Z
  const height = Number(dimensions.height) || 6;  // Total height along Y

  const storeShowLabels = useQueueStore((state) => state.showLabels);
  const isCapacityModalOpen = useCapacityExpansionStore((state) => state.isOpen);
  const isSaveModalOpen = useQueueStore((state) => state.isSaveModalOpen);
  const isPlansModalOpen = useQueueStore((state) => state.isPlansModalOpen);
  const isAnyModalOpen = isCapacityModalOpen || isSaveModalOpen || isPlansModalOpen;
  const showLabels = !isAnyModalOpen && (propShowLabels !== undefined ? propShowLabels : (storeShowLabels ?? true));

  const pillarSpacing = Math.max(2.5, Math.min(6.0, Number(properties.pillarSpacing) || 3.5));

  // Materials: Authentic Dravidian weathered granite stone palette matching campus
  const stoneColor = properties.stoneColor && !properties.stoneColor.toLowerCase().includes('9ca3af') && !properties.stoneColor.toLowerCase().includes('7e6852')
    ? properties.stoneColor 
    : '#B5A693'; // Warm weathered limestone/granite stone beige
  const darkGranite = '#7A6E5F'; // Warm aged granite plinth, Oma & capitals
  const cornicedStone = '#8E8070'; // Pillar shafts & moldings
  const subtleOchre = '#9C4E36'; // Traditional terracotta parapet band

  const plinthHeight = Math.min(0.6, height * 0.1);
  const roofHeight = Math.min(0.8, height * 0.15);
  const pillarHeight = height - plinthHeight - roofHeight;

  // Compute regular pillar grid positions along perimeter and structural intervals
  const pillarPositions = useMemo(() => {
    const list = [];
    const cols = Math.max(2, Math.round(length / pillarSpacing) + 1);
    const rows = Math.max(2, Math.round(width / pillarSpacing) + 1);

    const stepX = (length - 0.8) / (cols - 1);
    const stepZ = (width - 0.8) / (rows - 1);

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        // Keep central aisle clear if spacious enough for crowd flow, or full hypostyle hall
        const isPerimeter = c === 0 || c === cols - 1 || r === 0 || r === rows - 1;
        const isCenterAisle = cols > 3 && (c === Math.floor(cols / 2) || c === Math.ceil(cols / 2) - 1);
        
        // Exclude center-most interior pillars so crowds can pass through smoothly
        if (!isCenterAisle || isPerimeter) {
          list.push({
            x: -length / 2 + 0.4 + c * stepX,
            z: -width / 2 + 0.4 + r * stepZ,
          });
        }
      }
    }
    return list;
  }, [length, width, pillarSpacing]);

  return (
    <group>
      {/* 1. Sculpted Stone Plinth (Upapitha / Adhishthana) */}
      <mesh position={[0, plinthHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[length + 0.8, plinthHeight, width + 0.8]} />
        <meshStandardMaterial color={darkGranite} roughness={0.85} />
      </mesh>
      {/* Upper plinth moulding */}
      <mesh position={[0, plinthHeight + 0.05, 0]} receiveShadow>
        <boxGeometry args={[length + 0.4, 0.1, width + 0.4]} />
        <meshStandardMaterial color={stoneColor} roughness={0.75} />
      </mesh>

      {/* 2. Dravidian Carved Granite Pillars */}
      {pillarPositions.map((pos, pIdx) => (
        <group key={`mandapa-col-${pIdx}`} position={[pos.x, plinthHeight + 0.1, pos.z]}>
          {/* Base Plinth (Oma) */}
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color={darkGranite} roughness={0.8} />
          </mesh>
          {/* Pillar Shaft (Stambha) */}
          <mesh position={[0, pillarHeight * 0.5 + 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.24, pillarHeight - 0.5, 12]} />
            <meshStandardMaterial color={cornicedStone} roughness={0.65} />
          </mesh>
          {/* Shaft Mid-Band Ring (Kampu) */}
          <mesh position={[0, pillarHeight * 0.5, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.2, 12]} />
            <meshStandardMaterial color={darkGranite} roughness={0.7} />
          </mesh>
          {/* Corbelled Bracket Capital (Bodika / Potika) */}
          <mesh position={[0, pillarHeight + 0.1, 0]} castShadow>
            <boxGeometry args={[0.65, 0.25, 0.65]} />
            <meshStandardMaterial color={darkGranite} roughness={0.65} />
          </mesh>
        </group>
      ))}

      {/* 3. Horizontal Architrave Beams (Uttara) */}
      <mesh position={[0, plinthHeight + 0.1 + pillarHeight + 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[length + 0.2, 0.35, width + 0.2]} />
        <meshStandardMaterial color={stoneColor} roughness={0.7} />
      </mesh>

      {/* 4. Projecting Curved Eaves Cornice (Kapota) */}
      <mesh position={[0, plinthHeight + 0.1 + pillarHeight + 0.5, 0]} castShadow>
        <boxGeometry args={[length + 1.2, 0.25, width + 1.2]} />
        <meshStandardMaterial color={darkGranite} roughness={0.6} />
      </mesh>

      {/* 5. Parapet Frieze with Architectural Stone Band */}
      <mesh position={[0, plinthHeight + 0.1 + pillarHeight + 0.72, 0]}>
        <boxGeometry args={[length + 0.9, 0.2, width + 0.9]} />
        <meshStandardMaterial color={subtleOchre} roughness={0.6} />
      </mesh>

      {/* 6. Roof Platform Terrace */}
      <mesh position={[0, plinthHeight + 0.1 + pillarHeight + 0.85, 0]} receiveShadow>
        <boxGeometry args={[length + 0.6, 0.15, width + 0.6]} />
        <meshStandardMaterial color={darkGranite} roughness={0.8} />
      </mesh>

      {/* Identification Badge */}
      {showLabels && (
        <Html position={[0, height + 1.2, 0]} center distanceFactor={35} zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none px-3 py-1 rounded-lg bg-stone-900/90 border border-amber-400/80 text-amber-200 font-bold text-[11px] tracking-wider shadow-xl flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-amber-400 font-serif font-black">🏛️</span>
            <span>MANDAPAM</span>
            <span className="text-[9px] text-amber-300 font-normal">| PILLARED PAVILION</span>
          </div>
        </Html>
      )}
    </group>
  );
}
