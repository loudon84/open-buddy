---
branch: roadmap/enterprise-agent-os
change_type:
- ARCHITECTURE_CHANGE
- INTEGRATION
- MIGRATION
golden_consumer:
- Product Manager
- Architect
- Backend Engineer
- Cursor/Coding Agent
owner: SMC Copilot
prd_id: PRD-OPENBUDDY-IDENTITY-CASDOOR-UNIFY-001
product: OpenBuddy Enterprise Agent Shell
related_docs:
- OpenBuddy Enterprise Identity Interface Contract v1.0（FROZEN，本文接口的冻结定义）
- OpenBuddy Enterprise Agent Shell Architecture v2.0
- OpenBuddy Current Code Architecture Audit v1.0
- OpenBuddy Enterprise Agent Shell Migration Plan v1.0
- OpenBuddy Runtime Adapter SDK Design v1.0
- OpenBuddy Enterprise Login Flow Optimization PRD v1.2（被本文部分取代）
- OpenBuddy Enterprise Identity Context Architecture PRD v1.2（被本文部分取代）
- nodeskclaw-backend Identity Gateway + Casdoor Adapter Engineering PRD v1.2（被本文部分取代）
repository: "https://github.com/loudon84/open-buddy"
baseline_commit: 1a4bf84160e368206c5582ce96e0bb00ff21740c
status: DRAFT_FOR_REVIEW
target_release: Phase 1 补强（Runtime Adapter 前置）
title: OpenBuddy 企业身份统一到 Casdoor 直连 PRD v1.0
version: 1.0
date: 2026-10-14
revision_notes:
- 2026-10-14: 首轮评审（APPROVE WITH FIXES）修订。修复 C1 租户判别缺失（X-Tenant-Id + 409 重试）、C2 enforcer 授权路径（新增 G-ID-09、REQ-CU-63）、C3 双 issuer 过渡窗口；补 REQ-CU-25（workbench-summary 脱敏）、AC-CU-11~15、ID-08、GW-02；Q5 已确认（旧链携带 client secret）、Q3 沿用现有 claim 解析、新增 Q8（IdP 不可达降级）；破坏性清理移至阶段 D。契约同步升级为 v1.1。
---

# 1. 一句话目标

把 OpenBuddy 桌面端的企业登录统一回 **casdoorAuth 直连公司内部 Casdoor**，退役并行的 backend-auth 登录链；Casdoor 成为用户与组织的唯一主数据源，nodeskclaw-backend 改为验证 Casdoor JWT 的资源授权服务，并通过同一个 Casdoor token 向 OpenBuddy 返回企业身份上下文与资源授权结果。

本文只定义需求与决策，**不包含实施**。

# 2. 决策记录（ADR）

以下决策已按仓库惯例（开发默认先行、生产 gate 待签字）于 2026-10-14 采纳并写入 [docs/roadmap/decisions.md](../../docs/roadmap/decisions.md) D13–D17，本文为其完整论证与需求展开。相关 Task 的 `grilling.md` 应引用对应编号。与 D01（复用现有 Casdoor/OIDC）一致，不冲突。接口定义以 [OpenBuddy_Enterprise_Identity_Interface_Contract_v1.1](OpenBuddy_Enterprise_Identity_Interface_Contract_v1.0.md)（FROZEN）为准。

## D13 企业身份单一权威：Casdoor 直连

- **背景**：当前同时存在两条企业身份链。旧链 `casdoorAuth`（桌面端作为 OIDC 客户端直连 Casdoor）与新链 `backendAuth` + `IdentityService`（经 nodeskclaw-backend 登录与换票）各自持有 token、主体、租户，退出互不联动。企业运行时、资源、计费、WeKnora、workbench scope 只认旧链；侧栏登录与 prompt 身份只认新链。用户可能出现"侧栏是 A、运行时是 B"的混合态。
- **决策**：Casdoor 已部署到公司内部服务器。桌面端企业登录统一使用 `casdoorAuth` 直连内部 Casdoor（OIDC Authorization Code + PKCE）。`backendAuth` 登录链退役，不再作为任何企业能力的身份来源。
- **理由**：
  1. 主要消费者（企业/平台运行时、Casdoor 管理、资源、计费、WeKnora、workbench scope）已接在 `casdoorAuth`，迁移面最小。
  2. 旧链桌面端已有 state、nonce、PKCE S256、ID token JWKS 验签与 iss/aud 校验、多租户切换；新链桌面端无这些保护。
  3. `casdoor-resource-gateway` 已按 Casdoor JWT（iss/aud/JWKS）验签，服务端验签口径可统一。
- **后果**：侧栏登录/退出、企业登录设置页、`IdentityService` 的 token 来源需要迁移；`backend-auth:*` IPC 与本地会话需要有序退役。

