# Evidence: P1-01

## Commands

- `corepack pnpm exec vitest run tests/enterprise/P1-01.test.ts` — exit 0, 2 passed.
- `corepack pnpm exec tsc --noEmit -p packages/runtime/openbuddy-runtime-adapter/tsconfig.json` — exit 0.

## Acceptance

| Item | Result |
| --- | --- |
| Old session loads and continues | passed in fixture port |
| Offline chat | passed; empty endpoint, receipt accepted |
| Permission / tool / error / cancel mapping | passed |
| JSONL format unchanged | adapter does not call `write`; `readPiJsonl` only reads |
| No business plugin import | adapter source has no plugin import |

## Fixture vs real

- Fixture: the test port. No live Pi process was started.
- Real Hermes: not in scope for P1-01.

## Limits

`bindLocalPiRuntime` delegates continue and send to the existing host. It does not rewrite session files.

## Review remediation (2026-10-12)

`stream` yields host events with `afterSeq` resume. `resolveApproval` needs a pending request id and calls the host. Cancel aborts the turn instead of disposing the session. See [the review record](../../docs/roadmap/review-2026-10-12.md).
