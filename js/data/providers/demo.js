// Provedor DEMONSTRAÇÃO: campo sintético guiado por física simples.
//
// Não são observações. Serve para o app funcionar sem rede (ou onde a API
// é bloqueada, como na pré-visualização) e como material didático:
//   • temperatura: insolação média por latitude + estação + ciclo diurno + continentalidade;
//   • nuvens: ZCIT, trilhas de tempestade e altas subtropicais;
//   • vento: alísios, ventos de oeste e polares de leste (células de Hadley, Ferrel e polar)
//     com perturbações tipo vórtice.
import { createField, cellCenter } from '../field.js';
import { subsolarPoint, latLonToXYZ, uvToWind } from '../../core/geo.js';
import { landFraction } from '../land.js';
import { fbm3 } from '../noise.js';
import { estimateCode } from '../weatherCodes.js';

const DEG = Math.PI / 180;

function gauss(x, mu, sigma) {
  const d = (x - mu) / sigma;
  return Math.exp(-d * d);
}

/** Ponto de amostragem do ruído, girando lentamente com o tempo (deriva para leste). */
function noisePos(lat, lon, hours, scale, drift) {
  const [x, y, z] = latLonToXYZ(lat, lon - hours * drift, 1);
  return [x * scale, y * scale, z * scale + hours * 0.02];
}

export function demoField(date, step = 2) {
  const field = createField(step);
  const sun = subsolarPoint(date);
  const decl = sun.lat;
  const hours = date.getTime() / 3600000;
  const seed = 7;

  for (let r = 0; r < field.h; r++) {
    for (let c = 0; c < field.w; c++) {
      const { lat, lon } = cellCenter(field, r, c);
      const i = r * field.w + c;
      const land = landFraction(lat, lon, 2);
      const absLat = Math.abs(lat);

      const [nx, ny, nz] = noisePos(lat, lon, hours, 2.4, 0.6);
      const syn = fbm3(nx, ny, nz, { octaves: 4, seed }) - 0.5; // −0,5…0,5

      // Temperatura
      const latEff = lat - decl * (0.3 + 0.5 * land);
      const cosEff = Math.max(0, Math.cos(latEff * DEG));
      let t = -18 + 46 * Math.pow(cosEff, 1.3);
      const hourAngle = lon - sun.lon;
      const diurnalAmp = 0.8 + 7.5 * land;
      t += diurnalAmp * Math.cos(lat * DEG) * Math.cos((hourAngle - 35) * DEG);
      if (lat < -62 && land > 0.5) t -= 22 * land; // manto de gelo antártico
      if (lat > 60 && lon > -60 && lon < -20 && land > 0.5) t -= 12 * land; // Groenlândia
      const desert = land * gauss(absLat, 24, 7);
      t += 3 * desert;
      t += syn * 9;

      // Nuvens (0–100 %)
      let cloud = 50
        + 55 * gauss(lat, decl * 0.4 + 5, 7) // ZCIT
        + 35 * gauss(absLat, 55, 11) // trilhas de tempestade
        - 35 * gauss(absLat, 24, 7) // altas subtropicais
        - 30 * desert
        + syn * 150;
      cloud = Math.max(0, Math.min(100, cloud));

      // Precipitação (mm/h)
      const wet = Math.max(0, (cloud - 72) / 28);
      const precip = wet * wet * (2 + 6 * gauss(lat, decl * 0.4 + 5, 8));

      // Umidade relativa (%)
      const rh = Math.max(8, Math.min(100, 80 - 25 * land - 35 * desert + cloud * 0.18 + syn * 20));

      // Vento (m/s): circulação geral + vórtices a partir de uma função de corrente
      const phi = lat * DEG;
      let u = 3 - 10 * Math.cos(4 * phi);
      let v = -3 * Math.sin(6 * phi);
      const e = 1.5;
      const [ax, ay, az] = noisePos(lat + e, lon, hours, 3.1, 0.9);
      const [bx, by, bz] = noisePos(lat - e, lon, hours, 3.1, 0.9);
      const [cx, cy, cz] = noisePos(lat, lon + e, hours, 3.1, 0.9);
      const [dx, dy, dz] = noisePos(lat, lon - e, hours, 3.1, 0.9);
      const dpsiDy = (fbm3(ax, ay, az, { octaves: 3, seed: 3 }) - fbm3(bx, by, bz, { octaves: 3, seed: 3 })) / (2 * e);
      const dpsiDx = (fbm3(cx, cy, cz, { octaves: 3, seed: 3 }) - fbm3(dx, dy, dz, { octaves: 3, seed: 3 })) / (2 * e * Math.max(0.2, Math.cos(phi)));
      u += -dpsiDy * 260;
      v += dpsiDx * 260;
      const friction = 1 - 0.35 * land;
      u *= friction;
      v *= friction;

      field.temp[i] = t;
      field.cloud[i] = cloud;
      field.precip[i] = precip;
      field.rh[i] = rh;
      field.u[i] = u;
      field.v[i] = v;
    }
  }
  return field;
}

export const demoProvider = {
  id: 'demo',
  label: 'Demonstração · campo sintético',
  attribution: 'Campo sintético gerado no navegador (não são observações)',
  async load({ cities, sampleFn, date = new Date() }) {
    const field = demoField(date);
    const withReadings = cities.map((c) => {
      const s = sampleFn(field, c.lat, c.lon);
      const { speed, dir } = uvToWind(s.u, s.v);
      return {
        ...c,
        reading: {
          temp: s.temp, rh: s.rh, precip: s.precip, cloud: s.cloud,
          windSpeed: speed, windDir: dir, code: estimateCode(s),
        },
      };
    });
    return { field, cities: withReadings, observedAt: date };
  },
};
