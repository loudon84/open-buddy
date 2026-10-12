# Grilling: P1-03 transport

- **Date**: 2026-10-12
- **REQ**: REQ-G02, REQ-R02

## Frontier

### Q1. Where does the access token live?

- **Question**: Put the bearer token in the portable client logs, or keep it in the caller?
- **Recommended**: The transport sends the header and logs only status, method, and path. The renderer never receives the token.
- **Resolution**: adopted

### Q2. How many refreshes follow a 401?

- **Question**: Refresh per request, or one shared refresh?
- **Recommended**: One in-flight refresh, then a single retry. 403 is returned as-is. 429 waits for Retry-After once.
- **Resolution**: adopted

### Q3. What is an incompatible handshake?

- **Question**: Accept any version string, or only major 1?
- **Recommended**: Reject a major other than 1 before treating the session as connected.
- **Resolution**: adopted

## ADR needed

- none
