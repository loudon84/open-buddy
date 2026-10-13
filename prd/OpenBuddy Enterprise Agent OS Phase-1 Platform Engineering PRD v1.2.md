# smc-copilot OpenBuddy Enterprise Agent OS Phase-1 Platform Engineering PRD v1.2

## 文档元数据

```yaml
title: smc-copilot OpenBuddy Enterprise Agent OS Phase-1 Platform Engineering PRD
prd_id: SMC-OE-AOS-001
version: 1.2
status: ARCHITECTURE_NORTH_STAR
product: smc-copilot Enterprise Agent OS
repository: github.com/loudon84/open-buddy
branch: roadmap/enterprise-agent-os
change_type:
  - ARCHITECTURE_CHANGE
  - PLATFORM_EXTENSION
golden_consumer:
  - Cursor
  - Codex
  - AI Coding Agent
target_release:
  Phase-1
grilling: specs/prd-aos-001/grilling.md
review: specs/prd-aos-001/review.md
execution_plan: prd/roadmap.md
execution_ledger: docs/roadmap/ledger.md
supersedes: v1.1, v1.0 (APPROVED_FOR_PLAN)
```

## 文档定位

本文档是 **架构北极星文档**：定义目标架构、四层职责边界、平台契约原则与 Non-Goal。

本文档 **不是执行计划**。任务分解、Phase 排序、Milestone 与交付验收以
[prd/roadmap.md](roadmap.md) 为唯一 source of truth；实时执行状态以
[docs/roadmap/ledger.md](../docs/roadmap/ledger.md) 为准。

**仲裁规则（v1.2 新增）**：

- **接口 / 契约细节**（接口签名、错误 schema、timeout/cancel、幂等、trace）：以
  roadmap 第 2 节列出的专项规范 REQ 与代码为准，本 PRD 不另立不兼容副本；
- **分层边界、Non-Goal、治理原则**（四层职责隔离、权限强制点位置、审批分级、
  分发信任模型）：以本 PRD 为准，专项规范不得突破。

冲突时按上述分工各自让步；分工不清的条目记录到 `specs/prd-aos-001/review.md` 处理。

**修订记录**：

- v1.1（2026-10-13）：依据 `specs/prd-aos-001/grilling.md` 的 23 项决策重写——两层
  Runtime 契约、逻辑视图映射、删 Migration Plan、补 Audit/权限强制点/策略模型/
  配置规范/审批分级、扩充 Non-Goal、Acceptance 改测试映射。
- v1.2（2026-10-13）：依据 `specs/prd-aos-001/review.md` 的 R1–R5 修复可执行性——
  新增仲裁规则与 §14 需求溯源、修正 remote_gateway 交付状态、§15 改为引用 ledger
  实时状态、§16 Acceptance 对齐 roadmap Phase 退出门槛、登记已知缺口 GAP-1~4。

---

# 1. 一句话目标

让企业员工通过 OpenBuddy Desktop 在统一桌面入口中管理和使用不同类型 Agent Runtime、企业插件以及 Browser Agent 能力，同时保持 Desktop、Runtime、Plugin、Browser 四层职责隔离。

---

# 2. 背景与问题定义

## 2.1 Current State

当前 OpenBuddy 已具备：

```text
Electron Desktop
        |
React Renderer
        |
Preload IPC
        |
Electron Main
        |
Pi Agent Runtime
```

同时已有 Skills、MCP Connectors、Experts、Plugins、Enterprise Auth 能力基础，
并已有 `packages/runtime/openbuddy-runtime-adapter`（含 session/stream/cancel/approval
完整接口）、`openbuddy-hermes-client`、`services/hermes-agent-gateway`、
`openbuddy-plugin-sdk` / `openbuddy-plugin-host` 等平台件。

## 2.2 Problem

### Runtime 强绑定

当前 Agent 执行路径为 `OpenBuddy → Pi Runtime`，导致：

- Hermes-agent 无法作为标准 Runtime 接入；
- qwenclaw 无法接入；
- nanobot 无法接入；
- 企业无法按员工/部门选择 Runtime（策略下发机制见 §6.1，数据模型 Phase-1 落地，
  下发为已知缺口 GAP-3）。

### Plugin 边界不足

当前 Plugin 偏能力扩展（Skill/MCP/Tool），缺少 Enterprise Plugin Lifecycle、Manifest、
Permission（声明 + 强制）、UI Extension、Backend Connector、Audit 能力。

