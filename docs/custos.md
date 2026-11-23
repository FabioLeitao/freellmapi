# Custos do projeto

Histórico de custo do time por rodada, para a auditoria interna. Os valores vêm do script `custos.py` da skill `auditar-projeto` e são **estimativas pelos preços da API**: num plano por assinatura, leia-os como proporção do limite de uso. Cada rodada também tem um evento `custo` na issue `[registro] Eventos do projeto` (#7).

## Resumo

| Rodada | Início (UTC) | Total (US$) | Mesclado na rodada |
|---|---|---|---|
| 1 | 2026-11-23T22:47 | 1,67 | nenhum |
| 2 | 2026-11-23T22:53 | 2,70 | nenhum |
| **Acumulado** | | **4,37** | |

## Rodada 1, desde 2026-11-23T22:47

- **Total:** US$ 1,67.
- **Por agente:** project-manager 1,67.
- **Por tarefa:** coordenação 1,67.
- **Entregas:** estrutura de gerência (`docs/operacao.md`, `docs/description.md`, `docs/plano.md`), visão e formulário r1 (PDFs), memória do PM, rótulos do fluxo e a issue de registro (#7). Nenhuma tarefa publicada nem mesclada.
- **O que chamou a atenção:** `main` vermelho desde `c1c07bb`; a PR #6 herda a falha e traz Grok/xAI sem adaptador no servidor; o wrapper de build não leva a marca de versão ao runtime (F0.5).

## Rodada 2, desde 2026-11-23T22:53

- **Total:** US$ 2,70.
- **Por agente:** project-manager 2,70.
- **Por tarefa:** coordenação 2,70.
- **Entregas:** opencode como dev externo; ritual de fechamento de épico (projectAgents#104); P4 respondida (patches seguem ao upstream) com revisão do plano, das regras e dos PDFs (formulário r2 substitui o r1). Nenhuma tarefa publicada nem mesclada.
- **O que chamou a atenção:** o `main` vermelho parece vir da migração local de `c1c07bb`, e não da defasagem do upstream (a confirmar em F0.1); a rodada ficou toda no project-manager, sem agente de execução.
