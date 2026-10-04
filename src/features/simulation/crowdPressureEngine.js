/**
 * DevaSetu Deterministic Crowd Pressure & Capacity Alert Engine
 * 
 * Evaluates real-time crowd pressure against designed temple architecture:
 * - Uses actual path-based queue geometry & capacity formulas.
 * - Calculates individual queue & zone utilization (unclamped: allows > 100%).
 * - Deterministic pressure levels: NORMAL (<70%), ELEVATED (70-85%), HIGH (85-100%), OVER_CAPACITY (>100%).
 * - Computes headline Crowd Pressure Index (0 - 150+).
 * - Manages deduplicated capacity alert lifecycle (ACTIVE / RESOLVED).
 * - Purely analytical: never blocks, clamps, stops or deletes simulated devotees.
 */

import { getQueuePathGeometry } from '../../services/layout/queuePathGeometry.js';
import { DEFAULT_PLANNING_CONFIG } from '../../services/layout/capacityCalculator.js';

export const PRESSURE_LEVELS = {
  NORMAL: 'normal',
  ELEVATED: 'elevated',
  HIGH: 'high',
  OVER_CAPACITY: 'over_capacity',
};

export const PRESSURE_THRESHOLDS = {
  NORMAL: 0.70,      // < 0.70 (70%)
  ELEVATED: 0.85,    // 0.70 to 0.85 (70% - 85%)
  HIGH: 1.00,        // 0.85 to 1.00 (85% - 100%)
  // OVER_CAPACITY is > 1.00 (> 100%)
};

/**
 * Returns deterministic pressure level string from numerical utilization ratio
 */
export function getPressureLevel(utilization) {
  if (utilization < PRESSURE_THRESHOLDS.NORMAL) return PRESSURE_LEVELS.NORMAL;
  if (utilization < PRESSURE_THRESHOLDS.ELEVATED) return PRESSURE_LEVELS.ELEVATED;
  if (utilization <= PRESSURE_THRESHOLDS.HIGH) return PRESSURE_LEVELS.HIGH;
  return PRESSURE_LEVELS.OVER_CAPACITY;
}

/**
 * Calculates physical capacity of a queue component using its true path centerline
 */
export function calculateQueuePhysicalCapacity(component, density = DEFAULT_PLANNING_CONFIG.densityPersonsPerSqMeter) {
  if (!component || component.type !== 'queue') return 0;

  let length = Number(component.dimensions?.length) || 10;
  if (component.properties?.pathData && component.properties.pathData.type !== 'straight') {
    try {
      const geom = getQueuePathGeometry(component);
      if (geom && geom.totalLength > 0) {
        length = geom.totalLength;
      }
    } catch (e) {}
  }

  const width = Number(component.dimensions?.width) || 2;
  const area = length * width;
  return Math.max(1, Math.round(area * density));
}

/**
 * CrowdPressureEngine manages zone-level capacity tracking, bottleneck detection,
 * Crowd Pressure Index calculation, and alert deduplication.
 */
export class CrowdPressureEngine {
  constructor(config = {}) {
    this.thresholds = { ...PRESSURE_THRESHOLDS, ...config.thresholds };
    this.density = config.density || DEFAULT_PLANNING_CONFIG.densityPersonsPerSqMeter;
    this.activeAlerts = new Map(); // key: zoneKey -> alert object
    this.alertHistory = [];
  }

  /**
   * Resets active alerts and history
   */
  reset() {
    this.activeAlerts.clear();
    this.alertHistory = [];
  }

