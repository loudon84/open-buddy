# Evidence: P1-06

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P1-06.test.ts` — exit 0.

## Result

Static markup contained distinct phases for accepted, running, waiting, and completed. Cancel stayed at `cancel-pending` until the terminal event. Disconnect did not become completed. The panel source has no `fetch(`. The shell state JSON has no token.

## Limits

The panel is not mounted in `App.tsx`, so this was not exercised in a browser session.
