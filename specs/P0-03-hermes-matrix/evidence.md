# Evidence: P0-03

- **Status proposed**: done-fixture
- **Environment**: Local read of `E:/git/smc-copilot` at `68de354235f2796da8c89b869a9db70955fae20e`. No network probe.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `node scripts/architecture/check-hermes-capability-matrix.mjs` | `hermes capability matrix fixtures ok` | `--fixtures` |
| `pnpm verify:hermes-contract --profile=staging` | not run | Script does not exist and D03 staging is absent |

## Acceptance

| Criterion | Evidence | Real or fixture |
| --- | --- | --- |
| Capabilities labeled | Seven rows, none `contract-tested` | fixture, from real client source |
| Missing server called out | `probed: false`, `serverImplemented: unknown` | fixture |
| Owners declared | deployment-prerequisites.md leaves license and credentials unknown | fixture |
| Unknowns block e2e only | Prerequisites name P1-07 and P1-08, and allow P0-04 | fixture |

## Limits

- Client paths disagree (`/v1` versus `/api/v1`). They are not an upstream contract.
- Phase 1 real-remote exit stays open.

## Rollback

- Revert this commit. No remote state changed.
