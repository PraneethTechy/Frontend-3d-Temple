/**
 * DevaSetu Deterministic Crowd Flow Simulation Engine
 * Stepper logic for waypoint traversal, queue spacing, service bottlenecks,
 * spatial density accumulation, metrics aggregation, continuous agent spawning,
 * bounded visual agent recycling, and multi-stream campus flow.
 */

import { 
  AGENT_STATES, 
  LOGICAL_DEVOTEE_STATES, 
  SIMULATION_DEFAULTS, 
  SECURITY_DWELL_SECONDS, 
  DARSHAN_DWELL_SECONDS, 
  createAgent, 
  createLogicalDevotee, 
  getDistance2D, 
  normalizeEntranceWeights 
} from './simulationModel.js';
import { CrowdPressureEngine } from './crowdPressureEngine.js';
import { QueueRouter } from './queueRouter.js';

export class SimulationEngine {
  constructor(scene, paths, options = {}) {
    this.scene = scene;
    this.paths = Array.isArray(paths) ? paths.filter((p) => !p.isDiversion) : (paths || []);
    this.diversionPaths = paths?.diversionPaths || (Array.isArray(paths) ? paths.filter((p) => p.isDiversion) : []);
    this.allPaths = paths?.allPaths || [...this.paths, ...this.diversionPaths];
    this.options = { ...SIMULATION_DEFAULTS, ...options };
    this.pressureEngine = new CrowdPressureEngine();
    const allPathsForRouter = this.allPaths.length > 0 ? this.allPaths : this.paths;
    this.queueRouter = new QueueRouter(allPathsForRouter, this.scene, this.pressureEngine.density);

    // Realistic short service dwell duration standards (configurable simulation seconds)
    this.securityDwellSeconds = options.securityDwellSeconds !== undefined ? options.securityDwellSeconds : (options.SECURITY_DWELL_SECONDS || SIMULATION_DEFAULTS.SECURITY_DWELL_SECONDS || SECURITY_DWELL_SECONDS);
    this.darshanDwellSeconds = options.darshanDwellSeconds !== undefined ? options.darshanDwellSeconds : (options.DARSHAN_DWELL_SECONDS || SIMULATION_DEFAULTS.DARSHAN_DWELL_SECONDS || DARSHAN_DWELL_SECONDS);

    // Per-channel security checkpoint occupancy tracking (channelKey -> { agentId, releaseTime, ... })
    this.securityChannels = {};

    const peakVisitors = Number(options.peakVisitors || scene?.requirements?.peakVisitors) || 1500;
    // Bounded visual agent sample count (target: 100 to 300 devotees)
    this.targetVisualAgents = options.targetVisualAgents !== undefined 
      ? options.targetVisualAgents 
      : Math.min(300, Math.max(80, Math.round(peakVisitors / 5)));
    this.scaleFactor = options.scaleFactor !== undefined 
      ? options.scaleFactor 
      : Math.max(1, Math.round(peakVisitors / this.targetVisualAgents));

    this.agents = [];
    this.recentCompletedAgents = []; // Bounded rolling history for wait-time stats
    this.simTime = 0; // Simulated seconds
    this.spawnTimer = 0;
    this.nextAgentId = 1;
    this.peakQueueCount = 0;

    // Continuous flow counters
    this.totalSpawnedCount = 0;
    this.totalCompletedCount = 0;
    this.peakCompletedCrowd = 0;

    // Crowd Load Engine: Separate planned crowd from actual arrival demand
    const expected = Number(scene?.requirements?.expectedVisitors) || 0;
    const peak = Number(scene?.requirements?.peakVisitors) || 0;
    this.plannedCrowd = expected || peak || 10000;

    // Arrival rates (devotees per simulated minute)
    // Realistic initial arrival rate (e.g. 240 devotees/minute = 4 devotees/second across campus streams)
    this.baseArrivalRate = Math.min(300, Math.max(120, Math.round(this.plannedCrowd / 400))) || 240;
    this.currentArrivalRate = this.baseArrivalRate;
    this.isSurgeActive = false;
    this.surgeIncrement = 1500; // visitors/min during surge
    this.arrivalsPaused = false;
    this.batchInjectedCount = 0;
    this.accumulatedArrivals = 0;

    // Logical crowd counters (unbounded by planned crowd)
    this.logicalEnteredCount = 0;
    this.logicalCompletedCount = 0;

    // High-performance logical individual devotee identity registry
    this.logicalDevotees = new Map(); // id -> full active logical devotee
    this.streamCounters = { north: 0, west: 0, east: 0 };
    this.activeLogicalDevoteesByStream = { north: [], west: [], east: [] };
    this.completedDevoteesCompact = new Map(); // id -> compact historical audit record
    this.selectedDevoteeId = null;

    // Bounded reusable ID pool for stable React component identities
    this.agentIdPool = [];
    for (let i = 1; i <= this.targetVisualAgents * 2; i++) {
      this.agentIdPool.push(i);
    }

    // Entrance Inflow Distribution Controls (PART 1 & 2: Relative distribution weights)
    this.entranceInflow = {
      north: 50,
      west: 25,
      east: 25,
    };
    this.baseEntranceWeights = { ...this.entranceInflow };
    this.activeEntranceWeights = { ...this.entranceInflow };
    this.totalLogicalEntered = 0;
    this.rerouteAcceptedTime = 0;
    this.lastRerouteCongested = null;

    // Configurable Startup Warm-up Period (Section 9) & Minimum Persistence (Section 11)
    this.warmupPeriod = options.warmupPeriod !== undefined ? options.warmupPeriod : 30; // 30 simulated seconds
    this.minCongestionDuration = options.minCongestionDuration !== undefined ? options.minCongestionDuration : 8.0; // 8 simulated seconds

    // Deterministic Runtime Per-Entrance Counters & Multi-Signal Congestion Tracking (PART 4, 5, 6, 7, 8)
    this.entranceStats = {
      north: {
        entranceId: 'north',
        stream: 'north',
        name: 'North Raja Gopuram',
        entered: 0,
        active: 0,
        completed: 0,
        share: 0,
        queueOccupancy: 0,
        securityCount: 0,
        queueCapacity: 1200,
        queueUtilization: 0,
        utilization: 0,
        waitingCount: 0,
        arrivalRate: 0,
        serviceRate: 0,
        queueGrowthRate: 0,
        waitGrowthRate: 0,
        availableCapacity: 1200,
        avgSpeed: 1.2,
        movementSpeed: 1.2,
        queueProgress: 1.0,
        avgWaitMinutes: 0,
        congestionState: 'FLOWING', // 'FLOWING' | 'SLOW' | 'CONGESTED' | 'BLOCKED'
        status: 'NORMAL', // 'NORMAL' | 'BUILDING' | 'CONGESTED' | 'REROUTE_CANDIDATE'
        alertState: 'NORMAL', // 'NORMAL' | 'OBSERVING' | 'CONGESTED' | 'BLOCKED' | 'REDIRECTION_RECOMMENDED' | 'USER_ACCEPTED' | 'USER_DECLINED' | 'MONITORING' | 'RECOVERED'
        blockedDuration: 0,
        congestionDuration: 0,
        visualSpawned: 0,
        visualCompleted: 0,
      },
      west: {
        entranceId: 'west',
        stream: 'west',
        name: 'West Paschima Gopuram',
        entered: 0,
        active: 0,
        completed: 0,
        share: 0,
        queueOccupancy: 0,
        securityCount: 0,
        queueCapacity: 1000,
        queueUtilization: 0,
        utilization: 0,
        waitingCount: 0,
        arrivalRate: 0,
        serviceRate: 0,
        queueGrowthRate: 0,
        waitGrowthRate: 0,
        availableCapacity: 1000,
        avgSpeed: 1.2,
        movementSpeed: 1.2,
        queueProgress: 1.0,
        avgWaitMinutes: 0,
        congestionState: 'FLOWING',
        status: 'NORMAL',
        alertState: 'NORMAL',
        blockedDuration: 0,
        congestionDuration: 0,
        visualSpawned: 0,
        visualCompleted: 0,
      },
      east: {
        entranceId: 'east',
        stream: 'east',
        name: 'East Purva Gopuram',
        entered: 0,
        active: 0,
        completed: 0,
        share: 0,
        queueOccupancy: 0,
        securityCount: 0,
        queueCapacity: 1000,
        queueUtilization: 0,
        utilization: 0,
        waitingCount: 0,
        arrivalRate: 0,
        serviceRate: 0,
        queueGrowthRate: 0,
        waitGrowthRate: 0,
        availableCapacity: 1000,
        avgSpeed: 1.2,
        movementSpeed: 1.2,
        queueProgress: 1.0,
        avgWaitMinutes: 0,
        congestionState: 'FLOWING',
        status: 'NORMAL',
        alertState: 'NORMAL',
        blockedDuration: 0,
        congestionDuration: 0,
        visualSpawned: 0,
        visualCompleted: 0,
      },
    };

    // Rolling window observation buffer for trend analysis (10-30s rolling samples)
    this.streamHistory = {
      north: [],
      west: [],
      east: [],
    };

    // AI Intelligent Queue Navigation & Dynamic Balancer
    this.aiQueueNavigationEnabled = true;
    this.diversionApproved = false;
    this.diversionPromptPending = false;
    this.diversionDismissedTime = 0;
    this.diversionDismissedUtil = 0;
    this.lastCalculatedDivertPercent = 15;
    this.onDiversionPrompt = null;
    this.aiNavigationState = {
      active: false,
      pendingApproval: false,
      congestedStream: null,
      targetStream: null,
      allQueuesOverloaded: false,
      disparity: 0,
      divertedCount: 0,
      message: 'All entrance streams balanced',
    };

    // Time-series history for D3 graphs
    this.metricsHistory = [];
    this.lastHistoryRecordTime = 0;

    // Bottleneck tracking
    this.cumulativeWaitByZone = {
      security: 0,
      queue: 0,
      darshan: 0,
    };

    // Initialize Density Grid
    this.initHeatmapGrid(scene?.site);
  }

  initHeatmapGrid(site) {
    const length = site?.length || 60;
    const width = site?.width || 35;
    this.cellSize = 1.5; // 1.5m cells for fine-grained queue density

    this.gridCols = Math.ceil(length / this.cellSize);
    this.gridRows = Math.ceil(width / this.cellSize);
    this.gridOriginX = -length / 2;
    this.gridOriginZ = -width / 2;

    this.heatmapOccupancy = new Float32Array(this.gridCols * this.gridRows);
    this.maxCellOccupancy = 0.01;
  }

  recordHeatmap(x, z, dt) {
    const col = Math.floor((x - this.gridOriginX) / this.cellSize);
    const row = Math.floor((z - this.gridOriginZ) / this.cellSize);

    if (col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows) {
      const idx = row * this.gridCols + col;
      this.heatmapOccupancy[idx] += dt;
      if (this.heatmapOccupancy[idx] > this.maxCellOccupancy) {
        this.maxCellOccupancy = this.heatmapOccupancy[idx];
      }
    }
  }

