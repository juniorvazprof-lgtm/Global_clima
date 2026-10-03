// Coletor usado SOMENTE pelo script Node/GitHub Actions, nunca pelo navegador.
// https://open-meteo.com/en/docs
import { CONFIG } from '../../config.js';

/** Grade global de pontos de consulta. */
export function buildQueryGrid({ latStep, lonStep, latMax } = CONFIG.liveGrid) {
  const pts = [];
  for (let lat = -latMax; lat <= latMax + 1e-9; lat += latStep) {
    for (let lon = -180; lon < 180; lon += lonStep) pts.push({ lat, lon });
  }
  return pts;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function fetchJson(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Open-Meteo respondeu ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export function toReading(loc, cur) {
  return {
    ...loc,
    time: cur.time,
    temp: cur.temperature_2m,
    rh: cur.relative_humidity_2m,
    precip: cur.precipitation,
    cloud: cur.cloud_cover,
    windSpeed: cur.wind_speed_10m / 3.6, // km/h → m/s
    windDir: cur.wind_direction_10m,
    windGust: cur.wind_gusts_10m / 3.6,
    pressure: cur.pressure_msl,
    feelsLike: cur.apparent_temperature,
    code: cur.weather_code,
  };
}

/**
 * Busca as condições atuais de uma lista de locais.
 * Retorna leituras na mesma ordem dos locais (null quando faltou dado).
 */
export async function fetchCurrent(locations, { onProgress } = {}) {
  const batches = chunk(locations, CONFIG.batchSize);
  const out = [];
  let done = 0;
  for (const batch of batches) {
    const params = new URLSearchParams({
      latitude: batch.map((p) => p.lat.toFixed(2)).join(','),
      longitude: batch.map((p) => p.lon.toFixed(2)).join(','),
      current: CONFIG.api.variables.join(','),
      timezone: 'GMT',
      wind_speed_unit: 'kmh',
      temperature_unit: 'celsius',
      precipitation_unit: 'mm',
      forecast_days: '1',
    });
    const json = await fetchJson(`${CONFIG.api.forecast}?${params}`);
    const list = Array.isArray(json) ? json : [json];
    if (list.length !== batch.length) throw new Error('Resposta incompleta do Open-Meteo');
    batch.forEach((loc, i) => {
      const cur = list[i]?.current;
      out.push(cur && cur.temperature_2m != null ? toReading(loc, cur) : null);
    });
    done += batch.length;
    onProgress?.(done / locations.length);
  }
  return out;
}

export const openMeteoProvider = {
  id: 'live',
  label: 'Ao vivo · Open-Meteo',
  attribution: 'Dados meteorológicos: Open-Meteo.com (CC BY 4.0)',
  async load({ cities, onProgress }) {
    const grid = buildQueryGrid();
    const all = [...grid, ...cities];
    const readings = await fetchCurrent(all, { onProgress });
    const points = readings.filter(Boolean);
    if (points.length !== all.length) throw new Error('Coleta incompleta; o último arquivo válido será preservado');
    const cityReadings = readings.slice(grid.length);
    const times = points.map((p) => Date.parse(p.time + 'Z')).filter(Number.isFinite);
    return {
      points,
      cities: cities.map((c, i) => ({ ...c, reading: cityReadings[i] })),
      observedAt: times.length ? new Date(Math.max(...times)) : new Date(),
    };
  },
};
