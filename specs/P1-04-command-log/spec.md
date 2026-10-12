# Spec: P1-04 command log

## Behavior

- `execute` stores one receipt per idempotency key. A reload does not create a second run.
- A different body hash for that key throws `CommandConflict`.
- `finish` allows one terminal event per run, serialized across concurrent callers.
- An approval at or after `expiresAt`, or with a different params hash, or already decided, is rejected.
- `recordUnknown` appends a reconciliation row.

The gateway message route uses this log, so a repeated key does not call the upstream again.
