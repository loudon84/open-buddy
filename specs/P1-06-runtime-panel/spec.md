# Spec: P1-06 runtime panel

## Behavior

- The panel renders a distinct `data-phase` for accepted, running, waiting, and completed.
- Cancel from running becomes `cancel-pending` until a terminal event.
- Disconnect becomes `disconnected`.
- The panel source does not call `fetch`.
- `runtimeShellState` carries `phase` and `endpointRef` only.

The panel is the shell slot. It is not mounted in the legacy `App.tsx` in this task.
