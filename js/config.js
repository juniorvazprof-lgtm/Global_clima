// Configuração central do app. Ajuste aqui sem mexer no resto do código.

export const CONFIG = {
  // Grade do campo interpolado (graus por célula). 2° = 180 × 90 células.
  fieldStep: 2,

  // Pontos consultados na API ao vivo (além das cidades).
  // 132 pontos + 50 cidades × 48 coletas/dia = 8.736 locais/dia.
  liveGrid: { latStep: 15, lonStep: 30, latMax: 75 },

  // Quantas coordenadas por requisição ao Open-Meteo (limita o tamanho da URL).
  batchSize: 64,

  // Atualização automática (ms). O Open-Meteo atualiza "current" a cada 15 min.
  refreshMs: 30 * 60 * 1000,

  // Única fonte de condições reais para o navegador.
  snapshotUrl: 'data/latest.json',
  staleAfterMs: 90 * 60 * 1000,

  // Raio de influência do interpolador IDW (graus) e expoente.
  idw: { radiusDeg: 25, power: 2 },

  api: {
    forecast: 'https://api.open-meteo.com/v1/forecast',
    variables: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation',
      'cloud_cover',
      'wind_speed_10m',
      'wind_direction_10m',
      'weather_code',
      'wind_gusts_10m',
      'pressure_msl',
      'apparent_temperature',
    ],
  },

  globe: {
    autoRotateSpeed: 0.35,
    windParticles: 3500,
    windParticlesMobile: 2000,
  },

  // Faixa da escala de cores de temperatura (°C).
  tempRange: [-40, 45],
};
