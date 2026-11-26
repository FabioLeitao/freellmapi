---
name: feedback-nunca-dev-interno
description: NUNCA chamar backend-dev-senior/frontend-dev-senior do Claude Code neste projeto, nem sugerir como opção; dev é sempre externo (opencode)
metadata:
  type: feedback
---

Nunca chamar nem oferecer como opção (muito menos "Recommended") o `backend-dev-senior` ou o `frontend-dev-senior` do Claude Code. Quando o Auto do opencode falhar, escalar DENTRO do opencode (fixar modelo pelo `/models`), nunca voltar ao dev interno.

**Why:** ordem do operador em maiúsculas, 2026-11-25 (quarta): "NAO OUSE DISPARAR NO BACKEN-DEV-SENIOR INTERNO DO CODE"; a franquia semanal de tokens do Claude Code quase acabou por causa do dev-senior interno, e ele já tinha pedido para economizar. `docs/operacao.md` já dizia que os devs do framework não são chamados.

**How to apply:** em impasse do dev externo: trocar modelo no opencode, outro harness externo, ou levar ao operador sem sugerir o dev interno. Poupar também subagentes Claude caros (revisor/arquiteto em Opus): chamar só o necessário. Ver [[fork-opencode-build]].
