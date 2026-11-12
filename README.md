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
- **Faixa de preço da semana**: mínimo, médio e máximo da ANP abaixo de cada preço, para comparar com o posto.
- **Histórico de preços**: gráfico do preço médio semanal de etanol e gasolina na sua cidade ou UF.
- **Editar carro**: renomeie e ajuste os quatro consumos direto na garagem.
- **Abastecimentos e consumo real**: registre litros e hodômetro a cada abastecimento. O Flexato mede o consumo real e sugere atualizar o km/l do carro, sempre com a sua confirmação.

### Como o consumo real é medido

O método é o de tanque cheio a tanque cheio, separado por combustível:

- Cada abastecimento com tanque cheio fecha um intervalo e abre o próximo. O consumo do intervalo é `km rodados entre os dois enchimentos ÷ litros abastecidos desde o anterior` (somando os parciais do meio).
- O primeiro tanque cheio só abre a medição. Os litros dos parciais antes dele não entram na conta.
- O combustível medido é o que estava no tanque na abertura, não o do abastecimento que fecha: os litros do fechamento só repõem o que foi queimado. Por isso o intervalo só vale quando o tanque estava puro na abertura e todos os parciais do meio são do mesmo combustível.
- O tanque fica puro depois de um tanque cheio quando o abastecimento que o abriu e os parciais desde então são todos do mesmo combustível do novo enchimento. Na prática, depois de uma troca de etanol para gasolina (ou o contrário), o primeiro intervalo é descartado e a medição volta no seguinte. O primeiro tanque cheio sem histórico é considerado puro. O que sobrou de antes do enchimento anterior é desprezado, porque já foi diluído por dois enchimentos.
- O intervalo é descartado quando o hodômetro volta ou não avança, quando há litros zerados, quando o tanque tinha mistura de combustíveis ou quando o resultado fica fora de 2 a 40 km/l, sinal de abastecimento não registrado ou hodômetro digitado errado. Um intervalo descartado por qualquer motivo continua contando para saber se o tanque seguinte está puro.
- O trecho do intervalo é cidade ou estrada quando todos os abastecimentos que o fecham marcam o mesmo trecho. Só nesses casos o app sugere trocar o km/l correspondente. Os demais aparecem como "trechos misturados".
- Com vários intervalos, o resultado é `soma dos km ÷ soma dos litros`.

## Roadmap

- Aplicativo mobile (repositório separado) consumindo a API `/api/v1`.
- Editar abastecimentos já registrados (hoje só é possível registrar e remover).

## Stack

