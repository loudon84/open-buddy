# Evidence: P2-06

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P2-06.test.ts` — exit 0.

## Result

The stored audit line omitted the token, cookie, and body. A session grant could not read it. Legal hold and unsigned physical delete stayed blocked. Archive cleared the index and cache. Reconcile reported the missing id `a`.

## Limits

D02 is not signed. Physical delete remains blocked.
