import * as THREE from 'three';

export type BuildingMeshMap = {
  root: THREE.Group;
  /** Rotate this for orbit — keeps `root` planted on the ground. */
  yawPivot: THREE.Group;
  structure: THREE.Mesh[];
  underGlow: THREE.Mesh;
};

export type BuildingAlarmMode = 'disarmed' | 'armed' | 'stay' | 'night' | 'triggered' | 'offline';

const ARMED_GREEN = 0x3d9b5f;
const STAY_AMBER = 0xd6a33d;
const NIGHT_BLUE = 0x4a7ab5;
const TRIGGER_RED = 0xd9534f;

export function resolveBuildingAlarmMode(status?: string | null): BuildingAlarmMode {
  const s = (status ?? '').toUpperCase();
  if (s === 'TRIGGERED') return 'triggered';
  if (s === 'OFFLINE') return 'offline';
  if (s === 'STAY' || s === 'ARMED_STAY') return 'stay';
  if (s === 'NIGHT') return 'night';
  if (s === 'ARMED' || s === 'EXIT_DELAY' || s === 'ENTRY_DELAY') return 'armed';
  return 'disarmed';
}

function asStandard(mat: THREE.Material | THREE.Material[]): THREE.MeshStandardMaterial | null {
  const m = Array.isArray(mat) ? mat[0] : mat;
  return m instanceof THREE.MeshStandardMaterial ? m : null;
}

function cloneMaterials(mesh: THREE.Mesh): void {
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((m) => m.clone());
  } else if (mesh.material) {
    mesh.material = mesh.material.clone();
  }
}

/**
 * Many exported building GLBs ship with alphaMode=BLEND / extreme specular /
 * roughness 0, which makes them invisible or paper-thin under ACES.
 */
export function normalizeBuildingMaterials(
  root: THREE.Object3D,
  opts?: { maxAnisotropy?: number; doubleSided?: boolean },
): void {
  const maxAniso = opts?.maxAnisotropy ?? 1;
  const doubleSided = opts?.doubleSided ?? true;
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const raw of mats) {
      if (!raw) continue;
      raw.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
      raw.transparent = false;
      raw.opacity = 1;
      raw.depthWrite = true;
      raw.depthTest = true;
      raw.alphaTest = 0;
      if ('alphaMap' in raw && (raw as THREE.MeshStandardMaterial).alphaMap) {
        (raw as THREE.MeshStandardMaterial).alphaMap = null;
      }

      if (raw instanceof THREE.MeshStandardMaterial) {
        raw.metalness = Math.min(raw.metalness ?? 0, 0.2);
        raw.roughness = Math.max(raw.roughness ?? 0.6, 0.5);
        // Dark baked atlases (esp. warehouse greyscale) need a lift on dark UI
        raw.color.multiplyScalar(1.35);
        raw.color.r = Math.min(raw.color.r, 1);
        raw.color.g = Math.min(raw.color.g, 1);
        raw.color.b = Math.min(raw.color.b, 1);
        if (raw.normalScale) {
          raw.normalScale.set(
            Math.abs(raw.normalScale.x) || 1,
            Math.abs(raw.normalScale.y) || 1,
          );
        }
        if ('specularIntensity' in raw) {
          (raw as THREE.MeshPhysicalMaterial).specularIntensity = Math.min(
            (raw as THREE.MeshPhysicalMaterial).specularIntensity ?? 1,
            0.6,
          );
        }
        if ('specularColor' in raw) {
          const sc = (raw as THREE.MeshPhysicalMaterial).specularColor;
          if (sc) {
            sc.r = Math.min(sc.r, 1);
            sc.g = Math.min(sc.g, 1);
            sc.b = Math.min(sc.b, 1);
          }
        }
        const maps = [raw.map, raw.normalMap, raw.roughnessMap, raw.metalnessMap, raw.aoMap];
        for (const tex of maps) {
          if (!tex) continue;
          if (tex === raw.map) tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = Math.max(tex.anisotropy || 1, maxAniso);
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = true;
          tex.needsUpdate = true;
        }
        raw.needsUpdate = true;
      }
    }
  });
}

/**
 * Drop authored root pose (some house exports tip the façade flat via node rotation/scale).
 * Geometry stays; we re-frame from mesh bounds.
 */
export function flattenAuthoredRootPose(scene: THREE.Object3D): void {
  for (const child of [...scene.children]) {
    child.position.set(0, 0, 0);
    child.rotation.set(0, 0, 0);
    child.quaternion.identity();
    child.scale.set(1, 1, 1);
    child.updateMatrix();
  }
  scene.position.set(0, 0, 0);
  scene.rotation.set(0, 0, 0);
  scene.quaternion.identity();
  scene.scale.set(1, 1, 1);
  scene.updateMatrixWorld(true);
}

export function isBuildingEnvironmentObject(obj: THREE.Object3D): boolean {
  const n = (obj.name || '').trim().toLowerCase();
  if (!n) return false;
  if (/^plane(\.\d+)?$/.test(n)) return true;
  if (/^floor(\.\d+)?$/.test(n)) return true;
  if (/^camera(\.\d+)?$/.test(n)) return true;
  if (/^light(\.\d+)?$/.test(n)) return true;
  if (n.includes('asphalt') || n.includes('skybox') || n.includes('hdri') || n.includes('backdrop')) {
    return true;
  }
  return false;
}

export function createBuildingContactShadow(radius = 3.2): THREE.Mesh {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.32)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.008;
  mesh.name = 'ContactShadow';
  return mesh;
}

function makeUnderGlow(): THREE.Mesh {
  const underGlow = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 48),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  underGlow.rotation.x = -Math.PI / 2;
  underGlow.position.y = 0.012;
  underGlow.name = 'UnderGlow';
  return underGlow;
}

