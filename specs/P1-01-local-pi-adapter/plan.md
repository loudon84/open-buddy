# Plan: P1-01

## Files

- Existing: `electron/main/agent/pi-session-runtime.ts` (unchanged behavior).
- New: `packages/runtime/openbuddy-runtime-adapter/src/adapter-registry.ts`
- New: `packages/runtime/openbuddy-runtime-adapter/src/local-pi-events.ts`
- New: `electron/main/runtime/local-pi-adapter.ts`
- New: `electron/main/runtime/bind-local-pi.ts`
- New: `tests/enterprise/P1-01.test.ts`

## Steps

1. Failing test for local continue, event map, enterprise refusal, and fixture default.
2. Implement the registry, event map, and adapter.
3. Bind the existing runtime with a read-only JSONL load.
4. Run `pnpm exec vitest run tests/enterprise/P1-01.test.ts` and the adapter package typecheck.

## Rollback

Revert this task commit. Do not delete existing Pi session files.
