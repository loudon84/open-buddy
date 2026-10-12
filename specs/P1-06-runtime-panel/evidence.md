# Evidence: P1-06

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P1-06.test.ts` — exit 0.
- `node node_modules/vitest/vitest.mjs run tests/enterprise/enterprise-runtime-controller.test.ts` — exit 0.
- `node node_modules/vitest/vitest.mjs run src/features/enterprise-runtime` — exit 0.
- `node node_modules/vitest/vitest.mjs run electron/main/ipc/__tests__/registry-drift.test.ts electron/main/__tests__/ipc-contract-coverage-realserver.test.ts electron/main/ipc/__tests__/channel-allowlist-parity.test.ts --testTimeout=180000 --hookTimeout=180000` — exit 0. With the default timeouts the first two time out while importing the main process graph on this machine.
- `tsc --noEmit`, `tsc -p electron/tsconfig.json --noEmit`, `tsc -p tsconfig.enterprise.json` — exit 0.

## Result

Static markup contained distinct phases for accepted, running, waiting, and completed. Cancel stayed at `cancel-pending` until the terminal event. Disconnect did not become completed. The panel source has no `fetch(`. The shell state JSON has no token.

Desktop wiring (review 2026-10-12):

- Main: `EnterpriseRuntimeController` owns `RemoteHermesAdapter`. Tenant and actor come from the Casdoor session in main; the renderer can only name sessions main created, and a tenant or actor switch drops them. The gateway URL must be https or loopback http.
- IPC: eight `enterprise-runtime:*` channels, main frame only, plus the `openbuddy://enterprise-runtime` event channel. Error codes cross IPC as a `[CODE]` prefix.
- Renderer: `EnterpriseRuntimeDock` is mounted in `App.tsx`. It renders nothing unless main reports a configured gateway.
- The controller test ran connect, create, stream, replayed send, approval with a tampered and a correct digest, and cancel against the real gateway and a loopback upstream. Emitted data had ordered unique seq values and no upstream URL or token.
- The dock test drove connect, session start, send, approval error, cancel, and stream reconnect from the last seq through mocked IPC.

## Limits

- Not run in a packaged Electron window, and `electron-vite build` was not run.
- The dock asks for the workspace and agent instance ids as text; the P2-03 directory API is not wired into it.
- The dock is a separate surface; the main chat composer still talks to local Pi only.
- `scripts/electron/audit-agent-surface.mjs` still exits 1 for failures that existed before this change.
- D03 is unprobed; the upstream in tests is a loopback fixture.
