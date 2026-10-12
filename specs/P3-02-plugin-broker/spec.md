# Spec: P3-02 plugin broker

## Behavior

- Registration fails when the grant or the resource ACL does not include the tool permission.
- A call with another tenant, a token request, or an aborted signal is denied.
- After dispose, calls fail. In-flight count returns to zero after a cancel.
- MCP connections are limited to the allow-list and cannot target Hermes.
