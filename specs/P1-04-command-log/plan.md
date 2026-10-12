# Plan: P1-04

## Files

- New: `services/hermes-agent-gateway/src/command-log.ts` and the idempotency, event-log, approval, and cancellation entry points.
- Updated: `services/hermes-agent-gateway/src/server.ts` message route.
- New: `tests/enterprise/P1-04.test.ts`

## Rollback

Delete the command log file beside the route file. Existing Pi sessions are untouched.
