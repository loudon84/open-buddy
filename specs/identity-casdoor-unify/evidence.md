# Identity Casdoor unification — implementation evidence

Date: 2026-10-14. Plan: Casdoor 身份统一实施. This session implemented ID-00 and the desktop/gateway code for ID-02–ID-08, GW-01, GW-02. Real Casdoor and nodeskclaw-backend were not called.

## Done in this tree

- Roadmap section and ledger rows for ID-02–ID-08, GW-01, GW-02. External blocks: D13 (real Casdoor app), D15 (backend), D03 (GW-01 staging).
- `casdoor-auth`: refresh single-flight, 60s expiry skew, epoch on login/logout/tenant switch/config change, late callback discarded, no `client_secret` on code/refresh, logout is local-first and revokes refresh only when discovery exposes `revocation_endpoint`. Browser end-session stays off unless `OPENBUDDY_CASDOOR_OPEN_END_SESSION=1`.
- Loopback redirect `http://127.0.0.1:<port>/callback` is valid and opens the existing in-app auth window. `casdoor://` remains valid. Callback host/port must match the redirect.
- `EnterpriseIdentityPort` backed by Casdoor. Enterprise and platform runtime token/tenant come from the port. Identity change disposes the enterprise runtime controller.
- `IdentityService.attachCasdoor` when `OPENBUDDY_IDENTITY_MODE` is not `backend`. Requests send `X-Tenant-Id`. Cached context is ignored when the tenant binding differs.
- Sidebar login/logout follows `identity:mode`. Audit events are `casdoor.login` / `casdoor.logout`.
- `casdoor:workbench-summary` no longer returns permissions, capabilities, groups, or custom fields.
- Remote resource checks call `POST {OPENBUDDY_BACKEND_ORIGIN}/api/v1/authz/check` and fail closed when that origin or token is missing. Desktop no longer calls Casdoor `/api/enforce` with a client secret.
- First casdoor-mode boot deletes local `backend-auth:session`, `backend-auth:config`, `identity:context`, and the enterprise OAuth partition. Backend-auth source stays until consumers are zero (renderer settings panel and tests still import it).
- Hermes gateway `createCasdoorAccessTokenVerify` checks iss, aud, exp, organization, and RS256. Static token maps were not added to production code.
- Resource gateway audience checks were not relaxed.

## Not verified here

- Real internal Casdoor login, refresh revocation, and loopback against a deployed app (D13).
- nodeskclaw-backend `/api/v1/identity/context` and `/api/v1/authz/check` (D15). Without them, identity refresh and remote authz stay fail-closed / empty.
- Hermes staging (D03).
- Local Pi IPC no longer calls the ignored `team.workspace` authorize check (`sessions.ts`, `session-misc.ts`, `misc.ts`). Enterprise resource checks stay on `authorizeResourceRemotely`.

## Rollback

Set `OPENBUDDY_IDENTITY_MODE=backend` before the one-time cutover flag `identity:casdoor-cutover` is written. After that flag, the old backend session cipher is already deleted.
