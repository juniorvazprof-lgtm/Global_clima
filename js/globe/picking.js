// Converte um toque/clique (sem arrastar) em lat/lon na superfície do globo.
import { xyzToLatLon } from '../core/geo.js';

export function enablePicking(ctx, earthMesh, onPick) {
  const THREE = ctx.THREE;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const el = ctx.renderer.domElement;
  let down = null;

  el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  el.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 500;
    down = null;
    if (moved > 6 || !quick) return;
    const rect = el.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera);
    const hit = ray.intersectObject(earthMesh, false)[0];
    if (hit) onPick(xyzToLatLon(hit.point.x, hit.point.y, hit.point.z));
  });
}
