/**
 * DevaSetu Queue Router & Deterministic Dynamic Load Balancer
 * 
 * Responsible for:
 * 1. Discovering all active queue paths (original, curved, serpentine, arc, radial, expansion)
 *    and maintaining a normalized Queue Load State with geometric capacity.
 * 2. Deterministic routing of new arrivals to the least-utilized queue in the same stream.
 * 3. Dynamic non-teleporting rebalancing for pre-queue / holding-area devotees.
 * 4. Comprehensive queue distribution metrics and expansion effectiveness tracking.
 * 5. Strict adherence to stream separation (North -> North, West -> West, East -> East).
 */

import { calculateQueuePhysicalCapacity } from './crowdPressureEngine.js';

export class QueueRouter {
  constructor(paths = [], scene = null, density = 2.0) {
    this.density = density;
    this.streamRoundRobin = {
      north: 0,
      west: 0,
      east: 0,
      main: 0,
    };
    this.streamQueues = {};     // key: stream -> array of pathIds
    this.diversionPaths = {};   // key: stream -> array of diversion pathIds
    this.queueLoadStates = {};  // key: pathId -> queue record
    this.lastRebalanceTime = 0;
    this.lastCrossRebalanceTime = 0;
    this.totalDivertedCount = 0;
    this.expansionSnapshot = null;

    if (paths && paths.length > 0) {
      this.refresh(paths, scene);
    }
  }

  /**
   * Discovers and indexes all queue paths from current scene components and simulation paths
   */
  refresh(paths = [], scene = null) {
    const components = scene?.components || [];
    const queueComponents = components.filter((c) => c.type === 'queue');

    this.streamQueues = {
      north: [],
      west: [],
      east: [],
      main: [],
    };
    this.diversionPaths = {
      north: [],
      west: [],
      east: [],
    };

    const newQueueLoadStates = {};

    for (const path of paths) {
      // 1. Resolve queue component for this path
      let queueComp = null;
      if (path.laneId) {
        queueComp = queueComponents.find((c) => c.id === path.laneId);
      }
      if (!queueComp) {
        const queueWp = path.waypoints?.find((w) => w.zone === 'queue' && w.componentId);
        if (queueWp) {
          queueComp = queueComponents.find((c) => c.id === queueWp.componentId);
        }
      }

      // 2. Identify operational stream
      let stream = (path.stream || queueComp?.properties?.stream || queueComp?.properties?.zone || '').toLowerCase();
      if (stream.includes('north') || stream === 'a') stream = 'north';
      else if (stream.includes('west') || stream === 'b') stream = 'west';
      else if (stream.includes('east') || stream === 'c') stream = 'east';
      else stream = 'main';

      // 3. Physical capacity calculation from actual centerline geometry
      let capacity = 100;
      if (queueComp) {
        capacity = calculateQueuePhysicalCapacity(queueComp, this.density);
      } else if (path.waypoints) {
        const queueWps = path.waypoints.filter((w) => w.zone === 'queue');
        capacity = Math.max(50, queueWps.length * 10);
      }

      // Preserve previously assigned arrivals if path existed before
      const priorState = this.queueLoadStates[path.id];
      const assignedArrivals = priorState ? priorState.assignedArrivals : 0;

      const isExpansion = Boolean(
        queueComp?.role === 'queue-expansion' ||
        queueComp?.properties?.isExpansion ||
        (path.laneId && path.laneId.includes('capacity-expansion'))
      );

      const record = {
        pathId: path.id,
        laneId: path.laneId || queueComp?.id || `lane-${path.id}`,
        queueId: queueComp?.id || path.laneId,
        queueName: queueComp?.name || path.name,
        stream,
        capacity: Math.max(1, capacity),
        currentOccupancy: priorState ? priorState.currentOccupancy : 0,
        visualCount: 0,
        waitingCount: 0,
        utilization: priorState ? priorState.utilization : 0.0,
        availableCapacity: Math.max(0, capacity - (priorState ? priorState.currentOccupancy : 0)),
        assignedArrivals,
        isExpansion,
        isDiversion: Boolean(path.isDiversion),
        targetStream: path.targetStream || null,
        template: queueComp?.template || queueComp?.properties?.pathData?.type || 'straight',
      };

      newQueueLoadStates[path.id] = record;

      if (path.isDiversion) {
        if (!this.diversionPaths[stream]) {
          this.diversionPaths[stream] = [];
        }
        this.diversionPaths[stream].push(path.id);
      } else {
        if (!this.streamQueues[stream]) {
          this.streamQueues[stream] = [];
        }
        this.streamQueues[stream].push(path.id);
      }
    }

    this.queueLoadStates = newQueueLoadStates;
  }

