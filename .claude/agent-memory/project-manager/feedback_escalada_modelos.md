---
name: feedback-escalada-modelos
description: Ordem de modelo para dev externo: Auto do FreeLLMAPI (~95%), depois free direto no harness (OpenCode Go Hy4, OpenRouter, NVIDIA), pagos só para o que é sério
metadata:
  type: feedback
---

Ordem de escalada do modelo de um dev externo:
1. Auto do FreeLLMAPI (resolve ~95% dos casos).
2. Se o Auto falhar NA TAREFA (resultado conferido), um free direto no harness, fora do FreeLLMAPI: OpenCode Go "Hy4 flash Free", OpenRouter free ou NVIDIA direto. Registrar o motivo.
3. Pagos (Cursor, Codex, agy, Claude Code) só para o que exige cognição de verdade: SDK complexa, planos/arquitetura de sistema e integrações, refatoração ou simplificação grande, contexto enorme, cibersegurança complexa. Desenho e decisão de tarefa rotineira vão nos free (correções do operador, 26/nov).
0. Ollama local (já ligado no FreeLLMAPI): modelos tunados para um canto estreito; obrigatório quando a missão é local first ou local only por sigilo.
4. Mesmo nos pagos, cibersegurança de blue team pode ser recusada por classificador que lê o vocabulário e não a intenção (proteção de dados soa como ataque). Se recusar, trocar de harness/provedor e registrar; nunca reescrever o pedido para driblar.

**Why:** o operador, em 26/nov/2026: "economizamos tokens de code e cursor e codex e agy pra coisas mais sérias que volume que pode ser cuidado por harness tunado e skills fortes". O Hy4 flash Free (OpenCode Go) resolveu a M1.1 depois de o Auto e o Codestral falharem (25/nov).

**How to apply:** nunca pular direto do Auto para um pago; registrar no evento o modelo e o provedor reais. Ver [[feedback-tudo-externo]] e [[feedback-nunca-dev-interno]].
