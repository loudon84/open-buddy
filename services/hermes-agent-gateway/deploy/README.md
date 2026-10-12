# Runtime deployment

This directory describes the gateway process. It does not publish an image and it does not contact a staging host.

Readiness is false until the route file is readable and the registered upstream answers. TLS, a positive rate limit, and a `secret://` reference are required before a real start. Secret values are not stored in this repository.

Rollback turns the remote flag off for new sessions. Existing remote session ids stay on `remote-hermes`.
