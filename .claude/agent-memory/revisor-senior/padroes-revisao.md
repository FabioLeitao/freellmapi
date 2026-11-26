---
name: padroes-revisao-freellmapi
description: Padrões de erro e convenções vistos nas revisões do fork freellmapi (PRs de patch ao upstream, M1.x)
metadata:
  type: project
---

- **PR de revisão de patch** (branch de `upstream/main`, base `main` do fork) sempre conflita com o `main` e por isso **não tem CI** (`ci.yml` só roda em PR mesclável para o `main`). Nunca pedir `git merge origin/main` nesses PRs: o `docs/operacao.md` proíbe arquivos do fork no branch de patch. A falta de CI é um bloqueante do fluxo (PM e usuário), não do autor.
  **Why:** a `prechecagem.py` e o `ci_local.py` supõem um PR mesclável e mandam fazer o merge.
  **How to apply:** ignore o item de conflito da pré-checagem e exija `CI local:` no head, sem combinar com o `main`.
- **Prontidão para o upstream:** o helper `pendente.ts` tem de sair no último commit (ADR-008). Comentários e nomes de teste vão em inglês, sem referências do fork (`#3` do fork, ADR, M1.x) nem a linha `cherry picked from` (ADR-001).
- **Testes de rota do desenho:** a aceitação costuma cobrir só parte deles. Confira um a um os DM de rota, em especial se as asserções de `code`, `Retry-After` e status ficaram inalterados.
- **Dev externo (opencode):** costuma juntar testes e código num commit só. Peça a seção "Desvios do processo" e a prova do vermelho.
- **Desenho com regra contradita por um item DM:** o dev muda a assinatura para fazer o teste passar. Aponte o desvio não declarado e mande o desenho para o arquiteto.
- **Ambiente:** worktree e cópia do repositório são proibidos pelo operador. Sem uma janela no clone canônico, revise por leitura e declare "nada rodado; gate não conferido".
