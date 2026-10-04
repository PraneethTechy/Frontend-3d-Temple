/**
 * Geometric Specifications for the DevaSetu Monolithic Overpass Bridge
 */

export const BRIDGE_HEIGHT = 4.8;      // 4.8m elevated deck: provides ~4.5m clear headroom underneath
export const BRIDGE_DECK_WIDTH = 3.6;   // 3.6m wide: spacious 4-pedestrian flow width
export const NUM_STAIR_STEPS = 26;     // 26 comfortable steps: 18.46cm rise, 42cm tread
export const STAIR_RUN_LENGTH = 10.92; // 26 * 0.42m = 10.92m run (gentle 23.7° slope)
export const LANDING_DEPTH = 3.2;      // 3.2m depth for top and bottom landings

export const NORTH_WEST_BRIDGE_CONFIG = {
  id: 'north-west-pedestrian-bridge',
  name: 'North-to-West Elevated Pedestrian Overpass',
  // Ground Landing 1 (North Approach Plaza)
  groundLanding1Center: { x: -26.0, z: -78.0 },
  groundLanding1RotationY: -Math.PI / 2, // Facing West along approach
  // Ascent Stairs (Rising from y=0 to y=4.8m)
  stairAscentStart: { x: -27.6, z: -78.0 },
  stairAscentEnd: { x: -38.52, z: -78.0 },
  // Top Landing 1 (y=4.8m)
  topLanding1Center: { x: -40.12, z: -78.0 },
  topLanding1RotationY: -Math.PI / 2,
  // Bridge Span 1 (Westbound elevated skybridge at y=4.8m)
  span1Start: { x: -41.72, z: -78.0 },
  span1End: { x: -87.75, z: -78.0 },
  // Corner (4.5m x 4.5m junction platform at y=4.8m)
  corner: { x: -90.0, z: -78.0 },
  // Bridge Span 2 (Southbound elevated skybridge along x=-90.0 at y=4.8m)
  span2Start: { x: -90.0, z: -75.75 },
  span2End: { x: -90.0, z: -45.60 },
  // Top Landing 2 (y=4.8m)
  topLanding2Center: { x: -90.0, z: -44.0 },
  topLanding2RotationY: 0,
  // Descent Stairs (Descending smoothly from y=4.8m to y=0.0m towards West Arrival Plaza)
  stairDescentStart: { x: -90.0, z: -42.40 },
  stairDescentEnd: { x: -90.0, z: -31.48 },
  // Ground Landing 2 (West Arrival Plaza - >14.5m clearance to West Security S1)
  groundLanding2Center: { x: -90.0, z: -29.88 },
  groundLanding2RotationY: 0, // Facing South into West Arrival plaza
  height: BRIDGE_HEIGHT,
  width: BRIDGE_DECK_WIDTH,
};

export const NORTH_EAST_BRIDGE_CONFIG = {
  id: 'north-east-pedestrian-bridge',
  name: 'North-to-East Elevated Pedestrian Overpass',
  // Ground Landing 1 (North Approach Plaza)
  groundLanding1Center: { x: 26.0, z: -78.0 },
  groundLanding1RotationY: Math.PI / 2, // Facing East along approach
  // Ascent Stairs (Rising from y=0 to y=4.8m)
  stairAscentStart: { x: 27.6, z: -78.0 },
  stairAscentEnd: { x: 38.52, z: -78.0 },
  // Top Landing 1 (y=4.8m)
  topLanding1Center: { x: 40.12, z: -78.0 },
  topLanding1RotationY: Math.PI / 2,
  // Bridge Span 1 (Eastbound elevated skybridge at y=4.8m)
  span1Start: { x: 41.72, z: -78.0 },
  span1End: { x: 87.75, z: -78.0 },
  // Corner (4.5m x 4.5m junction platform at y=4.8m)
  corner: { x: 90.0, z: -78.0 },
  // Bridge Span 2 (Southbound elevated skybridge along x=90.0 at y=4.8m)
  span2Start: { x: 90.0, z: -75.75 },
  span2End: { x: 90.0, z: -45.60 },
  // Top Landing 2 (y=4.8m)
  topLanding2Center: { x: 90.0, z: -44.0 },
  topLanding2RotationY: 0,
  // Descent Stairs (Descending smoothly from y=4.8m to y=0.0m towards East Arrival Plaza)
  stairDescentStart: { x: 90.0, z: -42.40 },
  stairDescentEnd: { x: 90.0, z: -31.48 },
  // Ground Landing 2 (East Arrival Plaza - >14.5m clearance to East Security S1)
  groundLanding2Center: { x: 90.0, z: -29.88 },
  groundLanding2RotationY: 0, // Facing South into East Arrival plaza
  height: BRIDGE_HEIGHT,
  width: BRIDGE_DECK_WIDTH,
};
