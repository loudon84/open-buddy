# Evidence: P1-02

## Command

`corepack pnpm exec vitest run tests/enterprise/P1-02.test.ts` — exit 0, 1 passed.

## Fixture

The upstream processes were local Node HTTP servers on 127.0.0.1. They are not Hermes.

## Real

D03 staging was not probed. This task is done-fixture.

## Checked

- Session id and run id came from the registered upstream.
- `tasks: false` returned `UNSUPPORTED_CAPABILITY`.
- tenant-a used inst-a and inst-b.
- tenant-b session read and a cross-tenant register were 404.
- The unused URL received no request.
- A second process opened the same route file and read the session.
