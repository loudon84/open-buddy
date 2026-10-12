# Evidence: P2-03

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P2-03.test.ts` — exit 0.

## Result

Self-promotion threw. A stale revision threw `DirectoryConflict` and the name stayed `Beta`. The same provision key returned the failed health-check reason instead of flipping to ready.
