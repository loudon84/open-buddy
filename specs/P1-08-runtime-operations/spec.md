# Spec: P1-08 runtime operations

## Behavior

- Readiness is false when the database or the upstream is down.
- A deployment config needs TLS, a positive rate limit, and a `secret://` reference.
- Restoring the command log keeps the receipt and the seq list.
- Rollback with the remote flag off does not change an existing remote runtime id. The next session is `local-pi`.
- `scripts/enterprise/runtime-smoke.mjs --profile=staging` exits 2.
