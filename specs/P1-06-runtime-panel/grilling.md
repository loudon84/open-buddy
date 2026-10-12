# Grilling: P1-06 runtime panel

- **Date**: 2026-10-12
- **REQ**: REQ-S02, REQ-S04

## Frontier

### Q1. Where does the panel get Hermes data?

- **Question**: Fetch from the renderer, or receive state from main?
- **Recommended**: The panel only renders a phase. It does not fetch. The shell state has an endpoint ref and no token.
- **Resolution**: adopted

### Q2. What does cancel show before the terminal event?

- **Question**: Show completed immediately, or a pending phase?
- **Recommended**: `cancel-pending` until the terminal status arrives. Disconnect is its own phase and is not success.
- **Resolution**: adopted

## ADR needed

- none
