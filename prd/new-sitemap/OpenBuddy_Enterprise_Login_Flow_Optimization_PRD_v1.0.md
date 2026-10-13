---
branch: roadmap/enterprise-agent-os
change_type:
- BROWNFIELD_CHANGE
- INTEGRATION
owner: SMC Copilot
prd_id: PRD-OpenBuddy-Enterprise-Login-Optimization-001
product: open-buddy / smc-copilot Enterprise Agent OS
repository: "https://github.com/loudon84/open-buddy"
status: APPROVED_FOR_PLAN
target_release: Phase 1
title: OpenBuddy Enterprise Login Flow Optimization PRD v1.2
version: 1.2
---

# 1. 一句话目标

让 OpenBuddy 企业桌面用户通过统一企业身份入口完成 Casdoor 授权登录，同时优化企业后台地址配置体验，并保证登录流程不依赖操作系统默认浏览器。

# 2. 背景与问题定义

## 2.1 Current State

当前 OpenBuddy 已从原始 Casdoor 直连登录模式调整为：

``` text
OpenBuddy Desktop
        |
        v
nodeskclaw-backend Identity Gateway
        |
        v
Casdoor OAuth
        |
        v
本机临时端口 /callback
        |
        v
/api/v1/auth/casdoor/exchange
```

实现落在 `electron/main/backend-auth/BackendAuthService`。地址存在 sqlite 命名空间 `backend-auth:config` 的 `origin`。登录 URL 为 `{origin}/api/v1/auth/casdoor/login?return_to=http://127.0.0.1:{port}/callback`。令牌经系统加密后写入 `backend-auth:session`。当前用 `shell.openExternal` 打开系统浏览器。账户菜单「登录」打开 `BackendSignInDialog`，地址为空时要先保存再登录。设置里已有「企业登录」页 `EnterpriseLoginPanel`。

当前问题：

1. 用户点击本地用户菜单中的「登录」后，需要先打开登录对话框。
2. 对话框要求用户填写 backend 根地址。
3. 用户再次点击登录后才进入 Casdoor 授权流程。
4. OAuth 授权依赖系统默认浏览器。
5. 企业登录地址没有默认配置，用户体验不符合企业桌面软件模式。

Renderer 通过 preload 暴露能力给 UI，主进程负责 IPC 和系统能力调用。新增桌面能力必须经过 IPC 边界。

## 2.2 Problem

登录流程存在：

- 企业配置与用户操作耦合。
- 登录入口不是单一步骤。
- OAuth 授权体验不可控。
- 企业部署后需要重复输入固定地址。

## 2.3 Impact

业务影响：员工首次使用成本增加。

工程影响：登录逻辑分散。后续增加 SSO、组织绑定、权限同步困难。

# 3. Scope

## 3.1 In Scope

SCOPE-001：优化本地用户登录入口。地址已存在时直接授权，不再打开地址输入对话框。

SCOPE-002：仅当 `backend-auth:config` 从未写过时，写入企业默认地址。

SCOPE-003：用应用内授权窗口替换 `shell.openExternal`。登录 URL、本机回调和换票接口保持不变。

SCOPE-004：在现有「企业登录」设置页提供保存与测试连接。

## 3.2 Out of Scope

NON-GOAL-001：本版本不重新设计 Casdoor 服务端。

NON-GOAL-002：本版本不替换 nodeskclaw-backend Identity Gateway。

NON-GOAL-003：不修改 Hermes Runtime、Agent Tool Loop、Casdoor Server。

NON-GOAL-004：不把默认地址做成其它子系统的源码常量，也不覆盖用户已经保存的地址。

# 4. Architecture Boundary

| Domain | Owner | Input | Output | 不负责 |
| --- | --- | --- | --- | --- |
| Desktop UI | OpenBuddy Renderer | 用户操作 | 登录入口、设置页、toast | OAuth 协议、令牌明文 |
| Desktop Main | Electron Main | IPC 请求 | 授权窗口、回调、换票、加密会话 | 用户权限策略 |
| Identity Gateway | nodeskclaw-backend | OAuth 请求 | 用户身份、授权码兑换 | UI |
| Identity Provider | Casdoor | 授权请求 | 身份源登录态 | Desktop 状态 |

# 5. System Context

