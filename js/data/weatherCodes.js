// Códigos de tempo da OMM (WMO 4677, simplificados) usados pelo Open-Meteo.

const CODES = {
  0: 'Céu limpo',
  1: 'Predomínio de sol',
  2: 'Parcialmente nublado',
  3: 'Encoberto',
  45: 'Nevoeiro',
  48: 'Nevoeiro com geada',
  51: 'Garoa fraca',
  53: 'Garoa moderada',
  55: 'Garoa forte',
  56: 'Garoa congelante',
  57: 'Garoa congelante forte',
  61: 'Chuva fraca',
  63: 'Chuva moderada',
  65: 'Chuva forte',
  66: 'Chuva congelante',
  67: 'Chuva congelante forte',
  71: 'Neve fraca',
  73: 'Neve moderada',
  75: 'Neve forte',
  77: 'Grãos de neve',
  80: 'Pancadas fracas',
  81: 'Pancadas moderadas',
  82: 'Pancadas violentas',
  85: 'Pancadas de neve',
  86: 'Pancadas de neve fortes',
  95: 'Trovoada',
  96: 'Trovoada com granizo',
  99: 'Trovoada com granizo forte',
};

export function describeWeather(code) {
  return CODES[code] ?? '—';
}

/** Código aproximado a partir de cobertura, chuva e temperatura (modo demonstração). */
export function estimateCode({ cloud, precip, temp }) {
  if (precip > 4) return temp < 0 ? 75 : temp > 24 ? 95 : 65;
  if (precip > 1) return temp < 0 ? 73 : 63;
  if (precip > 0.2) return temp < 0 ? 71 : 61;
  if (cloud > 85) return 3;
  if (cloud > 50) return 2;
  if (cloud > 20) return 1;
  return 0;
}
