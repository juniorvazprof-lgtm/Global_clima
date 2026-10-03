import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toReading, buildQueryGrid } from '../js/data/providers/openMeteo.js';
import { snapshotProvider, validateSnapshot } from '../js/data/providers/snapshot.js';
import { collectSnapshot, updateWeather } from '../scripts/update-weather.mjs';
import { fieldFromPoints, sampleAll } from '../js/data/field.js';
import { createWeatherService } from '../js/data/weatherService.js';
import { CONFIG } from '../js/config.js';

const time = '2026-10-03T01:00';
const loc = { lat: 0, lon: 0 };
const current = { time, temperature_2m: 25, relative_humidity_2m: 70, precipitation: 0, cloud_cover: 20, wind_speed_10m: 36, wind_direction_10m: 90, wind_gusts_10m: 72, pressure_msl: 1013.2, apparent_temperature: 28, weather_code: 1 };
const reading = toReading(loc, current);
const snapshot = () => ({ schemaVersion: 1, source: 'open-meteo', generatedAt: '2026-10-03T01:01:00Z', observedAt: '2026-10-03T01:00:00Z', points: [reading], cities: [{ name: 'Teste', ...loc, reading }] });

test('novos campos mantêm unidades e chegam ao campo interpolado', () => {
  assert.equal(reading.windSpeed, 10);
  assert.equal(reading.windGust, 20);
  assert.equal(reading.pressure, 1013.2);
  assert.equal(reading.feelsLike, 28);
  const field = fieldFromPoints([reading], { step: 30, radiusDeg: 25, power: 2 });
  const values = sampleAll(field, 0, 0);
  assert.ok(Math.abs(values.pressure - 1013.2) < 0.001);
  assert.equal(values.windGust, 20);
  assert.equal(values.feelsLike, 28);
});

test('snapshot rejeita campos ausentes, null e datas inválidas', () => {
  for (const key of ['windGust', 'pressure', 'feelsLike']) {
    const data = snapshot(); data.points = [{ ...reading, [key]: null }];
    assert.throws(() => validateSnapshot(data), /Leitura/);
  }
  const data = snapshot(); data.generatedAt = 'inválido';
  assert.throws(() => validateSnapshot(data), /inválido/);
});

test('navegador consulta somente latest.json e ignora cache HTTP', async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url, options) => {
    urls.push(url); assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => snapshot() };
  };
  try {
    const service = createWeatherService({ cities: [] });
    const events = [];
    service.on('data', data => events.push(data));
    await service.refresh('live');
    await service.refresh('live');
    assert.deepEqual(urls, [CONFIG.snapshotUrl, CONFIG.snapshotUrl]);
    assert.equal(events.length, 2);
    assert.equal(events[0].field, events[1].field, 'reutiliza campo quando a coleta é a mesma');
    globalThis.fetch = async () => { throw new Error('offline'); };
    await service.refresh('live');
    assert.equal(events[2].source.id, 'live');
    assert.equal(events[2].stale, true);
    assert.equal(events[2].fallbackReason, 'offline');
  } finally { globalThis.fetch = original; }
});

test('grade e 50 cidades cabem no orçamento conservador da API', () => {
  assert.equal((buildQueryGrid().length + 50) * 48, 8736);
  assert.equal(CONFIG.api.variables.length, 10);
});

test('coleta incompleta não sobrescreve o último arquivo válido', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clima-'));
  const output = join(dir, 'latest.json');
  await writeFile(output, 'snapshot anterior');
  try {
    await assert.rejects(updateWeather({ output, load: async () => ({ points: [reading], cities: [], observedAt: new Date() }) }), /incompleto/);
    assert.equal(await readFile(output, 'utf8'), 'snapshot anterior');
    await assert.rejects(collectSnapshot({ cities: Array.from({ length: 60 }, () => loc) }), /orçamento/);
  } finally { await rm(dir, { recursive: true }); }
});

test('coleta completa produz JSON validado com timestamps UTC', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clima-'));
  const output = join(dir, 'latest.json');
  try {
    await updateWeather({ output, load: async ({ cities }) => ({
      points: Array.from({ length: buildQueryGrid().length + cities.length }, () => ({ ...reading })),
      cities: cities.map(c => ({ ...c, reading: { ...reading, lat: c.lat, lon: c.lon } })),
      observedAt: new Date(time + 'Z'),
    }) });
    const data = validateSnapshot(JSON.parse(await readFile(output, 'utf8')));
    assert.equal(data.points.length, 182);
    assert.equal(data.points[0].windGust, 20);
    assert.ok(data.generatedAt.endsWith('Z'));
  } finally { await rm(dir, { recursive: true }); }
});
