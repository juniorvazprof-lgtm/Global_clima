// Escalas de cor dos campos escalares. Cada uma: lista de [valor, [r,g,b]].

export const COLORMAPS = {
  temp: {
    label: 'Temperatura do ar a 2 m',
    unit: '°C',
    stops: [
      [-40, [62, 34, 120]],
      [-25, [74, 78, 182]],
      [-10, [60, 140, 214]],
      [0, [120, 200, 220]],
      [10, [150, 214, 150]],
      [18, [236, 220, 110]],
      [26, [244, 160, 70]],
      [34, [222, 82, 52]],
      [45, [150, 28, 50]],
    ],
    ticks: [-40, -20, 0, 20, 45],
  },
  rh: {
    label: 'Umidade relativa',
    unit: '%',
    stops: [
      [0, [168, 112, 56]],
      [25, [212, 178, 110]],
      [50, [210, 214, 170]],
      [70, [110, 190, 180]],
      [85, [56, 140, 190]],
      [100, [40, 74, 160]],
    ],
    ticks: [0, 25, 50, 75, 100],
  },
  precip: {
    label: 'Precipitação',
    unit: 'mm/h',
    stops: [
      [0, [40, 60, 90]],
      [0.2, [70, 140, 200]],
      [1, [80, 200, 160]],
      [3, [240, 210, 80]],
      [6, [230, 100, 60]],
      [10, [170, 40, 120]],
    ],
    ticks: [0, 1, 3, 6, 10],
  },
};

export function colorAt(map, value) {
  const s = map.stops;
  if (value <= s[0][0]) return s[0][1];
  for (let i = 1; i < s.length; i++) {
    if (value <= s[i][0]) {
      const [v0, c0] = s[i - 1];
      const [v1, c1] = s[i];
      const t = (value - v0) / (v1 - v0);
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
    }
  }
  return s[s.length - 1][1];
}

/** CSS linear-gradient da legenda (posições proporcionais ao valor). */
export function cssGradient(map) {
  const min = map.stops[0][0];
  const max = map.stops[map.stops.length - 1][0];
  const parts = map.stops.map(([v, [r, g, b]]) => `rgb(${r} ${g} ${b}) ${(((v - min) / (max - min)) * 100).toFixed(1)}%`);
  return `linear-gradient(90deg, ${parts.join(', ')})`;
}
