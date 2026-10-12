# Evidence: P1-08

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P1-08.test.ts` — exit 0.

## Fixture

Readiness failed closed for a down database and a down upstream. TLS, rate limit, and secret ref checks passed. A restored command log replayed `run-1` with the same seq. Rollback left `remote-hermes:inst-a` in place and selected `local-pi` for the next session. The staging smoke script exited 2.

## Real

No deployment ran. D11 hardware was not measured. This task is `done-fixture`.
