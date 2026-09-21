'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  buildingModelLabel,
  resolveBuildingModelAsset,
  type BuildingModelSpec,
} from '@/lib/building-model-assets';
import { alarmStatusLabel } from '@/lib/sa-alarm';
import {
  applyBuildingAlarmVisual,
  createBuildingContactShadow,
  getBuildingBounds,
  mapGlbToBuildingMeshes,
  orientBuildingUpright,
  orientWarehouse,
  resolveBuildingAlarmMode,
  type BuildingMeshMap,
} from './building3d-model';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

type Building3DViewerProps = {
  model?: BuildingModelSpec | null;
  alarmStatus?: string | null;
  className?: string;
  interactive?: boolean;
  compact?: boolean;
};

/**
 * GLB-only building viewer for alarm sites.
 * Warehouse only for now — house, mall & apartment stay blank.
 */
export function Building3DViewer({
  model = null,
  alarmStatus = 'DISARMED',
  className = '',
  interactive = true,
  compact = false,
}: Building3DViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(alarmStatus);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [detail, setDetail] = useState('');

  statusRef.current = alarmStatus;
  const resolved = resolveBuildingModelAsset(model ?? {});
  const label = buildingModelLabel(model ?? {});
  const mode = resolveBuildingAlarmMode(alarmStatus);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (!resolved?.assetUrl) {
      setStatus('unavailable');
      setDetail('No 3D model for this site type yet (houses, apartments & malls are blank for now).');
      host.replaceChildren();
      return;
    }

    let disposed = false;
    let frame = 0;
    let meshes: BuildingMeshMap | null = null;
    let dragging = false;
    let lastX = 0;
    let baseYaw = 0;
    let targetYaw = 0;
    let yaw = 0;
    let pulseT = 0;

    setStatus('loading');
    setDetail(`Loading ${label}…`);
    host.replaceChildren();

    const width = () => Math.max(host.clientWidth || 0, 320);
    const height = () => Math.max(host.clientHeight || 0, compact ? 180 : 260);

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(38, width() / height(), 0.1, 200);
    camera.position.set(5.2, 3.4, 5.8);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width(), height());
    renderer.setClearColor(0x1a1e24, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.55;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a727a, 1.35));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(4.5, 10, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd8e8f8, 0.95);
    fill.position.set(-7, 5, -2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe8d0, 0.7);
    rim.position.set(-3, 6, 8);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    // Soft ground so dark industrial textures still read as a silhouette
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(6.5, 48),
      new THREE.MeshStandardMaterial({
        color: 0x2a3038,
        roughness: 0.95,
        metalness: 0,
        transparent: true,
        opacity: 0.9,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.002;
    ground.receiveShadow = true;
    scene.add(ground);

    const contactShadow = createBuildingContactShadow(3.4);
    scene.add(contactShadow);

    function fitCamera(obj: THREE.Object3D) {
      const box = getBuildingBounds(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 4;
      const footprint = Math.max(size.x, size.z);
      const isFlatPlot = size.y < footprint * 0.45;
      const isWideLow = size.y < footprint * 0.65 && footprint > size.y * 1.4;
      camera.fov = isFlatPlot ? 38 : isWideLow ? 36 : 34;

      if (isFlatPlot) {
        const dist = maxDim * 1.55;
        camera.position.set(
          center.x + dist * 0.55,
          center.y + dist * 0.95,
          center.z + dist * 0.7,
        );
        camera.lookAt(center.x, center.y, center.z);
      } else if (isWideLow) {
        // Warehouse / shed — pull back and keep camera lower so it reads as a building
        const dist = footprint * 1.15 + size.y * 0.8;
        camera.position.set(
          center.x + dist * 0.85,
          center.y + size.y * 0.75 + dist * 0.18,
          center.z + dist * 0.95,
        );
        camera.lookAt(center.x, center.y + size.y * 0.28, center.z);
      } else {
        const dist = maxDim * 1.65;
        camera.position.set(
          center.x + dist * 0.95,
          center.y + Math.max(size.y * 0.55, dist * 0.42),
          center.z + dist * 1.15,
        );
        camera.lookAt(center.x, center.y + size.y * 0.2, center.z);
      }
      camera.near = Math.max(maxDim / 200, 0.05);
      camera.far = maxDim * 60;
      camera.updateProjectionMatrix();
      contactShadow.position.set(center.x, 0.005, center.z);
      contactShadow.scale.setScalar(footprint / 5.2);
    }

    function fail(reason: string) {
      if (disposed) return;
      setStatus('unavailable');
      setDetail(reason);
      renderer.domElement.style.display = 'none';
    }

    function mount(next: BuildingMeshMap) {
      if (disposed) return;
      if (meshes) scene.remove(meshes.root);
      meshes = next;

      // Warehouse: keep authored Y-up (wide shed). Never run the façade tip — that
      // stood IBuilding kits on end and made a tall thin U.
      if (resolved.kind === 'warehouse') {
        orientWarehouse(meshes.yawPivot);
        baseYaw = 0.55;
      } else {
        orientBuildingUpright(meshes.yawPivot);
        baseYaw = 0.2;
      }
      meshes.yawPivot.rotation.y = baseYaw;
      meshes.root.updateMatrixWorld(true);
      let box = getBuildingBounds(meshes.root);
      if (box.isEmpty()) {
        fail(`Could not measure the ${label} model.`);
        return;
      }
      const size = box.getSize(new THREE.Vector3());
      const scale = 4.8 / Math.max(size.x, size.y, size.z, 0.001);
      meshes.root.scale.setScalar(scale);
      meshes.root.updateMatrixWorld(true);
      box = getBuildingBounds(meshes.root);
      const center = box.getCenter(new THREE.Vector3());
      meshes.root.position.x -= center.x;
      meshes.root.position.y -= box.min.y;
      meshes.root.position.z -= center.z;

      applyBuildingAlarmVisual(meshes, statusRef.current, 0);
      scene.add(meshes.root);
      // Wait a frame so layout has real canvas size before framing
      requestAnimationFrame(() => {
        if (disposed || !meshes) return;
        renderer.setSize(width(), height());
        camera.aspect = width() / Math.max(height(), 1);
        fitCamera(meshes.root);
      });
      setStatus('ready');
      setDetail('');
    }

    const loader = new GLTFLoader();
    loader.load(
      resolved.assetUrl,
      (gltf) => {
        if (disposed) return;
        const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
        const mapped = mapGlbToBuildingMeshes(gltf.scene, {
          maxAnisotropy,
          kind: resolved.kind,
        });
        if (!mapped) {
          fail(`GLB loaded for ${label}, but no usable meshes were found.`);
          return;
        }
        mount(mapped);
      },
      undefined,
      () => fail(`3D model not found. Place a GLB at ${resolved.assetUrl}`),
    );

    function onPointerDown(e: PointerEvent) {
      if (!interactive || !meshes) return;
      dragging = true;
      lastX = e.clientX;
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      targetYaw += (e.clientX - lastX) * 0.008;
      lastX = e.clientX;
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

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
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
      pulseT = (Math.sin(t * 0.0028) + 1) / 2;
      yaw += (targetYaw - yaw) * 0.08;
      if (meshes) {
        meshes.yawPivot.rotation.y = baseYaw + yaw;
        applyBuildingAlarmVisual(meshes, statusRef.current, pulseT);
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro?.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
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
  }, [compact, interactive, label, resolved?.assetUrl]);

  const unavailable = status === 'unavailable';

  return (
    <div
      className={`building-3d ${compact ? 'building-3d--compact' : ''} ${unavailable ? 'building-3d--unavailable' : ''} ${className}`.trim()}
      data-status={status}
      data-alarm={mode}
    >
      <div ref={hostRef} className="building-3d__canvas" aria-label="3D building viewer" />
      {unavailable ? (
        <div className="building-3d__unavailable" role="status">
          <p className="building-3d__unavailable-title">3D model not available</p>
          <p className="building-3d__unavailable-label">{label}</p>
          {detail ? <p className="building-3d__unavailable-detail">{detail}</p> : null}
        </div>
      ) : null}
      {status === 'loading' ? (
        <div className="building-3d__loading" aria-live="polite">
          Loading 3D model…
        </div>
      ) : null}
      {status === 'ready' ? (
        <div className="building-3d__status" aria-live="polite">
          <span className={`building-3d__status-badge is-${mode}`}>
            {alarmStatusLabel(alarmStatus ?? 'DISARMED')}
          </span>
        </div>
      ) : null}
    </div>
  );
}
