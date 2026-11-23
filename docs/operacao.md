# Modo de operação

Modo: autônomo
Desde: 2026-11-23
Decidido por: padrão do framework; o usuário pediu o fluxo completo em 2026-11-23
Paradas adiadas: nenhuma
Proteção do main: pendente (o `main` está vermelho desde c1c07bb; aplicar no primeiro CI verde, tarefa F0.3)
CI do GitHub: disponível (os jobs rodam; a falha atual é de teste, em "Check migration round trip")
Dev externo: opencode, em todas as tarefas de dev (backend e ux), **em teste** (decidido pelo usuário em 2026-11-23, para poupar tokens do Claude Code). Os devs do framework (`backend-dev-senior` e `frontend-dev-senior`) não são chamados. Skills `operar-opencode` e `operar-dev-externo` (TUI num painel do herdr). O goose NÃO é usado.
Duelo: nenhum
Pré-voo: modo=desligado (sem builder)

## Repositório (ordem do usuário, 2026-11-23)

- O repositório do projeto é o **fork** `FabioLeitao/freellmapi`. O `upstream` (`tashfeenahmed/freellmapi`) só serve para trazer mudanças para o fork; **nada deste projeto vai para ele**.
- O `gh` desta pasta já tem o fork como padrão (`gh repo set-default FabioLeitao/freellmapi`). Mesmo assim, todo comando de escrita leva `--repo FabioLeitao/freellmapi`, e todo PR leva `--base main`. Num fork, o `gh pr create` pode escolher o upstream como destino: nunca confie no padrão.
- Todo PR é aberto pronto (nunca draft) e confere, antes de abrir, que o destino é o fork.
- Push só para `origin`. Nunca `git push upstream`.

## Dev externo (opencode)

- **Decisão (usuário, 2026-11-23):** o opencode codifica todas as tarefas de dev, como teste. Se o teste não render (a parada de duas rodadas de correção do dev externo, ou um defeito que só a conferência pega duas vezes), o PM leva ao usuário a decisão de voltar ao dev do framework. Arquiteto, QA e revisor continuam sendo agentes do Claude Code (o revisor precisa ser outro modelo que o dev).
- **Forma da tarefa:** o opencode só recebe um **passo mecânico, depois do desenho e dos testes do QA mesclados**: 1 a 2 arquivos, método ou trecho nomeado, cerca de 20 linhas de diff, teste que já falha. Tarefa que descobre fatos (F0.1, a causa do round trip; M1.1, a reprodução do 429; M3.3; M3.4) é diagnosticada pelo arquiteto no desenho, que a quebra em passos mecânicos; o opencode no `auto` inventa fatos.
- **Modelo:** o Auto do FreeLLMAPI primeiro (a config já traz `freellmapi/auto`); só se fixa um modelo depois de o Auto falhar na tarefa, e o evento registra o motivo e as tentativas.
- **Como roda:** TUI num painel novo do herdr, nunca `opencode run`; branch da tarefa no clone limpo (sem worktree destacado); ref `backup/pre-<tarefa>` antes de começar; brief em inglês, inline, de cerca de 16 linhas; o contrato já vem da config do opencode. Segue as skills `operar-dev-externo` e `operar-opencode`.
- **O que o opencode nunca faz:** commit, push, `gh`, rede, instalar pacote, ler chave ou `.env`. **Commit e PR são do PM.**
- **Conferência determinística do PM em todo passo,** sem acreditar no "feito": arquivos tocados contra a lista, remoções fora do escopo (`git diff -U0 | grep '^-'` zero), `git reflog`, o teste vermelho antes do verde e a prova inteira rodada pelo PM, não só o teste novo.
- **Cuidado próprio deste projeto:** o opencode usa o servidor local deste mesmo projeto (`127.0.0.1:3001`) como provedor. Nenhuma tarefa derruba, reinicia nem reconstrói esse servidor, e nenhum teste ou migração toca o banco real (`freeapi.db`): só banco de teste descartável.
- **PR:** só depois do CI local verde no SHA exato (os passos do `ci.yml`: `npm ci`, lint, testes, build e o round trip das migrações) e do "vai" do usuário, que é regra dele. Sempre `--repo FabioLeitao/freellmapi --base main`, pronto (nunca draft).
- **Validação antes do merge:** pré-checagem, CI e revisor, como em qualquer PR. O revisor roda no Claude Code, nunca na sessão do opencode.

## Ritual de fechamento de épico (fixado pelo usuário em 2026-11-23, FabioLeitao/projectAgents#104)

Vale para todos os repos. Aqui ele se aplica assim, **de forma provisória** (a própria #104 diz que o desenho para repo sem `check-all` ainda não existe):

1. **Uma épica por vez:** nenhuma épica nova enquanto a anterior tem bloqueante aberto. A PR #6 é a primeira a passar pelo ritual.
2. **Três revisões antes do merge:** `revisor-senior` (texto fixo), `cyber-senior` (texto fixo, pelo KP; se o KP ou o cyber falharem, corrige-se o KP ou o cyber, nunca se pula) e o adversarial pelo Hermes (`hermes-review-pr <PR> --scope ...`, TUI no herdr, só leitura).
3. **Antes de qualquer push para o CI do GitHub:** este repo **não tem** `scripts/check-all.sh`. Até o usuário decidir criar um, vale o equivalente local: os passos do `ci.yml` no SHA exato (`npm ci`, lint, testes, build e o round trip das migrações). O pré-voo no Buildbot está **desligado: o repo não tem builder** (linha `Pré-voo:` acima). Pedir um builder é decisão do usuário.
4. **CI do GitHub verde.** O espelho do GitLab não existe neste fork: não se aplica.
5. **Merge só pelo `merge-green FabioLeitao/freellmapi#<n>`,** que pergunta ao usuário (HITL) e só mescla se o PR continua limpo e com o mesmo head. O PM **não** roda `gh pr merge` neste repo. O resto do modo autônomo continua valendo.

## Build

- Todo build do projeto que carrega os nossos patches usa o wrapper `freellmapi-databoar-build` (`~/.local/bin`), que marca a versão como `<tag do upstream>-<commits>-g<sha>`, no mesmo padrão do `zero-databoar-build`. Sem o wrapper, o build não vale como versão.
- Limites conhecidos do wrapper, a corrigir antes de confiar na marca (tarefa F0.5): o `FREEAPI_VERSION` só é lido pelo servidor em tempo de execução e o wrapper só o exporta durante o build; e ele compila o checkout atual, não o `--ref` que recebe.
- Releases com imagens Docker e pacote (`builder-senior`) **não** são geradas por padrão neste projeto, até o usuário pedir (pergunta ao usuário, no relato da rodada 1).
