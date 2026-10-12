# Grilling: P3-02 broker

- **Date**: 2026-10-12
- **REQ**: REQ-SDK03, REQ-P03

## Frontier

### Q1. Is a manifest permission a grant?

- **Question**: Treat the manifest list as granted, or require a separate grant and ACL?
- **Recommended**: Require both at registration and again at call time.
- **Resolution**: adopted

### Q2. Can the broker open Hermes?

- **Question**: Let a plugin pass an MCP URL through, or restrict the host?
- **Recommended**: Allow only configured hosts. A host containing `hermes` is denied.
- **Resolution**: adopted

## ADR needed

- none