## D14 用户与组织主数据：Casdoor 为主，单向同步

- **决策**：Casdoor 是用户、组织、成员关系、粗粒度角色的唯一主数据源（system of record）。nodeskclaw-backend 现有用户与组织数据 **一次性迁移** 到 Casdoor，并建立稳定 ID 映射；之后 **Casdoor → backend 单向同步**（webhook 为主，定时对账为辅）。backend 的用户/组织写接口改为只读或禁用。
- **不采纳**：长期"backend → Casdoor"同步或双向同步。原因是双写冲突、ID 漂移与删除语义不一致。
- **后果**：backend 需要实现同步消费者与对账任务；组织/成员管理入口统一到 Casdoor（或经 OpenBuddy 已有的 Casdoor 管理界面）。

## D15 资源授权：backend 为 PDP，不写进客户端 token

- **决策**：
  - Casdoor 负责认证（AuthN）、组织归属与粗粒度角色（tenant-admin、workspace-admin、member、viewer，见 D01）。这些可以作为 token claims。
  - 细粒度资源授权（workspace、agent 实例、知识库、工具、插件等）由 nodeskclaw-backend 作为策略决策点（PDP）判定。backend 内部可以调用 Casdoor Casbin enforce，或使用自有 ACL。
  - OpenBuddy 通过 **携带 Casdoor access token 调用 backend 接口** 获取身份上下文与授权结果。不把资源权限清单塞进 Casdoor 签发给桌面端的 token 或 userinfo。
- **理由**：JWT 撤权存在延迟；权限清单会膨胀 token；客户端持有的权限不能作为强制授权（迁移计划第 2.1 节权威表）。
- **后果**：backend 需提供身份上下文与授权查询接口并验证 Casdoor JWT；桌面端只把返回结果用于展示与入口复核，服务端执行时仍需逐次校验。桌面端现有的第三条授权路径——经 `casdoorAuth.authorizeResourceRemotely()` 直连 Casdoor `/api/enforce`（依赖 client secret，见 G-ID-09）——也归入本决策，统一迁移到 backend `/api/v1/authz/check`（REQ-CU-63）。

## D16 Runtime 只依赖注入的企业身份端口

- **决策**：企业运行时、平台运行时及后续 Runtime Adapter 不直接 import `casdoorAuth` 或 `backendAuth`，而是依赖主进程中的 `EnterpriseIdentityPort`。它提供：当前主体（tenant、actor）、access token 获取与刷新、auth epoch、身份变化订阅。首个实现由 `casdoorAuth` 提供。
- **后果**：退出、切租户、换账号时，端口发出变化事件，运行时控制器据此 `dispose` 旧订阅与会话；迟到响应按 epoch 丢弃。

## D17 服务端统一验证 Casdoor JWT

- **决策**：nodeskclaw-backend、`hermes-agent-gateway`、`casdoor-resource-gateway` 统一校验 Casdoor 签发的 access token：签名（JWKS）、`iss`、`aud`、`exp`、组织/租户 claim。`hermes-agent-gateway` 生产 `verify` 按此实现，不再使用静态 token 表（仅保留给 fixture）。
- **后果**：需要规划 `aud` 方案（见第 11 节待确认问题）；Hermes 网关的生产 verify 实现登记为外部依赖。

# 3. 背景与现状（基线 `1a4bf841`）

## 3.1 两条身份链对比

| 维度 | 旧链 `casdoorAuth` | 新链 `backendAuth` + `IdentityService` |
|---|---|---|
| OAuth 客户端 | 桌面端直连 Casdoor | nodeskclaw-backend；桌面端只换一次性 code |
| 登录入口 | 设置 → 账户管理 | 侧栏、设置 → 企业登录 |
| 浏览器与回调 | 系统浏览器 + `casdoor://localhost/callback` | 应用内 BrowserWindow（`persist:enterprise-oauth`）+ `127.0.0.1` loopback |
| 桌面端防护 | state、nonce、PKCE S256、ID token JWKS 验签、iss/aud 校验 | 无 state/PKCE，仅读取 `code` |
| 配置 | `OPENBUDDY_CASDOOR_*` → SQLite `casdoor:config` | SQLite `backend-auth:config.origin`，默认 `http://192.168.102.247:4510` |
| token | Casdoor access/refresh/id token | backend access/refresh token |
| 持久化 | 仅加密 refresh token（safeStorage） | 加密整个会话；`identity:context` 缓存为明文 |
| 过期 | `getAccessToken()` 过期返回 null | `identityAuth()` 不检查过期 |
| 身份模型 | `CasdoorIdentity`（subject、organization、roles、permissions、groups、capabilities、tenantMemberships…） | `IdentityContext`（user、tenant、roles、permissions、policies.agents） |
| 租户切换 | 支持（`casdoor:tenant-select`） | 不支持 |
| 主要消费者 | 企业/平台运行时、管理 API、资源、计费、WeKnora、workbench scope | 侧栏、企业登录面板、`prompt-cycle` 身份注入与 agent 白名单 |

