# Validation baseline

Recorded: 2026-10-12, after a local `corepack pnpm install`. `pnpm-lock.yaml` and `node_modules` stay untracked (`.gitignore`).

Proto did not have Node 22. The first `pnpm typecheck` exited 1 with `missing_tool` for `~22` from `.nvmrc`. `proto install node 22.23.3` then allowed moon to run. The system Node on PATH was v24.21.0.

| Command | Exit | Result |
| --- | --- | --- |
| `corepack pnpm typecheck` | 0 | `app-desktop:typecheck` and `openbuddy:typecheck` completed |
| `corepack pnpm lint` | 0 | Same tsc tasks under the lint ids |
| `corepack pnpm test` | 1 | Vitest: 84 files failed, 782 passed (866). Tests: 159 failed, 7360 passed, 793 skipped. `tests/enterprise/P0-01` through `P0-06` passed. Failures include Windows path separators in existing agent-path tests. Not treated as a pass |
| `corepack pnpm build` | 0 | `openbuddy:build.bundle` completed in about 1m 32s |
| `corepack pnpm verify:agent-host-boundaries` | 0 | No violations under `electron/main/agent/host-modules` |
| `corepack pnpm verify:enterprise-boundaries` | 0 | Spec, discovery, and real tree ok. The deny-edge fixture produced 1 expected violation |
| `bash scripts/verify-tenant-boundaries.sh` | 2 | Git Bash ran the script. It stopped because `OPENBUDDY_GATEWAY_URL` and tenant tokens were not set. This is not a tenant-isolation pass |

Package typechecks:

| Command | Exit |
| --- | --- |
| `moon run packages/runtime/openbuddy-runtime-adapter:typecheck` | 0 |
| `moon run packages/runtime/openbuddy-workspace:typecheck` | 0 |

Moon project ids: `packages/runtime/openbuddy-runtime-adapter`, `packages/runtime/openbuddy-workspace`. Root `tsconfig.json` paths include `@openbuddy/runtime-adapter` and `@openbuddy/workspace`.
