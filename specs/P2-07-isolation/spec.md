# Spec: P2-07 isolation

## Behavior

- List, id, search, cache, event, download, tool, approval, and member rows are visible only inside the caller tenant and workspace.
- Revoke clears the cache and the next read is empty.
- Restore reports gateway ids missing from the directory snapshot.
- Local Pi migration still moves zero sessions.
- `--profile=staging` exits 2.
