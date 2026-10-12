# Grilling: P1-01 LocalPiAdapter

- **Date**: 2026-10-12
- **REQ**: REQ-R01, REQ-R03
- **Decisions applied**: D12 (do not copy runtime-client-ts)

## Frontier

### Q1. What is a local scope?

- **Question**: Any tenant, or only this desktop installation?
- **Recommended**: `tenantId` must be `local:<installationId>`. An enterprise tenant id is FORBIDDEN. local-pi is not Local Hermes.
- **Resolution**: adopted

### Q2. Can a fixture adapter be the production default?

- **Question**: Fall back to the fixture when no real adapter is registered, or refuse?
- **Recommended**: Refuse. `resolveDefault()` returns only a non-fixture `local-pi` registration.
- **Resolution**: adopted

### Q3. Who writes Pi history?

- **Question**: Reformat JSONL inside the adapter, or keep the existing host format?
- **Recommended**: The adapter only reads JSONL. Continue, send, and abort go through a port. The file bytes stay unchanged.
- **Resolution**: adopted

### Q4. Where does the class live relative to Electron?

- **Question**: Import Electron and business plugins from the adapter, or keep a port?
- **Recommended**: The adapter class does not import Electron or `plugins/`. Production binds `PiSessionRuntime` in a separate file.
- **Resolution**: adopted

## ADR needed

- none. Boundaries stay ADR-0001.
