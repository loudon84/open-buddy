# Spec: P0-01 baseline inventory

## Goal

Freeze the OpenBuddy and `apps/work` baselines so later tasks can detect a hash change and stop copying that file. Record toolchain differences without changing target dependencies.

## In scope

- Execution-time target HEAD, dirty paths, and commits after scan snapshot `2dd37e9`.
- Execution-time source HEAD for `E:/git/smc-copilot`, compared with scan snapshot `68de354`.
- SHA-256, license, and external-import notes for the named migration closure.
- Dispositions for React 19, npm/Nx, and `runtime-client-ts`.
- A test that fails when the inventory drifts from those rules.

## Out of scope

- Copying any source file into OpenBuddy.
- Editing `react`, `react-dom`, or `@types/*` ranges.
- Running the full repository typecheck (P0-06 records that baseline).
- Network fetches, lockfile updates, and production deployment.

## Behavior

| Input | Output | Failure |
| --- | --- | --- |
| Local OpenBuddy checkout and local `E:/git/smc-copilot/apps/work` | `docs/architecture/baseline.md` and `docs/architecture/migration-inventory.json` | Missing checkout or a hashed file whose bytes changed |
| Named closure under `apps/work` | One inventory row per file: repo-relative path, sha256, license `MIT` (work app LICENSE), classification `source-candidate`. `existing` / `new` target paths stay empty until a later task creates a target file. Imports that resolve outside `apps/work` are `outOfRange` with action `do-not-copy`. That list is not a complete import closure | A row whose path is outside `apps/work/`, or a row that copies `runtime-client-ts` |
| Target `package.json` | Recorded ranges `react` `^18.3.1`, `react-dom` `^18.3.1`, `@types/react` `^18.3.12`, `@types/react-dom` `^19.2.7`, disposition `judge-by-target-typecheck` | Inventory proposes a dependency edit, or treats the recorded ranges as a JSX compatibility pass |
| Source `project.json` implicit dependency `runtime-client-ts` | `outOfRange` entry, action `do-not-copy`, decision D12 | Entry marked `copy` |

## Acceptance mapping

| Roadmap Acceptance | How it is verified |
| --- | --- |
| Migration source is only `apps/work` | Test: every `files[].path` starts with `apps/work/` |
| React 19 / npm / Nx versus React 18 / pnpm / moon each has a disposition | `toolchain[]` contains `react`, `package-manager`, and `build-graph` |
| Target React DOM and types ranges are recorded and not edited | Test asserts the four ranges as literals in both `package.json` and `toolchain`. Disposition is `judge-by-target-typecheck`. Recording them is not a JSX compatibility pass; P0-06 runs the repo typecheck and P4A-02 checks migrated JSX |
| Out-of-range dependencies are D12 and not copied | `outOfRange` contains `runtime-client-ts` with action `do-not-copy` |
| SHA change stops migration of that file | Test recomputes SHA-256 of each inventoried file from the local source checkout |

## Assumptions

- Adopted grilling Q1–Q4.
- D12.
- Work app license text is the MIT license at `apps/work/LICENSE`. Individual file headers are not re-licensed.
- `@open-file-viewer/*` is a third-party npm dependency, recorded as external, not as a copied source tree.

## Files

| Path | existing or new |
| --- | --- |
| `docs/architecture/baseline.md` | new |
| `docs/architecture/migration-inventory.json` | new |
| `tests/enterprise/P0-01.test.ts` | new |
| `CONTEXT.md` | new |
| `package.json` | existing, read only |
| `pnpm-workspace.yaml` | existing, read only, evidence for the pnpm disposition |
| `moon.yml` | existing, read only, evidence for the moon disposition |
| `CONTEXT.md` | new in this task; no earlier glossary to merge |
