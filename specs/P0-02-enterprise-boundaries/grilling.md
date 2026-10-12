# Grilling: P0-02 enterprise boundaries

- **Date**: 2026-10-12
- **REQ**: REQ-T02, REQ-D02, REQ-S02
- **Decisions applied**: D01, D03

## Frontier

### Q1. Where does each responsibility sit?

- **Question**: One process, or the split in REQ-T02?
- **Recommended**: Desktop main owns Local Pi, the preload bridge, credential references, and the future browser process. A new Hermes agent gateway owns remote session routing, receipts, the event log, and approval. The existing Casdoor resource gateway keeps identity and resource authorization and does not run agents. Workspace, plugin registry, and plugin worker are later services, not folders moved today.
- **Resolution**: adopted
- **Why**: REQ-T02 already splits these. Merging the agent gateway into the resource gateway would hide execution behind the login service.

### Q2. What is forbidden to import?

- **Question**: Which edges fail the boundary check?
- **Recommended**: `packages/core` must not import business plugins or enterprise services. `packages/ui` must not import the Hermes client or upstream URLs. Portable packages (`packages/runtime/openbuddy-runtime-adapter` and `openbuddy-hermes-client`, when they exist) must not import `electron`. Do not create `apps/desktop`.
- **Resolution**: adopted
- **Why**: REQ-D01 keeps the current Electron layout. Reverse edges would make the portable contract depend on the shell.

### Q3. Is today's plugin host the enterprise runtime?

- **Question**: Mark `openbuddy-plugin-host` as the finished sandbox?
- **Recommended**: No. It stays the existing host and serializer. Enterprise isolation arrives in Phase 3.
- **Resolution**: adopted
- **Why**: The roadmap says the current serializer is not the enterprise runtime, and there is no external Ekko SDK to call.

## Settled tree

- Q1 names the processes. Q2 is the deny list those processes imply. Q3 stops the checker from treating the current host as Phase 3.

## Terms to add to CONTEXT.md

- **Agent Gateway**: The service that routes a remote session to Hermes and stores receipts and the event log. Avoid: resource gateway, Casdoor.
- **Resource gateway**: The existing Casdoor service that authorizes resources. It does not run an agent.

## ADR needed

- `docs/adr/0001-enterprise-boundaries.md`. Hard to reverse, surprising if someone folds the agent gateway into Casdoor, and a real split versus one gateway.
