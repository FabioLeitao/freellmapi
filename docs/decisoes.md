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
  justificado no desenho); com SQL que vale nos dois drivers (`better-sqlite3` e `node:sqlite`,
  este conferido por `node-sqlite.test.ts`).
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
- **Decisão:** **em patch ao upstream, vale sem exceção:** migração serve para esquema, regras de
  família, encanamento de provedor e correção de sementes de quirks; modelo novo, aposentado ou
  corrigido é mudança no catálogo publicado, que só o upstream assina. **No fork, é a regra padrão;**
  como o fork não assina catálogo, uma exceção só do fork (por exemplo, a F0.1 refazer a migração
  NVIDIA em vez de revertê-la) é decidida no desenho da tarefa, com o motivo, e nunca vai ao
  upstream. Um provedor que só o fork quer não tem modelos embutidos; o desenho escolhe entre levar
  o adaptador ao upstream ou usar um endpoint personalizado do painel.
- **Consequências:** afeta, sem decidir por elas, a F0.1 (a migração NVIDIA é dado de modelo), a
  M4.2 (embeddings NVIDIA provavelmente não vão ao upstream como migração; o texto de R22 e T4.2 no
  plano ainda diz "migração em arquivo novo"), a M2.2 (Grok e xAI) e a M3.5 (Kilo). Cada desenho
  dessas tarefas cita este ADR e diz como trata os modelos.
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

## ADR-006: Tirar a migração NVIDIA do fork, sem refazê-la

- **Data:** 2026-11-23
- **Status:** aceita
- **Contexto:** a migração `20261122_000001_nvidia_3.5_embedding_catalogue.ts` (`c1c07bb`) deixa o
  `main` vermelho (5 testes: ordem do registro, round trip duas vezes, `node:sqlite` e o nome no
  backup). Ela só insere duas linhas em `embedding_models`, que é dado de modelo, e o catálogo
  assinado já grava essa tabela (ADR-003). Nenhum banco durável a aplicou: a imagem do servidor local
  tem 52 migrações, sem ela.
- **Decisão:** remover o arquivo e as 3 linhas dele em `defaults.ts` (F0.1), sem renomear nem
  refazer. Refazer a poria no banco real no próximo build e manteria dado de modelo em migração. As
  outras partes do `c1c07bb` (reasoning models, corpo do 422) ficam para M4.1 e M1.1.
- **Consequências:** o `main` volta a 52 migrações, igual ao servidor local. Um banco de dev que a
  aplicou fica com um registro órfão (o `down` falha; remédio manual no desenho da F0.1). A M4.2
  deixa de ser uma migração: o desenho dela decide o caminho, provavelmente o catálogo publicado
  pelo upstream. O texto de R22 e T4.2 no plano precisa de revisão.
- **Decidido por:** arquiteto-senior (desenho da F0.1). Conferido num worktree: suíte do server
  verde (5.652 passaram, 6 pulados).

## ADR-007: Taxonomia das causas de bloqueio, sem mudar status

- **Data:** 2026-11-23
- **Status:** aceita
- **Contexto:** R23 (requisito do cliente) pede uma causa distinta em toda resposta 429 e em todo
  bloqueio do roteador, na resposta e no log. Hoje o caso real (imagem, visão habilitada mas em
  cooldown ou sem chave) sai como 429 `routing_exhausted` sem causa, e não há evento de log
  estruturado. Mudar status quebraria clientes e testes do upstream.
- **Decisão:** um módulo `server/src/lib/block-cause.ts` com as causas `no_vision_model`,
  `no_vision_key`, `vision_quota_exhausted` (com `detail` = causa-base), `cooldown`, `provider_limit`,
  `key_quota`, `chain_exhausted` e `gateway_rate_limit`, regras e precedência escritas no desenho da
  M1.1. A visão vem de um parâmetro explícito (`requireVision`), não do texto do diagnóstico. A causa
  vai no corpo (`error.cause`, `error.cause_detail`), nos cabeçalhos `X-Block-Cause` e
  `X-Block-Cause-Detail` e no evento de log `route_blocked` (nível `warn`, com `execution_id`; nome
  único em vez de `history_vision_blocked`, porque o bloqueio não depende de histórico). **Nenhum
  status nem `code` existente muda**; só aparecem campos.
