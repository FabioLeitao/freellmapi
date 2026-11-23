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

## Repositório e destino dos patches (ordens do usuário, 2026-11-23)

- A base de trabalho é o fork `FabioLeitao/freellmapi`. **O destino dos patches é o upstream** `tashfeenahmed/freellmapi` (MIT), seguindo o `CONTRIBUTING.md` de lá (decisão do usuário, no chat, em 2026-11-23; ela substitui a ordem anterior de que nada iria ao upstream).
- O `gh` desta pasta tem o fork como padrão. Todo comando de escrita leva `--repo` explícito: `FabioLeitao/freellmapi` para issues, PRs de revisão e documentação; `tashfeenahmed/freellmapi` **só** para abrir um PR de patch, e **só com o "vai" do usuário para aquele PR**. Nenhum agente (o opencode inclusive) abre PR, issue ou comentário no upstream.
- **O branch de patch nasce de `upstream/main`** (depois de sincronizar o fork, tarefa F0.6), nunca do `main` do fork. Ele não leva `docs/operacao.md`, `docs/plano.md`, `docs/custos.md`, PDFs nem `.claude/agent-memory/`.
- **Regras do upstream em todo PR:** um teste e o `npm test` verde; `.editorconfig` e tsconfig; **uma mudança por PR**; nada de serviço pago ou que peça cartão; migração só como arquivo novo em `server/src/db/migrations/`, sem editar migração já aplicada; no `client/`, `npm run check:i18n`. Ajuda de IA é aceita, mas o autor responde pelo diff: nada reformatado fora da mudança, nenhum limite, id de modelo ou endpoint inventado (tudo conferido no provedor) e testes que exercitam a mudança de verdade. Não é preciso declarar a ajuda de IA.
- **Fluxo de um patch** (provisório; o arquiteto o fixa em F0.7): (1) branch de `upstream/main`; (2) gate local no SHA exato (`npm ci`, `npm test`, `npm run build`, `npm run check:i18n`, round trip das migrações); (3) PR de revisão no fork, contra o `main` do fork, que **não é mesclado**: nele rodam o revisor, o cyber (KP) e o adversarial (Hermes); (4) com as revisões e o CI verdes e o "vai" do usuário, o PM abre o PR no upstream com o mesmo branch; (5) o merge no upstream é do mantenedor, então o `merge-green` não se aplica a ele; o PR de revisão no fork é fechado, e o fork recebe o patch na próxima sincronização. O que só interessa ao fork, ou o que o upstream recusar, vai por PR no fork, com `merge-green`.
- Push só para `origin`. Nunca `git push upstream`. PR sempre pronto (nunca draft).

## Dev externo (opencode)

