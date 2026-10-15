# Plan: P1-02

## Files

- New: `services/hermes-agent-gateway/src/server.ts`
- New: `services/hermes-agent-gateway/src/session-store.ts`
- New: `services/hermes-agent-gateway/src/upstream-adapter.ts`
- New: `services/hermes-agent-gateway/migrations/001_routes.sql`
- New: `tests/enterprise/P1-02.test.ts`

## Steps

1. Failing HTTP test with two upstreams and one unused URL.
2. Implement the server and file-backed routes.
3. Re-run the test.

## Rollback

Stop the process and delete the route file. No production deploy.
