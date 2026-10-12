# Spec: P1-03 transport

## Behavior

- `RemoteHermesAdapter.connect` rejects protocol major 2.
- Concurrent 401 responses share one `refresh()` and each request retries once.
- 403 does not refresh or retry.
- 429 sleeps for `Retry-After` seconds and retries once.
- Log lines do not contain the access token.
- `packages/runtime/openbuddy-hermes-client` does not import Electron.

## Acceptance

All of the items above are covered by `tests/enterprise/P1-03.test.ts`.
