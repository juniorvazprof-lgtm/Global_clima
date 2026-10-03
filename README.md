# Globo do Clima

Globo terrestre 3D no navegador com as condições meteorológicas **atuais** do planeta, a partir de dados públicos e gratuitos. Funciona no celular e no desktop, sem etapa de build.

- **Temperatura, umidade e chuva** pintadas sobre o globo, com legenda
- **Vento** como partículas que seguem o campo (u, v)
- **Nuvens** em camada própria
- **Dia e noite** com a posição real do Sol (terminador)
- **Toque em qualquer ponto** para ler temperatura, vento, umidade, nuvens e chuva; perto de uma cidade, mostra a leitura dela
- Rajadas de vento, pressão ao nível do mar e sensação térmica no cartão do ponto
- Coleta compartilhada agendada a cada 30 min: os visitantes leem somente `data/latest.json`, sem chamadas ao Open-Meteo

## Fontes de dados

| Uso | Fonte | Licença |
|---|---|---|
| Condições atuais | [Open-Meteo](https://open-meteo.com) (sem chave de API) | CC BY 4.0 |
| Máscara terra/oceano | Pacote [global-land-mask](https://github.com/toddkarin/global-land-mask) (dados GLOBE/NOAA) | domínio público / MIT |
| Biblioteca 3D | [Three.js](https://threejs.org) r147 via jsDelivr | MIT |

### Modos de dados

| Modo | O que faz |
|---|---|
| **Automático** (padrão) | Lê `data/latest.json`; se o arquivo não estiver disponível e não houver uma coleta já carregada, usa Demonstração e avisa o motivo. |
| **Ao vivo** | Somente o arquivo compartilhado do Open-Meteo. Preserva a última coleta carregada quando a rede falha, com aviso; se não houver dados, mostra erro. |
| **Demonstração** | Campo sintético calculado no navegador (insolação por latitude, estação, ciclo diurno, continentalidade, ZCIT, trilhas de tempestade, alísios e ventos de oeste). Não são observações; serve para uso offline e como material didático. |

> Demonstração é um modo didático explícito, sem observações reais. Os três novos campos aparecem como “—” nesse modo, sem valores inventados.

## Rodar localmente

Módulos ES precisam de um servidor HTTP (abrir o `index.html` direto do disco não funciona).

```bash
npm start            # serve em http://localhost:5173
# ou
python3 -m http.server 5173
```

Testes (Node 18+):

```bash
npm test
```

## Coleta automática e publicação

O workflow [Atualizar dados meteorológicos](.github/workflows/update-weather.yml) roda em `main` nos minutos **07 e 37 de cada hora (UTC)**. Também pode ser executado por **Actions → Atualizar dados meteorológicos → Run workflow**; mudanças no coletor disparam uma coleta inicial.

1. Executa os testes e consulta o Open-Meteo em 3 lotes de até 64 coordenadas.
2. Valida todos os pontos e grava `data/latest.json` de forma atômica. Se qualquer lote ou campo falhar, a execução falha e o arquivo anterior é preservado.
3. Faz commit exclusivamente do JSON usando `GITHUB_TOKEN` com `contents: write`. Não exige chave de API ou token pessoal; regras de proteção da branch precisam permitir o bot.
4. Chama o workflow reutilizável do Pages com o SHA exato da revisão salva. Isso é necessário porque o push de `GITHUB_TOKEN` não dispara outro workflow de push.

Para publicar o app, configure **Settings → Pages → Build and deployment → Source: GitHub Actions**. Se o Pages ainda não estiver habilitado, a publicação é pulada com um aviso; a coleta e os commits continuam funcionando.

O agendamento é de 30 min, mas o GitHub pode atrasar execuções. O app informa a data da observação e sinaliza coleta antiga após 90 min. Cada atualização do navegador busca o JSON novamente, sem cache local persistente.

### Gerar o arquivo localmente

```bash
npm run update-weather
npm start
```

### Orçamento da API

A grade de **15° de latitude × 30° de longitude**, de −75° a 75°, tem 132 pontos; somada às 50 cidades, são **182 locais por coleta**. O orçamento conservador é **8.736 consultas de locais/dia** (48 coletas), com 10 variáveis, abaixo de 10.000/dia no plano gratuito. Lotes não são tratados como desconto por coordenada. Execuções manuais, novas cidades e outras aplicações usando a mesma cota consomem margem adicional; o script bloqueia configurações que superam 9.000 locais/dia ou 10 variáveis.

A grade é mais esparsa que a original para caber nesse orçamento; a interpolação continua em 2°, e as 50 cidades têm leituras próprias. O arquivo contém `schemaVersion`, `generatedAt`, `observedAt`, unidades, pontos e cidades; vento e rajadas usam m/s, pressão usa hPa e temperaturas usam °C.

Referências: [Open-Meteo](https://open-meteo.com/en/docs), [cotas](https://open-meteo.com/en/pricing), [GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token), [agendamento](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Estrutura

```
index.html              página e marcação do painel
css/style.css           visual (tokens no topo)
data/cities.json        cidades de referência (nome, lat, lon)
data/latest.json        condições reais compartilhadas, geradas pelo Action
scripts/update-weather.mjs coleta e valida o snapshot
js/
  main.js               ponto de entrada: liga cena, camadas, dados e interface
  config.js             parâmetros (grade, lotes, atualização, escalas)
  core/                 utilitários puros: eventos, estado, geografia
  data/                 provedores, interpolação, máscara de terra, ruído, códigos OMM
    providers/          snapshot.js (navegador), openMeteo.js (coletor), demo.js (sintético)
  globe/                cena Three.js, Terra, seleção por toque
  layers/               camadas visuais: escalar, nuvens, vento, cidades, escalas de cor
  ui/                   painel: controles, legenda, leitura do ponto
tests/                  testes com node:test (sem dependências)
docs/ARQUITETURA.md     fluxo de dados e como estender
```

Detalhes do fluxo e de como adicionar camadas ou provedores: [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Limites conhecidos

- O campo ao vivo é interpolado (IDW) entre 132 pontos de grade (15° × 30°) e 50 cidades; serve para visão global, não para previsão local fina.
- O Open-Meteo é gratuito para uso não comercial dentro de limites razoáveis. A coleta centralizada já está implementada: os visitantes não gastam a cota da API.

## Licença

Código sob licença MIT. Dados do Open-Meteo sob CC BY 4.0: mantenha a atribuição visível.
