# Evidence: P3-02

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P3-02.test.ts` — exit 0.

## Result

An empty grant was rejected. A matching grant called successfully. A foreign tenant, a token request, and an aborted signal were rejected, and the in-flight count stayed 0. Dispose blocked later calls. `hermes.example` and `evil.example` were denied. `mcp.example` was allowed.
