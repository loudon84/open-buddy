# P0-05 Workspace and Plugin Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Check membership decisions and enterprise manifest rules without claiming tenant isolation is finished.

**Architecture:** Pure functions over D01 roles and the SDK permission shape.

**Tech Stack:** TypeScript modules checked by a Node script.

**Spec:** `specs/P0-05-workspace-plugin-contract/spec.md`

## Global Constraints

- Do not treat UI filtering as authorization.
- Do not widen grants through legacy permission aliases.

---

- [x] Add the modules, matrix, and checker.
- [x] Run `node scripts/architecture/check-workspace-plugin-contract.mjs`.
