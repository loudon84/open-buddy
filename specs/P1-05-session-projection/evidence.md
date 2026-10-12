# Evidence: P1-05

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P1-05.test.ts` — exit 0, 1 passed.
- `node node_modules/typescript/bin/tsc --noEmit -p packages/runtime/openbuddy-workspace/tsconfig.json` — exit 0.

## Result

Duplicate seq 1 stayed `"a"`. Seq 3 was a gap until seq 2 arrived, then the text was `"abc"`. A snapshot replaced the remote session with `"snap"` and seq 4 was not applied again. A remote event did not change the local session.
