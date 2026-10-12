# Spec: P1-07 runtime faults

## Behavior

- An upstream HTTP 500 on session create becomes `UPSTREAM_UNAVAILABLE` and is not stored as a session.
- Fixture results and the missing D03 probe are written in separate sections of `docs/architecture/runtime-acceptance.md`.
