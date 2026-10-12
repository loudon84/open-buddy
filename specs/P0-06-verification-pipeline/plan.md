# P0-06 Verification Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record an honest verification baseline without creating a lockfile.

**Architecture:** Probe bash and pnpm. If install starts, stop it.

**Tech Stack:** corepack pnpm 11.24.0, Git Bash.

**Spec:** `specs/P0-06-verification-pipeline/spec.md`

## Global Constraints

- Do not create or replace `pnpm-lock.yaml`.
- Do not report unrun commands as passed.

---

- [x] Probe bash and pnpm.
- [x] Stop `corepack pnpm typecheck` when it starts resolving packages.
- [ ] Wire moon and tsconfig after a lockfile and install exist.
