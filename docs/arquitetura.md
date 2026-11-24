# Arquitetura do fork (base)

Base da arquitetura do fork `FabioLeitao/freellmapi` (tarefa F0.2, issue #9). Vale para todo desenho
(`docs/desenho/<ID>.md`) e todo código deste projeto. Conferida no código do `origin/main` em
2026-11-23.

O projeto não nasceu aqui: é o FreeLLMAPI do upstream (`tashfeenahmed/freellmapi`), e o destino dos
nossos patches é o upstream (`docs/operacao.md`). Por isso este documento é uma **camada fina**:
ele registra as regras que valem para o nosso trabalho e aponta para a documentação do upstream,
que é a fonte do detalhe e muda a cada sincronização. Não duplique aqui o que está lá.

| Assunto | Fonte (upstream) |
|---|---|
| Visão e componentes | [docs/en/architecture/00-high-level-index.md](en/architecture/00-high-level-index.md) e os aprofundamentos em [docs/en/architecture/](en/architecture/OVERVIEW.md) (roteamento, cota e cooldown, streaming, degradação, catálogo, observabilidade) |
| Testes | [docs/en/testing/](en/testing/OVERVIEW.md) |
| Regras de PR | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Migrações | [server/src/db/README.md](../server/src/db/README.md) |
| Traduções | [docs/TRANSLATION.md](TRANSLATION.md) |

Regra geral (ADR-001): **o fork segue as convenções do upstream.** Ferramenta ou regra só do fork
fica em arquivo que o upstream não tem e nunca entra num branch de patch. O `docs/architecture.md`
é um redirecionamento do upstream: não mexa nele.

## Visão

Gateway compatível com a API da OpenAI, de um usuário só, que empilha os planos gratuitos de dezenas
de provedores atrás de um token `freellmapi-…`.

| Pacote | O que é | Stack |
|---|---|---|
| `shared/` | Tipos compartilhados entre servidor e painel (`types.ts`: `Platform`, modelos, chaves) e `agent-setup.ts`. Sem build próprio. | TypeScript |
| `server/` | API Express 5 na porta 3001: `/v1`, `/v1beta` e `/mcp` (inferência, token `freellmapi-…`) e `/api/*` (painel, `requireAuth`). Também serve o build do painel. | Node 20.18 a 24, TypeScript, Express 5, SQLite (`better-sqlite3`, com `node:sqlite` como alternativa em `db/node-sqlite.ts`), zod, vitest |
| `client/` | Painel administrativo (SPA). | React 19, Vite 8, Tailwind 4, shadcn/ui, vitest |
| `cli/` | CLI que aponta agentes de código para um gateway (lê os modelos servidos e grava a config de cada ferramenta). | TypeScript, vitest |
| `desktop/` | App Electron que hospeda o servidor (`src/server-host.ts`) e o painel. **Fora dos workspaces** do `package.json` da raiz: roda com `npm --prefix desktop`. | Electron 38, vitest |

Como se falam: o painel chama `/api/*` do mesmo servidor (`client/src/lib/api.ts`); clientes externos
chamam `/v1/*`; o servidor escolhe o modelo (`services/router.ts`), decripta a chave em memória e
chama o provedor pelo adaptador (`server/src/providers/`). O catálogo de modelos embutidos vem de um
**catálogo assinado** (Ed25519) publicado pelo upstream e aplicado por `services/catalog-sync.ts`.

## Camadas e dependências (server)

Descreve o que o código faz hoje, não um ideal.

| Camada | Onde | Pode chamar |
|---|---|---|
| Montagem | `server/src/app.ts`, `index.ts`, `middleware/` | rotas, middleware |
| Rotas | `server/src/routes/*.ts` (31 arquivos) | serviços, `lib/`, `db/` |
| Serviços | `server/src/services/` | `lib/`, `db/`, `providers/` |
| Adaptadores | `server/src/providers/` (`BaseProvider` em `base.ts`, registro em `index.ts`) | `lib/` |
| Utilitários | `server/src/lib/` | `db/` quando necessário |
| Banco | `server/src/db/` (`getDb()`, migrações em `migrations/`, executor em `migrate/`) | nada acima |
| Tipos | `shared/types.ts` | nada |

- **As rotas acessam o banco direto hoje** (18 de 31 chamam `getDb()`). Código novo põe a regra de
  negócio e o SQL num serviço e deixa a rota só validar a entrada (zod) e montar a resposta. Não
  refatore rota existente fora do escopo da tarefa (`CONTRIBUTING.md`: uma mudança por PR).
- Nenhuma ferramenta garante as camadas (não há `dependency-cruiser` nem equivalente). É uma lacuna
  aceita: impor uma agora divergiria do upstream (ADR-001). O revisor confere no diff.
- `shared/` não importa nada de `server/` nem de `client/`.

### Como um `Platform` vira adaptador

Tirado dos commits que adicionaram provedores (`2a7205ae` Zro, `0ea8ab92` Meldport, `d05c6c33` Puter).
Um provedor novo toca, no mínimo:

1. `shared/types.ts`: o id no tipo `Platform` (com um comentário de uma linha sobre o plano gratuito).
2. `server/src/providers/<id>.ts`, só se o provedor não é compatível com a OpenAI; se é, basta um
   `register(new OpenAICompatProvider({ platform, name, baseUrl }))` em `server/src/providers/index.ts`.
   Adaptador próprio estende `BaseProvider` (`chatCompletion`, `streamChatCompletion`, `validateKey`)
   e também é registrado em `index.ts`.
3. `server/src/routes/keys.ts`: o id na lista `PLATFORMS` (o `z.enum` que aceita a chave).
4. `server/src/lib/key-parser.ts`: o nome da variável de ambiente, para a importação de `.env`.
5. `client/src/components/keys/shared.tsx` (rótulo e link para obter a chave) e
   `client/src/lib/routing.ts`.
6. `server/src/services/provider-quota.ts`, quando o provedor tem cota própria.
7. Teste em `server/src/__tests__/providers/<id>.test.ts`, com `fetch` simulado, e
   `server/src/__tests__/routes/keys-providers-checklist.test.ts` quando o checklist muda.
8. Documentação: `docs/en/providers/01-supported-platforms.md` (e a de `zh-cn`) e, se houver,
   `docs/en/providers/<id>.md`. Texto novo no painel segue a seção i18n abaixo.

Os **modelos** do provedor não entram por migração (ADR-003): entram pelo catálogo assinado do
upstream. Um provedor que só o fork quer não tem como pôr modelos no catálogo; o desenho de cada
tarefa (M2.2, M3.5) decide entre levar o adaptador ao upstream (e o mantenedor publica os modelos) ou
usar um endpoint personalizado do painel, sem código.

Limite, id de modelo e endpoint **só com fonte oficial conferida** no provedor (`CONTRIBUTING.md`).

## Migrações (ADR-002)

- Arquivo novo em `server/src/db/migrations/`, criado com
  `npm run db:migration:create --name=<nome>` (o modelo é `migrate/TEMPLATE.ts`). Nome
  `AAAAMMDD_HHMMSS_<nome>.ts`, com `<nome>` só em `[a-z0-9_]` (o teste de backups exige; um ponto no
  nome quebra).
- Registro em `server/src/db/migrate/defaults.ts`, no array `DEFAULT_MIGRATIONS`, **na ordem dos
  nomes**: é a ordem de aplicação, e `__tests__/db/migrate/registry-drift.test.ts` falha se um
  arquivo não estiver registrado ou se o array sair da ordem. O executor percorre o array, não a
  pasta.
- A constante do nome entra também na lista de `__tests__/db/migrate/roundtrip.test.ts`, que
  confere o round trip (up, down até a base, up) e compara esquema e linhas.
- `up(db)` e `down(db)` obrigatórios. `down` reverte de verdade; se não der, lança
  `irreversible migration: <motivo>` e o desenho justifica. Os parâmetros SQL têm de valer nos dois
  drivers (`better-sqlite3` e `node:sqlite`).
- **Migração aplicada nunca é editada.** Correção é uma migração nova.
- Migração serve para esquema, regras de família, encanamento de provedor e correção de sementes de
  quirks. **Dado de modelo** (modelos, limites, ranks) **não** (ADR-003).
- Comando de prova: `npm run test:migrations` (só o round trip) e `npm test -w server`.
- Defeito conhecido: o `main` do fork viola estas regras na migração NVIDIA de `c1c07bb` (nome com
  ponto, registro fora da ordem, parâmetro rejeitado pelo `node:sqlite`, round trip que muda ids).
  A correção é a F0.1; não copie aquele arquivo como exemplo.

## i18n (painel)

- 60 locales em `client/src/i18n/locales/*.json`; `en.json` é a fonte. Chave nova nasce em `en.json`
  e entra em **todos** os locales no mesmo commit.
- Validador: `npm run check:i18n` em `client/` (`client/scripts/check-i18n.mjs`): arquivos
  esperados, paridade de chaves, tipo do valor e os mesmos `{placeholders}`. Ele não julga a
  tradução: `en` e `pt-BR` são revisados por quem escreve; os outros seguem `docs/TRANSLATION.md`.
- `npm test -w client` já roda o validador depois do vitest.
- Acesso no código pelo `useI18n()` de `client/src/i18n`.

## Hash CSP

- O `client/index.html` tem um único `<script>` inline (tema e direção antes da primeira pintura). O
  CSP do servidor o libera pelo hash literal `INLINE_BOOTSTRAP_SHA` em `server/src/app.ts`.
- `server/src/__tests__/routes/csp-inline-bootstrap.test.ts` recalcula o SHA-256 do script (no fonte
  e no build) e falha se ele divergir. **Quem muda aquele script atualiza o hash no mesmo commit.**
  Script inline novo não entra: vai para um arquivo servido por `'self'`.

## Frontend

- Telas em `client/src/pages/`, componentes em `client/src/components/` (primitivos do shadcn em
  `components/ui/`), utilitários e cliente da API em `client/src/lib/`.
- Base visual: as variáveis de `client/src/index.css` (`:root` e `.dark`: cores em oklch, `--radius`
  de 0.5rem, fontes Geist e Geist Mono). Tela nova usa essas variáveis e os primitivos de
  `components/ui/`; nada de cor ou fonte solta.
- O `frontend-dev-senior` (ou o dev externo numa tarefa `ux`) toca `client/` e os locales. O que é de
  `server/`, `shared/` e das migrações é do backend. Numa tarefa mista, o contrato de `/api/*` vem do
  desenho.
- O lint do `client/` não roda no CI (backlog de violações do upstream); não o ligue numa tarefa.

## Convenções

- **Erros da API:** forma da OpenAI, `{ "error": { "message", "type", "code"? } }`
  (`middleware/errorHandler.ts`). Em produção, 5xx devolve `Internal server error`. Um erro com
  causa conhecida tem `code` próprio (ex.: `no_vision_model`, `request_too_large`). Cabeçalho é
  cabeçalho HTTP; não ponha no corpo um campo com nome de cabeçalho.
- **Entrada:** validada com zod na rota.
- **Data e hora:** UTC. As janelas diárias de cota zeram à meia-noite UTC
  (`services/ratelimit.ts`); horários gravados em UTC (`datetime('now')` do SQLite ou `toISOString()`).
- **Identificadores:** inteiros autoincrementais do SQLite; o id de provedor é o `Platform`.
- **Configuração e segredos:** `.env` (lido em `server/src/env.ts`, nunca commitado) e
  `lib/config.ts`. As chaves dos provedores ficam cifradas no banco (AES-256-GCM, `lib/crypto.ts`,
  `ENCRYPTION_KEY`). Log passa pela redação de `lib/log-redaction.ts`. Fork público: nenhuma chave,
  custo ou dado de outro projeto em código, teste, log, issue ou commit (R16).
- **Nomes:** arquivos em `kebab-case.ts`; componentes React em `PascalCase.tsx` nas páginas e em
  `kebab-case.tsx` nos componentes, como já está. Imports com extensão `.js` no server (ESM).
- **Estilo:** `.editorconfig` e tsconfig do repositório; nada reformatado fora da mudança.

## Padrões de teste

**Ferramenta:** vitest em `server`, `client`, `cli` e `desktop`; `node --test` em
`scripts/dev-bootstrap.test.mjs` e `.claude/hooks/`. O server roda com `--pool=forks
--fileParallelism=false`.

**Tipos de teste e donos**

| Tipo | O que é | Onde | Dono |
|---|---|---|---|
| Unitário | Uma função ou um módulo, sem HTTP | `server/src/__tests__/{lib,services,providers,db}/`, `client/src/**/*.test.ts(x)`, `cli/src/*.test.ts` | dev, no TDD |
| Integração | A app Express de verdade (`createApp()`) com banco `:memory:`, por HTTP numa porta efêmera | `server/src/__tests__/routes/`, `server/src/__tests__/integration/` | dev, no TDD |
| Aceitação | Caixa-preta: só o contrato do desenho (status, corpo, cabeçalhos, o que a tela mostra), sem importar a implementação além de `createApp`/`initDb` | ver "Aceitação" abaixo | QA |

**Fixtures e dados:** banco por `initDb(':memory:')` com `ENCRYPTION_KEY` de teste
(`'0'.repeat(64)`), chave inserida cifrada por `encrypt()`; helpers em
`server/src/__tests__/helpers/` (ex.: `mintDashboardToken()`); fixtures em
`server/src/__tests__/fixtures/`. Não há `factory_boy` equivalente: dado de teste é montado pelos
helpers ou inline no teste.

**O que pode ser simulado:** o `fetch` dos provedores (`vi.stubGlobal('fetch', …)` ou
`vi.spyOn(globalThis, 'fetch')`), o relógio e o `Math.random`. **Não se simula:** o banco (sempre
SQLite real em memória), as migrações e a app Express. Um mock tem a forma real da resposta do
provedor (`CONTRIBUTING.md`: teste contra mock de forma errada é pior que nenhum).

**Determinismo**

- Relógio: `vi.useFakeTimers()` e `vi.setSystemTime(...)`; nada depende da hora real.
- Aleatoriedade: o bandit de `services/scoring.ts` usa `Math.random`; teste que depende da escolha
  fixa o valor com `vi.spyOn(Math, 'random')`.
- Rede: nenhuma chamada real. Todo teste que alcança um provedor simula o `fetch`. Servidor de teste
  escuta em `127.0.0.1` na porta `0`, **nunca na 3001** (é a do servidor local em uso). Não há
  guarda automática contra rede real (lacuna, pedido de tarefa).
- Banco: só `:memory:` ou arquivo temporário apagado no fim. **Nenhum teste toca o banco real**
  (`freeapi.db` ou `server/data/`).
- Ordem: cada arquivo prepara o próprio estado no `beforeEach`; nenhum teste depende de outro. Não há
  embaralhamento automático da ordem (o vitest tem `sequence.shuffle`, mas ligar no upstream é
  decisão de lá).
- Variáveis de ambiente mudadas num teste voltam ao valor original no `finally`/`afterEach`.

**Aceitação (ADR-004)**

- O teste de aceitação descreve o comportamento `A<ID>-<n>` do desenho e entra **antes** da
  implementação, marcado como pendente.
- **A marca de pendente não é `it.fails`.** Testado no vitest 5.1.1 (Node 24.22.1): `it.fails`
  quebra quando o teste passa, mas conta como "falha esperada" um erro no `beforeEach` e um
  `TypeError` no corpo. A marca é um helper que só aceita `AssertionError`:

  ```ts
  export function pendente(name: string, fn: () => unknown | Promise<unknown>) {
    it(`[pendente] ${name}`, async () => {
      let err: unknown;
      try { await fn(); } catch (e) { err = e; }
      if (err === undefined) throw new Error(`pendente passou: tire a marca de "${name}"`);
      if ((err as Error)?.name !== 'AssertionError') throw err;
    });
  }
  ```

  Com ele (testado): falha de asserção fica verde; teste que passa, erro de preparação e erro de
  tipo ficam vermelhos. O dev tira a marca (troca `pendente(` por `it(`) no commit que implementa.
- **Onde os testes de aceitação moram e como chegam ao branch de patch** (que nasce de
  `upstream/main` e não leva arquivo só do fork) é decisão da F0.7. Até lá, cada desenho diz onde
  ficam os seus. No PR ao upstream, nenhum teste vai com a marca: ou está implementado, ou fica fora.

**Comandos**

```bash
npm ci
npm run test:migrations          # round trip das migrações
npm test                         # bootstrap, hooks, server, cli, client (+ check:i18n)
npm run lint                     # server e cli
npm run build
npm --prefix desktop ci && npm --prefix desktop test   # fora da cadeia da raiz; só quando a tarefa toca desktop/
(cd server && npx vitest run src/__tests__/<caminho>.test.ts)   # um arquivo, no TDD
```

O `npm test` da raiz encadeia com `&&`: uma falha no server esconde o resultado de cli e client.
O CI (`.github/workflows/ci.yml`) roda exatamente esses passos em Node 20, 22 e 24.

## Ferramentas que garantem as regras

| Regra | O que garante | Situação |
|---|---|---|
| Migração registrada e na ordem | `registry-drift.test.ts` | existe |
| Round trip reversível | `roundtrip.test.ts` e o passo "Check migration round trip" do CI | existe (vermelho no `main` até a F0.1) |
| Nome da migração | teste de backups (`routes/backups.test.ts`) | existe |
| Hash CSP | `csp-inline-bootstrap.test.ts` | existe |
| Paridade de locales | `check:i18n` | existe |
| Tipos | `tsc` no `npm run build` (server, cli e client com `tsc -b`) | existe |
| Estilo e erros comuns | ESLint em server e cli | existe; client fora |
| Mesmos passos do CI na máquina | um `scripts/check-all.sh` só do fork | não existe; decisão do usuário (`docs/operacao.md`) |
| Sem rede real nos testes | guarda no setup do vitest | não existe; pedido de tarefa |
| Camadas | — | lacuna aceita (ADR-001) |
| Testes de mutação, propriedade, contrato da API | — | não adotados; um desenho pode pedir num módulo específico |

Ferramenta nova que mexe em arquivo do upstream (config do vitest, `package.json`, `ci.yml`) é
divergência do fork: vira pedido de tarefa com o motivo, e só vai ao upstream como patch próprio.

## Docker, ganchos e CI

- **Os testes rodam no Node do host**, nas versões do `engines` (20.18 a 24), não em contêiner
  (ADR-005). O `Dockerfile` e o `docker-compose.yml` são os de produção do upstream e publicam a
  porta 3001, a mesma do servidor local em uso: **nenhuma tarefa sobe esse compose, reinicia ou
  reconstrói o servidor local** (`docs/operacao.md`). Por isso não existe `scripts/compose.sh`.
- Não há gancho de commit no repositório (o `.claude/hooks/contributing-check.mjs` é opcional, só
  injeta o checklist do `CONTRIBUTING.md` e não bloqueia). Um commit só de `docs/` ou
  `.claude/agent-memory/` não depende de nada.
- **CI:** `ci.yml` e `docker.yml` rodam em todo push para o `main` e em todo PR, sem `paths-ignore`.
  O `docker.yml` também constrói e publica as imagens no push para o `main`. Até a tarefa pedida
  existir, commit só de documentação ou memória no `main` leva `[skip ci]` na mensagem.

## TDD no projeto

1. Commit `test:` com os testes `D<ID>-<n>` do desenho e os esqueletos do contrato
   (`throw new Error('not implemented')`), para os testes falharem pelo motivo certo.
2. Commits `feat:` e `fix:` até ficar verde; por fim `refactor:`.
3. Os testes de aceitação do QA entram antes, com a marca `pendente`; o dev a tira ao implementar.
4. Infraestrutura, scripts e workflows são testados como o desenho mandar (ex.: simulação dos
   cenários de falha).
5. O dev externo recebe só passos mecânicos de um teste que já falha (`docs/operacao.md`).

## Merge e fluxo de patch

Definidos em `docs/operacao.md` e, quando a F0.7 sair, no ADR dela. Em resumo: PR no fork só por
`merge-green`, sempre merge commit (nunca squash), para manter a ordem `test:` → `feat:` →
`refactor:` visível; o PR de revisão de um patch não é mesclado no fork; no upstream quem mescla é o
mantenedor. Branch de patch nasce de `upstream/main` e não leva arquivo só do fork (inclusive este
documento, `docs/decisoes.md` e `docs/desenho/`).
