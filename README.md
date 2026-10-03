# Globo do Clima

Globo terrestre 3D no navegador com as condições meteorológicas **atuais** do planeta, a partir de dados públicos e gratuitos. Funciona no celular e no desktop, sem etapa de build.

- **Temperatura, umidade e chuva** pintadas sobre o globo, com legenda
- **Vento** como partículas que seguem o campo (u, v)
- **Nuvens** em camada própria
- **Dia e noite** com a posição real do Sol (terminador)
- **Toque em qualquer ponto** para ler temperatura, vento, umidade, nuvens e chuva; perto de uma cidade, mostra a leitura dela
- Atualização automática a cada 30 min, com cache local

## Fontes de dados

| Uso | Fonte | Licença |
|---|---|---|
| Condições atuais | [Open-Meteo](https://open-meteo.com) (sem chave de API) | CC BY 4.0 |
| Máscara terra/oceano | Pacote [global-land-mask](https://github.com/toddkarin/global-land-mask) (dados GLOBE/NOAA) | domínio público / MIT |
| Biblioteca 3D | [Three.js](https://threejs.org) r147 via jsDelivr | MIT |

### Modos de dados

| Modo | O que faz |
|---|---|
| **Automático** (padrão) | Tenta o Open-Meteo; se a rede ou a política de segurança da página bloquear, cai para Demonstração e avisa o motivo. |
| **Ao vivo** | Só Open-Meteo. Mostra erro se não conseguir. |
| **Demonstração** | Campo sintético calculado no navegador (insolação por latitude, estação, ciclo diurno, continentalidade, ZCIT, trilhas de tempestade, alísios e ventos de oeste). Não são observações; serve para uso offline e como material didático. |

> Na pré-visualização do Claude (artifact), chamadas a sites externos são bloqueadas, então o app roda em Demonstração. Publicado no GitHub Pages ou servido localmente, ele usa os dados ao vivo.

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

## Publicar no GitHub Pages

1. Crie o repositório e envie os arquivos:
   ```bash
   git init && git add . && git commit -m "Globo do Clima: primeira versão"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/clima-globo-3d.git
   git push -u origin main
   ```
2. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. O workflow `.github/workflows/pages.yml` roda os testes e publica a cada push na `main`.

## Estrutura

```
index.html              página e marcação do painel
css/style.css           visual (tokens no topo)
data/cities.json        cidades de referência (nome, lat, lon)
js/
  main.js               ponto de entrada: liga cena, camadas, dados e interface
  config.js             parâmetros (grade, lotes, atualização, escalas)
  core/                 utilitários puros: eventos, estado, geografia
  data/                 provedores, interpolação, máscara de terra, ruído, códigos OMM
    providers/          openMeteo.js (ao vivo) e demo.js (sintético)
  globe/                cena Three.js, Terra, seleção por toque
  layers/               camadas visuais: escalar, nuvens, vento, cidades, escalas de cor
  ui/                   painel: controles, legenda, leitura do ponto
tests/                  testes com node:test (sem dependências)
docs/ARQUITETURA.md     fluxo de dados e como estender
```

Detalhes do fluxo e de como adicionar camadas ou provedores: [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Limites conhecidos

- O campo ao vivo é interpolado (IDW) entre ~400 pontos de grade (10° × 15°) e 50 cidades; serve para visão global, não para previsão local fina.
- O Open-Meteo é gratuito para uso não comercial dentro de limites razoáveis. Para muitos acessos simultâneos, mova a coleta para uma função agendada (ver ARQUITETURA.md) e sirva um JSON único.

## Licença

Código sob licença MIT. Dados do Open-Meteo sob CC BY 4.0: mantenha a atribuição visível.
