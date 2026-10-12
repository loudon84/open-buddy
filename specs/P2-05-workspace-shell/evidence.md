# Evidence: P2-05

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P2-05.test.ts` — exit 0.

## Result

Switching to tenant-b cleared `old`. A late tenant-a item was dropped. Offline markup showed the timestamp and `data-tenant="tenant-b"`. The state file has no token and no jsonl.

## Limits

The slot is not mounted in `App.tsx`, so this was not exercised in a browser session.
