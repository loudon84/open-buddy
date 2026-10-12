# Spec: P2-02 authorization

## Behavior

- A token actor that does not match the caller is denied.
- An expired token is denied.
- A caller with no membership in the resource tenant is denied.
- A role only allows the actions in its D01 grant list. tenant-admin does not receive `workspace.document.read`.
- An approval whose parameter hash changed is denied.
- The audit line contains the actor, tenant, and decision. It does not contain a secret.
