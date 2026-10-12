# Grilling: P2-05 workspace shell

- **Date**: 2026-10-12
- **REQ**: REQ-S02, REQ-W05

## Frontier

### Q1. What happens to the previous tenant's cache?

- **Question**: Keep it, or clear it on switch?
- **Recommended**: Clear it. A response whose tenant id does not match the active scope is dropped.
- **Resolution**: adopted

### Q2. Does the renderer store a token or import local history?

- **Question**: Keep both in the shell state, or leave them out?
- **Recommended**: Leave them out. An active run is marked background or cancelled. Offline is read-only and shows the timestamp.
- **Resolution**: adopted

## ADR needed

- none
