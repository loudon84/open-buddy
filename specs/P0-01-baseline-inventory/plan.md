# P0-01 Baseline Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the named `apps/work` migration closure and the target toolchain ranges so a hash or range change fails the P0-01 test.

**Architecture:** A JSON inventory is the source of truth. The test recomputes SHA-256 from the local source checkout and reads target `package.json` literals. No source file is copied and no dependency range is edited.

**Tech Stack:** Vitest, Node `crypto`, the existing root `package.json`.

**Spec:** `specs/P0-01-baseline-inventory/spec.md`

## Global Constraints

- Source root is `E:/git/smc-copilot/apps/work` only.
- Do not copy `runtime-client-ts`.
- Do not change `react` `^18.3.1`, `react-dom` `^18.3.1`, `@types/react` `^18.3.12`, or `@types/react-dom` `^19.2.7`.
- Do not fetch source from the network and do not touch lockfiles.
- Recording those ranges is not a JSX compatibility pass.

---

### Task 1: Failing inventory test

**Files:** Create `tests/enterprise/P0-01.test.ts`

- [ ] Write a test that reads `docs/architecture/migration-inventory.json` and fails because the file is absent.
- [ ] Assert every `files[].path` starts with `apps/work/`, classification is `source-candidate`, and `targetPath` is null.
- [ ] Recompute SHA-256 for each row from `E:/git/smc-copilot`.
- [ ] Assert `outOfRange` contains `runtime-client-ts` with action `do-not-copy` and decision `D12`.
- [ ] Assert toolchain dispositions `react`, `package-manager`, and `build-graph`, and that the four package ranges match `package.json` literals.
- [ ] Run `pnpm exec vitest run tests/enterprise/P0-01.test.ts` and confirm failure.

### Task 2: Inventory and baseline

**Files:** Create `docs/architecture/migration-inventory.json`, `docs/architecture/baseline.md`

- [ ] Hash the named closure, excluding `node_modules`, `dist`, and `out`.
- [ ] Record HEADs, dirty paths, scan-snapshot drift, MIT license, and D12 edges.
- [ ] Write the baseline narrative with the same facts.
- [ ] Re-run the test and confirm it passes.

### Task 3: Evidence and ledger

**Files:** `specs/P0-01-baseline-inventory/evidence.md`, `docs/roadmap/ledger.md`

- [ ] Record the command output, limits, and rollback.
- [ ] Set P0-01 to `done` only after the test passes.
