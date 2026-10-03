# Arquitetura

## Fluxo de dados

```
Open-Meteo (lotes de 100 coords) ─┐
                                  ├─► weatherService ─► Campo (grade 2°) ─► camadas ─► globo
Demonstração (sintético) ─────────┘        │                 │
                                     cache local      fieldStats / sampleAll
                                     (25 min)                │
                                                       painel (estatísticas, leitura do ponto)
```

1. **Coleta** — `data/providers/openMeteo.js` monta uma grade (10° lat × 15° lon, de −80° a 80°) mais as cidades de `data/cities.json` e consulta o endpoint `current` em lotes.
2. **Normalização** — cada resposta vira uma leitura `{lat, lon, temp, rh, precip, cloud, windSpeed (m/s), windDir}`.
3. **Campo** — `data/field.js` interpola as leituras por IDW numa grade regular de 2° (180 × 90). Vento é interpolado como componentes `u`/`v`, nunca como ângulo.
4. **Camadas** — cada camada em `layers/` recebe o campo com `setField(field)` e se redesenha.
5. **Interface** — `ui/` lê o estado (`core/state.js`) e mostra controles, legenda, estatísticas e o cartão do ponto tocado.

O provedor de demonstração pula as etapas 1–3 e entrega o campo pronto.

## Convenções

- **Coordenadas**: `core/geo.js#latLonToXYZ` segue o UV da `SphereGeometry` do Three.js (u = 0 em −180°). Use sempre essa função para posicionar algo no globo.
- **Campo**: linha 0 = norte, coluna 0 = −180°. Use `sample(field, key, lat, lon)` (bilinear, longitude cíclica).
- **Unidades internas**: °C, %, mm/h, m/s. Conversões (km/h, rumo) só na interface.
- **Sem build**: módulos ES nativos; Three.js como script global (`window.THREE`).

## Como adicionar uma camada

1. Crie `js/layers/minhaCamada.js` exportando `createMinhaCamada(ctx)` que retorna `{ mesh, setField(field) }`.
2. Instancie em `main.js`, chame `setField` no evento `data` e ligue a visibilidade ao estado.
3. Adicione o controle em `index.html` e o vínculo em `ui/controls.js`.

Para um novo campo escalar (ex.: pressão), basta incluir a chave em `FIELD_KEYS` (`data/field.js`), preenchê-la nos provedores e criar a escala em `layers/colormaps.js`; `scalarLayer.js` já sabe pintá-la.

## Como adicionar um provedor

Um provedor é um objeto `{ id, label, attribution, load({ cities, onProgress }) }` que resolve para:

- `{ points, cities, observedAt }` (pontos esparsos → o serviço interpola), ou
- `{ field, cities, observedAt }` (campo pronto).

Registre-o em `data/weatherService.js`.

## Escalando para muitos usuários

Se o app ficar popular, não deixe cada visitante consultar a API. Mova a coleta para uma tarefa agendada (GitHub Actions com `schedule`, Cloudflare Worker com cron ou similar) que gera `data/latest.json` a cada 30 min, e crie um provedor que só lê esse arquivo. O resto do app não muda.

## Ideias de evolução

- Nuvens reais de satélite: tiles WMTS do NASA GIBS como textura da camada de nuvens
- Linha do tempo com previsão horária (o Open-Meteo entrega `hourly` na mesma chamada)
- Busca de cidade com a API de geocodificação do Open-Meteo
- Qualidade do ar (Open-Meteo Air Quality API)
