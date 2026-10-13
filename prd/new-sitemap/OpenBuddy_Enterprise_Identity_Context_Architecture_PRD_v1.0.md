---
branch: roadmap/enterprise-agent-os
change_type:
- ARCHITECTURE_CHANGE
- INTEGRATION
golden_consumer:
- Product Manager
- Architect
- Cursor/Coding Agent
owner: SMC Copilot
prd_id: PRD-OPENBUDDY-IDENTITY-CONTEXT-001
product: OpenBuddy Enterprise Agent OS
related_docs:
- OpenBuddy Enterprise Login Flow Optimization PRD v1.2
- nodeskclaw-backend Identity Gateway + Casdoor Adapter Engineering PRD v1.2
repository: "https://github.com/loudon84/open-buddy"
status: APPROVED_FOR_PLAN
target_release: Phase 2
title: OpenBuddy Enterprise Identity Context Architecture PRD v1.2
version: 1.2
---

# 1. 一句话目标

让 OpenBuddy 在保持现有 nodeskclaw-backend Identity Gateway 登录流程不变的基础上，建立统一 Enterprise Identity Context，使桌面端、Agent Runtime、Skill、MCP、Knowledge 等企业能力能够基于用户、租户、角色和权限执行安全决策。

# 2. 背景与问题定义

## 2.1 Current State

当前身份认证链路：

``` text
OpenBuddy Desktop
        |
        v
nodeskclaw-backend Identity Gateway
        |
        v
Casdoor
        |
        v
OAuth Callback
        |
        v
OpenBuddy Login Success
```

当前系统已经完成：

- Casdoor 用户认证
- nodeskclaw-backend 企业用户信息关联
- Desktop 用户登录（`backend-auth` 保存 access/refresh token、`displayName`、`needsOrgSetup`、`mustChangePassword`）

当前缺少：

- 企业租户上下文
- 用户角色上下文
- Agent 能力授权上下文
- Skill/MCP/Knowledge 权限上下文

## 2.2 Problem

当前登录成功只能证明：

``` text
Who are you?
```

不能完整回答：

``` text
Which organization do you belong to?
What agents can you use?
What data can you access?
What tools can you execute?
```

导致后续企业 Agent OS 能力无法进行统一权限治理。

## 2.3 Impact

业务影响：企业无法基于员工身份控制 Agent 能力。

工程影响：每个 Agent 独立实现权限判断；用户、租户、权限模型无法复用。

安全影响：存在工具调用权限边界不清风险。

# 3. Scope

## 3.1 In Scope

SCOPE-001：定义 Enterprise Identity Context 数据模型（`{ user, tenant, roles, permissions, policies }`）。

SCOPE-002：新增 `GET /api/v1/identity/context` 接口，由 nodeskclaw-backend 提供。

SCOPE-003：Desktop 主进程保存和刷新 Identity Context（`electron/main/identity/`）。

SCOPE-004：向 Agent Runtime 注入身份上下文（`RuntimeRequest.identityContext`）。

SCOPE-005：为未来 Agent、Skill、MCP、Knowledge 权限治理提供统一基础。

## 3.2 Out of Scope

NON-GOAL-001：本版本不修改 Casdoor 登录流程。

NON-GOAL-002：本版本不替换 nodeskclaw-backend Identity Gateway。

NON-GOAL-003：本版本不实现完整 RBAC 管理后台。

NON-GOAL-004：本版本不支持多租户切换（只用后端返回的默认租户）。

NON-GOAL-005：不把 permissions/policies 暴露给 Renderer。

# 4. Architecture Boundary

| Domain | Owner | Input | Output | 不负责 |
| --- | --- | --- | --- | --- |
| Casdoor | Identity Provider | OAuth Request | Authentication Result | 企业权限 |
| nodeskclaw-backend | Identity Gateway | Token | Identity Context | Desktop UI |
| OpenBuddy Desktop | Identity Consumer | Context API | Runtime Context | 用户认证 |
| Agent Runtime | Agent Execution | Identity Context | Policy Decision | 用户管理 |
| Skill/MCP/Knowledge | Tool Execution | Agent-injected Context | Authorized Action | 直接拉取 Context |

# 5. System Context

