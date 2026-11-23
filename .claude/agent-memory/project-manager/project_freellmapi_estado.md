---
name: project-freellmapi-estado
description: Estado do plano do FreeLLMAPI (fork), rodada 1, perguntas em aberto e próximos passos
metadata:
  type: project
---

**Rodadas 1 a 3 encerradas (custo US$ 1,67 e US$ 2,70 em `docs/custos.md`; eventos `custo` na issue #7); a próxima rodada começa na hora do último evento `custo`.** **Estado (2026-11-23):** estrutura de gerência criada no `main` (`docs/operacao.md`, `docs/description.md`, `docs/plano.md`). Plano pronto para aprovação do cliente; **nenhuma issue de tarefa publicada**; nenhum agente chamado.

**Cliente:** Fabio (product owner e usuário do time). A descrição foi levantada pelo PM a partir das issues #1 a #4, da PR #6 e dos commits locais; não houve briefing.

**Por quê:** o fork tem backlog solto (issues sem ID, PR #6 com CI vermelho, `main` vermelho desde `c1c07bb`). O fluxo completo foi pedido pelo usuário.

**Arquivos enviados ao cliente:**
- `docs/visao-projeto-2026-11-23.pdf` ("Plano do projeto para aprovação").
- `docs/perguntas-cliente-r2-2026-11-23.pdf`, rodada 2 (substitui a r1, enviada antes de P4 ser respondida): perguntas P1, P2, P3, P5, P6, P7 e P8 (P8: todo patch vai ao upstream ou parte fica só no fork).
- `docs/perguntas-cliente-r1-2026-11-23.pdf`, rodada 1 (superada pela r2), perguntas P1 a P7 (P1 422 vs descartar imagens; P2 Grok/xAI gratuitos; P3 Cursor; P4 só fork; P5 critérios de admissão; P6 `served_model`; P7 orçamento da medição).

**Próximos passos (na ordem):**
0. **P4 respondida pelo usuário no chat em 2026-11-23: os patches seguem ao upstream.** Plano revisado: F0.4 riscada; novos F0.6 (sincronizar o fork com o upstream, vem primeiro), F0.7 (ADR do fluxo de patch), F0.8 (substituir a PR #6), módulo M4 (reasoning models e embeddings NVIDIA, extraídos do `c1c07bb`), R19 a R22. Em seguida a F0.6: F0.1, que provavelmente é a migração local, não a defasagem.
1. Esperar o usuário avisar que o cliente aprovou o plano (registrar a aprovação em `docs/description.md`) e devolveu o formulário (salvar como `docs/respostas-cliente-r1-AAAA-MM-DD.pdf`).
2. Publicar as tarefas com a skill `publicar-tarefas` (rótulos de área, milestones F0/M1/M2/M3, issue `[registro] Eventos do projeto`, rótulos do fluxo). Fechar #2 e #3 como duplicatas com o motivo; #4 vira M1.2; #1 é guarda-chuva de M3.
3. Preparação inicial do fluxo: arquiteto faz a base (F0.2) e desenha F0.1 primeiro (o `main` vermelho trava tudo).
4. Dev: **o opencode codifica tudo, em teste** (usuário, 2026-11-23); devs do framework não são chamados. Regras em `docs/operacao.md`. Primeira tarefa a ir ao opencode: F0.1, depois do desenho do arquiteto e dos testes do QA.
5. Proteção do `main` só no primeiro CI verde (F0.3).

**Pendências com o usuário (chat):** se o `builder-senior` gera releases ou só vale o build do wrapper; PR por tarefa (padrão do fluxo) ou PR por módulo (a regra de granularidade do usuário); o wrapper `freellmapi-databoar-build` tem dois defeitos (F0.5).

**Fatos conferidos:** `main` verde por último em `dd1efe7`; primeiro vermelho `c1c07bb` (migração `20261122_000001_nvidia_3.5_embedding_catalogue`), passo "Check migration round trip". PR #6 só tem tipos e entradas do painel para Grok/xAI, sem adaptador no servidor.

**Issue de registro:** #7 (`[registro] Eventos do projeto`). Rótulos do fluxo criados. Limpeza do ambiente rodada no fim da rodada 1. Cliente decide pelo formulário; sem trabalho liberado até a aprovação.

**Ritual de fechamento (projectAgents#104, fixado pelo usuário em 2026-11-23):** três revisões (revisor, cyber/KP, adversarial pelo Hermes), check-all equivalente local (este repo não tem `scripts/check-all.sh`), `Pré-voo: modo=desligado (sem builder)` e merge só por `merge-green FabioLeitao/freellmapi#<n>` (o PM não roda `gh pr merge`). Aplicação provisória; pedir builder ou criar check-all é decisão do usuário.

**Dogfooding de F0.6 (rodada 3, 2026-11-23):** mescla fork + upstream limpa e não muda o esquema; boot do artefato igual ao `:3001`; a causa do `main` vermelho (F0.1) é a migração local de `c1c07bb` (nome com ponto, ordem no registro, parâmetro do `node:sqlite`, round trip). F0.1 e F0.6 são independentes. **O sync não foi empurrado ao `main`: espera a decisão do usuário** (PR de sync pelo `merge-green`, ou F0.1 antes). O `:3001` real é um contêiner podman com imagem que não inclui os commits locais.
