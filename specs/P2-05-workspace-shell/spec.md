# Spec: P2-05 workspace shell

## Behavior

- Switching tenant clears items and records the active run as background or cancelled.
- A response for the previous tenant does not enter the new cache.
- Offline sets readonly and renders the timestamp.
- The state module does not mention a token or JSONL.

The navigation slot is not mounted in the legacy `App.tsx`.
