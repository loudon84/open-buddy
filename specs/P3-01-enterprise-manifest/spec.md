# Spec: P3-01 enterprise manifest

## Behavior

- `negotiate` accepts a semver package whose permissions and surfaces are known.
- It rejects a bad semver, a duplicate id, a dependency cycle, an unknown permission, and an unsupported surface.
- `customer.read` adds no grant.
- `serializePiTrack` still emits the existing pi row.