  /**
   * Evaluates crowd pressure across all zones and returns normalized pressure state
   */
  evaluatePressure(scene, crowdState, simTimeSeconds = 0) {
    const components = scene?.components || [];
    const queueComponents = components.filter((c) => c.type === 'queue');
    const securityComponents = components.filter((c) => c.type === 'security');
    const darshanComponents = components.filter((c) => c.type === 'darshan' || c.type === 'darshan_sanctum');
    const exitComponents = components.filter((c) => c.type === 'exit');

    // 1. Calculate Queue Capacities partitioned by stream / zone
    let totalQueueCap = 0;
    let northQueueCap = 0;
    let westQueueCap = 0;
    let eastQueueCap = 0;

    const detailedQueues = queueComponents.map((q) => {
      const cap = calculateQueuePhysicalCapacity(q, this.density);
      totalQueueCap += cap;

      const stream = (q.properties?.stream || q.properties?.zone || '').toLowerCase();
      const id = (q.id || '').toLowerCase();

      if (stream.includes('north') || id.includes('north')) {
        northQueueCap += cap;
      } else if (stream.includes('west') || id.includes('west')) {
        westQueueCap += cap;
      } else if (stream.includes('east') || id.includes('east')) {
        eastQueueCap += cap;
      }

      return {
        id: q.id,
        name: q.name || q.id,
        zone: stream || 'main',
        pathType: q.properties?.pathData?.type || q.properties?.pattern || 'straight',
        width: q.dimensions?.width || 2,
        lanes: q.properties?.lanes || 1,
        capacity: cap,
      };
    });

    // 2. Map Current Occupancy from normalized crowdState
    const rawZones = crowdState?.zones || {};
    const totalActive = crowdState?.activeCrowd || 0;

    // At simulation start or when campus has zero active devotees, guarantee clean normal state with no alerts
    if (!crowdState || totalActive === 0) {
      this.reset();
    }

    // Determine if scene has multi-stream campus flow (North/West/East)
    const entranceComponents = components.filter(
      (c) => c.type === 'entrance' || c.type === 'entrance_gopuram'
    );
    const hasStreamQueues = northQueueCap > 0 || westQueueCap > 0 || eastQueueCap > 0;
    const isMultiStream =
      (northQueueCap > 0 && (westQueueCap > 0 || eastQueueCap > 0)) ||
      entranceComponents.length > 2 ||
      Boolean(rawZones.north && (rawZones.west || rawZones.east));

    if (!hasStreamQueues && isMultiStream && totalQueueCap > 0) {
      // Multi-stream campus with unpartitioned queues: allocate standard 40/30/30 distribution
      northQueueCap = Math.round(totalQueueCap * 0.40);
      westQueueCap = Math.round(totalQueueCap * 0.30);
      eastQueueCap = Math.round(totalQueueCap * 0.30);
    }

    // Default fallback capacity if scene has no queues placed yet
    if (totalQueueCap === 0) {
      totalQueueCap = 1500;
      northQueueCap = Math.round(totalQueueCap * 0.40);
      westQueueCap = Math.round(totalQueueCap * 0.30);
      eastQueueCap = Math.round(totalQueueCap * 0.30);
    }

    // 3. Operational Zone Capacities & Service Rates
    const numSecurityUnits = Math.max(1, securityComponents.length);
    const securityCapacity = numSecurityUnits * 25; // 25 devotees per DFMD holding corridor
    const securityServiceRate = Math.round(numSecurityUnits * (DEFAULT_PLANNING_CONFIG.throughputPerSecurityCheckpoint / 60)); // devotees / min

    const numDarshanChannels = Math.max(1, darshanComponents.length);
    const darshanCapacity = numDarshanChannels * 40; // Sanctum viewing frontage holding
    const darshanServiceRate = Math.round(numDarshanChannels * DEFAULT_PLANNING_CONFIG.throughputDarshanPerMinute); // devotees / min

    const totalExitWidth = exitComponents.reduce((sum, e) => sum + (e.dimensions?.width || 3), 0) || 6;
    const dispersalPlaza = scene?.components?.find((c) => c.role === 'post-darshan-plaza' || (c.id || '').includes('plaza'));
    const plazaArea = dispersalPlaza ? (dispersalPlaza.dimensions?.length || 60) * (dispersalPlaza.dimensions?.width || 22) : 1320;
    const exitCapacity = Math.max(1200, Math.round(plazaArea * 0.9 + totalExitWidth * 25));
    const exitServiceRate = Math.round(totalExitWidth * DEFAULT_PLANNING_CONFIG.exitFlowRatePerMeterMinute);

    const northOcc = rawZones.north?.count ?? (hasStreamQueues || isMultiStream ? Math.round(totalActive * 0.40) : 0);
    const westOcc = rawZones.west?.count ?? (hasStreamQueues || isMultiStream ? Math.round(totalActive * 0.30) : 0);
    const eastOcc = rawZones.east?.count ?? (hasStreamQueues || isMultiStream ? Math.round(totalActive * 0.30) : 0);
    const queueOcc = rawZones.queue?.count ?? totalActive;
    const secOcc = rawZones.security?.count ?? 0;
    const darshanOcc = rawZones.darshan?.count ?? 0;
    const exitOcc = rawZones.exit?.count ?? 0;

    // 4. Calculate Unclamped Utilizations
    const zoneDefinitions = [
      {
        key: 'north',
        name: 'North Queue Stream',
        occupancy: northOcc,
        capacity: northQueueCap,
        arrivalRate: Math.round((crowdState?.currentArrivalRate || 0) * 0.40),
        serviceRate: null,
      },
      {
        key: 'west',
        name: 'West Queue Stream',
        occupancy: westOcc,
        capacity: westQueueCap,
        arrivalRate: Math.round((crowdState?.currentArrivalRate || 0) * 0.30),
        serviceRate: null,
      },
      {
        key: 'east',
        name: 'East Queue Stream',
        occupancy: eastOcc,
        capacity: eastQueueCap,
        arrivalRate: Math.round((crowdState?.currentArrivalRate || 0) * 0.30),
        serviceRate: null,
      },
      {
        key: 'queue',
        name: 'Primary Queue System',
        occupancy: queueOcc,
        capacity: totalQueueCap,
        arrivalRate: crowdState?.currentArrivalRate || 0,
        serviceRate: null,
      },
      {
        key: 'security',
        name: 'Security Checkpoints',
        occupancy: secOcc,
        capacity: securityCapacity,
        arrivalRate: crowdState?.currentArrivalRate || 0,
        serviceRate: securityServiceRate,
      },
      {
        key: 'darshan',
        name: 'Darshan Sanctum Viewing',
        occupancy: darshanOcc,
        capacity: darshanCapacity,
        arrivalRate: null,
        serviceRate: darshanServiceRate,
      },
      {
        key: 'exit',
        name: 'South Egress Portal',
        occupancy: exitOcc,
        capacity: exitCapacity,
        arrivalRate: null,
        serviceRate: exitServiceRate,
      },
    ];

    const evaluatedZones = {};
    const overloadedZones = [];
    let highestUtil = 0;
    let highestPressureZoneKey = 'queue';
    let highestPressureZoneName = 'Primary Queue System';

    for (const z of zoneDefinitions) {
      const util = z.capacity > 0 ? z.occupancy / z.capacity : 0;
      const roundedUtil = Math.round(util * 1000) / 1000;
      const pressure = getPressureLevel(util);

      evaluatedZones[z.key] = {
        name: z.name,
        occupancy: z.occupancy,
        capacity: z.capacity,
        utilization: roundedUtil,
        utilizationPercent: Math.round(roundedUtil * 100),
        pressure,
        arrivalRate: z.arrivalRate,
        serviceRate: z.serviceRate,
      };

      if (util > highestUtil) {
        highestUtil = util;
        highestPressureZoneKey = z.key;
        highestPressureZoneName = z.name;
      }

      if (util > 1.00) {
        overloadedZones.push(z.name);
      }
    }

    // 5. Compute Headline Crowd Pressure Index
    // Mathematical Formula:
    // Index = round(highestUtilization * 100)
    // Reflects true peak architectural pressure without arbitrary clamping (e.g. 120 -> 120)
    const indexValue = Math.round(highestUtil * 100);
    const indexLevel = getPressureLevel(highestUtil);

    // 6. Manage Alert Lifecycle with Deduplication
    this.updateAlerts(evaluatedZones, simTimeSeconds, hasStreamQueues);

    // 7. Structured Primary Bottleneck Identification
    const primaryBottleneck = {
      zone: highestPressureZoneName,
      zoneKey: highestPressureZoneKey,
      reason: highestPressureZoneKey.includes('queue') || highestPressureZoneKey === 'north' || highestPressureZoneKey === 'west' || highestPressureZoneKey === 'east'
        ? 'queue-capacity'
        : highestPressureZoneKey === 'security'
        ? 'security-screening-rate'
        : highestPressureZoneKey === 'darshan'
        ? 'frontage-viewing-dwell'
        : 'egress-flow-capacity',
      utilization: Math.round(highestUtil * 100) / 100,
      severity: indexLevel,
    };

    return {
      index: indexValue,
      level: indexLevel,
      highestPressureZone: highestPressureZoneName,
      highestPressureZoneKey,
      overloadedZones,
      zones: evaluatedZones,
      detailedQueues,
      bottleneck: primaryBottleneck,
      alerts: Array.from(this.activeAlerts.values()),
    };
  }

