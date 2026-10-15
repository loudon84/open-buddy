# Evidence: Runtime Adapter session convergence (RA-00–RA-10)

Date: 2026-10-15. Branch work is fixture-level. No Hermes staging was contacted (D03). AC-RA-14 stays blocked on D03.

## What landed

- Decisions D18–D21 in `docs/roadmap/decisions.md`. Roadmap section and ledger rows for RA-00–RA-10.
- Canonical contract split: `RuntimeConnection` and `RuntimeSessionPort`. `RuntimeAdapter` is their combination. `normalizeRuntimeId` maps `pi` / `hermes` on read. `runtime-core` lifecycle type is `RuntimeLifecyclePhase`. `chat` types are marked deprecated.
- Preload allows `platform-runtime:list|health|switch` and `runtime-session:*` plus `runtime://event`. `platform-plugin:*` stays unreachable. Switch sets the default for new sessions.
- Pi host install calls `installPlatformPiBinding`. An unbound port reports unhealthy. `agent:prompt` listens to `AbortSignal`. `LocalPiAdapter.cancel` checks `runId`. `createSession` does not treat a non-path instance id as a JSONL path.
- Runtime id is stored in existing `session_bindings` (`binding_type = "runtime"`). A second runtime id is rejected. No row reads as `local-pi`.
- Mutating `agent:prompt` follows that binding. Pi-only channels throw `UNSUPPORTED_CAPABILITY` for a remote binding. Policies accept `pi` / `hermes` as families of `local-pi` and `remote-hermes:<id>`.
- `RuntimeSessionService` creates a remote session once and reuses its `SessionRef`. An identity epoch change marks older events late.
- Renderer `session-client` keeps local Pi on `pi-client`. A non-Pi default creates the binding before the first prompt of a new session. Cancel no longer marks the turn completed in `finally`; a 10s timer marks `uncertain` only if streaming is still on. The settings action says “设为新会话默认”.
- Hermes `connect` reads feature flags and treats a missing flag as false. Gateway `/v1/capabilities` returns those flags. `POST /v1/sessions` rejects a foreign `workspaceId` with 403. Bodies over 1 MiB return 413. `services/hermes-agent-gateway/src/main.ts` calls `assertDeploymentConfig` and `createCasdoorAccessTokenVerify`.
- The desktop prompt path no longer calls `dispatchPrompt`, `collectChat`, or `publishAssistantTurn`. Those helpers remain for the runtime-core adapter `chat()` tests. `enterprise-runtime:*` remains because the P1 controller tests and IPC registration still use it. `session-coordinator.ts` and `runtime-coordinator.ts` remain because P1-05 and P1-06 tests import them.

## Commands

- `npx vitest run electron/main/runtime/__tests__/runtime-binding.test.ts electron/main/runtime/__tests__/runtime-session-service.test.ts electron/main/runtime/__tests__/local-pi-cancel.test.ts src/lib/runtime/runtime-event-projector.test.ts electron/main/ipc/__tests__/prompt-cycle-identity.test.ts packages/runtime-adapters/src/__tests__/pi-adapter.test.ts packages/runtime-adapters/src/__tests__/hermes-adapter.test.ts tests/enterprise/gateway-authorization.test.ts` — binding, service, cancel, projector, prompt routing, adapters, and gateway authorization (including 403 and 413) passed.
- `npx vitest run electron/main/ipc/__tests__/channel-allowlist-parity.test.ts` — after the known `platform-plugin:*` exception, the remaining missing set is empty. Before RA-01 the same test also listed `platform-runtime:*`.

## Limits

- No packaged window run. Pi two-turn and loopback Hermes two-turn were not clicked in a development window.
- `collectChat` is not deleted; it is unused by `agent:prompt`.
- `enterprise-runtime:*` is not deleted.
- Live SSE was not added (D21).
- Status is `done-fixture` where a real Hermes or Casdoor gateway is required.
