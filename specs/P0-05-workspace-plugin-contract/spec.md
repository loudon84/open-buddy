# Spec: P0-05 workspace and plugin contract

## Goal

Add workspace membership decisions and an enterprise manifest check that fails closed when a sandbox is required and missing.

## Acceptance mapping

| Roadmap Acceptance | How it is verified |
| --- | --- |
| A user can belong to more than one tenant | Fixture memberships on t1 and t2 for the same actor |
| Unknown business role is marked D01 | permission-matrix.json unknownRole |
| Missing sandbox fails closed | validateEnterpriseManifest(..., false) for remote-backend |
| Legacy permission alias does not widen a grant | `customer.read` is rejected |

## Assumptions

- Adopted Q1–Q3. D01.
