# Flexato

> Etanol ou gasolina? A resposta certa para o **seu** carro.

Flexato é uma calculadora que diz se compensa mais abastecer com etanol ou gasolina, levando em conta o consumo real do seu carro flex, e não a regra genérica dos 70%.

Este repositório contém a versão **web** (frontend, backend e banco de dados). O aplicativo mobile fica em um repositório separado e consome a API deste projeto.

## O problema

A maioria das calculadoras divide o preço do etanol pelo da gasolina e recomenda etanol quando o resultado é menor que 0,7. Essa regra pressupõe que todo carro faz no etanol 70% dos km/l que faz na gasolina. Isso não é verdade: alguns carros chegam perto de 75%, outros ficam abaixo de 65%. Nesses casos a regra erra a recomendação.

## O diferencial

O Flexato usa o consumo de cada carro:

- Consumo em **cidade** e **estrada**, com **etanol** e **gasolina** (4 valores por carro).
- Dados pré-preenchidos a partir da tabela oficial do Inmetro (PBEV), sempre editáveis pelo usuário.
- Preço médio dos combustíveis da sua cidade ou do seu estado, com base no levantamento semanal da ANP, também editável.

### Como o cálculo funciona

Para cada combustível, o sistema calcula o custo por quilômetro ponderado pelo perfil de uso informado (% cidade / % estrada):

```
custo_km = %cidade × (preço / consumo_cidade) + %estrada × (preço / consumo_estrada)
```

O combustível com o menor `custo_km` vence. A ponderação é feita sobre o custo por km, e não sobre a média simples dos km/l, que distorce o resultado quando os consumos de cidade e estrada são muito diferentes.

## Funcionalidades (MVP)

- **Calculadora sem login**: escolha um carro do catálogo (ou informe os consumos), confira os preços e veja a recomendação na hora.
- **Perfil de uso**: atalhos Cidade, Estrada e Ambos (50/50), mais um ajuste fino em % cidade/estrada.
- **Economia em R$**: quanto você economiza por tanque cheio e por mês com a escolha recomendada.
- **Catálogo de carros flex**: importado da tabela PBEV do Inmetro (marca, modelo, versão e os 4 consumos).
- **Carro personalizado**: se o seu carro não estiver no catálogo, cadastre nome e consumos. Esse cadastro fica privado na sua conta.
- **Conta opcional**: salve seus carros e acesse os mesmos dados no aplicativo mobile.
- **Localização automática**: com sua permissão, o navegador informa a localização para descobrir sua cidade e UF. Também é possível escolher manualmente.
- **Preços por localidade**: média da sua cidade quando a ANP tiver dados dela, ou média da UF.

## Roadmap

- Registro de abastecimentos (litros + hodômetro) para calcular o consumo real e sugerir ajuste nos km/l do carro.
- Faixa de preço da semana (mínimo / médio / máximo) e "preço de virada": até quanto o etanol compensa para o seu carro.
- Histórico e gráficos de preço por localidade.

## Stack