``` text
                Enterprise Identity Plane

                 nodeskclaw-backend
                        |
        +---------------+---------------+
        |                               |
      Casdoor                    Enterprise DB

                        |
                        v

                 OpenBuddy Desktop
                        |
              electron/main/identity/
                        |
          +-------------+-------------+
          |                           |
    Identity Cache              identity:* IPC
    (sqlite,明文)                      |
          |                           |
          +--> Agent Runtime          +--> Renderer (user/tenant/roles only)
          |
          +--> Skill/MCP/Knowledge (via agent)
```

# 6. Authoritative State / Source of Truth

| State | Role | Authoritative | Writer | Reader |
| --- | --- | --- | --- | --- |
| User Identity | 用户身份 | YES | Identity Gateway | Desktop |
| Tenant Identity | 企业租户 | YES | Identity Gateway | Desktop/Agent |
| Role | 用户角色 | YES | Backend RBAC | Policy Engine |
| Permission | 能力权限 | YES | Backend Policy | Agent Runtime |
| Local Cache | Runtime Cache | NO | Desktop | Desktop |

# 7. Domain Model

## Identity Context

``` json
{
  "user": {
    "id": "user-id",
    "name": "employee"
  },
  "tenant": {
    "id": "tenant-id",
    "name": "company"
  },
  "roles": [
    "sales_manager"
  ],
  "permissions": [
    "agent.crm.read",
    "agent.email.write",
    "mcp.filesystem.read",
    "knowledge.search"
  ],
  "policies": {
    "agents": ["pi", "hermes"]
  }
}
```

权限命名规范：`{domain}.{resource}.{action}`。`policies.agents` 控制用户被授权使用哪些 Agent Runtime。

## Cache Envelope

``` json
{
  "contextVersion": "v1",
  "expiresAt": "2026-10-13T12:00:00Z",
  "lastRefreshedAt": "2026-10-13T11:45:00Z",
  "identityContext": { /* 上面的 Identity Context */ }
}
```

`contextVersion` 不匹配时清除重拉，不做字段级迁移。

# 8. State Machine

``` text
UNAUTHENTICATED

        |
        | login success

AUTHENTICATED

        |
        | fetch context

IDENTITY_CONTEXT_READY

        |
        | refresh expired

CONTEXT_REFRESH_REQUIRED

        |
        | refresh success

IDENTITY_CONTEXT_READY

        |
        | logout / origin change

UNAUTHENTICATED
```

# 9. Requirement Unit

## REQ-IDC-001 — Identity Context API

### Goal

为 OpenBuddy 提供统一企业身份上下文。

### Normative Requirement

MUST：

- nodeskclaw-backend 提供 `GET /api/v1/identity/context`。
- 请求带 `Authorization: Bearer <access_token>`。
- 返回 PRD §7 的 Identity Context JSON。
- Token 无效时返回 401 和 `IDENTITY_CONTEXT_001`。
- 后端返回 `expiresAt`；不返回时 Desktop 默认 15 分钟，强制上下限 1 分钟~1 小时。

MUST NOT：

- Desktop 自行推断企业权限。
- Desktop 直接访问 Casdoor 查询权限。

### Inputs

``` text
Access Token
User Session
```

### Outputs

``` text
Enterprise Identity Context
```

### Acceptance

A-IDC-001：登录成功后可以获取完整用户上下文。

A-IDC-002：Token 无效时返回明确错误。

---

## REQ-IDC-002 — Desktop Context Cache

### Goal

降低启动阶段身份查询成本。

### Requirement

MUST：

- 缓存在主进程 `electron/main/identity/`，与 `backend-auth` 同一个 `openbuddy.sqlite`，namespace `identity:context`。
- 明文存储（不含 token，tenant/roles 不是敏感数据）。
- 启动时由 `backend-auth` 在 `init()` 完成且 `status()` 返回 `signed_in` 后，主动调用 `identity.refresh()`。`backend-auth` 暴露 `onSignedIn(listener)` 钩子，`IdentityService` 在构造时注册。不订阅 IPC 事件，避免时序竞争。
- `expiresAt` 过期后，agent 调用前先用旧缓存，后台刷新。
- 登出或 origin 变更时清除缓存。
- 离线时用未过期缓存正常运行。
- 缓存版本不匹配时清除重拉。

MUST NOT：

- 本地缓存作为权限事实源。
- 多用户分键缓存（Desktop 是单用户应用）。

### Data

``` json
{
  "contextVersion": "v1",
  "expiresAt": "",
  "lastRefreshedAt": "",
  "identityContext": {}
}
```

