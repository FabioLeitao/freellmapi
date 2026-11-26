---
name: feedback-tudo-externo
description: TODOS os papéis (dev, revisão, desenho, QA, adversarial) vão para harness externo (opencode, agy, codex, cursor, hermes); subagente Claude só em último caso
metadata:
  type: feedback
---

Toda missão que um harness externo consegue fazer vai para ele: dev (opencode), revisão e adversarial (Hermes, Codex), desenho e QA (opencode/agy/codex/cursor). Subagente do Claude Code (revisor-senior, arquiteto-senior, qa-senior, cyber-senior) só quando não há externo possível, e então no modelo mais barato que dá conta (Sonnet/Haiku).

**Why:** operador, 2026-11-25, em maiúsculas: "TODAS AS MISSOES QUE TB PODERIAM ESTAR SENDO PROCESSADAS AGNOSTICAMENTE PELO OC OU AGY OU CODEX OU CURSOR, até o HERMES serve pra isso". A semana chegou a 70% na quarta; nesta sessão revisor e arquiteto (Opus) gastaram ~150k cada, o cyber ~90k, e o PM ~250k de contexto por leitura de tela.

**How to apply:** antes de qualquer Agent, perguntar "qual harness externo faz isto?" e operá-lo pela TUI no herdr (skills operar-*). Acompanhar o externo com poucas leituras (esperar o fim, não aprovar passo a passo: liberar comandos de teste/leitura de uma vez). Abrir sessão nova cedo para o contexto do PM não crescer. Ver [[feedback-nunca-dev-interno]].
