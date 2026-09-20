'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { VehicleRemoteState } from '@/lib/vehicle-remote';
import {
  parseVehicleColour,
  resolveVehicleModelAsset,
  vehicleModelLabel,
  type VehicleModelSpec,
} from '@/lib/vehicle-model-assets';
import {
  applyVehiclePaintColour,
  applyVehicleVisualState,
  createContactShadow,
  getVehicleBounds,
  mapGlbToVehicleMeshes,
  type VehicleMeshMap,
} from './vehicle3d-model';
import { VehicleTwinHud, type VehicleTwinTelemetry } from './VehicleTwinHud';
import { deriveVehicle3DState, vehicleStateAlerts } from './vehicle3d-state';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

type Vehicle3DViewerProps = {
  state: VehicleRemoteState;
  model?: VehicleModelSpec | null;
  className?: string;
  interactive?: boolean;
  compact?: boolean;
  /** Dark automotive studio for control-room. */
  theme?: 'light' | 'ops';
  showReset?: boolean;
  /** Ops telemetry for HUD (speed, GPS, battery). */
  telemetry?: VehicleTwinTelemetry | null;
  showHud?: boolean;
  /** Dev: list GLB node names for mapping. */
  debugNodes?: boolean;
};

/**
 * GLB/GLTF-only vehicle viewer.
 * Never builds a procedural car — missing assets show "3D MODEL NOT AVAILABLE".
 */