``` text
User
 |
 v
OpenBuddy Desktop
 |
 +--> backend-auth:config.origin
 |
 +--> 非模态授权子窗口
 |         partition: persist:enterprise-oauth
 |         |
 |         v
 |    127.0.0.1:{port}/callback
 |
 v
nodeskclaw-backend
 |
 v
Casdoor
```

# 6. Authoritative State

| State | Role | Authoritative | Writer | Reader |
| --- | --- | --- | --- | --- |
| origin | 企业配置 | YES | Desktop Setting / 首次默认写入 | Login Flow |
| OAuth browser session | Runtime State | YES | Main Process | Renderer 只看窗口开关 |
| Access / Refresh Token | 加密后的本地会话 | YES | Main Process | Main Process |
| User Profile | Identity State | YES | Backend | Desktop 展示名 |

令牌归主进程所有。渲染进程不接收 access token 或 refresh token 明文。启动时继续用已保存的 refresh token 刷新。刷新失败只清除本地会话，不清除授权分区。

# 7. Requirement Unit

## REQ-LOGIN-001 — 本地用户登录直达企业授权

### Goal

用户点击菜单「登录」后，在已有企业地址时直接进入企业 OAuth 授权。

### Normative Requirement

MUST：

- 点击登录后读取 `backend-auth:config.origin`。
- `origin` 非空时直接调用 `backend-auth:login`，不打开任何登录对话框。
- `BackendSignInDialog` 整体删除：连带 `overlay.sign-in` slot、`signInOpen` 状态、`SignInSurface` 及其 audit 记录一并移除。登录不再有对话框形态。
- 登录流程不得再次弹出地址输入窗口。
- `origin` 为空时打开设置中的「企业登录」页（`enterprise-login` / `EnterpriseLoginPanel`），并保持未登录。
- 登录失败、授权被拒、用户关闭授权窗口时保持未登录，并用现有 toast 显示原因。`backend-auth:login` 立即返回的错误，以及随后经 `backend-auth://status` 传来的错误，都提示一次。
- 登录成功不额外弹出成功提示。侧栏账户区改为已登录。

MUST NOT：

- 不允许默认打开系统浏览器。
- 不允许重复输入已经保存的企业地址。
- 不允许在登录对话框里收集或修改企业地址。

### State Transition

``` text
未登录
 |
点击登录
 |
读取 origin
 |
 +-- 为空 --> 打开企业登录设置页，保持未登录
 |
 +-- 非空 --> 打开授权子窗口
                |
                +-- 回调成功 --> 已登录
                |
                +-- 失败或关窗 --> 未登录，toast 说明原因
```

### Failure Semantics

F-001：

- trigger: `origin` 为空
- expected state: 显示企业登录设置页
- rollback: 保持未登录状态

F-002：

- trigger: 授权窗口被关闭、回调带错误、换票失败或无法开始登录
- expected state: 未登录，toast 显示现有登录错误文案
- rollback: 不写入会话；关闭本次回调监听

## REQ-LOGIN-002 — Electron 内置 OAuth Browser

### Goal

用一个非模态的应用内窗口替换系统浏览器，其余登录协议不变。

### Requirement

MUST：

- 只替换 `shell.openExternal`。登录 URL 仍是 `{origin}/api/v1/auth/casdoor/login?return_to=http://127.0.0.1:{port}/callback`。
- 换票仍调用 `{origin}/api/v1/auth/casdoor/exchange`。
- 授权页运行在主窗口的非模态子窗口中。主窗口保持可操作。
- 窗口使用持久分区 `persist:enterprise-oauth`，与主窗口会话隔离。单次授权结束不清除该分区。
- 页面请求新窗口时，在同一个授权窗口中打开，不调用系统浏览器。
- 在 `did-navigate` 级别拦截本次 `http://127.0.0.1:{port}/callback`：回调被监听端消费的同时关闭授权窗口，不展示「可以关闭此页面」。
- 关闭授权窗口取消本次登录，但有明确时序边界：仅当本轮回调尚未被监听端消费时，关窗才调用取消；回调已消费（含换票进行中）之后关窗，不再影响本轮。取消动作复用现有 `cancel()`（自增 round 使本轮失效）。

MUST NOT：

- 使用 `shell.openExternal` 作为默认授权流程。
- 把授权窗口设为模态。
- 修改 `return_to` 或改为截获 Casdoor 自身跳转来代替本机回调。

### Partition lifetime

