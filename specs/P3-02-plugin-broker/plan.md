# Plan: P3-02

## Files

- New: `packages/runtime/openbuddy-plugin-host/src/enterprise-broker.ts`
- New: `packages/runtime/openbuddy-plugin-host/src/tool-registration.ts`
- New: `tests/enterprise/P3-02.test.ts`

## Rollback

Remove the broker. Existing plugin host security checks stay.
