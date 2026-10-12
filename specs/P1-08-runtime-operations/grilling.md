# Grilling: P1-08 runtime operations

- **Date**: 2026-10-12
- **REQ**: REQ-H04, REQ-T04, REQ-T05

## Frontier

### Q1. Does turning the remote flag off rewrite old sessions?

- **Question**: Convert them to local Pi, or leave them on remote-hermes?
- **Recommended**: Leave stored remote sessions unchanged. Only a new session uses local-pi.
- **Resolution**: adopted

### Q2. Can this task deploy?

- **Question**: Publish staging, or record the drill without a target?
- **Recommended**: No publish. `--profile=staging` exits 2. D11 hardware is not measured. Status is `done-fixture`.
- **Resolution**: adopted

## ADR needed

- none
