import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { TransformControls, Html } from '@react-three/drei';
import { useQueueStore } from '../../../store/useQueueStore.js';
import { useSimulationStore } from '../../simulation/simulationStore.js';
import { checkSiteBounds } from '../../../utils/componentDefaults.js';

import { EntranceGate } from './EntranceGate.jsx';
import { QueueLane } from './QueueLane.jsx';
import { Barrier } from './Barrier.jsx';
import { SecurityCheckpoint } from './SecurityCheckpoint.jsx';
import { WaitingArea } from './WaitingArea.jsx';
import { DarshanPoint } from './DarshanPoint.jsx';
import { ExitCorridor } from './ExitCorridor.jsx';
import { DravidianGopuram } from './DravidianGopuram.jsx';
import { EntranceGopuram } from './EntranceGopuram.jsx';
import { MainGopuram } from './MainGopuram.jsx';
import { DarshanSanctum } from './DarshanSanctum.jsx';
import { TempleGateway } from './TempleGateway.jsx';
import { Mandapam } from './Mandapam.jsx';
import { PrakaramWall } from './PrakaramWall.jsx';

const COMPONENT_RENDERERS = {
  // Crowd Management Infrastructure
  entrance: EntranceGate,
  entrance_gate: EntranceGate,
  gate: EntranceGate,
  queue: QueueLane,
  queue_lane: QueueLane,
  barrier: Barrier,
  security: SecurityCheckpoint,
  security_checkpoint: SecurityCheckpoint,
  checkpoint: SecurityCheckpoint,
  waiting: WaitingArea,
  waiting_area: WaitingArea,
  holding: WaitingArea,
  holding_area: WaitingArea,
  darshan: DarshanPoint,
  darshan_point: DarshanPoint,
  exit: ExitCorridor,
  exit_corridor: ExitCorridor,
  // Temple Architecture Components
  dravidian_gopuram: DravidianGopuram,
  entrance_gopuram: EntranceGopuram,
  gopuram: EntranceGopuram,
  main_gopuram: MainGopuram,
  raja_gopuram: MainGopuram,
  darshan_sanctum: DarshanSanctum,
  sanctum: DarshanSanctum,
  temple_gateway: TempleGateway,
  gateway: TempleGateway,
  mandapam: Mandapam,
  prakaram_wall: PrakaramWall,
  wall: PrakaramWall,
};

