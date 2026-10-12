# Plan: P1-02

## Files

- New: `services/hermes-agent-gateway/src/server.ts`
- New: `services/hermes-agent-gateway/src/upstream-adapter.ts`
- New: `services/hermes-agent-gateway/src/session-store.ts`
- New: `services/hermes-agent-gateway/migrations/001_routes.sql`
- New: `tests/enterprise/P1-02.test.ts`

## Rollback

Stop the gateway process and delete its route file. Do not change desktop Pi sessions.
