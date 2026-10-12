# Grilling: P1-04 command log

- **Date**: 2026-10-12
- **REQ**: REQ-G04, REQ-R04

## Frontier

### Q1. What happens when the same key is sent again?

- **Question**: Start another run, or return the stored receipt?
- **Recommended**: Same body returns the same receipt and does not call upstream again. A different body is 409.
- **Resolution**: adopted

### Q2. Cancel and complete at the same time?

- **Question**: Emit both terminal events, or one?
- **Recommended**: The first terminal state wins. The other caller observes that same state.
- **Resolution**: adopted

### Q3. An external write whose result is unknown?

- **Question**: Mark the run succeeded, or queue it for reconciliation?
- **Recommended**: Reconciliation. This log does not claim exactly-once across an external system.
- **Resolution**: adopted

## ADR needed

- none
