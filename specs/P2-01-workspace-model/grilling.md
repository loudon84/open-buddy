# Grilling: P2-01 workspace model

- **Date**: 2026-10-12
- **REQ**: REQ-W02

## Frontier

### Q1. How does a user relate to tenants?

- **Question**: One user under one tenant, or membership rows?
- **Recommended**: Membership rows. One user can belong to more than one tenant.
- **Resolution**: adopted

### Q2. What happens to old Pi sessions?

- **Question**: Upload them into the workspace, or leave them local?
- **Recommended**: Do not migrate them. `migrateLocalPi` returns zero rows.
- **Resolution**: adopted

### Q3. Who owns a task's run state?

- **Question**: The workspace, or the gateway?
- **Recommended**: The gateway. The workspace stores the run id only.
- **Resolution**: adopted

## ADR needed

- none. This repeats ADR-0001.
