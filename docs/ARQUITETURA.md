# Arquitetura

## Fluxo de dados

1. **Coleta no GitHub** — `scripts/update-weather.mjs` usa `js/data/providers/openMeteo.js` para consultar 132 coordenadas globais mais as 50 cidades. Somente essa tarefa acessa a API externa.
2. **Snapshot** — todas as respostas precisam estar completas. A validação em `providers/snapshot.js` verifica versão, datas, coordenadas e campos numéricos antes da substituição atômica de `data/latest.json`.
3. **Publicação** — o workflow agendado faz commit do JSON e chama o workflow reutilizável do Pages com esse SHA; commits do `GITHUB_TOKEN` não disparam outro push workflow. Quando o Pages ainda não está habilitado, a coleta segue e a publicação é pulada com aviso.
4. **Navegador** — `snapshotProvider` lê somente `data/latest.json` com `cache: no-store`; `weatherService` reutiliza o campo em memória quando `generatedAt` não mudou. Não há cache persistente por visitante.
5. **Campo e interface** — IDW interpola temperatura, umidade, precipitação, nuvens, rajadas, pressão e sensação térmica numa grade de 2°. O vento é interpolado em componentes u/v. As cidades conservam suas leituras próprias, e o cartão mostra os novos campos.

O provedor de demonstração pula as etapas 1–3 e entrega o campo pronto.

## Convenções

- **Coordenadas**: `core/geo.js#latLonToXYZ` segue o UV da `SphereGeometry` do Three.js (u = 0 em −180°). Use sempre essa função para posicionar algo no globo.
- **Campo**: linha 0 = norte, coluna 0 = −180°. Use `sample(field, key, lat, lon)` (bilinear, longitude cíclica).
- **Unidades internas**: °C, %, mm por intervalo current, m/s e hPa. Conversões (km/h, rumo) só na interface.
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

## Coleta, limites e falhas

- Cron: `7,37 * * * *`, UTC. O GitHub pode atrasar execuções.
- 182 locais × 48 coletas = 8.736 locais/dia; 10 variáveis. O script bloqueia acima de 9.000 locais/dia. Execuções manuais e outros consumidores compartilham a margem de uso.
- Uma falha de HTTP, resposta parcial ou campo obrigatório ausente impede a escrita. Não há substituição por dados sintéticos no JSON real.
- JSON válido preservado em caso de falha; o navegador mostra a idade e sinaliza dados com mais de 90 minutos ou erro de recarga.
- Sem dados iniciais: modo automático usa demonstração claramente identificada; modo compartilhado mostra erro. Demonstração não estima os novos campos e apresenta “—”.
- Para aumentar a densidade da grade, revise a frequência/cota contratada e o limite conservador no script; não basta aumentar o tamanho dos lotes.

## Ideias de evolução

- Nuvens reais de satélite: tiles WMTS do NASA GIBS como textura da camada de nuvens
- Linha do tempo com previsão horária (o Open-Meteo entrega `hourly` na mesma chamada)
- Busca de cidade com a API de geocodificação do Open-Meteo
- Qualidade do ar (Open-Meteo Air Quality API)
