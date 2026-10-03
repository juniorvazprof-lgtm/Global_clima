// Ponto de entrada: monta a cena, as camadas, o serviço de dados e a interface.
import { CONFIG } from './config.js';
import { createStore } from './core/state.js';
import { createScene } from './globe/scene.js';
import { createEarth } from './globe/earth.js';
import { enablePicking } from './globe/picking.js';
import { createScalarLayer } from './layers/scalarLayer.js';
import { createClouds } from './layers/clouds.js';
import { createWind } from './layers/wind.js';
import { createCities } from './layers/cities.js';
import { createWeatherService } from './data/weatherService.js';
import { sampleAll, fieldStats } from './data/field.js';
import { bindControls, renderStatus, renderStats } from './ui/controls.js';
import { renderReadout, nearestCity } from './ui/readout.js';

async function loadCities() {
  try {
    const res = await fetch('data/cities.json');
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch {
    return [];
  }
}

function timeLabel(date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

async function boot() {
  if (!window.THREE || !window.THREE.OrbitControls) {
    renderStatus({ state: 'error', text: 'Three.js não carregou', note: 'Verifique a conexão e recarregue a página.' });
    return;
  }

  const store = createStore({
    mode: 'auto',
    fieldKey: 'temp',
    wind: true,
    clouds: true,
    cities: true,
    sun: true,
    refreshNonce: 0,
  });
  bindControls(store);

  const ctx = createScene(document.getElementById('globe'));
  const earth = createEarth(ctx);
  const scalar = createScalarLayer(ctx);
  const isSmall = matchMedia('(max-width: 700px)').matches;
  const wind = createWind(ctx, { count: isSmall ? CONFIG.globe.windParticlesMobile : CONFIG.globe.windParticles });
  const clouds = createClouds(ctx);
  const citiesLayer = createCities(ctx);

  const cities = await loadCities();
  citiesLayer.setCities(cities);

  let current = null; // { field, cities, source, observedAt }
  let selection = null; // { lat, lon }

  function showSelection() {
    const el = document.getElementById('readout');
    if (!current || !selection) return;
    const city = nearestCity(current.cities, selection.lat, selection.lon, 2.5);
    renderReadout(el, {
      ...selection,
      values: sampleAll(current.field, selection.lat, selection.lon),
      city,
      source: current.source,
    });
    citiesLayer.select(city ? city.lat : selection.lat, city ? city.lon : selection.lon);
  }

  enablePicking(ctx, earth.mesh, (ll) => { selection = ll; showSelection(); });

  // Camadas reagem ao estado
  function applyLayers(s) {
    scalar.setKey(s.fieldKey);
    wind.mesh.visible = s.wind;
    clouds.mesh.visible = s.clouds;
    citiesLayer.group.visible = s.cities;
    earth.setSunlit(s.sun);
  }
  applyLayers(store.get());

  const service = createWeatherService({ cities });

  service.on('loading', () => renderStatus({ state: 'loading', text: 'Buscando dados…', busy: true }));
  service.on('progress', (p) => renderStatus({ state: 'loading', text: `Buscando dados… ${Math.round(p * 100)}%`, busy: true }));
  service.on('error', (msg) => renderStatus({
    state: 'error',
    text: 'Sem dados ao vivo',
    note: `${msg} Escolha <strong>Automático</strong> ou <strong>Demonstração</strong> para continuar.`,
  }));
  service.on('data', (res) => {
    current = res;
    scalar.setField(res.field);
    clouds.setField(res.field);
    wind.setField(res.field);
    earth.updateSun();
    renderStats(fieldStats(res.field));
    const live = res.source.id === 'live';
    const note = live
      ? `${res.source.attribution}. Campo interpolado entre uma grade global de pontos e ${res.cities.length} cidades; observação das ${timeLabel(res.observedAt)}. Atualiza a cada ${CONFIG.refreshMs / 60000} min.`
      : `<strong>Demonstração:</strong> campo sintético gerado no navegador a partir de insolação, estação e circulação geral, para as ${timeLabel(res.observedAt)} de agora. Não são observações.${res.fallbackReason ? ` Motivo: ${res.fallbackReason}` : ''}`;
    renderStatus({
      state: live ? 'live' : 'demo',
      text: live ? `Ao vivo · ${timeLabel(res.observedAt)}` : `Demonstração · ${timeLabel(res.observedAt)}`,
      note,
    });
    showSelection();
  });

  store.subscribe(({ state, keys }) => {
    applyLayers(state);
    if (keys.includes('mode')) service.start(state.mode);
    else if (keys.includes('refreshNonce')) service.refresh(state.mode);
  });

  service.start(store.get().mode);
}

boot();
