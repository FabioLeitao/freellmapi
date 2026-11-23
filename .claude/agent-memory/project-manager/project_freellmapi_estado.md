---
name: project-freellmapi-estado
description: Estado do plano do FreeLLMAPI (fork), rodada 1, perguntas em aberto e próximos passos
metadata:
  type: project
---

**Estado (2026-11-23, rodada 1, início 2026-11-23T22:47Z):** estrutura de gerência criada no `main` (`docs/operacao.md`, `docs/description.md`, `docs/plano.md`). Plano pronto para aprovação do cliente; **nenhuma issue de tarefa publicada**; nenhum agente chamado.

**Cliente:** Fabio (product owner e usuário do time). A descrição foi levantada pelo PM a partir das issues #1 a #4, da PR #6 e dos commits locais; não houve briefing.

**Por quê:** o fork tem backlog solto (issues sem ID, PR #6 com CI vermelho, `main` vermelho desde `c1c07bb`). O fluxo completo foi pedido pelo usuário.

**Arquivos enviados ao cliente:**
- `docs/visao-projeto-2026-11-23.pdf` ("Plano do projeto para aprovação").
- `docs/perguntas-cliente-r1-2026-11-23.pdf`, rodada 1, perguntas P1 a P7 (P1 422 vs descartar imagens; P2 Grok/xAI gratuitos; P3 Cursor; P4 só fork; P5 critérios de admissão; P6 `served_model`; P7 orçamento da medição).

**Próximos passos (na ordem):**
1. Esperar o usuário avisar que o cliente aprovou o plano (registrar a aprovação em `docs/description.md`) e devolveu o formulário (salvar como `docs/respostas-cliente-r1-AAAA-MM-DD.pdf`).
2. Publicar as tarefas com a skill `publicar-tarefas` (rótulos de área, milestones F0/M1/M2/M3, issue `[registro] Eventos do projeto`, rótulos do fluxo). Fechar #2 e #3 como duplicatas com o motivo; #4 vira M1.2; #1 é guarda-chuva de M3.
3. Preparação inicial do fluxo: arquiteto faz a base (F0.2) e desenha F0.1 primeiro (o `main` vermelho trava tudo).
4. Antes da primeira chamada a dev: o usuário decide quem implementa (opencode ou o dev do framework, que é descrito como Python; o projeto é TypeScript/Node).
5. Proteção do `main` só no primeiro CI verde (F0.3).

**Pendências com o usuário (chat):** stack do dev; se o `builder-senior` gera releases ou só vale o build do wrapper; PR por tarefa (padrão do fluxo) ou PR por módulo (a regra de granularidade do usuário); o wrapper `freellmapi-databoar-build` tem dois defeitos (F0.5).

**Fatos conferidos:** `main` verde por último em `dd1efe7`; primeiro vermelho `c1c07bb` (migração `20261122_000001_nvidia_3.5_embedding_catalogue`), passo "Check migration round trip". PR #6 só tem tipos e entradas do painel para Grok/xAI, sem adaptador no servidor.
