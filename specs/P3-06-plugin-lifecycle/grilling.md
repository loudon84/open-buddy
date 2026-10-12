# Grilling: P3-06 lifecycle

- **Date**: 2026-10-12
- **REQ**: REQ-P04, REQ-MK03

## Frontier

### Q1. Does uninstall delete business rows?

- **Question**: Delete them, or keep them?
- **Recommended**: Keep them. Uninstall removes the plugin state only.
- **Resolution**: adopted

### Q2. Can a rollback restore a revoked permission?

- **Question**: Restore the old grant, or recheck current policy?
- **Recommended**: Recheck. A revoked permission stays blocked.
- **Resolution**: adopted

## ADR needed

- none
