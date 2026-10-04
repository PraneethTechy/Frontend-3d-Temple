import React from 'react';
import { DravidianGopuram } from './DravidianGopuram.jsx';

/**
 * Authentic Dravidian Central Main Raja Gopuram (34m Landmark)
 * Powers the monumental Central Darshan Gopuram overlooking the sacred sanctum.
 * Delegates to the authentic DravidianGopuram procedural architecture generator with isMain={true}.
 */
export function MainGopuram({ component, isSelected, showLabels: propShowLabels }) {
  return (
    <DravidianGopuram
      component={component}
      isMain={true}
      isSelected={isSelected}
      showLabels={propShowLabels}
    />
  );
}
