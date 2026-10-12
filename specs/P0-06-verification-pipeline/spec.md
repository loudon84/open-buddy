# Spec: P0-06 verification pipeline

## Goal

Make the new runtime packages visible to pnpm, moon, and tsconfig, fail a deliberate reverse-import fixture, and record the existing verification commands after a local install.

## In scope

- `moon.yml` and `tsconfig.json` for `@openbuddy/runtime-adapter` and `@openbuddy/workspace`.
- Root and package path aliases.
- `pnpm verify:enterprise-boundaries`.
- A local `pnpm install` that is not committed.
- Command transcripts, including failures.

## Out of scope

- Committing `pnpm-lock.yaml` or `node_modules`.
- A live tenant probe. Missing tokens are a recorded script failure, not a pass.
- Treating a baseline failure as success.

## Acceptance mapping

| Roadmap Acceptance | How it is verified |
| --- | --- |
| New packages are discovered | workspace glob, moon.yml, tsconfig paths, checked by the boundary command |
| A deliberate reverse import fails | Fixture `plugins/example` is reported; a clean real tree is required for exit 0 |
| Windows bash is available | Git Bash runs `scripts/verify-tenant-boundaries.sh` |
| Existing scripts run and failures are kept | `docs/architecture/validation-baseline.md` quotes exit codes |
| No source lock overwrite | `pnpm-lock.yaml` stays untracked |

## Assumptions

- Adopted Q1–Q3.
