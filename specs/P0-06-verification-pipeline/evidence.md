# Evidence: P0-06

- **Status proposed**: done
- **Environment**: Windows, Git Bash `D:\Programs\Git\bin\bash.exe`, corepack pnpm 11.24.0, proto Node 22.23.3 for moon, system Node v24.21.0 on PATH. Local install only.

## Commands

See [docs/architecture/validation-baseline.md](../../../docs/architecture/validation-baseline.md).

| Command | Result |
| --- | --- |
| `corepack pnpm typecheck` | exit 0 after Node 22.23.3 was installed for proto. The earlier attempt exited 1 |
| `corepack pnpm lint` | exit 0 |
| `corepack pnpm test` | exit 1. 159 failed, 7360 passed. Enterprise P0 tests passed |
| `corepack pnpm build` | exit 0 |
| `corepack pnpm verify:agent-host-boundaries` | exit 0 |
| `corepack pnpm verify:enterprise-boundaries` | exit 0, 1 fixture violation detected |
| `bash scripts/verify-tenant-boundaries.sh` | exit 2, missing gateway URL and tokens |

## Acceptance

| Criterion | Evidence | Real or fixture |
| --- | --- | --- |
| New packages discovered by workspace, moon, and tsconfig | `pnpm list` shows both packages. Moon query lists both project ids. Root tsconfig has both paths | real |
| Deliberate reverse import fails | `tests/enterprise/fixtures/deny-edges/core-imports-plugin.ts` is reported. Real tree violations are empty | fixture plus real scan |
| Windows bash | Git Bash executed the tenant script | real |
| Existing scripts executed, failures kept | Test exit 1 and tenant exit 2 are recorded above | real |
| No source lock overwrite | `pnpm-lock.yaml` is gitignored and not staged | real |

## Limits

- The vitest suite is not green. The failures are existing Windows path expectations, not the new boundary check.
- The tenant script did not probe a gateway.
- Phase 1 real Hermes exit is still blocked on D03.

## Rollback

- Revert this commit.
- Delete the local `pnpm-lock.yaml` and `node_modules` if you want the install gone. They are not in git.
