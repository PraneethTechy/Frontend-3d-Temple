import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useQueueStore } from '../../../store/useQueueStore.js';
import { COMPONENT_TYPES } from '../../../utils/componentDefaults.js';

/**
 * Sacred Temple Campus Axis Visualization
 * Renders the ceremonial Brahmasthana cross axis:
 * 1. North-to-South Primary Sacred Axis (North Gopuram -> Darshan Sanctum -> Main Gopuram -> Dispersal -> South Gopuram)
 * 2. East-to-West Secondary Axis (West Gopuram -> Central Temple -> East Gopuram)
 */
export function TempleAxis() {
  const components = useQueueStore((state) => state.scene.components) || [];
  const cameraMode = useQueueStore((state) => state.cameraMode);

  const axisData = useMemo(() => {
    const northGopuram = components.find((c) => c.role === 'north-gopuram');
    const southGopuram = components.find((c) => c.role === 'south-gopuram');
    const westGopuram = components.find((c) => c.role === 'west-gopuram');
    const eastGopuram = components.find((c) => c.role === 'east-gopuram');
    const mainGopuram = components.find((c) => c.type === COMPONENT_TYPES.MAIN_GOPURAM);
    const sanctum = components.find(
      (c) => c.type === COMPONENT_TYPES.DARSHAN_SANCTUM || c.type === COMPONENT_TYPES.DARSHAN
    );

    // If campus layout with North and South / West and East Gopurams
    if (northGopuram && southGopuram && mainGopuram) {
      // 1. Primary North-South Axis
      const nsPoints = [
        new THREE.Vector3(northGopuram.position.x, 0.08, northGopuram.position.z),
        new THREE.Vector3(sanctum ? sanctum.position.x : 0, 0.08, sanctum ? sanctum.position.z : -32),
        new THREE.Vector3(mainGopuram.position.x, 0.08, mainGopuram.position.z),
        new THREE.Vector3(0, 0.08, 22), // Post-Darshan Plaza
        new THREE.Vector3(southGopuram.position.x, 0.08, southGopuram.position.z),
      ];
      const nsGeometry = new THREE.BufferGeometry().setFromPoints(nsPoints);

      // 2. Secondary East-West Axis
      const ewPoints = [];
      if (westGopuram) ewPoints.push(new THREE.Vector3(westGopuram.position.x, 0.08, westGopuram.position.z));
      ewPoints.push(new THREE.Vector3(mainGopuram.position.x, 0.08, mainGopuram.position.z));
      if (eastGopuram) ewPoints.push(new THREE.Vector3(eastGopuram.position.x, 0.08, eastGopuram.position.z));
      const ewGeometry = ewPoints.length >= 2 ? new THREE.BufferGeometry().setFromPoints(ewPoints) : null;

      const allNodes = [...nsPoints, ...(ewPoints || [])];

      return {
        isCampus: true,
        nsGeometry,
        ewGeometry,
        allNodes,
        midPoint: [0, 0.25, -10],
      };
    }

    // Fallback: Single-axis alignment
    const entranceGopuram = components.find((c) => c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM);
    const entranceGate = components.find((c) => c.type === COMPONENT_TYPES.ENTRANCE);
    const entrance = entranceGopuram || entranceGate;

    if (!entrance && !sanctum && !mainGopuram) return null;

    const points = [];
    if (entrance) points.push(new THREE.Vector3(entrance.position.x, 0.08, entrance.position.z));
    if (mainGopuram) points.push(new THREE.Vector3(mainGopuram.position.x, 0.08, mainGopuram.position.z));
    if (sanctum) points.push(new THREE.Vector3(sanctum.position.x, 0.08, sanctum.position.z));

    if (points.length < 2) return null;
    points.sort((a, b) => a.x - b.x);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const midX = (points[0].x + points[points.length - 1].x) / 2;
    const midZ = (points[0].z + points[points.length - 1].z) / 2;

    return {
      isCampus: false,
      geometry,
      points,
      midPoint: [midX, 0.2, midZ],
    };
  }, [components]);

  if (!axisData) return null;

  return (
    <group name="temple-sacred-axis">
      {axisData.isCampus ? (
        <>
          {/* North-South Primary Axis */}
          <line geometry={axisData.nsGeometry}>
            <lineDashedMaterial
              color="#D97706"
              dashSize={2.5}
              gapSize={1.5}
              linewidth={2.5}
              transparent
              opacity={0.85}
            />
          </line>

          {/* East-West Secondary Axis */}
          {axisData.ewGeometry && (
            <line geometry={axisData.ewGeometry}>
              <lineDashedMaterial
                color="#B45309"
                dashSize={2.0}
                gapSize={1.5}
                linewidth={2.0}
                transparent
                opacity={0.7}
              />
            </line>
          )}

          {/* Sacred Nodes */}
          {axisData.allNodes.map((pt, idx) => (
            <group key={`axis-node-${idx}`} position={[pt.x, 0.09, pt.z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.8, 1.2, 24]} />
                <meshBasicMaterial color="#EAB308" transparent opacity={0.65} side={THREE.DoubleSide} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.35, 16]} />
                <meshBasicMaterial color="#F59E0B" transparent opacity={0.85} />
              </mesh>
            </group>
          ))}

          {/* 2D Label */}
          {cameraMode === '2d' && (
            <Html position={axisData.midPoint} center distanceFactor={45} zIndexRange={[50, 0]}>
              <div className="pointer-events-none select-none px-3 py-1 rounded-full bg-stone-900/90 border border-amber-400/80 text-amber-300 font-bold text-[10px] tracking-widest shadow-xl whitespace-nowrap uppercase flex items-center gap-1.5">
                <span>SACRED TEMPLE CAMPUS AXIS</span>
                <span className="text-amber-400">🛕</span>
                <span>CENTRAL SANCTUM</span>
              </div>
            </Html>
          )}
        </>
      ) : (
        <>
          {/* Classic Single Axis */}
          <line geometry={axisData.geometry}>
            <lineDashedMaterial
              color="#D97706"
              dashSize={2.0}
              gapSize={1.2}
              linewidth={2.5}
              transparent
              opacity={0.8}
            />
          </line>

          {axisData.points.map((pt, idx) => (
            <group key={`axis-node-${idx}`} position={[pt.x, 0.09, pt.z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.8, 1.1, 24]} />
                <meshBasicMaterial color="#EAB308" transparent opacity={0.6} side={THREE.DoubleSide} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.3, 16]} />
                <meshBasicMaterial color="#F59E0B" transparent opacity={0.8} />
              </mesh>
            </group>
          ))}

          {cameraMode === '2d' && (
            <Html position={axisData.midPoint} center distanceFactor={45} zIndexRange={[50, 0]}>
              <div className="pointer-events-none select-none px-3 py-1 rounded-full bg-stone-900/90 border border-amber-400/80 text-amber-300 font-bold text-[10px] tracking-widest shadow-xl whitespace-nowrap uppercase flex items-center gap-1.5">
                <span>SACRED TEMPLE AXIS</span>
                <span className="text-amber-400">➔</span>
                <span>SANCTUM</span>
              </div>
            </Html>
          )}
        </>
      )}
    </group>
  );
}
