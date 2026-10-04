import React, { useEffect, useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { toMeters } from '../../utils/units.js';
import { useQueueStore } from '../../store/useQueueStore.js';
import { COMPONENT_TYPES } from '../../utils/componentDefaults.js';

// Pre-allocated scratch vectors to guarantee ZERO per-frame garbage collection
const _vPos = new THREE.Vector3();
const _vTarget = new THREE.Vector3();

export function CameraController({ cameraMode, resetCount, length, width, unit }) {
  const { camera, gl, invalidate } = useThree();
  const controlsRef = useRef();
  const isTransforming = useQueueStore((state) => state.isTransforming);
  const cameraFocusTarget = useQueueStore((state) => state.cameraFocusTarget);
  const components = useQueueStore((state) => state.scene?.components || []);
  const selectedComponentId = useQueueStore((state) => state.selectedComponentId);

  const lengthMeters = toMeters(length, unit);
  const widthMeters = toMeters(width, unit);
  const maxDim = Math.max(lengthMeters, widthMeters, 20);

  // Smooth camera transition animation state
  const animRef = useRef({
    isAnimating: false,
    startPos: new THREE.Vector3(),
    destPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    destTarget: new THREE.Vector3(),
    startZoom: 1,
    destZoom: 1,
    elapsed: 0,
    duration: 0.90, // Smooth cinematic glide
  });

  // Calculate mathematically optimal overview distance tailored to campus bounds & aspect ratio
  const calculateFitOverview = useCallback(() => {
    const aspect = Math.max(0.5, gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight));
    const fovRad = THREE.MathUtils.degToRad(45);
    const tanHalfV = Math.tan(fovRad / 2);
    const tanHalfH = tanHalfV * aspect;

    // Required distance along vertical (site width Z) and horizontal (site length X)
    const distV = (widthMeters / 2) / tanHalfV;
    const distH = (lengthMeters / 2) / tanHalfH;
    const fitDistance = Math.max(distV, distH) * 1.18; // Balanced framing without excessive margin

    const target = new THREE.Vector3(0, 2.5, 0);
    const position = new THREE.Vector3(-fitDistance * 0.20, fitDistance * 0.72, fitDistance * 0.88);

    // Orthographic zoom target
    const orthoZoomX = gl.domElement.clientWidth / (lengthMeters * 1.15);
    const orthoZoomZ = gl.domElement.clientHeight / (widthMeters * 1.15);
    const orthoZoom = Math.max(2, Math.min(orthoZoomX, orthoZoomZ));

    return { target, position, orthoZoom, fitDistance };
  }, [gl, lengthMeters, widthMeters]);

  // Compute default positions for initial mount
  const get3DPosition = () => {
    const { position } = calculateFitOverview();
    return [position.x, position.y, position.z];
  };

  const get2DPosition = () => {
    return [0, maxDim * 2.2, 0.001]; // Slight Z offset for up-vector stability
  };

  const isFirstMountRef = useRef(true);
  const lastTargetTimestampRef = useRef(0);

  // Render loop hook: Always update OrbitControls damping + interpolate animations
  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (animRef.current.isAnimating) {
      const anim = animRef.current;
      anim.elapsed += delta;
      const rawT = Math.min(1.0, anim.elapsed / anim.duration);

      // Quintic smoothstep curve: 6t^5 - 15t^4 + 10t^3 (smoothest derivative, zero jerk)
      const t = rawT * rawT * rawT * (rawT * (rawT * 6 - 15) + 10);

      _vPos.lerpVectors(anim.startPos, anim.destPos, t);
      _vTarget.lerpVectors(anim.startTarget, anim.destTarget, t);

      camera.position.copy(_vPos);
      controls.target.copy(_vTarget);

      if (camera.isOrthographicCamera && anim.destZoom) {
        camera.zoom = THREE.MathUtils.lerp(anim.startZoom, anim.destZoom, t);
        camera.updateProjectionMatrix();
      }

      controls.update();

      if (rawT >= 1.0) {
        anim.isAnimating = false;
        controls.target.copy(anim.destTarget);
        camera.position.copy(anim.destPos);
        controls.update();
      }
    } else {
      // Continuously update OrbitControls for smooth inertia, damping, and zero-stutter rotation
      controls.update();
    }
  });

  // Cancel animation immediately on ANY user input (drag, click, or wheel scroll)
  useEffect(() => {
    const dom = gl.domElement;
    if (!dom) return;

    const handleUserInterrupt = () => {
      if (animRef.current.isAnimating) {
        animRef.current.isAnimating = false;
      }
    };

    dom.addEventListener('pointerdown', handleUserInterrupt, { passive: true });
    dom.addEventListener('wheel', handleUserInterrupt, { passive: true });
    dom.addEventListener('touchstart', handleUserInterrupt, { passive: true });

    return () => {
      dom.removeEventListener('pointerdown', handleUserInterrupt);
      dom.removeEventListener('wheel', handleUserInterrupt);
      dom.removeEventListener('touchstart', handleUserInterrupt);
    };
  }, [gl]);

  // Handle Camera Mode Changes & Reset Triggers ONLY (Never on resize or render)
  useEffect(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    animRef.current.isAnimating = false;
    const { target, position, orthoZoom } = calculateFitOverview();

    controls.target.copy(target);

    if (cameraMode === '2d') {
      const [x, y, z] = get2DPosition();
      camera.position.set(x, y, z);
      camera.up.set(0, 0, -1); // Length horizontal (X) and Width vertical (Z)

      if (camera.isOrthographicCamera) {
        camera.zoom = orthoZoom;
        camera.updateProjectionMatrix();
      }
    } else {
      // 3D Perspective Mode
      camera.position.copy(position);
      camera.up.set(0, 1, 0);
      if (camera.isPerspectiveCamera) {
        camera.updateProjectionMatrix();
      }
    }

    controls.update();
  }, [cameraMode, resetCount]); // STRICT DEPENDENCIES: Only run when mode switches or user clicks Reset!

  // Handle Professional Contextual Camera Presets with Smooth Gliding Transitions
  useEffect(() => {
    if (!controlsRef.current || !cameraFocusTarget) return;

    // Prevent duplicate re-execution from state/prop changes
    if (cameraFocusTarget.timestamp && cameraFocusTarget.timestamp === lastTargetTimestampRef.current) {
      return;
    }
    lastTargetTimestampRef.current = cameraFocusTarget.timestamp || Date.now();

    const controls = controlsRef.current;
    const { preset, targetComponentId } = cameraFocusTarget;

    let destPos = null;
    let destTarget = null;
    let destZoom = null;

    // 1. OVERVIEW & FIT SITE (Intelligent site-adaptive bounds)
    if (preset === 'overview' || preset === 'fit_site') {
      const fit = calculateFitOverview();
      destTarget = fit.target;
      destPos = fit.position;
      destZoom = fit.orthoZoom;
    }
    // 2. ENTRANCE VIEW (Arrival plaza, holding forecourt & North Gopuram)
    else if (
      preset === 'entrance' ||
      preset === 'entrance_view' ||
      preset === 'north_entrance' ||
      preset === 'focus_north_gopuram' ||
      preset === 'focus_entrance_gopuram'
    ) {
      const gopuram = components.find(
        (c) => c.role === 'north-gopuram' || c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM || c.type === COMPONENT_TYPES.ENTRANCE
      );
      if (gopuram) {
        // Positioned outside North Gopuram looking directly South through the open gateway into the inner courtyard, security, and queue lines beyond
        destPos = new THREE.Vector3(gopuram.position.x - 4, 11, gopuram.position.z - 30);
        destTarget = new THREE.Vector3(gopuram.position.x, 3.2, gopuram.position.z + 24);
      }
    }
    // 3. QUEUE VIEW (Focus on primary queue corridors & holding bays)
    else if (preset === 'queue' || preset === 'queue_view') {
      const queueComps = components.filter((c) => c.type === COMPONENT_TYPES.QUEUE);
      if (queueComps.length > 0) {
        let avgX = 0, avgZ = 0;
        queueComps.forEach((q) => { avgX += q.position.x; avgZ += q.position.z; });
        avgX /= queueComps.length;
        avgZ /= queueComps.length;
        destTarget = new THREE.Vector3(avgX, 2.5, avgZ);
        destPos = new THREE.Vector3(avgX - 26, 22, avgZ + 32);
      } else {
        const fit = calculateFitOverview();
        destTarget = fit.target;
        destPos = fit.position;
      }
    }
    // 4. SIMULATION VIEW (Dynamic operational crowd flow overview)
    else if (preset === 'simulation' || preset === 'simulation_view') {
      const fit = calculateFitOverview();
      destTarget = new THREE.Vector3(0, 3.0, -10);
      destPos = new THREE.Vector3(-fit.fitDistance * 0.24, fit.fitDistance * 0.62, fit.fitDistance * 0.72);
    }
    // 5. DARSHAN VIEW (Close Operational & Sacred Vista of Queue, Sanctum Portal, Shiva Deity, and Egress)
    else if (
      preset === 'darshan_view' ||
      preset === 'darshan_sanctum' ||
      preset === 'focus_darshan'
    ) {
      const sanctum = components.find(
        (c) =>
          c.type === COMPONENT_TYPES.DARSHAN_SANCTUM ||
          c.role === 'darshan-sanctum' ||
          c.type === COMPONENT_TYPES.DARSHAN
      );
      const sX = sanctum?.position?.x ?? 0;
      const sZ = sanctum?.position?.z ?? -10;

      // Positioned to clearly frame incoming devotees, darshan queue, sanctum portal & illuminated Shiva Lingam, and smooth departure
      destTarget = new THREE.Vector3(sX, 3.5, sZ + 2.5);
      destPos = new THREE.Vector3(sX - 16, 9.5, sZ + 18);
    }
    // 5b. DARSHAN INTERIOR (Devotee Human Eye-Level Experience Inside Sacred Approach & Sanctum)
    else if (
      preset === 'darshan_interior' ||
      preset === 'interior_darshan' ||
      preset === 'sanctum_interior'
    ) {
      const sanctum = components.find(
        (c) =>
          c.type === COMPONENT_TYPES.DARSHAN_SANCTUM ||
          c.role === 'darshan-sanctum' ||
          c.type === COMPONENT_TYPES.DARSHAN
      );
      const sX = sanctum?.position?.x ?? 0;
      const sZ = sanctum?.position?.z ?? -32;
      const sW = sanctum?.dimensions?.width ?? 18;

      // Positioned at human eye-level (y: 2.2m) inside the Mandapa approach corridor
      // Looking directly past Nandi and through the golden Torana doorway into the Garbhagriha at the Shiva Lingam
      destTarget = new THREE.Vector3(sX, 2.1, sZ - (sW * 0.20));
      destPos = new THREE.Vector3(sX + 1.2, 2.2, sZ + (sW * 0.42));
    }
    // 6. WEST ENTRANCE GOPURAM (Independent Western stream)
    else if (preset === 'west_entrance' || preset === 'focus_west_gopuram') {
      const gopuram = components.find((c) => c.role === 'west-gopuram');
      if (gopuram) {
        // Positioned outside West Gopuram looking East through open gateway into courtyard
        destPos = new THREE.Vector3(gopuram.position.x - 30, 11, gopuram.position.z - 4);
        destTarget = new THREE.Vector3(gopuram.position.x + 24, 3.2, gopuram.position.z);
      }
    }
    // 7. EAST ENTRANCE GOPURAM (Independent Eastern stream)
    else if (preset === 'east_entrance' || preset === 'focus_east_gopuram') {
      const gopuram = components.find((c) => c.role === 'east-gopuram');
      if (gopuram) {
        // Positioned outside East Gopuram looking West through open gateway into courtyard
        destPos = new THREE.Vector3(gopuram.position.x + 30, 11, gopuram.position.z - 4);
        destTarget = new THREE.Vector3(gopuram.position.x - 24, 3.2, gopuram.position.z);
      }
    }
    // 8. MAIN DARSHAN GOPURAM (Central Raja Gopuram & Sacred Courtyard)
    else if (preset === 'main_darshan' || preset === 'focus_main_gopuram') {
      const gopuram = components.find((c) => c.type === COMPONENT_TYPES.MAIN_GOPURAM);
      if (gopuram) {
        destPos = new THREE.Vector3(gopuram.position.x - 22, 18, gopuram.position.z + 32);
        destTarget = new THREE.Vector3(gopuram.position.x, 9.0, gopuram.position.z);
      }
    }
    // 8b. GOPURAM CLOSE-UP INSPECTION CAMERA (10-16m close inspection of tier facade, bays, niches & cornices)
    else if (
      preset === 'gopuram_closeup' ||
      preset === 'gopuram_detail' ||
      preset === 'gopuram_inspection' ||
      preset === 'north_gopuram_closeup'
    ) {
      const gopuram = components.find((c) => c.role === 'north-gopuram' || c.type === COMPONENT_TYPES.ENTRANCE_GOPURAM);
      if (gopuram) {
        // 14 meters away, elevated at 7.5m, angled 3/4 view to clearly inspect facade relief and side articulation
        destPos = new THREE.Vector3(gopuram.position.x - 10, 7.5, gopuram.position.z - 14);
        destTarget = new THREE.Vector3(gopuram.position.x, 8.5, gopuram.position.z);
      }
    }
    // 7. SOUTH EXIT GOPURAM (Dedicated Post-Darshan Egress)
    else if (preset === 'south_exit' || preset === 'focus_south_gopuram') {
      const gopuram = components.find((c) => c.role === 'south-gopuram');
      if (gopuram) {
        // Positioned inside exit courtyard looking South through the open South Exit Gopuram portal
        destPos = new THREE.Vector3(gopuram.position.x - 14, 11, gopuram.position.z - 28);
        destTarget = new THREE.Vector3(gopuram.position.x, 3.2, gopuram.position.z + 20);
      }
    }
    // 8. SELECTED COMPONENT OR QUEUE
    else if (preset === 'selected_component' || preset === 'focus_selected') {
      const compId = targetComponentId || selectedComponentId;
      const comp = components.find((c) => c.id === compId);
      if (comp) {
        const h = comp.dimensions?.height || 2;
        destTarget = new THREE.Vector3(comp.position.x, h * 0.5, comp.position.z);
        destPos = new THREE.Vector3(comp.position.x - 18, Math.max(10, h * 1.5), comp.position.z + 20);
      }
    }
    // FIT CROWD SYSTEM BOUNDS
    else if (preset === 'fit_crowd') {
      const crowdComps = components.filter(
        (c) =>
          c.type === COMPONENT_TYPES.QUEUE ||
          c.type === COMPONENT_TYPES.HOLDING ||
          c.type === COMPONENT_TYPES.SECURITY ||
          c.type === COMPONENT_TYPES.ENTRANCE ||
          c.type === COMPONENT_TYPES.DARSHAN
      );
      if (crowdComps.length > 0) {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        crowdComps.forEach((c) => {
          const halfL = (c.dimensions?.length || 4) / 2;
          const halfW = (c.dimensions?.width || 2) / 2;
          minX = Math.min(minX, c.position.x - halfL);
          maxX = Math.max(maxX, c.position.x + halfL);
          minZ = Math.min(minZ, c.position.z - halfW);
          maxZ = Math.max(maxZ, c.position.z + halfW);
        });
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        const spanX = maxX - minX;
        const spanZ = maxZ - minZ;
        const maxSpan = Math.max(spanX, spanZ, 40);

        destTarget = new THREE.Vector3(centerX, 2.5, centerZ);
        destPos = new THREE.Vector3(centerX - maxSpan * 0.32, maxSpan * 0.52 + 10, centerZ + maxSpan * 0.52);
      } else {
        const fit = calculateFitOverview();
        destTarget = fit.target;
        destPos = fit.position;
      }
    }

    if (destPos && destTarget) {
      if (cameraMode === '3d') {
        // Smooth cinematic glide to context target
        animRef.current = {
          isAnimating: true,
          startPos: camera.position.clone(),
          destPos: destPos,
          startTarget: controls.target.clone(),
          destTarget: destTarget,
          startZoom: camera.zoom,
          destZoom: destZoom,
          elapsed: 0,
          duration: 0.90,
        };
      } else {
        // In 2D mode, smoothly glide position and target
        controls.target.copy(destTarget);
        camera.position.set(destTarget.x, maxDim * 2.2, destTarget.z + 0.001);
        if (destZoom && camera.isOrthographicCamera) {
          camera.zoom = destZoom;
          camera.updateProjectionMatrix();
        }
        controls.update();
      }
    }
  }, [cameraFocusTarget]);

  return (
    <>
      {/* 3D Perspective Camera */}
      <PerspectiveCamera
        makeDefault={cameraMode === '3d'}
        fov={45}
        near={0.5}
        far={2500}
        position={get3DPosition()}
      />

      {/* 2D Design Orthographic Camera */}
      <OrthographicCamera
        makeDefault={cameraMode === '2d'}
        near={0.1}
        far={3500}
        position={get2DPosition()}
      />

      {/* Professional Smooth OrbitControls */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={!isTransforming}
        enableDamping
        dampingFactor={0.065} // Buttery smooth, responsive damping
        rotateSpeed={0.85}    // Natural rotation sensitivity
        panSpeed={0.85}       // Responsive, natural mouse-follow pan
        zoomSpeed={0.95}      // Smooth exponential wheel zoom without stepping or jumping
        screenSpacePanning    // DCC standard screen-space panning
        enableRotate={cameraMode === '3d'}
        maxPolarAngle={Math.PI / 2 - 0.04} // Prevent ground plane clipping
        minPolarAngle={0.05}              // Prevent top-down gimbal lock
        minDistance={2.0}                  // Close human & queue inspection
        maxDistance={Math.max(lengthMeters, widthMeters, 250) * 3.5}
        mouseButtons={{
          LEFT: cameraMode === '3d' ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />
    </>
  );
}
