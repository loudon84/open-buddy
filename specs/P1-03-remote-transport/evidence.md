# Evidence: P1-03

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P1-03.test.ts` — exit 0, 2 passed.
- `node node_modules/typescript/bin/tsc --noEmit -p packages/runtime/openbuddy-hermes-client/tsconfig.json` — exit 0.

## Fixture vs real

- Fixture gateway on 127.0.0.1. Major `2.0` rejected. Two concurrent 401s caused one refresh. 403 did not refresh. 429 with `Retry-After: 0` slept 0ms and then returned 200.
- Logs did not contain `super-secret-token`.
- Real Hermes was not required for this transport check.
