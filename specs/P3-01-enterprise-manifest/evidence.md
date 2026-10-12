# Evidence: P3-01

## Commands

- `node node_modules/vitest/vitest.mjs run tests/enterprise/P3-01.test.ts` — exit 0.

## Result

A valid package was accepted. Semver, duplicate id, cycle, unknown permission, and `remote-backend` were rejected. `customer.read` did not change `plugin.session.read`. `serializePiTrack` still returned the pi source row.
