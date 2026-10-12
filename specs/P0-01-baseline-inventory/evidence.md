# Evidence: P0-01

- **Status proposed**: done
- **Commit**: this commit
- **Environment**: Windows PowerShell, Node.js v24.21.0, corepack pnpm 11.24.0 available but `node_modules` and `pnpm-lock.yaml` are absent. No staging profile. Source checkout `E:/git/smc-copilot` HEAD `68de354235f2796da8c89b869a9db70955fae20e`.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `node scripts/architecture/check-baseline-inventory.mjs` before the inventory existed | exit 1, `inventory unreadable: ENOENT` | Expected red |
| `node scripts/architecture/write-baseline-inventory.mjs` | `wrote 73 files` | Hashes from the local source tree |
| `node scripts/architecture/check-baseline-inventory.mjs` | `P0-01 baseline inventory ok` | Green |
| `git rev-parse HEAD` | `0831ca6bb1ced2b3053c26486e736c3e5b5437a4` | Frozen as `target.head`. This commit is the child of that HEAD |
| `git status --short` | foreign dirty `?? .cursor/plans/` left untouched | Task files are the P0-01 diff |
| `pnpm exec vitest run tests/enterprise/P0-01.test.ts` | not run | `pnpm` is not on PATH; corepack can resolve pnpm 11.24.0, but dependencies are not installed. The same assertions live in the node checker. P0-06 installs and records the vitest baseline |

## Acceptance

| Criterion | Evidence | Real or fixture |
| --- | --- | --- |
| Source is only `apps/work` | Checker rejects any other prefix; 73 rows | real local checkout |
| React 19 / npm / Nx each have a disposition | `toolchain` in migration-inventory.json | real |
| Target ranges `react-dom` `^18.3.1`, `@types/react-dom` `^19.2.7`, `@types/react` `^18.3.12` kept | Checker compares literals to `package.json`. No range edit. This is not a JSX compatibility pass | real |
| Out-of-range `runtime-client-ts` is D12 and not copied | `outOfRange` action `do-not-copy` | real |
| SHA change stops that file | Checker recomputes SHA-256 from `E:/git/smc-copilot` | real |

## Limits

- The closure is the named Hermes, knowledge, and file-preview set, not every file under `apps/work`.
- Discovered specifiers are not a resolved import graph.
- Repository typecheck was not run. `node_modules` is missing, so vitest and `pnpm typecheck` cannot run until P0-06.
- `@open-file-viewer/*` is recorded as do-not-copy source, not as a ban on declaring the npm package later.

## Rollback

- Revert this commit.
- Do not delete `.cursor/plans/` or reset the source checkout.
