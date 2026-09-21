import * as THREE from 'three';
import type { VehicleRemoteState } from '@/lib/vehicle-remote';
import {
  deriveVehicle3DState,
  VEHICLE_VISUAL,
  type Vehicle3DComponentState,
  type VehicleDoorId,
  type VehicleHighlightStatus,
} from './vehicle3d-state';

export type VehiclePartGroup = {
  /** Pivot / root node to rotate when opening. */
  root: THREE.Object3D | null;
  meshes: THREE.Mesh[];
  closedRotation: THREE.Euler;
  openAxis: 'x' | 'y' | 'z';
  openAngle: number;
};

export type VehicleMeshMap = {
  root: THREE.Group;
  body: THREE.Mesh[];
  glass: THREE.Mesh[];
  /** True door meshes when the GLB has them. */
  doors: THREE.Mesh[];
  /** Proxies when doors aren't separate (e.g. Audi "Handle"). */
  doorProxies: THREE.Mesh[];
  /** Proxies when doors aren't separate — always-on red panels for lock state. */
  doorOverlays: THREE.Mesh[];
  /** Front / hood proxies (Grill, Radiator, Bonnet…). */
  hoodProxies: THREE.Mesh[];
  wheels: THREE.Mesh[];
  lights: THREE.Mesh[];
  paintMaterials: THREE.MeshStandardMaterial[];
  underGlow: THREE.Mesh;
  lockMarkers: THREE.Object3D[];
  scanRing: THREE.Mesh;
  /** True when GLB had authored door meshes. */
  hasAuthoredDoors: boolean;
  /** Structured interactive parts (CarConcept-style hierarchies). */
  parts: {
    doorFrontLeft: VehiclePartGroup;
    doorFrontRight: VehiclePartGroup;
    doorRearLeft: VehiclePartGroup;
    doorRearRight: VehiclePartGroup;
    bonnet: VehiclePartGroup;
    boot: VehiclePartGroup;
  };
  /** Flat list of every named node for debug overlays. */
  nodeNames: string[];
};

const LOCK_RED = VEHICLE_VISUAL.panicRed;
const CUT_ROSE = VEHICLE_VISUAL.immobiliserRose;
const UNLOCK_AMBER = VEHICLE_VISUAL.unlockAmber;
const RECOVERY_AMBER = VEHICLE_VISUAL.recoveryAmber;
const OPEN_BLUE = VEHICLE_VISUAL.openBlue;
const LOCK_GREEN = VEHICLE_VISUAL.lockGreen;

function asStandard(mat: THREE.Material | THREE.Material[]): THREE.MeshStandardMaterial | null {
  const m = Array.isArray(mat) ? mat[0] : mat;
  return m instanceof THREE.MeshStandardMaterial ? m : null;
}

function eachStandard(
  mesh: THREE.Mesh,
  fn: (mat: THREE.MeshStandardMaterial) => void,
): void {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const raw of mats) {
    if (raw instanceof THREE.MeshStandardMaterial) fn(raw);
  }
}

function cloneMaterials(mesh: THREE.Mesh): void {
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((m) => m.clone());
  } else if (mesh.material) {
    mesh.material = mesh.material.clone();
  }
}

function storeBase(mesh: THREE.Mesh): void {
  eachStandard(mesh, (mat) => {
    if (mat.userData.baseColor == null) {
      mat.userData.baseColor = mat.color.getHex();
      mat.userData.baseEmissive = mat.emissive.getHex();
      mat.userData.baseEmissiveIntensity = mat.emissiveIntensity;
    }
  });
}

function restoreBase(mat: THREE.MeshStandardMaterial): void {
  const base = mat.userData.baseColor as number | undefined;
  if (base != null) mat.color.setHex(base);
  const em = mat.userData.baseEmissive as number | undefined;
  mat.emissive.setHex(em ?? 0x000000);
  mat.emissiveIntensity = (mat.userData.baseEmissiveIntensity as number) ?? 0;
}

function meshRoleHint(obj: THREE.Object3D): 'glass' | 'wheel' | 'light' | 'rubber' | 'body' {
  const n = (obj.name || '').toLowerCase();
  if (
    n.includes('glass') ||
    n.includes('window') ||
    n.includes('windshield') ||
    n.includes('windscreen') ||
    n.includes('transparent') ||
    n.includes('glas')
  ) {
    return 'glass';
  }
  if (n.includes('tire') || n.includes('tyre') || n.includes('rubber') || n.includes('tread')) {
    return 'rubber';
  }
  if (n.includes('wheel') || n.includes('rim') || n.includes('brake') || n.includes('caliper')) {
    return 'wheel';
  }
  if (
    n.includes('headlight') ||
    n.includes('taillight') ||
    n.includes('tail_light') ||
    n.includes('drl') ||
    (n.includes('light') &&
      !n.includes('license') &&
      !n.includes('wire') &&
      !n.includes('highlight') &&
      !n.includes('lightbucket') &&
      !n.includes('light_bucket'))
  ) {
    return 'light';
  }
  return 'body';
}

/**
 * Keep authored colours — only tame chrome crush and true glass.
 * Never convert body paint into transparent washed panels.
 */
