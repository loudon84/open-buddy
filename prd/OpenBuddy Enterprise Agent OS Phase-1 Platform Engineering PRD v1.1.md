# smc-copilot OpenBuddy Enterprise Agent OS Phase-1 Platform Engineering PRD v1.1

## 文档元数据

```yaml
title: smc-copilot OpenBuddy Enterprise Agent OS Phase-1 Platform Engineering PRD
prd_id: SMC-OE-AOS-001
version: 1.1
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
execution_plan: prd/roadmap.md
supersedes: v1.0 (APPROVED_FOR_PLAN)
```

## 文档定位（v1.1 新增）

本文档是 **架构北极星文档**：定义目标架构、四层职责边界、平台契约原则与 Non-Goal。

本文档 **不是执行计划**。任务分解、Phase 排序、Milestone 与交付验收以
[prd/roadmap.md](roadmap.md) 为唯一 source of truth；两份文档冲突时以 roadmap 为准。

v1.1 修订依据 `specs/prd-aos-001/grilling.md` 的 23 项决策，相对 v1.0 的主要变化：

1. Runtime 契约改为两层模型（Manager 层 + Session 层），Session 层接口以
   `packages/runtime/openbuddy-runtime-adapter/src/types.ts` 为准；
2. 原第15节目录结构改为逻辑分层视图 + 现有包映射表，不再要求大规模重命名；
3. 删除 Migration Plan，执行指向 `prd/roadmap.md`；
4. 新增 Audit 最小闭环、插件权限强制点、Runtime 策略数据模型、Runtime 配置与密钥规范、
   Browser 两态模型与三级审批、Evidence 三元组定义；
