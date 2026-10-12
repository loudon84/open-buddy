# Grilling: P0-04 runtime contract

- **Date**: 2026-10-12
- **REQ**: REQ-R02, REQ-G03, REQ-W02
- **Decisions applied**: D03

## Frontier

### Q1. Which paths are the contract?

- **Question**: Use the Work client paths from P0-03, or the project `/v1` contract in REQ-G03?
- **Recommended**: The project `/v1` contract. P0-03 paths stay observations. `/api/session/*` is not added.
- **Resolution**: adopted

### Q2. Where does disconnect go?

- **Question**: Invent `POST /v1/disconnect`, or keep disconnect local?
- **Recommended**: Disconnect closes the local transport and has no HTTP route. It does not cancel a remote run.
- **Resolution**: adopted

### Q3. How is a cross-tenant read answered?

- **Question**: 403 with the other tenant's id, or 404?
- **Recommended**: 404 NOT_FOUND, so the caller cannot learn that the other tenant's session exists.
- **Resolution**: adopted

## ADR needed

- none. The path choice is REQ-G03, and disconnect is REQ-R03.
