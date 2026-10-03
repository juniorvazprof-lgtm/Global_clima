import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { CONFIG } from '../js/config.js';
import { buildQueryGrid, openMeteoProvider } from '../js/data/providers/openMeteo.js';
import { validateSnapshot } from '../js/data/providers/snapshot.js';

export async function collectSnapshot({ cities, load = openMeteoProvider.load, now = new Date() }) {
  const gridCount = buildQueryGrid().length;
  // Orçamento conservador por local, mesmo com lotes: máximo de 9 mil/dia.
  if ((gridCount + cities.length) * 48 > 9000 || CONFIG.api.variables.length > 10) {
    throw new Error('Configuração excede o orçamento diário de consultas');
  }
  const result = await load({ cities });
  if (result.points.length !== gridCount + cities.length || result.cities.length !== cities.length) {
    throw new Error('Snapshot incompleto; mantendo o último arquivo válido');
  }
  return validateSnapshot({
    schemaVersion: 1,
    source: 'open-meteo',
    attribution: 'Open-Meteo.com (CC BY 4.0)',
    generatedAt: now.toISOString(),
    observedAt: result.observedAt.toISOString(),
    units: { temp: '°C', feelsLike: '°C', rh: '%', precip: 'mm', cloud: '%', windSpeed: 'm/s', windGust: 'm/s', windDir: '°', pressure: 'hPa' },
    grid: CONFIG.liveGrid,
    points: result.points,
    cities: result.cities,
  });
}

export async function updateWeather({ output = new URL('../data/latest.json', import.meta.url), load } = {}) {
  const cities = JSON.parse(await readFile(new URL('../data/cities.json', import.meta.url), 'utf8'));
  const data = await collectSnapshot({ cities, load });
  const path = output instanceof URL ? fileURLToPath(output) : output;
  await mkdir(resolve(path, '..'), { recursive: true });
  // Somente uma coleta integral e validada substitui o snapshot anterior.
  await writeFile(`${path}.tmp`, JSON.stringify(data) + '\n');
  await rename(`${path}.tmp`, path);
  console.log(`Salvos ${data.points.length} pontos e ${data.cities.length} cidades; observação ${data.observedAt}`);
  return data;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  updateWeather().catch((err) => { console.error(err.message); process.exitCode = 1; });
}