- 用户主动退出登录时清除 `persist:enterprise-oauth`。
- 保存的 `origin` 发生变化并因此退出当前会话时，同时清除该分区。
- `origin` 未变化时不清除分区。
- refresh 失败只清除本地会话，保留分区，以便用户再次点击登录时仍可使用 Casdoor 登录态。

## REQ-CONFIG-001 — 企业登录地址默认配置

### Goal

企业桌面在从未写过地址配置时自动拥有默认地址。

默认值：

``` text
http://192.168.102.247:4510
```

### Requirement

MUST：

- 开发运行与打包安装使用同一规则。
- 仅当 `backend-auth:config` 这份配置从未写过时，把默认值写入 `origin`。
- 用户可以通过「企业登录」设置页修改。
- 修改后的值立即成为下一次 `backend-auth:login` 使用的地址。
- 用户保存空地址时，写入明确的空 `origin`，后续启动不得再填回默认值。
- 保存一个不同的 `origin` 时，立刻退出当前企业会话，并清除授权分区。
- 保存的地址与当前地址相同时，不退出，也不清除授权分区。

MUST NOT：

- 覆盖已经存在的配置，包括用户明确保存的空地址。
- 把该 IP 写入 Hermes、Runtime 或其它无关配置。

## REQ-CONFIG-002 — 企业登录设置页面优化

### UI 要求

在现有 `EnterpriseLoginPanel` 上调整，不新增一套设置页。

当前：

``` text
backend 根地址 [input]
失焦即保存
```

优化：

``` text
企业登录

Backend 服务地址

[ http://192.168.102.247:4510 ]

说明：
用于连接企业身份认证服务

[保存]
[测试连接]
```

要求：

- 输入框宽度固定。
- 「保存」执行现有 `parseBackendOrigin` 校验：https 允许；http 仅允许本机或内网；拒绝带路径、query 或账号信息的地址。空地址按 REQ-CONFIG-001 记为明确空值。
- 校验失败时展示明确错误，且不改掉已保存的地址。
- 「测试连接」由主进程请求 `{origin}/api/v1/auth/casdoor/login?return_to=http%3A%2F%2F127.0.0.1%2Fcallback`，`redirect: "manual"` 不跟随重定向，超时 5 秒。2xx 或 3xx 为成功；超时、连接失败、4xx/5xx 在设置页显示失败。
- 测试连接的结果不参与、也不阻止保存。
- 不再使用失焦自动保存作为唯一保存动作。

# 8. Data Contract

## backend-auth:config

从未写过：命名空间中没有这份文档。此时允许写入默认 `origin`。

已写过：

``` json
{
  "origin": "http://192.168.102.247:4510"
}
```

用户清空后仍然保留文档，`origin` 为空字符串。

additionalProperties: false

会话文档继续由主进程加密保存，不进入渲染进程，也不新增第二份令牌存储。

# 9. Ownership Contract

| Resource | Ownership |
| --- | --- |
| origin | USER_CONFIG。从未写过时由桌面写入一次默认值 |
| OAuth Token | MAIN_PROCESS。加密落盘，启动时刷新 |
| OAuth partition | MAIN_PROCESS。`persist:enterprise-oauth` |
| User Profile | BACKEND |

升级策略：

- 保留已有用户配置。
- 仅当配置文档不存在时写入默认值。
- 已知的迁移分支：本版本之前的实现中，用户保存空地址会删除整份配置文档。升级后这类机器与"从未写过"不可区分，会被写入默认地址。这是接受的行为：此类用户此前已无法登录，写入默认值后只需在设置页清空一次即可恢复其意图，且清空后新版本会保留空值。
- 不迁移、不重写已加密会话。

# 10. File Modification Scope

预计修改：

``` text
electron/main/backend-auth/
  backend-auth-service.ts
  授权窗口与分区清理

electron/main/ipc/backend-auth.ts
  测试连接 IPC

electron/preload/index.ts
  暴露测试连接通道

packages/ui/openbuddy-ui-settings/src/EnterpriseLoginPanel.tsx
  保存与测试连接

packages/ui/openbuddy-ui-dialogs/src/BackendSignInDialog.tsx
  删除。连带删除其测试与 @openbuddy/ui-dialogs 中的导出

src/features/app/AppShell.tsx
  删除 SignInSurface、overlay.sign-in 挂载与 signInOpen 状态

src/features/app/useAppShellRuntime.ts
  有地址时直接登录；无地址时打开企业登录设置；toast 显示失败；
  toast 文案来源为现有 backend-auth/error-copy.ts（return_to error 码 → 人类文案），
  无匹配码时展示后端返回的原文

src/features/app/types.ts
  删除 signInOpen / openSignIn 类型
```