---

## REQ-IDC-003 — Agent Runtime Context Injection

### Goal

让 Agent 根据企业身份执行能力控制。

### Requirement

MUST：

- `IdentityContext` 类型定义放在 `packages/shared/openbuddy-types/src/identity.ts`（新建），`runtime-core` 和 `electron/main/identity/` 都从这里导入。`runtime-core` 是纯接口包，不依赖 Electron。
- `RuntimeRequest` 扩展 `identityContext?: IdentityContext`（`packages/runtime-core/src/runtime-adapter.ts`）。
- Pi 分支：`agentHost.prompt(text, { identityContext, ... })`。`agentHost` 是 Pi host（`electron/main/agent/host-modules/pi-runtime-factories.ts`），其 `prompt` 的 options 当前无显式类型（`prompt-cycle.ts` 调用处传 `{ traceId, sessionId, signal }`）。实施时在 host 侧定义 `PromptOptions`（含 `traceId/sessionId/signal/identityContext`），`prompt-cycle.ts` 调用处加 `identityContext`。不改 `packages/runtime/openbuddy-runtime-adapter/src/types.ts` 的 `CallOptions`（那是 v1 远程运行时契约的 options，与 Pi host 无关）。
- Hermes 分支：`platform.chat({ text, sessionId, identityContext })` 透传给 Gateway。`dispatch-prompt.ts` 的 `PromptDispatch` 扩展 `identityContext?: IdentityContext`，`chatActive: () => platform.chat({ text, sessionId, identityContext })`。`prompt-cycle.ts` 在调用 `dispatchPrompt` 前从 `IdentityService` 获取当前 context。
- `policies.agents` 控制 runtime 可用性；无权限时 agent:prompt 拒绝，提示切换到有权限的 runtime。
- 当前 session 用旧 context，新 session 用新 context。
- agent 日志（`hostReceived` / `hostDispatched` / `hostFailed`）加 `tenantId` 和 `userId`。

MUST NOT：

- Agent 自行修改 Identity Context。
- Renderer 通过 IPC 获取 permissions/policies。

---

## REQ-IDC-004 — Identity IPC

### Goal

Renderer 和主进程之间的 Identity Context 边界。

### Requirement

MUST：

- `identity:context` 返回 `{ user: { id, name }, tenant: { id, name }, roles }` 或 `null`（未登录）。不返回 permissions/policies。
- `identity:refresh` 强制刷新，返回新的 context 或错误。
- `identity:*` 命名空间独立于 `backend-auth:*`。
- 侧栏 tenant 显示：扩展 `BackendAuthView` 加 `tenant?: { id, name }`。`backend-auth` 在 `init()` 时从 `IdentityService` 读取 tenant（如果缓存存在），不直接调用 `identity:context` IPC。Renderer 不需要新增 IPC 调用。
- 手动刷新按钮：在「企业登录」设置页加"刷新身份上下文"按钮。刷新中 disabled，显示"刷新中…"；成功显示"已刷新"；失败显示错误文案。

MUST NOT：

- 暴露 mock IPC（测试用依赖注入）。

---

## REQ-IDC-005 — Error Handling

### Goal

统一 Identity Context 错误处理。

### Requirement

MUST：

- 401：先 refresh token；refresh 也失败则登出，显示"登录已过期，请重新登录"。
- 403：保持登录，显示"当前账号无权限访问企业资源"。
- 500/网络错误：静默降级用旧缓存，显示"身份上下文暂不可用，部分功能受限"。
- 错误码映射中文文案（`001` → "登录已过期，请重新登录"，`002` → "未找到企业组织"，`003` → "权限暂不可用"，`004` → "身份上下文已过期"）。

---

## REQ-IDC-006 — Audit & Monitoring

### Goal

记录 Identity Context 的拉取、使用、清除。

### Requirement

MUST：

- 拉取/刷新记 `identity.context.fetch`，字段：`userId, tenantId, outcome ("success"|"failure"), detail: { error?, durationMs }`。与现有 `auditRecord({ event, outcome, detail })` 形状一致。
- 使用（agent 调用前）记 `identity.context.use`，字段：`userId, tenantId, runtimeId, sessionId`（放在 `detail` 里）。
- 清除记 `identity.context.clear`，字段：`userId, tenantId, detail: { reason ("logout"|"origin_change"|"expired") }`。
- 不记 permissions 列表（太长）。

