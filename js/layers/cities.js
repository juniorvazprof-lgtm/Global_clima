// Marcadores de cidades + marcador do ponto selecionado.
import { latLonToXYZ } from '../core/geo.js';

const THREE = window.THREE;

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.beginPath(); g.arc(32, 32, 20, 0, Math.PI * 2);
  g.fillStyle = '#ffffff'; g.fill();
  g.lineWidth = 8; g.strokeStyle = 'rgba(8,16,28,0.85)'; g.stroke();
  return new THREE.CanvasTexture(c);
}

function ringTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.beginPath(); g.arc(64, 64, 46, 0, Math.PI * 2);
  g.lineWidth = 10; g.strokeStyle = '#ffb547'; g.stroke();
  g.beginPath(); g.arc(64, 64, 8, 0, Math.PI * 2);
  g.fillStyle = '#ffb547'; g.fill();
  return new THREE.CanvasTexture(c);
}

export function createCities(ctx, { radius = 1.016 } = {}) {
  const group = new THREE.Group();
  ctx.scene.add(group);
  let points = null;

  const selected = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture(), depthTest: true, transparent: true }));
  selected.scale.setScalar(0.07);
  selected.visible = false;
  selected.renderOrder = 5;
  ctx.scene.add(selected);

  ctx.onTick(() => {
    // Mantém o anel do mesmo tamanho na tela independentemente do zoom.
    if (selected.visible) selected.scale.setScalar(0.028 * ctx.camera.position.distanceTo(selected.position));
  });

  return {
    group,
    setCities(cities) {
      if (points) group.remove(points);
      const pos = new Float32Array(cities.length * 3);
      cities.forEach((c, i) => pos.set(latLonToXYZ(c.lat, c.lon, radius), i * 3));
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.028, map: dotTexture(), transparent: true, alphaTest: 0.3, sizeAttenuation: true }));
      points.renderOrder = 4;
      group.add(points);
    },
    select(lat, lon) {
      if (lat == null) { selected.visible = false; return; }
      selected.position.set(...latLonToXYZ(lat, lon, 1.02));
      selected.visible = true;
    },
  };
}
