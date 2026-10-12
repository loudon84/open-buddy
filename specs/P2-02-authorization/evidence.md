# Evidence: P2-02

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P2-02.test.ts` — exit 0.

## Result

Forged actor, expired token, missing membership, implicit admin document read, and a changed approval hash were denied. A member read of `workspace.session.read` was allowed. The audit line did not contain a secret.

## Limits

Tokens are injected. A live OIDC provider was not called.
