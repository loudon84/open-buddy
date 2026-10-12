# Spec: P0-04 runtime contract

## Goal

Freeze the adapter types, the project OpenAPI, and the event schema so later tasks cannot invent a second protocol.

## In scope

- `RuntimeAdapter` types, method map, OpenAPI, event schema, cross-tenant 404 fixture.
- A node checker. No gateway process.

## Out of scope

- Implementing the server (P1-02).
- Claiming the routes exist on upstream Hermes.

## Acceptance mapping

| Roadmap Acceptance | How it is verified |
| --- | --- |
| SDK methods map to endpoints | method-map.json versus types.ts and openapi.yaml. disconnect is explicitly local |
| Cancel, approval, disconnect, errors, idempotency, and schema version are expressible | OpenAPI operations, Idempotency-Key, ErrorEnvelope, event schemaVersion 1.0 |
| Cross-tenant example is rejected | fixtures/cross-tenant-denied.json is 404 NOT_FOUND |
| Draft `/api` paths are not treated as upstream | Checker fails if `/api/session` appears |

## Assumptions

- Adopted Q1–Q3.
- `executeTool` and `queryStatus` are included because REQ-G03 names them, even though the REQ-R02 interface block stopped at `listTools`.