export function getBuildingBounds(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  let any = false;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible) return;
    if (o.name === 'UnderGlow' || o.name === 'ContactShadow') return;
    box.expandByObject(o);
    any = true;
  });
  if (!any || box.isEmpty()) return new THREE.Box3().setFromObject(root);
  return box;
}

/**
 * Tip / yaw so the model stands on XZ.
 * Only tip when the asset is nearly planar (façade / plot card).
 * Do NOT tip short-wide warehouses — height < 0.55×length is normal for them.
 */
export function orientBuildingUpright(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  let box = getBuildingBounds(root);
  let size = box.getSize(new THREE.Vector3());

  const ranked = [
    { axis: 'x' as const, v: size.x },
    { axis: 'y' as const, v: size.y },
    { axis: 'z' as const, v: size.z },
  ].sort((a, b) => a.v - b.v);
  const thinnest = ranked[0];
  const mid = ranked[1];
  const tallest = ranked[2];
  const nearlyPlanar = thinnest.v < mid.v * 0.4 && thinnest.v < tallest.v * 0.28;

  if (thinnest.axis === 'y' && nearlyPlanar) {
    root.rotation.x -= Math.PI / 2;
    root.updateMatrixWorld(true);
    box = getBuildingBounds(root);
    size = box.getSize(new THREE.Vector3());
  }

  // Prefer the larger horizontal span as width (X) for readable façades
  box = getBuildingBounds(root);
  size = box.getSize(new THREE.Vector3());
  if (size.z > size.x * 1.25) {
    root.rotation.y += Math.PI / 2;
  }
}

/**
 * Warehouse kits (IBuilding): keep authored Y-up pose.
 * If something still leaves the long axis vertical, tip it down once.
 */
export function orientWarehouse(root: THREE.Object3D): void {
  root.rotation.set(0, 0, 0);
  root.updateMatrixWorld(true);
  let box = getBuildingBounds(root);
  let size = box.getSize(new THREE.Vector3());

  // Longest axis should not be vertical for a warehouse
  if (size.y >= size.x && size.y >= size.z) {
    // Standing on end — tip so former Y becomes length along X
    root.rotation.z = Math.PI / 2;
    root.updateMatrixWorld(true);
    box = getBuildingBounds(root);
    size = box.getSize(new THREE.Vector3());
  }

  // Prefer length along X for framing
  if (size.z > size.x) {
    root.rotation.y += Math.PI / 2;
    root.updateMatrixWorld(true);
  }
}

export function mapGlbToBuildingMeshes(
  scene: THREE.Object3D,
  opts?: { maxAnisotropy?: number; kind?: string },
): BuildingMeshMap | null {
  const root = new THREE.Group();
  root.name = 'BuildingRoot';
  const yawPivot = new THREE.Group();
  yawPivot.name = 'BuildingYaw';
  root.add(yawPivot);
  yawPivot.add(scene);

  scene.traverse((obj) => {
    if (isBuildingEnvironmentObject(obj)) {
      obj.visible = false;
      obj.userData.role = 'environment';
    }
  });

  const doubleSided = true;
  const structure: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (!obj.visible || obj.userData.role === 'environment') return;
    cloneMaterials(obj);
    normalizeBuildingMaterials(obj, {
      maxAnisotropy: opts?.maxAnisotropy,
      doubleSided,
    });
    obj.castShadow = true;
    obj.receiveShadow = true;
    const mat = asStandard(obj.material);
    obj.userData.baseColor = mat?.color?.getHex?.() ?? 0xc8ced4;
    obj.userData.role = 'structure';
    structure.push(obj);
  });

  if (!structure.length) return null;

  const underGlow = makeUnderGlow();
  root.add(underGlow);
  return { root, yawPivot, structure, underGlow };
}

/** Alarm state → subtle security treatment (never flattens the model). */
export function applyBuildingAlarmVisual(
  meshes: BuildingMeshMap,
  status?: string | null,
  pulse = 0,
): void {
  const mode = resolveBuildingAlarmMode(status);
  let tint: number | null = null;
  let mix = 0;
  let glowOpacity = 0;
  let glowColor = 0x000000;

  if (mode === 'triggered') {
    tint = TRIGGER_RED;
    mix = 0.12;
    glowColor = TRIGGER_RED;
    glowOpacity = 0.16 + pulse * 0.14;
  } else if (mode === 'armed') {
    tint = ARMED_GREEN;
    mix = 0.04;
    glowColor = ARMED_GREEN;
    glowOpacity = 0.05;
  } else if (mode === 'stay') {
    tint = STAY_AMBER;
    mix = 0.05;
    glowColor = STAY_AMBER;
    glowOpacity = 0.06;
  } else if (mode === 'night') {
    tint = NIGHT_BLUE;
    mix = 0.05;
    glowColor = NIGHT_BLUE;
    glowOpacity = 0.06;
  } else if (mode === 'offline') {
    mix = 0;
    glowOpacity = 0;
  }

  for (const mesh of meshes.structure) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of mats) {
      if (!(raw instanceof THREE.MeshStandardMaterial)) continue;
      const base = (mesh.userData.baseColor as number) ?? raw.color.getHex();
      if (tint && mix > 0) {
        raw.color.copy(new THREE.Color(base).lerp(new THREE.Color(tint), mix));
        raw.emissive.setHex(tint);
        raw.emissiveIntensity = mode === 'triggered' ? 0.1 + pulse * 0.12 : 0.025;
      } else {
        raw.color.setHex(base);
        raw.emissive.setHex(0x000000);
        raw.emissiveIntensity = 0;
      }
    }
  }

  const glow = meshes.underGlow.material as THREE.MeshBasicMaterial;
  glow.color.setHex(glowColor);
  glow.opacity = glowOpacity;
}
