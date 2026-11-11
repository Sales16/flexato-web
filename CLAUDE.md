# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Projeto

Flexato (web): calculadora etanol x gasolina que usa o consumo real do carro (km/l em cidade e estrada, para etanol e gasolina) em vez da regra fixa dos 70%. Este repositório tem front, API e banco. O app mobile fica em outro repositório e consome a mesma API `/api/v1`. O `README.md` descreve produto, rotas, setup e deploy; esta página cobre o que não é óbvio ao mexer no código.

Idioma: UI, mensagens de erro da API, identificadores de código, commits, PRs e documentação são em pt-BR.

## Comandos

```bash
npm run dev                  # servidor de desenvolvimento (porta 3000)
npm run build                # build de produção
npm run lint                 # ESLint
npm run typecheck            # next typegen + tsc --noEmit (os tipos de rota, ex. RouteContext, vêm do typegen)
npm test                     # Vitest, todos os testes
npx vitest run src/lib/calculo.test.ts          # um arquivo
npx vitest run src/lib/calculo.test.ts -t "regra dos 70%"   # um teste pelo nome
npm run format               # Prettier (tabs, aspas simples, printWidth 160, plugin do Tailwind)
npm run importar:pbev -- --simular   # catálogo PBEV do Inmetro; sem --simular grava no Supabase
npm run importar:malha -- --simular  # malha municipal do IBGE; sem --simular grava no Supabase
```

O CI (`.github/workflows/ci.yml`) roda lint, typecheck, testes, `format:check` e build em todo push e PR. Rode os mesmos antes de commitar.

Preços da ANP: `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/v1/jobs/precos-anp` (idempotente por semana; `?forcar=1` reimporta). Na Vercel, o `vercel.json` agenda o job diariamente.

## Arquitetura

- **Next.js 16 com Cache Components e Partial Prefetching** (`next.config.ts`). As páginas (`/`, `/carros`, `/entrar`) são shells estáticos com client components. Todo dado chega via `fetch` para `/api/v1` (`src/lib/api/cliente.ts`). A web usa exatamente o mesmo contrato que o app mobile.
- **API** em `src/app/api/v1/**/route.ts`. As rotas são finas: validam com zod (`src/lib/esquemas.ts`), chamam `src/lib/dados/*` e respondem com os helpers de `src/lib/api/respostas.ts`. Os erros seguem sempre `{ erro: { codigo, mensagem, detalhes? } }`. Os tipos de resposta ficam em `src/lib/tipos-api.ts`.
- **Padrão de cada handler**: primeiro `limitar(request, LEITURA | ESCRITA)` (`src/lib/api/limite.ts`), depois um `try` envolvendo autenticação e dados, com `erroInterno(e)` no `catch`. Leia `request.headers`/`searchParams` antes de qualquer `try`. Com Cache Components, o acesso ao request interrompe o prerender lançando uma exceção; se ela for capturada pelo `try`, o build registra um erro interno falso.
- **Autenticação**: Supabase Auth no cliente (`src/lib/supabase/navegador.ts`, PKCE, sessão no browser). A API aceita só `Authorization: Bearer <access_token>` (`src/lib/api/autenticacao.ts`) e cria um cliente Supabase com o token do usuário, de modo que o RLS do Postgres faz a autorização. Não há sessão por cookie no servidor.
- **Três clientes Supabase no servidor** (`src/lib/supabase/servidor.ts`): `clientePublico` (publishable key, leitura de dados públicos), `clienteDoUsuario(token)` (garagem e abastecimentos) e `clienteAdmin` (secret key, usado só pelo job da ANP, pelos importadores e pela RPC de localização).
- **Regra de negócio em módulos puros e testados**, sem `server-only`, para poder ser reaproveitada pelo app:
  - `calculo.ts`: custo por km ponderado pelo percentual de cidade/estrada, razão limite do carro e economia.
  - `consumo-real.ts`: método tanque cheio a tanque cheio, considerando o combustível que estava no tanque na abertura do intervalo.
  - `anp/parser.ts`, `pbev/parser.ts` e `localizacao/malha.ts`: parsers dos importadores.
  O que acessa banco ou rede fica em módulos com `import 'server-only'`.
