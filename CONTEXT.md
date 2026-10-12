# OpenBuddy Enterprise

Desktop agent product being extended, on the current tree, into an enterprise agent workspace. Local conversations stay on this product's existing agent runtime.

## Language

**Migration candidate**:
A file under the `apps/work` application whose hash and license are frozen before a later task copies or rewrites it.
_Avoid_: upstream dump, source tree

**Out-of-range dependency**:
A package outside `apps/work` that a migration candidate imports or names. It is not copied into this repository.
_Avoid_: vendored transitive dependency

**Local Pi**:
The desktop agent runtime already shipped in this repository. A session created on it stays on it.
_Avoid_: Local Hermes, embedded enterprise server