禁止：

- 修改 Hermes Runtime。
- 修改 Agent Tool Loop。
- 修改 Casdoor Server。
- 替换 nodeskclaw-backend Identity Gateway。

# 11. Acceptance

A-001：已有地址时，点击本地用户登录，不出现 backend 地址弹窗，直接开始授权。

A-002：自动打开非模态 Electron 授权窗口，不调用系统浏览器。

A-003：回调到达后窗口关闭，桌面取得用户展示信息，侧栏变为已登录，且不弹出成功 toast。

A-004：配置文档不存在时，开发运行和打包安装都会写入默认企业地址。用户保存空地址后，再次启动仍然为空。

A-005：设置页修改地址并保存后，下一次登录使用新地址；若地址有变化，当前会话立即退出。

A-006：测试连接成功或失败只改变设置页状态，不改变已保存地址。

A-007：关闭授权窗口、主动退出、以及保存不同地址，三者的分区清理符合 REQ-LOGIN-002。refresh 失败后分区仍在。

# 12. Evidence

required test:

- `BackendAuthService` 测试：首次写入默认地址、显式空地址不被覆盖、登录路径断言 `shell.openExternal` 零调用、回调消费后关窗不取消本轮、回调消费前关窗取消本轮、改地址退出并清分区、退出清分区、refresh 失败保留分区。
- 设置页测试：保存与测试连接分离；非法地址不覆盖原值；测试连接超时 5 秒计失败。
- 登录入口测试：有地址时调用 `backend-auth:login` 且 `shell.openExternal` 零调用；无地址时打开企业登录设置页。

# 13. Grilling decisions

2026-10-13 确认。推荐答案均被采纳。

| ID | 决定 |
| --- | --- |
| Q1 | 默认地址只作为本企业桌面的首次配置，写入 `backend-auth:config.origin`，不覆盖已有值 |
| Q2 | 只替换 `shell.openExternal`；保留本机 `/callback` 与 `/api/v1/auth/casdoor/exchange` |
| Q3 | 令牌继续加密落盘并在启动时刷新；渲染进程不持有明文 |
| Q4 | 保存只做地址校验；测试连接失败不阻止保存；只有空地址才打开设置页 |
| Q5 | 开发运行与打包安装都应用首次默认值 |
| Q6 | 有地址时直接登录；无地址时打开「企业登录」设置页；关窗即取消 |
| Q7 | Cookie 使用持久分区 `persist:enterprise-oauth` |
| Q8 | 测试连接请求登录接口且不跟随跳转，2xx/3xx 为成功 |
| Q9 | 地址变化时立刻退出当前会话 |
| Q10 | 用户保存的空地址必须保留，不得在下次启动时写回默认值 |
| Q11 | 失败使用现有 toast；成功只更新侧栏账户区 |
| Q12 | 单一非系统浏览器窗口；回调地址不展示 HTML |
| Q13 | 主动退出清除授权分区；refresh 失败不清除 |
| Q14 | 地址变化导致退出时同时清除授权分区 |
| Q15 | 授权窗口是主窗口的非模态子窗口 |

2026-10-13 Review Round 2（R1–R6 全部应用，产出 v1.2）：

| ID | 决定 |
| --- | --- |
| R1 | `BackendSignInDialog` 整体删除，连带 `overlay.sign-in` slot、`signInOpen`、`SignInSurface` 及其 audit |
| R2 | 关窗取消有时序边界：回调被消费前关窗才取消；回调消费后关窗不影响本轮 |
| R3 | 测试连接带占位 `return_to`，`redirect: "manual"`，超时 5 秒，2xx/3xx 成功 |
| R4 | 升级前清过地址的机器视为"从未写过"，写入默认值；用户可再清空一次，新语义会保留空值 |
| R5 | Evidence 增加 `shell.openExternal` 零调用断言；§10 补 `error-copy.ts` 为 toast 文案来源 |
| R6 | `status: REVIEWED`，标题/版本对齐 v1.2 |