- **Decisão (usuário, 2026-11-23):** o opencode codifica todas as tarefas de dev, como teste. Se o teste não render (a parada de duas rodadas de correção do dev externo, ou um defeito que só a conferência pega duas vezes), o PM leva ao usuário a decisão de voltar ao dev do framework. Arquiteto, QA e revisor continuam sendo agentes do Claude Code (o revisor precisa ser outro modelo que o dev).
- **Forma da tarefa:** o opencode só recebe um **passo mecânico, depois do desenho e dos testes do QA mesclados**: 1 a 2 arquivos, método ou trecho nomeado, cerca de 20 linhas de diff, teste que já falha. Tarefa que descobre fatos (F0.1, a causa do round trip; M1.1, a reprodução do 429; M3.3; M3.4) é diagnosticada pelo arquiteto no desenho, que a quebra em passos mecânicos; o opencode no `auto` inventa fatos.
- **Modelo:** o Auto do FreeLLMAPI primeiro (a config já traz `freellmapi/auto`); só se fixa um modelo depois de o Auto falhar na tarefa, e o evento registra o motivo e as tentativas.
- **Como roda:** TUI num painel novo do herdr, nunca `opencode run`; branch da tarefa no clone limpo (sem worktree destacado); ref `backup/pre-<tarefa>` antes de começar; brief em inglês, inline, de cerca de 16 linhas; o contrato já vem da config do opencode. Segue as skills `operar-dev-externo` e `operar-opencode`.
- **O que o opencode nunca faz:** commit, push, `gh`, rede, instalar pacote, ler chave ou `.env`. **Commit e PR são do PM.**
- **Conferência determinística do PM em todo passo,** sem acreditar no "feito": arquivos tocados contra a lista, remoções fora do escopo (`git diff -U0 | grep '^-'` zero), `git reflog`, o teste vermelho antes do verde e a prova inteira rodada pelo PM, não só o teste novo.
- **Cuidado próprio deste projeto:** o opencode usa o servidor local deste mesmo projeto (`127.0.0.1:3001`) como provedor. Nenhuma tarefa derruba, reinicia nem reconstrói esse servidor, e nenhum teste ou migração toca o banco real (`freeapi.db`): só banco de teste descartável.
- **PR:** o opencode nunca abre PR; o PM abre, pelo fluxo de patch acima, só depois do gate local verde no SHA exato e do "vai" do usuário, que é regra dele.
- **Validação antes do merge:** pré-checagem, CI e revisor, como em qualquer PR. O revisor roda no Claude Code, nunca na sessão do opencode.

## Ritual de fechamento de épico (fixado pelo usuário em 2026-11-23, FabioLeitao/projectAgents#104)

Vale para todos os repos. Aqui ele se aplica assim, **de forma provisória** (a própria #104 diz que o desenho para repo sem `check-all` ainda não existe):

1. **Uma épica por vez:** nenhuma épica nova enquanto a anterior tem bloqueante aberto. A PR #6 é a primeira a passar pelo ritual.
2. **Três revisões antes do merge:** `revisor-senior` (texto fixo), `cyber-senior` (texto fixo, pelo KP; se o KP ou o cyber falharem, corrige-se o KP ou o cyber, nunca se pula) e o adversarial pelo Hermes (`hermes-review-pr <PR> --scope ...`, TUI no herdr, só leitura).
3. **Antes de qualquer push para o CI do GitHub:** este repo **não tem** `scripts/check-all.sh`. Até o usuário decidir criar um, vale o equivalente local: os passos do `ci.yml` no SHA exato (`npm ci`, lint, testes, build e o round trip das migrações). O pré-voo no Buildbot está **desligado: o repo não tem builder** (linha `Pré-voo:` acima). Pedir um builder é decisão do usuário.
4. **CI do GitHub verde.** O espelho do GitLab não existe neste fork: não se aplica.
5. **Merge só pelo `merge-green FabioLeitao/freellmapi#<n>`** (vale para PR no fork; PR no upstream é mesclado pelo mantenedor), que pergunta ao usuário (HITL) e só mescla se o PR continua limpo e com o mesmo head. O PM **não** roda `gh pr merge` neste repo. O resto do modo autônomo continua valendo.

## Build

- Todo build do projeto que carrega os nossos patches usa o wrapper `freellmapi-databoar-build` (`~/.local/bin`), que marca a versão como `<tag do upstream>-<commits>-g<sha>`, no mesmo padrão do `zero-databoar-build`. Sem o wrapper, o build não vale como versão.
- Limites conhecidos do wrapper, a corrigir antes de confiar na marca (tarefa F0.5): o `FREEAPI_VERSION` só é lido pelo servidor em tempo de execução e o wrapper só o exporta durante o build; e ele compila o checkout atual, não o `--ref` que recebe.
- **Nenhum build do `main` do fork é implantado no `:3001` antes de F0.1:** a imagem atual tem 52 migrações e o `main` tem a migração NVIDIA, que será refeita. O `:3001` é um contêiner podman; só o usuário o troca.
- Releases com imagens Docker e pacote (`builder-senior`) **não** são geradas por padrão neste projeto, até o usuário pedir (pergunta ao usuário, no relato da rodada 1).
