# Spec: P2-04 task projection

## Behavior

- A repeated event id does not apply again.
- A later business title does not clear `runTerminal`.
- Restoring from the snapshot returns the same seq list.
- An artifact ref that is a local path is rejected.
- Resolve fails for another tenant and after revoke.
