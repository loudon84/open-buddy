# OpenBuddy Fork 文件级代码改造清单

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 基线与使用
<a id="REQ-F01"></a>
**REQ-F01**：本清单是后续Cursor编码范围，当前仅修订文档。唯一目录布局见[REQ-D01](OpenBuddy-Enterprise-Fork-Monorepo目标目录设计-v1.0.md#REQ-D01)，新增均须先确认不存在，保留共享工作区现有`.cursor/`、`.ges/`、`.specify/`、`AGENTS.md`、`prd/`。不执行整仓替换、删除、提交或push。

## 2. 修改现有接入点
<a id="REQ-F02"></a>
**REQ-F02**：

- Runtime：`electron/main/agent/pi-session-runtime.ts`、`electron/main/agent/agent-host.ts`、`electron/main/pi-stream-transport.ts`；把Pi绑定包在local adapter内，保留旧session路径。
- IPC：`electron/preload/index.ts`、`electron/main/ipc/`；新增typed methods/event allowlist，保持renderer无token。
- UI：`src/App.tsx`、`src/stores/sessions-store.ts`、`src/stores/session-store.ts`与对应`packages/ui` slot；显示runtime/scope/错误/断线状态。
- Plugin：`packages/runtime/openbuddy-plugin-host/src/plugin-manifest.ts`、`plugin-security.ts`、`src/index.ts`及SDK `packages/runtime/openbuddy-plugin-sdk/src/index.ts`；扩充schema/治理，保留旧serializer兼容。
- 身份/审计：`packages/auth/openbuddy-casdoor/src/authorization.ts`、`electron/main/casdoor/casdoor-auth.ts`、`services/casdoor-resource-gateway/src/index.ts`；只复用/新增明确接口，不赋予其Agent执行职责。
- 知识/预览：`src/lib/files/knowledge-base-runtime.ts`、`src/lib/files/electron-kb-reader.ts`、`packages/ui/openbuddy-ui-workbench/src/FilePreview.tsx`、`BrowserPreview.tsx`；保留local能力，新增企业provider，BrowserPreview继续只读预览。
- 工程：`package.json`、`pnpm-workspace.yaml`、`moon.yml`按新增包渐进接线，不覆盖目标依赖锁或源工具链。

## 3. 新增与迁移
<a id="REQ-F03"></a>
**REQ-F03**：按Monorepo布局新增runtime-adapter/hermes-client/workspace、四个服务、preview capability、五个plugins、tests与ADR。Work文件逐文件记录来源commit/hash/许可、传递依赖、目标host替换、兼容测试；借鉴Runtime lifecycle、Hermes run/SkillRun/Expert状态，不复制source整套auth/profile/db/shell。`packages/runtime-client-ts`超出用户指定迁移目录，默认作为观察到的外部依赖，由目标重写接口隔离或申请明确扩大范围。

## 4. 优先级与验收
<a id="REQ-F04"></a>
**REQ-F04**：P0是Runtime Adapter、Hermes Gateway Client、Workspace Manager、Plugin Runtime四条平台主线，不表示同时完成或同一天开工。Phase0定义四者契约；Phase1先adapter/gateway+session目录；Phase2补企业workspace；Phase3补企业plugin运行/治理；Phase4业务按顺序。每条以roadmap任务/PRD验收驱动，P1/P2不能再表示Workspace/Plugin低优先。

编码前后baseline比较、边界检查、Pi兼容、tenant隔离、plugin隔离、版本回滚证据入交付包；删除目录默认无，若需要删文件必须列证明和恢复方案。文件级清单由每个task进一步精确到新增文件/测试文件，不把目录模式当已完成迁移清单。
