---
name: feedback-fork-opencode-build
description: Ordens do usuário sobre fork, dev externo (opencode, nunca goose) e wrapper de build do FreeLLMAPI
metadata:
  type: feedback
---

**Regra 1 — a base é o fork `FabioLeitao/freellmapi`; o destino dos patches é o upstream `tashfeenahmed/freellmapi`, só por PR aberto pelo PM com o "vai" do usuário.** Todo `gh` de escrita leva `--repo` explícito (fork por padrão; upstream só para abrir PR de patch). Branch de patch nasce de `upstream/main`, uma mudança por PR, sem arquivos de gerência. Push só para `origin`. O `gh repo set-default` da pasta está no fork.

**Why:** primeiro o usuário ordenou "nada vai ao upstream" (o goose confundira o fork com o upstream); em 2026-11-23 ele reverteu, pelo chat: "Sim, como owl recomendou. Seguindo solicitação do upstream" (P4). O motivo do upstream é o `CONTRIBUTING.md` de lá (teste, `npm test`, uma mudança por PR, nada pago, migração em arquivo novo, `check:i18n`, nenhum limite inventado).

**How to apply:** conferir o destino antes de todo `gh pr create`/`gh issue create`; nenhum agente abre nada no upstream sem o "vai"; repetir a regra na nota de passagem a qualquer dev externo.

**Regra 2 — dev externo é o opencode, com as skills `operar-dev-externo` e `operar-opencode` (TUI no herdr). O goose não entra neste projeto.** O opencode trabalha numa issue e leva o PR dos patches locais ao fork. **Sempre validar:** pré-checagem, CI, revisor e só então o merge.

**Why:** ordem direta do usuário em 2026-11-23 ("o goose... nao recomendo... usar o opencode... sempre importante validar"). Depois: "Quero q tente opencode como dev extern, poupe claude code token" — o opencode codifica todas as tarefas de dev, em teste.

**How to apply:** nunca sugerir nem liberar tarefa para o goose, mesmo havendo a skill `operar-goose`. Só o usuário muda a linha `Dev externo:` do `docs/operacao.md`.

**Regra 3 — build que carrega os nossos patches usa `freellmapi-databoar-build`,** que marca a versão como `<tag do upstream>-<commits>-g<sha>` (mesmo padrão do `zero-databoar-build`). Defeitos conhecidos (F0.5): o servidor lê `FREEAPI_VERSION` em tempo de execução e o wrapper só a exporta no build; o wrapper compila o checkout atual e usa `--ref` só para o texto da versão.

**Why:** o usuário quer a versão marcada com os patches locais, como já faz no harness zero.

**How to apply:** o `builder-senior` e qualquer build usam o wrapper; não alterar o wrapper (é do usuário), descrever o defeito a ele.