# 10. Side-Effect Contract

| Operation | DB Write | File Write | Network | User Data |
| --- | --- | --- | --- | --- |
| Fetch Context | NO | NO | YES | NO |
| Cache Context | YES (sqlite) | NO | NO | YES |
| Refresh Context | YES (sqlite) | NO | YES | YES |
| Clear Context | YES (sqlite) | NO | NO | YES |

# 11. Ownership Contract

| Resource | Ownership |
| --- | --- |
| User Identity | Backend |
| Tenant | Backend |
| Permission | Backend |
| Local Cache | Desktop Runtime |

规则：

- Backend 是唯一事实源。
- Desktop Cache 只能读取。
- Cache Drift 必须 Refresh。

# 12. Error Codes

``` text
IDENTITY_CONTEXT_001
Token invalid → 登录已过期，请重新登录

IDENTITY_CONTEXT_002
Tenant not found → 未找到企业组织

IDENTITY_CONTEXT_003
Permission unavailable → 权限暂不可用

IDENTITY_CONTEXT_004
Context expired → 身份上下文已过期
```

# 13. Acceptance

A-001：已有登录流程无需修改即可获取 Identity Context。

A-002：用户登录后展示企业信息（tenant 名称）。

A-003：Agent Runtime 可以读取用户权限（`policies.agents` 控制可用性）。

A-004：Skill/MCP/Knowledge 可以基于 Context 扩展授权（由 agent 间接消费）。

A-005：Identity Context 过期后，agent 调用先用旧缓存，后台刷新。

A-006：登出或换 origin 时，Identity Context 缓存被清除。

A-007：Renderer 只能看到 `{ user, tenant, roles }`，看不到 permissions/policies。

# 14. Evidence

required test:

- Login Success 后 Context API 调用日志。
- Identity Context JSON 示例。
- Desktop Cache 文件验证（sqlite namespace `identity:context`）。
- Agent Runtime Context 注入测试（Pi 和 Hermes 两条路径）。
- 过期后先用旧缓存、后台刷新的测试。
- 登出/换 origin 清除缓存的测试。
- `policies.agents` 无权限时 agent:prompt 拒绝的测试。

required artifacts:

- API Contract 文档（`GET /api/v1/identity/context`）。
- Schema 定义（Identity Context JSON Schema）。
- 自动化测试结果。

# 15. Implementation Boundary

允许修改：

``` text
OpenBuddy:
electron/main/identity/          (新建，IdentityService)
electron/main/ipc/identity.ts    (新建)
electron/main/backend-auth/      (init 时触发 identity 拉取，BackendAuthView 扩展 tenant)
electron/main/ipc/prompt-cycle.ts (注入 identityContext)
electron/main/runtime/dispatch-prompt.ts (PromptDispatch 扩展)
packages/shared/openbuddy-types/src/identity.ts (新建，IdentityContext 类型)
packages/runtime-core/src/runtime-adapter.ts (RuntimeRequest 扩展)
electron/main/agent/host-modules/pi-runtime-factories.ts (PromptOptions 类型，identityContext 透传)
src/lib/identity/                 (新建，identity-client)
packages/ui/openbuddy-ui-settings/src/EnterpriseLoginPanel.tsx (手动刷新按钮)
packages/ui/openbuddy-ui-sidebar/src/Sidebar.tsx (tenant 显示)
```

nodeskclaw-backend:

``` text
identity/context API (GET /api/v1/identity/context)
```

禁止：

``` text
修改 Casdoor OAuth 核心流程
替换 Identity Gateway
暴露 permissions/policies 给 Renderer
```

# 16. Grilling decisions

2026-10-13 确认。推荐答案均被采纳。

