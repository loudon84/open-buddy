# Spec: P2-01 workspace model

## Behavior

- A user may have memberships in more than one tenant.
- An org parent that loops, or a parent in another tenant, is rejected.
- A workspace cannot point at an org in another tenant.
- A task record stores `runId` and `runStateOwner: gateway`.
- Local Pi history is not copied.
- Retention must be set to `archive` or `physical-delete`.
