---
name: feedback-sem-force-push
description: O operador odeia git push --force; preferir PR e branch novo; force push só com ordem explícita para aquela operação
metadata:
  type: feedback
---

Não use `git push --force` (nem `--force-with-lease`) por iniciativa própria. O caminho padrão é um branch novo com PR. Força só quando o operador mandar, de forma explícita, para aquela operação.

**Why:** o operador, em 26/nov/2026, depois do force push que trocou o `main` do fork na F0.6, disse: "odeio --force no push... na maioria dos meus repos é branch protection pra isso". O "vai" dele foi lido como liberação para o force push, e ele esperava um PR.

**How to apply:** antes de qualquer reescrita de branch remoto, pergunte e mostre a alternativa por PR, com o custo de cada uma. Num PR próprio no upstream, prefira empilhar commits ou abrir um PR novo a forçar o push, salvo ordem.
