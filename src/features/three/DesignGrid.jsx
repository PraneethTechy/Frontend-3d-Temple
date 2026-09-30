import React, { useMemo } from 'react';
import { Grid } from '@react-three/drei';
import { toMeters } from '../../utils/units.js';
import { useQueueStore } from '../../store/useQueueStore.js';

export function DesignGrid({ length, width, unit }) {
  const isImmersive = useQueueStore((state) => state.isImmersive);
  const lengthMeters = useMemo(() => toMeters(length, unit), [length, unit]);
  const widthMeters = useMemo(() => toMeters(width, unit), [width, unit]);

  // Adjust cell size based on unit
  // In meters: 1m cells, 5m sections
  // In feet: ~1ft (~0.3048m) cells, ~5ft sections
  const cellSize = unit === 'feet' ? 0.3048 : 1.0;
  const sectionSize = unit === 'feet' ? 1.524 : 5.0;

  // In Immersive Review mode, minimize technical grid clutter
  if (isImmersive) {
    return (
      <group position={[0, 0.002, 0]}>
        <Grid
          args={[lengthMeters, widthMeters]}
          cellSize={cellSize * 2}
          cellThickness={0.2}
          cellColor="#E5DFD5"
          sectionSize={sectionSize * 2}
          sectionThickness={0.4}
          sectionColor="#D2C9BC"
          fadeDistance={Math.max(lengthMeters, widthMeters) * 1.5}
          fadeStrength={2}
          infiniteGrid={false}
        />
      </group>
    );
  }

  return (
    <group position={[0, 0.002, 0]}>
      {/* Site Floor Grid bounded to crowd management area */}
      <Grid
        args={[lengthMeters, widthMeters]}
        cellSize={cellSize}
        cellThickness={0.7}
        cellColor="#D6CFC4"
        sectionSize={sectionSize}
        sectionThickness={1.2}
        sectionColor="#A89D8F"
        fadeDistance={Math.max(lengthMeters, widthMeters) * 2}
        fadeStrength={1.5}
        infiniteGrid={false}
      />

      {/* Surrounding Studio Ambient Grid */}
      <Grid
        position={[0, -0.26, 0]}
        args={[100, 100]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#E8E2D8"
        sectionSize={25}
        sectionThickness={0.8}
        sectionColor="#D4CCC0"
        fadeDistance={200}
        fadeStrength={1}
        infiniteGrid={true}
      />
    </group>
  );
}