export function normalizeVehicleMaterials(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (obj.userData.role === 'environment') return;
    const role = meshRoleHint(obj);
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const raw of mats) {
      if (!(raw instanceof THREE.MeshStandardMaterial)) continue;

      if (raw.map) {
        raw.map.colorSpace = THREE.SRGBColorSpace;
        raw.map.needsUpdate = true;
      }

      // Glass only when named/role says so — do NOT treat any transparent mat as glass
      const isGlass =
        role === 'glass' ||
        (raw.transmission > 0.05 &&
          (obj.name.toLowerCase().includes('glass') ||
            obj.name.toLowerCase().includes('window') ||
            obj.name.toLowerCase().includes('wind')));

      if (isGlass) {
        raw.color.setHex(0x1a222c);
        raw.emissive.setHex(0x000000);
        raw.emissiveIntensity = 0;
        raw.metalness = 0.05;
        raw.roughness = 0.08;
        raw.transparent = true;
        raw.opacity = Math.min(raw.opacity < 1 ? raw.opacity : 0.55, 0.62);
        raw.depthWrite = false;
        if ('transmission' in raw) {
          (raw as THREE.MeshPhysicalMaterial).transmission = Math.max(
            (raw as THREE.MeshPhysicalMaterial).transmission ?? 0,
            0.55,
          );
          (raw as THREE.MeshPhysicalMaterial).thickness = 0.35;
          (raw as THREE.MeshPhysicalMaterial).ior = 1.45;
        }
        raw.needsUpdate = true;
        continue;
      }

      // Tyres / rubber stay dark
      if (role === 'rubber') {
        raw.color.setHex(0x1a1a1a);
        raw.emissive.setHex(0x000000);
        raw.emissiveIntensity = 0;
        raw.metalness = 0;
        raw.roughness = 0.92;
        raw.needsUpdate = true;
        continue;
      }

      // Clear any leftover emissive wash from shared materials
      if (role !== 'light') {
        raw.emissiveIntensity = Math.min(raw.emissiveIntensity ?? 0, 0.02);
      }

      // Only rescue true black-hole paint — gentle, not grey-white
      const lum = 0.2126 * raw.color.r + 0.7152 * raw.color.g + 0.0722 * raw.color.b;
      if (role === 'body' && lum < 0.04 && !raw.map) {
        raw.color.lerp(new THREE.Color(0x2e333a), 0.28);
      }

      // Pull extreme blown-out whites slightly (bad exports) without greying the car
      if (role !== 'light' && lum > 0.92 && !raw.map) {
        raw.color.lerp(new THREE.Color(0xc8ced4), 0.25);
      }

      raw.metalness = Math.min(raw.metalness ?? 0.5, 0.65);
      raw.roughness = THREE.MathUtils.clamp(raw.roughness ?? 0.4, 0.18, 0.88);
      if (role === 'light') {
        raw.emissiveIntensity = Math.min(raw.emissiveIntensity ?? 0.4, 0.85);
      }

      if ('specularIntensity' in raw) {
        (raw as THREE.MeshPhysicalMaterial).specularIntensity = Math.min(
          (raw as THREE.MeshPhysicalMaterial).specularIntensity ?? 1,
          0.75,
        );
      }
      if ('clearcoat' in raw) {
        (raw as THREE.MeshPhysicalMaterial).clearcoat = Math.min(
          (raw as THREE.MeshPhysicalMaterial).clearcoat ?? 0,
          0.65,
        );
      }
      raw.envMapIntensity = Math.min(raw.envMapIntensity ?? 1, 1.1);
      raw.needsUpdate = true;
    }
  });
}

/** Force glass meshes to dark tinted glass after classification. */
export function applyGlassLook(meshes: THREE.Mesh[]): void {
  for (const mesh of meshes) {
    eachStandard(mesh, (mat) => {
      mat.color.setHex(0x1a222c);
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
      mat.metalness = 0.05;
      mat.roughness = 0.08;
      mat.transparent = true;
      mat.opacity = 0.5;
      mat.depthWrite = false;
      mat.userData.baseColor = mat.color.getHex();
      mat.userData.baseEmissive = 0;
      mat.userData.baseEmissiveIntensity = 0;
      mat.needsUpdate = true;
    });
  }
}

/** Soft radial contact shadow under the tyres. */
export function createContactShadow(radius = 2.4): THREE.Mesh {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.42)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.14)');
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
  mesh.position.y = 0.01;
  mesh.name = 'ContactShadow';
  return mesh;
}

/** Faint technical floor grid for ops studio. */
export function createStudioGrid(size = 12, light = false): THREE.GridHelper {
  const grid = new THREE.GridHelper(
    size,
    24,
    light ? 0x6a7a8c : 0x2a3340,
    light ? 0x4a5564 : 0x1a222c,
  );
  grid.position.y = 0.002;
  const mat = grid.material;
  if (Array.isArray(mat)) {
    mat.forEach((m) => {
      m.transparent = true;
      m.opacity = light ? 0.55 : 0.35;
      m.depthWrite = false;
    });
  } else {
    mat.transparent = true;
    mat.opacity = light ? 0.55 : 0.35;
    mat.depthWrite = false;
  }
  return grid;
}

/** Soft lit ground disc so the car doesn't sink into black. */
export function createStudioFloor(radius = 6.5): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshStandardMaterial({
      color: 0x3a4554,
      metalness: 0.08,
      roughness: 0.92,
      transparent: true,
      opacity: 0.92,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;
  mesh.receiveShadow = true;
  mesh.name = 'StudioFloor';
  return mesh;
}

function makeUnderGlow(): THREE.Mesh {
  const underGlow = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 48),
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
  underGlow.visible = false;
  return underGlow;
}

function makeScanRing(): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.95, 1.05, 64);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x4a6a8a,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.018;
  mesh.name = 'ScanRing';
  mesh.visible = false;
  return mesh;
}

function makeLockMarker(anchor: THREE.Object3D, side: number): THREE.Mesh {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 12, 10),
    new THREE.MeshStandardMaterial({
      color: LOCK_GREEN,
      emissive: LOCK_GREEN,
      emissiveIntensity: 0.7,
      metalness: 0.2,
      roughness: 0.4,
      transparent: true,
      opacity: 0,
    }),
  );
  const box = new THREE.Box3().setFromObject(anchor);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  marker.position.set(
    center.x + side * Math.max(size.x * 0.55, 0.35),
    center.y + size.y * 0.2,
    center.z,
  );
  marker.name = `LockMarker_${side < 0 ? 'L' : 'R'}`;
  marker.visible = false;
  return marker;
}

/**
 * Red door slabs for lock state when the GLB has no separate door meshes.
 * Placed on both flanks at typical front/rear door positions.
 */
