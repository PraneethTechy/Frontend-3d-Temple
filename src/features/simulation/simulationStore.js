/**
 * DevaSetu Crowd Simulation Zustand Store
 * Manages simulation lifecycle, playback controls, visualization toggles,
 * real-time metrics, D3 history, and layout change detection.
 */

import { create } from 'zustand';
import { SimulationEngine } from './simulationEngine.js';
import { generateSimulationPaths } from './simulationPaths.js';
import { useQueueStore } from '../../store/useQueueStore.js';

export const useSimulationStore = create((set, get) => ({
  engine: null,
  status: 'idle', // 'idle' | 'running' | 'paused'
  speed: 1.0, // 0.5 | 1.0 | 2.0 | 4.0
  showPaths: true,
  showDensity: false,
  agents: [], // Active rendered devotee instances

  simulationRunning: false,
  arrivalsPaused: false,
  crowdState: null,
  pressureState: null,
  isSurging: false,
  currentArrivalRate: 600,

  // Entrance Inflow Distribution (Relative weights per entrance gopuram)
  entranceInflow: {
    north: 90,
    west: 20,
    east: 20,
  },

  // AI Queue Navigation & Dynamic Balancer
  aiQueueNavigationEnabled: true,
  diversionApproved: false,
  diversionApprovalModal: {
    isOpen: false,
    data: null,
  },
  aiNavigationState: {
    active: false,
    congestedStream: null,
    targetStream: null,
    disparity: 0,
    divertedCount: 0,
    message: 'All entrance streams balanced',
  },

  // Authoritative Individual Devotee Selection & Inspection State
  selectedDevoteeId: null,
  selectedDevoteeDetails: null,

  // Real calculated metrics
  metrics: {
    simTimeSeconds: 0,
    formattedTime: '00:00',
    plannedCrowd: 10000,
    totalEntered: 0,
    activeCrowd: 0,
    completedCrowd: 0,
    visitorsEntered: 0,
    visitorsActive: 0,
    visitorsInQueue: 0,
    visitorsInSecurity: 0,
    visitorsInDarshan: 0,
    visitorsCompleted: 0,
    currentArrivalRate: 0,
    isSurging: false,
    arrivalsPaused: false,
    avgWaitMinutes: 0,
    peakQueue: 0,
    throughputPerHour: 0,
    visualAgentsCount: 0,
    targetVisualAgents: 300,
    scaleFactor: 5,
    northEntered: 0,
    westEntered: 0,
    eastEntered: 0,
    entranceStats: {
      north: { stream: 'north', name: 'North Gopuram', entered: 0, active: 0, completed: 0, share: 0, queueOccupancy: 0, queueCapacity: 1000, queueUtilization: 0, waitingCount: 0, avgSpeed: 1.2, avgWaitMinutes: 0, status: 'NORMAL' },
      west: { stream: 'west', name: 'West Gopuram', entered: 0, active: 0, completed: 0, share: 0, queueOccupancy: 0, queueCapacity: 1000, queueUtilization: 0, waitingCount: 0, avgSpeed: 1.2, avgWaitMinutes: 0, status: 'NORMAL' },
      east: { stream: 'east', name: 'East Gopuram', entered: 0, active: 0, completed: 0, share: 0, queueOccupancy: 0, queueCapacity: 1000, queueUtilization: 0, waitingCount: 0, avgSpeed: 1.2, avgWaitMinutes: 0, status: 'NORMAL' },
    },
    baseEntranceWeights: { north: 90, west: 20, east: 20 },
    activeEntranceWeights: { north: 90, west: 20, east: 20 },
    bottleneck: {
      zone: 'Queue Lane',
      reason: 'Awaiting simulation initialization.',
    },
  },

  // Time-series history for D3.js line & throughput charts
  metricsHistory: [],

  // Path data & topology derived from current Scene JSON
  pathData: {
    ready: false,
    reason: null,
    paths: [],
    template: 'parallel',
  },

  // Layout revision tracking to safely detect changes during simulation
  simulatedComponentsHash: '',
  layoutChangedNotice: false,

  // Initialize or re-derive paths from scene
  initFromScene: (scene) => {
    if (!scene || !scene.components) return;

    const pathData = generateSimulationPaths(scene);
    const hash = computeComponentsHash(scene.components);

    // If already running and layout changed, pause and prompt reset
    const { status, simulatedComponentsHash } = get();
    if (status !== 'idle' && simulatedComponentsHash && simulatedComponentsHash !== hash) {
      set({
        status: 'paused',
        layoutChangedNotice: true,
        pathData,
      });
      return;
    }

    set({
      pathData,
      simulatedComponentsHash: hash,
      layoutChangedNotice: false,
    });
  },

  startSimulation: (scene) => {
    const state = get();
    const currentScene = scene || state.engine?.scene;
    if (!currentScene) return;

    const pathResult = generateSimulationPaths(currentScene);
    if (!pathResult.ready) {
      set({
        pathData: pathResult,
        status: 'idle',
        simulationRunning: false,
        arrivalsPaused: false,
      });
      return;
    }

    let engine = state.engine;
    const hash = computeComponentsHash(currentScene.components);

    // Create fresh engine if idle, not currently running, or if layout changed
    if (!engine || !state.simulationRunning || state.status === 'idle' || state.layoutChangedNotice) {
      engine = new SimulationEngine(currentScene, pathResult.paths);
      // Devotees strictly spawn from the entrance gopurams/gates naturally
    }

    if (state.entranceInflow) {
      engine.setEntranceInflow(state.entranceInflow);
    }
    engine.toggleAiQueueNavigation(state.aiQueueNavigationEnabled);
    engine.diversionApproved = state.diversionApproved;
    engine.onDiversionPrompt = (data) => {
      get().promptDiversionModal(data);
    };
    engine.arrivalsPaused = false;
    if (engine.pressureEngine) {
      engine.pressureEngine.reset();
    }

    const currentMetrics = engine.getMetrics();
    const currentCrowdState = engine.getCrowdState();
    const currentPressureState = engine.getPressureState();

    // Switch workspace mode to Simulation ('analysis') to display Live Entrance Flow panel
    try {
      useQueueStore.getState().setActiveSidebarTab?.('analysis');
    } catch {
      // Safe fallback if unmounted
    }

    set({
      engine,
      status: 'running',
      simulationRunning: true,
      arrivalsPaused: false,
      pathData: pathResult,
      simulatedComponentsHash: hash,
      layoutChangedNotice: false,
      agents: [...engine.agents],
      metrics: currentMetrics,
      crowdState: currentCrowdState,
      pressureState: currentPressureState,
      isSurging: engine.isSurgeActive,
      currentArrivalRate: currentMetrics.currentArrivalRate,
    });
  },

  runSimulation: (scene) => {
    get().startSimulation(scene);
  },

  /**
   * Seamlessly applies capacity expansion to simulation without resetting crowds or agent pools
   */
  applySceneExpansion: (newScene) => {
    if (!newScene) return;
    const pathResult = generateSimulationPaths(newScene);
    const hash = computeComponentsHash(newScene.components);
    const engine = get().engine;

    if (engine) {
      const newPressureState = engine.updateSceneAndPaths(newScene, pathResult.paths);
      set({
        pathData: pathResult,
        simulatedComponentsHash: hash,
        layoutChangedNotice: false,
        pressureState: newPressureState,
        metrics: engine.getMetrics(),
        crowdState: engine.getCrowdState(),
      });
    } else {
      set({
        pathData: pathResult,
        simulatedComponentsHash: hash,
        layoutChangedNotice: false,
      });
    }
  },

  resumeSimulation: () => {
    set({ status: 'running' });
  },

  pauseSimulation: () => {
    set({ status: 'paused' });
  },

  resetSimulation: (scene) => {
    const targetScene = scene || get().engine?.scene;
    let pathData = get().pathData;
    let hash = '';

    if (targetScene) {
      pathData = generateSimulationPaths(targetScene);
      hash = computeComponentsHash(targetScene.components);
    }

    const { engine } = get();
    if (engine?.pressureEngine) {
      engine.pressureEngine.reset();
    }

    set({
      engine: null,
      status: 'idle',
      simulationRunning: false,
      arrivalsPaused: false,
      diversionApproved: false,
      diversionApprovalModal: { isOpen: false, data: null },
      entranceInflow: get().entranceInflow || { north: 50, west: 25, east: 25 },
      selectedDevoteeId: null,
      selectedDevoteeDetails: null,
      agents: [],
      crowdState: null,
      pressureState: null,
      isSurging: false,
      layoutChangedNotice: false,
      simulatedComponentsHash: hash,
      metricsHistory: [],
      pathData,
      metrics: {
        simTimeSeconds: 0,
        formattedTime: '00:00',
        plannedCrowd: targetScene?.requirements?.expectedVisitors || targetScene?.requirements?.peakVisitors || 10000,
        totalEntered: 0,
        activeCrowd: 0,
        completedCrowd: 0,
        visitorsEntered: 0,
        visitorsActive: 0,
        visitorsInQueue: 0,
        visitorsInSecurity: 0,
        visitorsInDarshan: 0,
        visitorsCompleted: 0,
        currentArrivalRate: 0,
        isSurging: false,
        arrivalsPaused: false,
        avgWaitMinutes: 0,
        peakQueue: 0,
        throughputPerHour: 0,
        visualAgentsCount: 0,
        targetVisualAgents: pathData?.ready ? Math.min(300, Math.max(80, Math.round((targetScene?.requirements?.peakVisitors || 1500) / 5))) : 300,
        scaleFactor: 1,
        bottleneck: {
          zone: 'Queue Lane',
          reason: 'Simulation reset.',
        },
      },
    });
  },

  setSpeed: (speed) => {
    set({ speed });
  },

  setShowPaths: (showPaths) => {
    set({ showPaths });
  },

  setShowDensity: (showDensity) => {
    set({ showDensity });
  },

  // Crowd Load Actions
  setArrivalRate: (ratePerMinute) => {
    const { engine } = get();
    if (engine) engine.setArrivalRate(ratePerMinute);
    set({ currentArrivalRate: Math.max(0, Number(ratePerMinute) || 0) });
  },

  setEntranceInflow: (inflow) => {
    const { engine } = get();
    const updated = {
      north: Math.max(0, Number(inflow?.north) || 0),
      west: Math.max(0, Number(inflow?.west) || 0),
      east: Math.max(0, Number(inflow?.east) || 0),
    };
    if (engine) engine.setEntranceInflow(updated);
    set({ entranceInflow: updated });
  },

  setEntranceShare: (entranceKey, value) => {
    const { entranceInflow, setEntranceInflow } = get();
    const val = Math.max(0, Number(value) || 0);
    setEntranceInflow({
      ...entranceInflow,
      [entranceKey]: val,
    });
  },

  applySurgePreset: (presetKey) => {
    const presets = {
      test_90_20_20: { north: 90, west: 20, east: 20 },
      test_40_30_30: { north: 40, west: 30, east: 30 },
      balanced: { north: 50, west: 25, east: 25 },
      equal: { north: 34, west: 33, east: 33 },
      surge_north: { north: 85, west: 10, east: 5 },
      surge_west: { north: 15, west: 75, east: 10 },
      surge_east: { north: 15, west: 10, east: 75 },
      primary_north: { north: 100, west: 0, east: 0 },
    };
    const target = presets[presetKey] || presets.test_90_20_20;
    get().setEntranceInflow(target);
  },

  toggleAiQueueNavigation: (enabled) => {
    const { engine, aiQueueNavigationEnabled } = get();
    const nextVal = enabled !== undefined ? !!enabled : !aiQueueNavigationEnabled;
    if (engine) engine.toggleAiQueueNavigation(nextVal);
    set({ aiQueueNavigationEnabled: nextVal });
  },

  promptDiversionModal: (data) => {
    set({
      diversionApprovalModal: {
        isOpen: true,
        data,
      },
    });
  },

  closeDiversionModal: () => {
    set((s) => ({
      diversionApprovalModal: {
        ...s.diversionApprovalModal,
        isOpen: false,
      },
    }));
  },

  approveDiversion: () => {
    const { engine } = get();
    if (engine) {
      engine.approveDiversion(true);
    }
    set({
      diversionApproved: true,
      diversionApprovalModal: { isOpen: false, data: null },
    });
  },

  dismissDiversion: () => {
    const { engine } = get();
    if (engine) {
      engine.dismissDiversion();
    }
    set({
      diversionApproved: false,
      diversionApprovalModal: { isOpen: false, data: null },
    });
  },

  toggleSurge: (enabled) => {
    const { engine } = get();
    if (engine) {
      engine.toggleSurge(enabled);
      set({ isSurging: engine.isSurgeActive });
    } else {
      set((s) => ({ isSurging: enabled !== undefined ? !!enabled : !s.isSurging }));
    }
  },

  pauseArrivals: () => {
    const { engine } = get();
    if (engine) engine.pauseArrivals();
    set({
      arrivalsPaused: true,
      simulationRunning: true,
      status: 'running',
      ...(engine ? {
        metrics: engine.getMetrics(),
        crowdState: engine.getCrowdState(),
        pressureState: engine.getPressureState(),
      } : {}),
    });
  },

  resumeArrivals: () => {
    const { engine } = get();
    if (engine) engine.resumeArrivals();
    set({
      arrivalsPaused: false,
      simulationRunning: true,
      status: 'running',
      ...(engine ? {
        metrics: engine.getMetrics(),
        crowdState: engine.getCrowdState(),
        pressureState: engine.getPressureState(),
      } : {}),
    });
  },

  toggleArrivals: () => {
    const { engine, arrivalsPaused } = get();
    const nextPaused = !arrivalsPaused;
    if (engine) {
      if (nextPaused) engine.pauseArrivals();
      else engine.resumeArrivals();
    }
    set({
      arrivalsPaused: nextPaused,
      simulationRunning: true,
      status: 'running',
    });
  },

  addCrowdBatch: (count = 1000) => {
    const { engine } = get();
    if (engine) {
      engine.addCrowdBatch(count);
      const metrics = engine.getMetrics();
      const crowdState = engine.getCrowdState();
      const pressureState = engine.getPressureState();
      set({ metrics, crowdState, pressureState });
    }
  },

  getCrowdState: () => {
    const { engine } = get();
    return engine ? engine.getCrowdState() : get().crowdState;
  },

  getPressureState: () => {
    const { engine } = get();
    return engine ? engine.getPressureState() : get().pressureState;
  },

  getQueueDistribution: () => {
    const { engine } = get();
    return engine?.queueRouter ? engine.queueRouter.getDistributionMetrics() : null;
  },

  getExpansionEffectiveness: (stream = 'north') => {
    const { engine } = get();
    return engine?.queueRouter ? engine.queueRouter.getExpansionEffectiveness(stream) : null;
  },

  selectDevotee: (id) => {
    const { engine } = get();
    if (!engine) {
      set({ selectedDevoteeId: id, selectedDevoteeDetails: null });
      return null;
    }
    const details = engine.selectDevotee(id);
    set({
      selectedDevoteeId: details?.id || null,
      selectedDevoteeDetails: details,
    });
    return details;
  },

  clearSelectedDevotee: () => {
    const { engine } = get();
    if (engine) engine.selectDevotee(null);
    set({
      selectedDevoteeId: null,
      selectedDevoteeDetails: null,
    });
  },

  searchDevotees: (query, limit = 10) => {
    const { engine } = get();
    if (!engine) return [];
    return engine.searchDevotees(query, limit);
  },

  _lastUiSyncTime: 0,
  _lastSimSyncTime: 0,

  // Called each animation frame
  step: (delta) => {
    const { engine, simulationRunning, speed, agents, _lastUiSyncTime, _lastSimSyncTime, selectedDevoteeId } = get();
    if (!simulationRunning || !engine) return;

    // 1. Advance underlying simulation engine with full real-time delta
    engine.update(delta, speed);

    // 2. Throttle React store UI metrics dispatch to ~8 Hz (every 125ms) or every 0.5s simulated time
    // while allowing agent count changes to synchronize promptly
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const agentsChanged = engine.agents.length !== agents.length;
    const simTimeDelta = Math.abs(engine.simTime - (_lastSimSyncTime || 0));
    const shouldSyncUi = (now - (_lastUiSyncTime || 0)) >= 125 || agentsChanged || simTimeDelta >= 0.5;

    if (shouldSyncUi) {
      const metrics = engine.getMetrics();
      const crowdState = engine.getCrowdState();
      const pressureState = engine.getPressureState();
      const selectedDevoteeDetails = selectedDevoteeId ? engine.getSelectedDevoteeDetails() : null;
      set({
        _lastUiSyncTime: now,
        _lastSimSyncTime: engine.simTime,
        metrics,
        crowdState,
        pressureState,
        selectedDevoteeDetails,
        isSurging: engine.isSurgeActive,
        arrivalsPaused: engine.arrivalsPaused,
        currentArrivalRate: metrics.currentArrivalRate,
        diversionApproved: engine.diversionApproved,
        aiNavigationState: engine.aiNavigationState || get().aiNavigationState,
        metricsHistory: [...engine.metricsHistory],
        ...(agentsChanged ? { agents: [...engine.agents] } : {}),
      });
    }
  },

  // Checks if user modified components in the designer
  checkLayoutChange: (components) => {
    const { status, simulatedComponentsHash } = get();
    if (status === 'idle' || !simulatedComponentsHash) return;

    const currentHash = computeComponentsHash(components);
    if (currentHash !== simulatedComponentsHash) {
      set({
        status: 'paused',
        layoutChangedNotice: true,
      });
    }
  },
}));

function computeComponentsHash(components = []) {
  return components
    .map((c) => `${c.id}:${c.position.x.toFixed(1)},${c.position.z.toFixed(1)}:${c.dimensions?.length || 0}`)
    .join('|');
}
