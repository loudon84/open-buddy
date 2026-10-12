# Spec: P3-06 plugin lifecycle

## Behavior

- A schema below the policy minimum fails the upgrade and leaves the previous version enabled.
- Rollback of a revoked permission is blocked.
- Disable clears routes, tools, and MCP registrations.
- Uninstall returns the business rows and removes the plugin state.
