# Spec: P2-06 audit retention

## Behavior

- Audit records keep actor and action only.
- Reading audit requires the `audit.read` grant.
- Legal hold and unsigned physical delete do not clear the index or cache.
- Archive clears both. `reconcile` returns missing ids.
