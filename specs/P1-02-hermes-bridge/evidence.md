# Evidence: P1-02

## Commands

- `corepack pnpm exec vitest run tests/enterprise/P1-02.test.ts` — exit 0, 1 passed.

## Fixture vs real

- Fixture: loopback upstream HTTP servers. The gateway stored their session id `sess-a`, run id `run-a`, and status `idle`. A second instance returned `sess-b`. The unregistered URL received no requests. Cross-tenant register and session read returned 404. Restarting the gateway from the same route file still returned the session.
- Real Hermes (D03): not probed. This task is `done-fixture`.

## Limits

- Route rows are JSON with the columns in `migrations/001_routes.sql`. `node:sqlite` failed to load under Vitest (`Failed to load url sqlite`).
- The verifier is injected. OIDC token checks are not this task.