function makeDoorOverlays(root: THREE.Object3D): THREE.Mesh[] {
  const box = getVehicleBounds(root);
  if (box.isEmpty()) return [];
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const overlays: THREE.Mesh[] = [];

  const doorH = Math.max(size.y * 0.4, 0.42);
  const doorW = Math.max(size.z * 0.2, 0.5);
  const doorD = Math.max(size.x * 0.028, 0.045);
  const y = box.min.y + size.y * 0.42;
  const xOut = center.x;
  const halfX = size.x * 0.48;

  const slots: Array<{ name: string; z: number; xSign: number }> = [
    { name: 'DoorOverlay_FL', z: center.z + size.z * 0.12, xSign: -1 },
    { name: 'DoorOverlay_FR', z: center.z + size.z * 0.12, xSign: 1 },
    { name: 'DoorOverlay_RL', z: center.z - size.z * 0.16, xSign: -1 },
    { name: 'DoorOverlay_RR', z: center.z - size.z * 0.16, xSign: 1 },
  ];

  for (const slot of slots) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(doorD, doorH, doorW),
      new THREE.MeshStandardMaterial({
        color: LOCK_GREEN,
        emissive: LOCK_GREEN,
        emissiveIntensity: 0.55,
        metalness: 0.05,
        roughness: 0.45,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    mesh.position.set(xOut + slot.xSign * halfX, y, slot.z);
    mesh.name = slot.name;
    mesh.visible = false;
    mesh.userData.role = 'doorOverlay';
    overlays.push(mesh);
  }
  return overlays;
}

export function isEnvironmentObject(obj: THREE.Object3D): boolean {
  const n = (obj.name || '').trim().toLowerCase();
  if (!n) return false;
  if (/^plane(\.\d+)?$/.test(n)) return true;
  if (/^floor(\.\d+)?$/.test(n)) return true;
  if (/^cylinder(\.\d+)?$/.test(n)) return true;
  if (/^camera(\.\d+)?$/.test(n)) return true;
  if (/^light(\.\d+)?$/.test(n)) return true;
  if (
    n.includes('asphalt') ||
    n.includes('ground') ||
    n.includes('studio') ||
    n.includes('backdrop') ||
    n.includes('environment') ||
    n.includes('skybox') ||
    n.includes('hdri')
  ) {
    return true;
  }
  if (obj instanceof THREE.Mesh) {
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (
      mats.some((m) => {
        const mn = (m?.name || '').toLowerCase();
        return mn.includes('asphalt') || mn.includes('ground') || mn === 'floor';
      })
    ) {
      return true;
    }
  }
  return false;
}

export function getVehicleBounds(root: THREE.Object3D): THREE.Box3 {
  const boxes: THREE.Box3[] = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible) return;
    if (
      o.name === 'UnderGlow' ||
      o.name === 'ContactShadow' ||
      o.name === 'ScanRing' ||
      o.name === 'StudioFloor' ||
      o.name.startsWith('LockMarker') ||
      o.name.startsWith('DoorOverlay') ||
      o.name.startsWith('Part_')
    ) {
      return;
    }
    const b = new THREE.Box3().setFromObject(o);
    if (!b.isEmpty()) {
      const s = b.getSize(new THREE.Vector3());
      // Ignore degenerate / helper spikes
      if (s.x * s.y * s.z > 1e-8) boxes.push(b);
    }
  });
  if (!boxes.length) return new THREE.Box3().setFromObject(root);

  // Drop outlier meshes (Sketchfab helpers with huge extents)
  const volumes = boxes.map((b) => {
    const s = b.getSize(new THREE.Vector3());
    return s.x * s.y * s.z;
  });
  const sorted = volumes.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 1;
  const kept = boxes.filter((_, i) => volumes[i]! <= median * 40 || volumes[i]! < 1e-4);

  const box = new THREE.Box3();
  for (const b of kept.length ? kept : boxes) box.union(b);
  return box.isEmpty() ? new THREE.Box3().setFromObject(root) : box;
}

function isPaintMaterial(mat: THREE.MeshStandardMaterial): boolean {
  const mn = (mat.name || '').toLowerCase();
  return (
    mn.includes('paint') ||
    mn.includes('colour') ||
    mn.includes('color') ||
    mn.includes('coloured') ||
    mn.includes('colored') ||
    mn.includes('car_main_paint') ||
    mn.includes('car paint') ||
    mn.includes('body') ||
    mn.includes('carpaint') ||
    mn.includes('car_paint') ||
    mn === 'car paint' ||
    mn.includes('w206_paint') ||
    mn.includes('w206_color') ||
    mn.includes('lacquer') ||
    mn.includes('enamel')
  );
}

function isDoorName(n: string): boolean {
  return (
    n.includes('door') ||
    n.includes('porte') ||
    n.includes('puerta') ||
    /\bt[uü]r([_\s.-]|$)/i.test(n) ||
    /\bdo+r[_\s.-]?(fl|fr|rl|rr|l|r|left|right)\b/.test(n) ||
    n.includes('door_') ||
    n.includes('_door') ||
    n.includes('door.') ||
    n.includes('doors') ||
    /^(fl|fr|rl|rr)_?(door|panel)/.test(n) ||
    /^bodydoor[lr]/i.test(n)
  );
}

function emptyPartGroup(): VehiclePartGroup {
  return {
    root: null,
    meshes: [],
    closedRotation: new THREE.Euler(),
    openAxis: 'y',
    openAngle: 0,
  };
}

function collectMeshesUnder(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.visible && o.userData.role !== 'environment') {
      out.push(o);
    }
  });
  return out;
}

function makePartGroup(
  root: THREE.Object3D | null,
  openAxis: 'x' | 'y' | 'z',
  openAngle: number,
): VehiclePartGroup {
  if (!root) return emptyPartGroup();
  return {
    root,
    meshes: collectMeshesUnder(root),
    closedRotation: root.rotation.clone(),
    openAxis,
    openAngle,
  };
}

/**
 * Collect meshes for a semantic part by strict name prefix.
 * Does NOT reparent — Sketchfab/Vivek flats break if we attach() siblings
 * under a new group (wrong pivot → panels tear into flat slabs).
 */
function collectMeshesByTokens(scene: THREE.Object3D, tokens: string[]): THREE.Mesh[] {
  const normalized = tokens.map((t) => t.toLowerCase());
  const out: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const n = (obj.name || '').toLowerCase();
    if (!n) return;
    const hit = normalized.some((token) => {
      if (n === token) return true;
      if (n.startsWith(`b:${token}`)) return true;
      if (n.startsWith(`d:${token}`)) return true;
      // DoorLBase, doorLeft_14, hood.037, trunk_73, coveringTrunk…
      if (n.startsWith(token)) return true;
      if (n.includes(`_${token}`) || n.includes(`-${token}`)) return true;
      if (n.startsWith('body') && n.includes(token)) return true;
      return false;
    });
    if (hit) out.push(obj);
  });
  return out;
}

