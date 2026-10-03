// Campo meteorológico em grade regular lat/lon e utilitários de amostragem.
//
// Linha 0 = latitude +90 − step/2 (norte), coluna 0 = longitude −180 + step/2.
import { angularDistance, windToUV, wrapLon } from '../core/geo.js';

export const FIELD_KEYS = ['temp', 'rh', 'precip', 'cloud', 'u', 'v', 'windGust', 'pressure', 'feelsLike'];

export function createField(step) {
  const w = Math.round(360 / step);
  const h = Math.round(180 / step);
  const field = { step, w, h };
  for (const k of FIELD_KEYS) {
    field[k] = new Float32Array(w * h);
    if (['windGust', 'pressure', 'feelsLike'].includes(k)) field[k].fill(NaN);
  }
  return field;
}

export function cellCenter(field, row, col) {
  return { lat: 90 - (row + 0.5) * field.step, lon: -180 + (col + 0.5) * field.step };
}

/** Amostragem bilinear com longitude cíclica. */
export function sample(field, key, lat, lon) {
  const { w, h, step } = field;
  const arr = field[key];
  const fy = Math.min(h - 1, Math.max(0, (90 - lat) / step - 0.5));
  let fx = (wrapLon(lon) + 180) / step - 0.5;
  fx = ((fx % w) + w) % w;
  const y0 = Math.floor(fy), y1 = Math.min(h - 1, y0 + 1), ty = fy - y0;
  const x0 = Math.floor(fx), x1 = (x0 + 1) % w, tx = fx - x0;
  const a = arr[y0 * w + x0] * (1 - tx) + arr[y0 * w + x1] * tx;
  const b = arr[y1 * w + x0] * (1 - tx) + arr[y1 * w + x1] * tx;
  return a * (1 - ty) + b * ty;
}

export function sampleAll(field, lat, lon) {
  const out = {};
  for (const k of FIELD_KEYS) out[k] = sample(field, k, lat, lon);
  return out;
}

/**
 * Constrói um campo a partir de pontos esparsos por IDW (inverse distance weighting).
 * points: [{lat, lon, temp, rh, precip, cloud, windSpeed, windDir}]
 */
export function fieldFromPoints(points, { step, radiusDeg, power }) {
  const field = createField(step);
  const pts = points.map((p) => ({ ...p, ...windToUV(p.windSpeed, p.windDir) }));
  const keys = FIELD_KEYS;
  for (let r = 0; r < field.h; r++) {
    for (let c = 0; c < field.w; c++) {
      const { lat, lon } = cellCenter(field, r, c);
      const acc = Object.fromEntries(keys.map((k) => [k, 0]));
      const weights = Object.fromEntries(keys.map((k) => [k, 0]));
      let nearest = null, nearestD = Infinity;
      for (const p of pts) {
        // Pré-filtro barato por latitude antes do cálculo esférico.
        if (Math.abs(p.lat - lat) > radiusDeg) continue;
        const d = angularDistance(lat, lon, p.lat, p.lon);
        if (d < nearestD) { nearestD = d; nearest = p; }
        if (d > radiusDeg) continue;
        const wgt = 1 / Math.pow(Math.max(d, 0.25), power);
        for (const k of keys) {
          if (!Number.isFinite(p[k])) continue;
          acc[k] += p[k] * wgt;
          weights[k] += wgt;
        }
      }
      const i = r * field.w + c;
      for (const k of keys) {
        if (weights[k] > 0) field[k][i] = acc[k] / weights[k];
        else {
          const p = nearest || nearestOverall(pts, lat, lon);
          field[k][i] = Number.isFinite(p?.[k]) ? p[k] : NaN;
        }
      }
    }
  }
  return field;
}

function nearestOverall(pts, lat, lon) {
  let best = null, bd = Infinity;
  for (const p of pts) {
    const d = angularDistance(lat, lon, p.lat, p.lon);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

/** Estatísticas rápidas para o rodapé (média ponderada pela área). */
export function fieldStats(field) {
  let tw = 0, tsum = 0, tmin = Infinity, tmax = -Infinity, cloud = 0;
  for (let r = 0; r < field.h; r++) {
    const lat = cellCenter(field, r, 0).lat;
    const wgt = Math.cos((lat * Math.PI) / 180);
    for (let c = 0; c < field.w; c++) {
      const i = r * field.w + c;
      const t = field.temp[i];
      tsum += t * wgt; cloud += field.cloud[i] * wgt; tw += wgt;
      if (t < tmin) tmin = t;
      if (t > tmax) tmax = t;
    }
  }
  return { meanTemp: tsum / tw, minTemp: tmin, maxTemp: tmax, meanCloud: cloud / tw };
}