5. 扩充 Non-Goal（公开插件市场、container runtime、自动 failover、上下文自动迁移）；
6. Acceptance 改为自动化测试映射。

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
- 企业无法按员工/部门选择 Runtime（策略下发机制见 §7.6，Phase-1 仅落地数据模型）。

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
(local_process)  (embedded)
```

支持：Runtime 注册、生命周期管理、配置、健康检查、切换。

Phase-1 交付的 Runtime 类型（v1.1 收敛，决策 Q12）：

| type | 实例 | 状态 |
|---|---|---|
| `embedded` | Pi Runtime | Phase-1 交付 |
| `local_process` | Hermes（经 hermes-agent-gateway） | Phase-1 交付 |
| `remote_gateway` | 企业内网集中部署 Runtime | Phase-2（前置：Casdoor 鉴权 + mTLS，复用 casdoor-resource-gateway 模式） |
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

## REQ-RUNTIME-001 Runtime 契约：两层模型（v1.1 修订，决策 Q1）

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

### Session 层（以代码为准）

会话、消息、流式事件、取消、审批、工具调用的接口**以
`packages/runtime/openbuddy-runtime-adapter/src/types.ts` 的 `RuntimeAdapter` 为
source of truth**，包括：`connect / disconnect / createSession / sendMessage /
stream(AsyncIterable) / cancel / resolveApproval / executeTask / listTools / executeTool`。

本文档不再重复定义 Session 层签名；任何 Session 层接口变更走代码评审并同步更新
`listCapabilities()` 返回的 `Capability[]`。

## 5.1 Runtime 绑定与切换语义（v1.1 新增，决策 Q4/Q11/Q21）

- **绑定粒度**：Runtime 绑定到**会话**；Settings 中的切换只修改全局默认值，影响新会话。
- **不迁移**：进行中的会话钉死在原 Runtime 上，不做迁移；支持多 Runtime 并发。
- **不自动 failover**：`health()` 仅用于 UI 状态展示与切换前预检；chat 中途失败 =
  该 run 失败报错，由用户手动重试或新开会话（对齐 P1-07 结论）。
- **历史会话降级**：打开历史会话但其绑定的 Runtime 不可用时，会话以只读模式打开
  （可浏览记录，发消息时提示并引导切换）。
- **上下文交接**：切换 Runtime 不做自动上下文迁移；提供可选的"交接摘要"动作
  （旧 Runtime 生成摘要文本，作为新会话首条用户消息注入），属有损交接。

## 5.2 Runtime 配置与密钥规范（v1.1 新增，决策 Q19）

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
- schema 归 `packages/runtime/openbuddy-runtime-adapter` 定义。

## 5.3 Hermes Adapter（v1.1 修订，决策 Q5）

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
- gateway 未运行时：检测并在 UI 提示，默认 Runtime 降级到 Pi，用户确认后重试。

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

## 6.1 Runtime 策略数据模型（v1.1 新增，决策 Q8）

Phase-1 只定义企业策略的**数据模型**，执行使用本地配置；策略下发归 roadmap Phase 2
（Enterprise Workspace，经 Casdoor 身份关联部门）：

```json
{
  "allowedRuntimes": ["pi", "hermes-local"],
  "defaultRuntime": "hermes-local",
  "scope": { "department": "*", "user": "*" }
}
```

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

## REQ-PLUGIN-001 Plugin Manifest（v1.1 扩展，决策 Q22）

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
  tool-use 的会话中插件工具不出现，并在插件面板提示原因。

## 8.1 权限强制点（v1.1 新增，决策 Q7/Q17）

声明 ≠ 强制。权限在以下位置强制执行：

1. **执行位置**：插件后端逻辑在主进程的隔离执行环境中运行，不进入 Renderer；
2. **激活时授权**：激活时校验 Manifest 声明 ↔ 企业策略（§10 验签 + §6.1 策略模型），
   通过后颁发能力句柄；此后 Tool/MCP 调用零打扰；
3. **运行期审批**：对外产生副作用的操作（浏览器提交业务数据、写文件、
   向非白名单域发网络请求）仍走 Session 层 `resolveApproval` 审批链。

## 8.2 Plugin Runtime 生命周期

```text
Installed → Loaded → Activated → Running → Disabled
```

## 8.3 Capability Registry（v1.1 新增，决策 Q10）

**一个注册表，三种来源**。Capability Registry 是唯一聚合点：

- 条目携带 `source: runtime | plugin | builtin`；
- 冲突消解：plugin 不得覆盖 builtin；runtime 工具以 runtime 命名空间隔离；
- Chat 层工具列表只从 Registry 组装，不直连任何来源。

---

# 9. Plugin Extension

## UI Extension（v1.1 收敛，决策 Q18）

插件 UI = **白名单组件目录 + slot 声明**：

- Manifest 以 JSON 声明 slot 位置（sidebar / panel / settings 页）与组件树；
- 组件仅限 `openbuddy-ui-primitives` 目录内组件，数据绑定到插件 Backend Connector；
- **禁止任意 JS/React 代码进入 Renderer**；
- 复杂自定义 UI 走 iframe 沙箱 + postMessage 桥，归后续 Phase，本阶段不交付。

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

# 10. Plugin 分发与信任模型（v1.1 新增，决策 Q15）

- 企业私有分发：插件包 = **签名 tarball**，格式复用 `tests/fixtures/marketplace-bundle`
  演进，不发明新包格式；
- 验签公钥随 Desktop 内置，安装时验签 + 校验 Manifest 权限声明；
- 公开第三方插件市场为 Non-Goal（NON-GOAL-004）。

---

# 11. Browser Agent Platform

## 11.1 两态架构（v1.1 修订，决策 Q6）

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
  窗口）执行自动化；禁止 Playwright 独立维护 storage state。

## 11.2 Session 与登录态（v1.1 修订，决策 Q13）

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

## 11.4 Browser Security：三级审批（v1.1 修订，决策 Q20）

所有浏览器能力必须经过 `Permission Manager → Approval → Execution`。

| 级别 | 操作 | 行为 |
|---|---|---|
| L1 | 白名单域只读操作（打开、查询、截图） | 自动批准 |
| L2 | 白名单域写操作（提交表单、发送、创建单据） | 逐次审批，审批卡片展示 Evidence 预览；可选"本域本次会话内记住" |
| L3 | 非白名单域 | 一律拒绝，提示管理员加白 |

- Phase-1 审批人 = 本机用户本人（带摩擦的自审）；独立审批人角色归 Phase 2；
- 审批超时默认拒绝。

禁止：Agent 自动登录未知网站；未授权读取 Cookie；未授权提交业务数据。

## 11.5 Evidence（v1.1 新增，决策 Q14）

每个浏览器 action 产生 **Evidence 三元组**：

```text
Evidence = 动作前 DOM snapshot 摘要 + 动作描述 + 动作后截图
```

- 格式对齐 `packages/collaboration/openbuddy-evidence` 的 schema（结构化 JSON + 文件引用）；
- 存储：本地保留 + 手动清除；上报与留存策略归 Phase 2；
- L2 审批卡片中，Evidence 即审批人看到的依据。

---

# 12. Repository 逻辑分层视图（v1.1 修订，决策 Q2）

本节是**逻辑视图**，不是目录重组要求；现有包不做大规模重命名：

| 逻辑层 | 现有/规划落位 |
|---|---|
| runtime-core | `packages/runtime/openbuddy-runtime-adapter` |
| runtime-adapters | `packages/runtime/openbuddy-hermes-client` + `services/hermes-agent-gateway` |
| plugin-platform | `packages/runtime/openbuddy-plugin-sdk` + `openbuddy-plugin-host` |
| browser-platform | 新增，命名 `packages/browser/openbuddy-browser-*` |
| enterprise-auth | `packages/auth/openbuddy-casdoor` + `openbuddy-permission` + `services/casdoor-resource-gateway` |
| capability-sdk | `packages/capability/openbuddy-mcp-client` + plugin-sdk |
| audit | `packages/core/openbuddy-logging-main` / `openbuddy-logging-renderer` |
| evidence | `packages/collaboration/openbuddy-evidence` |
| UI 扩展基座 | `packages/ui/openbuddy-ui-slots` + `openbuddy-ui-primitives` |
| 示例插件 | `plugins/crm-plugin` 等（企业私有分发包） |

---

# 13. Audit 最小闭环（v1.1 新增，决策 Q9）

Phase-1 要求三类关键事件以统一 schema 落**本地 append-only 日志**，接入
`openbuddy-logging-*` 体系：

1. Runtime 切换（含会话绑定关系）；
2. 插件安装 / 卸载 / 权限变更；
3. 浏览器审批与执行（关联 Evidence 引用）。

事件携带 `runtimeId / pluginId / sessionId / userId` 归因字段。日志上报、集中留存与
合规策略归 roadmap Phase 2（Enterprise Workspace）。

---

# 14. 执行计划（v1.1 修订，决策 Q3）

任务分解、Phase 排序与 Milestone 以 [prd/roadmap.md](roadmap.md) 为准：

- Phase 1：Runtime Platform（本 PRD §5–§7）；
- Phase 2：Enterprise Workspace（策略下发、审计上报、remote_gateway 前置）；
- Phase 3：Plugin Platform（本 PRD §8–§10）；
- Phase 4B：Browser Agent（本 PRD §11）。

---

# 15. Acceptance（v1.1 修订，决策 Q23）

验收以 `tests/enterprise/` 自动化测试通过为准，本文档只声明映射：

| 验收项 | 标准 | 测试映射 |
|---|---|---|
| A-001 Runtime | 至少支持 Pi 与 Hermes；UI 切换后新会话正常 chat | `tests/enterprise/` Runtime 切换 E2E（对齐 P1 系列测试） |
| A-002 Plugin | 第三方企业插件可安装、加载、卸载（验签通过） | 插件生命周期 E2E（复用 marketplace-bundle fixture） |
| A-003 Browser | Agent 可创建 Session、执行 Action、返回 Evidence | Browser session + action + Evidence 断言 E2E |

---

# 16. Non Goal（v1.1 扩充）

- **NON-GOAL-001** 不重新开发 Agent Runtime。
- **NON-GOAL-002** 不把 Hermes/Pi/Nanobot 代码合并进入 Desktop。
- **NON-GOAL-003** 不开发新的 LLM Gateway。
- **NON-GOAL-004** 不做公开第三方插件市场（仅企业私有签名分发）。
- **NON-GOAL-005** 不支持 container 类型 Runtime（待真实需求出现再议）。
- **NON-GOAL-006** 不做 Runtime 故障自动 failover。
- **NON-GOAL-007** 不做跨 Runtime 会话上下文自动迁移（仅可选有损交接摘要）。
- **NON-GOAL-008** Phase-1 不做按部门/员工的策略下发（仅定义数据模型，归 Phase 2）。

---

# 17. Engineering Principle

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
