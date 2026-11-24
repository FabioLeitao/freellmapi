# Decisões técnicas (ADR)

Registro das decisões técnicas do fork `FabioLeitao/freellmapi`. Dono: `arquiteto-senior`. Os outros
agentes propõem; o arquiteto registra ou recusa, com o motivo. As decisões de operação (modo, dev
externo, trava sobre o upstream, ritual de merge) ficam em `docs/operacao.md` e são do usuário e do
project-manager. Arquivo só do fork: não vai em branch de patch.

Status: `aceita`, `proposta`, `substituída por ADR-NNN`.

---

## ADR-001: O fork segue as convenções do upstream

- **Data:** 2026-11-23
- **Status:** aceita
- **Contexto:** o projeto é o FreeLLMAPI do upstream, com patches que voltam para lá (P4, respondida
  em 2026-11-23). O upstream já tem convenções testadas (migrações, i18n, CSP, testes) e exige uma
  mudança por PR, sem reformatação fora da mudança. Ferramenta ou regra nova num arquivo que o
  upstream também tem (config do vitest, `package.json`, `ci.yml`, ESLint) diverge do fork e
  conflita na sincronização.
- **Decisão:** a base da arquitetura (`docs/arquitetura.md`) documenta as convenções do upstream e
  aponta para a documentação de lá, sem duplicá-la. Ferramenta só do fork fica em arquivo que o
  upstream não tem e nunca entra em branch de patch. Mudança em arquivo do upstream entra por pedido
  de tarefa e, se servir ao upstream, como patch próprio. Não se impõe regra de camadas por
  ferramenta: as rotas acessam o banco direto hoje, e código novo põe o SQL num serviço.
- **Consequências:** algumas regras da base do framework ficam como lacunas aceitas (camadas por
  ferramenta, embaralhamento da ordem dos testes, mutação). A documentação do upstream pode mudar a
  cada sincronização; a base só a cita.
- **Decidido por:** arquiteto-senior (F0.2).

## ADR-002: Migrações em arquivo novo, registradas na ordem, com round trip

- **Data:** 2026-11-23
- **Status:** aceita
- **Contexto:** regra do upstream (`CONTRIBUTING.md`, `server/src/db/README.md`) garantida por
  `registry-drift.test.ts`, `roundtrip.test.ts` e o passo "Check migration round trip" do CI. A
  migração `20261122_000001_nvidia_3.5_embedding_catalogue.ts` (`c1c07bb`) quebrou as quatro regras
  ao mesmo tempo e deixou o `main` vermelho (F0.1).
- **Decisão:** toda mudança de esquema é um arquivo novo em `server/src/db/migrations/`, criado com
  `db:migration:create`, com nome `AAAAMMDD_HHMMSS_[a-z0-9_]+.ts`; registrado em
  `server/src/db/migrate/defaults.ts` na ordem dos nomes; com a constante do nome na lista do
  `roundtrip.test.ts`; com `up` e `down`, e `down` reversível (ou `irreversible migration: <motivo>`,
  justificado no desenho); com SQL que vale nos dois drivers (`better-sqlite3` e `node:sqlite`).
  Migração aplicada nunca é editada.
- **Consequências:** todo desenho com mudança de modelo de dados traz a migração esperada e um teste
  `D` do round trip. A prova é `npm run test:migrations` e `npm test -w server`.
- **Decidido por:** upstream (regra) e arquiteto-senior (registro no fork, F0.2).

## ADR-003: Dado de modelo mora no catálogo assinado, não em migração