## 3.2 已确认的问题

| 编号 | 问题 | 证据 |
|---|---|---|
| G-ID-01 | 只经侧栏登录时企业运行时报 `UNAUTHENTICATED` | `electron/main/ipc/enterprise-runtime.ts:11-23` 只读 `casdoorAuth` |
| G-ID-02 | 两条链可同时登录不同用户，运行时与 prompt 使用不同主体 | `ipc/enterprise-runtime.ts` vs `ipc/prompt-cycle.ts:108` |
| G-ID-03 | 两种退出互不清理对方，均不 dispose 企业运行时 | `casdoor-auth.ts:694-707`、`backend-auth-service.ts:318-338`、`enterprise-runtime-controller.ts:163-168` 无调用方 |
| G-ID-04 | 侧栏退出审计事件名为 `casdoor.logout`，实际是 backend 退出 | `src/features/app/useAppShellRuntime.ts:554-562` |
| G-ID-05 | 旧链 refresh 无 single-flight；`EXPIRY_SKEW_SECONDS` 声明未使用；无 auth epoch | `casdoor-auth.ts` |
| G-ID-06 | `sessions.ts`、`session-misc.ts`、`misc.ts` 调用 `casdoorAuth.authorize(...)` 但忽略返回值 | 对应 IPC 文件 |
| G-ID-07 | `hermes-agent-gateway` 只有注入式 `verify`，仓库内无生产实现 | `services/hermes-agent-gateway/src/server.ts:65-68` |
| G-ID-08 | `electron/main/ipc/index.ts:53` 仍 import `casdoorAuth` 但无调用；企业运行时注册丢弃返回值在 `ipc/index.ts:1144` | 死 import、无 dispose 接线 |
| G-ID-09 | 存在第三条授权路径：桌面端经 `authorizeResourceRemotely()` 直连 Casdoor `/api/enforce`，使用 `OPENBUDDY_CASDOOR_CLIENT_SECRET`；无 secret 时 `casdoor-resources.ts:210` 静默跳过远端鉴权（fail open）。项目/计费（`casdoor-resources.ts:210-212`）与 WeKnora（`weknora-client.ts:62-66`）依赖该路径 | `casdoor-auth.ts:815-818`、上述消费者 |

# 4. 目标架构

```text
公司内部 Casdoor（用户/组织/成员/粗粒度角色 · 唯一主数据源）
   │  OIDC Code + PKCE                     │ webhook / 定时对账（单向）
   ▼                                       ▼
OpenBuddy Desktop (Electron Main)     nodeskclaw-backend（资源授权 PDP）
  casdoorAuth（唯一企业会话）              ├─ 校验 Casdoor JWT
  EnterpriseIdentityPort                   ├─ GET /api/v1/identity/context
   ├─ tenant / actor / epoch / 订阅         └─ 资源授权查询（workspace/agent/知识库/工具）
   ├─ IdentityService（用 Casdoor token 拉 backend 上下文）
   ├─ Runtime（enterprise / platform / 后续 Adapter）
   └─ 资源 / 计费 / WeKnora / workbench scope
        │ Bearer = Casdoor access token
        ▼
  hermes-agent-gateway / casdoor-resource-gateway（各自校验 Casdoor JWT）

Renderer 只拿精简身份视图，不持有 token
```

权威归属：

| 数据/行为 | 唯一权威 | 禁止的替代 |
|---|---|---|
| 用户、组织、成员、粗粒度角色 | Casdoor | backend 自行新增/修改用户与组织 |
| 桌面端企业会话与 token | Main `casdoorAuth`（经 `EnterpriseIdentityPort` 暴露） | 第二套登录会话互补 |
| 资源授权 | nodeskclaw-backend PDP（服务端逐次校验） | token 内权限清单、UI 隐藏按钮当授权 |
| prompt 身份与 agent 白名单展示 | backend 返回的 IdentityContext（凭 Casdoor token 获取） | 桌面端本地拼装或信任 renderer 传入 |

# 5. 范围

## 5.1 本 PRD 范围内

1. 桌面端：casdoorAuth 加固；侧栏与设置页切换到 Casdoor 登录；`IdentityService` 改用 Casdoor token；`EnterpriseIdentityPort`；统一退出与 epoch；运行时接入端口；backend-auth 链退役与本地数据清理。
2. nodeskclaw-backend：校验 Casdoor JWT；身份上下文接口改用 Casdoor token；用户/组织一次性迁移与单向同步；资源授权查询接口。
3. Casdoor 部署配置：桌面应用注册为公开客户端 + 强制 PKCE；token 有效期与 refresh 轮换；audience 规划。
4. `hermes-agent-gateway` 生产 `verify` 的契约要求（实现可在网关任务中完成）。

