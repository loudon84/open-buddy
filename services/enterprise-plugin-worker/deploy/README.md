# Plugin worker

This directory describes a container launch profile. The process does not start a container and it does not fall back to `worker_threads`, `node:vm`, or the Electron main process.

A backend package without the `remote-backend` capability is refused. A launch requires a non-root user, a read-only root filesystem, no network, no host filesystem, and no secrets, plus timeout, CPU, and memory limits.
