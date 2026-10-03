// Camada de nuvens: cobertura do campo modulada por textura fina fixa (dá aspecto de nuvem).
import { sample } from '../data/field.js';
import { fbm3 } from '../data/noise.js';
import { latLonToXYZ } from '../core/geo.js';

const THREE = window.THREE;
const W = 720, H = 360;

let detail = null;
function detailNoise() {
  if (detail) return detail;
  detail = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const lat = 90 - (y + 0.5) * (180 / H);
    for (let x = 0; x < W; x++) {
      const lon = -180 + (x + 0.5) * (360 / W);
      const [a, b, c] = latLonToXYZ(lat, lon, 9);
      detail[y * W + x] = fbm3(a, b, c, { octaves: 3, seed: 41 });
    }
  }
  return detail;
}

export function createClouds(ctx, { radius = 1.012 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const c2d = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshLambertMaterial({ map: texture, transparent: true, opacity: 0.85, depthWrite: false, emissive: 0x1c2533 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 72), material);
  mesh.renderOrder = 3;
  ctx.scene.add(mesh);

  function setField(field) {
    const d = detailNoise();
    const img = c2d.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      const lat = 90 - (y + 0.5) * (180 / H);
      for (let x = 0; x < W; x++) {
        const lon = -180 + (x + 0.5) * (360 / W);
        const cover = sample(field, 'cloud', lat, lon) / 100;
        // Limiar móvel: quanto maior a cobertura, mais da textura fina vira nuvem.
        const t = (d[y * W + x] - (1 - cover) * 0.75) / 0.18;
        const a = Math.max(0, Math.min(1, t)) * Math.min(1, cover * 1.4);
        const i = (y * W + x) * 4;
        img.data[i] = 245; img.data[i + 1] = 248; img.data[i + 2] = 252;
        img.data[i + 3] = a * 210;
      }
    }
    c2d.putImageData(img, 0, 0);
    texture.needsUpdate = true;
  }

  return { mesh, setField };
}