export const ComponentWrapper = React.memo(function ComponentWrapper({ component }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

  const isSelected = useQueueStore((state) => state.selectedComponentId === component.id);
  const setSelectedComponentId = useQueueStore((state) => state.setSelectedComponentId);
  const updateComponent = useQueueStore((state) => state.updateComponent);
  const transformMode = useQueueStore((state) => state.transformMode);
  const snapEnabled = useQueueStore((state) => state.snapEnabled);
  const snapSize = useQueueStore((state) => state.snapSize);
  const setIsTransforming = useQueueStore((state) => state.setIsTransforming);
  const site = useQueueStore((state) => state.scene?.site);
  const analysis = useQueueStore((state) => state.scene?.analysis);
  const simulationStatus = useSimulationStore((state) => state.status);

  if (!component) return null;

  // Validation issue detection
  const hasError = useMemo(() => {
    return analysis?.errors?.some(
      (e) => e.componentId === component.id || e.secondaryComponentId === component.id
    ) || false;
  }, [analysis, component.id]);

  const hasWarning = useMemo(() => {
    if (hasError) return false;
    return analysis?.warnings?.some(
      (w) => w.componentId === component.id || w.secondaryComponentId === component.id
    ) || false;
  }, [analysis, component.id, hasError]);

  const posX = component.position?.x ?? 0;
  const posY = component.position?.y ?? 0;
  const posZ = component.position?.z ?? 0;
  const rot = component.rotation ?? 0;

  // Sync Three.js group transform when store updates (from property panel, undo/redo, etc.)
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(posX, posY, posZ);
      groupRef.current.rotation.set(0, (rot * Math.PI) / 180, 0);
    }
  }, [posX, posY, posZ, rot]);

  // Check boundary constraints safely
  const bounds = useMemo(() => {
    if (!component || !site) return { isViolating: false };
    try {
      return checkSiteBounds(component, site) || { isViolating: false };
    } catch {
      return { isViolating: false };
    }
  }, [component, site]);

  // Selection Bounding Box Geometry
  const dimL = component.dimensions?.length || 2;
  const dimW = component.dimensions?.width || 2;
  const dimH = component.dimensions?.height || 1;
  const pad = 0.25;

  const selectionOutlineGeom = useMemo(() => {
    const halfL = dimL / 2 + pad;
    const halfW = dimW / 2 + pad;
    const yPos = 0.04;

    const points = [
      new THREE.Vector3(-halfL, yPos, -halfW),
      new THREE.Vector3(halfL, yPos, -halfW),
      new THREE.Vector3(halfL, yPos, halfW),
      new THREE.Vector3(-halfL, yPos, halfW),
      new THREE.Vector3(-halfL, yPos, -halfW),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [dimL, dimW, pad]);

  // Corner CAD Tick Marks
  const cornerTicks = useMemo(() => {
    const halfL = dimL / 2 + pad;
    const halfW = dimW / 2 + pad;
    const tick = Math.min(0.6, Math.min(dimL, dimW) * 0.25);
    const yPos = 0.045;

    return [
      // Top-Left
      [new THREE.Vector3(-halfL, yPos, -halfW + tick), new THREE.Vector3(-halfL, yPos, -halfW), new THREE.Vector3(-halfL + tick, yPos, -halfW)],
      // Top-Right
      [new THREE.Vector3(halfL - tick, yPos, -halfW), new THREE.Vector3(halfL, yPos, -halfW), new THREE.Vector3(halfL, yPos, -halfW + tick)],
      // Bottom-Right
      [new THREE.Vector3(halfL, yPos, halfW - tick), new THREE.Vector3(halfL, yPos, halfW), new THREE.Vector3(halfL - tick, yPos, halfW)],
      // Bottom-Left
      [new THREE.Vector3(-halfL + tick, yPos, halfW), new THREE.Vector3(-halfL, yPos, halfW), new THREE.Vector3(-halfL, yPos, halfW - tick)],
    ].map((pts) => new THREE.BufferGeometry().setFromPoints(pts));
  }, [dimL, dimW, pad]);

  const Renderer = (typeof COMPONENT_RENDERERS[component.type] === 'function')
    ? COMPONENT_RENDERERS[component.type]
    : QueueLane;

  const handleClick = (e) => {
    e.stopPropagation();
    setSelectedComponentId(component.id);
  };

  const isViolatingBounds = Boolean(bounds?.isViolating);
  const outlineColor = (isViolatingBounds || hasError)
    ? '#EF4444'
    : hasWarning
    ? '#F59E0B'
    : '#D4AC4C';

  const bracketColor = (isViolatingBounds || hasError)
    ? '#DC2626'
    : hasWarning
    ? '#D97706'
    : '#8C1B37';

  return (
    <>
      <group
        ref={groupRef}
        position={[posX, posY, posZ]}
        rotation={[0, (rot * Math.PI) / 180, 0]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (e.buttons > 0 || e.nativeEvent?.buttons > 0) return;
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        {/* Component Geometry */}
        {typeof Renderer === 'function' ? (
          <Renderer component={component} isSelected={isSelected} />
        ) : (
          <QueueLane component={component} isSelected={isSelected} />
        )}

        {/* Selection Bounding Box & CAD Markers */}
        {isSelected && (
          <group>
            {/* Outline Box */}
            <line geometry={selectionOutlineGeom}>
              <lineBasicMaterial color={outlineColor || '#D4AC4C'} linewidth={2} />
            </line>

            {/* Corner Brackets */}
            {cornerTicks.map((geom, idx) => (
              <line key={idx} geometry={geom}>
                <lineBasicMaterial color={bracketColor || '#8C1B37'} linewidth={3} />
              </line>
            ))}

            {/* Soft Selection Underlay Pad */}
            <mesh position={[0, 0.02, 0]}>
              <planeGeometry args={[dimL + pad * 2, dimW + pad * 2]} />
              <meshBasicMaterial
                color={(isViolatingBounds || hasError) ? '#FEF2F2' : hasWarning ? '#FFFBEB' : '#FDF7EB'}
                opacity={0.35}
                transparent
                rotation={[-Math.PI / 2, 0, 0]}
              />
            </mesh>

            {/* Boundary Violation Warning Badge */}
            {isViolatingBounds && (
              <Html position={[0, dimH + 1.2, 0]} center distanceFactor={26} zIndexRange={[120, 0]}>
                <div className="pointer-events-none select-none px-2.5 py-1 rounded bg-red-600 text-white font-bold text-[10px] tracking-wider shadow-lg flex items-center gap-1 whitespace-nowrap animate-bounce">
                  <span>&bull; EXTENDS OUTSIDE SITE</span>
                </div>
              </Html>
            )}
          </group>
        )}

        {/* Validation Outline when NOT selected */}
        {!isSelected && (hasError || hasWarning) && (
          <line geometry={selectionOutlineGeom}>
            <lineBasicMaterial color={hasError ? '#EF4444' : '#F59E0B'} linewidth={1.5} />
          </line>
        )}

        {/* Subtle Hover Ring when not selected and no validation issue */}
        {!isSelected && !hasError && !hasWarning && hovered && (
          <line geometry={selectionOutlineGeom}>
            <lineBasicMaterial color="#A09689" linewidth={1} />
          </line>
        )}
      </group>

      {/* Drei TransformControls when component is selected and simulation is NOT active */}
      {isSelected && groupRef.current && simulationStatus !== 'running' && (
        <TransformControls
          object={groupRef}
          mode={transformMode}
          // Constrain movement strictly to horizontal X-Z plane!
          showX={transformMode === 'translate'}
          showY={transformMode === 'rotate'}
          showZ={transformMode === 'translate'}
          size={0.75}
          translationSnap={snapEnabled ? snapSize : null}
          rotationSnap={snapEnabled ? Math.PI / 12 : null} // 15 degree rotation snapping
          onMouseDown={() => {
            setIsTransforming(true);
          }}
          onMouseUp={() => {
            setIsTransforming(false);
            if (groupRef.current) {
              const pos = groupRef.current.position;
              const rot = groupRef.current.rotation;

              let finalX = Number(pos.x);
              let finalZ = Number(pos.z);

              if (snapEnabled && snapSize > 0) {
                finalX = Math.round(finalX / snapSize) * snapSize;
                finalZ = Math.round(finalZ / snapSize) * snapSize;
              }

              let rotDeg = Math.round((rot.y * 180) / Math.PI) % 360;
              if (rotDeg < 0) rotDeg += 360;
              if (snapEnabled) {
                rotDeg = Math.round(rotDeg / 15) * 15;
              }

              updateComponent(
                component.id,
                {
                  position: {
                    x: Number(finalX.toFixed(2)),
                    y: 0,
                    z: Number(finalZ.toFixed(2)),
                  },
                  rotation: rotDeg,
                },
                true // Record in undo history
              );
            }
          }}
        />
      )}
    </>
  );
});