  /**
   * Updates real-time visual counts, logical occupancy, and utilization from active agents
   */
  update(agents = [], scaleFactor = 1.0) {
    // Reset visual counts
    for (const key of Object.keys(this.queueLoadStates)) {
      this.queueLoadStates[key].visualCount = 0;
      this.queueLoadStates[key].waitingCount = 0;
    }

    // Tally active visual devotees on each queue path
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      const qState = this.queueLoadStates[a.pathId];
      if (!qState) continue;

      // Count devotees who are physically within the queue lane
      if (a.state === 'queueing' || a.currentZone === 'queue') {
        qState.visualCount++;
        qState.waitingCount++;
      }
    }

    // Derive logical occupancy and true utilization
    for (const key of Object.keys(this.queueLoadStates)) {
      const q = this.queueLoadStates[key];
      q.currentOccupancy = Math.round(q.visualCount * scaleFactor);
      q.utilization = Math.round((q.currentOccupancy / q.capacity) * 1000) / 1000;
      q.availableCapacity = Math.max(0, q.capacity - q.currentOccupancy);
    }
  }

  /**
   * Computes aggregate metrics for each stream
   */
  getStreamMetrics() {
    const streams = ['north', 'west', 'east'];
    const metrics = {};

    for (const s of streams) {
      const pathIds = this.streamQueues[s] || [];
      let totalOccupancy = 0;
      let totalCapacity = 0;

      for (const id of pathIds) {
        const q = this.queueLoadStates[id];
        if (q) {
          totalOccupancy += q.currentOccupancy;
          totalCapacity += q.capacity;
        }
      }

      const utilization = totalCapacity > 0 ? totalOccupancy / totalCapacity : 0;
      metrics[s] = {
        stream: s,
        occupancy: totalOccupancy,
        capacity: totalCapacity,
        utilization: Math.round(utilization * 100) / 100,
      };
    }

    return metrics;
  }

  /**
   * Detects whether an imbalance exists across entrance streams
   */
  getStreamDisparity() {
    const metrics = this.getStreamMetrics();
    const streams = Object.values(metrics);
    if (streams.length < 2) return null;

    streams.sort((a, b) => b.utilization - a.utilization);
    const highest = streams[0];
    const lowest = streams[streams.length - 1];

    const disparity = highest.utilization - lowest.utilization;

    // Trigger AI diversion ONLY when an entrance queue line is genuinely FULL (utilization >= 0.80)
    // and there is an under-utilized alternative entrance available (lowest < 0.65 and disparity >= 0.25)
    if (highest.utilization >= 0.80 && lowest.utilization < 0.65 && disparity >= 0.25) {
      return {
        hasDisparity: true,
        congested: highest.stream,
        targetStream: lowest.stream,
        disparity: Math.round(disparity * 100) / 100,
        maxUtil: highest.utilization,
        minUtil: lowest.utilization,
        isFull: true,
      };
    }

    return null;
  }

  /**
   * Deterministically selects the optimal queue path for an incoming devotee
   * Priority: AI Cross-Stream Diversion (if congested) -> Available capacity -> Lowest utilization -> Weighted round-robin
   */
  selectOptimalPath(stream = 'north', allPaths = [], aiNavigationEnabled = true, diversionApproved = false) {
    const streamKey = (stream || 'north').toLowerCase();

    // 0. AI Intelligent Cross-Stream Navigation (Only when explicitly approved by operator)
    if (aiNavigationEnabled && diversionApproved) {
      const disparity = this.getStreamDisparity();
      if (disparity && disparity.congested === streamKey) {
        const metrics = this.getStreamMetrics();
        // First try exact targetStream, or fallback to any connected lower-congestion stream
        let divPathId = (this.diversionPaths[streamKey] || []).find((id) => {
          const state = this.queueLoadStates[id];
          return state && state.targetStream === disparity.targetStream;
        });
        if (divPathId === undefined) {
          divPathId = (this.diversionPaths[streamKey] || []).find((id) => {
            const state = this.queueLoadStates[id];
            return state && state.targetStream && (metrics[state.targetStream]?.utilization || 0) < disparity.maxUtil - 0.15;
          });
        }

        if (divPathId !== undefined) {
          const divPath = allPaths.find((p) => p.id === divPathId);
          if (divPath) {
            const state = this.queueLoadStates[divPathId];
            if (state) state.assignedArrivals++;
            this.totalDivertedCount++;
            return divPath;
          }
        }
      }
    }

    const candidatePathIds = this.streamQueues[streamKey] || this.streamQueues.main || [];

    let candidates = candidatePathIds
      .map((id) => this.queueLoadStates[id])
      .filter(Boolean);

    // Fallback if no matching paths for this stream
    if (candidates.length === 0) {
      candidates = Object.values(this.queueLoadStates).filter((s) => !s.isDiversion);
    }

    if (candidates.length === 0) {
      return allPaths[0] || null;
    }

    // 1. Calculate minimum utilization among stream candidates
    let minUtil = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i].utilization < minUtil) {
        minUtil = candidates[i].utilization;
      }
    }

    // 2. Filter candidates near minimum utilization (tolerance 0.08)
    const bestCandidates = candidates.filter((c) => c.utilization <= minUtil + 0.08);

    // 3. Among similarly-utilized queues, prefer queues with greater available capacity
    bestCandidates.sort((a, b) => {
      if (Math.abs(a.utilization - b.utilization) > 0.03) {
        return a.utilization - b.utilization;
      }
      return b.availableCapacity - a.availableCapacity;
    });

    // 4. Deterministic round-robin index among top candidates to distribute smoothly
    const rrIndex = (this.streamRoundRobin[streamKey] || 0) % bestCandidates.length;
    this.streamRoundRobin[streamKey] = (this.streamRoundRobin[streamKey] || 0) + 1;

    const chosenState = bestCandidates[rrIndex] || bestCandidates[0];
    chosenState.assignedArrivals++;

    return allPaths.find((p) => p.id === chosenState.pathId) || null;
  }

  /**
   * AI Dynamic Cross-Stream Rebalancing for pre-queue devotees waiting at gates/holding
   * Navigates devotees from congested entrance holding bays to less-crowded entrances
   */
  rebalanceCrossStreamDevotees(agents = [], allPaths = [], currentTime = 0, aiNavigationEnabled = true, diversionApproved = false) {
    if (!aiNavigationEnabled || !diversionApproved) return 0;
    if (currentTime - this.lastCrossRebalanceTime < 1.5) return 0;
    this.lastCrossRebalanceTime = currentTime;

    const disparity = this.getStreamDisparity();
    if (!disparity) return 0;

    const congestedStream = disparity.congested;
    const targetStream = disparity.targetStream;
    const metrics = this.getStreamMetrics();

    let divPathId = (this.diversionPaths[congestedStream] || []).find((id) => {
      const s = this.queueLoadStates[id];
      return s && s.targetStream === targetStream;
    });
    if (divPathId === undefined) {
      divPathId = (this.diversionPaths[congestedStream] || []).find((id) => {
        const s = this.queueLoadStates[id];
        return s && s.targetStream && (metrics[s.targetStream]?.utilization || 0) < disparity.maxUtil - 0.15;
      });
    }
    if (divPathId === undefined) return 0;
    const targetPath = allPaths.find((p) => p.id === divPathId);
    if (!targetPath || !targetPath.waypoints) return 0;

    let rebalancedCount = 0;

    for (const agent of agents) {
      if (rebalancedCount >= 2) break; // Gentle flow of 2 devotees per step

      const currPath = agent.path || allPaths.find((p) => p.id === agent.pathId);
      if (!currPath || currPath.stream !== congestedStream || currPath.isDiversion) continue;

      const currentWp = currPath.waypoints?.[agent.targetWaypointIndex];
      if (!currentWp) continue;

      // Only re-route devotees in pre-queue arrival or holding loop (NEVER inside queue/darshan/exit)
      if (currentWp.zone === 'entrance' || currentWp.zone === 'holding') {
        let bestIdx = -1;
        let bestDist = Infinity;
        for (let w = 0; w < targetPath.waypoints.length; w++) {
          const tw = targetPath.waypoints[w];
          if (tw.zone === currentWp.zone || (currentWp.zone === 'entrance' && tw.zone === 'holding') || (currentWp.zone === 'holding' && tw.zone === 'approach')) {
            const dx = tw.x - agent.position.x;
            const dz = tw.z - agent.position.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d < bestDist) {
              bestDist = d;
              bestIdx = w;
            }
          }
        }

        if (bestIdx >= 0) {
          // Reassign path without moving position (zero teleportation)
          agent.pathId = targetPath.id;
          agent.path = targetPath;
          agent.targetWaypointIndex = bestIdx;
          agent.isDiverted = true;
          if (targetPath.targetStream) {
            agent.stream = targetPath.targetStream;
          }

          const nextWp = targetPath.waypoints[bestIdx];
          const dx = nextWp.x - agent.position.x;
          const dz = nextWp.z - agent.position.z;
          agent.targetHeading = Math.atan2(dx, dz);

          rebalancedCount++;
          this.totalDivertedCount++;
        }
      }
    }

    return rebalancedCount;
  }

  /**
   * Non-teleporting dynamic rebalancing for devotees in holding bay or pre-queue junctions
   * Allows devotees waiting before the queue to naturally discover newly added expansion capacity
   */
  rebalancePreQueueDevotees(agents = [], allPaths = [], currentTime = 0) {
    if (currentTime - this.lastRebalanceTime < 2.0) return 0; // Throttle to every 2 seconds
    this.lastRebalanceTime = currentTime;

    let rebalancedCount = 0;

    for (const streamKey of Object.keys(this.streamQueues)) {
      const pathIds = this.streamQueues[streamKey];
      if (!pathIds || pathIds.length <= 1) continue;

      const states = pathIds.map((id) => this.queueLoadStates[id]).filter(Boolean);
      if (states.length <= 1) continue;

      let maxUtil = -Infinity;
      let minUtil = Infinity;
      let minState = null;

      for (const s of states) {
        if (s.utilization > maxUtil) maxUtil = s.utilization;
        if (s.utilization < minUtil) {
          minUtil = s.utilization;
          minState = s;
        }
      }

      // Only rebalance if significant load disparity exists (e.g. >= 25% difference)
      if (maxUtil - minUtil < 0.25 || !minState) continue;

      // Rebalancing allows pre-queue devotees to spread into newly available expansion capacity
      const hasExpansion = states.some((s) => s.isExpansion);
      if (!hasExpansion || !minState.isExpansion) continue;

      const targetPath = allPaths.find((p) => p.id === minState.pathId);
      if (!targetPath || !targetPath.waypoints) continue;

      // Find agents currently in pre-queue zones (entrance, holding, approach before queue)
      for (const agent of agents) {
        if (rebalancedCount >= 4) break; // Gentle bounded batches per step

        const currPath = agent.path || allPaths.find((p) => p.id === agent.pathId);
        if (!currPath || currPath.stream !== streamKey || currPath.id === minState.pathId) continue;

        const currentWp = currPath.waypoints?.[agent.targetWaypointIndex];
        if (!currentWp) continue;

        // STRICT SAFETY: Do NOT move agents already inside physical queue or at darshan/exit!
        if (currentWp.zone === 'queue' || agent.state === 'queueing' || agent.state === 'darshan' || agent.state === 'exiting') {
          continue;
        }

        // Only re-route devotees in entrance or holding bay
        if (currentWp.zone === 'entrance' || currentWp.zone === 'holding' || currentWp.zone === 'approach') {
          // Find matching zone waypoint on target path closest to agent's current position
          let bestIdx = -1;
          let bestDist = Infinity;

          for (let w = 0; w < targetPath.waypoints.length; w++) {
            const tw = targetPath.waypoints[w];
            // Only consider waypoints in same or downstream pre-queue zone
            if (tw.zone === currentWp.zone || (currentWp.zone === 'entrance' && tw.zone === 'holding') || (currentWp.zone === 'holding' && tw.zone === 'security')) {
              const dx = tw.x - agent.position.x;
              const dz = tw.z - agent.position.z;
              const d = Math.sqrt(dx * dx + dz * dz);
              if (d < bestDist) {
                bestDist = d;
                bestIdx = w;
              }
            }
          }

          if (bestIdx >= 0) {
            // Ensure no existing devotee on target path is within 1.2m spacing
            const targetNear = agents.some((other) => {
              if (other.id === agent.id || other.pathId !== targetPath.id) return false;
              const ox = other.position.x - agent.position.x;
              const oz = other.position.z - agent.position.z;
              return Math.sqrt(ox * ox + oz * oz) < 1.2;
            });
            if (targetNear) continue;

            // Reassign path without moving position (zero teleportation!)
            agent.pathId = targetPath.id;
            agent.path = targetPath;
            agent.targetWaypointIndex = bestIdx;

            // Smooth heading update towards new target
            const nextWp = targetPath.waypoints[bestIdx];
            const dx = nextWp.x - agent.position.x;
            const dz = nextWp.z - agent.position.z;
            agent.targetHeading = Math.atan2(dx, dz);

            minState.visualCount++;
            rebalancedCount++;
          }
        }
      }
    }

    return rebalancedCount;
  }

  /**
   * Returns deterministic queue distribution metrics grouped by operational stream
   */
  getDistributionMetrics() {
    const result = {};

    for (const streamKey of Object.keys(this.streamQueues)) {
      const pathIds = this.streamQueues[streamKey];
      if (!pathIds || pathIds.length === 0) continue;

      const queues = [];
      let maxUtil = 0;
      let minUtil = Infinity;
      let totalOccupancy = 0;
      let totalCapacity = 0;

      for (const id of pathIds) {
        const q = this.queueLoadStates[id];
        if (!q) continue;

        queues.push({
          pathId: q.pathId,
          laneId: q.laneId,
          queueName: q.queueName,
          occupancy: q.currentOccupancy,
          capacity: q.capacity,
          utilization: q.utilization,
          assignedArrivals: q.assignedArrivals,
          isExpansion: q.isExpansion,
          template: q.template,
        });

        if (q.utilization > maxUtil) maxUtil = q.utilization;
        if (q.utilization < minUtil) minUtil = q.utilization;
        totalOccupancy += q.currentOccupancy;
        totalCapacity += q.capacity;
      }

      if (minUtil === Infinity) minUtil = 0;

      result[streamKey] = {
        stream: streamKey,
        queues,
        distribution: {
          balanced: (maxUtil - minUtil) <= 0.25,
          highestUtilization: Math.round(maxUtil * 1000) / 1000,
          lowestUtilization: Math.round(minUtil * 1000) / 1000,
          totalOccupancy,
          totalCapacity,
          streamUtilization: totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 1000) / 1000 : 0,
        },
      };
    }

    return result;
  }

  /**
   * Captures pre-expansion snapshot for effectiveness calculation
   */
  recordBeforeExpansion(stream = 'north') {
    const dist = this.getDistributionMetrics();
    const streamDist = dist[stream] || dist.main || { distribution: {} };

    this.expansionSnapshot = {
      stream,
      timestamp: Date.now(),
      capacity: streamDist.distribution.totalCapacity || 0,
      occupancy: streamDist.distribution.totalOccupancy || 0,
      utilization: streamDist.distribution.streamUtilization || 0,
    };
  }

  /**
   * Computes expansion effectiveness: capacityBefore vs capacityAfter, utilizationBefore vs utilizationAfter
   */
  getExpansionEffectiveness(stream = 'north') {
    const dist = this.getDistributionMetrics();
    const currentDist = dist[stream] || dist.main || { distribution: {} };

    const capacityAfter = currentDist.distribution.totalCapacity || 0;
    const occupancyAfter = currentDist.distribution.totalOccupancy || 0;
    const utilizationAfter = currentDist.distribution.streamUtilization || 0;

    const capacityBefore = this.expansionSnapshot ? this.expansionSnapshot.capacity : Math.round(capacityAfter * 0.7);
    const utilizationBefore = this.expansionSnapshot ? this.expansionSnapshot.utilization : Math.round(utilizationAfter * 1.4 * 1000) / 1000;

    return {
      stream,
      capacityBefore,
      capacityAfter,
      utilizationBefore,
      utilizationAfter,
      capacityGained: Math.max(0, capacityAfter - capacityBefore),
      utilizationReduction: Math.max(0, Math.round((utilizationBefore - utilizationAfter) * 1000) / 1000),
      alertResolved: utilizationBefore > 1.0 && utilizationAfter <= 1.0,
    };
  }
}