  formatSimClock(simTimeSeconds) {
    if (simTimeSeconds === null || simTimeSeconds === undefined || isNaN(simTimeSeconds)) return '--:--:--';
    const totalSecs = Math.max(0, Math.floor(simTimeSeconds));
    const hrs = 10 + Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  generateDevoteeId(stream, sequence) {
    const s = String(stream || 'north').toLowerCase();
    const prefix = s.charAt(0).toUpperCase();
    return `${prefix}-${String(sequence).padStart(8, '0')}`;
  }

  createAndRegisterLogicalDevotee(stream, pathId = null) {
    const s = String(stream || 'north').toLowerCase();
    if (!this.streamCounters[s]) this.streamCounters[s] = 0;
    this.streamCounters[s]++;
    const id = this.generateDevoteeId(s, this.streamCounters[s]);
    const devotee = createLogicalDevotee({
      id,
      entranceId: s,
      simTime: this.simTime,
      pathId,
      queuePosition: (this.activeLogicalDevoteesByStream[s]?.length || 0) + 1,
    });
    this.logicalDevotees.set(id, devotee);
    if (!this.activeLogicalDevoteesByStream[s]) {
      this.activeLogicalDevoteesByStream[s] = [];
    }
    this.activeLogicalDevoteesByStream[s].push(devotee);
    return devotee;
  }

  completeLogicalDevotee(devotee) {
    if (!devotee || devotee.status === 'completed') return;
    devotee.status = 'completed';
    devotee.logicalState = LOGICAL_DEVOTEE_STATES.COMPLETED;
    devotee.completedAt = this.simTime;
    devotee.zone = 'exit';
    devotee.representativeId = null;

    const totalJourneyTime = Math.max(0, devotee.completedAt - devotee.enteredAt);

    this.completedDevoteesCompact.set(devotee.id, {
      id: devotee.id,
      entranceId: devotee.entranceId,
      status: 'completed',
      logicalState: LOGICAL_DEVOTEE_STATES.COMPLETED,
      zone: 'exit',
      pathId: devotee.pathId,
      queuePosition: 0,
      enteredAt: devotee.enteredAt,
      securityStartedAt: devotee.securityStartedAt,
      securityCompletedAt: devotee.securityCompletedAt,
      darshanStartedAt: devotee.darshanStartedAt,
      darshanCompletedAt: devotee.darshanCompletedAt,
      completedAt: devotee.completedAt,
      waitTime: Math.round((devotee.waitTime || 0) * 10) / 10,
      serviceTime: Math.round((devotee.serviceTime || 0) * 10) / 10,
      totalJourneyTime: Math.round(totalJourneyTime * 10) / 10,
      representativeId: null,
    });

    // Prune oldest completed records beyond 100,000 to maintain bounded memory
    if (this.completedDevoteesCompact.size > 100000) {
      const firstKey = this.completedDevoteesCompact.keys().next().value;
      this.completedDevoteesCompact.delete(firstKey);
    }

    this.logicalDevotees.delete(devotee.id);

    const s = devotee.entranceId?.toLowerCase() || 'north';
    const streamList = this.activeLogicalDevoteesByStream[s];
    if (streamList) {
      const idx = streamList.indexOf(devotee);
      if (idx !== -1) {
        streamList.splice(idx, 1);
      }
    }
  }

  syncStreamCompletedDevotees(stream, targetCompletedCount) {
    const s = String(stream || 'north').toLowerCase();
    const streamList = this.activeLogicalDevoteesByStream[s];
    if (!streamList || streamList.length === 0) return;

    const activeExpected = Math.max(0, (this.entranceStats[s]?.entered || 0) - targetCompletedCount);
    while (streamList.length > activeExpected) {
      let candidate = null;
      for (let i = 0; i < streamList.length; i++) {
        if (!streamList[i].representativeId) {
          candidate = streamList[i];
          break;
        }
      }
      if (!candidate) {
        candidate = streamList[0];
      }
      this.completeLogicalDevotee(candidate);
    }
  }

  findDevotee(id) {
    if (!id) return null;
    const cleanId = String(id).trim().toUpperCase();
    return this.logicalDevotees.get(cleanId) || this.completedDevoteesCompact.get(cleanId) || null;
  }

  getDevoteeQueuePosition(id) {
    const devotee = this.findDevotee(id);
    if (!devotee) return { position: 0, peopleAhead: 0, totalQueue: 0 };
    if (devotee.status === 'completed' || devotee.logicalState === LOGICAL_DEVOTEE_STATES.COMPLETED) {
      return { position: 0, peopleAhead: 0, totalQueue: 0 };
    }

    const s = devotee.entranceId?.toLowerCase() || 'north';
    const streamList = this.activeLogicalDevoteesByStream[s] || [];
    const idx = streamList.findIndex((d) => d.id === devotee.id);

    const totalQueue = this.entranceStats[s]?.queueOccupancy || streamList.length;

    if (idx !== -1) {
      return {
        position: idx + 1,
        peopleAhead: idx,
        totalQueue,
      };
    }

    return {
      position: 1,
      peopleAhead: 0,
      totalQueue,
    };
  }

  calculateDevoteeETA(id) {
    const devotee = this.findDevotee(id);
    if (!devotee) {
      return { available: false, text: 'ETA unavailable', reason: 'Devotee not found' };
    }

    const elapsedSeconds = Math.max(0, Math.round(this.simTime - devotee.enteredAt));

    if (devotee.status === 'completed' || devotee.logicalState === LOGICAL_DEVOTEE_STATES.COMPLETED) {
      const totalSec = devotee.completedAt && devotee.enteredAt ? Math.max(0, Math.round(devotee.completedAt - devotee.enteredAt)) : elapsedSeconds;
      return {
        available: true,
        status: 'Completed',
        elapsedSeconds: totalSec,
        remainingSeconds: 0,
        estimatedCompletionSimTime: devotee.completedAt || this.simTime,
        estimatedCompletionFormatted: this.formatSimClock(devotee.completedAt || this.simTime),
        text: 'Journey completed',
        details: {
          queueWaitSec: Math.round(devotee.waitTime || 0),
          serviceSec: Math.round(devotee.serviceTime || 0),
        },
      };
    }

    const stream = devotee.entranceId?.toLowerCase() || 'north';
    const streamStats = this.entranceStats[stream];
    if (!streamStats) {
      return { available: false, text: 'ETA unavailable', reason: 'No stream telemetry' };
    }

    // Determine deterministic service rate from real simulation stats
    let serviceRatePerMin = streamStats.serviceRate;
    if ((!serviceRatePerMin || serviceRatePerMin <= 0) && streamStats.completed > 0 && this.simTime >= 5) {
      serviceRatePerMin = (streamStats.completed / this.simTime) * 60;
    }

    // If simulation has not established flow yet, or service is completely 0 / blocked with no prior completions
    if ((!serviceRatePerMin || serviceRatePerMin <= 0) && streamStats.completed === 0) {
      if (this.simTime < 5) {
        return {
          available: false,
          elapsedSeconds,
          text: 'ETA unavailable',
          reason: 'Insufficient flow data during startup',
        };
      }
      if (streamStats.congestionState === 'BLOCKED') {
        return {
          available: false,
          elapsedSeconds,
          text: 'ETA unavailable',
          reason: 'Queue blocked or service halted',
        };
      }
    }

    // Effective service rate per second
    const serviceRatePerSec = Math.max(0.05, (serviceRatePerMin || 30) / 60);

    // Queue position and people ahead
    const queueInfo = this.getDevoteeQueuePosition(id);
    const peopleAhead = Math.max(0, queueInfo.peopleAhead);

    // Queue wait
    const queueWaitSec = peopleAhead / serviceRatePerSec;

    // Remaining security screening
    let securitySec = 0;
    if (!devotee.securityCompletedAt) {
      const baseSecDwell = this.securityDwellSeconds || 0.45;
      if (devotee.securityStartedAt) {
        securitySec = Math.max(0, baseSecDwell - (this.simTime - devotee.securityStartedAt));
      } else {
        securitySec = baseSecDwell;
      }
    }

    // Remaining Darshan dwell
    let darshanSec = 0;
    if (!devotee.darshanCompletedAt) {
      const baseDarshanDwell = this.darshanDwellSeconds || 0.60;
      if (devotee.darshanStartedAt) {
        darshanSec = Math.max(0, baseDarshanDwell - (this.simTime - devotee.darshanStartedAt));
      } else {
        darshanSec = baseDarshanDwell;
      }
    }

    // Physical transit progression
    const avgSpeed = Math.max(0.25, streamStats.avgSpeed || 1.2);
    const remainingDistance = 45; // average transit distance
    const transitSec = remainingDistance / avgSpeed;

    const remainingSeconds = Math.round(queueWaitSec + securitySec + darshanSec + transitSec);
    const estimatedCompletionSimTime = this.simTime + remainingSeconds;

    const remMins = Math.floor(remainingSeconds / 60);
    const remSecs = Math.floor(remainingSeconds % 60);
    const text = remMins > 0 ? `${remMins}m ${remSecs}s` : `${remSecs}s`;

    return {
      available: true,
      elapsedSeconds,
      remainingSeconds,
      estimatedCompletionSimTime,
      estimatedCompletionFormatted: this.formatSimClock(estimatedCompletionSimTime),
      text,
      details: {
        queueWaitSec: Math.round(queueWaitSec),
        securitySec: Math.round(securitySec * 10) / 10,
        darshanSec: Math.round(darshanSec * 10) / 10,
        transitSec: Math.round(transitSec),
      },
    };
  }

  selectDevotee(id) {
    if (!id) {
      this.selectedDevoteeId = null;
      return null;
    }
    const cleanId = String(id).trim().toUpperCase();
    const dev = this.findDevotee(cleanId);
    if (!dev) return null;
    this.selectedDevoteeId = dev.id;
    return this.getSelectedDevoteeDetails();
  }

  getSelectedDevoteeDetails() {
    if (!this.selectedDevoteeId) return null;
    return this.getDevoteeDetails(this.selectedDevoteeId);
  }

  getDevoteeDetails(id) {
    const dev = this.findDevotee(id);
    if (!dev) return null;

    const s = dev.entranceId?.toLowerCase() || 'north';
    const queueInfo = this.getDevoteeQueuePosition(dev.id);
    const eta = this.calculateDevoteeETA(dev.id);

    const isVisual = Boolean(
      dev.representativeId &&
      this.agents.some((a) => a.visitorRepresentativeId === dev.representativeId || a.id === dev.representativeId || a.logicalDevoteeId === dev.id)
    );

    let statusDisplay = 'Moving';
    let zoneDisplay = dev.zone || 'entrance';
    if (dev.status === 'completed' || dev.logicalState === LOGICAL_DEVOTEE_STATES.COMPLETED) {
      statusDisplay = 'Completed';
      zoneDisplay = 'exit';
    } else if (dev.logicalState === LOGICAL_DEVOTEE_STATES.BRIDGE_TRANSITION || (dev.isDiverted && (dev.zone === 'bridge' || dev.zone === 'approach'))) {
      statusDisplay = 'Crossing Overpass Bridge';
      zoneDisplay = 'bridge';
    } else if (dev.logicalState === LOGICAL_DEVOTEE_STATES.SECURITY_CHECK) {
      statusDisplay = 'In Security Screening';
      zoneDisplay = 'security';
    } else if (dev.logicalState === LOGICAL_DEVOTEE_STATES.SECURITY_QUEUE) {
      statusDisplay = 'Waiting in Security Queue';
      zoneDisplay = 'security';
    } else if (dev.logicalState === LOGICAL_DEVOTEE_STATES.DARSHAN_DWELL) {
      statusDisplay = 'At Darshan Sanctum';
      zoneDisplay = 'darshan';
    } else if (dev.logicalState === LOGICAL_DEVOTEE_STATES.DARSHAN_APPROACH) {
      statusDisplay = 'Approaching Darshan';
      zoneDisplay = 'darshan';
    } else if (dev.logicalState === LOGICAL_DEVOTEE_STATES.QUEUEING || dev.zone === 'queue') {
      statusDisplay = 'Waiting in Queue';
      zoneDisplay = 'queue';
    } else if (dev.logicalState === LOGICAL_DEVOTEE_STATES.HOLDING || dev.zone === 'holding') {
      statusDisplay = 'Waiting in Holding';
      zoneDisplay = 'holding';
    } else if (dev.logicalState === LOGICAL_DEVOTEE_STATES.EXITING || dev.zone === 'exit') {
      statusDisplay = 'Exiting Campus';
      zoneDisplay = 'exit';
    }

    const cleanZone = zoneDisplay.charAt(0).toUpperCase() + zoneDisplay.slice(1);

    return {
      id: dev.id,
      entranceId: dev.entranceId,
      entranceName: dev.isDiverted
        ? `${this.entranceStats[s]?.name || (dev.entranceId.charAt(0).toUpperCase() + dev.entranceId.slice(1) + ' Gopuram')} → ${dev.divertedTo ? dev.divertedTo.charAt(0).toUpperCase() + dev.divertedTo.slice(1) + ' Gopuram' : 'West Gopuram'} (Bridge Redirected)`
        : (this.entranceStats[s]?.name || (dev.entranceId.charAt(0).toUpperCase() + dev.entranceId.slice(1) + ' Gopuram')),
      status: statusDisplay,
      currentZone: cleanZone,
      zone: dev.zone,
      logicalState: dev.logicalState,
      queuePosition: queueInfo.position,
      peopleAhead: queueInfo.peopleAhead,
      totalQueue: queueInfo.totalQueue,
      securityStatus: dev.securityCompletedAt ? 'Completed' : (dev.securityStartedAt ? 'In Progress' : 'Pending'),
      darshanStatus: dev.darshanCompletedAt ? 'Completed' : (dev.darshanStartedAt ? 'In Progress' : 'Pending'),
      enteredAt: dev.enteredAt,
      enteredTimeFormatted: this.formatSimClock(dev.enteredAt),
      completedAt: dev.completedAt,
      completedTimeFormatted: dev.completedAt ? this.formatSimClock(dev.completedAt) : null,
      waitTime: Math.round(dev.waitTime || 0),
      serviceTime: Math.round(dev.serviceTime || 0),
      representativeId: dev.representativeId,
      isVisuallyRepresented: isVisual,
      eta,
    };
  }

  searchDevotees(query, limit = 10) {
    if (!query) return [];
    const q = String(query).trim().toUpperCase();
    const results = [];

    // Search active devotees first
    for (const [id, dev] of this.logicalDevotees.entries()) {
      if (id.includes(q)) {
        results.push(this.getDevoteeDetails(id));
        if (results.length >= limit) return results;
      }
    }

    // Search compact completed devotees
    for (const [id, dev] of this.completedDevoteesCompact.entries()) {
      if (id.includes(q)) {
        results.push(this.getDevoteeDetails(id));
        if (results.length >= limit) return results;
      }
    }

    return results;
  }

  setWarmupPeriod(seconds) {
    this.warmupPeriod = Math.max(0, Number(seconds) || 0);
  }

  /**
   * Section 5: Deterministic Continuous Hard Invariants Assertion
   * For every entrance:
   * currentActive <= entered
   * completed <= entered
   * active = entered - completed (or active + completed === entered)
   * queueOccupancy <= currentActive
   * securityCount <= currentActive
   * queueOccupancy + securityCount <= currentActive
   * 
   * If any invariant fails:
   * DO NOT show a congestion recommendation.
   * Log a development diagnostic identifying the inconsistent stream.
   */
  validateStreamInvariants(stream) {
    const st = this.entranceStats[stream];
    if (!st) return false;

    let valid = true;
    const errors = [];

    if (st.active > st.entered) {
      errors.push(`active (${st.active}) > entered (${st.entered})`);
      valid = false;
    }
    if (st.completed > st.entered) {
      errors.push(`completed (${st.completed}) > entered (${st.entered})`);
      valid = false;
    }
    if (st.active + st.completed !== st.entered) {
      errors.push(`active (${st.active}) + completed (${st.completed}) !== entered (${st.entered})`);
      valid = false;
    }
    if (st.queueOccupancy > st.active) {
      errors.push(`queueOccupancy (${st.queueOccupancy}) > active (${st.active})`);
      valid = false;
    }
    if ((st.securityCount || 0) > st.active) {
      errors.push(`securityCount (${st.securityCount}) > active (${st.active})`);
      valid = false;
    }
    if ((st.queueOccupancy + (st.securityCount || 0)) > st.active) {
      errors.push(`queueOccupancy + securityCount (${st.queueOccupancy + (st.securityCount || 0)}) > active (${st.active})`);
      valid = false;
    }

    if (!valid) {
      if (!this._lastLoggedViolation || this.simTime - this._lastLoggedViolation > 10) {
        this._lastLoggedViolation = this.simTime;
        console.warn(`[DevaSetu Invariant Violation on ${stream}]: ${errors.join('; ')}`);
      }
    }

    return valid;
  }

  /**
   * Advances simulation by delta seconds
   */
  update(delta, speedMultiplier = 1.0) {
    if (this.paths.length === 0) return;

    const dt = Math.min(0.1, delta) * speedMultiplier;
    this.simTime += dt;
    this.spawnTimer += dt;

    // A. Continuous logical crowd arrivals (unbounded by plannedCrowd)
    if (!this.arrivalsPaused) {
      const effectiveRate = this.getEffectiveArrivalRate(); // devotees per minute
      const arrivalsThisStep = (effectiveRate / 60) * dt;
      if (!this.streamAccumulatedArrivals) {
        this.streamAccumulatedArrivals = { north: 0, west: 0, east: 0 };
      }
      const norm = normalizeEntranceWeights(this.activeEntranceWeights || this.entranceInflow);
      let stepWholeArrivals = 0;
      for (const s of ['north', 'west', 'east']) {
        this.streamAccumulatedArrivals[s] = (this.streamAccumulatedArrivals[s] || 0) + (arrivalsThisStep * (norm.proportions[s] || 0));
        if (this.streamAccumulatedArrivals[s] >= 1) {
          const whole = Math.floor(this.streamAccumulatedArrivals[s]);
          this.streamAccumulatedArrivals[s] -= whole;
          this.entranceStats[s].entered += whole;
          this.entranceStats[s].active = Math.max(0, this.entranceStats[s].entered - (this.entranceStats[s].completed || 0));
          stepWholeArrivals += whole;
          for (let w = 0; w < whole; w++) {
            this.createAndRegisterLogicalDevotee(s);
          }
        }
      }
      if (stepWholeArrivals > 0) {
        this.totalLogicalEntered += stepWholeArrivals;
        this.logicalEnteredCount = this.totalLogicalEntered;
      }
    }

    // 1. Continuous Deterministic Spawning (Maintains progressive crowd up to targetVisualAgents)
    if (!this.arrivalsPaused && this.agents.length < this.targetVisualAgents) {
      const effectiveRate = this.getEffectiveArrivalRate();
      const spawnInterval = Math.max(0.15, Math.min(0.5, 60 / Math.max(1, effectiveRate)));
      if (this.agents.length === 0 || this.spawnTimer >= spawnInterval) {
        this.spawnTimer = 0;
        this.spawnNextAgent();
      }
    }

    // 2. Update Active Agents
    const activeAgents = [];

    // Group agents by path for accurate upstream/downstream queue queuing
    const pathAgents = {};
    const allActivePaths = (this.allPaths && this.allPaths.length > 0) ? this.allPaths : this.paths;
    allActivePaths.forEach((p) => {
      pathAgents[p.id] = [];
    });

    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      if (pathAgents[a.pathId]) {
        pathAgents[a.pathId].push(a);
      }
    }

    // Pre-partition convergence agents (forecourt, sanctum, dispersal) for efficient clearance checks
    const convergenceAgents = [];
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      if (a.state === AGENT_STATES.DARSHAN || a.state === AGENT_STATES.ENTERING || a.state === AGENT_STATES.EXITING) {
        convergenceAgents.push(a);
      }
    }

