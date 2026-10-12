# Evidence: P1-07

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/gateway-faults.test.ts tests/enterprise/P1-02.test.ts` — exit 0.

## Fixture

Upstream HTTP 500 on create returned 502 `UPSTREAM_UNAVAILABLE`. The earlier routing test still passed with 201 responses.

## Real

D03 was not probed. See `docs/architecture/runtime-acceptance.md`. This task is `done-fixture`.