## 5.2 非目标

- 不实现 Runtime Adapter 本身的会话路由（见 Runtime Adapter 相关 Task），本文只提供它依赖的身份端口。
- 不改变本地匿名 Pi 的离线可用性。
- 不在本轮实施任何代码；不部署、不调用真实身份服务。
- 不删除旧 Casdoor 链的 state/nonce/PKCE、签名校验、租户约束等安全语义。

# 6. 功能需求

## 6.1 桌面端登录（casdoorAuth）

| ID | 需求 | 验收 |
|---|---|---|
| REQ-CU-01 | 企业登录唯一入口为 `casdoorAuth.login()`，连接公司内部 Casdoor；issuer、clientId、redirect、scope、management URL 可通过 `OPENBUDDY_CASDOOR_*` 与设置页配置，生产默认值由部署配置提供而不是硬编码 IP | 清空配置时显示 `configuration_needed`；配置后能完成登录 |
| REQ-CU-02 | 桌面应用以 OIDC 公开客户端登录，强制 PKCE S256，桌面端不得携带 client secret | 代码与打包产物中无 client secret；Casdoor 应用配置记录在部署文档 |
| REQ-CU-03 | 回调方式：保留 `casdoor://localhost/callback`；评估并优先支持 RFC 8252 loopback（`http://127.0.0.1:{port}/callback`），可复用现有 backend-auth 的 loopback 监听器与应用内授权窗口代码。最终方案见待确认问题 Q1 | 选定方案在 Windows 开发模式、多实例、打包版均可完成回调；协议被抢注或重复回调时拒绝 |
| REQ-CU-04 | refresh 增加 single-flight；启用 expiry skew（提前 60 秒视为过期）；token 交换与刷新使用有界超时 | 并发 10 次取 token 只触发一次 refresh；网络挂起时有界失败 |
| REQ-CU-05 | 引入 auth epoch：login、logout、切租户，以及任何改变身份绑定的配置变更（含 issuer 变更）都递增 epoch；所有在途换票/刷新/身份请求在落盘前校验 epoch | 退出或切租户后迟到响应不恢复旧会话、旧身份或旧租户 |
| REQ-CU-06 | 退出先完成本地失效（内存、SQLite、计时器、在途请求），再有界地撤销 refresh token（Casdoor revocation 接口，不存在则由 Q6 确认替代）；是否用系统浏览器打开 `end_session_endpoint` 由配置决定，默认不打开 | 断网时退出在有界时间内完成，本地状态已清空；撤销后旧 refresh token 不可用 |
| REQ-CU-07 | 多租户：明确 Casdoor 中"用户属于多个企业租户"的表达方式（见 Q3），`tenantMemberships` 与 `activeTenantId` 按该方式解析 | 单租户用户自动选中；多租户用户可切换；切换后资源与运行时使用新租户 |

## 6.2 侧栏与设置页

| ID | 需求 | 验收 |
|---|---|---|
| REQ-CU-10 | 侧栏登录/退出改调 Casdoor 链（`casdoorLogin` / `casdoorLogout`）；账户名与租户名来自 Casdoor 会话视图与 IdentityContext 精简视图 | 侧栏登录后企业运行时、资源、prompt 使用同一主体 |
| REQ-CU-11 | 合并"账户管理"与"企业登录"两个设置入口为一个企业账户设置，提供 Casdoor 地址配置、测试连接、登录状态、租户切换、刷新身份 | 设置页只存在一个企业登录入口 |
| REQ-CU-12 | 审计事件按真实链路命名，例如 `casdoor.login`、`casdoor.logout`、`casdoor.tenant-switch`、`identity.context.refresh` | 审计记录与实际操作一致 |
| REQ-CU-13 | 身份上下文刷新完成时主动推送事件到 renderer（新增事件通道并加入 preload `allowedEventChannels`，例如 `identity://changed`），侧栏即时更新租户与 stale 状态 | 首次登录后无需手动刷新即可看到租户；未知事件通道仍被拒绝 |

## 6.3 身份上下文与授权（桌面端）

