---
name: pontos-frageis-freellmapi
description: Pontos frágeis do fork freellmapi que pegam um desenho desprevenido (vitest it.fails, catálogo assinado, porta 3001, rotas com getDb, CI sem paths-ignore)
metadata:
  type: project
---

Notados na base (F0.2, 2026-11-23):

- **`it.fails` do vitest 5 não serve de marca de pendente:** aceita erro de `beforeEach` e `TypeError` como "falha esperada". Use o helper `pendente` (ADR-004), testado em contêiner `node:24.22.1-bookworm-slim` com `npm i vitest@^5` numa pasta descartável (o clone não tem `node_modules`).
- **Modelos não entram por migração** (ADR-003, upstream `a088fc8e`). Provedor só do fork não tem como ter modelos embutidos: o catálogo é assinado pelo upstream. Pesa em M2.2, M3.5, M4.2, F0.1.
- **Migração nova toca 3 lugares:** o arquivo, `defaults.ts` (na ordem) e a lista de constantes do `roundtrip.test.ts`.
- **Porta 3001 e `freeapi.db` são do servidor local em uso** (o dev externo o usa como provedor). Nenhum desenho manda subir o compose nem tocar o banco real.
- 18 de 31 rotas chamam `getDb()` direto: não escreva "rota nunca acessa o banco".
- `ci.yml`/`docker.yml` sem `paths-ignore`: commit de docs no `main` leva `[skip ci]`.
- A pasta do projeto costuma estar no branch de outro agente: grave pelo worktree de `origin/main` e a memória vai em `<worktree>/.claude/agent-memory/arquiteto-senior/`.

**Why:** cada item custaria uma revisão de desenho se descoberto pelo dev no meio da tarefa.
**How to apply:** conferir esta lista antes de desenhar F0.1, M1.x, M2.2, M3.5, M4.2 e qualquer tarefa com aceitação.