export function Vehicle3DViewer({
  state,
  model = null,
  className = '',
  interactive = true,
  compact = false,
  theme = 'ops',
  showReset = true,
  telemetry = null,
  showHud = true,
  debugNodes = false,
}: Vehicle3DViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const telemetryRef = useRef(telemetry);
  const controlsRef = useRef<{
    reset: () => void;
  } | null>(null);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [detail, setDetail] = useState('');
  const [nodeNames, setNodeNames] = useState<string[]>([]);

  stateRef.current = state;
  telemetryRef.current = telemetry;
  const resolved = resolveVehicleModelAsset(model ?? {});
  const label = vehicleModelLabel(model ?? {});
  const dark = theme === 'ops';

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (!resolved?.assetUrl) {
      setStatus('unavailable');
      setDetail('No make/model or asset URL assigned to this vehicle.');
      host.replaceChildren();
      return;
    }

    let disposed = false;
    let frame = 0;
    let meshes: VehicleMeshMap | null = null;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const DEFAULT_YAW = 0.62;
    const DEFAULT_PITCH = 0.28;
    const DEFAULT_DIST = 1;
    let targetYaw = DEFAULT_YAW;
    let yaw = DEFAULT_YAW;
    let targetPitch = DEFAULT_PITCH;
    let pitch = DEFAULT_PITCH;
    let targetDist = DEFAULT_DIST;
    let dist = DEFAULT_DIST;
    let pulseT = 0;
    let lookTarget = new THREE.Vector3(0, 0.55, 0);
    let baseRadius = 6;

    setStatus('loading');
    setDetail(`Loading ${label}…`);
    host.replaceChildren();

    const width = () => host.clientWidth || 320;
    const height = () => host.clientHeight || (compact ? 280 : 460);

    const scene = new THREE.Scene();
    scene.background = null;

    // Slightly wider FOV + closer fit so the GLB reads as the hero subject.
    const camera = new THREE.PerspectiveCamera(compact ? 36 : 40, width() / height(), 0.1, 200);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width(), height());
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = dark ? 1.05 : 1.0;
    host.appendChild(renderer.domElement);

    if (dark) {
      // Opaque charcoal clear — never a transparent wash over page chrome
      scene.background = new THREE.Color(0x0e1116);
      renderer.setClearColor(0x0e1116, 1);
      scene.fog = null;

      scene.add(new THREE.AmbientLight(0xb8c0cc, 0.42));
      scene.add(new THREE.HemisphereLight(0xd8dee8, 0x2a3038, 0.55));
      const key = new THREE.DirectionalLight(0xffffff, 1.15);
      key.position.set(4.5, 8, 3.5);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.bias = -0.0002;
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xa8b8c8, 0.45);
      fill.position.set(-5, 3.5, -2);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xc8d4e0, 0.5);
      rim.position.set(-1.5, 4.5, 6);
      scene.add(rim);
    } else {
      scene.background = new THREE.Color(0xe8eaee);
      renderer.setClearColor(0xe8eaee, 1);
      scene.add(new THREE.AmbientLight(0xffffff, 0.4));
      scene.add(new THREE.HemisphereLight(0xf0f4f8, 0xb8c0c8, 0.7));
      const key = new THREE.DirectionalLight(0xffffff, 1.15);
      key.position.set(5, 9, 4);
      key.castShadow = true;
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xd0e0f0, 0.45);
      fill.position.set(-5, 3, -2);
      scene.add(fill);
    }

    const contactShadow = createContactShadow(2.8);
    scene.add(contactShadow);

    function placeCamera() {
      const r = baseRadius * dist;
      const cp = Math.cos(pitch);
      camera.position.set(
        lookTarget.x + r * Math.sin(yaw) * cp,
        lookTarget.y + r * Math.sin(pitch) + r * 0.12,
        lookTarget.z + r * Math.cos(yaw) * cp,
      );
      camera.lookAt(lookTarget);
      camera.near = Math.max(r / 200, 0.05);
      camera.far = r * 40;
      camera.updateProjectionMatrix();
    }

    function fitToVehicle(obj: THREE.Object3D) {
      const box = getVehicleBounds(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      lookTarget.copy(center);
      lookTarget.y = center.y + size.y * 0.05;
      const maxDim = Math.max(size.x, size.y, size.z) || 4;
      // ~60% stage fill — elevated 3/4 view, no clipping
      baseRadius = maxDim * (compact ? 1.12 : 1.0);
      contactShadow.position.set(center.x, 0.005, center.z);
      contactShadow.scale.setScalar(Math.max(size.x, size.z) / 3.4);
      placeCamera();
    }

    function fail(reason: string) {
      if (disposed) return;
      setStatus('unavailable');
      setDetail(reason);
      renderer.domElement.style.display = 'none';
    }

    function mountMeshes(next: VehicleMeshMap) {
      if (disposed) return;
      if (meshes) scene.remove(meshes.root);
      meshes = next;

      meshes.root.updateMatrixWorld(true);
      const box = getVehicleBounds(meshes.root);
      if (box.isEmpty()) {
        fail(`GLB loaded for ${label}, but the vehicle meshes could not be measured.`);
        return;
      }
      const size = box.getSize(new THREE.Vector3());
      // Normalize model size; camera distance controls on-screen hero scale.
      const scale = 6.2 / Math.max(size.x, size.y, size.z, 0.001);
      meshes.root.scale.setScalar(scale);
      meshes.root.updateMatrixWorld(true);
      const scaled = getVehicleBounds(meshes.root);
      const center = scaled.getCenter(new THREE.Vector3());
      meshes.root.position.x -= center.x;
      meshes.root.position.y -= scaled.min.y;
      meshes.root.position.z -= center.z;

      const paint = parseVehicleColour(model?.colour);
      const colourKey = (model?.colour ?? '').trim().toLowerCase();
      // Keep authored GLB paint by default. Only recolour for clear solid fleet colours.
      const skipPaint =
        !paint ||
        colourKey === '' ||
        colourKey === 'white' ||
        colourKey === 'beige' ||
        colourKey === 'pearl' ||
        colourKey === 'cream' ||
        colourKey === 'ivory' ||
        colourKey === 'silver' ||
        colourKey === 'grey' ||
        colourKey === 'gray';
      if (!skipPaint) {
        applyVehiclePaintColour(meshes, paint);
      }
      applyVehicleVisualState(meshes, stateRef.current, 0, {
        speedKph: telemetryRef.current?.speedKph,
        online: telemetryRef.current?.online,
      });
      scene.add(meshes.root);
      fitToVehicle(meshes.root);
      setNodeNames(meshes.nodeNames);
      setStatus('ready');
      setDetail('');
    }

    controlsRef.current = {
      reset: () => {
        targetYaw = DEFAULT_YAW;
        targetPitch = DEFAULT_PITCH;
        targetDist = DEFAULT_DIST;
      },
    };

    const loader = new GLTFLoader();
    loader.load(
      resolved.assetUrl,
      (gltf) => {
        if (disposed) return;
        const mapped = mapGlbToVehicleMeshes(gltf.scene);
        if (!mapped) {
          fail(
            `GLB loaded for ${label}, but no usable meshes were found.`,
          );
          return;
        }
        mountMeshes(mapped);
      },
      undefined,
      () => {
        fail(`3D model not found for ${label}. Place a GLB at ${resolved.assetUrl}`);
      },
    );

    function onPointerDown(e: PointerEvent) {
      if (!interactive || !meshes) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      targetYaw += (e.clientX - lastX) * 0.008;
      targetPitch = Math.max(
        0.08,
        Math.min(0.85, targetPitch - (e.clientY - lastY) * 0.005),
      );
      lastX = e.clientX;
      lastY = e.clientY;
    }
    function onPointerUp(e: PointerEvent) {
      dragging = false;
      renderer.domElement.style.cursor = interactive ? 'grab' : 'default';
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    function onWheel(e: WheelEvent) {
      if (!interactive || !meshes) return;
      e.preventDefault();
      targetDist = Math.max(0.55, Math.min(2.2, targetDist + e.deltaY * 0.0012));
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = interactive ? 'grab' : 'default';

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            const w = width();
            const h = height();
            camera.aspect = w / Math.max(h, 1);
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
          })
        : null;
    ro?.observe(host);

    const tick = (t: number) => {
      frame = requestAnimationFrame(tick);
      pulseT = (Math.sin(t * 0.0025) + 1) / 2;
      yaw += (targetYaw - yaw) * 0.1;
      pitch += (targetPitch - pitch) * 0.1;
      dist += (targetDist - dist) * 0.1;
      placeCamera();
      if (meshes) {
        applyVehicleVisualState(meshes, stateRef.current, pulseT, {
          speedKph: telemetryRef.current?.speedKph,
          online: telemetryRef.current?.online,
        });
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      controlsRef.current = null;
      cancelAnimationFrame(frame);
      ro?.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose?.();
        }
      });
    };
  }, [compact, dark, interactive, label, model?.colour, resolved?.assetUrl]);

  const unavailable = status === 'unavailable';
  const alerts = vehicleStateAlerts(
    deriveVehicle3DState(state, {
      speedKph: telemetry?.speedKph,
      online: telemetry?.online,
    }),
  );

  return (
    <div
      className={`vehicle-3d vehicle-3d--${theme} ${compact ? 'vehicle-3d--compact' : ''} ${unavailable ? 'vehicle-3d--unavailable' : ''} ${className}`.trim()}
      data-status={status}
    >
      <div ref={hostRef} className="vehicle-3d__canvas" aria-label="Digital twin vehicle viewer" />
      {unavailable ? (
        <div className="vehicle-3d__unavailable" role="status">
          <p className="vehicle-3d__unavailable-title">Digital twin not available</p>
          <p className="vehicle-3d__unavailable-label">{label}</p>
          {detail ? <p className="vehicle-3d__unavailable-detail">{detail}</p> : null}
        </div>
      ) : null}
      {status === 'loading' ? (
        <div className="vehicle-3d__loading" aria-live="polite">
          Loading digital twin…
        </div>
      ) : null}
      {status === 'ready' && showReset ? (
        <button
          type="button"
          className="vehicle-3d__reset"
          onClick={() => controlsRef.current?.reset()}
          title="Reset view"
        >
          Reset view
        </button>
      ) : null}
      {status === 'ready' && alerts.length ? (
        <div className="vehicle-3d__alerts" role="status" aria-live="polite">
          {alerts.map((a) => (
            <span key={a} className={`vehicle-3d__alert ${a.includes('PANIC') ? 'is-panic' : 'is-open'}`}>
              {a}
            </span>
          ))}
        </div>
      ) : null}
      {status === 'ready' && showHud ? (
        <VehicleTwinHud
          state={state}
          telemetry={telemetry}
          label={label}
          compact={compact}
        />
      ) : null}
      {debugNodes && nodeNames.length ? (
        <details className="vehicle-3d__debug">
          <summary>GLB nodes ({nodeNames.length})</summary>
          <ul>
            {nodeNames.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
