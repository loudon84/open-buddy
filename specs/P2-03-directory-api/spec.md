# Spec: P2-03 directory API

## Behavior

- A member cannot change their role to a higher one.
- `updateWorkspace` requires the current revision. A stale `If-Match` throws and leaves the newer name in place.
- `provisionAgent` with the same idempotency key returns the first result, including a failed health check and its reason.
