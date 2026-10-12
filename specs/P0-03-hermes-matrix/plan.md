# P0-03 Hermes Capability Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a fixture-only Hermes capability matrix from the local Work client.

**Architecture:** JSON matrix plus a checker that rejects a live profile.

**Tech Stack:** Node.js.

**Spec:** `specs/P0-03-hermes-matrix/spec.md`

## Global Constraints

- Do not probe a network service.
- Do not read production secrets.
- Do not mark a capability contract-tested.

---

- [x] Read the named client files and record only calls that are present.
- [x] Run the fixtures checker.
