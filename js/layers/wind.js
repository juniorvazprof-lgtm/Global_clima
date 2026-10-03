// Partículas de vento advectadas pelo campo (u, v). Cada partícula é um traço curto
// da posição atual na direção do vento; a cauda escurece para dar sensação de fluxo.
import { sample } from '../data/field.js';
import { latLonToXYZ } from '../core/geo.js';

const THREE = window.THREE;

function randomLatLon() {
  const lat = (Math.asin(Math.random() * 2 - 1) * 180) / Math.PI; // uniforme na esfera
  return { lat: Math.max(-85, Math.min(85, lat)), lon: Math.random() * 360 - 180 };
}

export function createWind(ctx, { count = 3000, radius = 1.008 } = {}) {
  const positions = new Float32Array(count * 6);
  const colors = new Float32Array(count * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const lines = new THREE.LineSegments(geo, material);
  lines.renderOrder = 2;
  ctx.scene.add(lines);

  const p = Array.from({ length: count }, () => ({ ...randomLatLon(), age: Math.random() * 6 }));
  let field = null;
  const SPEED = 0.55; // graus por segundo por m/s (visual)
  const TRAIL = 0.09; // comprimento do traço (graus por m/s)

  function tick(dt) {
    if (!field || !lines.visible) return;
    for (let i = 0; i < count; i++) {
      const q = p[i];
      q.age += dt;
      if (q.age > 6) Object.assign(q, randomLatLon(), { age: 0 });
      const u = sample(field, 'u', q.lat, q.lon);
      const v = sample(field, 'v', q.lat, q.lon);
      const cosLat = Math.max(0.15, Math.cos((q.lat * Math.PI) / 180));
      q.lon += (u * SPEED * dt) / cosLat;
      q.lat += v * SPEED * dt;
      if (q.lon > 180) q.lon -= 360;
      if (q.lon < -180) q.lon += 360;
      if (q.lat > 85 || q.lat < -85) Object.assign(q, randomLatLon(), { age: 0 });

      const head = latLonToXYZ(q.lat, q.lon, radius);
      const tail = latLonToXYZ(q.lat - v * TRAIL, q.lon - (u * TRAIL) / cosLat, radius);
      positions.set(head, i * 6);
      positions.set(tail, i * 6 + 3);

      const speed = Math.hypot(u, v);
      const fadeIn = Math.min(1, q.age / 0.8) * Math.min(1, (6 - q.age) / 0.8);
      const k = Math.min(1, speed / 18) * 0.8 + 0.2;
      // Cabeça clara (ciano → branco conforme a velocidade); cauda apagada.
      colors.set([(0.45 + 0.55 * k) * fadeIn, (0.75 + 0.25 * k) * fadeIn, 1 * fadeIn], i * 6);
      colors.set([0, 0, 0], i * 6 + 3);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  ctx.onTick(tick);

  return {
    mesh: lines,
    setField(f) { field = f; },
  };
}
