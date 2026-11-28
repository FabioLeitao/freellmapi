# Fork FreeLLMAPI (FabioLeitao)

Notas do fork que não existem no upstream e nunca entram em branch de patch (`docs/operacao.md`,
ADR-001, ADR-017). O `README.md` da raiz é do upstream e não é editado aqui.

## Como ler por cliente nos logs do roteador

As linhas de rastreio do roteador (`traceRouteEvent`, `server/src/routes/proxy.ts`) têm este formato:

```
[Proxy] 20:41:03 start client=opencode a0 z-ai/glm-5.3-flash - z-ai/glm-5.3-flash req=auto
```

`client=<agent>` é o classificador de `server/src/lib/client-classifier.ts`, lido do `User-Agent` e de
cabeçalhos estáveis. Ele aparece uma vez por linha, nos eventos `start`, `next`, `ok` e `fail`, nos scopes
`Proxy` e `Responses`. O valor é sempre um enum curto (`opencode`, `deepseek-harness`, `hermes-agent`,
`cursor`, `zero`, `unknown`, …): **o User-Agent cru, o IP e qualquer e-mail não são gravados**. Sem
contexto de request, ou com `REQUEST_ANALYTICS_LOG_CLIENT=false`, o valor é `client=unknown`.

Leitura somente (não troca o serviço, não escreve no banco):

```bash
podman logs freellmapi_freellmapi_1 | grep 'client=opencode'
podman logs freellmapi_freellmapi_1 | grep 'client=hermes-agent'
# dsh-tui é classificado como deepseek-harness:
podman logs freellmapi_freellmapi_1 | grep 'client=deepseek-harness'
```

Para separar a mesma requisição, use o id curto que vem depois do evento (as duas linhas `start` e
`fail` de uma requisição compartilham o mesmo id).

### Por que o `client_agent` "sumiu"

Em 24/nov/2026 não deu para separar os harnesses pelas linhas do roteador. O que o histórico do clone
prova (2026-11-27):

- As linhas do roteador vêm de `traceRouteEvent`. `git log --all -S'client_agent='` e
  `git log --all -S'client=' -- server/src/routes/proxy.ts server/src/routes/responses.ts` não retornam
  nenhum commit: **o campo de cliente nunca esteve nessas linhas no código canônico**. Não foi uma
  regressão de um arquivo do upstream.
- O que sempre existiu é a coluna `requests.client_agent`, escrita por `logRequest()`
  (`server/src/lib/request-log.ts`) a partir de `getClientContext()`. O middleware
  `clientContextMiddleware` está montado em `server/src/app.ts` e o classificador já reconhece os
  harnesses usados. Ou seja: o dado era classificado e gravado no banco, nunca impresso na linha.
- A observação de 23/nov (`client_agent=deepseek-harness` em linhas do roteador) só pode vir de um build
  local com patch fora do histórico canônico — a imagem de dogfooding
  `up-8fcdb90e.databoar-01474fe1.zeroclassifier`, cujo merge `01474fe1` está solto (só pelo reflog).
  Não há como provar o conteúdo exato daquele merge sem inspecionar o contêiner em uso, o que nenhuma
  tarefa faz sem ordem do operador.

A tarefa M1.6 (#30) acrescenta `client=` a `traceRouteEvent` no código canônico, para que qualquer build
feito do `main`/upstream mostre o cliente. Este arquivo é o registro local do diagnóstico e do modo de
leitura; ele não vai ao upstream.
