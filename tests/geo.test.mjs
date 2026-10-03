import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latLonToXYZ, xyzToLatLon, windToUV, uvToWind, subsolarPoint, angularDistance, wrapLon } from '../js/core/geo.js';

test('lat/lon ↔ xyz é reversível', () => {
  for (const [lat, lon] of [[0, 0], [45, 90], [-33.9, 18.4], [-5.54, -35.82], [80, -170]]) {
    const r = xyzToLatLon(...latLonToXYZ(lat, lon));
    assert.ok(Math.abs(r.lat - lat) < 1e-6, `lat ${lat}`);
    assert.ok(Math.abs(wrapLon(r.lon - lon)) < 1e-6, `lon ${lon}`);
  }
});

test('vento: direção meteorológica → u/v → direção', () => {
  const { u, v } = windToUV(10, 270); // vento de oeste sopra para leste
  assert.ok(u > 9.99 && Math.abs(v) < 1e-9);
  const back = uvToWind(u, v);
  assert.ok(Math.abs(back.speed - 10) < 1e-9 && Math.abs(back.dir - 270) < 1e-9);
});

test('ponto subsolar perto do meio-dia UTC no equinócio', () => {
  const s = subsolarPoint(new Date(Date.UTC(2026, 2, 20, 12, 0)));
  assert.ok(Math.abs(s.lat) < 1.5);
  assert.ok(Math.abs(s.lon) < 3);
});

test('distância angular de um quarto de volta', () => {
  assert.ok(Math.abs(angularDistance(0, 0, 0, 90) - 90) < 1e-9);
});
