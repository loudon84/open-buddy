# Grilling: P3-01 manifest

- **Date**: 2026-10-12
- **REQ**: REQ-P02, REQ-SDK01

## Frontier

### Q1. Does a legacy alias add permissions?

- **Question**: Map `customer.read` onto `plugin.customer.read`, or leave it empty?
- **Recommended**: Leave it empty. A legacy alias cannot widen the grant.
- **Resolution**: adopted

### Q2. Where does the checker live?

- **Question**: A second plugin SDK, or the existing package?
- **Recommended**: The existing `@openbuddy/plugin-sdk`, next to `validateEnterpriseManifest`.
- **Resolution**: adopted

## ADR needed

- none
