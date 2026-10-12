# Evidence: P0-04

- **Status proposed**: done
- **Environment**: Node.js contract check. No server. Vitest is not installed.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `node scripts/architecture/check-runtime-contract.mjs` | `runtime contract ok` | Exit 0 |
| `pnpm exec vitest run tests/enterprise/P0-04.test.ts` | not run | Same function; dependencies are not installed |
| `pnpm typecheck` | not run | `node_modules` is absent. P0-06 records that baseline |

## Acceptance

| Criterion | Evidence | Real or fixture |
| --- | --- | --- |
| Methods map to endpoints | 12 map rows; disconnect has a null path | fixture |
| Cancel, approval, errors, idempotency, schema version | OpenAPI and events.schema.json | fixture |
| Cross-tenant read is rejected | 404 NOT_FOUND fixture | fixture |
| Draft `/api` paths are absent | Checker | fixture |

## Limits

- No gateway implementation and no upstream call.
- Moon and tsconfig project references for the new package are P0-06.
- Adding `executeTool` and `queryStatus` extends the REQ-R02 code block so it matches REQ-G03.

## Rollback

- Revert this commit. No persisted sessions.