| ID | 决定 |
| --- | --- |
| Q1 | nodeskclaw-backend 新增 `GET /api/v1/identity/context`，Desktop 登录后调用 |
| Q2 | Identity Context 放主进程，与 token 同级，Renderer 通过 IPC 只读 |
| Q3 | 每次 agent:prompt 前注入 context，Runtime 不自行拉取 |
| Q4 | 换 origin 时立即清除 Identity Context |
| Q5 | 启动时过期则刷新；agent 调用前不逐次检查；401/403 驱动刷新 |
| Q6 | `RuntimeRequest` 扩展 `identityContext` 字段 |
| Q7 | 缓存用 envelope（`contextVersion`, `expiresAt`, `lastRefreshedAt`），业务 context 按 §7 |
| Q8 | 刷新失败用旧缓存，状态置 `CONTEXT_REFRESH_REQUIRED`；缓存已清除则拒绝 |
| Q9 | 权限用扁平字符串，命名 `{domain}.{resource}.{action}` |
| Q10 | `policies.agents` 控制 runtime 可用性，与 `listCapabilities()` 不同 |
| Q11 | TTL 由后端返回，Desktop 强制 1 分钟~1 小时上下限 |
| Q12 | 单用户缓存，登出时清除 |
| Q13 | Skill/MCP/Knowledge 由 agent 间接消费，主进程不重复注入 |
| Q14 | 401 先 refresh 再登出；403 保持登录；500 静默降级 |
| Q15 | 审计记拉取（含 durationMs）、使用、清除 |
| Q16 | 新建 `identity:*` IPC 命名空间 |
| Q17 | Renderer 只能看到 `{ user, tenant, roles }` |
| Q18 | 无权限 runtime 直接拒绝，提示切换 |
| Q19 | 过期不阻塞 agent 调用，先用旧缓存后台刷新 |
| Q20 | 当前版本只支持单租户 |
| Q21 | 新建 `electron/main/identity/` |
| Q22 | 未登录时 `identity:context` 返回 `null` |
| Q23 | 明文缓存（不含 token） |
| Q24 | 刷新失败不重试，等下次 agent 调用前再试 |
| Q25 | 离线用未过期缓存正常运行 |
| Q26 | Pi 分支扩展 `agentHost.prompt` options |
| Q27 | Hermes 透传但 Gateway 自验 |
| Q28 | agent 日志加 `tenantId` 和 `userId` |
| Q29 | 测试用依赖注入，不暴露 mock IPC |
| Q30 | 缓存与 backend-auth 同库，namespace `identity:context` |
| Q31 | 降级时显示 tenant 名称加警告图标 |
| Q32 | 当前 session 用旧 context，新 session 用新 context |
| Q33 | 设置页提供手动刷新按钮 |
| Q34 | 错误码映射中文文案 |
| Q35 | 启动时立即拉取 |
| Q36 | Skill/MCP/Knowledge 由 agent 间接消费 |
| Q37 | `contextVersion` 不匹配时清除重拉 |
| Q38 | 登出时记 `identity.context.clear` 审计 |
| Q39 | 当前只支持中文 |
| Q40 | 记录拉取延迟 |

2026-10-13 Review Round 1（R1–R7 全部应用，产出 v1.2）：

| ID | 决定 |
| --- | --- |
| R1 | `backend-auth` 暴露 `onSignedIn(listener)` 钩子，`IdentityService` 注册后由 `backend-auth` 在 `init()` 完成且 `signed_in` 时主动调用 `identity.refresh()` |
| R2 | `IdentityContext` 类型放 `packages/shared/openbuddy-types/src/identity.ts`，`runtime-core` 和 `identity` 都从这里导入 |
| R3 | Pi 分支扩展 `agentHost.prompt` options（Round 3 修正：目标为 `pi-runtime-factories.ts` 的 `PromptOptions`，不是 `openbuddy-runtime-adapter` 的 `CallOptions`） |
| R4 | Hermes 分支 `PromptDispatch` 和 `dispatch-prompt.ts` 同步扩展，`prompt-cycle.ts` 从 `IdentityService` 获取 context 后传入 |
| R5 | 侧栏 tenant 显示通过扩展 `BackendAuthView` 加 `tenant` 字段，不新增 IPC 调用 |
| R6 | 审计字段对齐现有 `auditRecord({ event, outcome, detail })` 形状 |
| R7 | 手动刷新按钮补充 disabled/loading/result 状态到 REQ-IDC-004 |

2026-10-13 Review Round 3（批准前代码核对）：

| ID | 决定 |
| --- | --- |
| R3 修正 | `agentHost.prompt` 实际签名在 `electron/main/agent/host-modules/pi-runtime-factories.ts`（options 为 `any`），`openbuddy-runtime-adapter/src/types.ts` 的 `CallOptions` 与 Pi host 无关；修正 REQ-IDC-003 与 §15 目标文件 |
| 其余 | R1/R2/R4/R5/R6/R7 与代码核对无误 |

**Verdict after Round 3**: pass