### Browser 能力不足

企业 Agent 场景需要 CRM/ERP/OA/Email/BI/Web Automation，当前浏览器只是工具，不是平台。

---

# 3. Scope

## SCOPE-001 Runtime Adapter Platform

```text
OpenBuddy Desktop
        |
Runtime Manager
        |
   -----------------
   |               |
 Hermes           Pi
(local/remote)  (embedded)
```

支持：Runtime 注册、生命周期管理、配置、健康检查、切换。

Runtime 类型与交付状态（v1.2 修正，对齐 ledger）：

| type | 实例 | 状态 |
|---|---|---|
| `embedded` | Pi Runtime | 已交付（P1-01，见 ledger） |
| `local_process` | Hermes（经 hermes-agent-gateway） | 已交付（P1-02/P1-03，loopback 主链；生产退出等待外部环境 D03） |
| `remote_gateway` | RemoteHermesAdapter（企业内网集中部署） | **已交付（P1-03，REQ-G02/REQ-R02）**；生产退出等待 D03 |
| ~~container~~ | — | 从 v1 删除，见 NON-GOAL-005 |

## SCOPE-002 Enterprise Plugin Platform

```text
Plugin Marketplace（企业私有分发）
        |
Plugin Runtime（主进程隔离环境）
        |
Capability Registry（统一能力注册表）
```

支持：插件安装/卸载、权限（声明 + 强制）、UI Extension、Tool 注册、MCP 注册、Backend Connector。

## SCOPE-003 Browser Agent Platform

```text
Browser Platform
        |
Chromium Controller（BrowserView 可视态 + Playwright/CDP 自动化态）
        |
Browser Skill
        |
Agent Runtime
```

支持：浏览器 Session、页面状态、DOM Snapshot、Action Execution、企业网站自动化。

---

# 4. Architecture Boundary

最终目标架构（四层职责隔离）：

```text
                    smc-copilot Desktop
┌──────────────────────────────────────┐
│              React UI                │
│  Chat / Runtime Manager /            │
│  Plugin Center / Browser Center      │
└──────────────────────────────────────┘
                 IPC
┌──────────────────────────────────────┐
│          Enterprise Shell            │
│  Runtime Manager / Plugin Manager /  │
│  Browser Manager / Permission Manager│
│  Audit Logger                        │
└──────────────────────────────────────┘
          Runtime Adapter Layer
   ┌──────────┐            ┌──────────┐
    Hermes                   Pi
 (via gateway)            (embedded)
   └──────────┘            └──────────┘
```

---

# 5. Runtime Adapter Platform Design

## REQ-RUNTIME-001 Runtime 契约：两层模型

Runtime 契约分两层：

### Manager 层（本 PRD 定义）

负责注册、生命周期与健康：

```typescript
interface RuntimeManager {
  registerRuntime(adapter: RuntimeAdapter): void;
  getRuntime(id: string): RuntimeAdapter;
  switchRuntime(id: string): void;          // 只影响新会话的默认 Runtime
  start(id: string): Promise<void>;
  stop(id: string): Promise<void>;
  health(id: string): Promise<RuntimeHealth>;
}
```

### Session 层（以专项规范与代码为准）

会话、消息、流式事件、取消、审批、工具调用的接口以 REQ-R01~R05
（`Runtime-Adapter-SDK-Interface-Design-v1.0.md`）与
`packages/runtime/openbuddy-runtime-adapter/src/types.ts` 为准，包括：
`connect / disconnect / createSession / sendMessage / stream(AsyncIterable) /
cancel / resolveApproval / executeTask / listTools / executeTool`。

本文档不重复定义 Session 层签名（仲裁规则见"文档定位"）。

## 5.1 Runtime 绑定与切换语义

- **绑定粒度**：Runtime 绑定到**会话**；Settings 中的切换只修改全局默认值，影响新会话。
- **不迁移**：进行中的会话钉死在原 Runtime 上，不做迁移；支持多 Runtime 并发。
- **不自动 failover**：`health()` 仅用于 UI 状态展示与切换前预检；chat 中途失败 =
  该 run 失败报错，由用户手动重试或新开会话（对齐 P1-07 结论）。
- **历史会话降级**：打开历史会话但其绑定的 Runtime 不可用时，会话以只读模式打开
  （可浏览记录，发消息时提示并引导切换）。
- **上下文交接**：切换 Runtime 不做自动上下文迁移；提供可选的"交接摘要"动作
  （旧 Runtime 生成摘要文本，作为新会话首条用户消息注入），属有损交接。

