# Evidence: P0-05

- **Status proposed**: done
- **Environment**: Node.js v24.21.0. No Casdoor server.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `node scripts/architecture/check-workspace-plugin-contract.mjs` | `workspace plugin contract ok` | Exit 0 |
| `pnpm typecheck` | not run | Dependencies are not installed |

## Acceptance

| Criterion | Evidence | Real or fixture |
| --- | --- | --- |
| Multi-tenant membership | Same actor on t1 and t2; cross-tenant scope denies | fixture |
| Unknown role is D01 and denied | permission-matrix.json | fixture |
| Sandbox fail closed | remote-backend with sandboxAvailable false | fixture |
| Legacy alias does not grant | customer.read rejected | fixture |

## Limits

- This is not the Phase 2 authorization service.
- Disposable is a type only; host dispose behavior is Phase 3.

## Rollback

- Revert this commit.
