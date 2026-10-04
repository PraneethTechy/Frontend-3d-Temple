import React from 'react';
import { DravidianGopuram } from './DravidianGopuram.jsx';

/**
 * Authentic Dravidian Entrance Gopuram
 * Powers the North Entrance, East Entrance, West Entrance, and South Exit gateway towers.
 * Delegates to the authentic DravidianGopuram procedural architecture generator.
 */
export function EntranceGopuram({ component, isSelected, showLabels: propShowLabels }) {
  return (
    <DravidianGopuram
      component={component}
      isMain={false}
      isSelected={isSelected}
      showLabels={propShowLabels}
    />
  );
}
