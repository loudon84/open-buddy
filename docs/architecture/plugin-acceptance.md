# Plugin acceptance

Updated: 2026-10-12

## Fixture

`tests/enterprise/plugin-isolation.test.ts` negotiates a package, publishes a hashed release, installs it, denies an IPC message, refuses a backend without the container capability, and still serializes an old Pi track and a slot track.

## Real

No third-party panel was loaded in the desktop shell. No container daemon ran. D09's production approver is unsigned. `--profile=staging` exits 2.
