---
branch: roadmap/enterprise-agent-os
change_type:
- CONTRACT
golden_consumer:
- Architect
- Backend Engineer
- Cursor/Coding Agent
owner: SMC Copilot
prd_id: CONTRACT-OPENBUDDY-IDENTITY-001
product: OpenBuddy Enterprise Agent Shell
related_docs:
- OpenBuddy Enterprise Identity Casdoor Unification PRD v1.0（D13–D17）
- docs/roadmap/decisions.md（D13–D17）
- OpenBuddy Runtime Adapter SDK Design v1.0
repository: "https://github.com/loudon84/open-buddy"
baseline_commit: 1a4bf84160e368206c5582ce96e0bb00ff21740c
status: FROZEN
title: OpenBuddy 企业身份接口契约 v1.1（EnterpriseIdentityPort + backend HTTP）
version: 1.1
date: 2026-10-14
changelog:
- 1.1: 评审修订。新增 X-Tenant-Id 租户选择与 409 重试语义（C1）；资源命名空间扩展 project/billing 并登记 Casdoor enforcer 迁移（C2）；新增双 issuer 过渡窗口（C3）；澄清 getAccessToken 错误语义、contextVersion 取值、EnterpriseIdentityError 构造与 epoch 触发措辞（M2–M5）。
---

# 0. 契约地位

本文冻结两类接口：

1. **主进程内部端口** `EnterpriseIdentityPort`（决策 D16）。
2. **nodeskclaw-backend 面向 OpenBuddy 的 HTTP 接口**（决策 D15、D17）。

状态 `FROZEN` 的含义：实现 Task（ID-01～ID-07、BE-01～03、GW-01）必须按本文签名与语义实现；任何签名、字段、语义变更需要先修订本文并更新 decisions.md，不允许在代码里静默演进。实现时可以把本文 TypeScript 定义落到 `packages/shared/openbuddy-types`，但必须逐字兼容。

# 1. 术语与约定

- **issuer**：Casdoor issuer URL（配置于桌面端与 backend）。
- **subject**：Casdoor 用户稳定标识（JWT `sub`）。
- **tenantId**：企业租户标识。由 PRD Q3 确定的 Casdoor 组织表达方式映射而来；冻结前以 Casdoor 组织 `name`（在 `owner` 命名空间内唯一）为候选。
- **epoch**：单调递增的整数，标识"当前企业会话的代数"。login、logout、切租户、issuer 变更，以及任何改变身份绑定的配置变更均使其递增。重启后从持久值继续递增，不要求跨进程全局一致，只要求同一端口实例内单调。
- **stale**：展示缓存有效但执行授权不可信的状态。展示可用，企业动作必须重新校验。

# 2. EnterpriseIdentityPort（主进程内部，决策 D16）

## 2.1 类型定义

```typescript
/** 当前企业身份快照。未登录或会话不可用时为 null。 */
export interface EnterpriseIdentitySnapshot {
  issuer: string;
  subject: string;
  tenantId: string;
  displayName: string;
  /** 端口代数；每次 login/logout/切租户/issuer 变更递增。 */
  epoch: number;
}

export type EnterpriseIdentityChangeReason =
  | "login"
  | "logout"
  | "tenant-switch"
  | "issuer-change"
  | "session-invalidated";

export interface EnterpriseIdentityChange {
  reason: EnterpriseIdentityChangeReason;
  /** 变化后的快照；logout / session-invalidated 时为 null。 */
  snapshot: EnterpriseIdentitySnapshot | null;
}

export interface EnterpriseIdentityPort {
  /** 当前快照；未登录返回 null。不得触发网络请求。 */
  current(): EnterpriseIdentitySnapshot | null;

  /**
   * 返回当前可用的 access token。
   * 过期或临近过期（skew 60s）时先刷新；并发调用共享同一次刷新（single-flight）。
   * 失败语义：会话失效抛 UNAUTHENTICATED（retryable=false）；
   * 刷新因网络失败抛 NETWORK（retryable=true）；未配置抛 NOT_CONFIGURED。
   */
  getAccessToken(): Promise<string>;

  /** 强制刷新并返回新 token；与 getAccessToken 共用 single-flight。 */
  refresh(): Promise<string>;

  /**
   * 订阅身份变化。login/logout/切租户/issuer 变更/会话失效时同步触发。
   * 返回取消订阅函数。回调抛错不得影响其他订阅者。
   */
  onChange(listener: (change: EnterpriseIdentityChange) => void): () => void;
}

/** 接口仅描述形状；实现必须提供可构造的具体类（如 class CasdoorIdentityError extends Error implements EnterpriseIdentityError）。 */
export interface EnterpriseIdentityError extends Error {
  code: "UNAUTHENTICATED" | "SESSION_EXPIRED" | "NETWORK" | "NOT_CONFIGURED";
  retryable: boolean;
}
```

