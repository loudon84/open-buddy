# Grilling: P3-03 isolated UI

- **Date**: 2026-10-12
- **REQ**: REQ-SDK02, REQ-P03

## Frontier

### Q1. How does third-party UI enter the host?

- **Question**: Import its module into the trusted React tree, or mount a sandboxed frame?
- **Recommended**: Mount a sandboxed frame whose source is `about:blank` plus a view ref. The host does not import the third-party module.
- **Resolution**: adopted

### Q2. What happens on scope change or disable?

- **Question**: Leave menus and subscriptions, or destroy them?
- **Recommended**: Destroy them.
- **Resolution**: adopted

## ADR needed

- none
