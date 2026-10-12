# Plan: P1-07

## Files

- Updated: `services/hermes-agent-gateway/src/server.ts` treats upstream status >= 500 as unavailable.
- New: `tests/enterprise/gateway-faults.test.ts`
- New: `docs/architecture/runtime-acceptance.md`

## Rollback

Revert the status check. Routes from successful creates stay in the route file.
