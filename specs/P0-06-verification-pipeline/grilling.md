# Grilling: P0-06 verification pipeline

- **Date**: 2026-10-12
- **REQ**: REQ-D03, REQ-T05
- **Decisions applied**: none of D01–D12 change this task

## Frontier

### Q1. May this task create `pnpm-lock.yaml`?

- **Question**: The tree has no committed lockfile because `.gitignore` ignores `pnpm-lock.yaml`. `pnpm install` will create one locally.
- **Recommended**: Install locally. Do not commit `pnpm-lock.yaml` or `node_modules`. That is not a source-lock overwrite.
- **Resolution**: adopted
- **Why**: The previous block treated a gitignored lock as a source lock. The acceptance forbids covering a committed lock. There is no committed lock.

### Q2. How does the reverse-import sample fail?

- **Question**: Put a forbidden import in product code, or in a fixture the checker must report?
- **Recommended**: A fixture under `tests/enterprise/fixtures/deny-edges/`. `verify:enterprise-boundaries` fails the run if that fixture is not reported, and also fails if the real tree has a deny-edge hit.
- **Resolution**: adopted

### Q3. What runs the tenant boundary script on Windows?

- **Question**: Rewrite the bash script, or use the Git Bash that is already installed?
- **Recommended**: Use `D:\Programs\Git\bin\bash.exe`. Record the result. Do not claim a tenant probe passed without tokens.
- **Resolution**: adopted

## ADR needed

- none.