    // Process movement along each path
    for (const path of allActivePaths) {
      const agentsOnPath = pathAgents[path.id] || [];
      const waypoints = path.waypoints || [];

      // Sort agents on this path by distance along path (furthest ahead first)
      agentsOnPath.sort((a, b) => {
        if (a.targetWaypointIndex !== b.targetWaypointIndex) {
          return b.targetWaypointIndex - a.targetWaypointIndex;
        }
        const targetPt = waypoints[a.targetWaypointIndex] || { x: 0, z: 0 };
        return getDistance2D(a.position, targetPt) - getDistance2D(b.position, targetPt);
      });

      for (let i = 0; i < agentsOnPath.length; i++) {
        const agent = agentsOnPath[i];
        const aheadAgent = i > 0 ? agentsOnPath[i - 1] : null;

        const isFinished = this.updateAgent(agent, aheadAgent, path, dt, convergenceAgents, agentsOnPath, i);
        if (isFinished) {
          // Devotee safely exited at South Gopuram
          agent.completedAt = this.simTime;
          agent.state = AGENT_STATES.COMPLETED;
          agent.logicalState = AGENT_STATES.COMPLETED;
          this.totalCompletedCount++;
          const repRatio = Math.max(1, Math.round(this.getRepresentationRatio()));
          this.logicalCompletedCount += repRatio;

          // Complete authoritative logical devotee
          if (agent.logicalDevoteeId) {
            const dev = this.logicalDevotees.get(agent.logicalDevoteeId);
            if (dev) {
              this.completeLogicalDevotee(dev);
            }
          }

          if (agent.entryStream && this.entranceStats[agent.entryStream]) {
            const st = this.entranceStats[agent.entryStream];
            st.visualCompleted = (st.visualCompleted || 0) + 1;
            const spawned = Math.max(1, st.visualSpawned || 1);
            const ratio = Math.min(1.0, st.visualCompleted / spawned);
            st.completed = Math.min(st.entered, Math.max(st.completed || 0, Math.round(st.entered * ratio)));
            st.active = Math.max(0, st.entered - st.completed);
            this.syncStreamCompletedDevotees(agent.entryStream, st.completed);
          }

          // Keep bounded rolling buffer for stats
          this.recentCompletedAgents.push(agent);
          if (this.recentCompletedAgents.length > 200) {
            this.recentCompletedAgents.shift();
          }

          // Recycle visual agent ID back into the pool
          if (!this.agentIdPool.includes(agent.id)) {
            this.agentIdPool.push(agent.id);
          }
        } else {
          activeAgents.push(agent);
          // Record spatial footprint into density grid
          this.recordHeatmap(agent.position.x, agent.position.z, dt);
        }
      }
    }

    this.agents = activeAgents;

    // 3. Deterministic Runtime Entrance Stream Monitoring (Sections 2, 3, 4, 5, 6, 7, 8)
    if (this.queueRouter) {
      this.queueRouter.update(this.agents, this.scaleFactor);
      this.queueRouter.rebalancePreQueueDevotees(this.agents, this.paths, this.simTime);
      // NOTE: Cross-stream reallocation is strictly disabled so existing visitors are NEVER moved!
    }

    const streams = ['north', 'west', 'east'];
    const scale = Math.max(1, Math.round(this.scaleFactor));
    const isWarmupComplete = this.simTime >= this.warmupPeriod;

