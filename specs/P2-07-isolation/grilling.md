# Grilling: P2-07 isolation

- **Date**: 2026-10-12
- **REQ**: REQ-W05, REQ-T05

## Frontier

### Q1. Does the old tenant script close this task?

- **Question**: Reuse `tenant:boundary-audit` as the evidence, or add a workspace matrix?
- **Recommended**: Add a nine-path workspace matrix. The old script stays a baseline and is not the completion evidence.
- **Resolution**: adopted

### Q2. Does a fixture matrix close the phase?

- **Question**: Mark Phase 2 exited, or keep the production gate open?
- **Recommended**: Record the nine paths. D01 and D02 stay unsigned, so the phase exit stays open.
- **Resolution**: adopted

## ADR needed

- none
