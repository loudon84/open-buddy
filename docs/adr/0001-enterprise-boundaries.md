# 0001 Enterprise service boundaries

Desktop main keeps Local Pi, the preload bridge, and credential references. A separate Hermes agent gateway will own remote session routing, receipts, the event log, and approval. The existing Casdoor resource gateway keeps identity and resource authorization and does not execute agents.

We rejected folding the agent gateway into the resource gateway: login and resource ACL are not agent execution. We also rejected an `apps/desktop` move. REQ-D01 keeps `electron/main`, `electron/preload`, and `src`.

`packages/core` does not import business plugins or enterprise services. `packages/ui` does not import the Hermes client. Portable runtime packages do not import Electron. The current plugin host is the existing serializer, not the Phase 3 sandbox, and there is no external Ekko SDK.

Status: accepted
