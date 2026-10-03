// Condições reais vêm exclusivamente de data/latest.json. Sem cache local divergente.
import { CONFIG } from '../config.js';
import { createEmitter } from '../core/events.js';
import { fieldFromPoints, sampleAll } from './field.js';
import { snapshotProvider } from './providers/snapshot.js';
import { demoProvider } from './providers/demo.js';

export function createWeatherService({ cities }) {
  const bus = createEmitter();
  let timer = null;
  let loading = false;
  let lastLive = null;

  async function loadLive() {
    const res = await snapshotProvider.load();
    if (!lastLive || +res.generatedAt !== +lastLive.generatedAt) {
      lastLive = {
        field: fieldFromPoints(res.points, { step: CONFIG.fieldStep, ...CONFIG.idw }),
        cities: res.cities, observedAt: res.observedAt, generatedAt: res.generatedAt,
        source: snapshotProvider,
      };
    }
    return { ...lastLive };
  }

  async function refresh(mode = 'auto') {
    if (loading) return;
    loading = true;
    bus.emit('loading', { mode });
    try {
      let result;
      if (mode === 'demo') {
        result = { ...await demoProvider.load({ cities, sampleFn: sampleAll }), source: demoProvider };
      } else {
        try {
          result = await loadLive();
        } catch (err) {
          if (lastLive) result = { ...lastLive, fallbackReason: describeError(err) };
          else {
            if (mode === 'live') throw err;
            result = { ...await demoProvider.load({ cities, sampleFn: sampleAll }), source: demoProvider, fallbackReason: describeError(err) };
          }
        }
      }
      if (result.source.id === 'live') {
        result.stale = Boolean(result.fallbackReason) || Date.now() - Math.min(+result.generatedAt, +result.observedAt) > CONFIG.staleAfterMs;
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
  if (['AbortError', 'TimeoutError'].includes(err?.name)) return 'O arquivo meteorológico demorou para responder.';
  if (err instanceof TypeError) return 'Não foi possível carregar o arquivo meteorológico (rede indisponível).';
  return err?.message || 'Erro desconhecido.';
}
