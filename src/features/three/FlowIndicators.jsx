import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useQueueStore } from '../../store/useQueueStore.js';
import { COMPONENT_TYPES } from '../../utils/componentDefaults.js';

/**
 * FlowIndicators
 * Provides clean, elegant, directional visual guides for the pilgrimage flow:
 * North/West/East Entrances -> Holding -> Security -> Queues -> Main Darshan -> Sanctum -> South Exit.
 */
// Pre-allocated shared geometries for flow indicators
const flowChevronGeometry = new THREE.ConeGeometry(0.9, 1.8, 3);
const flowPulseGeometry = new THREE.RingGeometry(0.9, 1.15, 16);

export function FlowIndicators() {
  const showFlow = useQueueStore((state) => state.showFlow);
  const scene = useQueueStore((state) => state.scene);
  const components = scene.components || [];



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

  if (!showFlow || flowSteps.length === 0) return null;

  return (
    <group name="sacred-flow-indicators">
      {flowSteps.map((step, idx) => (
        <group key={`flow-step-${idx}`} position={[step.x, 0.08, step.z]} rotation={[-Math.PI / 2, 0, step.angle]}>
          {/* Chevron Shape */}
          <mesh geometry={flowChevronGeometry}>
            <meshBasicMaterial color={step.color || '#F59E0B'} transparent opacity={0.75} />
          </mesh>
          {/* Pulse Halo */}
          <mesh position={[0, -0.6, 0]} geometry={flowPulseGeometry}>
            <meshBasicMaterial color={step.color || '#F59E0B'} transparent opacity={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
