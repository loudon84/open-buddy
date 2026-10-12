# Plan: P1-08

## Files

- New: `services/hermes-agent-gateway/src/operations.ts`
- New: `services/hermes-agent-gateway/deploy/README.md`
- New: `docs/architecture/runtime-runbook.md`
- New: `scripts/enterprise/runtime-smoke.mjs`
- New: `tests/enterprise/P1-08.test.ts`

## Rollback

Turn the remote flag off using `rollbackRemoteFlag`. Do not delete remote session rows.
