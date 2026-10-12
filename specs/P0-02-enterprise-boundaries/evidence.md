# Evidence: P0-02

- **Status proposed**: done
- **Environment**: Windows, Node.js v24.21.0. No repository import scan.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `node scripts/architecture/check-enterprise-boundaries.mjs --spec-only` | `enterprise boundaries spec ok` | Exit 0 |
| `pnpm exec vitest run tests/enterprise/P0-02.test.ts` | not run | Dependencies are not installed. The test calls the same function |

## Acceptance

| Criterion | Evidence | Real or fixture |
| --- | --- | --- |
| No core→business, UI→Hermes, or portable→Electron edge | Four deny edges required by the checker | spec fixture |
| Agent gateway and resource gateway are separate | Distinct owners; neither owns the other's responsibilities; resource gateway must not own execution | spec fixture |
| No `apps/desktop` move | `forbiddenRoots` and a directory existence check | real tree: directory absent |

## Limits

- This does not prove current imports obey the edges. P0-06 attaches the scan once the new packages exist.
- The plugin host is unchanged.

## Rollback

- Revert this commit. No data was written.