## 5.2 Runtime 配置与密钥规范

配置持久化为**非密字段明文 + 密钥引用**：

```json
{
  "id": "hermes-local",
  "type": "local_process",
  "displayName": "Hermes Agent",
  "endpoint": "http://localhost:8642",
  "secretRef": "keychain:openbuddy/hermes/token",
  "adapterVersion": "1.x"
}
```

- 所有凭据只存 `secretRef` 引用，实际值落 OS keychain / Electron safeStorage，**禁止内联**；
- Desktop 启动时校验 `adapterVersion` 兼容性，不兼容的 Runtime 在 UI 置灰并说明原因；
- schema 归 `packages/runtime/openbuddy-runtime-adapter` 定义；
- **GAP-1**：`secretRef` 密钥引用规范尚无对应 roadmap Task（P1-03 仅覆盖 token 不记
  日志），需立项补齐，见 §14.2。

## 5.3 Hermes Adapter

```text
OpenBuddy
    |
HermesAdapter (openbuddy-hermes-client)
    |
hermes-agent-gateway (localhost:8642)
    |
hermes-agent (Python)
```

- HermesAdapter **经 gateway 接入**，不直连 Python 进程；
- gateway 负责 hermes-agent 进程生命周期与本机鉴权；Desktop 不 spawn Python 进程；
- gateway 未运行时：检测并在 UI 提示，默认 Runtime 降级到 Pi，用户确认后重试；
- 契约细节以 REQ-G02~G05（`Hermes-Gateway-API-Specification-v1.0.md`）为准。

## 5.4 Pi Adapter

保留 Embedded Runtime，作为默认开发 Runtime 与降级目标。

---

# 6. Runtime Registry

逻辑模块（落位见 §12 映射表）：

```text
runtime-registry    # 注册/解析/默认选择
runtime-adapter     # 两层契约
runtime-health      # 红绿灯模型，对齐 P1-07
runtime-config      # §5.2 配置 schema
```

## 6.1 Runtime 策略数据模型

企业策略的**数据模型**（Phase-1 落地模型，执行使用本地配置）：

```json
{
  "allowedRuntimes": ["pi", "hermes-local"],
  "defaultRuntime": "hermes-local",
  "scope": { "department": "*", "user": "*" }
}
```

- **GAP-3**：按部门/员工的策略**下发**在 roadmap Phase 2 中无明确 Task，需立项，
  见 §14.2。

---

# 7. Runtime UI

`Settings → Agent Runtime` 列表：Hermes Agent / Pi Runtime（后续 Nanobot、QwenClaw）。

| 字段 | 说明 |
|---|---|
| Name | Runtime 名称 |
| Version | 版本 |
| Status | 健康状态（红绿灯） |
| Endpoint | 连接地址 |
| Capabilities | 能力（来自 Session 层 listCapabilities） |

切换交互遵守 §5.1：切换 = 修改默认值；进行中的会话不受影响。

---

# 8. Enterprise Plugin Platform

## REQ-PLUGIN-001 Plugin Manifest

```json
{
  "id": "crm-plugin",
  "version": "1.0",
  "type": "enterprise",
  "permissions": ["browser", "filesystem", "network"],
  "capabilities": ["tool", "ui", "connector"],
  "requiredRuntimeCapabilities": ["tool-use"]
}
```

- `requiredRuntimeCapabilities` 为可选声明，**不做激活硬阻断**；
- 组装工具列表时按当前会话 Runtime 的 `listCapabilities()` 过滤：Runtime 不支持
  tool-use 的会话中插件工具不出现，并在插件面板提示原因；
- Manifest 字段细节以 REQ-P02 / REQ-SDK01 为准。

## 8.1 权限强制点

声明 ≠ 强制。权限在以下位置强制执行：

1. **执行位置**：插件后端逻辑在主进程的隔离执行环境中运行，不进入 Renderer；
2. **激活时授权**：激活时校验 Manifest 声明 ↔ 企业策略（§10 验签 + §6.1 策略模型），
   通过后颁发能力句柄；此后 Tool/MCP 调用零打扰；
3. **运行期审批**：对外产生副作用的操作（浏览器提交业务数据、写文件、
   向非白名单域发网络请求）仍走 Session 层 `resolveApproval` 审批链。

broker 与 scope 细节以 REQ-SDK03 / REQ-P03 为准。

