/**
 * DevaSetu Sri Ganesha Temple Festival Reference Scenario Generator
 * Generates a Distributed Multi-Zone Temple Campus Crowd Management System
 * on a site (default 250m × 180m) with 5 Gopurams, 8 Queue Patterns, and 16 Parallel Security Channels.
 *
 * CAMPUS SPATIAL ARCHITECTURE:
 * - 4 Outer Gopurams:
 *   1. North Gopuram: Primary Incoming Entrance (Uttara Raja Dvaram)
 *   2. West Gopuram: Secondary Incoming Entrance (Pashchima Dvaram)
 *   3. East Gopuram: Secondary Incoming Entrance (Purva Dvaram)
 *   4. South Gopuram: Primary Public Exit (Dakshina Nirgamana Dvaram)
 * - 1 Central Main Gopuram:
 *   5. Central Main Raja Gopuram (34m, 7 tiers) + Sri Ganesha Maha Garbhagriha
 *
 * CROWD DEMAND DISTRIBUTION (16 total channels / lanes):
 * - North Stream: 6 channels / lanes (~37.5% - 40%)
 * - West Stream:  5 channels / lanes (~31.25% - 30%)
 * - East Stream:  5 channels / lanes (~31.25% - 30%)
 *
 * ZONE ARCHITECTURE (Zones A - H):
 * - Zone A: North Arrival / Screening (Holding Loop + 6 Parallel Security + Serpentine Queue)
 * - Zone B: West Arrival / Screening (Holding Loop + 5 Parallel Security + Switchback Queue)
 * - Zone C: East Arrival / Screening (Holding Loop + 5 Parallel Security + Switchback Queue)
 * - Zone D: Central Queue Distribution Hub (Radial / Fan approach corridors)
 * - Zone E: Central Darshan Sanctum (D1, D2, D3, D4 controlled viewing lanes)
 * - Zone F: Post-Darshan Dispersal Plaza (60m × 22m prasad & regrouping plaza)
 * - Zone G: South Exit Corridors & South Exit Gopuram (4 parallel egress channels)
 * - Zone H: Dynamic Surge Overflow Reserve Bay (44m × 22m holding reserve loop)
 */

import { COMPONENT_TYPES } from '../../utils/componentDefaults.js';
import { validateLayout } from './layoutValidator.js';

export const FESTIVAL_SITE_SPECS = {
  templeName: 'Sri Ganesha Temple Festival Campus',
  length: 250,
  width: 180,
  unit: 'meters',
  expectedVisitors: 100000,
  peakVisitors: 15000,
  averageArrivalPerHour: 8333,
  peakArrivalPerHour: 12000,
  operatingHours: 12,
  distribution: {
    north: { percent: 37.5, lanes: 6, securityChannels: 6 },
    west: { percent: 31.25, lanes: 5, securityChannels: 5 },
    east: { percent: 31.25, lanes: 5, securityChannels: 5 },
  },
};

/**
 * Generates the complete 100K festival multi-zone temple campus layout.
 * Scales dynamically to provided site dimensions while maintaining
 * physical spacing, clearances, and continuous pedestrian networks.
 */