- **Data:** 2026-11-23
- **Status:** aceita (decisão do upstream; no fork, pendente de sincronização)
- **Contexto:** o mantenedor do upstream decidiu em 2026-11-23, no commit `a088fc8e` (#1946), que os
  dados de modelo embutidos (modelos, limites, ranks) moram no catálogo assinado publicado por ele,
  e não em migração: o catálogo é aplicado por `services/catalog-sync.ts`, que adiciona, atualiza e
  poda as linhas `source = 'catalog'` (conferido no fork). Dado de modelo numa migração chegaria aos
  usuários gratuitos na próxima atualização do binário e contornaria a janela de 30 dias do plano
  pago. A V25 foi a última migração de dados de modelo. **O commit não está no `main` do fork**, e o
  `server/src/db/README.md` do fork ainda diz o contrário ("Built-in model catalog rows live in
  migrations"); a sincronização (F0.6) traz o texto novo.
- **Decisão:** o fork adota a decisão do upstream desde já. Migração serve para esquema, regras de
  família, encanamento de provedor e correção de sementes de quirks. Modelo novo, aposentado ou
  corrigido é mudança no catálogo publicado, que só o upstream assina. Um provedor que só o fork quer
  não tem modelos embutidos; o desenho da tarefa escolhe entre levar o adaptador ao upstream ou usar
  um endpoint personalizado do painel.
- **Consequências:** afeta, sem decidir por elas, a F0.1 (a migração NVIDIA é dado de modelo), a
  M4.2 (embeddings NVIDIA podem deixar de ir ao upstream como migração), a M2.2 (Grok e xAI) e a
  M3.5 (Kilo). Cada desenho dessas tarefas cita este ADR e diz como trata os modelos.
- **Decidido por:** mantenedor do upstream (`a088fc8e`, #1946); registro no fork: arquiteto-senior
  (F0.2).

## ADR-004: Marca de pendente estrita para os testes de aceitação

- **Data:** 2026-11-23
- **Status:** aceita
- **Contexto:** a aceitação do QA entra antes da implementação, marcada como pendente, e a marca
  precisa quebrar quando o teste passa sem que um erro de preparação se passe por "falha esperada".
  Testado no vitest 5.1.1 com Node 24.22.1, num contêiner `node:24.22.1-bookworm-slim` (a imagem
  base do `Dockerfile`): `it.fails` quebra quando o teste passa e quando o import falha, mas conta
  como falha esperada um erro no `beforeEach` e um `TypeError` no corpo.
- **Decisão:** a marca de pendente é o helper `pendente(name, fn)` descrito em
  `docs/arquitetura.md`, que roda o corpo num `it` comum e só aceita `AssertionError`. Testado no
  mesmo contêiner: falha de asserção (síncrona e assíncrona) fica verde; teste que passa, erro de
  `beforeEach` e `TypeError` ficam vermelhos. `it.fails`, `it.skip` e `it.todo` não servem de marca.
  Onde os testes de aceitação moram e como chegam ao branch de patch fica para a F0.7; nenhum teste
  vai ao upstream com a marca.
- **Consequências:** o helper ainda não existe no código; o primeiro desenho com aceitação diz onde
  ele fica (ou a F0.7 decide antes).
- **Decidido por:** arquiteto-senior (F0.2).

## ADR-005: Testes no Node do host, sem Docker e sem o servidor local

- **Data:** 2026-11-23
- **Status:** aceita
- **Contexto:** a base do framework põe os testes em contêiner, com `scripts/compose.sh`. Aqui os
  testes do upstream e o CI rodam direto no Node (matriz 20, 22 e 24), com SQLite em memória, e o
  `docker-compose.yml` é o de produção: publica a porta 3001, a mesma do servidor local que está em
  uso (inclusive como provedor do dev externo).
- **Decisão:** testes e gate local rodam no Node do host, numa versão do `engines`. Nenhum teste nem
  tarefa sobe o compose, reinicia ou reconstrói o servidor local, escuta na porta 3001 ou abre o
  banco real. Servidor de teste escuta em `127.0.0.1`, porta `0`; banco só `:memory:` ou arquivo
  temporário. Não se cria `scripts/compose.sh`. Contêiner só para testar uma premissa isolada (como
  no ADR-004) ou quando um desenho pedir, sem publicar porta.
- **Consequências:** a diferença de versão do Node entre o host e o CI fica coberta pela matriz do
  CI. O gate local equivalente ao CI (um `scripts/check-all.sh` só do fork) depende de decisão do
  usuário (`docs/operacao.md`).
- **Decidido por:** arquiteto-senior (F0.2).