/** Map CarConcept / Vivek BMW / common GLB node names → semantic part roots. */
function findNamedPartRoots(scene: THREE.Object3D): {
  doorL: THREE.Object3D | null;
  doorR: THREE.Object3D | null;
  doorRL: THREE.Object3D | null;
  doorRR: THREE.Object3D | null;
  hood: THREE.Object3D | null;
  boot: THREE.Object3D | null;
  doorLMeshes: THREE.Mesh[];
  doorRMeshes: THREE.Mesh[];
  doorRLMeshes: THREE.Mesh[];
  doorRRMeshes: THREE.Mesh[];
  hoodMeshes: THREE.Mesh[];
  bootMeshes: THREE.Mesh[];
} {
  let doorL: THREE.Object3D | null = null;
  let doorR: THREE.Object3D | null = null;
  let doorRL: THREE.Object3D | null = null;
  let doorRR: THREE.Object3D | null = null;
  let hood: THREE.Object3D | null = null;
  let boot: THREE.Object3D | null = null;

  scene.traverse((obj) => {
    const n = (obj.name || '').toLowerCase();
    if (!n) return;
    // Prefer authored hierarchy roots (CarConcept: BodyDoorLColor1 / BodyDoorRColor1)
    if (!doorL && (n === 'bodydoorlcolor1' || n === 'door_fl' || n === 'door_l' || n === 'doorleft' || n === 'door_left')) {
      doorL = obj;
    }
    if (!doorR && (n === 'bodydoorrcolor1' || n === 'door_fr' || n === 'door_r' || n === 'doorright' || n === 'door_right')) {
      doorR = obj;
    }
    if (!hood && (n === 'bodyhood' || n === 'bonnet')) {
      hood = obj;
    }
    if (!boot && (n === 'bodyrearpanelscolor1' || n === 'interiorrearhatch' || n.includes('rearhatch'))) {
      boot = obj;
    }
  });

  const doorLMeshes = doorL
    ? collectMeshesUnder(doorL)
    : collectMeshesByTokens(scene, ['DoorL', 'door_fl', 'door_l', 'doorLeft', 'doorleft']);
  const doorRMeshes = doorR
    ? collectMeshesUnder(doorR)
    : collectMeshesByTokens(scene, ['DoorR', 'door_fr', 'door_r', 'doorRight', 'doorright']);
  const doorRLMeshes = doorRL
    ? collectMeshesUnder(doorRL)
    : collectMeshesByTokens(scene, ['FenderRL_Part_Door', 'DoorRL', 'door_rl']);
  const doorRRMeshes = doorRR
    ? collectMeshesUnder(doorRR)
    : collectMeshesByTokens(scene, ['FenderRR_Part_Door', 'DoorRR', 'door_rr']);
  const hoodMeshes = hood
    ? collectMeshesUnder(hood)
    : collectMeshesByTokens(scene, ['Hood', 'Bonnet', 'grillHood']);
  const bootMeshes = boot
    ? collectMeshesUnder(boot)
    : collectMeshesByTokens(scene, ['Boot', 'Trunk', 'coveringTrunk']);

  return {
    doorL,
    doorR,
    doorRL,
    doorRR,
    hood,
    boot,
    doorLMeshes,
    doorRMeshes,
    doorRLMeshes,
    doorRRMeshes,
    hoodMeshes,
    bootMeshes,
  };
}

function makePartGroupFromMeshes(
  root: THREE.Object3D | null,
  meshes: THREE.Mesh[],
  openAxis: 'x' | 'y' | 'z',
  openAngle: number,
): VehiclePartGroup {
  // Only animate when we have a real authored pivot — never invent one for flat exports
  if (root) {
    return {
      root,
      meshes: meshes.length ? meshes : collectMeshesUnder(root),
      closedRotation: root.rotation.clone(),
      openAxis,
      openAngle,
    };
  }
  return {
    root: null,
    meshes,
    closedRotation: new THREE.Euler(),
    openAxis,
    openAngle,
  };
}

/** When GLB has no door meshes, pick left/right body panels as lock targets. */
function inferSideDoorProxies(body: THREE.Mesh[]): THREE.Mesh[] {
  if (body.length < 2) return body.slice(0, 1);
  const centers = body.map((m) => {
    const box = new THREE.Box3().setFromObject(m);
    return { mesh: m, x: box.getCenter(new THREE.Vector3()).x, size: box.getSize(new THREE.Vector3()) };
  });
  const xs = centers.map((c) => c.x).sort((a, b) => a - b);
  const mid = xs[Math.floor(xs.length / 2)] ?? 0;
  const span = Math.max(0.35, (xs[xs.length - 1] ?? 0) - (xs[0] ?? 0));
  const threshold = span * 0.18;
  const sides = centers.filter((c) => Math.abs(c.x - mid) >= threshold && c.size.y > 0.15);
  if (sides.length >= 2) {
    return sides
      .sort((a, b) => b.size.x * b.size.y - a.size.x * a.size.y)
      .slice(0, 6)
      .map((c) => c.mesh);
  }
  return body
    .slice()
    .sort((a, b) => {
      const sa = new THREE.Box3().setFromObject(a).getSize(new THREE.Vector3());
      const sb = new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3());
      return sb.x * sb.y - sa.x * sa.y;
    })
    .slice(0, Math.min(4, body.length));
}

/**
 * Map a loaded GLB using node / material names.
 * Falls back to body meshes when doors / paint aren't authored separately.
 */
