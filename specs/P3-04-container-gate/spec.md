# Spec: P3-04 container gate

## Behavior

- A package without `remote-backend` is not installed.
- A null runtime is refused. There is no in-process fallback.
- A launch requires a non-root user, a read-only root, no network, no host filesystem, no secrets, and positive limits.
- A path containing `..`, `/host`, or `secret` is refused.
