# Evidence P4A-03

- Fixture: `node node_modules/vitest/vitest.mjs run tests/enterprise/P4A-03.test.ts` exit 0.
- Real D04 size, scan, and retention: not decided.

## Review remediation (2026-10-12)

Upload keys and document ids are tenant-scoped. The same key with different content is a conflict. See [the review record](../../docs/roadmap/review-2026-10-12.md).
