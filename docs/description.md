# Descrição do projeto

## Projeto

**FreeLLMAPI (fork local do Fabio).** O FreeLLMAPI é um agregador local-first dos planos gratuitos de dezenas de provedores de LLM, atrás de um único endpoint `/v1` compatível com OpenAI. Guarda as chaves cifradas, escolhe o melhor modelo disponível a cada requisição (roteador `auto`), passa para o próximo provedor quando um atinge o limite e acompanha o uso por chave.

- **Repositório de trabalho:** `FabioLeitao/freellmapi` (fork público de `tashfeenahmed/freellmapi`). Nada daqui vai para o upstream.
- **Stack observada:** monorepo TypeScript/Node (`shared`, `server`, `client`, `cli`, `desktop`), SQLite (`better-sqlite3`), painel em React/Vite, testes com vitest, CI com matriz Node 20/22/24 e imagem Docker.
- **Cliente (product owner):** Fabio Tavares Leitao, que também é o usuário do time.

## Origem desta descrição

Não houve um briefing do cliente. Esta descrição foi **levantada pelo gerente de projetos em 2026-11-23** a partir do que já existe: as issues #1 a #4 do fork, a PR #6, os commits locais e o `CONTRIBUTING.md`. O cliente confirma ou corrige pelo formulário da rodada 1 (`docs/perguntas-cliente-r1-2026-11-23.pdf`).

## O que o cliente pediu até agora

1. **Diagnosticar o 429 enganoso (issues #2, #3 e #4).** Quando o histórico do chat tem imagens (inclusive o histórico reinjetado por handoff de memória) e nenhum modelo com visão está habilitado, o sistema devolve 429 em vez de 422 `no_vision_model`. O operador perde tempo olhando cota. Espera-se: 422 claro, cabeçalhos de diagnóstico (`X-Fallback-Attempts`, `X-Fallback-Trail`), log estruturado com `execution_id` e a mesma validação no fluxo reinjetado e na cadeia MCP. As issues #2 e #3 são duplicatas uma da outra, e a #4 pede o log.
2. **Painel de chaves.** Botão para copiar a URL da requisição da API (pedido que veio do upstream, #2020), e Grok e xAI na lista de provedores (issue #5, já fechada). O Cursor como provedor ficou prometido como "próxima PR".
3. **Avaliar free tiers e critérios de admissão para o `auto` (issue #1).** Ler os termos oficiais de Kilo, Modal, xKiro, Z.ai e Moonshot; decidir se a coluna `served_model` passa a ser preenchida (hoje está vazia em todas as linhas); medir qualidade por tarefa antes de mudar qualquer prioridade; e, se o Kilo passar, criar um adaptador desligado por padrão.

4. **Devolver os patches ao upstream (decisão de 2026-11-23, P4):** o fork existe para produzir patches que voltem ao `tashfeenahmed/freellmapi` (MIT), seguindo o `CONTRIBUTING.md` de lá: um teste, `npm test` verde, uma mudança por PR, nada pago, migração só em arquivo novo e `npm run check:i18n`. O autor responde pelo diff; nenhum limite ou id de modelo pode ser inventado.

## Entrega anterior ao fluxo

- A **PR #6** ("EPiC: Multiple issue fixes", branch `feature/epic-fixes-final`, 3 commits) reúne: botão de copiar a URL, Grok e xAI na lista de plataformas (só tipos e entradas do painel, sem adaptador no servidor) e um log estruturado no `proxy.ts`. Fecha #3, #4 e #5. Está com CI vermelho, sem teste novo e com limites de provedor que não foram conferidos nos termos oficiais.
- Os commits `c1c07bb` e `a70c4e8` foram direto para o `main` do fork e o deixaram vermelho (migração de NVIDIA embeddings quebra o "Check migration round trip").

## Regras do projeto

- `CONTRIBUTING.md`: todo PR inclui teste e mantém a suíte verde; escopo de uma mudança só; **nenhum serviço pago ou que peça cartão** entra no catálogo; mudança de esquema só em arquivo de migração novo (nunca se edita uma migração aplicada); `.gitattributes` mantém LF (o hash CSP do `client/index.html` depende disso).
- Fork público e upstream público: nada de chave, custo ou informação de outros projetos em issue, commit, documento ou PR. O branch de patch não leva arquivos de gerência.
- O dev externo é o **opencode**, nunca o goose (o goose confundiu o fork com o upstream mais de uma vez). **Os patches seguem ao upstream** (P4); PRs de revisão e a documentação ficam no fork. Nenhum agente abre PR no upstream sem o "vai" do usuário (`docs/operacao.md`).
- Builds com os nossos patches passam pelo wrapper `freellmapi-databoar-build`.

## Histórico

- 2026-11-23: descrição levantada pelo gerente de projetos; usuário (Fabio) pediu a estrutura de gerência e o fluxo completo; ordens sobre fork, opencode e wrapper de build registradas em `docs/operacao.md`.
- 2026-11-23: **P4 respondida pelo usuário, no chat:** os patches seguem ao upstream (`tashfeenahmed/freellmapi`, MIT), seguindo o `CONTRIBUTING.md` de lá. Isso substitui a ordem anterior de que nada iria ao upstream. A revisão do plano e das regras vem no commit seguinte.
- 2026-11-23: **plano aprovado pelo usuário (cliente), no chat**, em resposta direta a três perguntas: aprovou o escopo #3, #4 e #5 no fork; ordem **F0.1 primeiro, sync depois**; **#5 (Grok/xAI) adiada** até a P2. Escopo imediato: F0.1 e M1 (#3 e #4). A trava do upstream continua (nada lá antes da validação local e do "vai" por PR). Para a P1, o usuário mandou seguir pela suposição: causa explícita, nunca 429 genérico.
