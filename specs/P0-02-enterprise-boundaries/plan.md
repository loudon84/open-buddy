# P0-02 Enterprise Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the desktop, agent-gateway, and resource-gateway split and fail when a required deny edge is absent.

**Architecture:** ADR-0001 is the prose decision. `dependency-boundaries.json` is the machine-checked form. The checker in `--spec-only` mode validates that document and refuses a whole-repo scan.

**Tech Stack:** Node.js script, Vitest wrapper.

**Spec:** `specs/P0-02-enterprise-boundaries/spec.md`

## Global Constraints

- Do not create `apps/desktop`.
- Do not implement the agent gateway in this task.
- Do not treat the current plugin host as the enterprise sandbox.

---

- [x] Write ADR, JSON, and checker.
- [x] Run `node scripts/architecture/check-enterprise-boundaries.mjs --spec-only`.