- **Consequências:** M1.1 entrega a resposta e M1.2 o log, nessa ordem. Ficam de fora os 429 de
  embeddings, mídia e fusion, e o `execution_id` do `inbound-chat`. Se o cliente quiser 422 para o
  caso "visão habilitada sem chave", é uma mudança de status à parte.
- **Decidido por:** arquiteto-senior (desenhos M1.1 e M1.2).

## ADR-008: Onde ficam os testes de aceitação e o helper `pendente`

- **Data:** 2026-11-23
- **Status:** aceita (o fluxo de branch em si é da F0.7)
- **Contexto:** o ADR-004 deixou para o primeiro desenho com aceitação dizer onde ficam os testes do
  QA, já que o branch de patch nasce de `upstream/main` e vai ao upstream.
- **Decisão:** os testes de aceitação ficam no próprio branch de patch, junto dos de rota, como
  `server/src/__tests__/routes/<tema>.acceptance.test.ts` (o `include` do vitest já os pega). O
  helper fica em `server/src/__tests__/helpers/pendente.ts`. O commit do QA é o primeiro do branch;
  o dev troca `pendente(` por `it(` ao implementar e, no último commit, apaga o helper se nenhum
  arquivo o usar. Ao upstream vão testes comuns, sem marca nem helper.
- **Consequências:** como o commit do QA entra no branch (PR para o branch de patch ou commit do PM)
  é decisão da F0.7.
- **Decidido por:** arquiteto-senior (desenho da M1.1).

## ADR-009: O fork constrói a imagem nos PRs e não publica

- **Data:** 2026-11-24
- **Status:** aceita como padrão **reversível**, pendente de decisão do usuário
- **Contexto:** o `docker.yml` do upstream publica no ghcr em todo push no `main` e em tag. No fork,
  ele nunca passou (o nome da imagem com o dono em maiúsculas é inválido), e o usuário ainda não
  decidiu se o fork publica imagem. Publicar a cada push gastaria minutos de CI e espaço de pacote
  sem uso definido; o servidor local é construído pelo wrapper de build, não pelo ghcr.
- **Decisão:** o nome da imagem passa a sair em minúsculas (`${GITHUB_REPOSITORY_OWNER,,}`); os jobs
  `build` (em push) e `merge` só rodam quando `github.repository == 'tashfeenahmed/freellmapi'`; nos
  PRs o `build` roda sempre, sem publicar. Para publicar em `ghcr.io/fabioleitao/freellmapi`, basta
  acrescentar o fork às duas condições (frase exata no desenho da F0.9).
- **Consequências:** o fork tem a checagem de build em todo PR e não publica nada. Se o usuário
  decidir publicar, a mudança é de 2 linhas e este ADR passa a ser substituído.
- **Decidido por:** arquiteto-senior (desenho da F0.9), como padrão proposto pelo project-manager;
  a decisão final é do usuário.

## ADR-010: `baseBlockCause` sem visão e linhas de chave classificadas por token

- **Data:** 2026-11-25
- **Status:** aceita (complementa o ADR-007, que não muda)
- **Contexto:** a revisão do PR #31 (M1.1) achou duas falhas nas regras do desenho. (1) A regra
  "ignorar sempre as linhas `no vision support`" contradizia o DM1.1-13, e o dev contornou com um
  terceiro parâmetro `requireVision = true` em `baseBlockCause`, fora do contrato. (2) O regex de
  configuração aplicado à linha inteira descartava uma linha mista (`cooldown:1, decrypt-error:1`);
  rodando a implementação, um pedido com imagem e essa linha dava `no_vision_key`, embora houvesse
  chave de visão em cooldown.
- **Decisão:** `baseBlockCause(diag, attempts)` tem 2 parâmetros e trata `no vision support` como
  qualquer filtro de capacidade (`other`, como o `classifyRoutingDiagLine`); só o `blockCause`, com
  `requireVision`, tira essas linhas antes de chamar a base. As linhas `N key(s) — …` são
  classificadas por token; uma delas só é de configuração quando todos os tokens são ignorados
  (`already-failed-this-request`, `decrypt-error`, `custom-key-mismatch`, `no-resolved-provider`,
  `no usable key`). Uma só definição de "linha de configuração" serve às duas funções.
