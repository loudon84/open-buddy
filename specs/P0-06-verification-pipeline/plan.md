# P0-06 Verification Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Discover the new packages and record a real verification baseline without committing a lockfile.

**Architecture:** pnpm workspace already globs `packages/runtime/*`. Moon and tsconfig need a project file and path aliases. The boundary checker scans a fixture and the real tree.

**Tech Stack:** corepack pnpm 11.24.0, moon, Git Bash, Node.

**Spec:** `specs/P0-06-verification-pipeline/spec.md`

## Global Constraints

- Do not commit `pnpm-lock.yaml` or `node_modules`.
- Do not report a command as passed unless it exited 0.
- Do not send tenant tokens.

---

- [x] Add moon projects, tsconfig paths, the deny-edge fixture, and `verify:enterprise-boundaries`.
- [ ] `corepack pnpm install` without staging the lockfile.
- [ ] Run typecheck, lint, test, build, both boundary verifies, and the tenant script via Git Bash.
- [ ] Write `docs/architecture/validation-baseline.md` from those exits.
