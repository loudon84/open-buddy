# Grilling: P1-05 session projection

- **Date**: 2026-10-12
- **REQ**: session directory and stream recovery

## Frontier

### Q1. What happens to a repeated seq?

- **Question**: Append the delta again, or ignore it?
- **Recommended**: Ignore a seq that was already applied.
- **Resolution**: adopted

### Q2. What does a 410 mean?

- **Question**: Keep stitching events, or replace the projection from a snapshot?
- **Recommended**: Replace from the snapshot and continue after that cursor.
- **Resolution**: adopted

### Q3. Can one session change runtime?

- **Question**: Move an existing session to the other runtime, or only new sessions?
- **Recommended**: An existing session keeps its runtime. A new session may use the other one. Events with the wrong runtime id are not applied.
- **Resolution**: adopted

## ADR needed

- none