| Camada            | Tecnologia                                                     |
| ----------------- | -------------------------------------------------------------- |
| Web (front + API) | [Next.js](https://nextjs.org/) 16 com TypeScript               |
| UI                | [Tailwind CSS](https://tailwindcss.com/) 4                     |
| Banco de dados    | PostgreSQL via [Supabase](https://supabase.com/) (com PostGIS) |
| Autenticação      | Supabase Auth                                                  |

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

| Método         | Rota                                                     | Descrição                                                                                                           |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| GET            | `/locais`                                                | UFs e municípios com preço na semana mais recente                                                                   |
| GET            | `/localizacao?lat=-23.55&lng=-46.63`                     | Município e UF do ponto (malha do IBGE) e a chave da ANP quando a cidade tem preço                                  |
| GET            | `/precos?uf=SP&municipio=SAO PAULO`                      | Média de etanol e gasolina da cidade, ou da UF quando a cidade não tem dados                                        |
| GET            | `/precos/historico?uf=SP&municipio=SAO PAULO&semanas=12` | Séries semanais de etanol e gasolina (1 a 104 semanas, padrão 12), com a UF quando a cidade não tem dados na semana |
| GET            | `/catalogo?q=onix&limite=50`                             | Busca no catálogo de veículos                                                                                       |
| POST           | `/calculo`                                               | Calcula o combustível mais vantajoso                                                                                |
| GET / POST     | `/carros`                                                | Lista ou cria carros da garagem                                                                                     |
| PATCH / DELETE | `/carros/{id}`                                           | Altera ou remove um carro da garagem                                                                                |
| GET / POST     | `/carros/{id}/abastecimentos`                            | Lista (com o consumo real medido) ou registra abastecimentos do carro                                               |
| DELETE         | `/carros/{id}/abastecimentos/{abastecimentoId}`          | Remove um abastecimento                                                                                             |
| GET            | `/jobs/precos-anp`                                       | Importa o resumo semanal da ANP (exige `Authorization: Bearer <CRON_SECRET>`)                                       |

Erros seguem o formato `{ "erro": { "codigo", "mensagem", "detalhes"? } }`.

### Limite de requisições

Cada IP pode fazer até **120 leituras por minuto** (`/locais`, `/precos`, `/catalogo`, `/calculo` e `GET /carros`) e **30 escritas por minuto** (`POST /carros`, `PATCH` e `DELETE /carros/{id}`). Acima disso a API responde `429` com o código `muitas_requisicoes` e o header `Retry-After` (em segundos). O job da ANP não tem limite, porque já exige o `CRON_SECRET`.

A contagem fica na memória de cada instância do servidor. Na Vercel, cada instância serverless conta separadamente e zera quando é reciclada. Por isso o limite segura rajadas de um mesmo cliente, mas não garante uma cota global exata. Para um limite global, há duas opções sem mudar o contrato da API: as regras de rate limit do Firewall da Vercel (confira a disponibilidade no seu plano) ou trocar o armazenamento de `src/lib/api/limite.ts` por um compartilhado, como Redis ou uma tabela no Postgres.

O IP do cliente vem de `x-real-ip` ou, na falta dele, do primeiro valor de `x-forwarded-for`. Isso pressupõe um proxy confiável na frente da aplicação (a Vercel, no deploy deste projeto) que sobrescreva esses headers com o IP real. Sem esse proxy, por exemplo com `next start` exposto direto, o próprio cliente define os headers e pode trocar de "IP" a cada requisição para escapar do limite.

## Como rodar

Pré-requisitos: Node.js 24 e um projeto no [Supabase](https://supabase.com/dashboard).

1. Instale as dependências: `npm install`.
2. Copie `.env.example` para `.env.local` e preencha com os dados do projeto (Project Settings → API Keys). Gere um valor aleatório para `CRON_SECRET`.
3. Aplique o schema e o seed. Escolha uma opção:
   - Cole no SQL Editor do Supabase, nesta ordem: `supabase/migrations/20261111000000_schema_inicial.sql`, `supabase/migrations/20261112000000_busca_catalogo_sem_acento.sql`, `supabase/migrations/20261113000000_localizacao_municipios.sql`, `supabase/migrations/20261114000000_abastecimentos.sql` e `supabase/seed.sql`.
   - Ou use a CLI: `npx supabase link --project-ref <ref>`, `npx supabase db push` e rode o seed no SQL Editor.
4. Importe a malha municipal do IBGE (usada pela localização automática):

   ```bash
   npm run importar:malha
   ```

   A migration `20261113000000_localizacao_municipios.sql` já habilita o PostGIS no schema `extensions` (`create extension if not exists postgis with schema extensions`). Se o SQL Editor recusar, habilite em Database → Extensions → postgis, escolhendo o schema `extensions`, e rode a migration de novo.

   O script baixa a malha da [API de malhas do IBGE](https://servicodados.ibge.gov.br/api/docs/malhas?versao=4) em qualidade intermediária (cerca de 14 MB, 5.571 municípios), junta com nome e UF da API de localidades e grava em lotes na tabela `municipios_ibge` usando `SUPABASE_SECRET_KEY` do `.env.local`. No banco, a tabela ocupa cerca de 11 MB. Opções: `--qualidade=minima` (cerca de 4 MB, fronteiras menos precisas) e `--simular` (baixa e valida sem gravar). Pode rodar de novo quando o IBGE atualizar a malha: os municípios existentes são atualizados.

5. Em Authentication → URL Configuration, adicione `http://localhost:3000/carros` às Redirect URLs. Para entrar com Google ou Apple, habilite os provedores em Authentication → Providers. O login por link de e-mail funciona sem configuração extra.
6. Rode `npm run dev` e importe os preços da semana:

   ```bash
   curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/v1/jobs/precos-anp
   ```

7. Importe o catálogo de carros da tabela PBEV do Inmetro (usa `SUPABASE_SECRET_KEY` do `.env.local`):

   ```bash
   npm run importar:pbev -- --simular   # baixa e lê o PDF, mostra o resumo e não grava nada
   npm run importar:pbev                # grava as versões flex com fonte 'inmetro' e remove os valores de exemplo
   ```

   O script acha o PDF mais recente na página do PBE Veicular. Para outra edição, use `--url=<link do PDF>` ou `--arquivo=<caminho local>`. Só entram carros flex com consumo de cidade e estrada em etanol e gasolina; a versão inclui motor e transmissão. Rode de novo sempre que o Inmetro publicar uma tabela nova: as versões existentes são atualizadas e as de edições anteriores continuam no catálogo. Os valores de exemplo só são removidos depois que a importação grava tudo com sucesso.

Em produção na Vercel, o `vercel.json` agenda esse job uma vez por dia. Ele só grava quando a ANP publica uma semana nova. Configure `CRON_SECRET` nas variáveis do projeto para a Vercel enviar o token.

### Scripts

| Script                   | O que faz                                        |
| ------------------------ | ------------------------------------------------ |
| `npm run dev`            | Servidor de desenvolvimento                      |
| `npm run build`          | Build de produção                                |
| `npm test`               | Testes (Vitest)                                  |
| `npm run typecheck`      | Gera os tipos de rota e roda o TypeScript        |
| `npm run lint`           | ESLint                                           |
| `npm run format`         | Prettier                                         |
| `npm run importar:pbev`  | Importa o catálogo da tabela PBEV do Inmetro     |
| `npm run importar:malha` | Importa a malha municipal do IBGE para o PostGIS |

## Deploy na Vercel

1. Importe o repositório na Vercel. O framework Next.js é detectado sozinho e o `vercel.json` já agenda o job da ANP.
2. Em Settings → Environment Variables, cadastre para Production (e Preview, se for usar):

   | Variável                               | Valor                                                                |
   | -------------------------------------- | -------------------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`             | URL do projeto no Supabase                                           |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publishable                                                    |
   | `SUPABASE_SECRET_KEY`                  | Chave secret (só no servidor; nunca use prefixo `NEXT_PUBLIC_`)      |
   | `CRON_SECRET`                          | Valor aleatório longo, por exemplo a saída de `openssl rand -hex 32` |

   As variáveis `NEXT_PUBLIC_*` entram no bundle e na política de segurança (CSP) durante o build. Se mudar alguma delas, faça um novo deploy.

3. **Cron**: quando `CRON_SECRET` está configurada, a Vercel envia `Authorization: Bearer <CRON_SECRET>` ao chamar `/api/v1/jobs/precos-anp`, e a rota recusa qualquer outro token. O agendamento é diário (`0 12 * * *`, em UTC); no plano Hobby a Vercel só aceita crons diários. Para rodar na hora, use o botão Run em Settings → Cron Jobs ou o `curl` da seção anterior com a URL de produção.
4. **Supabase → Authentication → URL Configuration**:
   - **Site URL**: o domínio de produção, por exemplo `https://flexato.com.br`.
   - **Redirect URLs**: adicione `https://<seu-dominio>/carros`. Para testar login em deploys de preview, adicione também o padrão das URLs de preview da Vercel, por exemplo `https://*-<sua-conta>.vercel.app/carros`.
5. **Provedores de login** (Authentication → Providers):
   - **Google**: crie um OAuth Client do tipo "Web application" no Google Cloud Console, com `https://<ref-do-projeto>.supabase.co/auth/v1/callback` em Authorized redirect URIs, e cole o Client ID e o Client Secret no Supabase.
   - **Apple**: exige uma conta paga no Apple Developer Program. Crie um App ID e um Services ID com Sign in with Apple, cadastre o mesmo callback do Supabase como Return URL e gere a chave `.p8`. O secret derivado dessa chave expira e precisa ser renovado periodicamente; siga o guia de Apple no painel do Supabase. Sem a conta paga, o provedor fica desligado e o botão "Continuar com Apple" leva a uma página de erro do Supabase. Nesse caso, esconda o botão até configurar a Apple.
   - **Link por e-mail**: funciona sem configuração extra, mas o SMTP padrão do Supabase tem limite baixo de envios. Em produção, configure um SMTP próprio em Authentication → Emails.

### Headers de segurança

O `next.config.ts` envia CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` em todas as rotas. A CSP só permite conexões com o próprio site e com o projeto do Supabase. Se o front passar a chamar outro domínio, inclua esse domínio em `connect-src`.

## CI

O workflow `.github/workflows/ci.yml` roda em todo push e pull request, com Node 24: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check` e `npm run build`. O build não precisa de segredos: sem as variáveis do Supabase o app compila e o login aparece como não configurado. Os testes das rotas usam mocks do Supabase e não acessam a rede.

Para bloquear merges com o CI quebrado, ative em Settings → Branches uma regra de proteção na `main` exigindo o check "Lint, tipos, testes e build".

## Status

Fatia 1 implementada: calculadora, preços da ANP por cidade/UF, garagem com login e API para o app.

Fatia 2 implementada: importador da tabela PBEV do Inmetro (`npm run importar:pbev`), busca no catálogo sem acento e por relevância, e busca de carro com autocomplete na calculadora. A edição 2026 da PBEV traz 310 versões flex, das quais 299 entram no catálogo (as demais não têm consumo nos dois combustíveis ou são repetidas).

Fatia 3 implementada: CI no GitHub Actions, testes das rotas com banco simulado, limite de requisições por IP, headers de segurança, ajustes de layout no celular e guia de deploy na Vercel.

Fatia 4 implementada: localização automática. O navegador pede permissão, a posição (arredondada para 4 casas) vai só para `/api/v1/localizacao`, que encontra o município no PostGIS e não grava nada.

Fatia 6 implementada: edição de carro, abastecimentos com consumo real, faixa de preço da semana e histórico de preços. A migration `20261114000000_abastecimentos.sql` precisa ser aplicada no Supabase.

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).
