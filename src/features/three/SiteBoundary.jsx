import React, { useMemo } from 'react';
import * as THREE from 'three';
import { toMeters } from '../../utils/units.js';

export function SiteBoundary({ length, width, unit }) {
  const lengthMeters = useMemo(() => toMeters(length, unit), [length, unit]);
  const widthMeters = useMemo(() => toMeters(width, unit), [width, unit]);

  const halfL = lengthMeters / 2;
  const halfW = widthMeters / 2;

  // Boundary loop points along the perimeter
  const borderPoints = useMemo(() => {
    return [
      new THREE.Vector3(-halfL, 0.005, -halfW),
      new THREE.Vector3(halfL, 0.005, -halfW),
      new THREE.Vector3(halfL, 0.005, halfW),
      new THREE.Vector3(-halfL, 0.005, halfW),
      new THREE.Vector3(-halfL, 0.005, -halfW),
    ];
  }, [halfL, halfW]);

  // Corner CAD bracket lines
  const cornerMarkers = useMemo(() => {
    const markerSize = Math.min(Math.min(halfL, halfW) * 0.15, 2.0);
    return [
      // Top-Left (-L, -W)
      [
        new THREE.Vector3(-halfL, 0.008, -halfW + markerSize),
        new THREE.Vector3(-halfL, 0.008, -halfW),
        new THREE.Vector3(-halfL + markerSize, 0.008, -halfW),
      ],
      // Top-Right (+L, -W)
      [
        new THREE.Vector3(halfL - markerSize, 0.008, -halfW),
        new THREE.Vector3(halfL, 0.008, -halfW),
        new THREE.Vector3(halfL, 0.008, -halfW + markerSize),
      ],
      // Bottom-Right (+L, +W)
      [
        new THREE.Vector3(halfL, 0.008, halfW - markerSize),
        new THREE.Vector3(halfL, 0.008, halfW),
        new THREE.Vector3(halfL - markerSize, 0.008, halfW),
      ],
      // Bottom-Left (-L, +W)
      [
        new THREE.Vector3(-halfL + markerSize, 0.008, halfW),
        new THREE.Vector3(-halfL, 0.008, halfW),
        new THREE.Vector3(-halfL, 0.008, halfW - markerSize),
      ],
    ];
  }, [halfL, halfW]);

  const borderGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(borderPoints);
  }, [borderPoints]);

  const cornerGeometries = useMemo(() => {
    return cornerMarkers.map((pts) => new THREE.BufferGeometry().setFromPoints(pts));
  }, [cornerMarkers]);

  return (
    <group>
      {/* Primary Boundary Line */}
      <primitive object={new THREE.Line(
        borderGeometry,
        new THREE.LineBasicMaterial({ color: '#7A1C30', linewidth: 2 })
      )} />

      {/* CAD Corner Accents */}
      {cornerGeometries.map((geom, idx) => (
        <primitive
          key={idx}
          object={new THREE.Line(
            geom,
            new THREE.LineBasicMaterial({ color: '#B06F17', linewidth: 3 })
          )}
        />
      ))}
    </group>
  );
}
