// Liga os controles do painel ao estado do app.
import { COLORMAPS, cssGradient } from '../layers/colormaps.js';

const $ = (id) => document.getElementById(id);

export function bindControls(store) {
  const seg = $('field-select');
  seg.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-key]');
    if (btn) store.set({ fieldKey: btn.dataset.key });
  });
  // Setas do teclado no grupo de rádio
  seg.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const btns = [...seg.querySelectorAll('button')];
    const i = btns.findIndex((b) => b.getAttribute('aria-checked') === 'true');
    const next = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
    next.focus();
    store.set({ fieldKey: next.dataset.key });
  });

  const toggles = { wind: 'layer-wind', clouds: 'layer-clouds', cities: 'layer-cities', sun: 'layer-sun' };
  for (const [key, id] of Object.entries(toggles)) {
    $(id).addEventListener('change', (e) => store.set({ [key]: e.target.checked }));
  }

  $('mode').addEventListener('change', (e) => store.set({ mode: e.target.value }));
  $('refresh').addEventListener('click', () => store.set({ refreshNonce: Date.now() }));
  $('status').addEventListener('click', () => $('mode').focus());

  function render({ fieldKey, mode, wind, clouds, cities, sun }) {
    seg.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.key === fieldKey;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    const map = COLORMAPS[fieldKey];
    $('legend').hidden = !map;
    if (map) {
      $('legend-bar').style.background = cssGradient(map);
      $('legend-ticks').innerHTML = map.ticks.map((t) => `<span>${t}</span>`).join('');
      $('legend-label').textContent = `${map.label} (${map.unit})`;
    }
    $('mode').value = mode;
    $('layer-wind').checked = wind;
    $('layer-clouds').checked = clouds;
    $('layer-cities').checked = cities;
    $('layer-sun').checked = sun;
  }

  render(store.get());
  store.subscribe(({ state }) => render(state));
}

export function renderStatus({ state, text, note, busy }) {
  const el = $('status');
  el.dataset.state = state;
  el.querySelector('.status-text').textContent = text;
  if (note != null) $('source-note').innerHTML = note;
  $('refresh').disabled = Boolean(busy);
}

export function renderStats(stats) {
  const t = (v) => `${v.toFixed(1)} °C`;
  $('stat-mean').textContent = t(stats.meanTemp);
  $('stat-min').textContent = t(stats.minTemp);
  $('stat-max').textContent = t(stats.maxTemp);
  $('stat-cloud').textContent = `${Math.round(stats.meanCloud)}%`;
}