| ID | 需求 | 验收 |
|---|---|---|
| REQ-CU-20 | `IdentityService` 改用 Casdoor access token 调用 backend `GET /api/v1/identity/context`；不再依赖 `backendAuth.identityAuth()` | 断开 backendAuth 后身份上下文仍可获取 |
| REQ-CU-21 | 身份缓存绑定 issuer、subject、tenant、epoch；不匹配时视为无效 | 换账号或换 Casdoor 地址后不显示旧用户 |
| REQ-CU-22 | 展示缓存与执行授权分离：缓存可用于离线展示；企业动作（远端运行时、资源写入、企业工具）需要有效会话与未过期授权；403 对企业动作 fail closed。Casdoor 不可达时的降级策略按 Q8：写动作立即 fail closed，只读查询有界宽限并标记 stale | 撤权后企业动作被拒绝；IdP 不可达时写动作拒绝、只读视图标记 stale、本地 Pi 不受影响 |
| REQ-CU-23 | 修复忽略 `authorize()` 返回值的调用点，按操作性质分类处理。当前调用点：`sessions.ts:46-94`（session 列表/加载/消息）、`session-misc.ts:39-99`（subagents 配置、permission 列表/保存）、`misc.ts:206-557`。原则：`team.workspace` 能力不得拦截本地 Pi 功能（违反宪法 P5）；本地 Pi 相关调用点移除无意义的 authorize 调用，企业资源相关调用点改为真正拦截 | 未授权的企业 workspace 操作被拒绝；未登录 Casdoor 时本地 Pi 全部功能正常 |
| REQ-CU-24 | Renderer 只拿精简身份视图（user、tenant、roles、stale 标志），不获得 token、permissions 原文或 policies 原文 | `identity:*` IPC 输出不含 token、permissions、policies |
| REQ-CU-25 | `casdoor:workbench-summary` 当前向 renderer 返回 permissions、capabilities、groups、customFields（`ipc/casdoor.ts:63-84`）。按 REQ-CU-24 同一原则脱敏，仅保留界面必需的字段；管理界面确需的权限信息经专门的管理通道按角色返回 | workbench-summary 输出不含 permissions/capabilities 原文；现有管理 UI 回归通过 |

## 6.4 企业身份端口与运行时

| ID | 需求 | 验收 |
|---|---|---|
| REQ-CU-30 | 新增主进程 `EnterpriseIdentityPort`：`current()`（tenantId、actorId、issuer、epoch 或 null）、`getAccessToken()`、`refresh()`、`onChange(listener)`；首个实现基于 `casdoorAuth` | 端口有单元测试，覆盖登录、退出、切租户、刷新失败 |
| REQ-CU-31 | `enterprise-runtime.ts`、`platform-runtime.ts`、`security/casdoor.ts` 的 workbench scope 同步，及后续 Runtime Adapter 只依赖端口，不直接 import `casdoorAuth` / `backendAuth`。Casdoor 管理 API（`casdoor-management.ts`）作为 Casdoor 专属适配器允许直接依赖 `casdoorAuth`，但主体与 epoch 仍以端口为准 | import 扫描：运行时与 workbench scope 无直接身份模块引用 |
| REQ-CU-32 | 端口变化（退出、切租户、换账号）时，`EnterpriseRuntimeController.dispose()` 被调用，已开启的流立即停止；`registerEnterpriseRuntimeIpc` 的返回值被保留并在应用退出时 dispose | 退出后旧流不再向 renderer 推送事件 |
| REQ-CU-33 | 运行时请求带上 epoch，返回时 epoch 不一致则丢弃 | 切租户期间迟到的旧租户事件被丢弃 |

## 6.5 backend-auth 链退役

| ID | 需求 | 验收 |
|---|---|---|
| REQ-CU-40 | 分两步退役：先由开关 `OPENBUDDY_IDENTITY_MODE=casdoor`（默认）停用 backendAuth 的登录入口与身份来源；确认零消费者后删除 `backend-auth:*` IPC、`backend-auth-service.ts`、`oauth-window.ts`（可复用部分迁入 casdoorAuth） | 开关为 casdoor 时 backendAuth 不初始化；删除前 import 与调用扫描为零 |
| REQ-CU-41 | 升级清理：首次以 casdoor 模式启动时清除 SQLite `backend-auth:session`、`backend-auth:config`、旧 `identity:context` 缓存与 `persist:enterprise-oauth` 分区 | 升级后不残留旧 backend token |
| REQ-CU-42 | 删除默认 `DEFAULT_BACKEND_ORIGIN` 硬编码；backend 地址作为资源授权服务地址单独配置 | 生产源码中无硬编码内网 IP（`tests/**` 中的 loopback/fixture 地址豁免，需显式标注） |
| REQ-CU-43 | 清理 `electron/main/ipc/index.ts` 中无用的 `casdoorAuth` import | lint 通过 |

## 6.6 nodeskclaw-backend（服务端需求）

