// Funções geográficas puras (sem dependência de Three.js) — testáveis no Node.

const DEG = Math.PI / 180;

/**
 * Converte lat/lon para um ponto na esfera, no mesmo sistema de UV
 * usado pela SphereGeometry do Three.js (u = 0 em lon −180°).
 */
export function latLonToXYZ(lat, lon, r = 1) {
  const theta = (90 - lat) * DEG;
  const phi = (lon + 180) * DEG;
  return [-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta)];
}

/** Inverso de latLonToXYZ. */
export function xyzToLatLon(x, y, z) {
  const r = Math.hypot(x, y, z);
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, y / r))) / DEG;
  let phi = Math.atan2(z, -x);
  if (phi < 0) phi += 2 * Math.PI;
  return { lat, lon: wrapLon(phi / DEG - 180) };
}

export function wrapLon(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** Distância angular (graus) entre dois pontos. */
export function angularDistance(lat1, lon1, lat2, lon2) {
  const a = lat1 * DEG, b = lat2 * DEG, d = (lon2 - lon1) * DEG;
  const c = Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(d);
  return Math.acos(Math.max(-1, Math.min(1, c))) / DEG;
}

/** Ponto subsolar aproximado (precisão ~1°, suficiente para o terminador). */
export function subsolarPoint(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - start) / 86400000;
  const g = (2 * Math.PI / 365.25) * (dayOfYear - 1);
  const decl = 23.44 * Math.sin((2 * Math.PI / 365.25) * (dayOfYear - 81));
  // Equação do tempo (minutos)
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const lon = wrapLon(-(utcMin + eot - 720) / 4);
  return { lat: decl, lon };
}

/** Direção do vento (de onde sopra, graus) + velocidade → componentes u (leste) e v (norte). */
export function windToUV(speed, fromDeg) {
  const r = fromDeg * DEG;
  return { u: -speed * Math.sin(r), v: -speed * Math.cos(r) };
}

export function uvToWind(u, v) {
  const speed = Math.hypot(u, v);
  let dir = Math.atan2(-u, -v) / DEG;
  if (dir < 0) dir += 360;
  return { speed, dir };
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'L', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
export function compass(dir) {
  return COMPASS[Math.round(dir / 22.5) % 16];
}

export function formatLatLon(lat, lon) {
  const la = `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? 'L' : 'O'}`;
  return `${la}, ${lo}`;
}