## 8.2 Plugin Runtime 生命周期

```text
Installed → Loaded → Activated → Running → Disabled
```

## 8.3 Capability Registry

**一个注册表，三种来源**。Capability Registry 是唯一聚合点：

- 条目携带 `source: runtime | plugin | builtin`；
- 冲突消解：plugin 不得覆盖 builtin；runtime 工具以 runtime 命名空间隔离；
- Chat 层工具列表只从 Registry 组装，不直连任何来源；
- **GAP-2**：P3-02 broker 已覆盖 plugin 源注册，三源统一聚合尚无明确 Task，见 §14.2。

---

# 9. Plugin Extension

## UI Extension

插件 UI = **白名单组件目录 + slot 声明**：

- Manifest 以 JSON 声明 slot 位置（sidebar / panel / settings 页）与组件树；
- 组件仅限 `openbuddy-ui-primitives` 目录内组件，数据绑定到插件 Backend Connector；
- **禁止任意 JS/React 代码进入 Renderer**；
- 复杂自定义 UI 走 iframe 沙箱 + postMessage 桥，归后续 Phase，本阶段不交付；
- UI surface 细节以 REQ-SDK02 / REQ-P03 为准。

示例（CRM 插件）：Sidebar、Customer Panel、Quotation Panel。

## Tool Extension

```typescript
plugin.registerTool()
```

## MCP Extension

```typescript
plugin.registerMCP()
```

---

# 10. Plugin 分发与信任模型

- 企业私有分发：插件包 = **签名 tarball**，格式复用 `tests/fixtures/marketplace-bundle`
  演进，不发明新包格式；
- 验签公钥随 Desktop 内置，安装时验签 + 校验 Manifest 权限声明；
- 公开第三方插件市场为 Non-Goal（NON-GOAL-004）；
- 签名与 Registry 细节以 REQ-MK02~MK04 为准。

---

# 11. Browser Agent Platform

## 11.1 两态架构

```text
Browser Manager
        |
  ┌─────┴─────┐
  │           │
可视态       自动化态
BrowserView  Playwright/CDP
(登录/人工   (attach 同一
 接管)        session partition)
  └─────┬─────┘
        |
Agent Action
```

- **可视态**：Electron BrowserView，用于用户登录（含 SSO/扫码）与人工接管；
- **自动化态**：Playwright 通过 CDP attach 到同一 BrowserView（或同 partition 的隐藏
  窗口）执行自动化；禁止 Playwright 独立维护 storage state；
- Runtime 与隔离 profile 细节以 REQ-B01 / REQ-BT02 为准。

## 11.2 Session 与登录态

单一 **Electron session partition** 为登录态事实源，两态共享：

```json
{
  "id": "crm-session",
  "url": "https://crm.xxx.com",
  "partition": "persist:crm",
  "encryption": "electron-safeStorage"
}
```

Cookie/Storage 落盘加密 = Electron safeStorage，不另起加密方案。

## 11.3 Browser Adapter Interface

```typescript
interface BrowserAdapter {
  open(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  type(selector: string, value: string): Promise<void>;
  snapshot(): Promise<DomSnapshot>;
  execute(action: BrowserAction): Promise<Evidence>;
}
```

## 11.4 Browser Security：三级审批

所有浏览器能力必须经过 `Permission Manager → Approval → Execution`。

| 级别 | 操作 | 行为 |
|---|---|---|
| L1 | 白名单域只读操作（打开、查询、截图） | 自动批准 |
| L2 | 白名单域写操作（提交表单、发送、创建单据） | 逐次审批，审批卡片展示 Evidence 预览；可选"本域本次会话内记住" |
| L3 | 非白名单域 | 一律拒绝，提示管理员加白 |

- Phase-1 审批人 = 本机用户本人（带摩擦的自审）；独立审批人角色归 Phase 2；
- 审批超时默认拒绝；
- 域策略与审批对账细节以 REQ-B04 / REQ-BT04 为准。

禁止：Agent 自动登录未知网站；未授权读取 Cookie；未授权提交业务数据。

## 11.5 Evidence

每个浏览器 action 产生 **Evidence 三元组**：

```text
Evidence = 动作前 DOM snapshot 摘要 + 动作描述 + 动作后截图
```

