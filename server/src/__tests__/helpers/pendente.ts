import { it } from 'vitest';

/** Strict pending marker for QA acceptance tests (ADR-004, ADR-008).
 *
 * `it.fails` also swallows setup errors and TypeErrors, so a test that never
 * reached its assertion would look correctly pending. This helper accepts only
 * an AssertionError: a passing test, a broken fixture or a runtime error all
 * fail the run and force the marker to be removed or the test fixed.
 *
 * The dev removes the marker by replacing `pendente(` with `it(` when the task
 * is implemented; this file is deleted once no test uses it. */
export function pendente(name: string, fn: () => unknown | Promise<unknown>): void {
  it(`[pendente] ${name}`, async () => {
    let err: unknown;
    try {
      await fn();
    } catch (e) {
      err = e;
    }
    if (err === undefined) throw new Error(`pendente passou: tire a marca de "${name}"`);
    if ((err as Error)?.name !== 'AssertionError') throw err;
  });
}
