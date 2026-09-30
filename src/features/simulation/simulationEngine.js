/**
 * DevaSetu Deterministic Crowd Flow Simulation Engine
 * Stepper logic for waypoint traversal, queue spacing, service bottlenecks,
 * spatial density accumulation, metrics aggregation, continuous agent spawning,
 * bounded visual agent recycling, and multi-stream campus flow.
 */

import { AGENT_STATES, SIMULATION_DEFAULTS, createAgent, getDistance2D } from './simulationModel.js';

export class SimulationEngine {
  constructor(scene, paths, options = {}) {
    this.scene = scene;
    this.paths = paths || [];
    this.options = { ...SIMULATION_DEFAULTS, ...options };

    const peakVisitors = Number(scene?.requirements?.peakVisitors) || 1500;
    // Bounded visual agent sample count (target: 100 to 300 devotees)
    this.targetVisualAgents = Math.min(300, Math.max(80, Math.round(peakVisitors / 5)));
    this.scaleFactor = Math.max(1, Math.round(peakVisitors / this.targetVisualAgents));

    this.agents = [];
    this.recentCompletedAgents = []; // Bounded rolling history for wait-time stats
    this.simTime = 0; // Simulated seconds
    this.spawnTimer = 0;
    this.nextAgentId = 1;
    this.peakQueueCount = 0;

    // Continuous flow counters
    this.totalSpawnedCount = 0;
    this.totalCompletedCount = 0;

    // Bounded reusable ID pool for stable React component identities
    this.agentIdPool = [];
    for (let i = 1; i <= this.targetVisualAgents * 2; i++) {
      this.agentIdPool.push(i);
    }

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

  /**
   * Advances simulation by delta seconds
   */
  update(delta, speedMultiplier = 1.0) {
    if (this.paths.length === 0) return;

    const dt = Math.min(0.1, delta) * speedMultiplier;
    this.simTime += dt;
    this.spawnTimer += dt;

    // 1. Continuous Deterministic Spawning (Maintains full crowd up to targetVisualAgents)
    if (this.agents.length < this.targetVisualAgents) {
      const spawnInterval = 0.15; // Smooth continuous entry flow
      if (this.spawnTimer >= spawnInterval) {
        this.spawnTimer = 0;
        this.spawnNextAgent();
      }
    }

    // 2. Update Active Agents
    const activeAgents = [];

    // Group agents by path for accurate upstream/downstream queue queuing
    const pathAgents = {};
    this.paths.forEach((p) => {
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
    for (const path of this.paths) {
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

        const isFinished = this.updateAgent(agent, aheadAgent, path, dt, convergenceAgents);
        if (isFinished) {
          // Devotee safely exited at South Gopuram
          agent.completedAt = this.simTime;
          agent.state = AGENT_STATES.COMPLETED;
          this.totalCompletedCount++;

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

    // 3. Update Queue Statistics & Bottlenecks
    const currentQueueCount = this.agents.filter(
      (a) => a.state === AGENT_STATES.QUEUEING || a.state === AGENT_STATES.WAITING || a.state === AGENT_STATES.SECURITY
    ).length;

    const scaledQueue = currentQueueCount * this.scaleFactor;
    if (scaledQueue > this.peakQueueCount) {
      this.peakQueueCount = scaledQueue;
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
   * Seeds progressive devotee wave so the temple system is immediately populated
   */
  seedInitialAgents() {
    if (!this.paths || this.paths.length === 0) return;

    for (const path of this.paths) {
      const waypoints = path.waypoints || [];
      if (waypoints.length < 2) continue;

      // Seed devotees across the system, with dense presence in queues & post-security flow
      for (let wpIdx = 1; wpIdx < waypoints.length - 1; wpIdx++) {
        if (this.agents.length >= this.targetVisualAgents) break;

        const wp = waypoints[wpIdx];
        const nextWp = waypoints[wpIdx + 1];
        const dist = getDistance2D(wp, nextWp);

        // If distance is long (e.g. queue lane span of 30-55m), place multiple devotees along the segment
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

          this.agents.push(agent);
          this.totalSpawnedCount++;
        }
      }
    }
  }

  /**
   * Spawns next devotee according to arrival demand and open gate channels
   */
  spawnNextAgent() {
    if (this.agents.length >= this.targetVisualAgents) return;

    // Detect campus multi-stream topology
    const northPaths = this.paths.filter((p) => p.stream === 'north');
    const westPaths = this.paths.filter((p) => p.stream === 'west');
    const eastPaths = this.paths.filter((p) => p.stream === 'east');

    let candidatePaths = this.paths;
    if (northPaths.length > 0 && westPaths.length > 0 && eastPaths.length > 0) {
      // Calibrated distribution: North ~40%, West ~30%, East ~30%
      const rand = Math.random();
      if (rand < 0.40) {
        candidatePaths = northPaths;
      } else if (rand < 0.70) {
        candidatePaths = westPaths;
      } else {
        candidatePaths = eastPaths;
      }
    }

    for (let p = 0; p < candidatePaths.length; p++) {
      const pathIndex = (this.totalSpawnedCount + p) % candidatePaths.length;
      const path = candidatePaths[pathIndex];
      if (!path || !path.waypoints || path.waypoints.length === 0) continue;

      const startPt = path.waypoints[0];

      // Hold spawn if entrance is occupied by an agent
      const entranceOccupied = this.agents.some(
        (a) => a.pathId === path.id && getDistance2D(a.position, startPt) < this.options.MIN_QUEUE_SPACING
      );

      if (!entranceOccupied) {
        const agentId = this.agentIdPool.length > 0 ? this.agentIdPool.pop() : ++this.nextAgentId;
        const newAgent = createAgent(agentId, path, this.simTime, this.options);
        newAgent.currentSpeed = newAgent.baseSpeed;
        this.agents.push(newAgent);
        this.totalSpawnedCount++;
        break;
      }
    }
  }

  /**
   * Updates an individual devotee: spacing, corner deceleration, rotation, service dwell, and movement
   */
  updateAgent(agent, aheadAgent, path, dt, convergenceAgents = []) {
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
      (currentTarget.zone === 'approach' || currentTarget.zone === 'darshan' || currentTarget.zone === 'dispersal')
    ) {
      const candidates = convergenceAgents.length > 0 ? convergenceAgents : this.agents;
      for (let j = 0; j < candidates.length; j++) {
        const other = candidates[j];
        if (other.id === agent.id) continue;
        const d = getDistance2D(agent.position, other.position);
        if (d < 1.15) {
          // Check if other devotee is in front along movement heading
          const dx = other.position.x - agent.position.x;
          const dz = other.position.z - agent.position.z;
          const headingX = Math.sin(agent.targetHeading || 0);
          const headingZ = Math.cos(agent.targetHeading || 0);
          const dot = dx * headingX + dz * headingZ;
          if (dot > 0.15) {
            mustHold = true;
            break;
          }
        }
      }
    }

    // 3. Service Area Handling (Security & Darshan)
    // Security screening: very brief 0.2s - 0.75s visual pause per devotee (PART 1)
    if (currentTarget.zone === 'security' && distToTarget < 0.85) {
      agent.state = AGENT_STATES.SECURITY;
      agent.serviceTimer += dt;
      this.cumulativeWaitByZone.security += dt;
      agent.waitTime += dt;

      const secDwell = agent.securityDwellTime || 0.40;
      if (agent.serviceTimer < secDwell) {
        mustHold = true;
      }
    } else if (currentTarget.zone === 'darshan' && distToTarget < 1.1) {
      // Darshan: reverent prayer viewing pause (Point 15)
      agent.state = AGENT_STATES.DARSHAN;
      agent.serviceTimer += dt;
      this.cumulativeWaitByZone.darshan += dt;
      agent.waitTime += dt;

      const darshanDwell = agent.darshanDwellTime || 2.2;
      if (agent.serviceTimer < darshanDwell) {
        mustHold = true;
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
      agent.waitTime += dt;
      if (currentTarget.zone === 'queue') {
        agent.state = AGENT_STATES.QUEUEING;
        this.cumulativeWaitByZone.queue += dt;
      } else if (currentTarget.zone === 'holding') {
        agent.state = AGENT_STATES.WAITING;
      }
    } else {
      // Update state based on current zone
      if (currentTarget.zone === 'queue') {
        agent.state = AGENT_STATES.QUEUEING;
      } else if (currentTarget.zone === 'exit' || currentTarget.zone === 'dispersal') {
        agent.state = AGENT_STATES.EXITING;
      }
    }

    // 7. Advance Position towards target waypoint with continuous delta-time
    let step = agent.actualSpeed * dt;
    if (aheadAgent) {
      const distToAhead = getDistance2D(agent.position, aheadAgent.position);
      const safeBuffer = this.options.MIN_QUEUE_SPACING;
      if (distToAhead <= safeBuffer) {
        step = 0;
      } else {
        step = Math.min(step, Math.max(0, distToAhead - safeBuffer));
      }
    }

    if (step > 0.0001) {
      if (distToTarget <= step) {
        // Reached waypoint: advance to next waypoint
        agent.position.x = currentTarget.x;
        agent.position.z = currentTarget.z;
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
        const dist = getDistance2D(agent.position, other.position);
        if (dist < 0.82 && dist > 0.05) {
          const push = (0.82 - dist) * 0.12 * dt;
          const nx = (agent.position.x - other.position.x) / dist;
          const nz = (agent.position.z - other.position.z) / dist;
          agent.position.x += nx * push;
          agent.position.z += nz * push;
        }
      }
    }

    return false;
  }

  /**
   * Returns current real calculated metrics
   */
  getMetrics() {
    const totalSpawned = this.totalSpawnedCount;
    const scaledEntered = totalSpawned * this.scaleFactor;
    const scaledCompleted = this.totalCompletedCount * this.scaleFactor;
    const activeVisitors = this.agents.length * this.scaleFactor;

    const inQueueCount = this.agents.filter(
      (a) => a.state === AGENT_STATES.QUEUEING || a.state === AGENT_STATES.WAITING
    ).length;
    const scaledInQueue = inQueueCount * this.scaleFactor;

    const inSecurityCount = this.agents.filter((a) => a.state === AGENT_STATES.SECURITY).length;
    const scaledInSecurity = inSecurityCount * this.scaleFactor;

    const inDarshanCount = this.agents.filter((a) => a.state === AGENT_STATES.DARSHAN).length;
    const scaledInDarshan = inDarshanCount * this.scaleFactor;

    // Calculate Average Wait Time from active and recently completed devotees
    const sampleAgents = [...this.agents, ...this.recentCompletedAgents];
    const totalWaitSeconds = sampleAgents.reduce((sum, a) => sum + (a.waitTime || 0), 0);
    const avgWaitSeconds = sampleAgents.length > 0 ? totalWaitSeconds / sampleAgents.length : 0;
    const avgWaitMinutes = Math.max(0, Math.round((avgWaitSeconds / 60) * 10) / 10);

    // Calculate Real Throughput (completed visitors per hour)
    const hoursElapsed = Math.max(0.005, this.simTime / 3600);
    const throughputPerHour = Math.round(scaledCompleted / hoursElapsed);

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
      visitorsEntered: scaledEntered,
      visitorsActive: activeVisitors,
      visitorsInQueue: scaledInQueue,
      visitorsInSecurity: scaledInSecurity,
      visitorsInDarshan: scaledInDarshan,
      visitorsCompleted: scaledCompleted,
      avgWaitMinutes,
      peakQueue: Math.max(this.peakQueueCount, scaledInQueue),
      throughputPerHour,
      visualAgentsCount: this.agents.length,
      targetVisualAgents: this.targetVisualAgents,
      scaleFactor: this.scaleFactor,
      bottleneck: {
        zone: bottleneckZone,
        reason: bottleneckReason,
      },
    };
  }
}
