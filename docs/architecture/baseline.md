# Architecture baseline

Frozen: 2026-10-12T04:20:19.015Z

This file records the P0-01 execution-time baseline. It does not copy source files and it does not change dependency ranges. Recording the React ranges is not a JSX compatibility pass; P0-06 runs the repository typecheck, and P4A-02 checks migrated JSX.

## Heads

| Checkout | Execution HEAD | Scan snapshot |
| --- | --- | --- |
| OpenBuddy (`E:/git/open-buddy`) | `0831ca6bb1ced2b3053c26486e736c3e5b5437a4` | `2dd37e9eaa8c35496846883c0c47b60153f9ddfb` |
| smc-copilot (`E:/git/smc-copilot`) | `68de354235f2796da8c89b869a9db70955fae20e` | `68de354235f2796da8c89b869a9db70955fae20e` |

The target scan snapshot is an ancestor, not HEAD. The source snapshot still matches HEAD. `apps/work` dirty paths: none.

Target dirty paths are left untouched:

- `?? .cursor/plans/`

## Toolchain dispositions

| Difference | Disposition |
| --- | --- |
| Source React `^19.2.1` versus target `react` / `react-dom` `^18.3.1` | Keep the target. Do not bump. |
| Target `@types/react` `^18.3.12` and `@types/react-dom` `^19.2.7` | Keep this existing combination. Compatibility is judged by target typecheck, not by editing ranges. |
| npm + Nx versus pnpm + moon | Keep `pnpm-workspace.yaml` and `moon.yml`. Do not copy `package-lock.json` or `project.json` targets. |
| `packages/runtime-client-ts` | D12. Do not copy. |

## Migration closure

73 files under `apps/work`, each classified `source-candidate` with `targetPath: null`. License for the work application is MIT (`apps/work/LICENSE`). Hashes live in [migration-inventory.json](migration-inventory.json). A hash mismatch means stop migrating that file.

The file list is the named closure (Hermes entry points, knowledge, and file preview), not every file in `apps/work`. Discovered out-of-tree specifiers are not a complete import closure.
