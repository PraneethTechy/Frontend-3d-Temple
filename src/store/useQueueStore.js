import { create } from 'zustand';
import { UNITS, toMeters } from '../../shared/units.js';
import { createInitialScene } from '../../shared/constants.js';
import { createComponentInstance, COMPONENT_TYPES } from '../utils/componentDefaults.js';
import { generateProceduralLayout, QUEUE_TEMPLATES, DEFAULT_GENERATION_OPTIONS } from '../services/layout/layoutGenerator.js';
import { generateFestivalScenario } from '../services/layout/festivalScenarioGenerator.js';
import { validateLayout } from '../services/layout/layoutValidator.js';
import { generateDeterministicExpansionComponents } from '../services/layout/capacityExpansionPlanner.js';
import { 
  fetchSavedPlans, 
  fetchPlanById, 
  saveNewPlan, 
  updateExistingPlan, 
  deletePlanById 
} from '../services/api/planService.js';
import { useSimulationStore } from '../features/simulation/simulationStore.js';

function computeBoundary(length, width, unit) {
  const lMeters = toMeters(length, unit);
  const wMeters = toMeters(width, unit);
  const halfL = lMeters / 2;
  const halfW = wMeters / 2;

  return [
    { x: -halfL, y: 0, z: -halfW },
    { x: halfL, y: 0, z: -halfW },
    { x: halfL, y: 0, z: halfW },
    { x: -halfL, y: 0, z: halfW },
  ];
}

const MAX_HISTORY = 40;

