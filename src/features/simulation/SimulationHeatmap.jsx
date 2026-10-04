import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from './simulationStore.js';

const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();

// Color ramp stops for queue occupancy density
const COLOR_LOW = new THREE.Color('#10B981');    // Soft Emerald (Low)
const COLOR_MED = new THREE.Color('#F59E0B');    // Amber (Moderate)
const COLOR_HIGH = new THREE.Color('#EF4444');   // Crimson Red (Congested)

/**
 * High-performance Instanced Crowd Heatmap
 * Updates at throttled 12 Hz rate and only draws active occupied density cells.
 */
export function SimulationHeatmap() {
  const meshRef = useRef();
  const throttleRef = useRef(0);
  const showDensity = useSimulationStore((state) => state.showDensity);
  const engine = useSimulationStore((state) => state.engine);

  const { geometry, material, maxCells } = useMemo(() => {
    // 1.5m grid square plane lying flat on ground
    const geo = new THREE.PlaneGeometry(1.45, 1.45);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.60,
      depthWrite: false,
    });

    return { geometry: geo, material: mat, maxCells: 4000 };
  }, []);

  React.useEffect(() => {
    return () => {
      geometry?.dispose?.();
      material?.dispose?.();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (!showDensity || !engine) {
      if (meshRef.current.visible) {
        meshRef.current.visible = false;
        meshRef.current.count = 0;
      }
      return;
    }

    meshRef.current.visible = true;

    // Throttle calculation to ~12 updates per second (85ms)
    throttleRef.current += delta;
    if (throttleRef.current < 0.08) return;
    throttleRef.current = 0;

    const {
      gridCols,
      gridRows,
      cellSize,
      gridOriginX,
      gridOriginZ,
      heatmapOccupancy,
      maxCellOccupancy,
    } = engine;

    if (!heatmapOccupancy) return;

    let activeCount = 0;
    const safeMax = Math.max(1.0, maxCellOccupancy);

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if (activeCount >= maxCells) break;

        const cellIdx = r * gridCols + c;
        const val = heatmapOccupancy[cellIdx] || 0;

        if (val > 0.05) {
          const t = Math.min(1.0, val / safeMax);

          // Smooth color ramp
          if (t < 0.5) {
            tempColor.copy(COLOR_LOW).lerp(COLOR_MED, t * 2);
          } else {
            tempColor.copy(COLOR_MED).lerp(COLOR_HIGH, (t - 0.5) * 2);
          }

          const cx = gridOriginX + c * cellSize + cellSize / 2;
          const cz = gridOriginZ + r * cellSize + cellSize / 2;

          dummy.position.set(cx, 0.025, cz);
          dummy.scale.set(1.0, 1.0, 1.0);
          dummy.updateMatrix();

          meshRef.current.setMatrixAt(activeCount, dummy.matrix);
          meshRef.current.setColorAt(activeCount, tempColor);
          activeCount++;
        }
      }
    }

    // Only render the active cells
    meshRef.current.count = activeCount;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, maxCells]}
      visible={showDensity}
      frustumCulled={false}
    />
  );
}
