---
name: pontos-frageis-freellmapi
description: Pontos frágeis do fork freellmapi que pegam um desenho desprevenido (vitest it.fails, catálogo assinado, porta 3001, rotas com getDb, CI sem paths-ignore, sem worktree, rodar a tabela de regras puras)
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
- **Teste de rota com chave real de provedor vai à rede:** uma chave `groq` sem cooldown fez chamada real (401) num teste descartável. Só crie chaves cujos modelos fiquem todos barrados antes do envio (cooldown, cota, ou sem visão num pedido com imagem).
- `X-Fallback-Attempts`/`X-Fallback-Trail` já existem (`setFallbackHeaders`) no 429; o plano supunha que não. Confira o código antes de aceitar a premissa de uma issue.
- **Worktree e cópia do repositório são proibidos pelo operador** (24/nov/2026), mesmo em /tmp. Docs: `git switch main` no clone canônico (árvore limpa), `merge --ff-only origin/main`, commit `[skip ci]`, push, e volte ao branch de antes. Não toque nos arquivos soltos de outros.
- **Rodar a tabela de casos antes de gravar regras puras:** a M1.1 precisou da revisão 1 porque a regra escrita ("ignorar sempre `no vision support`") contradizia o esperado do DM1.1-13, e o regex de linha inteira dava `no_vision_key` errado numa linha mista. Prototipar num `.ts` do scratchpad e rodar com `node --experimental-strip-types` (Node 24 do host), sem copiar o repo; `git show <sha>:<arquivo> | node --input-type=module-typescript` roda a implementação de um PR sem trocar de branch.
- Diagnóstico do roteador: linha de chave `"<label>: N key(s) — r:n, r:n"` (`router.ts:1807`) pode misturar motivos de configuração e de limite; o `classifyRoutingDiagLine` do upstream olha a linha inteira.

**Why:** cada item custaria uma revisão de desenho se descoberto pelo dev no meio da tarefa.
**How to apply:** conferir esta lista antes de desenhar F0.1, M1.x, M2.2, M3.5, M4.2 e qualquer tarefa com aceitação.

Notados ao desenhar F0.5, F0.10, M1.3, M1.4, M1.5 e M2.1 (2026-11-27):

- **`upstream/main` já tem a PR #2118** (`lib/block-cause.ts`, `annotateBlock` local), com taxonomia menor que a do desenho M1.1/ADR-007 (sem `no_vision_model`, `no_vision_key`, `gateway_rate_limit`), e o `attemptFamily` dele mapeia `rate_limited` para `cooldown`, não `provider_limit`. Não desenhe como se o upstream cru fosse a base dos desenhos M1.x; diga qual base vale.
- **`M2.1` já existe em parte no upstream**: botão "Copy base URL" em `provider-list.tsx` copia a URL do provedor com `setup.copyUrl`/`setup.copiedUrl` e tem teste; R4 pede a URL do gateway `<baseUrl>/chat/completions` com `keys.copyApiUrl`/`keys.copiedApiUrl`. São dois botões.
- **Wrapper `freellmapi-databoar-build` compila o `--ref` de verdade** (`git archive "$REFSHA"`): a premissa antiga de que compilava o checkout atual vinha de versão sobrescrita. Tag canônica: `up-<sha8>.databoar-<sha8>[.rótulo]`, não `<tag>-<n>-g<sha>`.
- **`module-purity.test.ts` tem lista `PURE_MODULES`:** módulo novo em `lib/` sem imports de valor (ex.: `request-group-id.ts`) tem de entrar nela ou a guarda falha. Não importar `node:crypto` nesses módulos.
- **Clone é compartilhado com outros agentes:** outro agente trocou o branch do clone no meio de uma sessão e um commit de docs caiu no branch dele. Confira `git rev-parse --abbrev-ref HEAD` imediatamente antes de cada commit/push e restaure o branch se ele não for o seu; nunca force-push no `main`.

**Why:** cada uma dessas premissas erradas custaria uma revisão de desenho ou um commit no branch errado.
