---
name: feedback-lessons-opencode-m11-2026-11-25
description: Lições da correção M1.1 no opencode (25/nov) — entrada do /goal pela TUI, onde está o desenho, verde não é certo, LSP primeiro; com template de /goal
metadata:
  type: feedback
---

Lições da correção da M1.1 pelo opencode (Hy4), 25/nov/2026. Repassadas ao Owl para a skill `operar-opencode`.

1. **Entrada do `/goal` pela TUI (herdr):** digitar `/goal`, conferir no seletor que a linha de cima é `/goal` e só então Tab. Um Tab fora de hora escolheu `@interview-me`. Cada `@skill` vai pelo seletor e com Tab. O `herdr pane send-text` insere o texto **onde o cursor estiver**, que pode ser o meio de uma palavra: leia a caixa antes de acrescentar algo. O herdr não tem `C-u`. Depois do Enter, confira o rodapé `◎ goal` (e não `goal paused`) e uma linha `skill <nome>` para cada skill.
2. **Diga no brief onde está o desenho:** o branch da tarefa não tem `docs/desenho/`, que fica no `main` do fork. Mande ler com `git show origin/main:./docs/desenho/<T>.md`, sem trocar de branch. Se faltou no brief, corrija com um steer curto: o opencode aceita steer no meio do `/goal`.
3. **Verde não é certo:** gate, testes, lint e `tsc` passaram, mas `blockCause` tinha um remendo (`adjustedDetail` inventava um `cooldown`) e uma condição que o desenho não tem. Na conferência, sonde com `tsx` casos do desenho que os testes não cobrem antes de aceitar. Variável sem uso pode ser sinal de lógica duplicada ou que divergiu.
4. **LSP primeiro:** o typescript-language-server, por um cliente stdio, achou 3 TS2345 que 37 testes verdes deixaram passar.
5. **Prettier:** não use em repositório que não tem prettier (o upstream não tem). Negue `npx --yes`, que instala pela rede.

**Why:** ordem do operador: resolver de fato, sem remendo para ficar verde; seguir os rituais; LSP e linters obrigatórios.
**How to apply:** em toda missão para um dev externo, siga o template abaixo e confira cada item na entrega.

Template (inglês, digitado pela TUI):
```
/goal <Task ID>: <what is wrong, with a proven failing input and the expected output from the design, file:line>.
Design: git show origin/main:./docs/desenho/<T>.md (read-only, no checkout).
Steps: (1) failing test derived from the design, run it, show red; (2) fix the root cause, no special cases;
(3) all task test files green. Run LSP diagnostics, lint and tsc before editing and before finishing.
Touch only <files>. No install, no network, no commit, no push, never worktree.
Use @test-driven-development @incremental-implementation @usar-lsp-e-linters @usar-wrappers @token-aware-automation
```
Receita do operador (via boar-pm, 25/nov): o `/goal` aponta para um briefing `.md` (texto curto na caixa, menos erro de digitação na TUI); em docs, `@linguistic-rigor-active-voice @documentation-en-pt-br @escrever-com-voz`. Free tier externo primeiro; fallback pago: Cursor, codex, agy, grok, Claude Code. Roteamento "smartest" do FreeLLMAPI ajudou (n=1). Detalhe: vault `lab-op/infra/dev-externo-ritual/README.pt_BR.md`.
Ver [[feedback-opencode-goal-skill-ativacao]] e [[feedback-tudo-externo]].
