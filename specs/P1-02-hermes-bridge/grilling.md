# Grilling: P1-02 Hermes bridge

- **Date**: 2026-10-12
- **REQ**: REQ-H02, REQ-H03, REQ-G03
- **Decisions applied**: D03 is not available

## Frontier

### Q1. Where does the upstream URL come from?

- **Question**: Trust the client body, or only an admin registration?
- **Recommended**: Only the admin registration. A client-supplied URL is ignored.
- **Resolution**: adopted

### Q2. What does a cross-tenant read return?

- **Question**: 403, or the contract's 404 NOT_FOUND?
- **Recommended**: 404 NOT_FOUND, matching the P0-04 fixture.
- **Resolution**: adopted

### Q3. Is a local test upstream the same as Hermes?

- **Question**: Close the task as done when a loopback server answers, or keep the real probe open?
- **Recommended**: The gateway is a real HTTP server. The loopback upstream is a fixture. Status stays `done-fixture` until D03 is probed.
- **Resolution**: adopted

## ADR needed

- none.