export function mapGlbToVehicleMeshes(scene: THREE.Object3D): VehicleMeshMap | null {
  const root = new THREE.Group();
  root.name = 'VehicleRoot';
  root.add(scene);

  scene.traverse((obj) => {
    if (isEnvironmentObject(obj)) {
      obj.visible = false;
      obj.userData.role = 'environment';
    }
  });

  normalizeVehicleMaterials(scene);

  const body: THREE.Mesh[] = [];
  const glass: THREE.Mesh[] = [];
  const doors: THREE.Mesh[] = [];
  const doorProxies: THREE.Mesh[] = [];
  const hoodProxies: THREE.Mesh[] = [];
  const wheels: THREE.Mesh[] = [];
  const lights: THREE.Mesh[] = [];
  const paintMaterials: THREE.MeshStandardMaterial[] = [];
  const lockMarkers: THREE.Object3D[] = [];

  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (!obj.visible || obj.userData.role === 'environment') return;

    cloneMaterials(obj);
    storeBase(obj);
    obj.castShadow = true;
    obj.receiveShadow = true;

    const n = obj.name.toLowerCase();

    eachStandard(obj, (mat) => {
      if (isPaintMaterial(mat) && !paintMaterials.includes(mat)) paintMaterials.push(mat);
    });

    if (isDoorName(n)) {
      obj.userData.role = 'door';
      doors.push(obj);
      doorProxies.push(obj);
      body.push(obj);
      return;
    }
    if (n.includes('handle') || n.includes('handle_') || n.includes('knob')) {
      obj.userData.role = 'doorProxy';
      doorProxies.push(obj);
      return;
    }
    if (
      n.includes('grill') ||
      n.includes('grille') ||
      n.includes('radiator') ||
      n.includes('bonnet') ||
      n.includes('hood') ||
      n.includes('front bumper') ||
      n.includes('bumper_f') ||
      n.includes('bumperfront') ||
      n === 'under trunk'
    ) {
      obj.userData.role = 'hoodProxy';
      hoodProxies.push(obj);
      body.push(obj);
      return;
    }
    if (n.includes('glass') || n.includes('window') || n.includes('wind') || n.includes('transparent') || n.includes('glas')) {
      glass.push(obj);
      applyGlassLook([obj]);
      return;
    }
    if (n.includes('wheel') || n.includes('tire') || n.includes('tyre') || n.includes('rim') || n.includes('brake')) {
      wheels.push(obj);
      return;
    }
    if (
      n.includes('headlight') ||
      n.includes('taillight') ||
      n.includes('tail_light') ||
      n.includes('drl') ||
      (n.includes('light') &&
        !n.includes('license') &&
        !n.includes('wire') &&
        !n.includes('lightbucket') &&
        !n.includes('light_bucket'))
    ) {
      lights.push(obj);
      return;
    }

    obj.userData.role = 'body';
    body.push(obj);
  });

  if (!body.length && !doors.length && !wheels.length && !doorProxies.length) return null;

  // Re-store bases after normalize so lock/unlock restore to the lifted look
  for (const mesh of [...body, ...doors, ...doorProxies, ...hoodProxies, ...wheels, ...lights]) {
    eachStandard(mesh, (mat) => {
      mat.userData.baseColor = mat.color.getHex();
      mat.userData.baseEmissive = mat.emissive.getHex();
      mat.userData.baseEmissiveIntensity = mat.emissiveIntensity;
    });
  }

  // No authored paint mats → use body shell materials
  if (!paintMaterials.length) {
    for (const mesh of body) {
      if (mesh.userData.role === 'door') continue;
      eachStandard(mesh, (mat) => {
        if (!paintMaterials.includes(mat)) paintMaterials.push(mat);
      });
    }
  }

  // No door meshes → use handles, side panels, else inferred left/right body
  if (!doors.length) {
    const sidePanels = body.filter((m) => {
      const n = m.name.toLowerCase();
      return n.includes('side') || n.includes('fender') || n.includes('wing') || n.includes('quarter');
    });
    if (sidePanels.length) {
      for (const m of sidePanels) {
        if (!doorProxies.includes(m)) doorProxies.push(m);
      }
    } else if (!doorProxies.length || doorProxies.every((m) => m.userData.role === 'doorProxy')) {
      for (const m of inferSideDoorProxies(body)) {
        if (!doorProxies.includes(m)) doorProxies.push(m);
      }
    }
  }

  if (!hoodProxies.length) {
    const carBody = body.find((m) => /car body|body|chassis|hood|bonnet/i.test(m.name));
    if (carBody) hoodProxies.push(carBody);
    else if (body[0]) hoodProxies.push(body[0]);
  }

  const underGlow = makeUnderGlow();
  root.add(underGlow);
  const scanRing = makeScanRing();
  root.add(scanRing);

  const hasAuthoredDoors = doors.length > 0;
  // Always build flank overlays so lock/unlock colour is visible even when door
  // meshes are missing or too subtle after tint.
  const doorOverlays = makeDoorOverlays(scene);
  for (const overlay of doorOverlays) root.add(overlay);

  const markerAnchor = doors[0] ?? doorProxies[0] ?? body[0];
  if (markerAnchor) {
    lockMarkers.push(makeLockMarker(markerAnchor, -1), makeLockMarker(markerAnchor, 1));
    for (const m of lockMarkers) root.add(m);
  }

  const named = findNamedPartRoots(scene);
  // Left door opens outward (−Y on typical glTF car facing +Z); right opens +Y
  // Flat Vivek exports: highlight meshes only (no reparent/pivot) to avoid tearing panels
  const parts = {
    doorFrontLeft: makePartGroupFromMeshes(named.doorL, named.doorLMeshes, 'y', -1.05),
    doorFrontRight: makePartGroupFromMeshes(named.doorR, named.doorRMeshes, 'y', 1.05),
    doorRearLeft: makePartGroupFromMeshes(named.doorRL, named.doorRLMeshes, 'y', -0.95),
    doorRearRight: makePartGroupFromMeshes(named.doorRR, named.doorRRMeshes, 'y', 0.95),
    bonnet: makePartGroupFromMeshes(named.hood, named.hoodMeshes, 'x', -0.85),
    boot: makePartGroupFromMeshes(named.boot, named.bootMeshes, 'x', 0.95),
  };

  // Prefer structured part meshes as authored doors when present
  if (parts.doorFrontLeft.meshes.length || parts.doorFrontRight.meshes.length) {
    for (const mesh of [...parts.doorFrontLeft.meshes, ...parts.doorFrontRight.meshes]) {
      if (!doors.includes(mesh)) {
        mesh.userData.role = 'door';
        doors.push(mesh);
      }
    }
  }
  if (parts.bonnet.meshes.length) {
    for (const mesh of parts.bonnet.meshes) {
      if (!hoodProxies.includes(mesh)) hoodProxies.push(mesh);
    }
  }

  const nodeNames: string[] = [];
  scene.traverse((o) => {
    if (o.name) nodeNames.push(o.name);
  });

  return {
    root,
    body,
    glass,
    doors,
    doorProxies,
    doorOverlays,
    hoodProxies,
    wheels,
    lights,
    paintMaterials,
    underGlow,
    lockMarkers,
    scanRing,
    hasAuthoredDoors: doors.length > 0,
    parts,
    nodeNames,
  };
}

export function applyVehiclePaintColour(meshes: VehicleMeshMap, colourHex: number | null): void {
  if (colourHex == null) return;
  const target = new THREE.Color(colourHex);
  // Reject near-white / pastel washes that obliterate authored materials
  const lum = 0.2126 * target.r + 0.7152 * target.g + 0.0722 * target.b;
  if (lum > 0.78) return;

  for (const mat of meshes.paintMaterials) {
    if (mat.userData.role === 'glass' || mat.transparent) continue;
    mat.color.copy(target);
    mat.userData.baseColor = colourHex;
    mat.emissive.setHex(0x000000);
    mat.emissiveIntensity = 0;
    mat.needsUpdate = true;
  }
}

export type VehicleVisualMode = 'normal' | 'locked' | 'unlocked' | 'immobilised' | 'recovery' | 'panic';

export function resolveVehicleMode(state: VehicleRemoteState): VehicleVisualMode {
  if (state.panicActive) return 'panic';
  if (state.theftRecovery) return 'recovery';
  if (state.immobiliserOn) return 'immobilised';
  if (state.doorsLocked) return 'locked';
  return 'unlocked';
}