- **Consequências:** a visão continua vindo só do parâmetro (ADR-007). Numa linha mista a `cause`
  fica mais fina que o `code`, que segue o classificador do upstream na linha inteira; o `code` e o
  status não mudam. Testes novos DM1.1-26 a 29; DM1.1-1 a 25 mantêm o resultado esperado. A M1.2 só
  usa os tipos e não muda.
- **Decidido por:** arquiteto-senior (revisão 1 do desenho da M1.1), a partir das sugestões 1 e 2 da
  revisão do PR #31.

## ADR-011: versão marcada entra pelo build, não por código do painel

- **Data:** 2026-11-27
- **Status:** aceita
- **Contexto:** R17 pede que a versão marcada com os patches chegue ao painel. `getAppVersion()` já prefere
  `FREEAPI_VERSION` em runtime e `/api/settings/version` já a publica; o que faltava era o build gravar a
  tag. A premissa antiga de que o wrapper compilava o checkout atual estava errada (vinha de uma versão
  sobrescrita do script): o wrapper atual usa `git archive "$REFSHA"`. O formato canônico da tag é
  `up-<sha8>.databoar-<sha8>[.rótulo]`; o `<tag>-<n>-g<sha>` escrito em T0.5 é o formato antigo.
- **Decisão:** `Dockerfile` ganha `ARG FREEAPI_VERSION` / `ENV FREEAPI_VERSION=${FREEAPI_VERSION}` na
  camada final; o wrapper (arquivo do operador, fora do repo) passa `--build-arg "FREEAPI_VERSION=$TAG"`.
  Nenhuma mudança em `app-version.ts`, `/api/settings/version` ou no painel. Builds sem o `--build-arg`
  continuam mostrando `desktop/package.json`. Toda prova usa `--no-install` e porta efêmera, nunca `:3001`.
- **Consequências:** a tag do wrapper passa a ser a versão exibida; T0.5 e a issue #11 precisam de revisão
  do PM quanto ao formato da tag. Nenhum valor é inventado quando a variável está vazia.
- **Decidido por:** arquiteto-senior (desenho da F0.5); linha do wrapper é do operador.

## ADR-012: gate local único, no host por padrão

- **Data:** 2026-11-27
- **Status:** aceita
- **Contexto:** R25 pede um `scripts/check-all.sh` que espelhe o `ci.yml` sem tocar o `:3001` nem o banco
  real. O `docker-compose.yml` do upstream publica justamente a 3001, que é o servidor local em uso
  (ADR-005), e o teste do gate não pode depender de Dockerfile nem de rede.
- **Decisão:** o script é arquivo só do fork, roda no Node do host com `npm ci` → `test:migrations` →
  `npm test` → `lint` → `build` → `check:i18n`, com `set -euo pipefail` e falha imediata. O modo
  `--container` é opcional, usa podman com o repo montado e **nenhuma porta publicada**, e tem guarda
  contra recursão. Nenhum passo sobe compose, troca imagem nem abre `freeapi.db`. O teste do script mora
  em `scripts/check-all.test.mjs` e não entra em `npm test` da raiz, para não mexer em `package.json`.
- **Consequências:** o mesmo comando vale na máquina do operador e no SHA exato de qualquer PR; o PM cola
  a saída 0 no corpo do PR. Nenhum rigor é baixado para obter verde.
- **Decidido por:** arquiteto-senior (desenho da F0.10), a pedido do usuário.

## ADR-013: cabeçalhos de zero tentativas em erros 422/429

- **Data:** 2026-11-27
- **Status:** aceita
- **Contexto:** `setFallbackHeaders` só escreve `X-Fallback-Attempts` e `X-Fallback-Trail` quando há
  tentativa falha; o 422 de visão e os 429 em que o roteador barrou antes do envio têm zero tentativas e
  ficavam sem os dois cabeçalhos. Mudar a condição global faria os cabeçalhos aparecerem em sucessos.
- **Decisão:** helper separado `setZeroFallbackHeaders(res)`, chamado só em erros 422/429 com zero
  tentativas (guardas de visão, saídas do loop e limitador do gateway). Valores: `0` e `''` (cabeçalho
  presente, valor vazio). `setFallbackHeaders` e as respostas de sucesso não mudam.
