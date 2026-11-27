# Memória do qa-senior — freellmapi (fork)

- Estrutura de aceitação (ADR-004/008, `docs/arquitetura.md`): vitest, testes
  `server/src/__tests__/routes/<tema>.acceptance.test.ts`, marca estrita
  `pendente(name, fn)` de `server/src/__tests__/helpers/pendente.ts` (só aceita
  `AssertionError`; `it.fails` não serve). O dev troca `pendente(` por `it(` e
  apaga o helper no último commit.
- Caixa-preta: preparar com `initDb(':memory:')`, `encrypt`, `setCooldown`,
  `setMonthlyBudgetCaps`, `mintDashboardToken()`; ler o log **só** por
  `GET /api/logs?event=<event>` com token do painel, nunca importar o logger.
  Limpar estado com `resetServerLogsForTest()` + `initServerLogs()` no `fresh()`.
- Nada de Docker nem servidor local: ADR-005 roda os testes no Node do host,
  em porta efêmera em `127.0.0.1`, nunca `:3001`.
- **Node:** o `node` padrão do host é v20 e o `better-sqlite3` instalado foi
  compilado para Node 24 (`NODE_MODULE_VERSION 137`). Usar
  `export PATH="$HOME/.nvm/versions/node/v24.22.2/bin:$PATH"` antes de rodar
  vitest; com Node 20 os testes falham em `initDb` (não é falha do teste).
- Comando de um arquivo: `npm --prefix server test -- src/__tests__/routes/<arquivo>.test.ts`.
- Gate local (sem `check-all.sh`, equivalente do `ci.yml`): `npm ci`,
  `npm run test:migrations`, `npm test`, `npm run lint`, `npm run build`.
- Divergência descoberta em M1.2 (2026-11-27): o desenho M1.1/M1.2 pede a causa
  `no_vision_key` (429), mas a implementação entregue no `main` (upstream #2118)
  removeu essa causa como código morto e devolve 422 `no_vision_model` sem
  `error.cause`/header nesse caso. AM1.2-2 lê a causa observável da resposta
  (`error.cause ?? error.code ?? X-Block-Cause`) em vez de fixar `no_vision_key`.
  Decisão pendente do arquiteto sobre o item AM1.2-2.