export function generateFestivalScenario(siteInput = null, optionsInput = {}) {
  const genId = `fest-100k-${Date.now().toString(36)}`;
  const components = [];

  const siteL = Math.max(140, Number(siteInput?.length) || FESTIVAL_SITE_SPECS.length);
  const siteW = Math.max(100, Number(siteInput?.width) || FESTIVAL_SITE_SPECS.width);
  const templeName = siteInput?.temple?.name || FESTIVAL_SITE_SPECS.templeName;

  const halfL = siteL / 2;
  const halfW = siteW / 2;

  // Outer gopuram perimeter anchors
  const northGopuramZ = Math.round((-halfW + 8) * 10) / 10;
  const southGopuramZ = Math.round((halfW - 8) * 10) / 10;
  const westGopuramX = Math.round((-halfL + 13) * 10) / 10;
  const eastGopuramX = Math.round((halfL - 13) * 10) / 10;

  // =========================================================================
  // 1. FIVE GOPURAM SYSTEM & SACRED ARCHITECTURE
  // =========================================================================

  // Tower 1: NORTH GOPURAM - Primary Incoming Entrance (Uttara Raja Dvaram)
  // Imposing 24m 5-tier gateway facing south (+Z) into North Arrival Plaza
  components.push({
    id: `arch-gopuram-north-${genId}`,
    type: COMPONENT_TYPES.ENTRANCE_GOPURAM,
    name: 'North Entrance Gopuram (Uttara Raja Dvaram)',
    position: { x: 0, y: 0, z: northGopuramZ },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 18, width: 9, height: 24 },
    properties: {
      tiers: 5,
      archWidth: 6.0,
      archHeight: 5.2,
      kalasams: 5,
      stoneColor: '#9CA3AF',
      zone: 'A',
      orientation: 'north',
      roleDescription: 'Primary incoming ceremonial entrance for North crowd stream',
    },
    generated: true,
    generationId: genId,
    role: 'north-gopuram',
  });

  // Tower 2: WEST GOPURAM - Secondary Incoming Entrance (Pashchima Dvaram)
  // 20m 5-tier gateway rotated 90° facing East (+X) into West Arrival Sector
  components.push({
    id: `arch-gopuram-west-${genId}`,
    type: COMPONENT_TYPES.ENTRANCE_GOPURAM,
    name: 'West Entrance Gopuram (Pashchima Dvaram)',
    position: { x: westGopuramX, y: 0, z: -10 },
    rotation: 90,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 16, width: 8, height: 20 },
    properties: {
      tiers: 5,
      archWidth: 5.5,
      archHeight: 4.8,
      kalasams: 5,
      stoneColor: '#9CA3AF',
      zone: 'B',
      orientation: 'west',
      roleDescription: 'Secondary incoming entrance for West crowd stream',
    },
    generated: true,
    generationId: genId,
    role: 'west-gopuram',
  });

  // Tower 3: EAST GOPURAM - Secondary Incoming Entrance (Purva Dvaram)
  // 20m 5-tier gateway rotated -90° facing West (-X) into East Arrival Sector
  components.push({
    id: `arch-gopuram-east-${genId}`,
    type: COMPONENT_TYPES.ENTRANCE_GOPURAM,
    name: 'East Entrance Gopuram (Purva Dvaram)',
    position: { x: eastGopuramX, y: 0, z: -10 },
    rotation: -90,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 16, width: 8, height: 20 },
    properties: {
      tiers: 5,
      archWidth: 5.5,
      archHeight: 4.8,
      kalasams: 5,
      stoneColor: '#9CA3AF',
      zone: 'C',
      orientation: 'east',
      roleDescription: 'Secondary incoming entrance for East crowd stream',
    },
    generated: true,
    generationId: genId,
    role: 'east-gopuram',
  });

  // Tower 4: SOUTH GOPURAM - Primary Public Exit (Dakshina Nirgamana Dvaram)
  // 22m 5-tier gateway with an extra-wide 7.5m ceremonial exit portal facing south (+Z)
  components.push({
    id: `arch-gopuram-south-${genId}`,
    type: COMPONENT_TYPES.ENTRANCE_GOPURAM,
    name: 'South Exit Gopuram (Dakshina Nirgamana Dvaram)',
    position: { x: 0, y: 0, z: southGopuramZ },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 20, width: 10, height: 22 },
    properties: {
      tiers: 5,
      archWidth: 7.5,
      archHeight: 5.4,
      kalasams: 5,
      stoneColor: '#9CA3AF',
      zone: 'G',
      orientation: 'south',
      roleDescription: 'Primary public egress gateway for post-Darshan crowd dispersal',
    },
    generated: true,
    generationId: genId,
    role: 'south-gopuram',
  });

  // Tower 5: CENTRAL MAIN GOPURAM - Sacred Landmark & Darshan Destination
  // Majestic 34m 7-tier Raja Gopuram with sculpted granite plinth & golden Kalasams
  components.push({
    id: `arch-gopuram-main-${genId}`,
    type: COMPONENT_TYPES.MAIN_GOPURAM,
    name: 'Central Main Raja Gopuram (34m)',
    position: { x: 0, y: 0, z: -10 },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 24, width: 13, height: 34 },
    properties: {
      tiers: 7,
      archWidth: 6.5,
      archHeight: 7.0,
      kalasams: 7,
      stoneColor: '#9CA3AF',
      zone: 'D',
      roleDescription: 'Central architectural landmark terminating radial queue convergence into Garbhagriha',
    },
    generated: true,
    generationId: genId,
    role: 'main-gopuram',
  });

  // Central Darshan Sanctum (Arunachaleswarar Shiva Maha Garbhagriha)
  // Stepped Dravidian Vimana tower behind Central Gopuram
  components.push({
    id: `arch-darshan-sanctum-${genId}`,
    type: COMPONENT_TYPES.DARSHAN_SANCTUM,
    name: `${templeName} Maha Garbhagriha`,
    position: { x: 0, y: 0, z: -32 },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 20, width: 18, height: 16 },
    properties: {
      vimanaHeight: 16,
      sanctumPillars: 12,
      diyaGlow: true,
      deity: 'Arunachaleswarar Shiva Lingam',
      showNandi: true,
      showPrabhavali: true,
      stoneColor: '#9CA3AF',
      zone: 'E',
      roleDescription: 'Sacred Sanctum Sanctorum for festive deity darshan',
    },
    generated: true,
    generationId: genId,
    role: 'darshan-sanctum',
  });

  // Central Connecting Pillared Mandapam (Sacred Colonnaded Corridor)
  components.push({
    id: `arch-mandapam-central-${genId}`,
    type: COMPONENT_TYPES.MANDAPAM,
    name: 'Central Maha Mandapam (Pillared Hall)',
    position: { x: 0, y: 0, z: -21 },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 22, width: 12, height: 6 },
    properties: {
      pillarSpacing: 3.5,
      stoneColor: '#9CA3AF',
      zone: 'D',
      roleDescription: 'Carved stone pillared hypostyle hall connecting Raja Gopuram to the Sanctum',
    },
    generated: true,
    generationId: genId,
    role: 'mandapam-central',
  });

  // =========================================================================
  // CONTINUOUS PERIMETER PRAKARAM WALL ENCLOSURE SYSTEM (MADHIL)
  // Completely encloses the temple on North, South, East, and West
  // Only designated Gopuram portals allow passage!
  // =========================================================================
  const wallH = 5.6;
  const wallThick = 2.4;

  // 1. North Perimeter Walls (Left & Right of North Gopuram)
  const nwLen = Math.abs(-9 - westGopuramX);
  components.push({
    id: `wall-north-west-${genId}`,
    type: COMPONENT_TYPES.PRAKARAM_WALL,
    name: 'North-West Outer Prakaram Wall',
    position: { x: (westGopuramX - 9) / 2, y: 0, z: northGopuramZ },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: nwLen, width: wallThick, height: wallH },
    properties: { stoneColor: '#BAAA94', orientation: 'north' },
    generated: true,
    generationId: genId,
    role: 'prakaram-wall',
  });

  const neLen = Math.abs(eastGopuramX - 9);
  components.push({
    id: `wall-north-east-${genId}`,
    type: COMPONENT_TYPES.PRAKARAM_WALL,
    name: 'North-East Outer Prakaram Wall',
    position: { x: (9 + eastGopuramX) / 2, y: 0, z: northGopuramZ },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: neLen, width: wallThick, height: wallH },
    properties: { stoneColor: '#BAAA94', orientation: 'north' },
    generated: true,
    generationId: genId,
    role: 'prakaram-wall',
  });

  // 2. South Perimeter Walls (Left & Right of South Gopuram)
  const swLen = Math.abs(-10 - westGopuramX);
  components.push({
    id: `wall-south-west-${genId}`,
    type: COMPONENT_TYPES.PRAKARAM_WALL,
    name: 'South-West Outer Prakaram Wall',
    position: { x: (westGopuramX - 10) / 2, y: 0, z: southGopuramZ },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: swLen, width: wallThick, height: wallH },
    properties: { stoneColor: '#BAAA94', orientation: 'south' },
    generated: true,
    generationId: genId,
    role: 'prakaram-wall',
  });

  const seLen = Math.abs(eastGopuramX - 10);
  components.push({
    id: `wall-south-east-${genId}`,
    type: COMPONENT_TYPES.PRAKARAM_WALL,
    name: 'South-East Outer Prakaram Wall',
    position: { x: (10 + eastGopuramX) / 2, y: 0, z: southGopuramZ },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: seLen, width: wallThick, height: wallH },
    properties: { stoneColor: '#BAAA94', orientation: 'south' },
    generated: true,
    generationId: genId,
    role: 'prakaram-wall',
  });

  // 3. West Perimeter Walls (North & South of West Gopuram at Z = -10, half-width = 8)
  const wnLen = Math.abs(-18 - northGopuramZ);
  components.push({
    id: `wall-west-north-${genId}`,
    type: COMPONENT_TYPES.PRAKARAM_WALL,
    name: 'West-North Outer Prakaram Wall',
    position: { x: westGopuramX, y: 0, z: (northGopuramZ - 18) / 2 },
    rotation: 90,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: wnLen, width: wallThick, height: wallH },
    properties: { stoneColor: '#BAAA94', orientation: 'west' },
    generated: true,
    generationId: genId,
    role: 'prakaram-wall',
  });

  const wsLen = Math.abs(southGopuramZ - (-2));
  components.push({
    id: `wall-west-south-${genId}`,
    type: COMPONENT_TYPES.PRAKARAM_WALL,
    name: 'West-South Outer Prakaram Wall',
    position: { x: westGopuramX, y: 0, z: (-2 + southGopuramZ) / 2 },
    rotation: 90,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: wsLen, width: wallThick, height: wallH },
    properties: { stoneColor: '#BAAA94', orientation: 'west' },
    generated: true,
    generationId: genId,
    role: 'prakaram-wall',
  });

  // 4. East Perimeter Walls (North & South of East Gopuram at Z = -10, half-width = 8)
  const enLen = Math.abs(-18 - northGopuramZ);
  components.push({
    id: `wall-east-north-${genId}`,
    type: COMPONENT_TYPES.PRAKARAM_WALL,
    name: 'East-North Outer Prakaram Wall',
    position: { x: eastGopuramX, y: 0, z: (northGopuramZ - 18) / 2 },
    rotation: 90,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: enLen, width: wallThick, height: wallH },
    properties: { stoneColor: '#BAAA94', orientation: 'east' },
    generated: true,
    generationId: genId,
    role: 'prakaram-wall',
  });

  const esLen = Math.abs(southGopuramZ - (-2));
  components.push({
    id: `wall-east-south-${genId}`,
    type: COMPONENT_TYPES.PRAKARAM_WALL,
    name: 'East-South Outer Prakaram Wall',
    position: { x: eastGopuramX, y: 0, z: (-2 + southGopuramZ) / 2 },
    rotation: 90,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: esLen, width: wallThick, height: wallH },
    properties: { stoneColor: '#BAAA94', orientation: 'east' },
    generated: true,
    generationId: genId,
    role: 'prakaram-wall',
  });

  // =========================================================================
  // 2. ZONE A: NORTH ARRIVAL & SCREENING (~37.5% - 40% DEMAND)
  // PATTERNS: HOLDING LOOP + 6 PARALLEL SECURITY + HIGH-CAPACITY SERPENTINE
  // =========================================================================

  // A1. North Arrival Gates (6 Gates spaced across X = -25 to +25 at Z = -74)
  const northGateZ = Math.round((northGopuramZ + 8) * 10) / 10;
  const northGateXPositions = [-25, -15, -5, 5, 15, 25];
  northGateXPositions.forEach((gX, idx) => {
    components.push({
      id: `gen-entrance-n${idx + 1}-${genId}`,
      type: COMPONENT_TYPES.ENTRANCE,
      name: `North Arrival Gate G${idx + 1}`,
      position: { x: gX, y: 0, z: northGateZ },
      rotation: 0,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 4.5, width: 1.5, height: 3.5 },
      properties: { signage: `NORTH GATE G${idx + 1}`, archType: 'traditional', zone: 'A' },
      generated: true,
      generationId: genId,
      role: 'arrival-gate-north',
    });
  });

  // North Arrival Plaza Demarcation Guide Rails (Flanking channels, leaving central axis open)
  [-25, -15, 15, 25].forEach((rX, rIdx) => {
    components.push({
      id: `bar-arrival-n-${rIdx}-${genId}`,
      type: COMPONENT_TYPES.BARRIER,
      name: `North Arrival Channel Rail ${rIdx + 1}`,
      position: { x: rX, y: 0, z: northGateZ + 3 },
      rotation: 90,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 4.5, width: 0.25, height: 1.1 },
      properties: { style: 'double-rail', zone: 'A' },
      generated: true,
      generationId: genId,
      role: 'arrival-barrier',
    });
  });

  // A2. North Holding Loop (Pattern: HOLDING LOOP)
  // Controlled circulation bay (36m × 12m) to absorb arrival bursts
  const northHoldingZ = Math.round((northGateZ + 8) * 10) / 10;
  components.push({
    id: `gen-holding-north-${genId}`,
    type: COMPONENT_TYPES.WAITING,
    name: 'North Holding Circulation Bay (Zone A)',
    position: { x: 0, y: 0, z: northHoldingZ },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 36, width: 12, height: 0.8 },
    properties: {
      capacity: 900,
      seatingRows: 2,
      pattern: 'holding_loop',
      zone: 'A',
      roleDescription: 'Circulating holding loop absorbing North arrival bursts before security screening',
    },
    generated: true,
    generationId: genId,
    role: 'holding-bay',
  });

  // Holding Loop Boundary & Release Gate Rails (Flanking wings, leaving wide central entry portal open)
  [-14, 14].forEach((sideX, sIdx) => {
    components.push({
      id: `bar-hloop-n-top-${sIdx}-${genId}`,
      type: COMPONENT_TYPES.BARRIER,
      name: `North Holding North Flank Rail ${sIdx + 1}`,
      position: { x: sideX, y: 0, z: northHoldingZ - 6.2 },
      rotation: 0,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 12, width: 0.25, height: 1.0 },
      properties: { style: 'double-rail', zone: 'A' },
      generated: true,
      generationId: genId,
    });
    components.push({
      id: `bar-hloop-n-bot-${sIdx}-${genId}`,
      type: COMPONENT_TYPES.BARRIER,
      name: `North Holding Release Flank Rail ${sIdx + 1}`,
      position: { x: sideX, y: 0, z: northHoldingZ + 6.2 },
      rotation: 0,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 12, width: 0.25, height: 1.0 },
      properties: { style: 'double-rail', zone: 'A' },
      generated: true,
      generationId: genId,
    });
  });

  // A3. North Security Screening (Pattern: PARALLEL - 6 Channels)
  // 6 parallel DFMD screening channels feeding directly into North Serpentine Queue
  const northSecurityZ = Math.round((northHoldingZ + 11) * 10) / 10;
  const northSecurityX = [-20, -12, -4, 4, 12, 20];
  northSecurityX.forEach((sX, sIdx) => {
    components.push({
      id: `gen-security-n${sIdx + 1}-${genId}`,
      type: COMPONENT_TYPES.SECURITY,
      name: `North Security S${sIdx + 1} (DFMD Channel)`,
      position: { x: sX, y: 0, z: northSecurityZ },
      rotation: 0,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 4.5, width: 3.0, height: 2.8 },
      properties: {
        metalDetector: true,
        baggageCounter: true,
        screeningChannels: 1,
        pattern: 'parallel',
        zone: 'A',
      },
      generated: true,
      generationId: genId,
      role: 'security-checkpoint',
    });
  });

  // A4. North Multi-Pattern Queue System: 2 Direct Special Darshan Lines + 4 Extended Free Darshan Serpentine Lines
  // Devotees enter from North vertically and move Southward towards the temple:
  // - 2 Direct Special Darshan lines (Lanes 3 & 4) connect straight to the central sanctum
  // - 4 Free Darshan lines (Lanes 1, 2, 5, 6) utilize the spacious courtyard space with
  //   high-capacity multi-pass serpentine and switchback queues with smooth curved bends.
  const northQueueConfigs = [
    {
      lIdx: 0,
      name: 'North Free Darshan Lane 1 (West Wing Serpentine)',
      position: { x: -20.0, y: 0, z: -35 },
      rotation: 90,
      dimensions: { length: 26, width: 2.2, height: 1.0 },
      properties: {
        lanes: 1,
        direction: 'south',
        zone: 'A',
        stream: 'north',
        pattern: 'serpentine',
        shape: 'serpentine',
        pathData: {
          type: 'serpentine',
          params: { rows: 3, rowLength: 26, spacing: 2.2 },
        },
        orientation: 'vertical',
        category: 'free',
        roleDescription: 'High-capacity outer West wing serpentine queue for Free Darshan',
      },
    },
    {
      lIdx: 1,
      name: 'North Free Darshan Lane 2 (West Courtyard Serpentine)',
      position: { x: -12.0, y: 0, z: -35 },
      rotation: 90,
      dimensions: { length: 26, width: 2.2, height: 1.0 },
      properties: {
        lanes: 1,
        direction: 'south',
        zone: 'A',
        stream: 'north',
        pattern: 'serpentine',
        shape: 'serpentine',
        pathData: {
          type: 'serpentine',
          params: { rows: 2, rowLength: 26, spacing: 2.2 },
        },
        orientation: 'vertical',
        category: 'free',
        roleDescription: 'Courtyard serpentine queue for Free Darshan',
      },
    },
    {
      lIdx: 2,
      name: 'North Special Darshan Lane 1 (Center West)',
      position: { x: -4.0, y: 0, z: -34 },
      rotation: 90,
      dimensions: { length: 30, width: 2.0, height: 1.0 },
      properties: {
        lanes: 1,
        direction: 'south',
        zone: 'A',
        stream: 'north',
        pattern: 'parallel',
        shape: 'straight',
        orientation: 'vertical',
        isDirect: true,
        category: 'direct',
        roleDescription: 'Direct Special Darshan lane flowing straight to central sanctum',
      },
    },
    {
      lIdx: 3,
      name: 'North Special Darshan Lane 2 (Center East)',
      position: { x: 4.0, y: 0, z: -34 },
      rotation: 90,
      dimensions: { length: 30, width: 2.0, height: 1.0 },
      properties: {
        lanes: 1,
        direction: 'south',
        zone: 'A',
        stream: 'north',
        pattern: 'parallel',
        shape: 'straight',
        orientation: 'vertical',
        isDirect: true,
        category: 'direct',
        roleDescription: 'Direct Special Darshan lane flowing straight to central sanctum',
      },
    },
    {
      lIdx: 4,
      name: 'North Free Darshan Lane 3 (East Courtyard Serpentine)',
      position: { x: 12.0, y: 0, z: -35 },
      rotation: 90,
      dimensions: { length: 26, width: 2.2, height: 1.0 },
      properties: {
        lanes: 1,
        direction: 'south',
        zone: 'A',
        stream: 'north',
        pattern: 'serpentine',
        shape: 'serpentine',
        pathData: {
          type: 'serpentine',
          params: { rows: 2, rowLength: 26, spacing: 2.2 },
        },
        orientation: 'vertical',
        category: 'free',
        roleDescription: 'Courtyard serpentine queue for Free Darshan',
      },
    },
    {
      lIdx: 5,
      name: 'North Free Darshan Lane 4 (East Wing Serpentine)',
      position: { x: 20.0, y: 0, z: -35 },
      rotation: 90,
      dimensions: { length: 26, width: 2.2, height: 1.0 },
      properties: {
        lanes: 1,
        direction: 'south',
        zone: 'A',
        stream: 'north',
        pattern: 'serpentine',
        shape: 'serpentine',
        pathData: {
          type: 'serpentine',
          params: { rows: 3, rowLength: 26, spacing: 2.2 },
        },
        orientation: 'vertical',
        category: 'free',
        roleDescription: 'High-capacity outer East wing serpentine queue for Free Darshan',
      },
    },
  ];

  northQueueConfigs.forEach((cfg) => {
    components.push({
      id: `gen-queue-north-l${cfg.lIdx + 1}-${genId}`,
      type: COMPONENT_TYPES.QUEUE,
      name: cfg.name,
      position: cfg.position,
      rotation: cfg.rotation,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: cfg.dimensions,
      properties: cfg.properties,
      generated: true,
      generationId: genId,
      role: 'queue-lane',
    });
  });

  // A5. Central Unified Darshan Spine Queue (The Single Queue leading directly to Darshan)
  // Continuous physical queue connecting seamlessly from the funnel to the Darshan Sanctum point
  components.push({
    id: `gen-queue-north-darshan-spine-${genId}`,
    type: COMPONENT_TYPES.QUEUE,
    name: 'North Central Unified Darshan Queue',
    position: { x: 0, y: 0, z: -10 },
    rotation: 90,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 17, width: 2.8, height: 1.0 },
    properties: {
      lanes: 1,
      direction: 'south',
      zone: 'A',
      pattern: 'parallel',
      covered: true,
      hasCanopy: true,
      isMergeSpine: true,
      roleDescription: 'Single ceremonial covered unified darshan queue leading directly to deity viewing',
    },
    generated: true,
    generationId: genId,
    role: 'unified-darshan-queue',
  });

  // Unified Spine Guide Rails flanking the central queue line
  [-1.45, 1.45].forEach((offsetX, bIdx) => {
    components.push({
      id: `bar-spine-n-${bIdx}-${genId}`,
      type: COMPONENT_TYPES.BARRIER,
      name: `North Unified Darshan Spine Rail ${bIdx + 1}`,
      position: { x: offsetX, y: 0, z: -10 },
      rotation: 90,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 17, width: 0.2, height: 1.0 },
      properties: { style: 'double-rail', zone: 'A' },
      generated: true,
      generationId: genId,
      role: 'queue-barrier',
    });
  });

  // =========================================================================
  // 3. ZONE B: WEST ARRIVAL & SCREENING (~31.25% - 30% DEMAND)
  // PATTERNS: HOLDING LOOP + 5 PARALLEL SECURITY + SWITCHBACK QUEUE
  // =========================================================================

  const westArrivalGateX = Math.round((westGopuramX + 8) * 10) / 10;
  const westGateZ = [-22, -14, -6, 2];
  westGateZ.forEach((gZ, idx) => {
    components.push({
      id: `gen-entrance-w${idx + 1}-${genId}`,
      type: COMPONENT_TYPES.ENTRANCE,
      name: `West Arrival Gate W${idx + 1}`,
      position: { x: westArrivalGateX, y: 0, z: gZ },
      rotation: 90,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 4.5, width: 1.5, height: 3.5 },
      properties: { signage: `WEST GATE W${idx + 1}`, archType: 'traditional', zone: 'B' },
      generated: true,
      generationId: genId,
      role: 'arrival-gate-west',
    });
  });

  // B2. West Holding Loop (Pattern: HOLDING LOOP)
  const westHoldingX = Math.round((westArrivalGateX + 12) * 10) / 10;
  components.push({
    id: `gen-holding-west-${genId}`,
    type: COMPONENT_TYPES.WAITING,
    name: 'West Holding Circulation Bay (Zone B)',
    position: { x: westHoldingX, y: 0, z: -10 },
    rotation: 90,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 24, width: 16, height: 0.8 },
    properties: {
      capacity: 600,
      seatingRows: 3,
      pattern: 'holding_loop',
      zone: 'B',
      roleDescription: 'Circulating holding loop absorbing West arrival bursts before security screening',
    },
    generated: true,
    generationId: genId,
    role: 'holding-bay',
  });

  // B3. West Security Screening (Pattern: PARALLEL - 5 Channels)
  const westSecurityX = Math.round((westHoldingX + 14) * 10) / 10;
  const westSecurityZ = [-20, -15, -10, -5, 0];
  westSecurityZ.forEach((sZ, sIdx) => {
    components.push({
      id: `gen-security-w${sIdx + 1}-${genId}`,
      type: COMPONENT_TYPES.SECURITY,
      name: `West Security S${sIdx + 1} (DFMD Channel)`,
      position: { x: westSecurityX, y: 0, z: sZ },
      rotation: 90,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 4.5, width: 3.0, height: 2.8 },
      properties: {
        metalDetector: true,
        baggageCounter: true,
        screeningChannels: 1,
        pattern: 'parallel',
        zone: 'B',
      },
      generated: true,
      generationId: genId,
      role: 'security-checkpoint',
    });
  });

  // B4. West Switchback Queues (Pattern: SWITCHBACK)
  const westSwitchbackCenterX = Math.round((westSecurityX + 27) * 10) / 10;
  const westSwitchbackZ = [-20, -15, -10, -5, 0];
  westSwitchbackZ.forEach((sZ, lIdx) => {
    components.push({
      id: `gen-queue-west-l${lIdx + 1}-${genId}`,
      type: COMPONENT_TYPES.QUEUE,
      name: `West Switchback Queue - Lane ${lIdx + 1}`,
      position: { x: westSwitchbackCenterX, y: 0, z: sZ },
      rotation: 0,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 32, width: 2.0, height: 1.0 },
      properties: {
        lanes: 1,
        direction: lIdx % 2 === 0 ? 'east' : 'west',
        zone: 'B',
        stream: 'west',
        pattern: 'switchback',
        shape: 'switchback',
        roleDescription: 'Wide shallow switchback channel feeding into Central Distribution Hub',
      },
      generated: true,
      generationId: genId,
      role: 'queue-lane',
    });

    [-1.2, 1.2].forEach((offsetZ, bIdx) => {
      components.push({
        id: `bar-queue-w-${lIdx}-${bIdx}-${genId}`,
        type: COMPONENT_TYPES.BARRIER,
        name: `West Switchback Guide Rail ${lIdx + 1}-${bIdx + 1}`,
        position: { x: westSwitchbackCenterX, y: 0, z: sZ + offsetZ },
        rotation: 0,
        scale: { x: 1, y: 1, z: 1 },
        dimensions: { length: 30, width: 0.2, height: 1.0 },
        properties: { style: 'double-rail', zone: 'B' },
        generated: true,
        generationId: genId,
        role: 'queue-barrier',
      });
    });
  });

  // B5. West 5-to-1 V-Shape Queue Convergence Pavilion & Unified Darshan Spine
  // Grand authentic covered V-shaped arcade spanning all 5 West parallel lanes and converging into the single Darshan spine
  components.push({
    id: `gen-queue-west-vfunnel-${genId}`,
    type: COMPONENT_TYPES.QUEUE,
    name: 'West 5-to-1 V-Shape Queue Convergence Pavilion (Covered)',
    position: { x: -28, y: 0, z: -10 },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 14, width: 23.5, height: 1.0 },
    properties: {
      pattern: 'v_shape',
      direction: 'east',
      widthStart: 23.5,
      widthEnd: 3.2,
      covered: true,
      hasCanopy: true,
      isMergeSpine: true,
      zone: 'B',
      stream: 'west',
      roleDescription: 'Grand V-shaped covered queue arcade spanning all 5 West lanes and converging into the unified Darshan queue spine',
    },
    generated: true,
    generationId: genId,
    role: 'v-shape-queue-west',
  });

  components.push({
    id: `gen-queue-west-unified-${genId}`,
    type: COMPONENT_TYPES.QUEUE,
    name: 'West Unified Darshan Merge Queue (Covered Single Line)',
    position: { x: -12.5, y: 0, z: -10 },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 17, width: 3.2, height: 1.0 },
    properties: {
      lanes: 1,
      direction: 'east',
      zone: 'B',
      stream: 'west',
      pattern: 'parallel',
      covered: true,
      hasCanopy: true,
      isMergeSpine: true,
      roleDescription: 'Single covered unified queue line leading straight from V-funnel into Darshan',
    },
    generated: true,
    generationId: genId,
    role: 'unified-darshan-queue-west',
  });

  // =========================================================================
  // 4. ZONE C: EAST ARRIVAL & SCREENING (~31.25% - 30% DEMAND)
  // PATTERNS: HOLDING LOOP + 5 PARALLEL SECURITY + SWITCHBACK QUEUE
  // =========================================================================

  const eastArrivalGateX = Math.round((eastGopuramX - 8) * 10) / 10;
  const eastGateZ = [-22, -14, -6, 2];
  eastGateZ.forEach((gZ, idx) => {
    components.push({
      id: `gen-entrance-e${idx + 1}-${genId}`,
      type: COMPONENT_TYPES.ENTRANCE,
      name: `East Arrival Gate E${idx + 1}`,
      position: { x: eastArrivalGateX, y: 0, z: gZ },
      rotation: -90,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 4.5, width: 1.5, height: 3.5 },
      properties: { signage: `EAST GATE E${idx + 1}`, archType: 'traditional', zone: 'C' },
      generated: true,
      generationId: genId,
      role: 'arrival-gate-east',
    });
  });

  // C2. East Holding Loop (Pattern: HOLDING LOOP)
  const eastHoldingX = Math.round((eastArrivalGateX - 12) * 10) / 10;
  components.push({
    id: `gen-holding-east-${genId}`,
    type: COMPONENT_TYPES.WAITING,
    name: 'East Holding Circulation Bay (Zone C)',
    position: { x: eastHoldingX, y: 0, z: -10 },
    rotation: -90,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 24, width: 16, height: 0.8 },
    properties: {
      capacity: 600,
      seatingRows: 3,
      pattern: 'holding_loop',
      zone: 'C',
      roleDescription: 'Circulating holding loop absorbing East arrival bursts before security screening',
    },
    generated: true,
    generationId: genId,
    role: 'holding-bay',
  });

  // C3. East Security Screening (Pattern: PARALLEL - 5 Channels)
  const eastSecurityX = Math.round((eastHoldingX - 14) * 10) / 10;
  const eastSecurityZ = [-20, -15, -10, -5, 0];
  eastSecurityZ.forEach((sZ, sIdx) => {
    components.push({
      id: `gen-security-e${sIdx + 1}-${genId}`,
      type: COMPONENT_TYPES.SECURITY,
      name: `East Security S${sIdx + 1} (DFMD Channel)`,
      position: { x: eastSecurityX, y: 0, z: sZ },
      rotation: -90,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 4.5, width: 3.0, height: 2.8 },
      properties: {
        metalDetector: true,
        baggageCounter: true,
        screeningChannels: 1,
        pattern: 'parallel',
        zone: 'C',
      },
      generated: true,
      generationId: genId,
      role: 'security-checkpoint',
    });
  });

  // C4. East Multi-Lane Parallel Queues (Pattern: PARALLEL)
  // High-throughput processing with independent parallel lanes running towards the Central Hub
  const eastParallelCenterX = Math.round((eastSecurityX - 27) * 10) / 10;
  const eastParallelZ = [-20, -15, -10, -5, 0];
  eastParallelZ.forEach((sZ, lIdx) => {
    components.push({
      id: `gen-queue-east-l${lIdx + 1}-${genId}`,
      type: COMPONENT_TYPES.QUEUE,
      name: `East Parallel Queue - Lane ${lIdx + 1}`,
      position: { x: eastParallelCenterX, y: 0, z: sZ },
      rotation: 0,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 32, width: 2.0, height: 1.0 },
      properties: {
        lanes: 1,
        direction: 'west', // Direct linear parallel throughput towards Central Hub
        zone: 'C',
        stream: 'east',
        pattern: 'parallel',
        shape: 'straight',
        roleDescription: 'High-throughput independent parallel lane feeding into Central Distribution Hub',
      },
      generated: true,
      generationId: genId,
      role: 'queue-lane',
    });

    [-1.2, 1.2].forEach((offsetZ, bIdx) => {
      components.push({
        id: `bar-queue-e-${lIdx}-${bIdx}-${genId}`,
        type: COMPONENT_TYPES.BARRIER,
        name: `East Parallel Partition Rail ${lIdx + 1}-${bIdx + 1}`,
        position: { x: eastParallelCenterX, y: 0, z: sZ + offsetZ },
        rotation: 0,
        scale: { x: 1, y: 1, z: 1 },
        dimensions: { length: 30, width: 0.2, height: 1.0 },
        properties: { style: 'double-rail', zone: 'C' },
        generated: true,
        generationId: genId,
        role: 'queue-barrier',
      });
    });
  });

  // C5. East 5-to-1 V-Shape Queue Convergence Pavilion & Unified Darshan Spine
  // Grand authentic covered V-shaped arcade spanning all 5 East parallel lanes and converging into the single Darshan spine
  components.push({
    id: `gen-queue-east-vfunnel-${genId}`,
    type: COMPONENT_TYPES.QUEUE,
    name: 'East 5-to-1 V-Shape Queue Convergence Pavilion (Covered)',
    position: { x: 28, y: 0, z: -10 },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 14, width: 23.5, height: 1.0 },
    properties: {
      pattern: 'v_shape',
      direction: 'west',
      widthStart: 23.5,
      widthEnd: 3.2,
      covered: true,
      hasCanopy: true,
      isMergeSpine: true,
      zone: 'C',
      stream: 'east',
      roleDescription: 'Grand V-shaped covered queue arcade spanning all 5 East lanes and converging into the unified Darshan queue spine',
    },
    generated: true,
    generationId: genId,
    role: 'v-shape-queue-east',
  });

  components.push({
    id: `gen-queue-east-unified-${genId}`,
    type: COMPONENT_TYPES.QUEUE,
    name: 'East Unified Darshan Merge Queue (Covered Single Line)',
    position: { x: 12.5, y: 0, z: -10 },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 17, width: 3.2, height: 1.0 },
    properties: {
      lanes: 1,
      direction: 'west',
      zone: 'C',
      stream: 'east',
      pattern: 'parallel',
      covered: true,
      hasCanopy: true,
      isMergeSpine: true,
      roleDescription: 'Single covered unified queue line leading straight from V-funnel into Darshan',
    },
    generated: true,
    generationId: genId,
    role: 'unified-darshan-queue-east',
  });

  // =========================================================================
  // 5. ZONE D & E: CENTRAL QUEUE DISTRIBUTION HUB & DARSHAN
  // PATTERNS: RADIAL / FAN APPROACH CORRIDORS & SPLIT-MERGE
  // =========================================================================

  const radialChannels = [
    { code: 'D1', name: 'Radial Approach Channel D1 (North-West)', x: -9, z: -14, rot: 15 },
    { code: 'D2', name: 'Radial Approach Channel D2 (North-Central)', x: -3, z: -14, rot: 5 },
    { code: 'D3', name: 'Radial Approach Channel D3 (South-Central / West)', x: 3, z: -14, rot: -5 },
    { code: 'D4', name: 'Radial Approach Channel D4 (North-East / East)', x: 9, z: -14, rot: -15 },
  ];

  radialChannels.forEach((rc) => {
    components.push({
      id: `gen-radial-channel-${rc.code}-${genId}`,
      type: COMPONENT_TYPES.QUEUE,
      name: rc.name,
      position: { x: rc.x, y: 0, z: rc.z },
      rotation: rc.rot,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 10, width: 2.2, height: 1.0 },
      properties: {
        lanes: 1,
        pattern: 'radial',
        shape: 'radial',
        pathData: {
          type: 'radial',
          params: { length: 10 },
        },
        zone: 'D',
        roleDescription: 'Radial approach corridor converging towards Central Temple Darshan portal',
      },
      generated: true,
      generationId: genId,
      role: 'radial-queue-channel',
    });
  });

  // E. Central Darshan Viewing Zones (D1 to D4)
  const darshanZones = [
    { code: 'D1', name: 'Darshan Viewing Zone D1 (North-West Stream)', x: -9, z: -22 },
    { code: 'D2', name: 'Darshan Viewing Zone D2 (North-Central Stream)', x: -3, z: -22 },
    { code: 'D3', name: 'Darshan Viewing Zone D3 (West Stream)', x: 3, z: -22 },
    { code: 'D4', name: 'Darshan Viewing Zone D4 (East Stream)', x: 9, z: -22 },
  ];

  darshanZones.forEach((dz) => {
    components.push({
      id: `gen-darshan-${dz.code}-${genId}`,
      type: COMPONENT_TYPES.DARSHAN,
      name: dz.name,
      position: { x: dz.x, y: 0, z: dz.z },
      rotation: 0,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 5.5, width: 4.0, height: 3.2 },
      properties: {
        viewingWidth: 5.0,
        sanctumFocal: true,
        zone: 'E',
        pattern: 'split_merge',
      },
      generated: true,
      generationId: genId,
      role: 'darshan-zone',
    });
  });

  // Forecourt Perimeter Boundary
  [-16, 16].forEach((fX, fIdx) => {
    components.push({
      id: `bar-forecourt-ring-${fIdx}-${genId}`,
      type: COMPONENT_TYPES.BARRIER,
      name: `Temple Forecourt Boundary Rail ${fIdx + 1}`,
      position: { x: fX, y: 0, z: -10 },
      rotation: 90,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 12, width: 0.25, height: 1.0 },
      properties: { style: 'double-rail', zone: 'D' },
      generated: true,
      generationId: genId,
      role: 'forecourt-barrier',
    });
  });

  // =========================================================================
  // 6. ZONE F: POST-DARSHAN DISPERSAL PLAZA
  // Broad open plaza allowing devotees to spread before reaching exit corridors
  // =========================================================================

  components.push({
    id: `gen-dispersal-plaza-${genId}`,
    type: COMPONENT_TYPES.WAITING,
    name: 'Post-Darshan Dispersal & Prasad Plaza (Zone F)',
    position: { x: 0, y: 0, z: 22 },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 60, width: 22, height: 0.8 },
    properties: {
      capacity: 1800,
      seatingRows: 4,
      pattern: 'dispersal_plaza',
      zone: 'F',
      roleDescription: 'Spacious post-darshan plaza allowing crowd to comfortably spread out, collect prasad, and regroup before exiting',
    },
    generated: true,
    generationId: genId,
    role: 'post-darshan-plaza',
  });

  // Plaza Boundary Rails
  components.push({
    id: `bar-plaza-west-${genId}`,
    type: COMPONENT_TYPES.BARRIER,
    name: 'Post-Darshan Plaza West Rail',
    position: { x: -31, y: 0, z: 22 },
    rotation: 90,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 22, width: 0.25, height: 1.0 },
    properties: { style: 'double-rail', zone: 'F' },
    generated: true,
    generationId: genId,
  });
  components.push({
    id: `bar-plaza-east-${genId}`,
    type: COMPONENT_TYPES.BARRIER,
    name: 'Post-Darshan Plaza East Rail',
    position: { x: 31, y: 0, z: 22 },
    rotation: 90,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 22, width: 0.25, height: 1.0 },
    properties: { style: 'double-rail', zone: 'F' },
    generated: true,
    generationId: genId,
  });

  // =========================================================================
  // 7. ZONE G: SOUTH EXIT DISPERSAL CHANNELS & SOUTH GOPURAM
  // PATTERNS: PARALLEL DISPERSAL CORRIDORS CONVERGING THROUGH SOUTH GOPURAM
  // =========================================================================

  const exitChannels = [
    { code: 'E1', name: 'South Dispersal Channel E1', x: -12, z: 54 },
    { code: 'E2', name: 'South Dispersal Channel E2', x: -4, z: 54 },
    { code: 'E3', name: 'South Dispersal Channel E3', x: 4, z: 54 },
    { code: 'E4', name: 'South Dispersal Channel E4', x: 12, z: 54 },
  ];

  exitChannels.forEach((ec) => {
    components.push({
      id: `gen-queue-exit-${ec.code}-${genId}`,
      type: COMPONENT_TYPES.QUEUE,
      name: ec.name,
      position: { x: ec.x, y: 0, z: ec.z },
      rotation: 90,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 30, width: 3.0, height: 1.0 },
      properties: {
        lanes: 1,
        direction: 'south',
        zone: 'G',
        pattern: 'dispersal',
        roleDescription: 'Parallel egress channel leading towards South Exit Gopuram',
      },
      generated: true,
      generationId: genId,
      role: 'exit-queue-lane',
    });
  });

  // 4 Exit Gates at Z = southGopuramZ - 10
  const exitGateZ = Math.round((southGopuramZ - 10) * 10) / 10;
  [-12, -4, 4, 12].forEach((eX, idx) => {
    components.push({
      id: `gen-exit-corridor-${idx + 1}-${genId}`,
      type: COMPONENT_TYPES.EXIT,
      name: `South Exit Corridor Gate ${idx + 1}`,
      position: { x: eX, y: 0, z: exitGateZ },
      rotation: 0,
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { length: 4.5, width: 2.5, height: 2.8 },
      properties: { signage: `EXIT ${idx + 1}`, oneWay: true, zone: 'G' },
      generated: true,
      generationId: genId,
      role: 'egress-corridor',
    });
  });

  // =========================================================================
  // 8. ZONE H: DYNAMIC SURGE OVERFLOW RESERVE BAY
  // PATTERN: OVERFLOW LOOP
  // Positioned in North-East quadrant
  // =========================================================================

  const overflowX = Math.round(Math.min(halfL - 30, 65) * 10) / 10;
  components.push({
    id: `gen-overflow-bay-${genId}`,
    type: COMPONENT_TYPES.WAITING,
    name: 'Dynamic Surge Overflow Reserve Bay (Zone H)',
    position: { x: overflowX, y: 0, z: -62 },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 44, width: 22, height: 0.8 },
    properties: {
      capacity: 1500,
      isOverflow: true,
      activeOnSurge: true,
      pattern: 'overflow_loop',
      zone: 'H',
      roleDescription: 'Standby reserve holding loop deployed during peak surges to prevent gate crowding',
    },
    generated: true,
    generationId: genId,
    role: 'overflow-holding',
  });

  components.push({
    id: `bar-overflow-top-${genId}`,
    type: COMPONENT_TYPES.BARRIER,
    name: 'Overflow Reserve North Rail',
    position: { x: overflowX, y: 0, z: -73.5 },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { length: 44, width: 0.25, height: 1.0 },
    properties: { style: 'double-rail', zone: 'H' },
    generated: true,
    generationId: genId,
  });

  // Boundary
  const boundary = [
    { x: -halfL, y: 0, z: -halfW },
    { x: halfL, y: 0, z: -halfW },
    { x: halfL, y: 0, z: halfW },
    { x: -halfL, y: 0, z: halfW },
  ];

  const festivalScene = {
    temple: {
      name: templeName,
    },
    site: {
      unit: siteInput?.unit || FESTIVAL_SITE_SPECS.unit,
      length: siteL,
      width: siteW,
      boundary,
    },
    requirements: {
      expectedVisitors: siteInput?.requirements?.expectedVisitors || FESTIVAL_SITE_SPECS.expectedVisitors,
      peakVisitors: siteInput?.requirements?.peakVisitors || FESTIVAL_SITE_SPECS.peakVisitors,
      averageArrivalPerHour: FESTIVAL_SITE_SPECS.averageArrivalPerHour,
      peakArrivalPerHour: FESTIVAL_SITE_SPECS.peakArrivalPerHour,
      operatingHours: FESTIVAL_SITE_SPECS.operatingHours,
      distribution: FESTIVAL_SITE_SPECS.distribution,
    },
    components,
    paths: [],
    analysis: {
      valid: true,
      errors: [],
      warnings: [],
      metrics: null,
    },
  };

  festivalScene.analysis = validateLayout(festivalScene);

  return {
    success: true,
    scene: festivalScene,
    components,
    summary: {
      campusType: 'multi-zone-distributed-campus',
      gopurams: {
        north: 'Uttara Raja Dvaram (Primary Entrance - 24m, 5 tiers)',
        west: 'Pashchima Dvaram (Secondary Entrance - 20m, 5 tiers)',
        east: 'Purva Dvaram (Secondary Entrance - 20m, 5 tiers)',
        south: 'Dakshina Nirgamana Dvaram (Primary Public Exit - 22m, 5 tiers)',
        central: 'Maha Raja Gopuram (Temple Landmark - 34m, 7 tiers)',
      },
      zones: {
        zoneA: 'North Arrival / Screening (Holding Loop + 6 Security + Serpentine Queue)',
        zoneB: 'West Arrival / Screening (Holding Loop + 5 Security + Switchback Queue)',
        zoneC: 'East Arrival / Screening (Holding Loop + 5 Security + Switchback Queue)',
        zoneD: 'Central Queue Distribution Hub (Radial / Fan approach)',
        zoneE: 'Central Darshan Sanctum (Maha Garbhagriha)',
        zoneF: 'Post-Darshan Dispersal Plaza (Prasad & Regrouping)',
        zoneG: 'South Exit Dispersal Channels & South Gopuram',
        zoneH: 'Dynamic Surge Overflow Reserve Bay',
      },
      queuePatterns: [
        'Serpentine (North Zone A)',
        'Switchback (West Zone B & East Zone C)',
        'Parallel Security Channels (16 total)',
        'Holding Circulation Loops (Zones A, B, C)',
        'Radial / Fan Approach Corridors (Zone D)',
        'Split-Merge Distribution (Darshan frontage)',
        'Post-Darshan Dispersal Plaza (Zone F)',
        'Dynamic Overflow Reserve Loop (Zone H)',
      ],
      crowdDemandDistribution: {
        north: '37.5% (6 channels / lanes)',
        west: '31.25% (5 channels / lanes)',
        east: '31.25% (5 channels / lanes)',
      },
      entrances: northGateXPositions.length + westGateZ.length + eastGateZ.length,
      holdingZones: 4,
      securityZones: 3,
      securityChannels: 16,
      queueLanes: 16,
      darshanZones: 4,
      exits: 6,
      totalComponents: components.length,
    },
  };
}
