# Spec: P1-01 LocalPiAdapter

## Scope

Wrap the existing Pi session runtime so old JSONL sessions continue offline and host events map onto the project runtime contract. Enterprise scope is rejected. A fixture registration cannot become the production default.

## Behavior

- `connect` succeeds only when `scope.tenantId` is `local:<installationId>` and returns `kind: local-pi`.
- `openExisting` loads entries and continues the same path. It does not call a write method and does not rewrite the JSONL file.
- `sendMessage` works with an empty endpoint after a local connect.
- Host events map as: `tool_call` → `tool.started`, `hook/permission-request` → `approval.required`, `error` → `run.failed`, `aborted` → `run.cancelled`.
- `cancel` aborts the port and the aborted host event maps to `run.cancelled`.
- `AdapterRegistry.resolveDefault()` throws when every registration is a fixture, and otherwise returns the non-fixture `local-pi` adapter.

## Acceptance map

| Acceptance | Evidence |
| --- | --- |
| Old session loads and continues | `openExisting` returns the continued session id |
| Offline chat | `sendMessage` after connect with an empty endpoint |
| Permission, tool, error, cancel mapping | `mapHostEvent` |
| Pi history format unchanged | port has no write call; `readPiJsonl` is read-only |
| No business plugin import | adapter source has no `plugins/` import |

## Assumptions

- Production continue/send still belong to the existing agent host. This task injects that host through `bindLocalPiRuntime`.
- Real remote Hermes is out of scope.