export const useQueueStore = create((set, get) => ({
  // Single Source of Truth Scene Model
  scene: {
    temple: {
      name: '',
    },
    site: {
      unit: UNITS.METERS,
      length: 0,
      width: 0,
      boundary: [],
    },
    requirements: {
      expectedVisitors: 0,
      peakVisitors: 0,
    },
    components: [],
    paths: [],
    analysis: {
      valid: true,
      errors: [],
      warnings: [],
      metrics: null,
    },
  },

  // Interactive 3D Designer State
  selectedComponentId: null,
  transformMode: 'translate', // 'translate' | 'rotate'
  snapEnabled: true,
  snapSize: 1.0, // 1 meter default snapping
  isTransforming: false, // true while dragging via TransformControls (disables OrbitControls)

  // Procedural Generator State
  generationOptions: { ...DEFAULT_GENERATION_OPTIONS },
  activeSidebarTab: 'info', // 'info' | 'planner' | 'analysis' | 'ai'

  // Phase 4: AI Assisted Layout State
  previewLayout: null,
  isPreviewing: false,

  // Phase 6: Persistence & Save/Load State
  savedPlanId: null,
  savedPlanName: '',
  isDirty: false,
  isSaving: false,
  isLoadingPlans: false,
  savedPlansList: [],
  isSaveModalOpen: false,
  isPlansModalOpen: false,

  setSaveModalOpen: (isOpen) => set({ isSaveModalOpen: isOpen }),
  setPlansModalOpen: (isOpen) => set({ isPlansModalOpen: isOpen }),
  setSavedPlanName: (name) => set({ savedPlanName: name }),
  markDirty: () => set({ isDirty: true }),

  // Undo / Redo History
  history: {
    past: [],
    future: [],
  },

  // UI & Viewport State
  isInitialized: false,
  isFormModalOpen: false,
  cameraMode: '3d', // '3d' (perspective) | '2d' (orthographic top-down)
  cameraResetCount: 0,
  cameraFocusTarget: null, // { preset: string, targetComponentId?: string, timestamp: number }

  // Phase 8: Immersive 3D Review & Studio Layout States
  isImmersive: false,
  leftPanelCollapsed: false,
  leftPanelWidth: 320,
  rightPanelCollapsed: false,
  showFlow: false,
  showLabels: true,

  // Viewport Actions
  setCameraMode: (mode) => set({ cameraMode: mode }),
  triggerResetCamera: () => set((state) => ({ cameraResetCount: state.cameraResetCount + 1 })),
  focusCamera: (preset, targetComponentId = null) =>
    set({
      cameraFocusTarget: {
        preset,
        targetComponentId,
        timestamp: Date.now(),
      },
    }),
  toggleImmersive: () => set((state) => ({ isImmersive: !state.isImmersive })),
  setIsImmersive: (isImmersive) => set({ isImmersive: !!isImmersive }),
  toggleLeftPanel: () => set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  setLeftPanelCollapsed: (collapsed) => set({ leftPanelCollapsed: !!collapsed }),
  setLeftPanelWidth: (width) => set({ leftPanelWidth: Math.max(260, Math.min(650, Number(width) || 320)) }),
  toggleRightPanel: () => set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),
  setRightPanelCollapsed: (collapsed) => set({ rightPanelCollapsed: !!collapsed }),
  toggleShowFlow: () => set((state) => ({ showFlow: !state.showFlow })),
  setShowFlow: (show) => set({ showFlow: !!show }),
  toggleShowLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  setShowLabels: (show) => set({ showLabels: !!show }),

  setFormModalOpen: (isOpen) => set({ isFormModalOpen: isOpen }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  setSnapSize: (snapSize) => set({ snapSize: Number(snapSize) }),
  setIsTransforming: (isTransforming) => set({ isTransforming }),
  setSelectedComponentId: (id) => set({ selectedComponentId: id }),
  setGenerationOptions: (options) => set((state) => ({
    generationOptions: { ...state.generationOptions, ...options },
  })),
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),

  // Push Snapshot to History Helper
  recordSnapshot: () => {
    const state = get();
    const currentComponents = JSON.parse(JSON.stringify(state.scene.components));
    const newPast = [...state.history.past, currentComponents];
    if (newPast.length > MAX_HISTORY) newPast.shift();

    set({
      history: {
        past: newPast,
        future: [],
      },
    });
  },

  // Run Layout Validation and update analysis
  runValidation: () => {
    const scene = get().scene;
    const analysis = validateLayout(scene);
    set({
      scene: {
        ...scene,
        analysis,
      },
    });
    return analysis;
  },

  // Procedural Layout Generation Action
  generateLayout: (options) => {
    const currentScene = get().scene;
    const opts = options || get().generationOptions;

    // Run procedural layout generator engine
    const result = generateProceduralLayout(currentScene, opts);
    if (!result.success) {
      return result;
    }

    // Record snapshot for single-operation undo
    get().recordSnapshot();

    // Preserve user-created manual components that are not part of previous generated layout
    const manualComponents = currentScene.components.filter((c) => !c.generated);
    const combinedComponents = [...manualComponents, ...result.components];

    const updatedScene = {
      ...currentScene,
      components: combinedComponents,
      analysis: result.validation,
    };

    set({
      scene: updatedScene,
      selectedComponentId: null,
      activeSidebarTab: 'analysis', // automatically display analysis after generation
      isDirty: true,
    });

    return result;
  },

  // Large-Scale 100K Festival Scenario Loader
  loadFestivalScenario: () => {
    get().recordSnapshot();
    const result = generateFestivalScenario();
    if (!result.success) return result;

    try {
      useSimulationStore.getState().resetSimulation(result.scene);
    } catch (e) {}

    set((state) => ({
      scene: result.scene,
      isInitialized: true,
      isDirty: true,
      selectedComponentId: null,
      previewLayout: null,
      isPreviewing: false,
      cameraResetCount: state.cameraResetCount + 1,
      activeSidebarTab: 'analysis',
    }));

    return result;
  },

  // Align Queue Infrastructure to Temple Axis
  alignQueueToTempleAxis: () => {
    const scene = get().scene;
    const mainGopuram = scene.components.find((c) => c.type === COMPONENT_TYPES.MAIN_GOPURAM);
    const sanctum = scene.components.find((c) => c.type === COMPONENT_TYPES.DARSHAN_SANCTUM || c.type === COMPONENT_TYPES.DARSHAN);
    if (!mainGopuram && !sanctum) return;

    get().recordSnapshot();

    // Calculate axis target angle
    const targetZ = sanctum ? sanctum.position.z : (mainGopuram ? mainGopuram.position.z : 0);
    const updatedComponents = scene.components.map((comp) => {
      // Re-align queues and barriers to align with temple axis direction
      if (comp.type === COMPONENT_TYPES.QUEUE) {
        return {
          ...comp,
          position: { ...comp.position, z: comp.position.z },
          rotation: 0, // Aligned parallel to east-west sacred axis
        };
      }
      return comp;
    });

    const updatedScene = { ...scene, components: updatedComponents };
    updatedScene.analysis = validateLayout(updatedScene);

    set({
      scene: updatedScene,
      isDirty: true,
    });
  },

  // Clear Generated Layout Components
  clearGeneratedLayout: () => {
    const currentScene = get().scene;
    get().recordSnapshot();

    const manualOnly = currentScene.components.filter((c) => !c.generated);
    const updatedScene = {
      ...currentScene,
      components: manualOnly,
    };

    const analysis = validateLayout(updatedScene);
    updatedScene.analysis = analysis;

    set({
      scene: updatedScene,
      selectedComponentId: null,
      isDirty: true,
    });
  },

  // AI Layout 3D Preview Actions
  startPreview: (recommendation) => {
    if (!recommendation || !recommendation.fits) return;
    set({
      previewLayout: recommendation,
      isPreviewing: true,
      selectedComponentId: null,
    });
  },

  exitPreview: () => {
    set({
      previewLayout: null,
      isPreviewing: false,
    });
  },

  applyAiRecommendation: (recommendation) => {
    const targetRec = recommendation || get().previewLayout;
    if (!targetRec || !targetRec.components || targetRec.components.length === 0) return;

    // 1. Record snapshot for single-operation undo
    get().recordSnapshot();

    const currentScene = get().scene;
    // Preserve manual components
    const manualComponents = currentScene.components.filter((c) => !c.generated);
    const combinedComponents = [...manualComponents, ...targetRec.components];

    const updatedScene = {
      ...currentScene,
      components: combinedComponents,
      analysis: targetRec.analysis || validateLayout({ ...currentScene, components: combinedComponents }),
    };

    set({
      scene: updatedScene,
      previewLayout: null,
      isPreviewing: false,
      selectedComponentId: null,
      activeSidebarTab: 'analysis',
      isDirty: true,
    });
  },

  // Capacity Expansion 3D Preview & Apply Actions
  startCapacityExpansionPreview: (planResult) => {
    if (!planResult) return;
    const currentScene = get().scene;
    let expansionComponents = planResult.proposedComponents;

    if (!expansionComponents || expansionComponents.length === 0) {
      if (planResult.plan) {
        const genRes = generateDeterministicExpansionComponents(planResult.plan, currentScene);
        if (genRes.success) {
          expansionComponents = genRes.components;
        }
      }
    }

    if (!expansionComponents || expansionComponents.length === 0) return;

    const targetZone = planResult.plan?.targetZone || 'north';
    const previewLayout = {
      type: 'capacity_expansion',
      id: `cap-exp-preview-${Date.now()}`,
      title: `Capacity Expansion: +${expansionComponents.length} Lanes (${targetZone.toUpperCase()})`,
      plan: planResult.plan,
      expansionComponents,
      additionalCapacity: planResult.expectedCapacityIncrease || 0,
      expectedCapacityIncrease: planResult.expectedCapacityIncrease || 0,
      targetZone,
      // Render existing temple architecture + proposed expansion components together in preview
      components: [...currentScene.components, ...expansionComponents],
      analysis: validateLayout({ ...currentScene, components: [...currentScene.components, ...expansionComponents] }),
    };

    set({
      previewLayout,
      isPreviewing: true,
      selectedComponentId: null,
    });
  },

  discardCapacityExpansion: () => {
    set({
      previewLayout: null,
      isPreviewing: false,
    });
  },

  applyCapacityExpansion: (expansionInput) => {
    const preview = get().previewLayout;
    let expansionComponents = expansionInput?.expansionComponents || expansionInput?.proposedComponents;

    if (!expansionComponents && preview?.type === 'capacity_expansion') {
      expansionComponents = preview.expansionComponents;
    }

    if (!expansionComponents && expansionInput?.plan) {
      const genRes = generateDeterministicExpansionComponents(expansionInput.plan, get().scene);
      if (genRes.success) {
        expansionComponents = genRes.components;
      }
    }

    if (!Array.isArray(expansionComponents) || expansionComponents.length === 0) return;

    // 1. Record snapshot for ONE single undoable operation
    get().recordSnapshot();

    const currentScene = get().scene;
    // 2. Strictly additive: preserve existing temple architecture, Gopurams, Sanctum, queues
    const updatedComponents = [...currentScene.components, ...expansionComponents];

    const updatedScene = {
      ...currentScene,
      components: updatedComponents,
    };
    updatedScene.analysis = validateLayout(updatedScene);

    set({
      scene: updatedScene,
      previewLayout: null,
      isPreviewing: false,
      selectedComponentId: null,
      activeSidebarTab: 'analysis',
      isDirty: true,
    });

    // 3. Seamlessly apply to running simulation: regenerate paths, recalculate pressure
    try {
      useSimulationStore.getState().applySceneExpansion(updatedScene);
    } catch (e) {}
  },

  // Phase 6: Persistence Actions
  fetchSavedPlans: async () => {
    set({ isLoadingPlans: true });
    const res = await fetchSavedPlans();
    set({
      savedPlansList: res.success ? res.data : [],
      isLoadingPlans: false,
    });
    return res;
  },

  saveCurrentPlan: async (name) => {
    set({ isSaving: true });
    const { scene, savedPlanId } = get();
    const planName = (name || get().savedPlanName || `${scene.temple?.name || 'Temple'} Queue Plan`).trim();

    let res;
    if (savedPlanId) {
      res = await updateExistingPlan(savedPlanId, { name: planName, scene });
    } else {
      res = await saveNewPlan({ name: planName, scene });
    }

    set({ isSaving: false });

    if (res.success && res.data) {
      const planId = res.data._id || res.data.id;
      set({
        savedPlanId: planId,
        savedPlanName: planName,
        isDirty: false,
      });
      get().fetchSavedPlans();
    }

    return res;
  },

  loadSavedPlan: async (id) => {
    set({ isLoadingPlans: true });
    const res = await fetchPlanById(id);
    set({ isLoadingPlans: false });

    if (!res.success || !res.data) {
      return res;
    }

    const plan = res.data;

    // Construct restored Scene JSON
    const restoredScene = {
      temple: {
        name: plan.templeName || 'Sanctuary',
      },
      site: {
        unit: plan.site?.unit || UNITS.METERS,
        length: plan.site?.length || 60,
        width: plan.site?.width || 35,
        boundary: plan.site?.boundary || computeBoundary(plan.site?.length || 60, plan.site?.width || 35, plan.site?.unit || UNITS.METERS),
      },
      requirements: {
        expectedVisitors: plan.requirements?.expectedVisitors || 0,
        peakVisitors: plan.requirements?.peakVisitors || 0,
      },
      components: plan.components || [],
      paths: plan.paths || [],
      analysis: {
        valid: true,
        errors: [],
        warnings: [],
        metrics: null,
      },
    };

    // Re-run deterministic validator & capacity calculation
    restoredScene.analysis = validateLayout(restoredScene);

    // Reset Simulation
    try {
      useSimulationStore.getState().resetSimulation(restoredScene);
    } catch (e) {}

    set((state) => ({
      scene: restoredScene,
      savedPlanId: plan._id || plan.id,
      savedPlanName: plan.name,
      isDirty: false,
      isInitialized: true,
      selectedComponentId: null,
      previewLayout: null,
      isPreviewing: false,
      history: { past: [], future: [] },
      cameraResetCount: state.cameraResetCount + 1,
      activeSidebarTab: 'analysis',
    }));

    return { success: true, data: restoredScene };
  },

  deleteSavedPlan: async (id) => {
    const res = await deletePlanById(id);
    if (res.success) {
      set((state) => ({
        savedPlansList: state.savedPlansList.filter((p) => (p._id || p.id) !== id),
        savedPlanId: state.savedPlanId === id ? null : state.savedPlanId,
        savedPlanName: state.savedPlanId === id ? '' : state.savedPlanName,
      }));
    }
    return res;
  },

  newPlan: () => {
    const { isDirty, resetAll, setFormModalOpen } = get();
    if (isDirty) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes in your current plan. Start a new plan anyway?'
      );
      if (!confirmDiscard) return;
    }

    try {
      useSimulationStore.getState().resetSimulation();
    } catch (e) {}

    resetAll();
    set({
      savedPlanId: null,
      savedPlanName: '',
      isDirty: false,
      isFormModalOpen: true,
    });
  },

  // Undo Action
  undo: () => {
    const { history, scene } = get();
    if (history.past.length === 0) return;

    const previousComponents = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    const currentComponents = JSON.parse(JSON.stringify(scene.components));

    const updatedScene = {
      ...scene,
      components: previousComponents,
    };
    updatedScene.analysis = validateLayout(updatedScene);

    set({
      scene: updatedScene,
      history: {
        past: newPast,
        future: [currentComponents, ...history.future],
      },
      selectedComponentId: previousComponents.some((c) => c.id === get().selectedComponentId)
        ? get().selectedComponentId
        : null,
      isDirty: true,
    });

    try {
      useSimulationStore.getState().applySceneExpansion(updatedScene);
    } catch (e) {}
  },

  // Redo Action
  redo: () => {
    const { history, scene } = get();
    if (history.future.length === 0) return;

    const nextComponents = history.future[0];
    const newFuture = history.future.slice(1);
    const currentComponents = JSON.parse(JSON.stringify(scene.components));

    const updatedScene = {
      ...scene,
      components: nextComponents,
    };
    updatedScene.analysis = validateLayout(updatedScene);

    set({
      scene: updatedScene,
      history: {
        past: [...history.past, currentComponents],
        future: newFuture,
      },
      selectedComponentId: nextComponents.some((c) => c.id === get().selectedComponentId)
        ? get().selectedComponentId
        : null,
      isDirty: true,
    });

    try {
      useSimulationStore.getState().applySceneExpansion(updatedScene);
    } catch (e) {}
  },

  // Component Management Actions
  addComponent: (type) => {
    get().recordSnapshot();
    const currentComponents = get().scene.components;
    const countForType = currentComponents.filter((c) => c.type === type).length + 1;
    const newComponent = createComponentInstance(type, countForType, currentComponents.length);

    const updatedComponents = [...currentComponents, newComponent];
    const updatedScene = {
      ...get().scene,
      components: updatedComponents,
    };
    updatedScene.analysis = validateLayout(updatedScene);

    set({
      scene: updatedScene,
      selectedComponentId: newComponent.id,
      isDirty: true,
    });

    return newComponent.id;
  },

  updateComponent: (id, partialUpdates, recordHistory = false) => {
    if (recordHistory) {
      get().recordSnapshot();
    }

    const currentScene = get().scene;
    const updatedComponents = currentScene.components.map((comp) => {
      if (comp.id !== id) return comp;
      return {
        ...comp,
        ...partialUpdates,
        position: {
          ...comp.position,
          ...(partialUpdates.position || {}),
          y: 0, // Ensure height stays locked to horizontal floor plane!
        },
        dimensions: {
          ...comp.dimensions,
          ...(partialUpdates.dimensions || {}),
        },
        properties: {
          ...comp.properties,
          ...(partialUpdates.properties || {}),
        },
      };
    });

    const updatedScene = {
      ...currentScene,
      components: updatedComponents,
    };

    if (recordHistory) {
      updatedScene.analysis = validateLayout(updatedScene);
    }

    set({ scene: updatedScene, isDirty: true });
  },

  duplicateComponent: (id) => {
    const compToDup = get().scene.components.find((c) => c.id === id);
    if (!compToDup) return;

    get().recordSnapshot();

    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const newId = `${compToDup.type}-${uniqueSuffix}`;

    const duplicated = {
      ...JSON.parse(JSON.stringify(compToDup)),
      id: newId,
      name: `${compToDup.name} (Copy)`,
      generated: false, // User duplication makes it a manual component
      position: {
        x: compToDup.position.x + 2,
        y: 0,
        z: compToDup.position.z + 2,
      },
    };

    const updatedComponents = [...get().scene.components, duplicated];
    const updatedScene = {
      ...get().scene,
      components: updatedComponents,
    };
    updatedScene.analysis = validateLayout(updatedScene);

    set({
      scene: updatedScene,
      selectedComponentId: newId,
      isDirty: true,
    });
  },

  deleteComponent: (id) => {
    if (!id) return;
    get().recordSnapshot();

    const updatedComponents = get().scene.components.filter((c) => c.id !== id);
    const updatedScene = {
      ...get().scene,
      components: updatedComponents,
    };
    updatedScene.analysis = validateLayout(updatedScene);

    set({
      scene: updatedScene,
      selectedComponentId: get().selectedComponentId === id ? null : get().selectedComponentId,
      isDirty: true,
    });
  },

  // Space Lifecycle Actions
  createSpace: ({ templeName, length, width, unit, expectedVisitors, peakVisitors }) => {
    const boundary = computeBoundary(length, width, unit);
    const initialScene = {
      temple: {
        name: templeName.trim(),
      },
      site: {
        unit,
        length: Number(length),
        width: Number(width),
        boundary,
      },
      requirements: {
        expectedVisitors: Number(expectedVisitors),
        peakVisitors: Number(peakVisitors),
      },
      components: [],
      paths: [],
      analysis: {
        valid: true,
        errors: [],
        warnings: [],
        metrics: null,
      },
    };

    initialScene.analysis = validateLayout(initialScene);

    set({
      isInitialized: true,
      isFormModalOpen: false,
      selectedComponentId: null,
      history: { past: [], future: [] },
      scene: initialScene,
      activeSidebarTab: 'planner', // default to queue planner upon space creation!
    });
  },

  updateDimensions: ({ length, width, unit }) => {
    const currentScene = get().scene;
    const resolvedUnit = unit || currentScene.site.unit;
    const resolvedLength = Number(length !== undefined ? length : currentScene.site.length);
    const resolvedWidth = Number(width !== undefined ? width : currentScene.site.width);
    const boundary = computeBoundary(resolvedLength, resolvedWidth, resolvedUnit);

    const updatedScene = {
      ...currentScene,
      site: {
        ...currentScene.site,
        unit: resolvedUnit,
        length: resolvedLength,
        width: resolvedWidth,
        boundary,
      },
    };
    updatedScene.analysis = validateLayout(updatedScene);

    set({ scene: updatedScene, isDirty: true });
  },

  loadFestivalScenario: () => {
    const result = generateFestivalScenario();
    if (!result || !result.scene) return;

    set({
      scene: result.scene,
      isInitialized: true,
      isFormModalOpen: false,
      cameraMode: '3d',
      selectedComponentId: null,
      isDirty: true,
      history: {
        past: [JSON.parse(JSON.stringify(result.scene.components))],
        future: [],
      },
    });

    // Auto fit entire site view
    get().focusCamera('fit_site');
  },

  alignQueueToTempleAxis: () => {
    const state = get();
    const components = state.scene.components || [];
    const mainGopuram = components.find((c) => c.type === COMPONENT_TYPES.MAIN_GOPURAM);
    const sanctum = components.find((c) => c.type === COMPONENT_TYPES.DARSHAN_SANCTUM);

    if (!mainGopuram && !sanctum) return;

    state.recordSnapshot();

    // Orient queues towards the temple axis
    const updatedComponents = components.map((c) => {
      if (c.type === COMPONENT_TYPES.QUEUE) {
        return {
          ...c,
          rotation: 0,
        };
      }
      return c;
    });

    const updatedScene = {
      ...state.scene,
      components: updatedComponents,
    };
    updatedScene.analysis = validateLayout(updatedScene);

    set({
      scene: updatedScene,
      isDirty: true,
    });
  },

  resetAll: () => {
    set({
      isInitialized: false,
      isFormModalOpen: false,
      cameraMode: '3d',
      selectedComponentId: null,
      history: { past: [], future: [] },
      activeSidebarTab: 'info',
      scene: {
        temple: {
          name: '',
        },
        site: {
          unit: UNITS.METERS,
          length: 0,
          width: 0,
          boundary: [],
        },
        requirements: {
          expectedVisitors: 0,
          peakVisitors: 0,
        },
        components: [],
        paths: [],
        analysis: {
          valid: true,
          errors: [],
          warnings: [],
          metrics: null,
        },
      },
    });
  },
}));
