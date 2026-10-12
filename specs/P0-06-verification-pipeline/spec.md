# Spec: P0-06 verification pipeline

## Goal

Run the existing verification commands and wire the new packages. Do not hide a baseline that cannot run.

## Acceptance mapping

| Roadmap Acceptance | Result |
| --- | --- |
| Workspace, moon, and tsconfig discover the new packages | Not done. Blocked on install |
| Existing scripts actually run | `corepack pnpm typecheck` began an install and was stopped |

## Assumptions

- Adopted Q1. No lockfile will be created in this task.
