# Evidence: P3-04

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P3-04.test.ts` — exit 0.

## Fixture

Missing capability and a null runtime were refused. A root user and `/host/etc/passwd` were refused. The runner source does not mention `worker_threads` or `node:vm`.

## Real

No container daemon ran. This task is `done-fixture`.
