# Plan: P3-04

## Files

- New: `services/enterprise-plugin-worker/src/{runner,broker,limits}.ts`
- New: `services/enterprise-plugin-worker/deploy/README.md`
- New: `tests/enterprise/P3-04.test.ts`

## Rollback

Stop calling the gate. Do not start a container.
