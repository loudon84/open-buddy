# OpenBuddy Enterprise Fork Monorepo 目标目录设计

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 原位演进原则
<a id="REQ-D01"></a>
**REQ-D01**：实际仓库不是apps/desktop布局。首年保留Electron主进程`electron/main`、preload `electron/preload`、renderer `src`、UI `packages/ui/openbuddy-ui-*`，apps/admin-portal与apps/openbuddy-website不重命名。下面标“新增建议”的路径尚未创建；实际实施发现更合适现有模块时先更新ADR和任务映射，禁止无意覆盖原有包。

## 2. 唯一目标布局

```text
electron/main/agent/                        [现有] Pi/host/marketplace
electron/main/ipc/                          [现有] 可信IPC
electron/preload/                          [现有] allowlist桥
electron/main/runtime/                     [新增建议] runtime coordinator
electron/main/browser/                     [新增建议] Chromium/executor宿主
src/                                       [现有] Shell/store/启动集成
packages/ui/openbuddy-ui-*/                 [现有] Slot-only UI
packages/ui/openbuddy-ui-enterprise/        [新增建议] Workspace/admin UI
packages/core/openbuddy-session/            [现有] Local session基础设施
packages/runtime/openbuddy-plugin-host/     [现有扩展] lifecycle/security
packages/runtime/openbuddy-plugin-sdk/      [现有扩展] 兼容serializer+企业SDK
packages/runtime/openbuddy-runtime-adapter/ [新增建议] portable contract/registry
packages/runtime/openbuddy-hermes-client/   [新增建议] 项目Gateway client
packages/runtime/openbuddy-workspace/       [新增建议] typed workspace DTO/client
packages/capability/openbuddy-file-preview/ [新增建议] 授权preview service/provider
packages/auth/openbuddy-casdoor/            [现有] identity/membership复用
packages/auth/openbuddy-permission/         [现有] Pi/tool permission复用
services/casdoor-resource-gateway/          [现有] 资源/授权，非Agent Gateway
services/hermes-agent-gateway/              [新增建议] 企业兼容桥/事件/幂等
services/enterprise-workspace/              [新增建议] Workspace权威服务
services/enterprise-plugin-registry/        [新增建议] 私有package/trust目录
services/enterprise-plugin-worker/          [新增建议] 受限远端容器执行
plugins/{knowledge,browser,crm,bi,ontology}/ [新增建议] 业务插件
tests/enterprise/                          [新增建议] 契约/集成fixture
docs/architecture/                         [新增建议文件] ADR/迁移清单/运维
```

`plugins/`、新增services/package必须显式接入pnpm-workspace、moon、tsconfig references、alias和构建发布路径；目录存在不代表workspace会自动发现。UI编辑遵循`packages/ui/AGENTS.md` Slot-only/apply注册；不要把企业功能全写在src/App.tsx。

## 3. 依赖方向与分层
<a id="REQ-D02"></a>
**REQ-D02**：portable runtime/workspace DTO包不导入Electron/React/Pi；main适配器可依赖Pi/Node；UI只依赖DTO+preload façade。Plugin业务依赖SDK/broker，core与runtime contract不得反向依赖CRM/Knowledge。Plugin Host位于已有runtime目录，内部只做基础设施，与Agent Runtime概念区分。Browser process manager放main，业务工具放plugins/browser。

不新增重复`enterprise/auth`、`sdk/runtime-sdk`、`apps/runtime`；复用现有auth/runtime包结构。未来Web/Mobile经D09立项时可新增apps/web、apps/mobile，但不在本期搬桌面源目录为此制造重构成本。

## 4. 验收
<a id="REQ-D03"></a>
**REQ-D03**：新包均被workspace/typecheck/build发现；import-boundary测试拒绝UI直连Hermes、portable→Electron、core→业务；现有Pi/Plugin/UI build仍通过。每次迁移清单写明新增/修改/无需删除，Phase0默认无目录删除。
