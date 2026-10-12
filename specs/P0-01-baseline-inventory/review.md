# Review: P0-01

- **Round**: 1 of 3
- **Reviewer**: independent pass against the PRD clauses, roadmap Acceptance, constitution, and existing ADRs ([review](30ef60cf-f3d4-49a8-a8a1-c92d0cc1b0ff))
- **Verdict**: pass

## Findings

| Item | Severity | Spec location | Required change |
| --- | --- | --- | --- |
| Target scan commit in grilling was truncated | note | grilling.md Q4 | Use the full snapshot id |
| Recording React ranges is not a typecheck pass | note | spec.md Acceptance mapping | Disposition `judge-by-target-typecheck`; P0-06 and P4A-02 own the checks |
| Rows need an explicit empty target mapping | note | spec.md Behavior | `existing`/`new` stay empty; external imports are `outOfRange` and not a full closure |
| Workspace files omitted | note | spec.md Files | `pnpm-workspace.yaml` and `moon.yml` are existing, read only |
| CONTEXT.md called new | note | spec.md Files | This task creates it; there was no prior glossary |
| Range check must use literals | note | spec.md Acceptance mapping | Fail if `package.json` differs from the four recorded ranges |

## Disposition

| Finding | Action taken |
| --- | --- |
| Truncated scan commit | Fixed in grilling.md before planning |
| Typecheck wording | Spec acceptance row now says recording ranges is not a compatibility pass |
| Target mapping and closure | Spec behavior row updated |
| Workspace files | Added as read-only evidence |
| CONTEXT.md | Spec says this task creates it |
| Literal ranges | Acceptance row now requires literal equality |
