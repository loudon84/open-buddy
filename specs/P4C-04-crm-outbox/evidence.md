# Evidence P4C-04

- Fixture: `node node_modules/vitest/vitest.mjs run tests/enterprise/P4C-04.test.ts` exit 0.
- Real environment: not run.

## Review remediation (2026-10-12)

Outbox keys are tenant-scoped. Commit needs an approval record for the same tenant and body. Reconciliation looks rows up by key; the earlier version compared the wrong field. See [the review record](../../docs/roadmap/review-2026-10-12.md).
