---
name: feedback-escalada-modelos
description: Ordem de modelo para dev externo: Auto do FreeLLMAPI (~95%), depois free direto no harness (OpenCode Go Hy4, OpenRouter, NVIDIA), pagos só para o que é sério
metadata:
  type: feedback
---

Ordem de escalada do modelo de um dev externo:
1. Auto do FreeLLMAPI (resolve ~95% dos casos).
2. Se o Auto falhar NA TAREFA (resultado conferido), um free direto no harness, fora do FreeLLMAPI: OpenCode Go "Hy4 flash Free", OpenRouter free ou NVIDIA direto. Registrar o motivo.
3. Pagos (Cursor, Codex, agy, Claude Code) só para trabalho sério de verdade; volume vai para harness tunado com skills fortes.

**Why:** o operador, em 26/nov/2026: "economizamos tokens de code e cursor e codex e agy pra coisas mais sérias que volume que pode ser cuidado por harness tunado e skills fortes". O Hy4 flash Free (OpenCode Go) resolveu a M1.1 depois de o Auto e o Codestral falharem (25/nov).

**How to apply:** nunca pular direto do Auto para um pago; registrar no evento o modelo e o provedor reais. Ver [[feedback-tudo-externo]] e [[feedback-nunca-dev-interno]].
