import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fieldFromPoints, sample, fieldStats } from '../js/data/field.js';
import { demoField } from '../js/data/providers/demo.js';
import { isLand } from '../js/data/land.js';
import { buildQueryGrid } from '../js/data/providers/openMeteo.js';

test('máscara de terra reconhece continentes e oceanos', () => {
  assert.equal(isLand(-10, -55), 1); // Brasil
  assert.equal(isLand(0, -30), 0); // Atlântico
  assert.equal(isLand(-80, 0), 1); // Antártida
  assert.equal(isLand(20, 15), 1); // Saara
});

test('IDW reproduz o valor sobre o próprio ponto', () => {
  const pts = [
    { lat: 0, lon: 0, temp: 30, rh: 70, precip: 0, cloud: 10, windSpeed: 5, windDir: 90 },
    { lat: 0, lon: 20, temp: 20, rh: 50, precip: 0, cloud: 50, windSpeed: 5, windDir: 90 },
  ];
  const f = fieldFromPoints(pts, { step: 2, radiusDeg: 25, power: 2 });
  assert.ok(Math.abs(sample(f, 'temp', 1, 1) - 30) < 1.5);
  const mid = sample(f, 'temp', 0, 10);
  assert.ok(mid > 22 && mid < 28);
});

test('campo de demonstração tem valores plausíveis', () => {
  const f = demoField(new Date(Date.UTC(2026, 9, 2, 15)));
  const s = fieldStats(f);
  assert.ok(s.meanTemp > 5 && s.meanTemp < 25, `média ${s.meanTemp}`);
  assert.ok(s.minTemp > -70 && s.maxTemp < 55);
  assert.ok(sample(f, 'u', 45, -30) > 0, 'ventos de oeste nas latitudes médias');
  assert.ok(sample(f, 'u', 12, -40) < 0, 'alísios de leste nos trópicos');
});

test('grade de consulta cobre o globo', () => {
  const g = buildQueryGrid({ latStep: 10, lonStep: 15, latMax: 80 });
  assert.equal(g.length, 17 * 24);
});