## 2.2 语义约束（冻结）

1. **单一实现来源**：首个实现由 `casdoorAuth` 提供。运行时（`enterprise-runtime.ts`、`platform-runtime.ts`、后续 Runtime Adapter）只能依赖本端口，不得直接 import `casdoorAuth` / `backendAuth`。
2. **token 不出主进程**：端口只在 Electron Main 暴露；任何 IPC 输出不得包含 token。
3. **epoch 校验**：调用方发起请求时记录 `epoch`；响应或事件返回时 `port.current()?.epoch` 不一致则丢弃。
4. **变化即清理**：收到 `logout` / `tenant-switch` / `issuer-change` / `session-invalidated` 时，`EnterpriseRuntimeController.dispose()` 等持有会话与流的组件必须停止旧流并清理会话缓存。
5. **失败语义**：`getAccessToken()` 在 Casdoor 未配置时抛 `NOT_CONFIGURED`；会话失效时抛 `UNAUTHENTICATED`（retryable=false）；网络错误抛 `NETWORK`（retryable=true）。
6. **本地匿名不受影响**：端口为 null 快照时本地 Pi 照常可用；只有企业动作要求非空快照。

# 3. backend HTTP 接口（决策 D15、D17）

所有接口：

- Base：`{backendOrigin}`（由部署配置提供，代码不得硬编码）。
- 认证：`Authorization: Bearer <Casdoor access token>`。
- 服务端必须校验：JWKS 签名、`iss`、`aud`、`exp`、组织 claim。校验失败返回 `401`；token 有效但无权访问返回 `403`。
- 错误体统一为 `{ "error": { "code": string, "message": string, "traceId": string, "details"?: unknown } }`；409 多租户冲突时 `details = { "candidates": string[] }`，元素为 tenantId。
- 所有响应带 `X-Request-Id`；桌面端审计关联该值。
- 超时建议：桌面端调用 10 秒；服务端内部授权判定预算 3 秒。

## 3.1 GET /api/v1/identity/context

返回当前主体的身份上下文。数据结构沿用 `packages/shared/openbuddy-types/src/identity.ts` 的 `IdentityContext`，外层为缓存信封。

**租户选择（冻结）**：请求头 `X-Tenant-Id: <tenantId>` 可选。缺省时服务端按 token 组织 claim 解析：唯一候选直接使用；多个候选返回 409（`details.candidates`）；客户端用候选值带 `X-Tenant-Id` 重试。指定的 tenantId 不在候选集合内时返回 403。桌面端在切租户（`selectTenant`）后必须把 `activeTenantId` 通过该头传给本接口与 3.2，服务端返回值必须与之一致。

**响应 200**

```typescript
export interface IdentityContextEnvelope {
  /** 固定字面量 "v1"（与桌面端 identity-service 解析器一致）。 */
  contextVersion: "v1";
  /** ISO-8601；桌面端 clamp 到 1–60 分钟。 */
  expiresAt: string;
  identityContext: IdentityContext;
}

/** 桌面端落盘时自行补充 lastRefreshedAt（ISO-8601），服务端不返回该字段。 */

export interface IdentityContext {
  user: { id: string; name: string };
  tenant: { id: string; name: string };
  roles: string[];
  permissions: string[];
  policies?: { agents?: string[] };
}
```

| 状态 | 条件 |
|---|---|
| 200 | token 有效且主体已映射到 backend 用户与租户 |
| 401 | token 缺失/过期/签名或 iss/aud 不符 |
| 403 | token 有效但主体无企业上下文（未同步、非成员） |
| 409 | 主体存在多个候选租户且未指定；响应体带 `candidates: string[]`，桌面端引导切租户 |

**冻结约束**：`policies.agents` 的元素是运行时实例标识（与 Runtime Adapter 的 `agentInstanceId` 同一命名空间）；服务端按 PDP 结果生成，客户端不得自行拼装。

