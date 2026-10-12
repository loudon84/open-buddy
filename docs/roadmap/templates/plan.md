# Plan: <TaskId>

## Exact files

| Path | existing or new | Change |
| --- | --- | --- |
|  |  |  |

## Steps

1. Write the failing test or contract fixture at `tests/enterprise/<TaskId>.test.ts` (or the Task's named e2e file).
2. Run it and record the failure.
3. Implement the smallest change that turns that failure into a pass.
4. Cover the remaining Acceptance rows the same way.

## Verification

- Task command:
- Affected typecheck:

## Rollback

- Revert this Task's diff and feature flag.
- Do not delete receipts, audit rows, or another person's uncommitted work.
- Schema and external writes are not rolled back by deleting data.
