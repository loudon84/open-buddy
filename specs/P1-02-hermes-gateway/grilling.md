# Grilling: P1-02 Hermes gateway routing

- **Date**: 2026-10-12
- **REQ**: REQ-H02, REQ-H03, REQ-G03
- **Decisions applied**: D03 is not available

## Frontier

### Q1. Where does the upstream URL come from?

- **Question**: Accept a client-supplied URL, or only an admin registration?
- **Recommended**: Only the admin registration. A URL on the session body is ignored.
- **Resolution**: adopted

### Q2. How is a cross-tenant session shown?

- **Question**: 403 or 404?
- **Recommended**: 404 NOT_FOUND, matching the P0-04 contract.
- **Resolution**: adopted

### Q3. What closes this task without D03?

- **Question**: Mark it done against a local stand-in, or done-fixture?
- **Recommended**: The HTTP server and route file are real. The upstream in the test is not Hermes, so the ledger status is done-fixture.
- **Resolution**: adopted

## ADR needed

- none
