// Cena, câmera, controles e laço de renderização.
import { CONFIG } from '../config.js';

const THREE = window.THREE;

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.9, 3.4);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 1.35;
  controls.maxDistance = 6;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.7;
  controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotateSpeed = CONFIG.globe.autoRotateSpeed;
  let userZoomed = false;
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  renderer.domElement.addEventListener('wheel', () => { userZoomed = true; }, { passive: true });
  renderer.domElement.addEventListener('touchstart', (e) => { if (e.touches.length > 1) userZoomed = true; }, { passive: true });

  // Estrelas de fundo (estáticas)
  const starGeo = new THREE.BufferGeometry();
  const n = 1500;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 20;
    const s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(a), r * u, r * s * Math.sin(a)], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x8fa3c4, size: 0.06, sizeAttenuation: true, transparent: true, opacity: 0.7 })));

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Enquadra o globo (com a atmosfera) no menor dos dois campos de visão.
    const vHalf = (camera.fov * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    const fit = 1.16 / Math.sin(Math.min(vHalf, hHalf));
    if (!userZoomed) camera.position.setLength(fit);
    controls.maxDistance = Math.max(6, fit * 1.6);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  const tickers = new Set();
  const clock = new THREE.Clock();
  let running = true;

  function loop() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    controls.update();
    tickers.forEach((fn) => fn(dt));
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { clock.getDelta(); requestAnimationFrame(loop); }
  });

  return {
    THREE, renderer, scene, camera, controls,
    onTick: (fn) => { tickers.add(fn); return () => tickers.delete(fn); },
  };
}
