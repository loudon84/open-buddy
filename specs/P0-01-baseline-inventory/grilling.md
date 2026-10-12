# Grilling: P0-01 baseline inventory

- **Date**: 2026-10-12
- **REQ**: REQ-F01, REQ-K01
- **Decisions applied**: D12 from docs/roadmap/decisions.md

## Frontier

### Q1. What does "per-file" cover?

- **Question**: Hash every file under `apps/work`, or only the migration closure this roadmap names?
- **Recommended**: Hash the named closure only: `LICENSE`, `package.json`, `project.json`, `src/main/hermes.ts`, `src/main/skill-run/skill-run-gateway-client.ts`, and every source file under `src/main/knowledge/`, `src/shared/knowledge/`, and `components/file-preview/`. Exclude `node_modules`, `dist`, `out`, and build artifacts. Later tasks may add files only by updating this inventory.
- **Resolution**: adopted
- **Why**: A full-tree hash includes caches and is not a migration set. The named closure is what Phase 1 and Phase 4A actually read. Glob results are not treated as a complete import closure; external imports are listed separately.

### Q2. How do we treat the React 19 / npm / Nx difference?

- **Question**: Bump OpenBuddy to React 19 and npm, or keep the target toolchain?
- **Recommended**: Keep the target. Record `react` and `react-dom` as `^18.3.1`, `@types/react` as `^18.3.12`, and `@types/react-dom` as `^19.2.7`. Do not edit those ranges. Source React `^19.2.1`, root `package-lock.json`, and Nx `project.json` (`npm ci`) are dispositions, not files to copy.
- **Resolution**: adopted
- **Why**: REQ-F01 and P0-01 forbid changing the target dependency set to match the source. JSX compatibility is judged by the target typecheck, which P0-06 runs as the baseline. This task records the versions and does not claim a fresh typecheck pass.

### Q3. What happens to `packages/runtime-client-ts`?

- **Question**: Copy the sibling package or leave it out?
- **Recommended**: Do not copy it. Record it under D12. Evidence of the edge: `apps/work/project.json` `implicitDependencies`, and the `@smc/runtime-client` path alias in `apps/work/tsconfig.node.json`.
- **Resolution**: adopted
- **Why**: D12 says the migration root is `apps/work` and out-of-range packages are reimplemented behind the target interface.

### Q4. Which HEADs are frozen?

- **Question**: Use the scan snapshot or the HEADs at execution time?
- **Recommended**: Freeze execution-time HEADs. Target scan snapshot `2dd37e9eaa8c35496846883c0c47b60153f9ddfb` is not HEAD. Source scan snapshot `68de354235f2796da8c89b869a9db70955fae20e` still matches `E:/git/smc-copilot` HEAD, and `apps/work` is clean. Untracked `.cursor/plans/` on the target is recorded and left untouched.
- **Resolution**: adopted
- **Why**: The roadmap says a scan HEAD is not the current HEAD, and other people's dirty files are not reset.

## Settled tree

- Q1 defines the file set that Q3's D12 edges are checked against.
- Q2 and Q4 have no further open questions.

## Terms to add to CONTEXT.md

- **Migration candidate**: A file under `apps/work` whose hash and license are frozen before any later task copies or rewrites it. Avoid: upstream dump, source tree.
- **Out-of-range dependency**: A package outside `apps/work` that a migration candidate imports or names. It is not copied. Avoid: transitive dependency we should vendor.

## ADR needed

- none. Not copying `runtime-client-ts` is D12, already recorded. Service boundaries belong to P0-02.