| ID | 需求 | 验收 |
|---|---|---|
| REQ-CU-50 | 所有面向 OpenBuddy 的接口接受 `Authorization: Bearer <Casdoor access token>`，校验 JWKS 签名、`iss`、`aud`、`exp`、组织 claim。从部署之日起进入双 issuer 过渡窗口（同时接受 backend 旧 token，按 issuer 分别校验并记录来源指标），窗口到 REQ-CU-55 桌面端零消费者确认时结束；不允许无截止条件的长期双栈 | 伪造、过期、错误 aud 的 token 返回 401；窗口内两种 issuer 各自可用，窗口外旧 token 401 |
| REQ-CU-51 | `GET /api/v1/identity/context` 用 Casdoor 主体返回 IdentityContext（user、tenant、roles、permissions、policies.agents），并附 `contextVersion` 与 `expiresAt` | 契约测试覆盖成功、401、403、租户不存在 |
| REQ-CU-52 | 提供资源授权查询接口（例如 `POST /api/v1/authz/check`，批量支持），输入 subject 来自 token，资源与动作来自请求体；结果带 `decisionId` 便于审计 | 客户端传入的 tenant 与 token 不一致时拒绝 |
| REQ-CU-53 | 用户/组织一次性迁移脚本：backend → Casdoor，产出 ID 映射表（Casdoor `owner/name` 或 `id` ↔ backend user id）；迁移可重复执行且幂等 | 演练两次结果一致；映射表无重复 |
| REQ-CU-54 | Casdoor → backend 单向同步：消费 Casdoor webhook（用户/组织/成员/角色的增删改），并有定时全量对账；backend 用户/组织写接口只读化 | 在 Casdoor 删除成员后，backend 授权在同步周期内拒绝该成员 |
| REQ-CU-55 | 原 `/api/v1/auth/casdoor/login|exchange|refresh|logout` 在桌面端切换完成后下线或仅保留给其它客户端，并在文档中标注 | 桌面端不再调用这些接口 |

## 6.7 网关与其它服务

| ID | 需求 | 验收 |
|---|---|---|
| REQ-CU-60 | `hermes-agent-gateway` 提供生产 `verify` 实现：校验 Casdoor JWT 并映射为 `VerifiedIdentity`（tenantId、actorId、role）；静态 token 表仅限测试 | 无效 token 返回 401；跨租户实例访问 404/403 |
| REQ-CU-61 | `casdoor-resource-gateway` 现有校验保持不变，与本方案的 audience 规划对齐 | 现有资源与计费回归通过 |
| REQ-CU-62 | WeKnora token 交换继续使用 Casdoor token；其权限检查随 REQ-CU-63 迁移到 backend `/api/v1/authz/check`（资源 domain `knowledge`） | 知识库回归通过；无 enforcer 配置时 fail closed |
| REQ-CU-63 | 桌面端直连 Casdoor `/api/enforce` 的授权路径（G-ID-09）迁移到 backend `/api/v1/authz/check`：项目/计费（`casdoor-resources.ts:210-212`）、WeKnora（`weknora-client.ts:62-66`）。迁移后桌面端不再携带 Casdoor client secret；迁移完成前保留现有行为并在证据中显式标注 fail-open 风险 | 迁移后源码检索不到 client secret 使用；无 backend 时企业资源操作 fail closed |

# 7. 非功能需求

- **安全**：token 只在 Main；safeStorage 不可用时不持久化 refresh token；日志与审计不含 token；所有企业接口服务端独立验签与授权。
- **可用性**：Casdoor 不可达时本地 Pi 正常；企业功能明确显示"企业服务不可用"，不显示假登录态。
- **时效**：access token 有效期建议 ≤ 30 分钟（以部署配置为准）；成员撤销在同步周期内生效，周期由 backend 配置。
- **可观测**：审计事件区分 login、refresh、logout、tenant-switch、context-refresh、authz-check，并关联 requestId 与 epoch。
- **兼容**：升级不破坏本地 Pi 历史；旧 Casdoor 加密 refresh token 可继续使用。

# 8. 验收矩阵

