// Esfera terrestre: textura gerada da máscara terra/oceano, luz solar real, atmosfera e graticulado.
import { isLand, LAND_SIZE } from '../data/land.js';
import { latLonToXYZ, subsolarPoint } from '../core/geo.js';

const THREE = window.THREE;

function mix(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const C = {
  oceanDeep: [11, 32, 52],
  oceanPolar: [26, 50, 66],
  tropical: [52, 92, 58],
  temperate: [86, 112, 72],
  arid: [168, 142, 98],
  tundra: [116, 122, 104],
  ice: [222, 230, 234],
};

function landColor(lat, lon) {
  const a = Math.abs(lat);
  if (lat < -62 || (lat > 60 && lon > -60 && lon < -20) || a > 74) return C.ice;
  let c = mix(C.tropical, C.arid, (a - 8) / 10);
  c = mix(c, C.temperate, (a - 32) / 10);
  c = mix(c, C.tundra, (a - 55) / 8);
  c = mix(c, C.ice, (a - 68) / 6);
  return c;
}

function buildTexture() {
  const { w, h } = LAND_SIZE;
  const small = document.createElement('canvas');
  small.width = w; small.height = h;
  const ctx = small.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const lat = 90 - (y + 0.5) * (180 / h);
    for (let x = 0; x < w; x++) {
      const lon = -180 + (x + 0.5) * (360 / w);
      const c = isLand(lat, lon) ? landColor(lat, lon) : mix(C.oceanDeep, C.oceanPolar, (Math.abs(lat) - 45) / 30);
      const i = (y * w + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // Amplia com suavização para litorais menos serrilhados.
  const big = document.createElement('canvas');
  big.width = 2048; big.height = 1024;
  const bctx = big.getContext('2d');
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = 'high';
  bctx.drawImage(small, 0, 0, big.width, big.height);
  const tex = new THREE.CanvasTexture(big);
  tex.anisotropy = 4;
  return tex;
}

function buildGraticule(radius) {
  const pts = [];
  const push = (a, b) => pts.push(...latLonToXYZ(a[0], a[1], radius), ...latLonToXYZ(b[0], b[1], radius));
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let lon = -180; lon < 180; lon += 4) push([lat, lon], [lat, lon + 4]);
  }
  for (let lon = -180; lon < 180; lon += 30) {
    for (let lat = -88; lat < 88; lat += 4) push([lat, lon], [lat + 4, lon]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x9fb8d0, transparent: true, opacity: 0.12, depthWrite: false }));
}

// Contorno dos litorais a partir da máscara (bordas entre células terra/oceano).
function buildCoastlines(radius) {
  const { w, h } = LAND_SIZE;
  const dLat = 180 / h, dLon = 360 / w;
  const land = (r, c) => isLand(90 - (r + 0.5) * dLat, -180 + (((c % w) + w) % w + 0.5) * dLon);
  const pts = [];
  for (let r = 0; r < h; r++) {
    const lat0 = 90 - r * dLat, lat1 = lat0 - dLat;
    for (let c = 0; c < w; c++) {
      const a = land(r, c);
      const lon1 = -180 + (c + 1) * dLon;
      if (a !== land(r, c + 1)) pts.push(...latLonToXYZ(lat0, lon1, radius), ...latLonToXYZ(lat1, lon1, radius));
      if (r < h - 1 && a !== land(r + 1, c)) {
        const lon0 = -180 + c * dLon;
        pts.push(...latLonToXYZ(lat1, lon0, radius), ...latLonToXYZ(lat1, lon1, radius));
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xdfe8f2, transparent: true, opacity: 0.45, depthWrite: false }));
  lines.renderOrder = 2;
  return lines;
}

function buildAtmosphere() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color(0x5aa8e0) } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0);
        gl_FragColor = vec4(color, f * 0.9); }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1.09, 64, 64), mat);
}

export function createEarth(ctx) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 96),
    new THREE.MeshPhongMaterial({ map: buildTexture(), shininess: 8, specular: 0x223344 }),
  );
  group.add(mesh);
  const graticule = buildGraticule(1.0015);
  group.add(graticule);
  const coastlines = buildCoastlines(1.0045);
  group.add(coastlines);
  group.add(buildAtmosphere());
  ctx.scene.add(group);

  const ambient = new THREE.AmbientLight(0xffffff, 0.22);
  const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.25);
  ctx.scene.add(ambient, sunLight);

  let sunlit = true;
  function updateSun(date = new Date()) {
    const s = subsolarPoint(date);
    const [x, y, z] = latLonToXYZ(s.lat, s.lon, 10);
    sunLight.position.set(x, y, z);
    return s;
  }
  function setSunlit(on) {
    sunlit = on;
    ambient.intensity = on ? 0.22 : 0.95;
    sunLight.intensity = on ? 1.25 : 0.25;
  }
  updateSun();
  setInterval(() => updateSun(), 60000);

  return {
    mesh, group, graticule, coastlines,
    updateSun, setSunlit,
    get sunlit() { return sunlit; },
  };
}