| Camada            | Tecnologia                                                            |
| ----------------- | --------------------------------------------------------------------- |
| Web (front + API) | [Next.js](https://nextjs.org/) 16 com TypeScript                      |
| UI                | [Tailwind CSS](https://tailwindcss.com/) 4                            |
| Banco de dados    | PostgreSQL via [Supabase](https://supabase.com/) (PostGIS na fatia 2) |
| Autenticação      | Supabase Auth                                                         |

## Arquitetura

- **Web e API no mesmo projeto Next.js.** A API REST é exposta em `/api/v1` e é o único contrato usado pelo site e pelo aplicativo mobile. Toda regra de negócio (cálculo, carros, preços) fica no backend.
- **Autenticação via Supabase.** O app mobile faz login no Supabase e chama a API com o JWT do usuário.
- **Jobs de importação:**
  - **Preços (semanal)**: baixa a planilha do Levantamento de Preços de Combustíveis da ANP e grava a média por município e por UF.
  - **Catálogo de carros (sob demanda)**: importa a tabela PBEV do Inmetro sempre que uma nova versão é publicada.
- **Geolocalização**: a malha municipal do IBGE é armazenada no PostGIS. A localização do usuário é convertida em município/UF no próprio banco, sem serviços de terceiros.

## Fontes de dados

| Dado                   | Fonte                                                                                                                                                                                               | Formato             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Consumo dos veículos   | [Inmetro – PBE Veicular](https://www.gov.br/inmetro/pt-br/assuntos/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular) | PDF / planilha      |
| Preço dos combustíveis | [ANP – Levantamento de Preços de Combustíveis](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas)     | XLSX semanal        |
| Malha municipal        | [IBGE – Malhas territoriais](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais.html)                                                                                | Shapefile / GeoJSON |

Os valores do Inmetro vêm de testes padronizados e podem diferir do consumo no dia a dia. Os preços da ANP são médias semanais e podem variar entre postos. Por isso, o usuário sempre pode editar ambos.

## API

Todas as rotas ficam em `/api/v1`. As rotas de garagem exigem `Authorization: Bearer <access_token do Supabase>`.

| Método         | Rota                                | Descrição                                                                     |
| -------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| GET            | `/locais`                           | UFs e municípios com preço na semana mais recente                             |
| GET            | `/precos?uf=SP&municipio=SAO PAULO` | Média de etanol e gasolina da cidade, ou da UF quando a cidade não tem dados  |
| GET            | `/catalogo?q=onix&limite=50`        | Busca no catálogo de veículos                                                 |
| POST           | `/calculo`                          | Calcula o combustível mais vantajoso                                          |
| GET / POST     | `/carros`                           | Lista ou cria carros da garagem                                               |
| PATCH / DELETE | `/carros/{id}`                      | Altera ou remove um carro da garagem                                          |
| GET            | `/jobs/precos-anp`                  | Importa o resumo semanal da ANP (exige `Authorization: Bearer <CRON_SECRET>`) |

Erros seguem o formato `{ "erro": { "codigo", "mensagem", "detalhes"? } }`.

## Como rodar

Pré-requisitos: Node.js 24 e um projeto no [Supabase](https://supabase.com/dashboard).

1. Instale as dependências: `npm install`.
2. Copie `.env.example` para `.env.local` e preencha com os dados do projeto (Project Settings → API Keys). Gere um valor aleatório para `CRON_SECRET`.
3. Aplique o schema e o seed. Escolha uma opção:
   - Cole `supabase/migrations/20261111000000_schema_inicial.sql` e depois `supabase/seed.sql` no SQL Editor do Supabase.
   - Ou use a CLI: `npx supabase link --project-ref <ref>`, `npx supabase db push` e rode o seed no SQL Editor.
4. Em Authentication → URL Configuration, adicione `http://localhost:3000/carros` às Redirect URLs. Para entrar com Google ou Apple, habilite os provedores em Authentication → Providers. O login por link de e-mail funciona sem configuração extra.
5. Rode `npm run dev` e importe os preços da semana:

   ```bash
   curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/v1/jobs/precos-anp
   ```

Em produção na Vercel, o `vercel.json` agenda esse job uma vez por dia. Ele só grava quando a ANP publica uma semana nova. Configure `CRON_SECRET` nas variáveis do projeto para a Vercel enviar o token.

### Scripts

| Script              | O que faz                                 |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento               |
| `npm run build`     | Build de produção                         |
| `npm test`          | Testes (Vitest)                           |
| `npm run typecheck` | Gera os tipos de rota e roda o TypeScript |
| `npm run lint`      | ESLint                                    |
| `npm run format`    | Prettier                                  |

## Status

Fatia 1 implementada: calculadora, preços da ANP por cidade/UF, garagem com login e API para o app.

Próximos passos (fatia 2):

- Importar a tabela PBEV do Inmetro. Hoje o catálogo tem só valores de exemplo, marcados como `fonte = 'exemplo'`.
- Localização automática com PostGIS e a malha municipal do IBGE.

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).
