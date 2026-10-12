# Roadmap ledger

Branch: `roadmap/enterprise-agent-os`  
Updated: 2026-10-12  
Rule: one Task per session, in the order below. A Task starts only after every dependency is `done` or `done-fixture`.

Status values: `pending`, `in-progress`, `done`, `done-fixture`, `blocked`. See [WORKFLOW.md](WORKFLOW.md).

## Phase gates

| Phase | Tasks | Exit | Status |
| --- | --- | --- | --- |
| 0 | P0-01–P0-06 | Baseline, contracts, CI wiring, runnable fixtures | exited with recorded limits: vitest 159 failed / 7360 passed; tenant probe has no tokens; D03 unprobed |
| 1 | P1-01–P1-08 | Local Pi regression plus real remote Hermes, or external block D03 | waiting on D03; fixture drill recorded; D11 unmeasured |
| 2 | P2-01–P2-07 | Nine isolation paths; production still waits on D01/D02 | fixture matrix recorded; production waits on D01/D02 |
| 3 | P3-01–P3-07 | Signed private registry, isolated third-party fixture, old Pi extensions | fixture chain recorded; D09 unsigned; no container daemon |
| 4A | P4A-01–P4A-07 | Knowledge and six-format preview; real exit waits on D04 | fixture chain recorded; D04 unprobed |
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
| P1-04 | P1-02 | done | specs/P1-04-command-log/evidence.md | Replay, one terminal, approval rejection, reconciliation |
| P1-05 | P1-01, P1-03, P1-04 | done | specs/P1-05-session-projection/evidence.md | Duplicate seq, gap, snapshot, separate runtimes |
| P1-06 | P1-05 | done | specs/P1-06-runtime-panel/evidence.md | Phase slot; not mounted in legacy App.tsx |
| P1-07 | P1-06 | done-fixture | specs/P1-07-runtime-faults/evidence.md | Upstream 500 fixture; D03 not probed |
| P1-08 | P1-07 | done-fixture | specs/P1-08-runtime-operations/evidence.md | Flag rollback drill; no deploy; D11 unmeasured |
| P2-01 | P1-08 | done | specs/P2-01-workspace-model/evidence.md | Membership rows; Pi history not migrated |
| P2-02 | P2-01 | done | specs/P2-02-authorization/evidence.md | D01 grants; admin is not an implicit document read |
| P2-03 | P2-02 | done | specs/P2-03-directory-api/evidence.md | No self-promotion; stale revision 409 |
| P2-04 | P2-02, P1-04 | done | specs/P2-04-task-projection/evidence.md | Duplicate events ignored; artifact revoke denies |
| P2-05 | P2-03, P2-04 | done | specs/P2-05-workspace-shell/evidence.md | Scope switch drops stale items; not mounted in App.tsx |
| P2-06 | P2-03, P2-04 | done | specs/P2-06-audit-retention/evidence.md | Physical delete blocked until D02 is signed |
| P2-07 | P2-05, P2-06 | done | specs/P2-07-isolation/evidence.md | Nine fixture paths; D01/D02 unsigned |
| P3-01 | P2-07, P0-05 | done | specs/P3-01-enterprise-manifest/evidence.md | Legacy alias does not widen grants |
| P3-02 | P3-01, P2-02 | done | specs/P3-02-plugin-broker/evidence.md | Grant rechecked at call time; no direct Hermes URL |
| P3-03 | P3-02 | done | specs/P3-03-isolated-ui/evidence.md | Sandboxed frame; scope change clears menus |
| P3-04 | P3-02 | done-fixture | specs/P3-04-container-gate/evidence.md | Policy gate only; no container daemon |
| P3-05 | P3-01, P2-02 | done | specs/P3-05-plugin-registry/evidence.md | Private catalog; new permission clears approval; D09 unsigned |
| P3-06 | P3-03, P3-04, P3-05 | done | specs/P3-06-plugin-lifecycle/evidence.md | Failed upgrade keeps the old version |
| P3-07 | P3-06 | done-fixture | specs/P3-07-plugin-fixtures/evidence.md | Fixture chain; staging exits 2; no container daemon |
| P4A-01 | P3-07, P0-01 | done-fixture | specs/P4A-01-knowledge-map/evidence.md | HTTP provider mapped; facade excluded; D04 unprobed |
| P4A-02 | P4A-01 | done-fixture | specs/P4A-02-knowledge-provider/evidence.md | Tenant filter in the provider; D04 unprobed |
| P4A-03 | P4A-02 | done-fixture | specs/P4A-03-ingestion/evidence.md | Idempotent upload and three-store delete; D04 unsigned |
| P4A-04 | P4A-03 | done | specs/P4A-04-preview-contract/evidence.md | Three providers; remote local paths refused |
| P4A-05 | P4A-04 | done | specs/P4A-05-preview-safety/evidence.md | Six formats; script, MIME, SSRF, and path checks |
| P4A-06 | P4A-03, P4A-05 | done-fixture | specs/P4A-06-knowledge-tools/evidence.md | Citations from the authorized version; D04 unprobed |
| P4A-07 | P4A-06 | done-fixture | specs/P4A-07-knowledge-acceptance/evidence.md | Fixture chain; staging exits 2; phase stays open |
| P4B-01 | P4A-07 | done-fixture | specs/P4B-01-browser-runtime/evidence.md | Isolated profile; CDP port unset |
| P4B-02 | P4B-01 | done-fixture | specs/P4B-02-domain-policy/evidence.md | Registrable domain and port; D05 unprobed |
| P4B-03 | P4B-02, P4A-04 | done | specs/P4B-03-page-read/evidence.md | Title and text snapshot; evaluate refused |
| P4B-04 | P4B-03, P3-02 | done | specs/P4B-04-browser-actions/evidence.md | Fresh approval required; CRM bypass refused |
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
