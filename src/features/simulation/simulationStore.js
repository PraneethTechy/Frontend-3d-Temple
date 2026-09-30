/**
 * DevaSetu Crowd Simulation Zustand Store
 * Manages simulation lifecycle, playback controls, visualization toggles,
 * real-time metrics, D3 history, and layout change detection.
 */

import { create } from 'zustand';
import { SimulationEngine } from './simulationEngine.js';
import { generateSimulationPaths } from './simulationPaths.js';

export const useSimulationStore = create((set, get) => ({
  engine: null,
  status: 'idle', // 'idle' | 'running' | 'paused'
  speed: 1.0, // 0.5 | 1.0 | 2.0 | 4.0
  showPaths: true,
  showDensity: false,
  agents: [], // Active rendered devotee instances

  // Real calculated metrics
  metrics: {
    simTimeSeconds: 0,
    formattedTime: '00:00',
    visitorsEntered: 0,
    visitorsActive: 0,
    visitorsInQueue: 0,
    visitorsInSecurity: 0,
    visitorsInDarshan: 0,
    visitorsCompleted: 0,
    avgWaitMinutes: 0,
    peakQueue: 0,
    throughputPerHour: 0,
    visualAgentsCount: 0,
    targetVisualAgents: 300,
    scaleFactor: 5,
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
      });
      return;
    }

    let engine = state.engine;
    const hash = computeComponentsHash(currentScene.components);

    // Create fresh engine if idle, or if layout changed
    if (!engine || state.status === 'idle' || state.layoutChangedNotice) {
      engine = new SimulationEngine(currentScene, pathResult.paths);
      engine.seedInitialAgents();
    }

    const currentMetrics = engine.getMetrics();

    set({
      engine,
      status: 'running',
      pathData: pathResult,
      simulatedComponentsHash: hash,
      layoutChangedNotice: false,
      agents: [...engine.agents],
      metrics: currentMetrics,
    });
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

    set({
      engine: null,
      status: 'idle',
      agents: [],
      layoutChangedNotice: false,
      simulatedComponentsHash: hash,
      metricsHistory: [],
      pathData,
      metrics: {
        simTimeSeconds: 0,
        formattedTime: '00:00',
        visitorsEntered: 0,
        visitorsActive: 0,
        visitorsInQueue: 0,
        visitorsInSecurity: 0,
        visitorsInDarshan: 0,
        visitorsCompleted: 0,
        avgWaitMinutes: 0,
        peakQueue: 0,
        throughputPerHour: 0,
        visualAgentsCount: 0,
        targetVisualAgents: pathData?.ready ? Math.min(300, Math.max(80, Math.round((targetScene?.requirements?.peakVisitors || 1500) / 5))) : 300,
        scaleFactor: 5,
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

  _lastUiSyncTime: 0,

  // Called each animation frame
  step: (delta) => {
    const { engine, status, speed, agents, _lastUiSyncTime } = get();
    if (status !== 'running' || !engine) return;

    // 1. Advance underlying simulation engine with full real-time delta
    engine.update(delta, speed);

    // 2. Throttle React store UI metrics dispatch to ~8 Hz (every 125ms)
    // while allowing agent count changes to synchronize promptly
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const agentsChanged = engine.agents.length !== agents.length;
    const shouldSyncUi = (now - (_lastUiSyncTime || 0)) >= 125 || agentsChanged;

    if (shouldSyncUi) {
      const metrics = engine.getMetrics();
      set({
        _lastUiSyncTime: now,
        metrics,
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