    for (const s of streams) {
      const st = this.entranceStats[s];
      const streamAgents = this.agents.filter((a) => a.entryStream === s);
      const activeVisual = streamAgents.filter((a) => a.state !== AGENT_STATES.COMPLETED);
      const queueVisual = activeVisual.filter((a) => a.state === AGENT_STATES.QUEUEING && (a.currentZone === 'queue' || a.currentTarget?.zone === 'queue'));
      const securityVisual = activeVisual.filter((a) => a.state === AGENT_STATES.SECURITY);

      // Actual physical queue capacity assigned to this entrance
      if (!st._customCapacity) {
        const qList = (this.queueRouter?.streamQueues?.[s] || []).map((id) => this.queueRouter.queueLoadStates[id]).filter(Boolean);
        let totalCap = 0;
        for (const qs of qList) {
          totalCap += qs.capacity;
        }
        if (totalCap === 0) {
          totalCap = s === 'north' ? 1200 : 1000;
        }
        st.queueCapacity = totalCap;
      }
      const totalCap = st.queueCapacity;

      // Section 2 & 4 & 5: SINGLE SOURCE OF TRUTH & HARD INVARIANTS
      // Devotee entered count is strictly advanced via continuous simulation arrivals (arrivalsThisStep)
      // or batch injection, preserving single source of truth without artificial multiplier jumps.
      if (st.entered < (st.completed || 0)) {
        st.entered = st.completed || 0;
      }

      st.completed = Math.min(st.entered, Math.max(0, st.completed || 0));

      // Hard Invariant: Active = Entered - Completed
      // currentActive can NEVER exceed entered!
      st.active = Math.max(0, st.entered - st.completed);

      // Section 5: Actual share derived strictly from simulation state
      const totalCampusEntered = (this.entranceStats.north.entered || 0) + (this.entranceStats.west.entered || 0) + (this.entranceStats.east.entered || 0);
      st.share = totalCampusEntered > 0 ? Math.round((st.entered / totalCampusEntered) * 1000) / 10 : 0;
      st.visualCount = activeVisual.length;
      st.visualQueueCount = queueVisual.length;

      // Section 6: Queue Occupancy & Security counts: Must strictly belong to active devotees of this stream
      const darshanVisual = activeVisual.filter((a) => a.state === AGENT_STATES.DARSHAN);
      if (!st._customOccupancy) {
        if (activeVisual.length > 0 && st.active > 0) {
          const queueFraction = queueVisual.length / activeVisual.length;
          const securityFraction = securityVisual.length / activeVisual.length;
          const darshanFraction = darshanVisual.length / activeVisual.length;
          st.queueOccupancy = Math.min(st.active, Math.round(st.active * queueFraction));
          st.securityCount = Math.min(st.active - st.queueOccupancy, Math.round(st.active * securityFraction));
          st.darshanCount = Math.min(st.active - st.queueOccupancy - st.securityCount, Math.round(st.active * darshanFraction));
        } else {
          st.queueOccupancy = 0;
          st.securityCount = 0;
          st.darshanCount = 0;
        }
      } else {
        st.queueOccupancy = Math.min(st.active, st.queueOccupancy || 0);
      }

      // Hard Invariant: queueOccupancy <= active
      st.queueOccupancy = Math.min(st.active, Math.max(0, st.queueOccupancy));
      st.waitingCount = st.queueOccupancy;
      st.availableCapacity = Math.max(0, totalCap - st.queueOccupancy);

      // Section 7: Utilization must be actual queue occupancy / actual physical queue capacity
      // At simulation startup or empty queue, utilization starts at 0%
      st.queueUtilization = totalCap > 0 ? Math.min(100, Math.round((st.queueOccupancy / totalCap) * 100)) : 0;

      // Flow speed and average wait time from active queue agents
      if (queueVisual.length > 0) {
        if (!st._customSpeed) {
          const sumSpeed = queueVisual.reduce((sum, a) => sum + (a.actualSpeed !== undefined ? a.actualSpeed : (a.speed || 1.2)), 0);
          st.avgSpeed = Math.round((sumSpeed / queueVisual.length) * 100) / 100;
        }
        if (!st._customWait) {
          const sumWait = queueVisual.reduce((sum, a) => sum + (a.waitTime || 0), 0);
          st.avgWaitMinutes = Math.round((sumWait / queueVisual.length / 60) * 10) / 10;
        }
      } else if (!st._customSpeed && st.queueOccupancy === 0) {
        st.avgSpeed = 1.2;
        st.avgWaitMinutes = 0;
      }

      st.movementSpeed = st.avgSpeed;
      const baseNominalSpeed = 1.2;
      st.queueProgress = Math.min(1.0, Math.max(0, Math.round((st.avgSpeed / baseNominalSpeed) * 100) / 100));
      st.utilization = st.queueUtilization;
      st.entranceId = s;

      // Section 12: Maintain rolling sample history (10-30s simulation time window)
      if (!this.streamHistory) {
        this.streamHistory = { north: [], west: [], east: [] };
      }
      if (!this.streamHistory[s]) {
        this.streamHistory[s] = [];
      }
      const lastSample = this.streamHistory[s][this.streamHistory[s].length - 1];
      if (!lastSample || (this.simTime - lastSample.time >= 1.0)) {
        this.streamHistory[s].push({
          time: this.simTime,
          occupancy: st.queueOccupancy,
          wait: st.avgWaitMinutes,
          entered: st.entered,
          completed: st.completed,
        });
        while (this.streamHistory[s].length > 30 || (this.streamHistory[s].length > 2 && (this.simTime - this.streamHistory[s][0].time) > 25)) {
          this.streamHistory[s].shift();
        }
      }

      // Section 12: Calculate trends from rolling window (enforce dtWin >= 5.0s to prevent rate spikes)
      const hist = this.streamHistory[s];
      let queueGrowthRate = 0;
      let waitGrowthRate = 0;
      let arrivalRate = 0;
      let serviceRate = 0;
      if (hist && hist.length >= 2) {
        const oldest = hist[0];
        const dtWin = this.simTime - oldest.time;
        if (dtWin >= 5.0) {
          queueGrowthRate = Math.round(((st.queueOccupancy - oldest.occupancy) / dtWin) * 60);
          waitGrowthRate = Math.round(((st.avgWaitMinutes - oldest.wait) / dtWin) * 60 * 10) / 10;
          arrivalRate = Math.max(0, Math.round(((st.entered - oldest.entered) / dtWin) * 60));
          serviceRate = Math.max(0, Math.round(((st.completed - oldest.completed) / dtWin) * 60));
          st.arrivalRate = arrivalRate;
          st.serviceRate = serviceRate;
          if (queueGrowthRate !== 0 || !st.queueGrowthRate) {
            st.queueGrowthRate = queueGrowthRate;
          }
          st.waitGrowthRate = waitGrowthRate;
        }
      } else if (!st.arrivalRate && this.simTime >= 5.0) {
        // Derive strictly from actual cumulative simulation entries over elapsed time
        arrivalRate = Math.max(0, Math.round((st.entered / this.simTime) * 60));
        serviceRate = Math.max(0, Math.round((st.completed / this.simTime) * 60));
        st.arrivalRate = arrivalRate;
        st.serviceRate = serviceRate;
      }

      // Section 5: Continuous Invariant Assertion
      this.validateStreamInvariants(s);

      // Section 9, 10, 11: Multi-Signal Flow & Congestion Evaluation
      // Require meaningful minimum population (>= 25% capacity and >= 100 people)
      const minEligibleOccupants = Math.max(100, Math.round(totalCap * 0.25));
      const hasMinimumPopulation = st.queueOccupancy >= minEligibleOccupants;
      const isHighUtilization = st.queueUtilization >= 80;
      const isExtremeUtilization = st.queueUtilization >= 90;
      const isSevereSpeedDrop = st.avgSpeed < 0.35 || st.queueProgress < 0.30;
      const isModerateSpeedDrop = st.avgSpeed < 0.70 || st.queueProgress < 0.60;
      const isQueueGrowingOrSaturated = (st.queueGrowthRate >= 0) || isExtremeUtilization;
      const hasContinuingArrivals = (st.arrivalRate > 5 && st.arrivalRate >= st.serviceRate) || ((this.activeEntranceWeights?.[s] || 0) > 0) || isQueueGrowingOrSaturated;
      const isCapacityDeficit = st.availableCapacity <= Math.max(50, totalCap * 0.20);
      const isQueueFailingToProgress = isSevereSpeedDrop; // Direct measurement of physical queue progression failure

      // Deterministic flow classification (FLOWING | SLOW | CONGESTED | BLOCKED)
      // Normal service dwell (short security screening or short Darshan) is expected service behavior.
      // Genuine BLOCKED state requires high occupancy, severe speed drop / queue progress failure,
      // persistent arrivals, and acute capacity exhaustion (no artificial 1-minute dwell requirement).
      const isTrulyBlocked = (
        isWarmupComplete &&
        st.active > 0 &&
        hasMinimumPopulation &&
        isHighUtilization &&
        isQueueFailingToProgress &&
        isQueueGrowingOrSaturated &&
        hasContinuingArrivals &&
        isCapacityDeficit
      );

      const isTrulyCongested = (
        isWarmupComplete &&
        st.active > 0 &&
        hasMinimumPopulation &&
        st.queueUtilization >= 75 &&
        (isModerateSpeedDrop || st.queueGrowthRate > 0) &&
        (isModerateSpeedDrop || st.queueOccupancy >= totalCap * 0.75)
      );

      const isSlowFlow = (
        st.active > 0 &&
        !isTrulyBlocked &&
        !isTrulyCongested &&
        (isModerateSpeedDrop || (st.queueUtilization >= 70 && st.queueGrowthRate > 0))
      );

      if (isTrulyBlocked) {
        st.congestionState = 'BLOCKED';
        st.status = 'CONGESTED';
        st.blockedDuration = (st.blockedDuration || 0) + dt;
        st.congestionDuration = (st.congestionDuration || 0) + dt;
      } else if (isTrulyCongested) {
        st.congestionState = 'CONGESTED';
        st.status = 'CONGESTED';
        st.blockedDuration = 0;
        st.congestionDuration = (st.congestionDuration || 0) + dt;
      } else if (isSlowFlow) {
        st.congestionState = 'SLOW';
        st.status = 'BUILDING';
        st.blockedDuration = 0;
        st.congestionDuration = 0;
      } else {
        st.congestionState = 'FLOWING';
        st.status = 'NORMAL';
        st.blockedDuration = 0;
        st.congestionDuration = 0;
      }

      // Alert state lifecycle mapping (if not currently user handled)
      if (st.alertState !== 'USER_ACCEPTED' && st.alertState !== 'USER_DECLINED' && st.alertState !== 'MONITORING') {
        if (st.congestionState === 'BLOCKED') {
          st.alertState = 'BLOCKED';
        } else if (st.congestionState === 'CONGESTED') {
          st.alertState = 'CONGESTED';
        } else if (st.alertState === 'RECOVERED') {
          // Preserved until new congestion develops
        } else if (!isWarmupComplete) {
          st.alertState = 'OBSERVING';
        } else {
          st.alertState = 'NORMAL';
        }
      }
    }

    // Update Entrance Share %
    const totEntered = (this.entranceStats.north.entered + this.entranceStats.west.entered + this.entranceStats.east.entered) || 1;
    for (const s of streams) {
      this.entranceStats[s].share = Math.round((this.entranceStats[s].entered / totEntered) * 1000) / 10;
    }

    // Sections 9, 10, 11, 14: Evaluate REROUTE CANDIDATE based strictly on actual BLOCKED queue conditions
    const minPersistence = this.minCongestionDuration || 8.0;
    const congestedCandidates = streams
      .map((s) => this.entranceStats[s])
      .filter((st) => 
        isWarmupComplete &&
        st.congestionState === 'BLOCKED' &&
        st.queueUtilization >= 80 &&
        st.blockedDuration >= minPersistence &&
        st.queueOccupancy >= Math.max(100, Math.round(st.queueCapacity * 0.25)) &&
        this.validateStreamInvariants(st.stream)
      );

    let mostCongested = null;
    let healthiestTarget = null;
    let allQueuesOverloaded = false;

    if (congestedCandidates.length > 0) {
      congestedCandidates.sort((a, b) => (b.queueUtilization + b.queueGrowthRate * 0.1) - (a.queueUtilization + a.queueGrowthRate * 0.1));
      mostCongested = congestedCandidates[0];

      // Section 15: Validate Alternative Entrance using runtime physical metrics
      const alternateCandidates = streams
        .filter((s) => s !== mostCongested.stream)
        .map((s) => this.entranceStats[s])
        .filter((other) => 
          other.queueUtilization < 60 &&
          other.availableCapacity >= 200 &&
          (mostCongested.queueUtilization - other.queueUtilization) >= 20 &&
          other.avgWaitMinutes <= mostCongested.avgWaitMinutes &&
          (other.congestionState === 'FLOWING' || other.avgSpeed >= 0.65) &&
          other.queueGrowthRate < 100 &&
          this.validateStreamInvariants(other.stream)
        );

      if (alternateCandidates.length === 0) {
        // Section 15: NO ALTERNATIVE = NO REROUTING. Show ALL ENTRANCE QUEUES UNDER HIGH LOAD.
        allQueuesOverloaded = true;
      } else {
        alternateCandidates.sort((a, b) => a.queueUtilization - b.queueUtilization);
        healthiestTarget = alternateCandidates[0];
        mostCongested.status = 'REROUTE_CANDIDATE';

        // Calculate deterministic conservative redirection percentage (10% to 25%)
        const utilDiff = Math.max(0, mostCongested.queueUtilization - healthiestTarget.queueUtilization);
        const excessArrivalRatio = mostCongested.arrivalRate > 0 && mostCongested.serviceRate > 0
          ? Math.max(0, (mostCongested.arrivalRate - mostCongested.serviceRate) / mostCongested.arrivalRate)
          : 0.15;
        const calculatedDivertPercent = Math.min(25, Math.max(10, Math.round(12 + (utilDiff / 100) * 8 + excessArrivalRatio * 8)));
        this.lastCalculatedDivertPercent = calculatedDivertPercent;

        // Trigger operator recommendation modal if outside cooldown
        const isDismissCooldown = Boolean(
          this.diversionDismissedTime &&
          (this.simTime - this.diversionDismissedTime < 30) &&
          (mostCongested.queueUtilization < (this.diversionDismissedUtil + 8))
        );

        if (!this.diversionApproved && !this.diversionPromptPending && !isDismissCooldown) {
          this.diversionPromptPending = true;
          mostCongested.alertState = 'REDIRECTION_RECOMMENDED';
          if (this.onDiversionPrompt) {
            this.onDiversionPrompt({
              congestedStream: mostCongested.stream,
              targetStream: healthiestTarget.stream,
              congestedUtil: mostCongested.queueUtilization,
              targetUtil: healthiestTarget.queueUtilization,
              waitingCount: mostCongested.waitingCount,
              targetWaitingCount: healthiestTarget.waitingCount,
              congestedWaitTime: mostCongested.avgWaitMinutes,
              queueGrowthRate: mostCongested.queueGrowthRate,
              arrivalRate: mostCongested.arrivalRate,
              serviceRate: mostCongested.serviceRate,
              movementSpeed: mostCongested.avgSpeed < 0.35 ? 'Very Slow' : mostCongested.avgSpeed < 0.70 ? 'Slow' : 'Normal',
              targetMovementSpeed: healthiestTarget.avgSpeed < 0.35 ? 'Very Slow' : healthiestTarget.avgSpeed < 0.70 ? 'Slow' : 'Normal',
              blockedDuration: Math.round(mostCongested.blockedDuration || minPersistence),
              divertPercent: calculatedDivertPercent,
              suggestedAction: `Redirect a controlled portion (${calculatedDivertPercent}%) of future ${mostCongested.name} arrivals to ${healthiestTarget.name}.`,
              message: `${mostCongested.name} queue is currently blocked (utilization: ${mostCongested.queueUtilization}%, movement: ${mostCongested.avgSpeed < 0.35 ? 'Very Slow' : 'Slow'}, wait: ${mostCongested.avgWaitMinutes} min, growth: +${mostCongested.queueGrowthRate}/min). ${healthiestTarget.name} currently has available flow capacity (${healthiestTarget.queueUtilization}% utilization, ${healthiestTarget.availableCapacity} available spots). Redirect a controlled portion (${calculatedDivertPercent}%) of future ${mostCongested.name} arrivals to ${healthiestTarget.name}?`,
            });
          }
        }
      }
    }

    // Reversible Rerouting check: If congested stream recovers (< 60%), revert towards base distribution
    if (this.diversionApproved && this.rerouteAcceptedTime !== null && this.rerouteAcceptedTime !== undefined && (this.simTime - this.rerouteAcceptedTime > 15)) {
      const cKey = this.lastRerouteCongested || 'north';
      if (this.entranceStats[cKey]?.queueUtilization < 60 && (this.entranceStats[cKey]?.congestionState === 'FLOWING' || this.entranceStats[cKey]?.avgSpeed >= 0.70)) {
        this.revertRerouting();
      }
    }

    // Update AI Navigation State for indicators and live telemetry
    this.aiNavigationState = {
      active: this.diversionApproved,
      pendingApproval: mostCongested?.status === 'REROUTE_CANDIDATE' && !this.diversionApproved,
      congestedStream: mostCongested?.status === 'REROUTE_CANDIDATE' ? mostCongested.stream : null,
      targetStream: healthiestTarget ? healthiestTarget.stream : null,
      allQueuesOverloaded,
      disparity: mostCongested && healthiestTarget ? Math.max(0, mostCongested.queueUtilization - healthiestTarget.queueUtilization) / 100 : 0,
      divertedCount: this.diversionApproved ? Math.round((this.totalLogicalEntered || 0) * 0.20) : 0,
      message: allQueuesOverloaded
        ? 'ALL ENTRANCE QUEUES UNDER HIGH LOAD: There is currently no suitable alternate entrance.'
        : this.diversionApproved
        ? `Active: Diverting future arrivals from ${(this.lastRerouteCongested || 'NORTH').toUpperCase()} → ${(this.lastRerouteTarget || 'WEST').toUpperCase()}`
        : mostCongested?.status === 'REROUTE_CANDIDATE'
        ? `Congestion detected at ${mostCongested.name} (${mostCongested.queueUtilization}%) — Awaiting Operator Approval`
        : 'All entrance queue lines flowing normally',
    };

    // 4. Update Queue Statistics & Bottlenecks
    const metricsCurrent = this.getMetrics();
    if (metricsCurrent.visitorsInQueue > this.peakQueueCount) {
      this.peakQueueCount = metricsCurrent.visitorsInQueue;
    }