- 格式对齐 `packages/collaboration/openbuddy-evidence` 的 schema（结构化 JSON + 文件引用）；
- 存储：本地保留 + 手动清除；上报与留存策略归 Phase 2；
- L2 审批卡片中，Evidence 即审批人看到的依据；
- **GAP-4**：本三元组表述需与 REQ-B02/REQ-B04 的 artifact/receipt 术语对齐，
  以专项规范为准，见 §14.2。

---

# 12. Repository 逻辑分层视图

本节是**逻辑视图**，不是目录重组要求；现有包不做大规模重命名：

| 逻辑层 | 现有/规划落位 |
|---|---|
| runtime-core | `packages/runtime/openbuddy-runtime-adapter` |
| runtime-adapters | `packages/runtime/openbuddy-hermes-client` + `services/hermes-agent-gateway` |
| plugin-platform | `packages/runtime/openbuddy-plugin-sdk` + `openbuddy-plugin-host` |
| browser-platform | 新增，命名 `packages/browser/openbuddy-browser-*`（P4B 系列落位中） |
| enterprise-auth | `packages/auth/openbuddy-casdoor` + `openbuddy-permission` + `services/casdoor-resource-gateway` |
| capability-sdk | `packages/capability/openbuddy-mcp-client` + plugin-sdk |
| audit | `packages/core/openbuddy-logging-main` / `openbuddy-logging-renderer` |
| evidence | `packages/collaboration/openbuddy-evidence` |
| UI 扩展基座 | `packages/ui/openbuddy-ui-slots` + `openbuddy-ui-primitives` |
| 示例插件 | `plugins/crm-plugin` 等（企业私有分发包） |

---

# 13. Audit 最小闭环

Phase-1 要求三类关键事件以统一 schema 落**本地 append-only 日志**，接入
`openbuddy-logging-*` 体系：

1. Runtime 切换（含会话绑定关系）；
2. 插件安装 / 卸载 / 权限变更；
3. 浏览器审批与执行（关联 Evidence 引用）。

事件携带 `runtimeId / pluginId / sessionId / userId` 归因字段。日志上报、集中留存与
合规策略归 roadmap Phase 2（Enterprise Workspace，REQ-W02/W05；已有 P1-04 command
log 与 P2-06 audit retention 承接部分）。

---

# 14. 需求溯源（v1.2 新增）

## 14.1 条款 → 专项规范 REQ → Roadmap Task → 证据

实时 Task 状态以 [docs/roadmap/ledger.md](../docs/roadmap/ledger.md) 为准。

| PRD 条款 | 专项规范 REQ | Roadmap Task | 证据目录 |
|---|---|---|---|
| §5 两层契约 / Session 层 | REQ-R01~R05 | P0-04, P1-01, P1-05 | `specs/P0-04-runtime-contract`、`specs/P1-01-local-pi-adapter`、`specs/P1-05-session-projection` |
| §5.1 绑定 / 切换 / 不 failover | REQ-R03/R04, REQ-E03 | P1-05, P1-07 | `specs/P1-05-session-projection`、`specs/P1-07-runtime-faults` |
| §5.2 配置与密钥 | —（GAP-1） | —（待立项） | — |
| §5.3 Hermes 经 gateway | REQ-G02~G05, REQ-H02/H03 | P0-03, P1-02, P1-03 | `specs/P0-03-hermes-matrix`、`specs/P1-02-hermes-bridge`、`specs/P1-03-remote-transport` |
| §3 remote_gateway | REQ-G02, REQ-R02 | P1-03（已交付） | `specs/P1-03-remote-transport` |
| §6.1 策略数据模型 / 下发 | REQ-W04/W05（部分） | —（GAP-3，待立项） | — |
| §7 Runtime UI / 健康 | REQ-S02/S04, REQ-H04 | P1-06, P1-07, P1-08 | `specs/P1-06-runtime-panel`、`specs/P1-07-runtime-faults`、`specs/P1-08-runtime-operations` |
| §8 Manifest | REQ-P02, REQ-SDK01 | P3-01 | `specs/P3-01-enterprise-manifest` |
| §8.1 权限强制 / broker | REQ-SDK03, REQ-P03 | P3-02 | `specs/P3-02-plugin-broker` |
| §8.3 Capability Registry | REQ-SDK03（部分） | P3-02（部分，GAP-2） | `specs/P3-02-plugin-broker` |
| §9 UI Extension | REQ-SDK02, REQ-P03 | P3-03 | `specs/P3-03-isolated-ui` |
| §10 签名分发 | REQ-MK02~MK04 | P3-05, P3-06, P3-07 | `specs/P3-05-plugin-registry`、`specs/P3-06-plugin-lifecycle`、`specs/P3-07-plugin-fixtures` |
| §11.1/§11.2 Browser Runtime 与 Session | REQ-B01, REQ-BT02 | P4B-01 | `specs/P4B-01-browser-runtime` |
| §11.4 三级审批 | REQ-B04, REQ-BT04 | P4B-02, P4B-04 | `specs/P4B-02-domain-policy`、`specs/P4B-04` |
| §11.5 Evidence | REQ-B02, REQ-BT03 | P4B-03（GAP-4 术语对齐） | `specs/P4B-03-page-read` |
| §13 Audit | REQ-W02/W05（部分） | P1-04, P2-06 | `specs/P1-04-command-log`、`specs/P2-06-audit-retention` |
| §17 Non-Goal | —（本 PRD 为权威） | roadmap §2 边界约束 | — |

