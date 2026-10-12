# Evidence P4D-02

- Fixture: `node node_modules/vitest/vitest.mjs run tests/enterprise/P4D-02.test.ts` exit 0.
- Real environment: not run.

## Review remediation (2026-10-12)

Queries need a per-actor metric grant and filter rows by granted regions. The cache key includes the actor and policy version. See [the review record](../../docs/roadmap/review-2026-10-12.md).
