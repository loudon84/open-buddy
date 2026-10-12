# Evidence: P3-05

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P3-05.test.ts` — exit 0.

## Result

A matching digest installed for tenant-a and was refused for tenant-b. Hash mismatch, a revoked key, an unapproved package, a `SECRET=` line, a `..` path, and a 2 MB entry were rejected. Adding `plugin.tool.execute` cleared approval.

## Limits

D09's production approver is not signed.
