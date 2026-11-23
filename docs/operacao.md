# Modo de operação

Modo: autônomo
Desde: 2026-11-23
Decidido por: padrão do framework; o usuário pediu o fluxo completo em 2026-11-23
Paradas adiadas: nenhuma
Proteção do main: pendente (o `main` está vermelho desde c1c07bb; aplicar no primeiro CI verde, tarefa F0.3)
CI do GitHub: disponível (os jobs rodam; a falha atual é de teste, em "Check migration round trip")
Dev externo: opencode, só nas tarefas que o usuário designar (skill `operar-opencode`, TUI num painel do herdr). O goose NÃO é usado neste projeto (ordem do usuário, 2026-11-23).
Duelo: nenhum

## Repositório (ordem do usuário, 2026-11-23)

- O repositório do projeto é o **fork** `FabioLeitao/freellmapi`. O `upstream` (`tashfeenahmed/freellmapi`) só serve para trazer mudanças para o fork; **nada deste projeto vai para ele**.
- O `gh` desta pasta já tem o fork como padrão (`gh repo set-default FabioLeitao/freellmapi`). Mesmo assim, todo comando de escrita leva `--repo FabioLeitao/freellmapi`, e todo PR leva `--base main`. Num fork, o `gh pr create` pode escolher o upstream como destino: nunca confie no padrão.
- Todo PR é aberto pronto (nunca draft) e confere, antes de abrir, que o destino é o fork.
- Push só para `origin`. Nunca `git push upstream`.

## Dev externo (opencode)

- O opencode trabalha numa issue do fork, num branch e num worktree próprios, e leva ao fork o PR dos patches locais.
- Segue a skill `operar-dev-externo` e a `operar-opencode`: TUI num painel do herdr, nunca `opencode run`.
- **Todo PR do opencode é validado como o de qualquer dev:** pré-checagem, CI (GitHub, ou o local, se for o caso), revisor e só então o merge. Nada é mesclado só porque o dev externo disse que está pronto.

## Build

- Todo build do projeto que carrega os nossos patches usa o wrapper `freellmapi-databoar-build` (`~/.local/bin`), que marca a versão como `<tag do upstream>-<commits>-g<sha>`, no mesmo padrão do `zero-databoar-build`. Sem o wrapper, o build não vale como versão.
- Limites conhecidos do wrapper, a corrigir antes de confiar na marca (tarefa F0.5): o `FREEAPI_VERSION` só é lido pelo servidor em tempo de execução e o wrapper só o exporta durante o build; e ele compila o checkout atual, não o `--ref` que recebe.
- Releases com imagens Docker e pacote (`builder-senior`) **não** são geradas por padrão neste projeto, até o usuário pedir (pergunta ao usuário, no relato da rodada 1).
