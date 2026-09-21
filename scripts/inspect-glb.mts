import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync, writeFileSync } from 'fs';

async function inspect(file: string): Promise<string[]> {
  const lines: string[] = [];
  const buf = readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  await new Promise<void>((resolve, reject) => {
    new GLTFLoader().parse(
      ab,
      '',
      (gltf) => {
        const scene = gltf.scene;
        scene.updateMatrixWorld(true);
        const full = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
        lines.push(`FILE ${file}`);
        lines.push(`full ${full.toArray().map((n) => +n.toFixed(3)).join(',')}`);
        scene.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const s = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
          const mats = Array.isArray(o.material) ? o.material.length : 1;
          lines.push(
            `${o.name || '(unnamed)'} parent=${o.parent?.name || '?'} size=${s
              .toArray()
              .map((n) => +n.toFixed(2))
              .join(',')} mats=${mats}`,
          );
        });
        resolve();
      },
      reject,
    );
  });
  return lines;
}

const out = [
  ...(await inspect('apps/admin/public/vehicles/mercedes-benz-c-class/model.glb')),
  ...(await inspect('apps/admin/public/vehicles/audi-tt-rs/model.glb')),
];
writeFileSync('.tmp-glb-inspect.txt', out.join('\n'));
console.log(out.join('\n'));