| AC | 场景 | 必须观察的事实 | 测试层 |
|---|---|---|---|
| AC-CU-01 | 仅从侧栏登录 | 运行时、资源、prompt 身份为同一 Casdoor 主体 | Electron 集成 |
| AC-CU-02 | 退出 | 内存、SQLite、身份缓存、运行时流全部清理；断网时有界完成 | 单元 + Electron |
| AC-CU-03 | 切租户 | 旧租户订阅与面板立即失效，新请求使用新租户 | 集成 |
| AC-CU-04 | 迟到响应 | 退出/切租户后迟到的 token、身份、运行时事件均被丢弃 | deferred 单元 |
| AC-CU-05 | 并发刷新 | 只触发一次 refresh，所有调用方拿到同一新 token | 单元 |
| AC-CU-06 | 撤权 | Casdoor 移除成员后，backend 授权在同步周期内拒绝；桌面企业动作 fail closed | 后端联调 |
| AC-CU-07 | 服务端验签 | 伪造、过期、错误 aud 的 token 被 backend 与 Hermes 网关拒绝 | 合同测试 |
| AC-CU-08 | 升级清理 | 升级后不残留 backend-auth token 与分区数据 | Electron 集成 |
| AC-CU-09 | 匿名离线 | 未登录、断网时本地 Pi 可正常使用 | Electron 集成 |
| AC-CU-10 | 无 client secret | 生产源码与打包产物中检索不到 Casdoor client secret（tests 豁免） | 构建检查 |
| AC-CU-11 | 缓存绑定 | 换账号、换 issuer、换租户后旧身份缓存不显示、不用于执行 | 单元 + Electron |
| AC-CU-12 | 端口边界 | import 扫描：运行时与 workbench scope 无 casdoorAuth/backendAuth 直接引用；`identity:*` 与 workbench-summary 输出无 token/permissions 原文 | 静态检查 + 单元 |
| AC-CU-13 | 多租户选择 | 多候选租户返回 409 + candidates；带 `X-Tenant-Id` 重试成功；指定非候选租户 403；切租户后身份上下文与运行时租户一致 | 合同 + 集成 |
| AC-CU-14 | 双 issuer 窗口 | 窗口内 backend 旧 token 与 Casdoor JWT 各自可用；来源指标可分 issuer 统计；窗口外旧 token 401 | 后端合同测试 |
| AC-CU-15 | enforcer 迁移 | 项目/计费/WeKnora 授权经 `/api/v1/authz/check`；无 client secret；无 backend 时 fail closed | 集成 |

fixture 与真实内部 Casdoor 的验收结果分别记录；未在真实环境验证的项保持 `done-fixture`。

# 9. 迁移与回滚

1. **阶段 A（桌面端准备）**：casdoorAuth 加固（REQ-CU-01～07）、`EnterpriseIdentityPort`（REQ-CU-30～33）。backendAuth 仍可用，不改用户入口。
2. **阶段 B（服务端准备）**：backend 接受 Casdoor JWT（REQ-CU-50～52）；完成用户/组织迁移与同步（REQ-CU-53～54）；网关 verify（REQ-CU-60）。
3. **阶段 C（切换）**：开关 `OPENBUDDY_IDENTITY_MODE=casdoor` 设为默认；侧栏与设置页切换（REQ-CU-10～13）；`IdentityService` 改用 Casdoor token（REQ-CU-20～25）。本阶段**不执行**破坏性清理，旧 backend-auth 会话与配置保留，保证可回滚。
4. **阶段 D（退役）**：确认零消费者后删除 backend-auth 代码与 IPC（REQ-CU-40、42、43），并执行升级清理（REQ-CU-41，清除旧会话、配置与 OAuth 分区）；backend 下线旧登录接口并结束双 issuer 窗口（REQ-CU-50、55）。

**回滚**：阶段 C 期间可把开关切回 `backend`，旧会话仍在，恢复旧入口无需重新登录；回滚不删除 Casdoor 会话与审计记录。REQ-CU-41 的破坏性清理在阶段 D 才执行，清理后不再支持回滚到 backend-auth。

# 10. 外部依赖

| 依赖 | 负责方 | 阻塞的需求 |
|---|---|---|
| 内部 Casdoor 地址、桌面应用（公开客户端 + PKCE）、回调白名单、token 有效期配置 | 运维 / 身份管理员 | REQ-CU-01～03 |
| Casdoor webhook 配置与 backend 可达性 | 运维 | REQ-CU-54 |
| backend Casdoor JWT 校验、身份上下文、授权接口、迁移与同步 | nodeskclaw-backend 团队 | REQ-CU-20、50～55 |
| Hermes 网关生产部署与 verify | 网关负责人（关联 D03） | REQ-CU-60 |

# 11. 待确认问题

