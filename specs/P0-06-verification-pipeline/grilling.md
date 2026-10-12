# Grilling: P0-06 verification pipeline

- **Date**: 2026-10-12
- **REQ**: REQ-D03, REQ-T05
- **Decisions applied**: D12

## Frontier

### Q1. May this task create `pnpm-lock.yaml`?

- **Question**: The tree has no lockfile and no `node_modules`. Running `pnpm typecheck` starts an install.
- **Recommended**: Do not create a lockfile. Stop the install. Record the commands as not passed. Leave the task blocked.
- **Resolution**: adopted
- **Why**: P0-06 forbids covering the source lock, and a baseline that never ran must not be written down as a pass.

## ADR needed

- none.