## 14.2 已知缺口（待立项）

| 缺口 | 内容 | 建议归属 |
|---|---|---|
| GAP-1 | §5.2 `secretRef` 密钥引用规范无对应 Task | Phase 1 补强或 Phase 2 |
| GAP-2 | §8.3 三源统一 Capability Registry 仅有 plugin 源注册 | Phase 3 补强 |
| GAP-3 | §6.1 按部门/员工 Runtime 策略下发无明确 Task | Phase 2 后续 |
| GAP-4 | §11.5 Evidence 三元组与 REQ-B02/B04 artifact/receipt 术语需对齐 | Phase 4B 收尾时对齐 |

缺口立项方式：在 `prd/roadmap.md` 对应 Phase 增补 Task，或经 review 判定为年度外候选。

---

# 15. 执行计划与实时状态（v1.2 修订）

本文档不维护静态 Phase 描述。执行入口：

- 任务分解与排序：[prd/roadmap.md](roadmap.md) §4；
- 实时状态（含 Phase 退出门槛与外部阻塞 D01~D11）：
  [docs/roadmap/ledger.md](../docs/roadmap/ledger.md)；
- 每个 Task 的执行流程：[docs/roadmap/WORKFLOW.md](../docs/roadmap/WORKFLOW.md)。

---

# 16. Acceptance（v1.2 修订）

验收以 roadmap Phase 退出门槛 + ledger 状态为唯一判据，本文档只声明对齐关系：

| 验收项 | 标准 | roadmap 判据 |
|---|---|---|
| A-001 Runtime | 至少支持 Pi 与 Hermes；切换后新会话正常 chat | Phase 1 退出门槛（ledger Phase 1 行；生产退出等待外部环境 D03） |
| A-002 Plugin | 第三方企业插件可安装、加载、卸载（验签通过） | Phase 3 退出门槛（ledger Phase 3 行；D09 签名密钥待签） |
| A-003 Browser | Agent 可创建 Session、执行 Action、返回 Evidence | Phase 4B 退出门槛（ledger Phase 4B 行；真实站点等待 D05） |

`done-fixture` 不能解除生产 gate（WORKFLOW 规则），上述等待外部环境的判据随
D03/D05/D09 解除而闭环。

---

# 17. Non Goal

- **NON-GOAL-001** 不重新开发 Agent Runtime。
- **NON-GOAL-002** 不把 Hermes/Pi/Nanobot 代码合并进入 Desktop。
- **NON-GOAL-003** 不开发新的 LLM Gateway。
- **NON-GOAL-004** 不做公开第三方插件市场（仅企业私有签名分发）。
- **NON-GOAL-005** 不支持 container 类型 Runtime（待真实需求出现再议）。
- **NON-GOAL-006** 不做 Runtime 故障自动 failover。
- **NON-GOAL-007** 不做跨 Runtime 会话上下文自动迁移（仅可选有损交接摘要）。
- **NON-GOAL-008** Phase-1 不做按部门/员工的策略下发（仅定义数据模型，GAP-3 待立项）。

---

# 18. Engineering Principle

OpenBuddy 不再定位为 `AI Chat Desktop`，而定位为：

```text
Enterprise Agent Operating System Desktop
```

核心：

```text
Desktop Shell
+ Runtime Platform（两层契约、会话级绑定）
+ Plugin Platform（隔离执行、权限强制、签名分发）
+ Browser Platform（两态架构、三级审批、Evidence）
+ Enterprise Governance（策略模型、Audit、Casdoor 身份）
```

这才与 smc-copilot 长期目标一致。