| ID | 问题 | 推荐默认 |
|---|---|---|
| Q1 | 回调方式：保留 `casdoor://` 还是改用 loopback？ | 优先 loopback + 应用内授权窗口（复用现有代码）；`casdoor://` 作为兼容保留一个版本 |
| Q2 | audience 规划：OpenBuddy、backend、Hermes 网关、resource gateway 共用一个 `aud` 还是分开？ | 首期共用一个应用 `aud`，服务端校验组织 claim；后续按需拆分 |
| Q3 | 多租户在 Casdoor 中如何表达？ | 沿用现有 claim 解析：桌面端 `tenantMemberships` 已从 JWT claims（organizations / memberships）推导（`@openbuddy/auth-casdoor` `permissions.ts:195-299`、`authorization.ts:66-99`），resource-gateway 测试也使用 `organizations` claim。保持该格式，tenantId 取组织 `name`；不引入新的 groups/custom field 约定 |
| Q4 | backend 现有用户 ID 与 Casdoor ID 冲突或重复时的合并规则？ | 以邮箱/工号为主键合并；冲突项人工确认，不自动覆盖 |
| Q5 | 旧链当前是否携带 client secret？ | **已确认携带（可选）**：code 交换、refresh 与 enforcer 调用会从 `OPENBUDDY_CASDOOR_CLIENT_SECRET` 发送 secret（`casdoor-auth.ts:523-524, 644-645, 817`）。处理：应用改为公开客户端；code/refresh 路径移除 secret（REQ-CU-02）；enforcer 路径随 REQ-CU-63 迁移后不再需要 secret |
| Q6 | 退出时是否打开系统浏览器结束 Casdoor 会话？refresh token 如何撤销？ | 默认不打开浏览器；优先调用 Casdoor token revocation 接口有界撤销 refresh token，若部署版本不支持则由运维确认替代方案；提供配置项 |
| Q7 | 成员撤销同步周期多长可接受？ | webhook 实时 + 15 分钟对账；生产值由安全负责人签字 |
| Q8 | Casdoor 不可达时企业功能如何降级？ | 企业写动作立即 fail closed；只读企业查询允许使用缓存身份并标记 stale，宽限期 ≤ 15 分钟且可配置，超时后仅保留本地 Pi。最终白名单与宽限值由安全负责人签字 |

# 12. 与既有文档的关系

- **取代**：Login Flow Optimization PRD v1.2 与 Identity Context Architecture PRD v1.2 中"保持 nodeskclaw-backend 登录流程不变、桌面端经 backend 换票"的前提；nodeskclaw-backend Identity Gateway PRD v1.2 中"backend 作为桌面登录 OAuth 客户端"的部分。
- **保留**：Identity Context PRD 的 IdentityContext 数据结构、缓存/TTL/审计设计、精简 renderer 视图；改为用 Casdoor token 获取。
- **衔接**：迁移计划 M1（身份与 IPC）按本文落地，其中 F03 原针对 `backend-auth-service.ts` 的加固（epoch、统一失效、超时与单飞）改落到 `casdoor-auth.ts`（REQ-CU-04～06）；F05～F08 按 REQ-CU-20～25 执行。Runtime Adapter 相关 Task 依赖 REQ-CU-30～33。

# 13. 建议 Task 拆分

一会话一个 Task，沿用 `specs/<TaskId>-<short-name>/` 交付包。

| 顺序 | Task | 覆盖需求 | 依赖 |
|---|---|---|---|
| ID-01 | ~~决策落账与契约冻结~~（已于 2026-10-14 完成：D13–D17 已写入 decisions.md，契约 v1.1 已 FROZEN） | — | — |
| ID-02 | casdoorAuth 加固与配置收口：single-flight、skew、超时、epoch、本地优先退出、refresh 撤销；Casdoor 地址/客户端配置与 `configuration_needed` 状态；移除 code/refresh 路径的 client secret | REQ-CU-01、02、04～06 | ID-01 |
| ID-03 | 回调与多租户：按 Q1/Q3 结论实现回调与租户解析；`X-Tenant-Id` 传递 | REQ-CU-03、07 | ID-02 |
| ID-04 | 身份端口落地与运行时/workbench scope 接入：dispose、epoch 丢弃 | REQ-CU-30～33 | ID-02 |
| ID-05 | IdentityService 改用 Casdoor token，缓存绑定、授权分离、authorize 调用点分类修复、workbench-summary 脱敏 | REQ-CU-20～25 | ID-02、backend REQ-CU-50/51 |
| ID-06 | 侧栏与设置页切换、审计命名、身份变化推送（含 preload 事件通道）；开关 `OPENBUDDY_IDENTITY_MODE` | REQ-CU-10～13、40（第一步） | ID-04、ID-05 |
| ID-07 | 升级清理、backend-auth 代码退役与仓库卫生（`.tmp-email-verified.py` 等杂散文件清理） | REQ-CU-40～43 | ID-06 稳定运行 |
| ID-08 | enforcer 迁移：casdoor-resources 与 weknora-client 改用 `/api/v1/authz/check`，移除桌面端 client secret | REQ-CU-62、63 | BE-01（authz 接口）、ID-05 |
| BE-01～03 | backend：JWT 校验（含双 issuer 窗口）与身份/授权接口；用户/组织迁移；单向同步与对账 | REQ-CU-50～55 | ID-01 契约 |
| GW-01 | Hermes 网关生产 verify | REQ-CU-60 | ID-01 契约、D03 |
| GW-02 | resource-gateway audience 对齐与回归 | REQ-CU-61 | ID-01 契约、Q2 |
