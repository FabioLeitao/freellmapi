# Plano do projeto: FreeLLMAPI (fork local)

Atualizado em 2026-11-23 (rodada 1; revisado depois da resposta de P4). Repositório de trabalho: `FabioLeitao/freellmapi`. Estado: **plano aprovado em 2026-11-23 (pelo usuário, no chat); tarefas publicadas em 2026-11-23.**

## Resumo

O projeto já existe e funciona. O plano cobre só o **backlog do fork**: o que as issues #1 a #4 pedem, o que a PR #6 afirma ter feito e o que impede o trabalho de andar. São cinco entregáveis:

1. **F0, Fundação:** o `main` está vermelho desde `c1c07bb` (migração de NVIDIA embeddings quebra o "Check migration round trip"). Nada mescla antes disso. Junto vêm a base da arquitetura do monorepo, a proteção do `main`, a regularização da PR #6 e a marca de versão dos nossos patches.
2. **M1, Diagnóstico de falhas com imagens:** histórico com imagem e sem modelo de visão deve dar 422 `no_vision_model` (não 429), com cabeçalhos e log estruturado, também no histórico reinjetado e na cadeia MCP.
3. **M2, Provedores e painel de chaves:** botão de copiar a URL da API, Grok e xAI de verdade (hoje só aparecem no painel, sem adaptador no servidor) e a decisão sobre o Cursor.
4. **M3, Avaliação e admissão de provedores gratuitos:** termos oficiais, critérios de admissão, `served_model` e medição comparativa antes de mexer no `auto`; o Kilo só entra se passar, desligado por padrão.
5. **M4, Patches locais para o upstream:** o que já está só no fork (`c1c07bb` mistura reasoning models, headers de RCA do 429 e embeddings NVIDIA) é separado em mudanças únicas, cada uma com teste, para o upstream.

