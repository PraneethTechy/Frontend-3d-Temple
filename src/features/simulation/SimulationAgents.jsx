import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useSimulationStore } from './simulationStore.js';
import { DevoteeHumanoid } from './DevoteeHumanoid.jsx';

/**
 * 3D Humanoid Devotee Crowd System
 * Renders recognizable 3D human-shaped devotees with walking kinematics,
 * swinging arms, alternating leg strides, and traditional attire.
 */
export function SimulationAgents() {
  const agents = useSimulationStore((state) => state.agents);
  const status = useSimulationStore((state) => state.status);
  const step = useSimulationStore((state) => state.step);

  // Advance deterministic simulation step on every animation frame
  useFrame((_, delta) => {
    if (status === 'running') {
      step(delta);
    }
  });

  return (
    <group name="simulation-humanoid-devotees">
      {agents && agents.length > 0 && agents.map((agent) => (
        <DevoteeHumanoid key={agent.id} agent={agent} />
      ))}
    </group>
  );
}