    // 4. Sample Time-Series Data for D3 Visualizations every 1.5 simulated seconds
    if (this.simTime - this.lastHistoryRecordTime >= 1.5) {
      this.lastHistoryRecordTime = this.simTime;
      const metrics = this.getMetrics();
      this.metricsHistory.push({
        time: Math.round(this.simTime),
        formattedTime: metrics.formattedTime,
        avgWaitMinutes: metrics.avgWaitMinutes,
        throughputPerHour: metrics.throughputPerHour,
        visitorsInQueue: metrics.visitorsInQueue,
        visitorsCompleted: metrics.visitorsCompleted,
      });

      // Keep last 60 records for smooth responsive charts
      if (this.metricsHistory.length > 60) {
        this.metricsHistory.shift();
      }
    }
  }

  /**
   * Seeds progressive devotee wave so the temple system is immediately populated (when explicitly invoked)
   */
  seedInitialAgents() {
    if (!this.paths || this.paths.length === 0) return;

    for (const path of this.paths) {
      const waypoints = path.waypoints || [];
      if (waypoints.length < 2) continue;

      const stream = (path.stream || 'north').toLowerCase();

      // Seed devotees across the system for offline tests with attached stream metadata
      for (let wpIdx = 1; wpIdx < waypoints.length - 1; wpIdx++) {
        if (this.agents.length >= this.targetVisualAgents) break;

        const wp = waypoints[wpIdx];
        const nextWp = waypoints[wpIdx + 1];
        const dist = getDistance2D(wp, nextWp);

        const subSteps = dist > 14 ? Math.min(4, Math.floor(dist / 9)) : 1;

        for (let s = 0; s < subSteps; s++) {
          if (this.agents.length >= this.targetVisualAgents) break;

          const t = s / subSteps;
          const posX = wp.x + (nextWp.x - wp.x) * t;
          const posZ = wp.z + (nextWp.z - wp.z) * t;

          const agentId = this.agentIdPool.length > 0 ? this.agentIdPool.pop() : ++this.nextAgentId;
          const agent = createAgent(agentId, path, 0, this.options);

          agent.position.x = posX;
          agent.position.z = posZ;
          agent.targetWaypointIndex = wpIdx + 1;
          agent.currentSpeed = agent.baseSpeed;
          agent.actualSpeed = agent.baseSpeed;
          agent.entryStream = stream;
          agent.entranceId = stream;
          agent.streamId = stream;
          agent.stream = stream;
          agent.visitorRepresentativeId = `REP-${String(agentId).padStart(4, '0')}`;
          agent.currentZone = wp.zone || 'entrance';
          agent.logicalState = agent.state;
          agent.representedDevotees = this.getRepresentationRatio();

          // High-performance logical devotee individual identity linking
          const logicalDevotee = this.createAndRegisterLogicalDevotee(stream, path.id);
          agent.logicalDevoteeId = logicalDevotee.id;
          logicalDevotee.representativeId = agent.visitorRepresentativeId;
          logicalDevotee.zone = agent.currentZone;
          logicalDevotee.logicalState = agent.state;

          const dx = nextWp.x - wp.x;
          const dz = nextWp.z - wp.z;
          const angle = Math.atan2(dx, dz);
          agent.targetHeading = angle;
          agent.rotationY = angle;

          if (wp.zone === 'security') agent.state = AGENT_STATES.SECURITY;
          else if (wp.zone === 'queue') agent.state = AGENT_STATES.QUEUEING;
          else if (wp.zone === 'darshan') agent.state = AGENT_STATES.DARSHAN;
          else if (wp.zone === 'holding') agent.state = AGENT_STATES.WAITING;
          else if (wp.zone === 'exit' || wp.zone === 'dispersal') agent.state = AGENT_STATES.EXITING;
          else agent.state = AGENT_STATES.ENTERING;
          agent.logicalState = agent.state;
          logicalDevotee.logicalState = agent.state;

          this.agents.push(agent);
          this.totalSpawnedCount++;

          const batchSize = Math.max(1, Math.round(this.scaleFactor));
          if (this.entranceStats[stream]) {
            this.entranceStats[stream].visualSpawned = (this.entranceStats[stream].visualSpawned || 0) + 1;
            this.entranceStats[stream].entered += batchSize;
          }
          this.totalLogicalEntered += batchSize;
        }
      }
    }
    this.logicalEnteredCount = Math.max(this.totalLogicalEntered, this.agents.length * this.scaleFactor);
  }

  /**
   * Spawns next devotee according to arrival demand and normalized entrance weights (PART 1, 2, 3, 4)
   */
  /**
   * Selects next spawn stream proportionally matching active logical crowd
   * Distributes bounded visual representatives across entrances to accurately reflect real crowd load
   */
  selectNextSpawnStream() {
    const streams = ['north', 'west', 'east'];
    const activeNorth = Math.max(0, this.entranceStats.north.active || 0);
    const activeWest = Math.max(0, this.entranceStats.west.active || 0);
    const activeEast = Math.max(0, this.entranceStats.east.active || 0);
    const totalActive = activeNorth + activeWest + activeEast;

    const normInflow = normalizeEntranceWeights(this.activeEntranceWeights || this.entranceInflow);
    const targetProportions = normInflow.proportions;

    // Current active visual count per entrance
    const visualCounts = {
      north: 0,
      west: 0,
      east: 0,
    };
    for (const a of this.agents) {
      if (a.state !== AGENT_STATES.COMPLETED) {
        const s = (a.entryStream || a.streamId || a.stream || 'north').toLowerCase();
        if (visualCounts[s] !== undefined) {
          visualCounts[s]++;
        }
      }
    }

    const targetPoolSize = Math.max(1, Math.min(this.targetVisualAgents, this.agents.length + 1));

    // Calculate positive deficit for each stream (desired - actual)
    let totalPositiveDeficit = 0;
    const positiveDeficits = {};
    for (const s of streams) {
      const targetCount = targetPoolSize * (targetProportions[s] || 0);
      const def = Math.max(0, targetCount - visualCounts[s]);
      positiveDeficits[s] = def;
      totalPositiveDeficit += def;
    }

    // Proportional deficit selection: streams with higher deficit receive more spawns
    if (totalPositiveDeficit > 0) {
      const r = Math.random() * totalPositiveDeficit;
      let cum = 0;
      for (const s of streams) {
        cum += positiveDeficits[s];
        if (r <= cum) {
          return s;
        }
      }
      return streams[0];
    }

    // Fallback: pick according to target proportions
    const rand = Math.random();
    if (rand < (targetProportions.north || 0.34)) return 'north';
    if (rand < (targetProportions.north || 0.34) + (targetProportions.west || 0.33)) return 'west';
    return 'east';
  }

  /**
   * Spawns next devotee according to arrival demand and normalized entrance weights
   */
  spawnNextAgent() {
    if (this.agents.length >= this.targetVisualAgents) return null;

    const stream = this.selectNextSpawnStream();

    // Check if dynamic bridge redirection is active and approved by manager
    if (this.diversionApproved && this.lastRerouteCongested) {
      const congested = this.lastRerouteCongested;
      const target = this.lastRerouteTarget || 'west';
      const diversionPath = (this.diversionPaths || []).find(
        (p) => p.stream === congested && (p.targetStream === target || !p.targetStream)
      );

      if (diversionPath && diversionPath.waypoints && diversionPath.waypoints.length > 0) {
        // Active visual agents currently crossing the bridge
        const bridgeAgents = this.agents.filter(
          (a) => a.pathId === diversionPath.id && (a.targetWaypointIndex || 0) < 13
        );
        const divertPercent = this.lastDivertPercent || 20;

        // Redirect arrival if this is the congested stream and bridge has capacity, or ensure visible bridge traffic
        const shouldDivert = (stream === congested && (bridgeAgents.length < 4 || Math.random() < (divertPercent / 100)))
          || (stream === target && bridgeAgents.length < 3)
          || (bridgeAgents.length < 2);

        if (shouldDivert) {
          const startPt = diversionPath.waypoints[0];
          const entranceOccupied = this.agents.some(
            (a) => getDistance2D(a.position, startPt) < this.options.MIN_QUEUE_SPACING
          );

          if (!entranceOccupied) {
            const agentId = this.agentIdPool.length > 0 ? this.agentIdPool.pop() : ++this.nextAgentId;
            const newAgent = createAgent(agentId, diversionPath, this.simTime, this.options);
            newAgent.isDiverted = true;
            newAgent.entryStream = congested;
            newAgent.entranceId = congested;
            newAgent.streamId = target;
            newAgent.stream = target;
            newAgent.targetStream = target;
            newAgent.pathId = diversionPath.id;
            newAgent.visitorRepresentativeId = `REP-${String(agentId).padStart(4, '0')}`;
            newAgent.currentZone = 'entrance';
            newAgent.logicalState = LOGICAL_DEVOTEE_STATES.BRIDGE_TRANSITION;
            newAgent.representedDevotees = this.getRepresentationRatio();
            newAgent.currentSpeed = newAgent.baseSpeed;
            newAgent.actualSpeed = newAgent.baseSpeed;

            // Register logical devotee under congested origin stream tagged as diverted to target
            const logicalDevotee = this.createAndRegisterLogicalDevotee(congested, diversionPath.id);
            logicalDevotee.isDiverted = true;
            logicalDevotee.divertedTo = target;
            logicalDevotee.pathId = diversionPath.id;
            logicalDevotee.representativeId = newAgent.visitorRepresentativeId;
            logicalDevotee.logicalState = LOGICAL_DEVOTEE_STATES.BRIDGE_TRANSITION;
            logicalDevotee.zone = 'bridge';
            newAgent.logicalDevoteeId = logicalDevotee.id;

            this.agents.push(newAgent);
            this.totalSpawnedCount++;
            if (this.entranceStats[congested]) {
              this.entranceStats[congested].visualSpawned = (this.entranceStats[congested].visualSpawned || 0) + 1;
              this.entranceStats[congested].divertedOutflow = (this.entranceStats[congested].divertedOutflow || 0) + 1;
            }
            if (this.entranceStats[target]) {
              this.entranceStats[target].divertedInflow = (this.entranceStats[target].divertedInflow || 0) + 1;
            }

            if (this.currentArrivalRate === 0 || this.arrivalsPaused) {
              const batchSize = Math.max(1, Math.round(this.getRepresentationRatio()));
              if (this.entranceStats[congested]) {
                this.entranceStats[congested].entered += batchSize;
              }
              this.totalLogicalEntered += batchSize;
              this.logicalEnteredCount = this.totalLogicalEntered;
            }

            return newAgent;
          }
        }
      }
    }

    let candidatePaths = this.paths.filter((p) => p.stream === stream && !p.isDiversion);
    if (candidatePaths.length === 0) {
      candidatePaths = this.paths.filter((p) => !p.isDiversion);
    }
    if (candidatePaths.length === 0) {
      candidatePaths = this.paths;
    }
    if (candidatePaths.length === 0) return null;

    // Pick least loaded lane among candidate paths for smooth spreading
    let bestPath = candidatePaths[0];
    if (this.queueRouter) {
      const opt = this.queueRouter.selectOptimalPath(stream, this.paths, false, false);
      if (opt && !opt.isDiversion && (opt.stream === stream || candidatePaths.includes(opt))) {
        bestPath = opt;
      }
    }

    const stStream = this.entranceStats[stream];
    const targetQueueVisual = stStream?.queueOccupancy ? Math.round(stStream.queueOccupancy / this.scaleFactor) : 0;
    const needQueueRep = (stStream?.visualQueueCount || 0) < targetQueueVisual;
    const queueWpIndex = needQueueRep ? bestPath.waypoints.findIndex((wp) => wp.zone === 'queue') : -1;

    let spawnWpIndex = 0;
    if (queueWpIndex !== -1 && bestPath.waypoints[queueWpIndex]) {
      const qWp = bestPath.waypoints[queueWpIndex];
      const qOccupied = this.agents.some((a) => getDistance2D(a.position, qWp) < this.options.MIN_QUEUE_SPACING);
      if (!qOccupied) {
        spawnWpIndex = queueWpIndex;
      }
    }

    const startPt = bestPath.waypoints[spawnWpIndex];
    if (!startPt) return null;

    // Hold spawn if start point is occupied by an agent
    const entranceOccupied = this.agents.some(
      (a) => getDistance2D(a.position, startPt) < this.options.MIN_QUEUE_SPACING
    );

    if (!entranceOccupied) {
      const agentId = this.agentIdPool.length > 0 ? this.agentIdPool.pop() : ++this.nextAgentId;
      const newAgent = createAgent(agentId, bestPath, this.simTime, this.options);
      // Section 2: Permanent entrance identity & deterministic representative metadata
      newAgent.entryStream = stream;
      newAgent.entranceId = stream;
      newAgent.streamId = stream;
      newAgent.stream = stream;
      newAgent.pathId = bestPath.id;
      newAgent.visitorRepresentativeId = `REP-${String(agentId).padStart(4, '0')}`;
      newAgent.targetWaypointIndex = spawnWpIndex + 1;
      newAgent.position.x = startPt.x;
      newAgent.position.z = startPt.z;
      newAgent.currentZone = startPt.zone || (spawnWpIndex > 0 ? 'queue' : 'entrance');
      newAgent.logicalState = startPt.zone === 'queue' ? AGENT_STATES.QUEUEING : AGENT_STATES.ENTERING;
      newAgent.state = newAgent.logicalState;
      newAgent.representedDevotees = this.getRepresentationRatio();
      newAgent.currentSpeed = newAgent.baseSpeed;
      newAgent.actualSpeed = newAgent.baseSpeed;

      // Find an active unrepresented logical devotee or create one
      let logicalDevotee = null;
      const streamDevotees = this.activeLogicalDevoteesByStream[stream] || [];
      for (let i = 0; i < streamDevotees.length; i++) {
        if (!streamDevotees[i].representativeId && streamDevotees[i].status === 'active') {
          logicalDevotee = streamDevotees[i];
          break;
        }
      }
      if (!logicalDevotee) {
        logicalDevotee = this.createAndRegisterLogicalDevotee(stream, bestPath.id);
      }
      newAgent.logicalDevoteeId = logicalDevotee.id;
      logicalDevotee.representativeId = newAgent.visitorRepresentativeId;
      logicalDevotee.pathId = bestPath.id;

      this.agents.push(newAgent);
      this.totalSpawnedCount++;
      if (this.entranceStats[stream]) {
        this.entranceStats[stream].visualSpawned = (this.entranceStats[stream].visualSpawned || 0) + 1;
      }

      // Track actual entrance counts deterministically
      if (this.currentArrivalRate === 0 || this.arrivalsPaused) {
        const batchSize = Math.max(1, Math.round(this.getRepresentationRatio()));
        if (this.entranceStats[stream]) {
          this.entranceStats[stream].entered += batchSize;
        }
        this.totalLogicalEntered += batchSize;
        this.logicalEnteredCount = this.totalLogicalEntered;
      }

      return newAgent;
    }
    return null;
  }

  /**
   * Updates an individual devotee: spacing, corner deceleration, rotation, service dwell, and movement
   */
  updateAgent(agent, aheadAgent, path, dt, convergenceAgents = [], agentsOnPath = [], agentIndex = 0) {
    const waypoints = path.waypoints || [];
    if (agent.targetWaypointIndex >= waypoints.length) {
      agent.currentSpeed = 0;
      return true; // Finished route at South Exit Gopuram
    }

    const currentTarget = waypoints[agent.targetWaypointIndex];
    const distToTarget = getDistance2D(agent.position, currentTarget);

    // 1. Spacing check behind ahead agent on the same path
    let speed = agent.baseSpeed;
    let mustHold = false;

    if (aheadAgent) {
      const distToAhead = getDistance2D(agent.position, aheadAgent.position);
      if (distToAhead < this.options.MIN_QUEUE_SPACING) {
        mustHold = true;
      } else if (distToAhead < this.options.DECELERATION_DISTANCE) {
        // Smooth linear deceleration approaching devotee ahead
        const t =
          (distToAhead - this.options.MIN_QUEUE_SPACING) /
          (this.options.DECELERATION_DISTANCE - this.options.MIN_QUEUE_SPACING);
        speed = agent.baseSpeed * Math.max(0.12, t);
      }
    }

    // 2. Inter-agent clearance at convergence zones & merge areas (Point 13 & 14)
    if (
      !mustHold &&
      (currentTarget.zone === 'approach' || currentTarget.zone === 'darshan')
    ) {
      const candidates = convergenceAgents.length > 0 ? convergenceAgents : this.agents;
      for (let j = 0; j < candidates.length; j++) {
        const other = candidates[j];
        if (other.id === agent.id) continue;
        // Verify same vertical level before checking horizontal clearance (elevated bridge Y=2.6 vs ground Y=0)
        if (Math.abs((agent.position.y || 0) - (other.position.y || 0)) >= 1.2) continue;
        const d = getDistance2D(agent.position, other.position);
        if (d < 0.85) {
          // Check if other devotee is directly in front along movement heading
          const dx = other.position.x - agent.position.x;
          const dz = other.position.z - agent.position.z;
          const headingX = Math.sin(agent.targetHeading || 0);
          const headingZ = Math.cos(agent.targetHeading || 0);
          const dot = dx * headingX + dz * headingZ;
          if (dot > 0.25) {
            mustHold = true;
            break;
          }
        }
      }
    }

    // 3. Service Area Handling (Security Screening & Darshan Sanctum)
    // Always advance total journey time for accurate end-to-end journey telemetry
    agent.totalJourneyTime = (agent.totalJourneyTime || 0) + dt;

    if (currentTarget.zone === 'security') {
      const channelId = currentTarget.componentId || `${path.stream || 'stream'}-sec-${path.id}`;
      if (!this.securityChannels) {
        this.securityChannels = {};
      }

      if (distToTarget < 2.0 && distToTarget >= 0.85) {
        agent.state = AGENT_STATES.SECURITY;
        agent.logicalState = 'security_approach';
      } else if (distToTarget < 0.85) {
        // Multi-channel parallel screening: each security channel operates independently
        const activeOccupant = this.securityChannels[channelId];
        const isOccupiedByOther = Boolean(
          activeOccupant &&
          activeOccupant.agentId !== agent.id &&
          activeOccupant.releaseTime > this.simTime
        );

        if (isOccupiedByOther) {
          // This specific channel is currently screening another devotee; queue behind them
          mustHold = true;
          agent.waitTime += dt; // Wait time behind occupant
          agent.state = AGENT_STATES.SECURITY;
          agent.logicalState = 'security_approach';
        } else {
          // Channel is available: claim channel for this devotee's security screening
          if (!activeOccupant || activeOccupant.agentId !== agent.id) {
            const dwellDuration = agent.securityDwellTime || this.securityDwellSeconds || 0.45;
            this.securityChannels[channelId] = {
              agentId: agent.id,
              channelId,
              occupantRep: agent.visitorRepresentativeId,
              startTime: this.simTime,
              releaseTime: this.simTime + dwellDuration,
              duration: dwellDuration,
            };
            agent.serviceTimer = 0;
          }

          agent.state = AGENT_STATES.SECURITY;
          agent.logicalState = 'security_check';
          agent.serviceTimer += dt;
          agent.serviceTime = (agent.serviceTime || 0) + dt;
          this.cumulativeWaitByZone.security += dt;

          const secDwell = (this.securityChannels[channelId] && this.securityChannels[channelId].duration) || agent.securityDwellTime || this.securityDwellSeconds || 0.45;
          if (agent.serviceTimer < secDwell) {
            mustHold = true;
          } else {
            // Security screening completed; mark completed and resume movement to queue
            agent.logicalState = 'security_complete';
            mustHold = false;
            if (this.securityChannels[channelId]?.agentId === agent.id) {
              this.securityChannels[channelId].releaseTime = this.simTime;
              this.securityChannels[channelId].completed = true;
            }
          }
        }
      }
    } else if (currentTarget.zone === 'darshan') {
      if (distToTarget < 2.5 && distToTarget >= 1.1) {
        agent.logicalState = 'darshan_approach';
      } else if (distToTarget < 1.1) {
        agent.state = AGENT_STATES.DARSHAN;
        agent.logicalState = 'darshan_dwell';
        agent.serviceTimer += dt;
        agent.serviceTime = (agent.serviceTime || 0) + dt;
        this.cumulativeWaitByZone.darshan += dt;

        // Maintain orientation facing Darshan sanctum viewing point
        if (currentTarget.headingAngle !== undefined) {
          agent.targetHeading = currentTarget.headingAngle;
        }

        const darshanDwell = agent.darshanDwellTime || this.darshanDwellSeconds || 0.60;
        if (agent.serviceTimer < darshanDwell) {
          mustHold = true;
        } else {
          agent.logicalState = 'darshan_complete';
          mustHold = false;
        }
      }
    }

    // 5. Corner Turn Deceleration & Look-Ahead Orientation (Point 7)
    if (distToTarget < this.options.DECELERATION_DISTANCE && agent.targetWaypointIndex < waypoints.length - 1) {
      const nextWp = waypoints[agent.targetWaypointIndex + 1];
      const currDx = currentTarget.x - agent.position.x;
      const currDz = currentTarget.z - agent.position.z;
      const nextDx = nextWp.x - currentTarget.x;
      const nextDz = nextWp.z - currentTarget.z;
      const a1 = Math.atan2(currDx, currDz);
      const a2 = Math.atan2(nextDx, nextDz);
      let diff = Math.abs((a2 - a1) % (Math.PI * 2));
      if (diff > Math.PI) diff = Math.PI * 2 - diff;

      if (diff > 0.35) {
        // Slow down smoothly approaching corner (serpentine turns, switchbacks, radial approach)
        const cornerSpeedFactor = Math.max(0.55, 1.0 - (diff / Math.PI) * 0.45);
        speed = Math.min(speed, agent.baseSpeed * cornerSpeedFactor);
      }
    }

    // 6. Smooth Velocity Interpolation (Acceleration / Deceleration - Point 6)
    const targetSpeed = mustHold ? 0 : speed;
    const accelRate = targetSpeed > (agent.actualSpeed ?? 0) ? 3.6 : 5.8;
    agent.actualSpeed = (agent.actualSpeed ?? 0) + (targetSpeed - (agent.actualSpeed ?? 0)) * (1 - Math.exp(-dt * accelRate));
    agent.currentSpeed = agent.actualSpeed;
    agent.stalled = agent.actualSpeed < 0.05;

    if (mustHold) {
      if (currentTarget.zone === 'queue') {
        agent.waitTime += dt;
        agent.state = AGENT_STATES.QUEUEING;
        agent.logicalState = AGENT_STATES.QUEUEING;
        this.cumulativeWaitByZone.queue += dt;
      } else if (currentTarget.zone === 'holding') {
        agent.waitTime += dt;
        agent.state = AGENT_STATES.WAITING;
        agent.logicalState = AGENT_STATES.WAITING;
      } else if (currentTarget.zone === 'approach' || currentTarget.zone === 'entrance') {
        agent.waitTime += dt;
        agent.state = AGENT_STATES.ENTERING;
        agent.logicalState = AGENT_STATES.ENTERING;
      }
    } else {
      // Update state based on current zone if not in specialized service states
      if (agent.isDiverted && currentTarget.zone === 'approach') {
        agent.state = AGENT_STATES.ENTERING;
        agent.logicalState = LOGICAL_DEVOTEE_STATES.BRIDGE_TRANSITION;
      } else if (currentTarget.zone === 'approach' || currentTarget.zone === 'entrance') {
        agent.state = AGENT_STATES.ENTERING;
        agent.logicalState = AGENT_STATES.ENTERING;
      } else if (currentTarget.zone === 'queue') {
        agent.state = AGENT_STATES.QUEUEING;
        agent.logicalState = AGENT_STATES.QUEUEING;
      } else if (currentTarget.zone === 'holding') {
        agent.state = AGENT_STATES.WAITING;
        agent.logicalState = AGENT_STATES.WAITING;
      } else if (currentTarget.zone === 'exit' || currentTarget.zone === 'dispersal') {
        agent.state = AGENT_STATES.EXITING;
        agent.logicalState = AGENT_STATES.EXITING;
        speed = agent.baseSpeed * 1.25;
      }
    }

    agent.currentZone = currentTarget.zone || 'entrance';
    if (!agent.logicalState) {
      agent.logicalState = agent.state;
    }
    agent.representedDevotees = this.getRepresentationRatio();

    // Synchronize authoritative state to linked logical devotee
    if (agent.logicalDevoteeId) {
      const dev = this.logicalDevotees.get(agent.logicalDevoteeId);
      if (dev && dev.status === 'active') {
        dev.zone = agent.currentZone;
        dev.waitTime = agent.waitTime || 0;
        dev.serviceTime = agent.serviceTime || 0;

        if (agent.logicalState === LOGICAL_DEVOTEE_STATES.BRIDGE_TRANSITION) {
          dev.zone = 'bridge';
          dev.logicalState = LOGICAL_DEVOTEE_STATES.BRIDGE_TRANSITION;
        } else if (agent.state === AGENT_STATES.SECURITY) {
          dev.zone = 'security';
          dev.logicalState = agent.logicalState === 'security_check' ? LOGICAL_DEVOTEE_STATES.SECURITY_CHECK : LOGICAL_DEVOTEE_STATES.SECURITY_QUEUE;
          if (!dev.securityStartedAt && agent.logicalState === 'security_check') {
            dev.securityStartedAt = this.simTime;
          }
          if (agent.logicalState === 'security_complete') {
            dev.securityCompletedAt = this.simTime;
          }
        } else if (agent.state === AGENT_STATES.DARSHAN) {
          dev.zone = 'darshan';
          dev.logicalState = agent.logicalState === 'darshan_dwell' ? LOGICAL_DEVOTEE_STATES.DARSHAN_DWELL : LOGICAL_DEVOTEE_STATES.DARSHAN_APPROACH;
          if (!dev.darshanStartedAt && agent.logicalState === 'darshan_dwell') {
            dev.darshanStartedAt = this.simTime;
          }
          if (agent.logicalState === 'darshan_complete') {
            dev.darshanCompletedAt = this.simTime;
          }
        } else if (agent.state === AGENT_STATES.QUEUEING) {
          dev.zone = 'queue';
          dev.logicalState = LOGICAL_DEVOTEE_STATES.QUEUEING;
        } else if (agent.state === AGENT_STATES.WAITING) {
          dev.zone = 'holding';
          dev.logicalState = LOGICAL_DEVOTEE_STATES.HOLDING;
        } else if (agent.state === AGENT_STATES.EXITING) {
          dev.zone = 'exit';
          dev.logicalState = LOGICAL_DEVOTEE_STATES.EXITING;
        } else {
          dev.zone = 'entrance';
          dev.logicalState = LOGICAL_DEVOTEE_STATES.ENTERED;
        }
      }
    }

    // 7. Advance Position towards target waypoint with continuous delta-time
    let step = agent.actualSpeed * dt;
    const minSpacing = Math.max(0.85, this.options.MIN_QUEUE_SPACING || 0.9);

    if (aheadAgent) {
      const distToAhead = getDistance2D(agent.position, aheadAgent.position);
      if (distToAhead <= minSpacing) {
        step = 0;
      } else {
        step = Math.min(step, distToAhead - minSpacing);
      }
    }

    // Anti-collision check against any agent ahead on this path
    if (agentsOnPath && agentIndex > 0) {
      for (let k = 0; k < agentIndex; k++) {
        const other = agentsOnPath[k];
        if (!other) continue;
        const d = getDistance2D(agent.position, other.position);
        if (d <= minSpacing) {
          step = 0;
          break;
        } else if (d < minSpacing + step) {
          step = Math.max(0, d - minSpacing);
        }
      }
    }

    if (step > 0.0001) {
      const wpBlocked = (agentsOnPath && agentIndex > 0)
        ? agentsOnPath.slice(0, agentIndex).some((other) => getDistance2D(other.position, currentTarget) < minSpacing)
        : (aheadAgent && getDistance2D(aheadAgent.position, currentTarget) < minSpacing);

      if (distToTarget <= step && !wpBlocked) {
        // Reached waypoint: advance to next waypoint
        agent.position.x = currentTarget.x;
        agent.position.y = currentTarget.y || 0;
        agent.position.z = currentTarget.z;

        // Release security channel when advancing past security waypoint
        if (currentTarget.zone === 'security') {
          const channelId = currentTarget.componentId || `${path.stream || 'stream'}-sec-${path.id}`;
          if (this.securityChannels && this.securityChannels[channelId]?.agentId === agent.id) {
            delete this.securityChannels[channelId];
          }
        }

        agent.targetWaypointIndex++;
        agent.serviceTimer = 0; // Reset service timer for next node

        if (agent.targetWaypointIndex >= waypoints.length) {
          agent.actualSpeed = 0;
          agent.currentSpeed = 0;
          return true; // Exited at South Gopuram
        }

        // Pre-orient towards new target waypoint
        const nextWp = waypoints[agent.targetWaypointIndex];
        const nextDx = nextWp.x - agent.position.x;
        const nextDz = nextWp.z - agent.position.z;
        agent.targetHeading = Math.atan2(nextDx, nextDz);
      } else {
        // Step along direction vector
        const dx = (currentTarget.x - agent.position.x) / distToTarget;
        const dz = (currentTarget.z - agent.position.z) / distToTarget;

        agent.position.x += dx * step;
        agent.position.z += dz * step;

        // Smoothly interpolate vertical Y position along ramps and elevated bridge deck
        const currentTargetY = currentTarget.y || 0;
        const prevWp = agent.targetWaypointIndex > 0 ? waypoints[agent.targetWaypointIndex - 1] : null;
        const prevY = prevWp?.y || 0;
        const segDist = prevWp ? getDistance2D(prevWp, currentTarget) : 1;
        const progress = Math.max(0, Math.min(1, 1 - distToTarget / Math.max(0.1, segDist)));
        agent.position.y = prevY + (currentTargetY - prevY) * progress;

        // Calculate required Y-axis heading from movement vector
        const segmentAngle = Math.atan2(dx, dz);
        let targetAngle = segmentAngle;

        // Anticipatory look-ahead heading rounding at turns (Point 7 & 8)
        if (agent.targetWaypointIndex < waypoints.length - 1 && distToTarget < 2.5) {
          const nextWp = waypoints[agent.targetWaypointIndex + 1];
          const nextAngle = Math.atan2(nextWp.x - currentTarget.x, nextWp.z - currentTarget.z);
          let dAngle = (nextAngle - segmentAngle) % (Math.PI * 2);
          if (dAngle < -Math.PI) dAngle += Math.PI * 2;
          if (dAngle > Math.PI) dAngle -= Math.PI * 2;
          const blendFactor = (1.0 - (distToTarget / 2.5)) * 0.70;
          targetAngle = segmentAngle + dAngle * blendFactor;
        }

        agent.targetHeading = targetAngle;

        // Smooth angular interpolation for natural body turning (shortest arc)
        let diff = (targetAngle - (agent.rotationY || targetAngle)) % (Math.PI * 2);
        if (diff < -Math.PI) diff += Math.PI * 2;
        if (diff > Math.PI) diff -= Math.PI * 2;
        agent.rotationY = (agent.rotationY || targetAngle) + diff * Math.min(1.0, dt * 10.0);
      }
    }

    // 8. Soft Local Separation & Collision Avoidance (Point 13)
    if (convergenceAgents.length > 0) {
      for (let j = 0; j < convergenceAgents.length; j++) {
        const other = convergenceAgents[j];
        if (other.id === agent.id) continue;
        if (Math.abs((agent.position.y || 0) - (other.position.y || 0)) >= 1.2) continue;
        const dist = getDistance2D(agent.position, other.position);
        if (dist < 0.82 && dist > 0.05) {
          const push = (0.82 - dist) * 0.12 * dt;
          const nx = (agent.position.x - other.position.x) / dist;
          const nz = (agent.position.z - other.position.z) / dist;
          const testX = agent.position.x + nx * push;
          const testZ = agent.position.z + nz * push;
          const encroaches = agentsOnPath && agentsOnPath.some(
            (pA) => pA.id !== agent.id && getDistance2D({ x: testX, z: testZ }, pA.position) < 0.80
          );
          if (!encroaches) {
            agent.position.x = testX;
            agent.position.z = testZ;
          }
        }
      }
    }

    return false;
  }

  /**
   * Returns current real calculated metrics, separating planned crowd from actual demand
   */
  getMetrics() {
    const totalSpawned = this.totalSpawnedCount;
    // Total entered represents actual logical visitors entered into the system
    const sumEntranceEntered = (this.entranceStats.north.entered || 0) + (this.entranceStats.west.entered || 0) + (this.entranceStats.east.entered || 0);
    const totalEntered = Math.max(totalSpawned, sumEntranceEntered, this.logicalEnteredCount);

    if (sumEntranceEntered < totalEntered) {
      const diff = totalEntered - sumEntranceEntered;
      const norm = normalizeEntranceWeights(this.activeEntranceWeights || this.entranceInflow);
      const addNorth = Math.round(diff * norm.proportions.north);
      const addWest = Math.round(diff * norm.proportions.west);
      const addEast = diff - addNorth - addWest;
      this.entranceStats.north.entered += addNorth;
      this.entranceStats.west.entered += addWest;
      this.entranceStats.east.entered += addEast;
      for (const s of ['north', 'west', 'east']) {
        this.entranceStats[s].active = Math.max(0, this.entranceStats[s].entered - (this.entranceStats[s].completed || 0));
      }
    }

    const completedCrowd = (this.entranceStats.north.completed || 0) + (this.entranceStats.west.completed || 0) + (this.entranceStats.east.completed || 0);
    const activeCrowd = Math.max(0, totalEntered - completedCrowd);

    const inQueueCount = (this.entranceStats.north.queueOccupancy || 0) + (this.entranceStats.west.queueOccupancy || 0) + (this.entranceStats.east.queueOccupancy || 0);
    const inSecurityCount = (this.entranceStats.north.securityCount || 0) + (this.entranceStats.west.securityCount || 0) + (this.entranceStats.east.securityCount || 0);
    const inDarshanCount = (this.entranceStats.north.darshanCount || 0) + (this.entranceStats.west.darshanCount || 0) + (this.entranceStats.east.darshanCount || 0);

    const totalVisual = Math.max(1, this.agents.length);
    const representationRatio = activeCrowd > 0 && this.agents.length > 0
      ? Math.max(1, Math.round((activeCrowd / totalVisual) * 10) / 10)
      : 1;

    // Calculate Average Wait & Service Time from active and recently completed devotees (Requirement 14)
    let avgWaitMinutes = 0;
    let avgQueueWaitMinutes = 0;
    let avgServiceMinutes = 0;
    const sampleAgents = [...this.agents, ...this.recentCompletedAgents];
    if (sampleAgents.length > 0) {
      const totalWaitSeconds = sampleAgents.reduce((sum, a) => sum + (a.waitTime || 0) + (a.serviceTime || 0), 0);
      const totalQueueSeconds = sampleAgents.reduce((sum, a) => sum + (a.waitTime || 0), 0);
      const totalServiceSeconds = sampleAgents.reduce((sum, a) => sum + (a.serviceTime || 0), 0);
      const avgWaitSeconds = totalWaitSeconds / sampleAgents.length;
      avgWaitMinutes = Math.max(0, Math.round((avgWaitSeconds / 60) * 10) / 10);
      avgQueueWaitMinutes = Math.max(0, Math.round((totalQueueSeconds / sampleAgents.length / 60) * 10) / 10);
      avgServiceMinutes = Math.max(0, Math.round((totalServiceSeconds / sampleAgents.length / 60) * 10) / 10);
    }

    // Calculate Real Throughput based strictly on actual completed visitors
    let throughputPerHour = 0;
    if (this.simTime >= 3 && completedCrowd > 0) {
      const hoursElapsed = this.simTime / 3600;
      throughputPerHour = Math.round(completedCrowd / hoursElapsed);
    }

    // Format Simulation Time MM:SS
    const mins = Math.floor(this.simTime / 60);
    const secs = Math.floor(this.simTime % 60);
    const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Determine Bottleneck based on accumulated wait
    let bottleneckZone = 'Queue Lane';
    let bottleneckReason = 'Highest average crowd occupancy and channel retention.';
    if (this.cumulativeWaitByZone.security > this.cumulativeWaitByZone.queue && this.cumulativeWaitByZone.security > 5) {
      bottleneckZone = 'Security Checkpoint';
      bottleneckReason = 'Screening rate limits flow into the queue arena.';
    } else if (this.cumulativeWaitByZone.darshan > this.cumulativeWaitByZone.queue && this.cumulativeWaitByZone.darshan > 5) {
      bottleneckZone = 'Darshan Sanctum';
      bottleneckReason = 'Frontage viewing dwell time causes backward queue accumulation.';
    }

    return {
      simTimeSeconds: Math.round(this.simTime),
      formattedTime,
      // First-Class Crowd Load Concepts
      plannedCrowd: this.plannedCrowd,
      totalEntered,
      activeCrowd,
      completedCrowd,
      currentArrivalRate: Math.round(this.getEffectiveArrivalRate()),
      isSurging: this.isSurgeActive,
      arrivalsPaused: this.arrivalsPaused,
      // Backward-Compatible Metric Aliases
      visitorsEntered: totalEntered,
      visitorsActive: activeCrowd,
      visitorsInQueue: inQueueCount,
      visitorsInSecurity: inSecurityCount,
      visitorsInDarshan: inDarshanCount,
      visitorsCompleted: completedCrowd,
      avgWaitMinutes,
      avgQueueWaitMinutes,
      avgServiceMinutes,
      peakQueue: Math.max(this.peakQueueCount, inQueueCount),
      throughputPerHour,
      visualAgentsCount: this.agents.length,
      targetVisualAgents: this.targetVisualAgents,
      scaleFactor: representationRatio,
      representationRatio,
      bottleneck: {
        zone: bottleneckZone,
        reason: bottleneckReason,
      },
      // Deterministic per-entrance runtime counters & stats (PART 4 & 5)
      northEntered: this.entranceStats.north.entered,
      westEntered: this.entranceStats.west.entered,
      eastEntered: this.entranceStats.east.entered,
      entranceStats: {
        north: { ...this.entranceStats.north },
        west: { ...this.entranceStats.west },
        east: { ...this.entranceStats.east },
      },
      baseEntranceWeights: { ...this.baseEntranceWeights },
      activeEntranceWeights: { ...this.activeEntranceWeights },
      normalizedDistribution: normalizeEntranceWeights(this.activeEntranceWeights),
      queueDistribution: this.queueRouter ? this.queueRouter.getDistributionMetrics() : {},
      expansionEffectiveness: this.queueRouter ? this.queueRouter.getExpansionEffectiveness('north') : null,
      entranceInflow: { ...this.entranceInflow },
      aiQueueNavigationEnabled: this.aiQueueNavigationEnabled,
      aiNavigationState: { ...this.aiNavigationState },
      selectedDevoteeId: this.selectedDevoteeId,
      selectedDevotee: this.getSelectedDevoteeDetails(),
      logicalDevoteesCount: this.logicalDevotees.size,
      completedDevoteesCount: this.completedDevoteesCompact.size,
    };
  }

  // --- CROWD LOAD ENGINE API ---

  setEntranceInflow(inflow) {
    if (!inflow || typeof inflow !== 'object') return;
    const cleanInflow = {
      north: Math.max(0, Number(inflow.north) || 0),
      west: Math.max(0, Number(inflow.west) || 0),
      east: Math.max(0, Number(inflow.east) || 0),
    };
    this.entranceInflow = cleanInflow;
    this.baseEntranceWeights = { ...cleanInflow };
    if (!this.diversionApproved) {
      this.activeEntranceWeights = { ...cleanInflow };
    }
  }

  approveRerouting(congestedStream = 'north', targetStream = 'west', divertAmount = null) {
    this.diversionApproved = true;
    this.diversionPromptPending = false;
    this.rerouteAcceptedTime = this.simTime;
    this.lastRerouteCongested = congestedStream;
    this.lastRerouteTarget = targetStream;

    if (this.entranceStats[congestedStream]) {
      this.entranceStats[congestedStream].alertState = 'USER_ACCEPTED';
    }

    // Deterministically calculate bounded gradual redirection percentage (10% to 25%)
    let divertPercent = divertAmount;
    if (divertPercent === null || divertPercent === undefined) {
      if (this.lastCalculatedDivertPercent) {
        divertPercent = this.lastCalculatedDivertPercent;
      } else {
        const cSt = this.entranceStats[congestedStream];
        const tSt = this.entranceStats[targetStream];
        const utilDiff = Math.max(0, (cSt?.queueUtilization || 80) - (tSt?.queueUtilization || 30));
        const excessArrivalRatio = (cSt?.arrivalRate > 0 && cSt?.serviceRate > 0)
          ? Math.max(0, (cSt.arrivalRate - cSt.serviceRate) / cSt.arrivalRate)
          : 0.15;
        divertPercent = Math.min(25, Math.max(10, Math.round(12 + (utilDiff / 100) * 8 + excessArrivalRatio * 8)));
      }
    }

    const currentBase = this.baseEntranceWeights || { north: 90, west: 20, east: 20 };
    const divertWeight = Math.max(5, Math.round((currentBase[congestedStream] || 50) * (divertPercent / 100)));

    const updated = { ...currentBase };
    updated[congestedStream] = Math.max(10, (currentBase[congestedStream] || 50) - divertWeight);
    updated[targetStream] = (currentBase[targetStream] || 20) + divertWeight;

    this.activeEntranceWeights = updated;
    this.entranceInflow = { ...updated };
    this.lastDivertPercent = divertPercent;
  }

  acceptRerouting(congestedStream = 'north', targetStream = 'west', divertAmount = null) {
    return this.approveRerouting(congestedStream, targetStream, divertAmount);
  }

  revertRerouting() {
    this.diversionApproved = false;
    this.diversionPromptPending = false;
    this.rerouteAcceptedTime = null;
    const cKey = this.lastRerouteCongested;
    if (cKey && this.entranceStats[cKey]) {
      this.entranceStats[cKey].alertState = 'RECOVERED';
      this.entranceStats[cKey].blockedDuration = 0;
      this.entranceStats[cKey].congestionDuration = 0;
      this.entranceStats[cKey].status = 'NORMAL';
    }
    this.lastRerouteCongested = null;
    this.activeEntranceWeights = { ...(this.baseEntranceWeights || { north: 90, west: 20, east: 20 }) };
    this.entranceInflow = { ...this.activeEntranceWeights };
  }

  toggleAiQueueNavigation(enabled) {
    this.aiQueueNavigationEnabled = enabled !== undefined ? !!enabled : !this.aiQueueNavigationEnabled;
  }

  approveDiversion(approved = true) {
    if (approved) {
      const congested = this.aiNavigationState?.congestedStream || 'north';
      const target = this.aiNavigationState?.targetStream || 'west';
      this.approveRerouting(congested, target);
    } else {
      this.dismissDiversion();
    }
  }

  dismissDiversion() {
    this.diversionApproved = false;
    this.diversionPromptPending = false;
    this.diversionDismissedTime = this.simTime;
    const congestedStream = this.aiNavigationState?.congestedStream || this.lastRerouteCongested;
    if (congestedStream && this.entranceStats[congestedStream]) {
      this.entranceStats[congestedStream].alertState = 'USER_DECLINED';
      this.diversionDismissedUtil = this.entranceStats[congestedStream].queueUtilization;
    } else {
      this.diversionDismissedUtil = 85;
    }
  }

  /**
   * Section 17: Deterministic Test Fixture for Crowd State & Congestion Verification
   * Allows setting up self-consistent entrance queue telemetry for offline tests.
   */
  seedEntranceCrowd(stream, config = {}) {
    const st = this.entranceStats[stream];
    if (!st) return;

    if (config.queueCapacity !== undefined) {
      st.queueCapacity = Math.max(1, config.queueCapacity);
      st._customCapacity = true;
    }
    if (config.entered !== undefined) st.entered = Math.max(0, config.entered);
    if (config.completed !== undefined) st.completed = Math.min(st.entered, Math.max(0, config.completed));
    st.active = Math.max(0, st.entered - st.completed);

    if (config.queueOccupancy !== undefined) {
      st.queueOccupancy = Math.min(st.active, Math.max(0, config.queueOccupancy));
      st.waitingCount = st.queueOccupancy;
      st._customOccupancy = true;
    }
    if (config.securityCount !== undefined) {
      st.securityCount = Math.min(st.active - st.queueOccupancy, Math.max(0, config.securityCount));
    }
    if (config.avgWaitMinutes !== undefined) {
      st.avgWaitMinutes = Math.max(0, config.avgWaitMinutes);
      st._customWait = true;
    }
    if (config.avgSpeed !== undefined) {
      st.avgSpeed = Math.max(0, config.avgSpeed);
      st.movementSpeed = st.avgSpeed;
      st._customSpeed = true;
    }
    if (config.queueProgress !== undefined) {
      st.queueProgress = config.queueProgress;
    }
    if (config.arrivalRate !== undefined) st.arrivalRate = Math.max(0, config.arrivalRate);
    if (config.serviceRate !== undefined) st.serviceRate = Math.max(0, config.serviceRate);
    if (config.queueGrowthRate !== undefined) st.queueGrowthRate = config.queueGrowthRate;
    if (config.congestionDuration !== undefined) st.congestionDuration = Math.max(0, config.congestionDuration);
    if (config.blockedDuration !== undefined) st.blockedDuration = Math.max(0, config.blockedDuration);
    if (config.congestionState !== undefined) st.congestionState = config.congestionState;
    if (config.alertState !== undefined) st.alertState = config.alertState;

    st.queueUtilization = st.queueCapacity > 0 ? Math.min(100, Math.round((st.queueOccupancy / st.queueCapacity) * 100)) : 0;
    st.utilization = st.queueUtilization;
    st.availableCapacity = Math.max(0, st.queueCapacity - st.queueOccupancy);

    this.totalLogicalEntered = this.entranceStats.north.entered + this.entranceStats.west.entered + this.entranceStats.east.entered;
    this.logicalEnteredCount = this.totalLogicalEntered;
  }

  setArrivalRate(ratePerMinute) {
    this.currentArrivalRate = Math.max(0, Number(ratePerMinute) || 0);
  }

  toggleSurge(enabled) {
    this.isSurgeActive = enabled !== undefined ? !!enabled : !this.isSurgeActive;
  }

  setSurgeRate(extraPerMinute) {
    this.surgeIncrement = Math.max(0, Number(extraPerMinute) || 1500);
  }

  pauseArrivals() {
    this.arrivalsPaused = true;
  }

  resumeArrivals() {
    this.arrivalsPaused = false;
  }

  toggleArrivals(enabled) {
    this.arrivalsPaused = enabled !== undefined ? !enabled : !this.arrivalsPaused;
  }

  addCrowdBatch(count = 1000) {
    const validCount = Math.max(0, Number(count) || 0);
    this.batchInjectedCount += validCount;
    this.logicalEnteredCount = (this.logicalEnteredCount || 0) + validCount;
    this.totalLogicalEntered = Math.max(this.totalLogicalEntered, this.logicalEnteredCount);

    // Distribute among entrance streams so entrance counts remain consistent
    const norm = normalizeEntranceWeights(this.activeEntranceWeights || this.entranceInflow);
    const northB = Math.round(validCount * norm.proportions.north);
    const westB = Math.round(validCount * norm.proportions.west);
    const eastB = validCount - northB - westB;
    this.entranceStats.north.entered += northB;
    this.entranceStats.west.entered += westB;
    this.entranceStats.east.entered += eastB;

    this.entranceStats.north.active = Math.max(0, this.entranceStats.north.entered - (this.entranceStats.north.completed || 0));
    this.entranceStats.west.active = Math.max(0, this.entranceStats.west.entered - (this.entranceStats.west.completed || 0));
    this.entranceStats.east.active = Math.max(0, this.entranceStats.east.entered - (this.entranceStats.east.completed || 0));

    // Register lightweight logical devotees for each added batch arrival
    for (let i = 0; i < northB; i++) this.createAndRegisterLogicalDevotee('north');
    for (let i = 0; i < westB; i++) this.createAndRegisterLogicalDevotee('west');
    for (let i = 0; i < eastB; i++) this.createAndRegisterLogicalDevotee('east');

    return this.logicalEnteredCount;
  }

  getRepresentationRatio() {
    const totalVisual = Math.max(1, this.agents.length);
    const activeCrowd = (this.entranceStats.north.active || 0) + (this.entranceStats.west.active || 0) + (this.entranceStats.east.active || 0);
    if (activeCrowd <= 0 || totalVisual <= 0) return 1;
    return Math.max(1, Math.round((activeCrowd / totalVisual) * 10) / 10);
  }

  getEffectiveArrivalRate() {
    if (this.arrivalsPaused) return 0;
    return this.currentArrivalRate + (this.isSurgeActive ? this.surgeIncrement : 0);
  }

  /**
   * Returns normalized crowd state ready for simulation or downstream physical sensors
   */
  getCrowdState() {
    const metrics = this.getMetrics();

    let northVisual = 0, westVisual = 0, eastVisual = 0;
    let securityVisual = 0, darshanVisual = 0, exitVisual = 0, queueVisual = 0;

    for (const a of this.agents) {
      if (a.state === AGENT_STATES.SECURITY) securityVisual++;
      else if (a.state === AGENT_STATES.DARSHAN) darshanVisual++;
      else if (a.state === AGENT_STATES.EXITING) exitVisual++;
      else queueVisual++;

      const stream = (a.entryStream || a.streamId || a.stream || 'north').toLowerCase();
      if (stream === 'north') northVisual++;
      else if (stream === 'west') westVisual++;
      else if (stream === 'east') eastVisual++;
    }

    const totalVisual = Math.max(1, this.agents.length);
    const activeCrowd = metrics.activeCrowd;
    const scale = metrics.representationRatio || 1;

    return {
      source: 'simulation',
      plannedCrowd: this.plannedCrowd,
      totalEntered: metrics.totalEntered,
      activeCrowd: metrics.activeCrowd,
      completedCrowd: metrics.completedCrowd,
      currentArrivalRate: metrics.currentArrivalRate,
      isSurging: this.isSurgeActive,
      arrivalsPaused: this.arrivalsPaused,
      queueDistribution: metrics.queueDistribution,
      expansionEffectiveness: metrics.expansionEffectiveness,
      representationRatio: scale,
      visualAgentsCount: this.agents.length,
      zones: {
        north: {
          count: this.entranceStats.north.queueOccupancy,
          totalActive: this.entranceStats.north.active,
          visualCount: northVisual,
          density: this.entranceStats.north.queueUtilization >= 80 ? 'high' : 'normal',
        },
        west: {
          count: this.entranceStats.west.queueOccupancy,
          totalActive: this.entranceStats.west.active,
          visualCount: westVisual,
          density: this.entranceStats.west.queueUtilization >= 80 ? 'high' : 'normal',
        },
        east: {
          count: this.entranceStats.east.queueOccupancy,
          totalActive: this.entranceStats.east.active,
          visualCount: eastVisual,
          density: this.entranceStats.east.queueUtilization >= 80 ? 'high' : 'normal',
        },
        security: {
          count: metrics.visitorsInSecurity,
          visualCount: securityVisual,
        },
        queue: {
          count: metrics.visitorsInQueue,
          visualCount: queueVisual,
        },
        darshan: {
          count: metrics.visitorsInDarshan,
          visualCount: darshanVisual,
        },
        exit: {
          count: Math.round(exitVisual * scale),
          visualCount: exitVisual,
        },
      },
    };
  }

  /**
   * Returns deterministic crowd pressure analysis and capacity alerts
   */
  getPressureState() {
    const crowdState = this.getCrowdState();
    return this.pressureEngine.evaluatePressure(this.scene, crowdState, this.simTime);
  }

  /**
   * Refreshes scene architecture and simulation paths without disrupting active crowd state
   */
  updateSceneAndPaths(newScene, newPaths) {
    if (this.queueRouter) {
      this.queueRouter.recordBeforeExpansion('north');
    }
    if (newScene) {
      this.scene = newScene;
    }
    if (Array.isArray(newPaths) && newPaths.length > 0) {
      this.paths = newPaths;
    }
    if (this.queueRouter) {
      this.queueRouter.refresh(this.paths, this.scene);
      this.queueRouter.update(this.agents, this.scaleFactor);
      this.queueRouter.rebalancePreQueueDevotees(this.agents, this.paths, this.simTime);
    }
    return this.getPressureState();
  }
}