Ordem: **F0.1 e F0.6 são independentes** (o dogfooding de 2026-11-23 mostrou que o vermelho vem da migração local, e não da defasagem). F0.1 destrava o CI dos PRs de revisão no fork; F0.6 destrava os branches de patch. **Ordem aprovada (2026-11-23): F0.1, depois M1 (#3 e #4); a #5 (M2.2) fica estacionada até a P2; o sync (F0.6) só entra antes do primeiro PR ao upstream, que está travado.** M1, M2 e M4 andam em paralelo depois deles. M3 começa pela leitura dos termos (F0 não a bloqueia) e só chega ao código depois das respostas do cliente.

**Destino (P4, respondida em 2026-11-23):** os patches seguem ao upstream, seguindo o `CONTRIBUTING.md` de lá. Branch de patch nasce de `upstream/main`, uma mudança por PR, sem arquivos de gerência. O fork é a base de trabalho e de revisão (`docs/operacao.md`).

## Fatos conferidos antes de planejar (2026-11-23)

- `main`: último verde `dd1efe7` (22/nov); vermelho em todos os pushes seguintes. O primeiro é `c1c07bb` (patch local direto no `main`, com a migração `20261122_000001_nvidia_3.5_embedding_catalogue.ts`). O passo que falha é "Check migration round trip", nos três Node.
- PR #6 (3 commits, 64 arquivos, 60 deles de locale): **CI vermelho pelo mesmo passo**, herdado do `main`; a descrição diz que "tudo passa" e não há teste novo no diff.
- Grok e xAI: a PR só acrescenta os tipos `grok`/`xai` em `shared/types.ts` e entradas no painel. **Não há adaptador em `server/src/providers`**, e os limites citados (60 mensagens/dia, 2M tokens/dia, 10 RPM; 100 mensagens/dia, 250 RPM) não têm fonte oficial. A issue #5 foi fechada com isso.
- 422 vs 429: o `proxy.ts` já devolve 422 `no_vision_model` com `X-Vision-Model-Available: false` (commit `a70c4e8`). A PR #6 só troca um `TODO` por um log `history_reinject_blocked`. A issue #3 pede os cabeçalhos `X-Fallback-Attempts` e `X-Fallback-Trail` e o evento `history_vision_blocked`, e diz que o caminho do histórico reinjetado não chega nesse código: **isso ainda não foi reproduzido.**
- `served_model`: a issue #1 diz que a coluna está vazia, mas o `proxy.ts` já importa `observeServedModel` (`lib/served-model.ts`). A tarefa M3.3 começa por entender por que ela não é gravada.
- Marca de versão: o `FREEAPI_VERSION` é lido **em tempo de execução** (`server/src/lib/app-version.ts`) e o `freellmapi-databoar-build` só o exporta durante o build. O wrapper também compila o checkout atual e usa `--ref` só para calcular o texto.
- Issues: #2 e #3 são duplicatas ("History with images → 429"); #4 pede o log; #5 está fechada; #1 é de avaliação. Nenhuma tem ID `[x.y]`, rótulo de área nem milestone.
- Fork contra upstream: o `main` do fork está **11 commits atrás e 9 à frente** do `upstream/main`. O CI do `upstream/main` está verde; o upstream não mexeu em `server/src/db/migrations` nem em `db/migrate` desde o ponto comum (`8fcdb90e`). A causa provável do vermelho é, portanto, a migração local de `c1c07bb`, e não a defasagem. O arquiteto confirma em F0.1.
- `c1c07bb` mistura três mudanças (reasoning models em `openai-compat.ts`, headers de RCA do 429 em `proxy.ts` e a migração de embeddings NVIDIA com `defaults.ts`); o upstream exige uma mudança por PR.
- **Dogfooding de F0.6 (2026-11-23, Node 24.22.2, árvore `origin/main` + `upstream/main`, sem conflito, não enviada ao `main`):** `npm ci`, lint e build verdes; `npm test` do server com 5 falhas em 5.713, todas da migração local (ver F0.1); cli (183 testes), client (515, com `check:i18n`: 60 locales e 1.304 chaves), hooks e bootstrap rodaram à parte e passaram (o `npm test` da raiz encadeia com `&&` e parou no server); o artefato sobe em 2 s e responde igual ao `:3001` vivo em 7 GETs sem autenticação; as 53 migrações se aplicam num banco novo; a lista de migrações da mescla é idêntica à do fork, então o sync no GitHub não muda o esquema (a imagem do `:3001`, porém, tem 52 migrações, uma a menos que o `main` do fork: um build do `main` aplicaria a migração NVIDIA no banco real). **Não verificado:** roteamento com chaves reais (só o usuário autoriza) e o `main` do fork sozinho (a atribuição vem das mensagens de erro e do CI do fork, que já falhava no round trip).
- O `:3001` real é um contêiner podman com a imagem `freellmapi:up-8fcdb90e.databoar-01474fe1.zeroclassifier`: o ponto de separação com o upstream mais o commit `01474fe1` ("merge: absorb upstream 8fcdb90e into databoar fork"), que não está em nenhum branch do clone. Os patches da imagem (`288bf0c6` e `ae7b754d`, o classificador do Zero) estão no `main` do fork; só o commit de merge `01474fe1` está solto. A imagem não tem `c1c07bb`, `a70c4e8` nem a migração NVIDIA (52 migrações contra 53 no `main`). Sincronizar no GitHub não troca o contêiner; isso exige build e reinício, e **nenhum build do `main` do fork vai ao `:3001` antes de F0.1**.
- **Conferido no código e no GitHub (2026-11-23, a partir do relato da sessão Owl):** no `proxy.ts`, `X-History-Contains-Images` e `X-Vision-Model-Available` são **chaves do corpo JSON** do 422, e não cabeçalhos HTTP; o `TODO` do log segue no `main`; o log `history_reinject_blocked` da PR #6 dispara em todo 422 de imagem, com ou sem histórico; o ramo que já devolve 422 (`hasImage && !hasEnabledVisionModel()`) não é o do caso real, um 429 sem explicação. Não há teste novo em nenhum desses commits. A atribuição desses commits ao goose é só relato; não conferi.
- **No upstream, em nome da conta do usuário:** as issues #2061, #2062 e #2063 (abertas, sem comentário) e a PR #2074 (fechada sem merge, 69 arquivos, +260/-3). O upstream decidiu em 23/nov (`a088fc8e`, #1946) que dado de modelo mora no catálogo assinado, não em migração.
- Há 4 branches de épico no fork (`feature/epic-fixes`, `-2`, `-final` e `all-fixes-epic`), com commits duplicados em SHAs diferentes.

## Requisitos

Funcionais

| ID | Requisito | Módulo |
|---|---|---|
| R1 | Requisição com imagem no histórico e sem modelo de visão habilitado devolve 422 `code: no_vision_model`, nunca 429. *(depende de P1)* | M1 |
| R2 | Todo bloqueio por falta de visão gera um log estruturado com `execution_id` que separa "sem modelo de visão", "cota" e "cooldown", e os cabeçalhos `X-Fallback-Attempts` e `X-Fallback-Trail`. | M1 |
| R3 | O histórico reinjetado por handoff de memória e a cadeia MCP passam pela mesma validação de R1. | M1 |
| R4 | O painel de chaves tem o botão "Copiar URL da API" (`<baseUrl>/chat/completions`), só para chaves com `baseUrl`. | M2 |
| R5 | Grok e xAI funcionam como provedores (chave, adaptador no servidor, roteamento) com limites tirados dos termos oficiais. *(depende de P2)* | M2 |
| R6 | Decisão registrada sobre a viabilidade do Cursor como provedor. *(depende de P3)* | M2 |
| R7 | Os termos oficiais de Kilo, Modal, xKiro, Z.ai e Moonshot são lidos e registrados (retenção, treino, permissão de agregação) com fonte e data. | M3 |
| R8 | Todo provedor novo passa pelos critérios de admissão aprovados pelo cliente. *(depende de P5)* | M3 |
| R9 | A coluna `served_model` é preenchida com o modelo que o provedor informa. *(depende de P6)* | M3 |
| R10 | Nenhuma prioridade do `auto` muda sem uma medição comparativa reproduzível anexada. *(depende de P7)* | M3 |
| R11 | O Kilo, se aprovado, entra como adaptador novo, com teste, desligado por padrão. *(depende de P5)* | M3 |
| R21 | O ajuste de reasoning models chega ao upstream como PR única, com teste. | M4 |
| R22 | O catálogo de embeddings NVIDIA 3.5 chega ao upstream como PR única, com teste, **pelo catálogo assinado e não por migração de dados** (ADR-003 do arquiteto, decisão do upstream em `a088fc8e`, #1946); se ainda precisar de migração de esquema, em arquivo novo com round trip verde. No fork, uma exceção se decide no desenho da tarefa. | M4 |
| R23 | Toda resposta 429 e todo bloqueio do roteador deixam, no log estruturado e na resposta, uma causa distinta (sem modelo de visão, visão habilitada sem cota, cooldown, limite do provedor, cota da chave, cadeia esgotada), com `execution_id`, de modo que o operador separe as causas sem abrir o banco. O 429 pode continuar existindo quando a causa é cota ou limite; o que não pode é ser genérico. *(requisito do cliente, 2026-11-23, no chat)* | M1 |

Não funcionais

| ID | Requisito | Módulo |
|---|---|---|
| R12 | O CI do `main` e de todo PR fica verde; o `main` fica protegido com os checks obrigatórios. | F0 |
| R13 | Mudança de esquema só em arquivo de migração novo, com round trip reversível; migração aplicada nunca é editada. | F0 |
| R14 | Todo PR traz teste, tem escopo único e não adiciona serviço pago nem que peça cartão (`CONTRIBUTING.md`). | todos |
| ~~R15~~ | ~~Todo trabalho, issue e PR fica no fork; nada vai ao upstream.~~ **Fora do escopo desde 2026-11-23:** substituído por R20 (P4 respondida: os patches seguem ao upstream). | ~~todos~~ |
| R16 | Nenhuma chave, custo ou informação de outros projetos entra em issue, commit, log ou relatório (fork público). | todos |
| R17 | Todo build com os nossos patches usa o `freellmapi-databoar-build`, e a versão marcada chega ao painel. | F0 |
| R18 | Textos novos do painel entram em todos os arquivos de locale, seguindo `docs/TRANSLATION.md` e o validador. | M2 |
| R19 | Todo patch segue o `CONTRIBUTING.md` do upstream: `.editorconfig` e tsconfig, `npm test` verde, `npm run check:i18n` em `client/`, nada reformatado fora da mudança, nenhum limite, id de modelo ou endpoint inventado (conferido no provedor) e testes que exercitam a mudança de verdade. O autor responde pelo diff inteiro. | todos |
| R20 | Todo patch ao upstream é uma mudança por PR, em branch nascido de `upstream/main` (nunca do `main` do fork), sem `docs/operacao.md`, `docs/plano.md`, `docs/custos.md`, `docs/arquitetura.md`, `docs/decisoes.md`, `docs/desenho/`, PDFs nem `.claude/agent-memory/`. O PR no upstream só abre com o "vai" do usuário. **Trava dura (2026-11-23): nenhum PR, issue ou comentário no upstream antes de a mudança estar validada localmente, no fork e no `:3001`; depois, um "vai" por PR (`docs/operacao.md`).** | todos |

## Timeline de tarefas

Áreas: `backend`, `ux`, `qa`, `gestão`. Tarefa mista tem `backend` e `ux` numa issue só.

### F0, Fundação

| ID | Tarefa | Área | Atende | Depende de |
|---|---|---|---|---|
| F0.1 | Corrigir o "Check migration round trip" vermelho no `main`. **Causa confirmada em 2026-11-23** (5 testes vermelhos em 5.713, todos da migração `20261122_000001_nvidia_3.5_embedding_catalogue` de `c1c07bb`): (1) ponto no nome do arquivo (`3.5`), e o teste de backup exige `[a-z0-9_]+`; (2) registro em `defaults.ts` fora da ordem dos nomes, antes da `20261111_000002_profile_routing_strategy`; (3) `up()` passa ao `node:sqlite` um parâmetro que ele rejeita (`Unknown named parameter '0'`); (4) up, down, up muda os ids de `embedding_models` (13 e 14 viram 15 e 16): é migração de dados que a down não desfaz (sintoma; a ordem do registro pode contribuir). Corrigir é refazer a migração (ou reverter o `c1c07bb`); o arquiteto decide no desenho. | backend | R12, R13 | — |
| F0.2 | Base da arquitetura do monorepo existente (`shared`, `server`, `client`, `cli`, `desktop`): stack, migrações, i18n, hash CSP, como um `Platform` vira adaptador. Skill `base-arquitetura`. | gestão (arquiteto) | R14 | — |
| F0.3 | Proteger o `main` (checks obrigatórios, sem force-push). | gestão | R12 | F0.1 |
| ~~F0.4~~ | ~~Regularizar a PR #6 pelo fluxo.~~ **Riscada em 2026-11-23:** a PR #6 não segue como está (mistura três mudanças, 60 arquivos de locale, sem teste; o upstream exige uma mudança por PR). Substituída por F0.8. | ~~gestão~~ | ~~R12, R14~~ | — |
| F0.5 | Fazer a marca de versão dos patches chegar ao painel: o servidor lê `FREEAPI_VERSION` em tempo de execução e o wrapper só a exporta no build; o wrapper também precisa compilar o `--ref` pedido. O arquiteto decide o desenho; a mudança no wrapper (`~/.local/bin`) é do usuário. | backend | R17 | F0.2 |
| F0.6 | Sincronizar o `main` do fork com o upstream (merge, sem rebase), antes de cortar qualquer branch e de diagnosticar F0.1. | gestão | R20 | — |
| F0.7 | Fixar o fluxo de um patch até o upstream (branch de `upstream/main`, gate local, PR de revisão no fork que não é mesclado, abertura no upstream) como decisão do projeto (ADR), a partir do rascunho de `docs/operacao.md`. | gestão (arquiteto) | R19, R20 | F0.2, F0.6 |
| F0.8 | Substituir a PR #6: refazer os seus itens como branches de `upstream/main`, um por mudança (são as tarefas M1.2, M2.1 e M2.2), e fechar a #6 com um comentário que aponte a substituta e aposentar, sem apagar, os branches `feature/epic-fixes`, `-2`, `-final` e `all-fixes-epic`. No upstream, as issues #2061 a #2063 e a PR #2074 só recebem comentário ou fechamento com o "vai" do usuário. | gestão | R14, R20 | F0.7, M1.2, M2.1 |

### M1, Diagnóstico de falhas com imagens (issues #2, #3, #4)

| ID | Tarefa | Área | Atende | Depende de |
|---|---|---|---|---|
| M1.1 | Reproduzir e corrigir o 429 indevido: histórico com imagem, sem modelo de visão, devolve 422 `no_vision_model` também no histórico reinjetado e na cadeia MCP. **Hipótese a confirmar pelo arquiteto:** há modelo de visão habilitado, mas todos sem cota ou em cooldown, e o roteador devolve 429 genérico; o ramo que já devolve 422 não é o do caso real. O 429 pode continuar quando a causa é cota ou limite; o que o cliente não aceita é um 429 sem causa distinta (R23). | backend | R1, R3 | F0.1, **P1** |
| M1.2 | Log estruturado com **causa distinta** para toda resposta 429 e todo bloqueio do roteador (não só o de imagem), com `execution_id`: taxonomia mínima "sem modelo de visão", "visão habilitada sem cota", "cooldown", "limite do provedor", "cota da chave" e "cadeia esgotada"; o operador distingue as causas só pelo log, sem abrir o banco. A PR #6 traz uma primeira versão (`history_reinject_blocked`) que só cobre o 422 de imagem e dispara em todo 422 de imagem; o arquiteto decide os nomes dos eventos (a issue #3 pede `history_vision_blocked`). | backend | R2, R16, R23 | F0.1, **P1** |
| M1.3 | Cabeçalhos `X-Fallback-Attempts` e `X-Fallback-Trail` nas respostas 422 e 429 desse caminho. | backend | R2 | M1.1 |

Corte em PRs únicas: o arquiteto decide no desenho. Candidata natural: o `a70c4e81` mais o 422 `no_vision_model` também no caminho do histórico; o log e os cabeçalhos entram na mesma PR só se forem a mesma mudança.

### M2, Provedores e painel de chaves

| ID | Tarefa | Área | Atende | Depende de |
|---|---|---|---|---|
| M2.1 | Botão "Copiar URL da API" na página de chaves, com as chaves de i18n `copyApiUrl` e `copiedApiUrl` em todos os locales. A PR #6 traz uma versão. | ux | R4, R18 | F0.1 |
| M2.2 | Grok e xAI de ponta a ponta: adaptador no servidor, roteamento, limites dos termos oficiais, entradas do painel e i18n. Hoje só existem os tipos e as entradas do painel. | backend + ux (mista) | R5, R18 | F0.1, F0.2, **P2** |
| M2.3 | Cursor: investigar se há API compatível com OpenAI e registrar a decisão (viável ou não, com fonte). | gestão (arquiteto) | R6 | **P3** |

M2.1 e M2.2 são PRs separadas. M2.2 só vai ao upstream com limites e endpoints conferidos no provedor (R19); sem prova, fica só no fork.

### M3, Avaliação e admissão de provedores gratuitos (issue #1)

| ID | Tarefa | Área | Atende | Depende de |
|---|---|---|---|---|
| M3.1 | Documentar os critérios de admissão (os 6 da issue #1) como decisão do projeto (ADR). | gestão (arquiteto) | R8 | F0.2, **P5** |
| M3.2 | Ler os termos oficiais de Kilo, Modal, xKiro, Z.ai e Moonshot e registrar em `docs/providers`, com link, data e os três pontos (retenção, treino, agregação). | gestão (arquiteto) | R7 | — |
| M3.3 | Preencher `served_model` com o modelo que o provedor informa; começar por descobrir por que a coluna está vazia apesar do `observeServedModel`. | backend | R9 | F0.1, **P6** |
| M3.4 | Medição comparativa por tarefa (modelos dominantes contra GLM Flash, Kimi e os do xKiro), reprodutível e sem chaves no relatório. | backend | R10, R16 | M3.2, M3.3, **P5**, **P7** |
| M3.5 | Adaptador Kilo, desligado por padrão, com teste de contrato. Só se o Kilo passar nos critérios. | backend | R11, R8 | M3.1, M3.2, **P5** |

### M4, Patches locais para o upstream

| ID | Tarefa | Área | Atende | Depende de |
|---|---|---|---|---|
| M4.1 | Reasoning models: extrair de `c1c07bb` (`openai-compat.ts`) como PR única ao upstream, com teste que falha sem o ajuste. | backend | R21, R19, R20 | F0.6, F0.7 |
| M4.2 | Embeddings NVIDIA 3.5: extrair de `c1c07bb` (migração e `defaults.ts`) como PR única, com teste, **pelo catálogo assinado e não por migração de dados** (ADR-003 do arquiteto, decisão do upstream em `a088fc8e`, #1946); se ainda precisar de migração de esquema, em arquivo novo com round trip verde. No fork, uma exceção se decide no desenho da tarefa. É onde nasceu o vermelho de F0.1. **Antes de virar PR, conferir a decisão do upstream `a088fc8e` (#1946): dado de modelo mora no catálogo assinado, não em migração; a M4.2 pode deixar de ir ao upstream como migração (decide o arquiteto).** | backend | R22, R13, R19, R20 | F0.1, F0.6, F0.7 |

### Versões

O fork não usa as versões `v0.x` do framework: a marca de versão é a do wrapper (`<tag do upstream>-<commits>-g<sha>`).

- **Marco A, patches prontos para o upstream:** F0 + M1 + M2.1 + M4 (+ M2.2 se P2 aprovar). Build com o wrapper depois de F0.5.
- **Marco B, provedores avaliados:** M3.
- O `builder-senior` (imagens Docker e pacote) não é chamado por padrão. Registrado como pergunta ao usuário.

### Registro de issues

| Issue do fork | Destino |
|---|---|
| #1 | M3 (guarda-chuva; as tarefas M3.x citam #1) |
| #2 | ~~duplicata de #3~~ — fechada; os itens seguem em M1.1 (#3) |
| #3 | **M1.1** (issue adotada em 2026-11-23; a #2 era duplicata dela); os cabeçalhos HTTP ficam na M1.3 (#15) |
| #4 | M1.2 |
| #5 | **M2.2**, reaberta em 2026-11-23 (estava fechada como "completed" por engano: o commit do Grok/xAI nunca chegou ao `main`); adiada até a P2 |
| PR #6 | não segue como está; é substituída por F0.8 (fechar com o motivo quando as mudanças únicas tiverem PR) |

**Tarefa → issue (publicadas em 2026-11-23; última sincronização 2026-11-23):** F0.1 #8, F0.2 #9, F0.3 #10, F0.5 #11, F0.6 #12, F0.7 #13, F0.8 #14, M1.1 #3, M1.2 #4, M1.3 #15, M2.1 #16, M2.2 #5, M2.3 #17, M3.1 #18, M3.2 #19, M3.3 #20, M3.4 #21, M3.5 #22, M4.1 #23, M4.2 #24. F0.4 foi riscada e nunca teve issue (o ID não volta). A #7 é a issue de registro; a #1 é o guarda-chuva de M3.

## Testes (para o QA)

| ID | Teste | Resultado esperado | Cobre |
|---|---|---|---|
| T0.1 | Rodar `npm run test:migrations` e o round trip (up, down, up) em Node 20, 22 e 24. | Esquema depois do round trip igual ao inicial; zero diferença. | R12, R13 |
| T0.2 | CI do `main` depois de F0.1. | Todos os jobs verdes. | R12 |
| T0.3 | Com a proteção aplicada, tentar force-push e apagar o `main`; fazer push direto de documentação. | Os dois primeiros recusados; o terceiro aceito. | R12 |
| ~~T0.4~~ | ~~Descrição da PR #6 contra o diff.~~ Riscado com F0.4 (2026-11-23). | ~~Nenhuma afirmação sem prova.~~ | ~~R14~~ |
| T0.5 | `freellmapi-databoar-build --print-version --ref <ref>` e subir o servidor com o build. | Versão `<tag>-<n>-g<sha>` do ref pedido, igual à exibida no painel. | R17 |
| T0.6 | Depois de F0.6: `git merge-base --is-ancestor upstream/main origin/main`. | Saída 0: o fork contém o `upstream/main`. | R20 |
| T0.7 | `git diff --stat upstream/main...<branch de patch>`. | Só os arquivos da mudança; nenhum de `docs/`, `.claude/` nem PDF. | R20 |
| T0.8 | No SHA exato do branch de patch: `npm test`, `npm run build` e `npm run check:i18n` (em `client/`). | Todos verdes; o teste novo falha sem a mudança e passa com ela. | R14, R19 |
| T0.9 | Durante a trava: `gh pr list`, `gh issue list` e `gh search` por autor em `tashfeenahmed/freellmapi`. | Nenhum PR, issue ou comentário novo da conta do usuário; #2061 a #2063 e #2074 inalteradas. | R20 |
| T1.1 | Imagem no histórico, nenhum modelo de visão habilitado. | 422 `code: no_vision_model`, `X-Vision-Model-Available: false`, `X-Fallback-Attempts`, `X-Fallback-Trail`, todos como cabeçalhos HTTP de verdade (hoje os dois do `a70c4e8` são chaves do corpo JSON). | R1, R2 |
| T1.2 | O mesmo, com histórico reinjetado pelo handoff de memória. | 422, não 429. *(depende de P1)* | R1, R3 |
| T1.3 | O mesmo, pela cadeia MCP. | 422, não 429. | R3 |
| T1.4 | Modelo de visão habilitado, mas em cooldown ou sem cota. | 429, com cabeçalhos que dizem cota ou cooldown, distinguível do caso T1.1. | R2 |
| T1.5 | Modelo de visão habilitado e disponível. | 200, sem log de bloqueio. | R1 |
| T1.6 | Ler o log de cada bloqueio. | Um evento com `execution_id`, tipo e motivo; sem texto de mensagem, sem imagem, sem chave. | R2, R16 |
| T1.7 | Imagens reais (PNG e JPG, em base64 e por URL). | Mesmo comportamento de T1.1 a T1.5. | R1 |
| T1.8 | Provocar cada causa de 429 (cota da chave, cooldown, limite do provedor, cadeia esgotada, visão habilitada sem cota) e ler o log. | Cada causa gera um evento com `cause` distinto e `execution_id`; nenhum igual ao outro; sem texto de mensagem, imagem nem chave. | R23, R16 |
| T2.1 | Chave com `baseUrl`: clicar em "Copiar URL da API". | Área de transferência recebe `<baseUrl>/chat/completions`; o botão confirma. Sem `baseUrl`, o botão não aparece. | R4 |
| T2.2 | Validador de locales (`docs/TRANSLATION.md`). | As chaves novas existem em todos os locales; `en` e `pt-BR` corretos. | R4, R18 |
| T2.3 | Menu "Adicionar provedor". | Grok e xAI listados, com rótulo e link para obter a chave. | R5 |
| T2.4 | Chave de teste de Grok/xAI contra um servidor simulado. | Requisição roteada pelo adaptador e resposta devolvida; sem adaptador, a chave não fica "pronta". *(depende de P2)* | R5 |
| T2.5 | Limites mostrados no painel. | Iguais aos dos termos oficiais registrados, com fonte. *(depende de P2)* | R5 |
| T2.6 | Decisão do Cursor. | Documento com viável/inviável e a fonte. *(depende de P3)* | R6 |
| T3.1 | Documento de termos por provedor. | Para cada um dos cinco: link oficial, data, retenção, treino, agregação. | R7 |
| T3.2 | Critérios de admissão. | Seis critérios documentados; cada provedor novo tem a tabela de aprovação. *(depende de P5)* | R8 |
| T3.3 | Requisição atendida por provedor que informa o modelo. | `served_model` gravado; provedor que não informa fica nulo e marcado como opaco. *(depende de P6)* | R9 |
| T3.4 | Rodar a medição duas vezes com os mesmos prompts. | Relatórios comparáveis, sem chaves. *(depende de P7)* | R10, R16 |
| T3.5 | Mudar a prioridade do `auto`. | Só com relatório de T3.4 anexado. | R10 |
| T3.6 | Adaptador Kilo. | Desligado por padrão; ligar exige ação explícita; teste de contrato verde; nenhuma chave em arquivo. *(depende de P5)* | R11, R16 |
| T4.1 | Teste do ajuste de reasoning models. | Falha sem o ajuste, passa com ele; nenhum arquivo fora da mudança. | R21 |
| T4.2 | Embeddings NVIDIA: sem migração de dados (catálogo assinado) e, se houver migração de esquema, up, down, up. | Esquema idêntico ao inicial; teste de catálogo verde. | R22, R13 |

## Perguntas ao cliente

### Respondidas

| ID | Pergunta | Resposta | Data | Itens revisados |
|---|---|---|---|---|
| P4 | Os patches ficam só no fork, ou parte deles também vai ao upstream? | **Os patches seguem ao upstream** (`tashfeenahmed/freellmapi`, MIT), seguindo o `CONTRIBUTING.md` de lá; o fork é a base de trabalho. Resposta do cliente **pelo usuário, no chat**, depois de a sessão Owl recomendar. | 2026-11-23 | revisão no commit seguinte: R14, R15, F0.1, F0.4, M1, M2.1, M2.2, T0.4 e os novos F0.6 a F0.8, M4, R19 a R22 |

### Em aberto

| ID | Pergunta | Suposição adotada | Dependem dela |
|---|---|---|---|
| P1 *(prioritária)* | Histórico com imagem e sem modelo de visão: devolver erro 422 claro, ou descartar as imagens do histórico e seguir? | 422 `no_vision_model`, como pedem as issues. **Seguir pela suposição por decisão do usuário (2026-11-23): causa explícita (422 `no_vision_model` ou código específico), nunca 429 genérico.** O cliente esclareceu que o 429 pode ter vários motivos; o problema era a falta de distinção nos logs (R23). | R1, M1.1, M1.2, T1.1 a T1.7 |
| P2 *(prioritária)* | Os limites gratuitos de Grok e xAI vêm de fonte oficial? Serviço que exige crédito ou cartão pode entrar (o `CONTRIBUTING.md` proíbe)? | Só entra com plano gratuito comprovado nos termos oficiais; sem prova, fica marcado "não verificado" e fora do `auto`. | R5, M2.2, T2.3 a T2.5 |
| P3 | O Cursor é uma IDE, sem API compatível com OpenAI encontrada (como o Kiro da issue #1). Sai do escopo? | Sai, até haver evidência de uma API. | R6, M2.3, T2.6 |
| P5 | Os 6 critérios de admissão da issue #1 estão aprovados? Provedor que treina com os dados pode atender conteúdo sensível? | Aprovados como estão; provedor que treina com dados só atende conteúdo público. | R8, R11, M3.1, M3.4, M3.5, T3.2, T3.6 |
| P6 | Preencher `served_model` com o modelo que o provedor informar? | Sim; sem informação do provedor, fica vazio e o provedor é marcado como "opaco". | R9, M3.3, T3.3 |
| P7 | A medição comparativa pode gastar a cota gratuita dos provedores? Quanto? | Até 200 requisições por modelo, só em planos gratuitos. | R10, M3.4, T3.4 |
| P8 | Todo patch local deve ir ao upstream, ou parte fica só no fork? O upstream exige limite e id de modelo conferidos no provedor, nada pago e um teste real. | Só vai ao upstream o que tiver teste, fonte oficial e cumprir o `CONTRIBUTING.md`; o que não puder (por exemplo Grok e xAI sem prova de plano gratuito) fica só no fork, por PR no fork. | R19, R20, M2.2, M4, T0.7, T0.8 |


## Observações do PM

- A PR #6 mistura números do fork e do upstream (`#2020`, `#2062`, `#5`). O revisor confere o que cada `Closes` fecha.
- Os commits `c1c07bb` e `a70c4e8` entraram direto no `main` do fork. A partir daqui, todo código entra por branch de patch revisado; o `c1c07bb` é separado em M1, M4.1 e M4.2.
- **Quem codifica (decidido pelo usuário em 2026-11-23):** o opencode, em todas as tarefas de dev, em teste; os devs do framework não são chamados (`docs/operacao.md`). As tarefas que descobrem fatos (F0.1, M1.1, M3.3, M3.4) são diagnosticadas pelo arquiteto no desenho e entregues ao opencode em passos mecânicos.
- **Fork público × R16:** o `main` público do fork já tem custo por rodada, nomes de wrappers e de infraestrutura locais, a etiqueta da imagem e regras de outro repositório (#104). R16 pede nenhuma informação de outros projetos. Onde a gerência mora é decisão do usuário; o histórico não foi reescrito.
- **Trava dura sobre o upstream (2026-11-23, relatada pela sessão Owl):** nada vai ao upstream antes de a mudança estar validada localmente, no fork e no `:3001`. A P4 (patches seguem ao upstream) continua valendo, mas só depois dessa validação e com o "vai" do usuário por PR.
- **F0.2 entregue pelo arquiteto (2026-11-23, commits `11fff31e` e `7d52c79b`):** `docs/arquitetura.md` e `docs/decisoes.md` (ADR-001 a ADR-005). Ficam para a F0.7: onde moram os testes de aceitação num branch de patch nascido de `upstream/main`, e o helper `pendente` (o `it.fails` não serve).
- **Pedidos do arquiteto, à espera do usuário (nenhuma issue aberta):** (1) `paths-ignore` para `docs/**` e `.claude/agent-memory/**` no `push` de `ci.yml` e `docker.yml` do fork; hoje o `docker.yml` constrói e publica imagens a cada push no `main` do fork; (2) impedir que os testes do server acessem a rede de verdade (candidato a patch ao upstream, baixa urgência); (3) criar um `scripts/check-all.sh` só do fork como gate local.
