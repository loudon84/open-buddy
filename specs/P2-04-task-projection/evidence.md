# Evidence: P2-04

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P2-04.test.ts` — exit 0, 1 passed.

## Result

A repeated event id left the title empty and the terminal `completed`. A later business event set the title and kept that terminal. The restored seq list was `[1, 2]`. A drive path was rejected. Another tenant and a revoked grant could not resolve `artifact://art-1`.
