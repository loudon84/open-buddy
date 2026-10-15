# Spec: P1-02 gateway bridge

## Scope

A Node HTTP server stores agent-instance routes and calls the registered upstream. It does not start a local Hermes process.

## Behavior

- A tenant-admin registers an instance. The upstream URL is stored for that tenant only.
- A body `tenantId` that differs from the verified tenant is 404.
- Creating a session calls the registered upstream and stores the upstream session id. A client `upstreamUrl` is not called.
- Sending a message returns the upstream run id.
- Instance status returns the upstream status and the registered capability flags. `tasks: false` makes `POST /v1/tasks` return `UNSUPPORTED_CAPABILITY` and does not invent a task.
- Another tenant reading the session gets 404.
- The same tenant can register two instances. Each session uses its own upstream.
- Closing and reopening the route file keeps the session.

## Acceptance map

| Acceptance | Result |
| --- | --- |
| Create, send, status follow the upstream | fixture upstream, not D03 Hermes |
| Unsupported capability stays false | tasks false, HTTP 400 |
| Two instances, one tenant | inst-a and inst-b |
| Cross-tenant deploy and session | 404 |
| Upstream URL from admin registry | evil URL receives no request |

## Assumptions

- Identity is injected by `verify`. This task does not validate OIDC tokens.
- Route rows are JSON with the columns in `migrations/001_routes.sql`.
