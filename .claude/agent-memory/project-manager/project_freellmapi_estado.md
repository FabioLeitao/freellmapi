---
name: project-freellmapi-estado
description: Estado do fork freellmapi após sync com upstream 6f583db8 e build local instalado no T14
metadata:
  type: project
---

**(CHIRP)** Detalhe completo: `~/Projects/dev/obsidian-vault/lab-op/infra/CHIRP_SESSION_HANDOFF_2026-11-27_freellmapi-m11-blockcause-upstream-sync.pt_BR.md`

## Estado em 27/nov/2026 (fim da rodada)

- Fork `main` = `4af3332c` (sync com `upstream/main` `6f583db8` v0.16.49 + arquivos de controle PA + fix CI).
- **Nossos patches M1.1 block-cause estão no upstream** via PR #2118 (mergeada e refinada pelo maintainer em `873657e2`).
- T14 rodando `localhost/freellmapi:up-6f583db8.databoar-4af3332c.pa-control` (healthy). Rollback `rollback-20261127-175531`.
- Build: `FREELLMAPI_DATABOAR_LABELS=/tmp/opencode/freellmapi-pa-labels.tsv freellmapi-databoar-build --ref origin/main`.
- Issues abertas no fork: #32 (M1.1b), #33 (block-cause), #34 (PR fork), #35 (mergeada).

**Fluxo obrigatório para upstream de terceiros:** fork → issue local → PR local → build/validação → checar issues/regras deles → só então PR upstream. Não repetir o erro de 27/nov (push antes da validação local).

## Rodada 7 (27/nov, sessão opencode)

- Modo autônomo confirmado pelo `docs/operacao.md` do `origin/main`; limpeza do ambiente feita (`docker network prune -f`). Nenhum restart do `:3001` nesta sessão (contêiner up 3 h, healthy).
- PR #34 (M1.1) fechado sem merge: prechecagem devolveu ao autor (conflito com o main + Docker build vermelho no `70f54a2`) e o patch já estava no upstream via #2118 (mergeada 14:03). Issues #32/#33 fechadas como entregues.
- Arquiteto entregou 6 desenhos no `origin/main` (`14651343`..`a2c5d2be`) mais ADRs 011–016: F0.5, F0.10, M1.3, M1.4, M1.5, M2.1. Riscos: M2.1 `baixo`, os outros `padrão`.
- QA entregou PR #37 (testes de aceitação da M1.2, SHA `20d0b1b6`). Prechecagem devolveu ao autor: SHA sem checks no GitHub e `Ref:` no lugar de `Refs:` no corpo.
- Issue #30 renomeada `[M1.6]` (cliente no log); issue #36 criada `[M1.7]` (causa distinta nos 429 de `/v1/search` e `/v1/rerank`, fora do desenho M1.4/ADR-014).
- Incidente no clone compartilhado: outro agente trocou o branch no meio do desenho e o commit F0.5 caiu em `testes/M1.2-route-block-log`; o arquiteto restaurou o ponteiro, nenhum arquivo alterado. Regra reforçada: um agente por branch, nunca trocar o branch do clone com outro agente rodando.
- Decisões a aplicar no plano: corrigir T0.5 para `up-<sha8>.databoar-<sha8>[.rótulo]`; base dos patches M1.x = `upstream/main` atual (taxonomia menor da #2118); M1.5 depende de M1.2; divergência AM1.2-2 (`no_vision_key` removido pela M1.1) vai ao arquiteto.
