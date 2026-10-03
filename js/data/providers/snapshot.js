// O navegador lê apenas o snapshot publicado junto com o app.
import { CONFIG } from '../../config.js';

export const READING_KEYS = ['temp', 'rh', 'precip', 'cloud', 'windSpeed', 'windDir', 'windGust', 'pressure', 'feelsLike', 'code'];

export function validateSnapshot(data) {
  if (data?.schemaVersion !== 1 || data.source !== 'open-meteo'
    || !Number.isFinite(Date.parse(data.generatedAt)) || !Number.isFinite(Date.parse(data.observedAt))
    || !Array.isArray(data.points) || !data.points.length || !Array.isArray(data.cities)) {
    throw new Error('Arquivo de dados meteorológicos inválido');
  }
  function validateReading(p) {
    if (!p || !Number.isFinite(p.lat) || Math.abs(p.lat) > 90
      || !Number.isFinite(p.lon) || Math.abs(p.lon) > 180
      || READING_KEYS.some((key) => !Number.isFinite(p[key]))
      || p.rh < 0 || p.rh > 100 || p.cloud < 0 || p.cloud > 100
      || p.precip < 0 || p.windSpeed < 0 || p.windGust < 0 || p.pressure <= 0
      || p.windDir < 0 || p.windDir > 360) {
      throw new Error('Leitura incompleta ou inválida no arquivo meteorológico');
    }
  }
  data.points.forEach(validateReading);
  data.cities.forEach((c) => {
    if (typeof c.name !== 'string') throw new Error('Cidade inválida no arquivo meteorológico');
    validateReading(c.reading);
  });
  return data;
}

export const snapshotProvider = {
  id: 'live',
  label: 'Dados compartilhados · Open-Meteo',
  attribution: 'Dados meteorológicos: Open-Meteo.com (CC BY 4.0)',
  async load() {
    const response = await fetch(CONFIG.snapshotUrl, {
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Arquivo meteorológico indisponível (${response.status})`);
    const data = validateSnapshot(await response.json());
    return { ...data, observedAt: new Date(data.observedAt), generatedAt: new Date(data.generatedAt) };
  },
};
