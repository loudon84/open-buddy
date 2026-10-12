# Evidence: P1-04

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P1-04.test.ts tests/enterprise/P1-02.test.ts` — exit 0.

## Result

The same key replayed one receipt and did not create a second run after reload. A changed body threw `CommandConflict`. Concurrent cancel and complete produced one terminal event. Expired, changed, and repeated approvals were rejected. An unknown external write was stored for reconciliation.

## Fixture vs real

This is the gateway command log. It does not prove a real Hermes restart.

## Review remediation (2026-10-12)

Receipts were keyed by idempotency key alone, so a second session reusing a key got the first run. Receipts are now keyed by tenant, workspace, operation, resource, and key. See [the review record](../../docs/roadmap/review-2026-10-12.md).
