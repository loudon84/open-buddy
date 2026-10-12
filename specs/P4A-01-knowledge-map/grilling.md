# Grilling: P4A-01 knowledge map

- **Date**: 2026-10-12
- **REQ**: REQ-K01, REQ-K02

## Frontier

### Q1. Does the remote facade move?

- **Question**: Copy `knowledge-provider-facade.ts`, or leave the unimplemented remote adapter behind?
- **Recommended**: Leave it, along with the mock adapter and mock store. The HTTP provider is the migration candidate.
- **Resolution**: adopted

### Q2. Which React version is the target?

- **Question**: Keep the source React 19 range, or the OpenBuddy React 18 range?
- **Recommended**: Target `^18.3.1`. Do not treat a source typecheck as a target pass.
- **Resolution**: adopted

## ADR needed

- none
