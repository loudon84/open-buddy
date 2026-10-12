# Grilling: P0-05 workspace and plugin contract

- **Date**: 2026-10-12
- **REQ**: REQ-W03, REQ-P02, REQ-SDK01
- **Decisions applied**: D01

## Frontier

### Q1. Which roles exist?

- **Question**: Invent business roles, or use the D01 set?
- **Recommended**: tenant-admin, workspace-admin, member, viewer. An unknown role such as billing-admin is unmapped and denied. Admin is not an implicit read of every document.
- **Resolution**: adopted

### Q2. What if the sandbox is missing?

- **Question**: Install a remote-backend plugin anyway, or refuse?
- **Recommended**: Refuse. Fail closed.
- **Resolution**: adopted

### Q3. Who owns a task's terminal state?

- **Question**: Workspace or the agent gateway?
- **Recommended**: The gateway owns the run terminal state. Workspace stores business fields and the run id only.
- **Resolution**: adopted

## ADR needed

- none. Role names are D01. The gateway split is ADR-0001.