- **Importadores**:
  - ANP: planilha XLSX semanal, abas `ESTADOS` e `MUNICIPIOS`. Nomes de município casados com o IBGE.
  - PBEV: PDF do Inmetro lido com `pdfjs-dist` pela posição x/y dos textos. Só entram versões flex.
  - Malha IBGE: GeoJSON gravado no PostGIS via RPC.

  `src/lib/http-externo.ts` concentra `buscar`, User-Agent, URL do IBGE e `emLotes`. `scripts/importar-malha.mts` roda no Node puro, então só importa de `src/lib` por caminho relativo com extensão `.ts` (o alias `@/` não resolve ali). `scripts/importar-pbev.ts` roda via `tsx --conditions=react-server` por causa do `server-only`.
- **Preço por localidade**: `precos_municipio` com fallback para `precos_uf`, por combustível. `municipio_chave` é o nome da ANP normalizado (sem acento, maiúsculo, via `normalizarNome` em `src/lib/ufs.ts`), e `municipio_ibge` liga com `municipios_ibge` (localização automática).

## Banco (Supabase)

- **A integração do Supabase com o GitHub está ligada.** As migrations de `supabase/migrations/` são aplicadas automaticamente no projeto de produção quando chegam na `main`. Existe um único projeto Supabase, que é a produção.
  - Toda mudança de schema é uma migration nova com timestamp maior. Nunca edite uma migration já mergeada na `main`.
  - Não aplique migrations à mão pelo SQL Editor: a integração tentaria aplicar de novo e falharia. Se isso acontecer, use `npx supabase migration repair --status applied <versão>`.
  - Não rode importadores sem `--simular`, nem o job da ANP, contra o banco sem necessidade: eles gravam na produção.
- **"Expor tabelas automaticamente" está desligado** no projeto. Toda tabela nova precisa de `grant` explícito para `anon`/`authenticated`/`service_role`, além de RLS ligado com policies.
- `supabase/seed.sql` tem 8 carros com `fonte = 'exemplo'`, que somem quando a PBEV é importada.
- Variáveis de ambiente (`.env.example`, valores em `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `CRON_SECRET`. Ao adicionar uma variável, atualize o `.env.example`.

## Front-end

- O visual vem de um protótipo aprovado. Use as classes de componente em `src/app/globals.css` (`.panel`, `.btn`, `.chip`, `.entrada`...) e os tokens de cor (`--etanol`, `--gasolina`, `--surface`, `--ink`...), que já têm tema claro e escuro. Não use cores literais. Tailwind 4 está disponível, mas a maior parte do estilo está nessas classes.
- Abaixo de 880px existe uma barra fixa de veredito, e os alvos de toque têm no mínimo 44px.
- O lint inclui `react-hooks/set-state-in-effect`. Para carregar dados em effect, faça o `fetch` dentro do effect e aplique o resultado num `useEffectEvent` chamado do `.then`. Estado que depende do usuário é guardado com o `dono` (id do usuário) para não exibir dados de outra sessão.

## Testes

- Vitest em ambiente `node`, só `src/**/*.test.ts`. Não há testes de componente. Lógica de UI que precisa de teste vai para um módulo puro (ex.: `src/lib/navegacao-combo.ts`, `src/lib/grafico.ts`).
- Testes de rota importam o handler e chamam com `Request`/`NextRequest`. Mocke `server-only` (`vi.mock('server-only', () => ({}))`) e `@/lib/supabase/servidor` ou `@/lib/dados/*`. Para cadeias do query builder do Supabase, use `src/lib/testes/supabase-falso.ts`. Nunca acesse rede nos testes.
- O limitador de requisições é um singleton do módulo e conta por IP. Em testes que repetem muitas chamadas, use um `x-forwarded-for` próprio para não esbarrar no limite.

## Convenções

- Sem comentários no código.
- Commits em pt-BR no estilo Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- Branches: `feat/...`, `fix/...`, `chore/...`. Trabalho em fatias vira PRs empilhados (cada branch baseada na anterior), integrados por merge. Sem rebase de branch publicada e sem force push.
