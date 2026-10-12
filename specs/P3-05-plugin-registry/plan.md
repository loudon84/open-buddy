# Plan: P3-05

## Files

- New: `services/enterprise-plugin-registry/src/{catalog,releases,signatures,approvals}.ts`
- New: `services/enterprise-plugin-registry/deploy/README.md`
- New: `tests/enterprise/P3-05.test.ts`

## Rollback

Remove the catalog. Installed desktop plugins are unchanged.
