# Roadmap ledger

Branch: `roadmap/enterprise-agent-os`  
Updated: 2026-10-12  
Rule: one Task per session, in the order below. A Task starts only after every dependency is `done` or `done-fixture`.

Status values: `pending`, `in-progress`, `done`, `done-fixture`, `blocked`. See [WORKFLOW.md](WORKFLOW.md).

## Phase gates

| Phase | Tasks | Exit | Status |
| --- | --- | --- | --- |
| 0 | P0-01–P0-06 | Baseline, contracts, CI wiring, runnable fixtures | exited with recorded limits: vitest 159 failed / 7360 passed; tenant probe has no tokens; D03 unprobed |
| 1 | P1-01–P1-08 | Local Pi regression plus real remote Hermes, or external block D03 | open |
| 2 | P2-01–P2-07 | Nine isolation paths; production still waits on D01/D02 | open |
| 3 | P3-01–P3-07 | Signed private registry, isolated third-party fixture, old Pi extensions | open |
| 4A | P4A-01–P4A-07 | Knowledge and six-format preview; real exit waits on D04 | open |
| 4B | P4B-01–P4B-06 | Browser policy and controlled actions; real sites wait on D05 | open |
| 4C | P4C-01–P4C-05 | Customer draft and approved commit; real CRM waits on D06 | open |
| 4D | P4D-01–P4D-04 | Metric query and explain; real totals wait on D07 | open |
| 4E | P4E-01–P4E-05 | Ontology prepare/commit and yearly evidence; real ERP waits on D08 | open |

Production gates stay closed. `done-fixture` does not flip a phase exit to passed when that exit needs a real environment.

## External blocks

| Gate | Missing environment | Tasks that may end done-fixture |
| --- | --- | --- |
| D03 | Authorized Hermes staging | P0-03, P1-02, P1-07, P1-08 |
| D04 | Knowledge service with ACL, version, delete | P4A-01, P4A-03, P4A-07 |
| D05 | Approved sites and credential policy | P4B-02, P4B-04, P4B-06 |
| D06 | Real CRM fields and approval | P4C-01, P4C-04, P4C-05 |
| D07 | Signed metrics and data source | P4D-01, P4D-04 |
| D08 | ERP connector and quote approval | P4E-01, P4E-03, P4E-04 |
| D11 | Measured capacity hardware | P1-08 and any production SLA claim |

## Tasks

| Task | Depends on | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| P0-01 | — | done | specs/P0-01-baseline-inventory/evidence.md | 73-file apps/work closure; React ranges unchanged; vitest not installed |
| P0-02 | P0-01 | done | specs/P0-02-enterprise-boundaries/evidence.md | ADR-0001; spec-only checker; repo import scan waits for P0-06 |
| P0-03 | P0-01 | done-fixture | specs/P0-03-hermes-matrix/evidence.md | Client observations only; D03 staging not probed |
| P0-04 | P0-02, P0-03 | done | specs/P0-04-runtime-contract/evidence.md | Project /v1 contract only; not an upstream probe |
| P0-05 | P0-02, P0-04 | done | specs/P0-05-workspace-plugin-contract/evidence.md | D01 roles; sandbox fail-closed; not the Phase 2 service |
| P0-06 | P0-04, P0-05 | done | docs/architecture/validation-baseline.md | Packages discovered. typecheck/lint/build 0. vitest exit 1 kept. Tenant script exit 2 without tokens |
| P1-01 | P0-06 | done | specs/P1-01-local-pi-adapter/evidence.md | Local scope only; fixture adapter cannot be the default |
| P1-02 | P0-04, P0-06 | done-fixture | specs/P1-02-hermes-bridge/evidence.md | Real HTTP gateway; loopback upstream only; D03 unprobed |
| P1-03 | P1-02 | done | specs/P1-03-remote-transport/evidence.md | Major check, single-flight 401, 403, Retry-After; token not logged |
| P1-04 | P1-02 | pending |  | Event log, idempotency, cancel, approval |
| P1-05 | P1-01, P1-03, P1-04 | pending |  | Session projection and resume |
| P1-06 | P1-05 | pending |  | Shell remote session and approval UI |
| P1-07 | P1-06 | pending |  | Real Hermes chain or fixture-only |
| P1-08 | P1-07 | pending |  | Runtime runbook and flag rollback |
| P2-01 | P1-08 | pending |  | Workspace relation model |
| P2-02 | P2-01 | pending |  | OIDC membership authorization |
| P2-03 | P2-02 | pending |  | Membership and Agent directory API |
| P2-04 | P2-02, P1-04 | pending |  | Task projection and Artifact ACL |
| P2-05 | P2-03, P2-04 | pending |  | Workspace shell |
| P2-06 | P2-03, P2-04 | pending |  | Audit and retention |
| P2-07 | P2-05, P2-06 | pending |  | Isolation matrix |
| P3-01 | P2-07, P0-05 | pending |  | Enterprise manifest |
| P3-02 | P3-01, P2-02 | pending |  | Plugin broker |
| P3-03 | P3-02 | pending |  | Restricted third-party UI |
| P3-04 | P3-02 | pending |  | Remote container backend |
| P3-05 | P3-01, P2-02 | pending |  | Private registry and signatures |
| P3-06 | P3-03, P3-04, P3-05 | pending |  | Install, upgrade, rollback |
| P3-07 | P3-06 | pending |  | Third-party fixture acceptance |
| P4A-01 | P3-07, P0-01 | pending |  | Knowledge migration map |
| P4A-02 | P4A-01 | pending |  | Knowledge plugin provider |
| P4A-03 | P4A-02 | pending |  | Ingestion, version, delete |
| P4A-04 | P4A-03 | pending |  | Preview contract |
| P4A-05 | P4A-04 | pending |  | Six-format preview |
| P4A-06 | P4A-03, P4A-05 | pending |  | Knowledge tools and citations |
| P4A-07 | P4A-06 | pending |  | Knowledge acceptance |
| P4B-01 | P4A-07 | pending |  | Browser runtime and profiles |
| P4B-02 | P4B-01 | pending |  | Domain policy |
| P4B-03 | P4B-02, P4A-04 | pending |  | DOM read and snapshot |
| P4B-04 | P4B-03, P3-02 | pending |  | click/fill approval |
| P4B-05 | P4B-04, P1-04 | pending |  | Desktop browser executor |
| P4B-06 | P4B-05 | pending |  | Browser acceptance |
| P4C-01 | P4B-06 | pending |  | CRM field map |
| P4C-02 | P4C-01 | pending |  | Authorized customer read |
| P4C-03 | P4C-02, P4A-06 | pending |  | Source-backed drafts |
| P4C-04 | P4C-03 | pending |  | Approved commit and outbox |
| P4C-05 | P4C-04 | pending |  | CRM acceptance |
| P4D-01 | P4C-05 | pending |  | Metric semantic model |
| P4D-02 | P4D-01 | pending |  | Policy query and cache |
| P4D-03 | P4D-02 | pending |  | Charts, explain, export |
| P4D-04 | P4D-03 | pending |  | BI acceptance |
| P4E-01 | P4D-04 | pending |  | Object catalog and schema versions |
| P4E-02 | P4E-01 | pending |  | Authorized relation query |
| P4E-03 | P4E-02, P4C-04 | pending |  | Quote prepare/commit |
| P4E-04 | P4E-03 | pending |  | Ontology acceptance |
| P4E-05 | P4E-04 | pending |  | Yearly journey and follow-up backlog |
