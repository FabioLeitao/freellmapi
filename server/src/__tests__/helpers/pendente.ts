import { it } from 'vitest';

/**
 * Marca de pendente estrita (ADR-004 / ADR-008).
 *
 * Roda o corpo num `it` comum e só aceita AssertionError:
 * - falha de asserção (o comportamento ainda não existe) → verde, pendente;
 * - teste que passa → vermelho, o dev deve trocar `pendente(` por `it(`;
 * - qualquer outro erro (preparação, tipo, rede) → vermelho.
 */
export function pendente(name: string, fn: () => unknown | Promise<unknown>) {
  it(`[pendente] ${name}`, async () => {
    let err: unknown;
    try { await fn(); } catch (e) { err = e; }
    if (err === undefined) throw new Error(`pendente passou: tire a marca de "${name}"`);
    if ((err as Error)?.name !== 'AssertionError') throw err;
  });
}
