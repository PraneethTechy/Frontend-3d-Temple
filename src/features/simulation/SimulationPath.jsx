import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useSimulationStore } from './simulationStore.js';

export function SimulationPath() {
  const showPaths = useSimulationStore((state) => state.showPaths);
  const pathData = useSimulationStore((state) => state.pathData);

  const paths = pathData?.paths || [];

  const lineGeometries = useMemo(() => {
    if (!showPaths || paths.length === 0) return [];

    return paths.map((path) => {
      const points = (path.waypoints || []).map(
        (wp) => new THREE.Vector3(wp.x, 0.06, wp.z)
      );
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      return { id: path.id, geometry, name: path.name };
    });
  }, [showPaths, paths]);

  if (!showPaths || lineGeometries.length === 0) return null;

  return (
    <group name="simulation-flow-paths">
      {lineGeometries.map(({ id, geometry }) => (
        <line key={id} geometry={geometry}>
          <lineDashedMaterial
            color="#D97706"
            dashSize={0.8}
            gapSize={0.4}
            linewidth={2}
            transparent
            opacity={0.7}
          />
        </line>
      ))}

      {/* Waypoint nodes indicator circles */}
      {paths.map((p) =>
        (p.waypoints || []).map((wp, idx) => (
          <mesh
            key={`${p.id}-${idx}`}
            position={[wp.x, 0.05, wp.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.3, 16]} />
            <meshBasicMaterial
              color={
                wp.zone === 'entrance'
                  ? '#059669'
                  : wp.zone === 'security'
                  ? '#D97706'
                  : wp.zone === 'darshan'
                  ? '#EAB308'
                  : wp.zone === 'exit'
                  ? '#2563EB'
                  : '#A8A29E'
              }
              transparent
              opacity={0.65}
            />
          </mesh>
        ))
      )}
    </group>
  );
}
