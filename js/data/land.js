// Decodifica a máscara terra/oceano embutida e responde "é terra?" para lat/lon.
import { LAND_B64, LAND_W, LAND_H } from './landmask.js';

let bits = null;

function decode() {
  if (bits) return bits;
  const bin = typeof atob === 'function' ? atob(LAND_B64) : Buffer.from(LAND_B64, 'base64').toString('binary');
  bits = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bits[i] = bin.charCodeAt(i);
  return bits;
}

export function isLand(lat, lon) {
  const b = decode();
  const row = Math.min(LAND_H - 1, Math.max(0, Math.floor((90 - lat) / 180 * LAND_H)));
  const col = ((Math.floor((lon + 180) / 360 * LAND_W) % LAND_W) + LAND_W) % LAND_W;
  const idx = row * LAND_W + col;
  return (b[idx >> 3] >> (7 - (idx & 7))) & 1;
}

/** Fração de terra numa janela (suaviza litorais para o modelo de demonstração). */
export function landFraction(lat, lon, radiusDeg = 2) {
  let n = 0, s = 0;
  for (let dy = -radiusDeg; dy <= radiusDeg; dy += 1) {
    for (let dx = -radiusDeg; dx <= radiusDeg; dx += 1) {
      s += isLand(Math.max(-89.9, Math.min(89.9, lat + dy)), lon + dx);
      n++;
    }
  }
  return s / n;
}

export const LAND_SIZE = { w: LAND_W, h: LAND_H };
