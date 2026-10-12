# Grilling: P2-02 authorization

- **Date**: 2026-10-12
- **REQ**: REQ-W04, REQ-G02
- **Decisions applied**: D01

## Frontier

### Q1. Does tenant-admin read every document?

- **Question**: Treat admin as a full read, or require a grant?
- **Recommended**: Require a grant. `workspace.document.read` is not implied by tenant-admin.
- **Resolution**: adopted

### Q2. What if the approval body changes?

- **Question**: Honor the old approval, or deny?
- **Recommended**: Deny when the parameter hash differs from the bound hash.
- **Resolution**: adopted

## ADR needed

- none
