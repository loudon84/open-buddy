# Evidence: P0-06

- **Status proposed**: blocked
- **Environment**: Windows. Git Bash at `D:\Programs\Git\bin\bash.exe`. `corepack pnpm` 11.24.0. `pnpm` is not on PATH. `node_modules` and `pnpm-lock.yaml` are absent.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `where.exe bash` | `D:\Programs\Git\bin\bash.exe` | Git Bash exists, so the tenant boundary script has a bash host |
| `corepack pnpm typecheck` | killed during dependency resolution | With no lockfile, pnpm started resolving the workspace from the registry. That would create a lock and download dependencies. Stopped before `node_modules` or `pnpm-lock.yaml` was written |
| `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm verify:agent-host-boundaries` | not run | Same missing install. Results are not claimed as passes |

## Acceptance

| Criterion | Evidence | Real or fixture |
| --- | --- | --- |
| New packages discovered by workspace, moon, and tsconfig | not done | blocked |
| A deliberate reverse import fails | not done | blocked |
| Windows bash or an equivalent entry | bash exists; equivalent entry not added | partial |
| Existing scripts executed and failures kept | typecheck could not reach the compiler | blocked |
| No source lock overwritten | Confirmed: lockfile still absent after the killed command | real |

## Limits

- Phase 0 cannot exit.
- P1-01 and later stay pending until this task is unblocked by an existing lockfile and an installed workspace, without minting a new lock in this branch.

## Rollback

- Nothing was committed from the install attempt. No lockfile to delete.
