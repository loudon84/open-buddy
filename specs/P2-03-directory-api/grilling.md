# Grilling: P2-03 directory API

- **Date**: 2026-10-12
- **REQ**: REQ-W03

## Frontier

### Q1. Can a member raise their own role?

- **Question**: Allow it, or refuse?
- **Recommended**: Refuse.
- **Resolution**: adopted

### Q2. What happens when two updates share an old revision?

- **Question**: Last write wins, or 409?
- **Recommended**: 409. The stored record stays the first successful update.
- **Resolution**: adopted

## ADR needed

- none
