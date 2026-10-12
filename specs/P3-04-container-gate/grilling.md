# Grilling: P3-04 container gate

- **Date**: 2026-10-12
- **REQ**: REQ-P03, REQ-T04

## Frontier

### Q1. What runs the plugin when no container daemon exists?

- **Question**: Fall back to a worker thread, or refuse?
- **Recommended**: Refuse. The gate does not import `worker_threads` or `node:vm`.
- **Resolution**: adopted

## ADR needed

- none
