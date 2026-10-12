# Spec: P1-02 Hermes bridge

## Scope

A Node HTTP gateway stores instance routes and calls the upstream URL from that registry. It does not start a local Hermes process.

## Behavior

- A tenant admin registers an instance. A body tenant id that differs from the verified identity is 404.
- Creating a session calls the registered upstream and stores the upstream session id. A client `upstreamUrl` is not called.
- Sending a message returns the upstream run id with status `accepted`.
- Instance status returns the upstream status and the registered capability flags. `tasks: false` makes `POST /v1/tasks` return `UNSUPPORTED_CAPABILITY` without pretending the call succeeded.
- Another tenant reading the session gets 404.
- The route file survives a process restart.

## Acceptance map

| Acceptance | Result |
| --- | --- |
| Create, send, status follow the upstream | fixture upstream ids and status |
| Unsupported capability stays false | tasks false, 400 UNSUPPORTED_CAPABILITY |
| Two instances in one tenant | inst-a and inst-b |
| Cross-tenant deploy and session | 404 |
| Upstream URL only from admin registry | evil URL received no requests |

## Assumptions

- Identity is injected by a verifier. This task does not validate OIDC tokens.
- Real Hermes staging is D03 and is not claimed.
