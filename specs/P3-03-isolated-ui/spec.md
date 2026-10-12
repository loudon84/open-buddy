# Spec: P3-03 isolated UI

## Behavior

- Mount requires a UI grant and returns a sandbox token plus the view ref.
- Messages that set `node`, use the `ipc` channel, or carry `secret` are denied.
- Only `resize` and `notify` pass the schema bridge.
- Changing tenant or disabling clears menus and subscriptions.
- The surface element is an iframe to `about:blank`. It does not import third-party code.
- `serializeSlotTrack` still emits the trusted slot row.