## 3.2 POST /api/v1/authz/check

批量资源授权查询。body 中的 `subject` 一律以 token 为准，请求体不接受 subject 字段。租户上下文同样经请求头 `X-Tenant-Id` 传递（语义同 3.1）；header 指定租户与 token 组织不一致时返回 403。

**请求**

```typescript
export interface AuthzCheckRequest {
  checks: Array<{
    resource: string; // 例: "workspace:ws_123", "agent:inst_456", "knowledge:kb_1"
    action: string;   // 例: "read", "write", "execute", "approve"
  }>;
}
```

**响应 200**

```typescript
export interface AuthzCheckResponse {
  decisionId: string;   // 审计关联
  decidedAt: string;    // ISO-8601
  results: Array<{
    resource: string;
    action: string;
    allow: boolean;
    reason?: string;    // deny 时给出稳定 reason code，如 "NOT_MEMBER"
  }>;
}
```

| 状态 | 条件 |
|---|---|
| 200 | 全部检查完成（逐项 allow/deny） |
| 400 | body 非法、checks 为空或超过上限（上限 100） |
| 401 / 403 | 同 3.1 |

**冻结约束**：`resource` 命名规则 `<domain>:<id>`，domain 集合为 `workspace | agent | knowledge | tool | plugin | project | billing`；WeKnora 工作区归入 `knowledge`。新增 domain 需要修订本文。批量查询中任一资源不属于 token 组织（或 `X-Tenant-Id` 指定租户）时，该项 `allow=false`，不影响其他项。

**既有 enforcer 路径迁移（冻结）**：桌面端当前经 `casdoorAuth.authorizeResourceRemotely()` 调用 Casdoor `/api/enforce` 的资源授权（`casdoor-resources.ts` 项目/计费、`weknora-client.ts` 知识库），随本契约统一迁移到本接口；迁移完成前这些调用维持现状并在 PRD REQ-CU-63 跟踪，迁移后桌面端不再携带 Casdoor client secret。无 enforcer 配置时的行为必须为 fail closed，不得静默跳过授权。

## 3.3 既有接口的处置（冻结）

| 接口 | 处置 |
|---|---|
| `/api/v1/auth/casdoor/login`、`/exchange`、`/refresh`、`/logout` | 桌面端切换完成后不再调用；backend 仅在为其它客户端服务期间保留，并在文档标注退役计划（REQ-CU-55） |
| `/api/v1/identity/context` | 保留路径，认证从 backend token 改为 Casdoor JWT，**采用双 issuer 过渡窗口**（见下） |
| 其它面向 OpenBuddy 的接口 | 一律接受 Casdoor Bearer token（REQ-CU-50），过渡窗口同样适用 |

**双 issuer 过渡窗口（冻结）**：从 backend 部署 Casdoor JWT 校验（阶段 B）起，到桌面端零消费者确认（REQ-CU-55，阶段 D）止，所有面向 OpenBuddy 的接口必须同时接受 backend 签发的 token 与 Casdoor JWT，按 issuer 分别走对应校验链。窗口内服务端按 issuer 记录调用来源指标，作为零消费者判定依据。窗口结束后移除 backend issuer 支持；不允许无截止条件的长期双栈。

# 4. 网关验签（决策 D17）

`hermes-agent-gateway` 生产 `verify(headers)` 的冻结契约：

```typescript
export interface VerifiedIdentity {
  tenantId: string;   // 来自组织 claim
  actorId: string;    // JWT sub
  role: "tenant-admin" | "workspace-admin" | "member" | "viewer";
}

// 输入: 请求头；Bearer token 为 Casdoor access token。
// 输出: 校验通过返回 VerifiedIdentity；任何校验失败返回 null（网关映射为 401）。
// 必须校验: JWKS 签名、iss、aud、exp、组织 claim。JWKS 缓存 ≤ 10 分钟，kid 未命中强制刷新一次。
```

静态 token 表只允许出现在 `tests/**` 与 fixture；生产代码路径不得包含。

# 5. 变更流程

1. 提出变更：修订本文版本号与变更说明，更新 decisions.md 对应条目。
2. 桌面端与 backend 任一接口的破坏性变更（删字段、改语义）必须先发布兼容版本（双写或双读），再在下个版本移除。
3. 冻结前已识别的待定项以 PRD 第 11 节 Q1–Q7 的签字结论为准；签字后以修订版写入本文。
