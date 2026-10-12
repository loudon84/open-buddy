# Grilling: P0-03 Hermes capability matrix

- **Date**: 2026-10-12
- **REQ**: REQ-H03, REQ-K01, REQ-T04
- **Decisions applied**: D03

## Frontier

### Q1. What can we claim without a server?

- **Question**: Mark client paths as contract-tested, or only as observed-client?
- **Recommended**: observed-client only. Two clients use different event and cancel paths, so neither path is the upstream API. Resume has no upstream HTTP call in the named files, so it is unsupported. Nothing is contract-tested.
- **Resolution**: adopted
- **Why**: D03 says the client is not a server. A live probe without an authorized staging URL would risk production data.

### Q2. Does the missing server block DTOs?

- **Question**: Stop P0-04 until Hermes is deployed?
- **Recommended**: No. Unknown server behavior blocks e2e (P1-07, P1-08) and does not block the DTO contract.
- **Resolution**: adopted

## ADR needed

- none. The non-probe is D03, already recorded.
