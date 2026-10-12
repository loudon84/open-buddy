# Evidence: P4A-01

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P4A-01.test.ts` — exit 0.

## Fixture

The frozen inventory contains `knowledge-http-provider.ts`. The facade and mock adapter are excluded. The target React dependency contains `18.3.1`.

## Real

D04 ACL, version, and delete were not probed. This task is `done-fixture`.
