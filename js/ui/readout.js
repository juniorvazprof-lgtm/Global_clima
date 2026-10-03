// Cartão de leitura do ponto selecionado no globo.
import { formatLatLon, compass, uvToWind, angularDistance } from '../core/geo.js';
import { describeWeather, estimateCode } from '../data/weatherCodes.js';

const fmt = {
  temp: (v) => `${Math.round(v)}°`,
  pct: (v) => `${Math.round(v)}%`,
  wind: (ms) => `${Math.round(ms * 3.6)} km/h`,
  mm: (v) => (v < 0.05 ? '0 mm/h' : `${v.toFixed(1)} mm/h`),
};

/** Cidade mais próxima dentro do raio (graus), ou null. */
export function nearestCity(cities, lat, lon, maxDeg = 3) {
  let best = null, bd = maxDeg;
  for (const c of cities) {
    const d = angularDistance(lat, lon, c.lat, c.lon);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function renderReadout(el, { lat, lon, values, city, source }) {
  // Se o toque caiu sobre uma cidade com leitura real, usa a leitura dela.
  const r = city?.reading;
  const useCity = Boolean(r);
  const v = useCity
    ? r
    : (() => {
      const w = uvToWind(values.u, values.v);
      return { ...values, windSpeed: w.speed, windDir: w.dir, code: estimateCode(values) };
    })();
  const place = city ? city.name : 'Ponto no globo';
  const pLat = city ? city.lat : lat, pLon = city ? city.lon : lon;
  const origin = useCity
    ? (source.id === 'live' ? 'Leitura da estação de modelo para esta cidade' : 'Valor do campo sintético nesta cidade')
    : (source.id === 'live' ? 'Interpolado entre os pontos consultados' : 'Valor do campo sintético');

  el.innerHTML = `
    <div class="readout-head">
      <h3 class="readout-place"></h3>
      <span class="readout-coords">${formatLatLon(pLat, pLon)}</span>
    </div>
    <div class="readout-main">
      <span class="readout-temp">${fmt.temp(v.temp)}<small style="font-size:18px">C</small></span>
      <span class="readout-sky">${describeWeather(v.code)}</span>
    </div>
    <dl class="readout-grid">
      <div><dt>Vento</dt><dd><span class="wind-arrow" style="transform:rotate(${(v.windDir + 180) % 360}deg)" aria-hidden="true">↑</span> ${fmt.wind(v.windSpeed)} ${compass(v.windDir)}</dd></div>
      <div><dt>Umidade</dt><dd>${fmt.pct(v.rh)}</dd></div>
      <div><dt>Nuvens</dt><dd>${fmt.pct(v.cloud)}</dd></div>
      <div><dt>Chuva</dt><dd>${fmt.mm(v.precip)}</dd></div>
      <div><dt>Rajadas</dt><dd>${Number.isFinite(v.windGust) ? fmt.wind(v.windGust) : '—'}</dd></div>
      <div><dt>Pressão ao nível do mar</dt><dd>${Number.isFinite(v.pressure) ? `${Math.round(v.pressure)} hPa` : '—'}</dd></div>
      <div><dt>Sensação térmica</dt><dd>${Number.isFinite(v.feelsLike) ? `${fmt.temp(v.feelsLike)}C` : '—'}</dd></div>
    </dl>
    <p class="readout-src">${origin}.</p>`;
  el.querySelector('.readout-place').textContent = place;
}
