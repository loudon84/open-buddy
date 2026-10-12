# Spec: P0-02 enterprise boundaries

## Goal

Record who owns the desktop, the agent gateway, and the resource gateway, and fail a spec check when a deny-edge is missing.

## In scope

- ADR-0001
- `docs/architecture/dependency-boundaries.json` with owners and deny edges
- `scripts/architecture/check-enterprise-boundaries.mjs --spec-only`
- A vitest wrapper and a node check that runs today

## Out of scope

- Moving directories or creating `apps/desktop`
- Implementing the agent gateway
- Scanning the whole repository for imports (P0-06 wires that once the new packages exist)
- Calling an Ekko SDK

## Behavior

| Input | Output | Failure |
| --- | --- | --- |
| `--spec-only` | Exit 0 when the ADR names all five owners and the JSON lists the three deny edges | Missing owner or deny edge |
| A fixture import from `packages/core` to `plugins/` | Reported violation when the checker is later pointed at a tree | Spec-only mode does not pretend to have scanned the repo |

## Acceptance mapping

| Roadmap Acceptance | How it is verified |
| --- | --- |
| No core to business, UI to Hermes, or portable to Electron edge | Those three denies are required by the checker |
| Agent gateway and resource gateway are different owners | ADR and JSON owners |
| No `apps/desktop` move | JSON `forbiddenRoots` contains `apps/desktop`; checker fails if that directory exists |

## Assumptions

- Adopted Q1–Q3.
- Existing paths `electron/main/agent/pi-session-runtime.ts`, `electron/preload/index.ts`, and `packages/runtime/openbuddy-plugin-host` stay where they are.

## Files

| Path | existing or new |
| --- | --- |
| `docs/adr/0001-enterprise-boundaries.md` | new |
| `docs/architecture/dependency-boundaries.json` | new |
| `scripts/architecture/check-enterprise-boundaries.mjs` | new |
| `tests/enterprise/P0-02.test.ts` | new |
| `CONTEXT.md` | existing, append terms |
