# Spec: P3-05 plugin registry

## Behavior

- Publish checks SHA-256, signer revocation, approval, secret text, archive paths, and entry size.
- Install refuses a release from another tenant.
- Adding a permission returns the release with `approved: false`.
