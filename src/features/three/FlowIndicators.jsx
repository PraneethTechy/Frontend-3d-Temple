import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useQueueStore } from '../../store/useQueueStore.js';
import { useSimulationStore } from '../simulation/simulationStore.js';
import { COMPONENT_TYPES } from '../../utils/componentDefaults.js';

/**
 * FlowIndicators
 * Provides clean, elegant, directional visual guides for pilgrimage flow:
 * - Standard Gateways: North/West/East Entrances -> Holding -> Security -> Queues -> Main Darshan -> Sanctum -> South Exit.
 * - Dynamic AI Load Balancer: Pulsing cross-stream corridors when one gate is congested and AI reroutes to a lighter gate.
 */
// Pre-allocated shared geometries for flow indicators
const flowChevronGeometry = new THREE.ConeGeometry(0.9, 1.8, 3);
const flowPulseGeometry = new THREE.RingGeometry(0.9, 1.15, 16);
const aiDiversionChevronGeom = new THREE.ConeGeometry(1.2, 2.2, 3);

export function FlowIndicators() {
  const showFlow = useQueueStore((state) => state.showFlow);
  const components = useQueueStore((state) => state.scene?.components || []);
  
  // Real-time AI Navigation State
  const aiNavigationState = useSimulationStore((state) => state.aiNavigationState);
  const aiGroupRef = useRef();

  useFrame(({ clock }) => {
    if (aiGroupRef.current) {
      const t = clock.getElapsedTime();
      // Subtle pulse oscillation for AI diversion corridors
      aiGroupRef.current.position.y = 0.12 + Math.sin(t * 4) * 0.05;
    }
  });

  // Calculate key anchor points based on campus layout
  const flowSteps = useMemo(() => {
    if (!showFlow) return [];

    const northGopuram = components.find((c) => c.role === 'north-gopuram' || c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM);
    const westGopuram = components.find((c) => c.role === 'west-gopuram');
    const eastGopuram = components.find((c) => c.role === 'east-gopuram');
    const mainGopuram = components.find((c) => c.type === COMPONENT_TYPES.MAIN_GOPURAM);
    const sanctum = components.find((c) => c.type === COMPONENT_TYPES.DARSHAN_SANCTUM || c.type === COMPONENT_TYPES.DARSHAN);
    const southGopuram = components.find((c) => c.role === 'south-gopuram');

    const steps = [];

    // Directional chevron creator
    const addChevron = (x, z, angle, color = '#F59E0B', label = '') => {
      steps.push({ x, z, angle, color, label });
    };

    // North Stream
    if (northGopuram) {
      addChevron(0, -68, 0, '#F59E0B');
      addChevron(0, -50, 0, '#F59E0B');
      addChevron(0, -32, 0, '#F59E0B');
      addChevron(0, -14, 0, '#F59E0B');
    }

    // West Stream
    if (westGopuram) {
      addChevron(-85, 0, -Math.PI / 2, '#38BDF8');
      addChevron(-55, 0, -Math.PI / 2, '#38BDF8');
      addChevron(-25, 0, -Math.PI / 2, '#38BDF8');
    }

    // East Stream
    if (eastGopuram) {
      addChevron(85, 0, Math.PI / 2, '#A855F7');
      addChevron(55, 0, Math.PI / 2, '#A855F7');
      addChevron(25, 0, Math.PI / 2, '#A855F7');
    }

    // Main Gopuram to Sanctum (Inner Sacred Darshan Approach)
    if (mainGopuram && sanctum) {
      addChevron(0, -5, 0, '#F59E0B');
      addChevron(0, -18, 0, '#F59E0B');
    }

    // Post-Darshan Dispersal toward South Exit
    if (southGopuram) {
      addChevron(0, 15, Math.PI, '#10B981');
      addChevron(0, 35, Math.PI, '#10B981');
      addChevron(0, 55, Math.PI, '#10B981');
      addChevron(0, 72, Math.PI, '#10B981');
    }

    return steps;
  }, [showFlow, components]);

  // Dynamic AI Cross-Stream Diversion Corridors
  const diversionChevrons = useMemo(() => {
    if (!aiNavigationState?.active) return [];
    const { congestedStream, targetStream } = aiNavigationState;
    const chevrons = [];

    if (congestedStream === 'north' && targetStream === 'west') {
      chevrons.push({ x: -15, z: -68, angle: -Math.PI / 2, color: '#38BDF8' });
      chevrons.push({ x: -35, z: -60, angle: -Math.PI / 2.5, color: '#38BDF8' });
      chevrons.push({ x: -55, z: -45, angle: -Math.PI / 2.3, color: '#38BDF8' });
      chevrons.push({ x: -70, z: -25, angle: -Math.PI / 2.1, color: '#38BDF8' });
      chevrons.push({ x: -80, z: -10, angle: -Math.PI / 2, color: '#38BDF8' });
    } else if (congestedStream === 'north' && targetStream === 'east') {
      chevrons.push({ x: 15, z: -68, angle: Math.PI / 2, color: '#A855F7' });
      chevrons.push({ x: 35, z: -60, angle: Math.PI / 2.5, color: '#A855F7' });
      chevrons.push({ x: 55, z: -45, angle: Math.PI / 2.3, color: '#A855F7' });
      chevrons.push({ x: 70, z: -25, angle: Math.PI / 2.1, color: '#A855F7' });
      chevrons.push({ x: 80, z: -10, angle: Math.PI / 2, color: '#A855F7' });
    } else if (congestedStream === 'west' && targetStream === 'north') {
      chevrons.push({ x: -75, z: -20, angle: Math.PI / 3, color: '#F59E0B' });
      chevrons.push({ x: -55, z: -45, angle: Math.PI / 4, color: '#F59E0B' });
      chevrons.push({ x: -30, z: -62, angle: Math.PI / 6, color: '#F59E0B' });
      chevrons.push({ x: -10, z: -68, angle: 0, color: '#F59E0B' });
    } else if (congestedStream === 'east' && targetStream === 'north') {
      chevrons.push({ x: 75, z: -20, angle: -Math.PI / 3, color: '#F59E0B' });
      chevrons.push({ x: 55, z: -45, angle: -Math.PI / 4, color: '#F59E0B' });
      chevrons.push({ x: 30, z: -62, angle: -Math.PI / 6, color: '#F59E0B' });
      chevrons.push({ x: 10, z: -68, angle: 0, color: '#F59E0B' });
    }

    return chevrons;
  }, [aiNavigationState]);

  if (!showFlow && diversionChevrons.length === 0) return null;

  return (
    <group name="sacred-flow-indicators">
      {/* Standard Pilgrimage Flow */}
      {showFlow &&
        flowSteps.map((step, idx) => (
          <group key={`flow-step-${idx}`} position={[step.x, 0.08, step.z]} rotation={[-Math.PI / 2, 0, step.angle]}>
            <mesh geometry={flowChevronGeometry}>
              <meshBasicMaterial color={step.color || '#F59E0B'} transparent opacity={0.75} />
            </mesh>
            <mesh position={[0, -0.6, 0]} geometry={flowPulseGeometry}>
              <meshBasicMaterial color={step.color || '#F59E0B'} transparent opacity={0.35} />
            </mesh>
          </group>
        ))}

      {/* Dynamic AI Load Balancer Cross-Stream Diversion Corridors */}
      {diversionChevrons.length > 0 && (
        <group ref={aiGroupRef} name="ai-load-balancer-corridors">
          {diversionChevrons.map((chev, idx) => (
            <group key={`ai-div-${idx}`} position={[chev.x, 0.14, chev.z]} rotation={[-Math.PI / 2, 0, chev.angle]}>
              <mesh geometry={aiDiversionChevronGeom}>
                <meshBasicMaterial color={chev.color} transparent opacity={0.95} />
              </mesh>
              <mesh position={[0, -0.8, 0]} geometry={flowPulseGeometry} scale={[1.4, 1.4, 1.4]}>
                <meshBasicMaterial color="#10B981" transparent opacity={0.65} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}
