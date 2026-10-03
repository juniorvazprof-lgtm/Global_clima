// Orquestra provedores, cache e atualização periódica.
//
//   modo 'auto' → tenta Open-Meteo; se falhar (offline, CORS, CSP), cai para demonstração.
//   modo 'live' → só ao vivo;  modo 'demo' → só demonstração.
import { CONFIG } from '../config.js';
import { createEmitter } from '../core/events.js';
import { fieldFromPoints, sampleAll } from './field.js';
import { openMeteoProvider } from './providers/openMeteo.js';
import { demoProvider } from './providers/demo.js';

const CACHE_KEY = 'clima-globo-3d:live:v1';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.savedAt > CONFIG.cacheTtlMs) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, savedAt: Date.now() }));
  } catch {
    /* armazenamento indisponível: segue sem cache */
  }
}

export function createWeatherService({ cities }) {
  const bus = createEmitter();
  let timer = null;
  let loading = false;

  function buildLive(points, cityList, observedAt) {
    const field = fieldFromPoints(points, { step: CONFIG.fieldStep, ...CONFIG.idw });
    return { field, cities: cityList, observedAt: new Date(observedAt), source: openMeteoProvider };
  }

  async function loadLive() {
    const cached = readCache();
    if (cached) return buildLive(cached.points, cached.cities, cached.observedAt);
    const res = await openMeteoProvider.load({
      cities,
      onProgress: (p) => bus.emit('progress', p),
    });
    writeCache({ points: res.points, cities: res.cities, observedAt: res.observedAt.getTime() });
    return buildLive(res.points, res.cities, res.observedAt);
  }

  async function loadDemo() {
    const res = await demoProvider.load({ cities, sampleFn: sampleAll });
    return { ...res, source: demoProvider };
  }

  async function refresh(mode = 'auto') {
    if (loading) return;
    loading = true;
    bus.emit('loading', { mode });
    try {
      let result;
      if (mode === 'demo') {
        result = await loadDemo();
      } else {
        try {
          result = await loadLive();
        } catch (err) {
          if (mode === 'live') throw err;
          result = await loadDemo();
          result.fallbackReason = describeError(err);
        }
      }
      bus.emit('data', result);
    } catch (err) {
      bus.emit('error', describeError(err));
    } finally {
      loading = false;
    }
  }

  function start(mode) {
    stop();
    refresh(mode);
    timer = setInterval(() => refresh(mode), CONFIG.refreshMs);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { on: bus.on, refresh, start, stop };
}

function describeError(err) {
  if (err?.name === 'AbortError') return 'A API demorou demais para responder.';
  if (err instanceof TypeError) return 'A API não pôde ser acessada daqui (rede ou política de segurança).';
  return err?.message || 'Erro desconhecido.';
}