  /**
   * Updates existing active alerts or resolves them when pressure falls below threshold
   */
  updateAlerts(evaluatedZones, simTimeSeconds, hasStreamQueues = false) {
    for (const [key, zone] of Object.entries(evaluatedZones)) {
      const skipForDeduplication =
        (hasStreamQueues && key === 'queue') ||
        (!hasStreamQueues && (key === 'north' || key === 'west' || key === 'east')) ||
        !zone.capacity ||
        zone.capacity <= 0;

      const util = zone.utilization;
      const isTriggered = !skipForDeduplication && util >= this.thresholds.NORMAL; // >= 70% (ELEVATED or above)

      if (isTriggered) {
        let severity = PRESSURE_LEVELS.ELEVATED;
        if (util > 1.00) {
          severity = PRESSURE_LEVELS.OVER_CAPACITY;
        } else if (util >= this.thresholds.HIGH) {
          severity = PRESSURE_LEVELS.HIGH;
        }

        const pct = Math.round(util * 100);
        let message = '';
        if (util > 1.00) {
          const excessPct = pct - 100;
          message = `${zone.name} has exceeded designed capacity by ${excessPct}% (${zone.occupancy.toLocaleString()} / ${zone.capacity.toLocaleString()} devotees).`;
        } else {
          message = `${zone.name} is at ${pct}% capacity (${zone.occupancy.toLocaleString()} / ${zone.capacity.toLocaleString()} devotees).`;
        }

        if (this.activeAlerts.has(key)) {
          // Update in-place to avoid duplicate alert spam
          const alert = this.activeAlerts.get(key);
          alert.utilization = util;
          alert.occupancy = zone.occupancy;
          alert.capacity = zone.capacity;
          alert.severity = severity;
          alert.message = message;
          alert.status = 'ACTIVE';
        } else {
          // Create new active alert
          const newAlert = {
            id: `alert-${key}`,
            type: 'capacity',
            zone: key,
            zoneName: zone.name,
            utilization: util,
            occupancy: zone.occupancy,
            capacity: zone.capacity,
            severity,
            status: 'ACTIVE',
            message,
            timestamp: Math.round(simTimeSeconds),
          };
          this.activeAlerts.set(key, newAlert);
        }
      } else {
        // Resolve alert if utilization has receded below 70%
        if (this.activeAlerts.has(key)) {
          const alert = this.activeAlerts.get(key);
          if (alert.status === 'ACTIVE') {
            alert.status = 'RESOLVED';
            alert.resolvedAt = Math.round(simTimeSeconds);
            this.alertHistory.push({ ...alert });
            if (this.alertHistory.length > 50) this.alertHistory.shift();
            this.activeAlerts.delete(key);
          }
        }
      }
    }
  }
}
