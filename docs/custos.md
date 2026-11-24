# Custos do projeto

Histórico de custo do time por rodada, para a auditoria interna. Os valores vêm do script `custos.py` da skill `auditar-projeto` e são **estimativas pelos preços da API**: num plano por assinatura, leia-os como proporção do limite de uso. Cada rodada também tem um evento `custo` na issue `[registro] Eventos do projeto` (#7).

## Resumo

| Rodada | Início (UTC) | Total (US$) | Mesclado na rodada |
|---|---|---|---|
| 1 | 2026-11-23T22:47 | 1,67 | nenhum |
| 2 | 2026-11-23T22:53 | 2,70 | nenhum |
| 3 | 2026-11-23T23:41 | 1,84 | nenhum |
| 4 | 2026-11-23T23:53 | 1,03 | nenhum |
| 5 | 2026-11-23T23:59 | 0,39 | nenhum |
| **Acumulado** | | **7,63** | |

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

## Rodada 3, desde 2026-11-23T23:41

- **Total:** US$ 1,84.
- **Por agente:** project-manager 1,84.
- **Por tarefa:** coordenação 1,84.
- **Entregas:** dogfooding de F0.6 (verificação da mescla fork + upstream antes do sync): mescla sem conflito, 5 testes vermelhos todos da migração local, boot do artefato igual ao `:3001` vivo; causa de F0.1 confirmada. Nada empurrado ao `main` além da documentação.
- **O que chamou a atenção:** o `:3001` roda uma imagem que não contém os commits locais do `main` do fork; o `01474fe1` dessa imagem não está em nenhum branch do clone.

## Rodada 4, desde 2026-11-23T23:53

- **Total:** US$ 1,03.
- **Por agente:** project-manager 1,03.
- **Por tarefa:** coordenação 1,03.
- **Entregas:** complemento do dogfooding de F0.6 (cli, client, hooks, bootstrap e `check:i18n` passam); conferência do relato da sessão Owl; correção das minhas afirmações (a imagem do `:3001` não tem a migração NVIDIA, e o round trip falha por ids); trava de build do `main` do fork no `:3001`.
- **O que chamou a atenção:** o `main` público do fork carrega gerência (custos, nomes de infraestrutura local); a decisão de onde ela mora é do usuário.

## Rodada 5, desde 2026-11-23T23:59

- **Total:** US$ 0,39.
- **Por agente:** project-manager 0,39.
- **Por tarefa:** coordenação 0,39.
- **Entregas:** trava dura sobre o upstream registrada em `docs/operacao.md` e no plano (R20, T0.9), com a frase literal para o brief do dev externo.
- **O que chamou a atenção:** a ordem veio por relato da sessão Owl, não pelo usuário; registrada porque só restringe.
