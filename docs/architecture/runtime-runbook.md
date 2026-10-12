# Runtime runbook

Updated: 2026-10-12

## Start

1. Confirm the route file opens and the registered upstream answers. If either check fails, readiness stays false.
2. Require TLS, a rate limit above zero, and a `secret://` reference. Do not write the secret value into the repo or the renderer.

## Restore

Copy the route file and the command log together. After restore, receipt ids and event seq values must match the copy. This runbook does not restore a live Hermes database.

## Rollback

Set the remote flag off. New sessions use `local-pi`. Do not rewrite an existing remote session onto local Pi.

## Not measured

D03 Hermes staging was not deployed. D11 hardware capacity was not measured. Those gaps stay open.
