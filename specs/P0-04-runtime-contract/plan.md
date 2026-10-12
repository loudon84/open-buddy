# P0-04 Runtime Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Check in one adapter type module, one OpenAPI file, and one event schema that reject a cross-tenant read.

**Architecture:** `method-map.json` is the join between TypeScript method names and OpenAPI paths.

**Tech Stack:** TypeScript types, OpenAPI 3.0, JSON Schema.

**Spec:** `specs/P0-04-runtime-contract/spec.md`

## Global Constraints

- Do not import Electron from the adapter package.
- Do not add `/api/session` routes.
- Do not start a server.

---

- [x] Add the types, OpenAPI, event schema, and fixture.
- [x] Run `node scripts/architecture/check-runtime-contract.mjs`.
