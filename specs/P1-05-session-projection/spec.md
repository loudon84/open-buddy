# Spec: P1-05 session projection

## Behavior

- A duplicate seq does not append the delta again.
- A seq above the next cursor is a gap and is not applied until the missing seq arrives.
- `onStreamExpired` replaces text and cursor from a snapshot. The snapshot seq is not applied again.
- A local session rejects a remote runtime id. Opening another session does not change the first session's runtime.

Workspace remains the directory. The gateway still owns run terminal state.
