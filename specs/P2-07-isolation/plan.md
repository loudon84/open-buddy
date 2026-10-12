# Plan: P2-07

## Files

- New: `services/enterprise-workspace/src/isolation.ts`
- New: `tests/enterprise/workspace-isolation.test.ts`
- New: `scripts/enterprise/workspace-smoke.mjs`
- New: `docs/architecture/workspace-acceptance.md`
- New: `services/enterprise-workspace/deploy/README.md`

## Rollback

Remove the matrix. Do not delete tenant data from a real database; this task has no production database.
