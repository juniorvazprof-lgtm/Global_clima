// Camada escalar (temperatura, umidade ou precipitação) pintada numa casca sobre o globo.
// Não recebe luz: o dado continua legível no lado noturno.
import { COLORMAPS, colorAt } from './colormaps.js';
import { sample } from '../data/field.js';

const THREE = window.THREE;
const W = 720, H = 360;

export function createScalarLayer(ctx, { radius = 1.003 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const c2d = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.55, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 96), material);
  mesh.renderOrder = 1;
  ctx.scene.add(mesh);

  let key = 'temp';
  let field = null;

  function paint() {
    if (!field || !COLORMAPS[key]) return;
    const map = COLORMAPS[key];
    const img = c2d.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      const lat = 90 - (y + 0.5) * (180 / H);
      for (let x = 0; x < W; x++) {
        const lon = -180 + (x + 0.5) * (360 / W);
        const v = sample(field, key, lat, lon);
        const [r, g, b] = colorAt(map, v);
        const i = (y * W + x) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b;
        // Precipitação: transparente onde não chove.
        img.data[i + 3] = key === 'precip' ? Math.min(255, (v / 0.6) * 255) : 255;
      }
    }
    c2d.putImageData(img, 0, 0);
    texture.needsUpdate = true;
  }

  return {
    mesh,
    setField(f) { field = f; paint(); },
    setKey(k) {
      key = k;
      mesh.visible = k !== 'none';
      if (mesh.visible) paint();
    },
    get key() { return key; },
  };
}