- **Consequências:** o 422 passa a ter os cabeçalhos que T1.1 pede; a distinção entre 422 e 429 continua
  por status/causa, não pela presença dos cabeçalhos. O desenho é compatível com as duas versões do
  contrato de `X-Block-Cause` no 422 que circulam no projeto.
- **Decidido por:** arquiteto-senior (desenho da M1.3).

## ADR-014: causa explícita nos 429 de embeddings, mídia e fusion

- **Data:** 2026-11-27
- **Status:** aceita
- **Contexto:** R23 cobre todo 429, mas os serviços de embeddings, mídia e fusion não passam pelo
  `runFallbackLoop` e, por isso, não tinham `cause` nem evento `route_blocked`. As mensagens de erro
  desses serviços são texto de operador e mudam com o upstream: classificá-las por regex daria causa
  errada sem nenhum teste pegar.
- **Decisão:** `annotateBlock` sai do closure de `runFallbackLoop` e vira função exportada, aceitando uma
  causa já classificada (`result`). Cada erro (`EmbeddingsError`, `MediaError`, `FusionError`) ganha um
  campo opcional `blockCause: BaseBlockCause`, escrito no ponto do `throw` que já conhece a família.
  As rotas copiam para `error.cause`, escrevem `X-Block-Cause` com `setExhaustionHeaders` (sem mexer no
  `Retry-After` já definido), acrescentam `execution_id` e emitem um `route_blocked` por resposta.
- **Consequências:** nenhum status, `code` ou `Retry-After` muda; nenhuma mensagem é interpretada; a
  dependência da issue #27 passa a incluir M1.2 para a parte do log. `/v1/search` e `/v1/rerank` ficam
  de fora e precisam de pedido de tarefa se R23 os incluir.
- **Decidido por:** arquiteto-senior (desenho da M1.4).

## ADR-015: `execution_id` do inbound-chat vai no log e no cabeçalho

- **Data:** 2026-11-27
- **Status:** aceita
- **Contexto:** M1.2 deixou `execution_id=none` nas entradas Gemini e Ollama porque `getRequestGroupId`
  estava em `routes/proxy.ts`, e importar uma rota dentro de `lib/inbound-chat.ts` só para isso aumentaria
  o acoplamento. Os corpos desses protocolos são de terceiros.
- **Decisão:** `getRequestGroupId` passa a morar em `lib/request-group-id.ts` (puro, listado em
  `module-purity.test.ts`), com re-export em `proxy.ts` para compatibilidade. `runInboundChat` calcula o id
  uma vez, grava em `logIdentity.requestId` e devolve em `X-Request-ID`. Corpos Gemini/Ollama não mudam.
- **Consequências:** R2 e R23 fecham para essas superfícies sem quebrar clientes de protocolos
  estranhos; cada requisição tem um id distinto, e o mesmo valor aparece no log e no cabeçalho.
- **Decidido por:** arquiteto-senior (desenho da M1.5).

## ADR-016: botão de URL do gateway é distinto do de URL do provedor

- **Data:** 2026-11-27
- **Status:** aceita
- **Contexto:** R4 pede "Copiar URL da API" com `<baseUrl>/chat/completions`. O `upstream/main` já traz,
  da PR #2020, um botão "Copy base URL" em cada linha de provedor que copia `k.apiUrl ?? k.baseUrl`, com
  as chaves `setup.copyUrl`/`setup.copiedUrl`. São URLs diferentes: a do provedor e a do gateway.
- **Decisão:** M2.1 acrescenta um botão novo na `UnifiedKeySection` (onde o `baseUrl` do gateway já é
  exibido), com as chaves `keys.copyApiUrl`/`keys.copiedApiUrl` nos 60 locales. O botão do provedor fica
  como está, com as chaves e o teste dele. O valor copiado é `baseUrl.replace(/\/+$/,'') + '/chat/completions'`.
- **Consequências:** duas ações com nomes distintos na interface; nenhum endpoint, limite ou id de modelo
  novo; `check:i18n` é a prova automática da paridade de locales. Risco baixo.
- **Decidido por:** arquiteto-senior (desenho da M2.1).