function lerpMat(
  mat: THREE.MeshStandardMaterial,
  tint: number,
  mix: number,
  emissiveIntensity: number,
): void {
  const base = (mat.userData.baseColor as number) ?? mat.color.getHex();
  // Keep enough of the base colour so geometry/detail stays readable
  mat.color.copy(new THREE.Color(base).lerp(new THREE.Color(tint), Math.min(mix, 0.55)));
  mat.emissive.setHex(tint);
  mat.emissiveIntensity = Math.min(emissiveIntensity, 0.65);
}

/** Strong whole-vehicle wash (ignition cut / panic / recovery) — readable on textured paint. */
function washMat(
  mat: THREE.MeshStandardMaterial,
  tint: number,
  mix: number,
  emissiveIntensity: number,
): void {
  if (mat.transparent && mat.opacity < 0.88) return;
  const base = (mat.userData.baseColor as number) ?? mat.color.getHex();
  mat.color.copy(new THREE.Color(base).lerp(new THREE.Color(tint), Math.min(Math.max(mix, 0), 0.92)));
  mat.emissive.setHex(tint);
  mat.emissiveIntensity = Math.min(Math.max(emissiveIntensity, 0), 1);
  mat.needsUpdate = true;
}

function washWholeCar(
  meshes: VehicleMeshMap,
  allShell: THREE.Mesh[],
  tint: number,
  mix: number,
  emissive: number,
): void {
  for (const mesh of allShell) {
    eachStandard(mesh, (mat) => washMat(mat, tint, mix, emissive));
  }
  for (const mat of meshes.paintMaterials) {
    washMat(mat, tint, mix, emissive);
  }
}

function showOverlays(meshes: VehicleMeshMap, tint: number, opacity: number, emissive: number): void {
  for (const overlay of meshes.doorOverlays) {
    overlay.visible = true;
    const mat = asStandard(overlay.material);
    if (!mat) continue;
    mat.color.setHex(tint);
    mat.emissive.setHex(tint);
    mat.emissiveIntensity = emissive;
    mat.opacity = opacity;
    mat.needsUpdate = true;
  }
}

function tintMeshes(meshes: THREE.Mesh[], tint: number, mix: number, emissive: number): void {
  for (const mesh of meshes) {
    eachStandard(mesh, (mat) => lerpMat(mat, tint, mix, emissive));
  }
}

/** Tint door / panel meshes only — skip glass, lights, and transparent windows. */
function tintDoorMeshes(meshes: THREE.Mesh[], tint: number, mix: number, emissive: number): void {
  for (const mesh of meshes) {
    const n = (mesh.name || '').toLowerCase();
    const role = mesh.userData.role as string | undefined;
    if (role === 'glass' || role === 'light' || role === 'environment') continue;
    if (
      n.includes('glass') ||
      n.includes('window') ||
      n.includes('wind') ||
      n.includes('light') ||
      n.includes('lamp')
    ) {
      continue;
    }
    eachStandard(mesh, (mat) => {
      if (mat.transparent && mat.opacity < 0.88) return;
      lerpMat(mat, tint, mix, emissive);
    });
  }
}

/** Prefer structured door parts; fall back to classified door meshes / side proxies. */
function doorMeshesForSlot(
  meshes: VehicleMeshMap,
  part: VehiclePartGroup,
  side: 'left' | 'right',
): THREE.Mesh[] {
  if (part.meshes.length) return part.meshes;

  const isLeftName = (n: string) =>
    /\b(fl|rl|left|_l\b|doorl|door_l|lcolor)/i.test(n) ||
    (n.includes('left') && !n.includes('right'));
  const isRightName = (n: string) =>
    /\b(fr|rr|right|_r\b|doorr|door_r|rcolor)/i.test(n) ||
    (n.includes('right') && !n.includes('left'));

  const named = meshes.doors.filter((m) => {
    const n = m.name.toLowerCase();
    return side === 'left' ? isLeftName(n) : isRightName(n);
  });
  if (named.length) return named;

  if (!meshes.doorProxies.length) return meshes.doors.slice();
  const centers = meshes.doorProxies.map((m) => {
    const box = new THREE.Box3().setFromObject(m);
    return { mesh: m, x: box.getCenter(new THREE.Vector3()).x };
  });
  const mid = centers.reduce((s, c) => s + c.x, 0) / Math.max(centers.length, 1);
  return centers.filter((c) => (side === 'left' ? c.x <= mid : c.x >= mid)).map((c) => c.mesh);
}

function animatePartOpen(part: VehiclePartGroup, open: boolean, soft = 0.18): void {
  if (!part.root) return;
  const closed = part.closedRotation;
  const axis = part.openAxis;
  const target = open ? part.openAngle : 0;
  const current =
    axis === 'x' ? part.root.rotation.x - closed.x : axis === 'y' ? part.root.rotation.y - closed.y : part.root.rotation.z - closed.z;
  const next = current + (target - current) * soft;
  if (axis === 'x') part.root.rotation.x = closed.x + next;
  else if (axis === 'y') part.root.rotation.y = closed.y + next;
  else part.root.rotation.z = closed.z + next;
}

function partForDoor(meshes: VehicleMeshMap, id: VehicleDoorId): VehiclePartGroup {
  if (id === 'frontLeft' || id === 'rearLeft') return meshes.parts.doorFrontLeft;
  return meshes.parts.doorFrontRight;
}

/**
 * Highlight a semantic component without mutating shared GLTF materials globally
 * (materials are cloned at load via cloneMaterials / normalize).
 */
export function highlightComponent(
  meshes: VehicleMeshMap,
  componentId: VehicleDoorId | 'boot' | 'bonnet' | 'body',
  status: VehicleHighlightStatus,
  pulse = 0,
): void {
  let targets: THREE.Mesh[] = [];
  if (componentId === 'boot') targets = meshes.parts.boot.meshes;
  else if (componentId === 'bonnet') targets = meshes.parts.bonnet.meshes;
  else if (componentId === 'body') targets = meshes.body;
  else targets = partForDoor(meshes, componentId).meshes;

  if (!targets.length) return;

  if (status === 'open') tintDoorMeshes(targets, OPEN_BLUE, 0.36, 0.32 + pulse * 0.18);
  else if (status === 'unlocked') tintDoorMeshes(targets, UNLOCK_AMBER, 0.3, 0.22 + pulse * 0.12);
  else if (status === 'locked') tintDoorMeshes(targets, LOCK_GREEN, 0.34, 0.28 + pulse * 0.16);
  else if (status === 'tamper' || status === 'panic') tintDoorMeshes(targets, LOCK_RED, 0.48, 0.4 + pulse * 0.25);
  else if (status === 'offline') tintDoorMeshes(targets, VEHICLE_VISUAL.offlineGrey, 0.35, 0);
}

