# Spec: P0-03 Hermes capability matrix

## Goal

Record what the local Work client actually calls, and refuse a staging probe until D03 exists.

## In scope

- Capability matrix and deployment prerequisites.
- Checker for `--fixtures`, and a hard failure for `--profile=staging`.

## Out of scope

- Contacting any Hermes server.
- Treating `/api/v1` or `/v1` client paths as confirmed upstream routes.

## Acceptance mapping

| Roadmap Acceptance | How it is verified |
| --- | --- |
| Each capability is observed-client, contract-tested, or unsupported | Checker requires the seven ids and rejects contract-tested while unprobed |
| Missing server implementation is explicit | `serverImplemented: unknown` and `probed: false` |
| Deploy, license, and credential owners are declared | deployment-prerequisites.md |
| Unknowns block e2e, not DTOs | prerequisites say P0-04 may continue |

## Assumptions

- Adopted Q1 and Q2. D03.
