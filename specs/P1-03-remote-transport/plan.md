# Plan: P1-03

## Files

- New: `packages/runtime/openbuddy-hermes-client/src/{protocol,transport,client}.ts`
- New: `electron/main/runtime/remote-hermes-adapter.ts`
- New: `tests/enterprise/P1-03.test.ts`

## Rollback

Remove the client package and the adapter file. Desktop Pi sessions stay on LocalPiAdapter.
