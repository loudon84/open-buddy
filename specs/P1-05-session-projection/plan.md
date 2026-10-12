# Plan: P1-05

## Files

- New: `packages/runtime/openbuddy-workspace/src/session-projection.ts`
- New: `electron/main/runtime/session-coordinator.ts`
- New: `tests/enterprise/P1-05.test.ts`

## Rollback

Remove the projection module. Existing Pi JSONL sessions stay where they are.
