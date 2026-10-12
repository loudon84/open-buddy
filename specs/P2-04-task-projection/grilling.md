# Grilling: P2-04 task projection

- **Date**: 2026-10-12
- **REQ**: REQ-W02, REQ-W03

## Frontier

### Q1. Can a business update rewrite the run terminal state?

- **Question**: Let the workspace set the terminal, or keep the gateway value?
- **Recommended**: A business event changes the title only. The terminal stays the gateway value.
- **Resolution**: adopted

### Q2. What is an artifact reference?

- **Question**: A local absolute path, or an artifact id?
- **Recommended**: An `artifact://` reference. A drive path is rejected. Another tenant and a revoked grant cannot resolve it.
- **Resolution**: adopted

## ADR needed

- none
