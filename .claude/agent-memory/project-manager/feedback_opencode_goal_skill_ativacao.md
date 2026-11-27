---
name: feedback-opencode-goal-skill-ativacao
description: No opencode, o prompt PRECISA trazer /goal e @skill selecionados nos seletores da TUI (Tab); colar texto não ativa; detalhe pode ir num briefing.md
metadata:
  type: feedback
---

Todo prompt de missão ao opencode leva `/goal` e cada `@skill` (ex.: `@incremental-implementation`) ATIVADOS pelos seletores da TUI: digitar `/goal` → esperar o seletor → Tab; digitar o objetivo até `@incremental-impl` → esperar o seletor de skill → Tab → Enter. Conferir na tela `skill  incremental-implementation` e o rodapé `◎ goal`. O detalhe da tarefa pode ficar num `briefing.md` numa pasta, com o prompt apontando para ele. Não interromper com esc e recomeçar por conta própria.

**Why:** operador, 2026-11-25, em maiúsculas: "o TEXTO DO PROMPT PRECISA DO SLASH goal e do @ skills ... ou ele NAO CARREGA". Colar tudo via `herdr pane send-text` virou prosa; steer por prosa não liga goal nem skill. Eu errei 3 vezes antes de acertar.

**How to apply:** em toda missão ou retomada do opencode (e harness com seletores parecidos). Ver [[feedback-tudo-externo]].