/**
 * Security state → materials + panel animation.
 *
 * Colour language (telematics / ops):
 * - Body paint stays authored GLB materials when idle
 * - Doors LOCKED → green · UNLOCKED → amber · OPEN → blue (doors only)
 * - Boot/bonnet OPEN → blue
 * - Ignition cut / immobiliser → rose whole-vehicle wash + ground glow (not door-only)
 * - Theft recovery / stolen → amber body wash + ground glow
 * - Panic → bright whole-vehicle red + ground glow
 * - Offline → subtle desaturation
 */
export function applyVehicleVisualState(
  meshes: VehicleMeshMap,
  state: VehicleRemoteState,
  pulse = 0,
  telemetry?: { speedKph?: number | null; online?: boolean },
): void {
  const component = deriveVehicle3DState(state, telemetry);
  applyVehicleComponentState(meshes, component, pulse);
}

export function applyVehicleComponentState(
  meshes: VehicleMeshMap,
  component: Vehicle3DComponentState,
  pulse = 0,
): void {
  const bodyShell = meshes.body.filter((m) => m.userData.role !== 'door');
  const allShell = [
    ...bodyShell,
    ...meshes.doors,
    ...meshes.hoodProxies,
    ...meshes.doorProxies,
    ...meshes.parts.boot.meshes,
    ...meshes.parts.bonnet.meshes,
  ];

  for (const mat of meshes.paintMaterials) restoreBase(mat);
  for (const mesh of [...allShell, ...meshes.lights, ...meshes.wheels]) {
    eachStandard(mesh, restoreBase);
  }

  for (const overlay of meshes.doorOverlays) {
    overlay.visible = false;
    const mat = asStandard(overlay.material);
    if (mat) {
      mat.opacity = 0;
      mat.emissiveIntensity = 0;
    }
  }

  // Panel open animations (CarConcept pivots)
  animatePartOpen(meshes.parts.doorFrontLeft, component.doors.frontLeft.open || component.doors.rearLeft.open);
  animatePartOpen(meshes.parts.doorFrontRight, component.doors.frontRight.open || component.doors.rearRight.open);
  animatePartOpen(meshes.parts.bonnet, component.bonnet.open);
  animatePartOpen(meshes.parts.boot, component.boot.open);

  const glow = meshes.underGlow.material as THREE.MeshBasicMaterial;
  const ring = meshes.scanRing.material as THREE.MeshBasicMaterial;

  const openDoorPass = () => {
    for (const { id, part, side } of [
      { id: 'frontLeft' as const, part: meshes.parts.doorFrontLeft, side: 'left' as const },
      { id: 'frontRight' as const, part: meshes.parts.doorFrontRight, side: 'right' as const },
      {
        id: 'rearLeft' as const,
        part: meshes.parts.doorRearLeft.meshes.length ? meshes.parts.doorRearLeft : meshes.parts.doorFrontLeft,
        side: 'left' as const,
      },
      {
        id: 'rearRight' as const,
        part: meshes.parts.doorRearRight.meshes.length ? meshes.parts.doorRearRight : meshes.parts.doorFrontRight,
        side: 'right' as const,
      },
    ]) {
      if (!component.doors[id].open) continue;
      const targets = doorMeshesForSlot(meshes, part, side);
      if (targets.length) tintDoorMeshes(targets, OPEN_BLUE, 0.36, 0.32 + pulse * 0.18);
    }
    if (component.bonnet.open) tintDoorMeshes(meshes.parts.bonnet.meshes, OPEN_BLUE, 0.36, 0.32 + pulse * 0.18);
    if (component.boot.open) tintDoorMeshes(meshes.parts.boot.meshes, OPEN_BLUE, 0.36, 0.32 + pulse * 0.18);
  };

  if (component.panic) {
    washWholeCar(meshes, allShell, LOCK_RED, 0.78, 0.72 + pulse * 0.28);
    showOverlays(meshes, LOCK_RED, 0.42 + pulse * 0.12, 0.75 + pulse * 0.2);
    meshes.underGlow.visible = true;
    meshes.scanRing.visible = true;
    glow.color.setHex(LOCK_RED);
    glow.opacity = 0.55 + pulse * 0.28;
    ring.color.setHex(LOCK_RED);
    ring.opacity = 0.65 + pulse * 0.28;
    meshes.scanRing.rotation.z = pulse * Math.PI * 0.55;
    for (const marker of meshes.lockMarkers) marker.visible = false;
    return;
  }

  // Theft recovery / stolen — amber wash before normal door cues
  if (component.theftRecovery) {
    washWholeCar(meshes, allShell, RECOVERY_AMBER, 0.62, 0.48 + pulse * 0.22);
    showOverlays(meshes, RECOVERY_AMBER, 0.32 + pulse * 0.1, 0.55 + pulse * 0.18);
    meshes.underGlow.visible = true;
    meshes.scanRing.visible = true;
    glow.color.setHex(RECOVERY_AMBER);
    glow.opacity = 0.4 + pulse * 0.18;
    ring.color.setHex(RECOVERY_AMBER);
    ring.opacity = 0.5 + pulse * 0.2;
    meshes.scanRing.rotation.z = pulse * Math.PI * 0.4;
    for (const marker of meshes.lockMarkers) marker.visible = false;
    openDoorPass();
    return;
  }

  // Ignition cut / immobiliser — rose whole-car wash (distinct from panic red + unlock amber)
  if (component.immobiliserOn) {
    washWholeCar(meshes, allShell, CUT_ROSE, 0.82, 0.7 + pulse * 0.28);
    showOverlays(meshes, CUT_ROSE, 0.48 + pulse * 0.14, 0.8 + pulse * 0.2);
    meshes.underGlow.visible = true;
    meshes.scanRing.visible = true;
    glow.color.setHex(CUT_ROSE);
    glow.opacity = 0.52 + pulse * 0.22;
    ring.color.setHex(CUT_ROSE);
    ring.opacity = 0.62 + pulse * 0.22;
    meshes.scanRing.rotation.z = pulse * Math.PI * 0.45;
    for (const marker of meshes.lockMarkers) marker.visible = false;
    openDoorPass();
    return;
  }

  if (!component.online) {
    for (const mesh of allShell) {
      eachStandard(mesh, (mat) => lerpMat(mat, VEHICLE_VISUAL.offlineGrey, 0.32, 0));
    }
    for (const mat of meshes.paintMaterials) {
      lerpMat(mat, VEHICLE_VISUAL.offlineGrey, 0.32, 0);
    }
    meshes.underGlow.visible = false;
    meshes.scanRing.visible = false;
    glow.opacity = 0;
    ring.opacity = 0;
    for (const marker of meshes.lockMarkers) marker.visible = false;
    for (const overlay of meshes.doorOverlays) overlay.visible = false;
    return;
  }

  // Doors only: locked green · unlocked amber · open blue
  const doorMap: Array<{ id: VehicleDoorId; part: VehiclePartGroup; side: 'left' | 'right' }> = [
    { id: 'frontLeft', part: meshes.parts.doorFrontLeft, side: 'left' },
    { id: 'frontRight', part: meshes.parts.doorFrontRight, side: 'right' },
    {
      id: 'rearLeft',
      part: meshes.parts.doorRearLeft.meshes.length ? meshes.parts.doorRearLeft : meshes.parts.doorFrontLeft,
      side: 'left',
    },
    {
      id: 'rearRight',
      part: meshes.parts.doorRearRight.meshes.length ? meshes.parts.doorRearRight : meshes.parts.doorFrontRight,
      side: 'right',
    },
  ];

  let anyDoorTinted = false;
  const painted = new Set<THREE.Mesh>();
  for (const { id, part, side } of doorMap) {
    const st = component.doors[id];
    const targets = doorMeshesForSlot(meshes, part, side).filter((m) => !painted.has(m));
    if (!targets.length) continue;
    targets.forEach((m) => painted.add(m));
    if (st.open) {
      tintDoorMeshes(targets, OPEN_BLUE, 0.38, 0.34 + pulse * 0.2);
      anyDoorTinted = true;
    } else if (component.locked || st.locked) {
      tintDoorMeshes(targets, LOCK_GREEN, 0.34, 0.28 + pulse * 0.16);
      anyDoorTinted = true;
    } else {
      tintDoorMeshes(targets, UNLOCK_AMBER, 0.3, 0.24 + pulse * 0.14);
      anyDoorTinted = true;
    }
  }

  if (!anyDoorTinted && meshes.doors.length) {
    if (component.locked) tintDoorMeshes(meshes.doors, LOCK_GREEN, 0.34, 0.28 + pulse * 0.16);
    else tintDoorMeshes(meshes.doors, UNLOCK_AMBER, 0.3, 0.24 + pulse * 0.14);
    anyDoorTinted = true;
  }

  if (component.bonnet.open) {
    tintDoorMeshes(meshes.parts.bonnet.meshes, OPEN_BLUE, 0.38, 0.34 + pulse * 0.2);
  }
  if (component.boot.open) {
    tintDoorMeshes(meshes.parts.boot.meshes, OPEN_BLUE, 0.38, 0.34 + pulse * 0.2);
  }

  const showGlow = false;
  meshes.underGlow.visible = showGlow;
  meshes.scanRing.visible = showGlow;

  glow.opacity = 0;
  ring.opacity = 0;

  // Flank overlays when GLB has no door meshes
  if (meshes.doorOverlays.length && !meshes.hasAuthoredDoors) {
    const overlayTint = component.locked ? LOCK_GREEN : UNLOCK_AMBER;
    for (const overlay of meshes.doorOverlays) {
      overlay.visible = true;
      const mat = asStandard(overlay.material);
      if (mat) {
        mat.color.setHex(overlayTint);
        mat.emissive.setHex(overlayTint);
        mat.opacity = 0.5 + pulse * 0.08;
        mat.emissiveIntensity = 0.7 + pulse * 0.2;
      }
    }
  } else {
    for (const overlay of meshes.doorOverlays) {
      overlay.visible = false;
      const mat = asStandard(overlay.material);
      if (mat) {
        mat.opacity = 0;
        mat.emissiveIntensity = 0;
      }
    }
  }

  for (const marker of meshes.lockMarkers) {
    const mat = asStandard((marker as THREE.Mesh).material);
    const show = component.locked;
    marker.visible = show;
    if (mat) {
      mat.color.setHex(LOCK_GREEN);
      mat.emissive.setHex(LOCK_GREEN);
      mat.opacity = show ? 0.9 : 0;
      mat.emissiveIntensity = show ? 0.75 + pulse * 0.18 : 0;
    }
  }

  meshes.scanRing.rotation.z = pulse * Math.PI * 0.35;

  // Spin wheels gently when moving
  if (component.moving) {
    for (const wheel of meshes.wheels) {
      wheel.rotation.x += 0.12 + pulse * 0.05;
    }
  }

  for (const light of meshes.lights) {
    eachStandard(light, (mat) => {
      const n = light.name.toLowerCase();
      if ((n.includes('head') || n.includes('front')) && component.moving) {
        mat.emissive.setHex(0xfff2cc);
        mat.emissiveIntensity = 1.15;
      }
      if ((n.includes('tail') || n.includes('rear')) && (component.immobiliserOn || component.panic)) {
        mat.emissive.setHex(component.panic ? LOCK_RED : CUT_ROSE);
        mat.emissiveIntensity = 1.15 + pulse * 0.35;
      }
    });
  }
}

export function setDoorStateVisual(
  meshes: VehicleMeshMap,
  doorId: VehicleDoorId,
  open: boolean,
  pulse = 0,
): void {
  animatePartOpen(partForDoor(meshes, doorId), open, 1);
  highlightComponent(meshes, doorId, open ? 'open' : 'normal', pulse);
}

export function setBootStateVisual(meshes: VehicleMeshMap, open: boolean, pulse = 0): void {
  animatePartOpen(meshes.parts.boot, open, 1);
  highlightComponent(meshes, 'boot', open ? 'open' : 'normal', pulse);
}

export function setBonnetStateVisual(meshes: VehicleMeshMap, open: boolean, pulse = 0): void {
  animatePartOpen(meshes.parts.bonnet, open, 1);
  highlightComponent(meshes, 'bonnet', open ? 'open' : 'normal', pulse);
}

export function setVehiclePanicVisual(meshes: VehicleMeshMap, active: boolean, pulse = 0): void {
  applyVehicleComponentState(
    meshes,
    {
      ...deriveVehicle3DState({
        doorsLocked: true,
        immobiliserOn: false,
        theftRecovery: false,
        panicActive: active,
      }),
      panic: active,
    },
    pulse,
  );
}
