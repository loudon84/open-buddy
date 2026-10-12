# Deployment prerequisites

No Hermes staging environment was available for P0-03. The capability matrix was built from the local `apps/work` client only.

| Prerequisite | State |
| --- | --- |
| Service deployment | Not provided. D03 recommends an isolated staging tenant. The client must not be started and called a remote server. |
| License | Owner unknown. Do not copy a license key into the repo. |
| Credentials | Owner unknown. Do not read production secrets. |
| Probe profile | `fixtures` only. `pnpm verify:hermes-contract --profile=staging` does not exist yet and was not run. |

Unknown server behavior blocks end-to-end tasks P1-07 and P1-08. It does not block DTO work in P0-04.
