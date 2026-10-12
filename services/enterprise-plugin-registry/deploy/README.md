# Plugin registry

Private catalog only. There is no public paid marketplace.

A release is accepted only when its Ed25519 signature verifies against a publisher key the registry trusts. The signed payload covers the manifest id, version, sorted permissions, and the SHA-256 of every file. An unknown or revoked signer, a bad signature, a secret line, a path that escapes the archive, or an oversized entry is rejected.

A published release waits for approval. Only an approver listed for the release tenant can approve it, and only that tenant can install it. More permissions need a new signed release, which waits for approval again.

D09 is not signed: the production publisher keys and the approver list are not provisioned.
