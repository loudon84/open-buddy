---
branch: roadmap/enterprise-agent-os
change_type:
- ARCHITECTURE_CHANGE
- REFACTOR
- INTEGRATION
golden_consumer:
- Architect
- Desktop Engineer
- Backend Engineer
- Cursor/Coding Agent
owner: SMC Copilot
prd_id: PRD-OPENBUDDY-RUNTIME-ADAPTER-CONVERGE-001
product: OpenBuddy Enterprise Agent Shell
related_docs:
- OpenBuddy Runtime Adapter SDK Design v1.0（目标接口草图，本文给出与现有契约的映射）
- OpenBuddy Enterprise Agent Shell Architecture v2.0
- OpenBuddy Current Code Architecture Audit v1.0（附录 B）
- OpenBuddy Enterprise Agent Shell Migration Plan v1.0（F10–F19、M2）
- OpenBuddy Enterprise Identity Casdoor Unification PRD v1.0（D16 EnterpriseIdentityPort）
- OpenBuddy Enterprise Identity Interface Contract v1.1（FROZEN）
repository: "https://github.com/loudon84/open-buddy"
baseline_commit: 1a4bf84160e368206c5582ce96e0bb00ff21740c（另含 2026-10-14 身份统一的未提交改动）
status: DRAFT_FOR_REVIEW
target_release: Phase 1 补强（M2 Runtime 会话收敛）
title: OpenBuddy Runtime Adapter 会话收敛实施 PRD v1.0
version: 1.0
date: 2026-10-15
---

# 1. 一句话目标

让 Chat 的每一个会话**绑定一个 Runtime**，并经过**同一份会话契约**完成发送、流式输出、取消、审批和恢复：Local Pi 与 Remote Hermes 都作为 Adapter 接入，不再由全局开关决定消息去向，也不再用“新建会话 + 收集最终文本 + 伪造 Pi 完成事件”的临时桥。

本文是实施 PRD：给出现状证据、目标设计、需求、任务拆分、验收与删除门槛。本文本身不包含代码改动。

# 2. 背景与现状证据

## 2.1 证据来源

2026-10-15 对当前工作区（含身份统一未提交改动）做了三路只读扫描，均由 Grok 4.6 子代理完成，并由主会话抽查了 `session-chat.ts`、`prompt-cycle.ts`、`installPlatformPiBinding` 调用点。以下行号对应当前工作区。

## 2.2 设计草图与现有代码的关系

《Runtime Adapter SDK Design v1.0》提出 5 个方法的 `RuntimeAdapter { connect; sendMessage; stream(callback); stop; status }` 与状态 `DISCONNECTED/CONNECTED/RUNNING/ERROR/STOPPED`。仓库里**没有**这个接口，也没有这组状态值。现有的是：

| 契约 | 位置 | 形态 | 生产使用 |
|---|---|---|---|
| 会话契约（宪章 P4 的唯一来源） | `packages/runtime/openbuddy-runtime-adapter/src/types.ts:135-171` | 13 个方法：`connect/disconnect/createSession/getSession/sendMessage→RunReceipt/stream→AsyncIterable<RuntimeEvent>/cancel/resolveApproval/executeTask/listTools/executeTool/queryStatus` | `LocalPiAdapter`、`RemoteHermesAdapter` 实现；企业控制器使用 |
| 扁平 chat 契约 | `packages/runtime-core/src/runtime-adapter.ts:40-49` | `start/stop/health/chat/listCapabilities`，`chat()` 只返回最终文本，没有 `runId` | 平台 Runtime 选择器与 `agent:prompt` 分流 |

两份契约都导出了名为 `RuntimePhase` 的类型，值集合互不兼容（`types.ts:173-182` 与 `runtime-core/src/runtime-adapter.ts:7-14`）。

**结论：** 设计草图不能落成第三份契约。本文把草图的 5 个方法和 5 个状态映射到现有会话契约上（见第 4.2 节），把扁平 `runtime-core` 收窄为生命周期门面后退役 chat 路径。

## 2.3 当前有三条互不相通的执行链

1. **Local Pi 主链（用户真正在用）。** ChatView → `useAppShellRuntime` → `piSend/piSendContent/piCancel`（`src/features/app/useAppShellRuntime.ts:671-733`）→ `agent:*` IPC → `agentHost` → Pi `AgentSession`。事件经 `pi://*` 与 MessagePort 回到 `useAgentSession`（1123 行，紧耦合 Pi 事件形状）。
2. **平台 Runtime 分流。** 设置页 `AgentRuntimeSection` 调 `platform-runtime:health/switch`；Main 的 `RuntimeManager` 持有**全局** active runtime；`agent:prompt` 读到非 `pi` 时走 `dispatchPrompt → platform.chat → collectChat`，再由 `publish-assistant-turn.ts` 合成 `pi://update` + `pi://complete`。
3. **企业会话链。** `enterprise-runtime:*` 8 个通道 → `EnterpriseRuntimeController` → `RemoteHermesAdapter` → 项目 Gateway。Main 与 preload 已接，**Renderer 没有任何消费者**。

## 2.4 确认的缺口

| 编号 | 级别 | 缺口 | 证据 |
|---|---|---|---|
| G-RA-01 | P0 | 没有会话级 Runtime 绑定。切换全局 Runtime 会改变之后所有会话的 `agent:prompt` 去向 | `runtime-manager.ts:6-21`；`prompt-cycle.ts:110-146` |
| G-RA-02 | P0 | 只有 `agent:prompt` 按 Runtime 分流；`abort/steer/follow-up/prompt-content/set-model` 等 20 余个通道只走 Pi。Hermes 回合无法取消，附件会落到 Pi | `prompt-cycle.ts:170-479`；`session-misc.ts`；`sessions.ts` |
| G-RA-03 | P0 | `collectChat` 每次新建远端会话；发送用 `request.sessionId ?? newSession.sessionId`，订阅却是新会话；本地 Pi UUID 会被发给 Gateway | `packages/runtime-adapters/src/session-chat.ts:54-63` |
| G-RA-04 | P0 | `collectChat` 写死 2000 ms 超时后抛 `runtime chat timed out`；`signal` 只给 `stream`。真实 Hermes 回合几乎必然超时 | `session-chat.ts:51,63,72` |
| G-RA-05 | P0 | 远端回复被包装成一次性 `pi://update` + `pi://complete`，没有增量、工具、审批、`runId` | `electron/main/runtime/publish-assistant-turn.ts:3-27` |
| G-RA-06 | P1 | `installPlatformPiBinding` 零调用点，平台 Pi 槽是 no-op；`PiAdapter.health()` 仍报 healthy | `runtime-registry.ts:10-48`；`packages/runtime-adapters/src/pi-adapter.ts:32-36` |
| G-RA-07 | P1 | `platform-runtime:*` 与 `platform-plugin:*` 不在 preload invoke 白名单，设置页切换实际被拒绝；`channel-allowlist-parity` 测试因此失败 | `electron/preload/index.ts`；`electron/main/ipc/__tests__/channel-allowlist-parity.test.ts:51-59` |
| G-RA-08 | P1 | 两套远端栈：平台 Hermes（默认回落 `http://127.0.0.1:8642`）与企业控制器（需 `OPENBUDDY_ENTERPRISE_GATEWAY_URL`）各自持有会话与连接 | `electron/main/ipc/platform-runtime.ts:21`；`enterprise-runtime-controller.ts:33-46` |
| G-RA-09 | P1 | `agent:prompt` 传入的 `AbortSignal` 在 `agent-prompt.ts` 中从未读取；取消只能靠另一个 `agent:abort` | `prompt-cycle.ts:160`；`electron/main/agent/host-modules/agent-prompt.ts:115-153` |
| G-RA-10 | P1 | `policies.agents` 只在 `agent:prompt` 检查；`prompt-content/steer/follow-up` 绕过 | `prompt-cycle.ts:112-117` |
| G-RA-11 | P1 | 会话→Runtime 映射没有持久化：SQLite `session_catalog` 无 `runtimeId`，`session_bindings` 仅用于 expert；企业 `SessionRef` 只在内存 Map，退出即丢，无 attach/resume | `openbuddy-storage/src/sqlite/session-catalog.ts:3-17`；`migration.ts:182-189`；`enterprise-runtime-controller.ts:58-59` |
| G-RA-12 | P1 | Renderer 取消后立即 `abandonInFlightStream(status: "completed")`，没有等待终态事件 | `useAppShellRuntime.ts:725-732`；`src/lib/agent/abandon-stream.ts:58-74` |
| G-RA-13 | P1 | 远端能力写死（`cancel:false`、`approvals:false`），而 `cancel/resolveApproval` 方法存在；`connect` 只读 `protocolVersion` | `remote-hermes-adapter.ts:35-91`；`openbuddy-hermes-client/src/client.ts:19-26` |
| G-RA-14 | P1 | Renderer 传入的 `workspaceId` 不进入 Gateway 请求体；Gateway 以 JWT 的 workspace/tenant 为准，两边可能不一致 | `remote-hermes-adapter.ts:96-98`；`services/hermes-agent-gateway/src/casdoor-verify.ts:77-78` |
| G-RA-15 | P2 | 反向依赖：`packages/runtime-adapters` 从 `electron/main/runtime/*` 导入适配器，`runtime-registry.ts` 再导回，形成环 | `pi-adapter.ts:2`；`hermes-adapter.ts:3` |
| G-RA-16 | P2 | `LocalPiAdapter.createSession` 把 `agentInstanceId` 当 JSONL 路径；`cancel` 忽略 `runId` | `local-pi-adapter.ts:113-115,148-152` |
| G-RA-17 | P2 | 流是“分页 GET + 读完整响应体 + 轮询”（默认 1000 ms，平台覆盖为 20 ms），不是常驻 SSE | `remote-hermes-adapter.ts:80,116-134`；Gateway `server.ts:204-226` |
| G-RA-18 | P2 | 只在测试里使用：`SessionCoordinator`、`runtime-coordinator.ts`、`AdapterRegistry`、`SessionProjection`（且以 `sessionId` 单键，注释称 scope 分区但未实现） | 子代理 B7、A6、A8 |

## 2.5 文档漂移

`specs/P1-06-runtime-panel/evidence.md` 记录“`EnterpriseRuntimeDock` 已挂载在 `App.tsx`”，并引用 `src/features/enterprise-runtime` 测试目录。当前代码中二者都不存在；`packages/ui/openbuddy-ui-enterprise` 没有 package 化，也没有被 `src/` 或 `builtin-applies.ts` 引用。ledger 中 P1-06 的 `done` 需要追加纠偏说明（不改写历史，见 RA-10）。

## 2.6 可复用资产

- 会话契约 `types.ts`：`Scope/SessionRef/RequestContext/RunReceipt/RuntimeEvent/RuntimePhase/ErrorCode` 已足够表达目标语义。
- `RemoteHermesAdapter`：Bearer、401 单飞刷新、403 不重试、429 一次退避、幂等键与 `x-request-id`、按 `afterSeq` 续流。
- `EnterpriseRuntimeController`：主进程持有 token、校验会话归属、身份变化时 dispose（已接 `EnterpriseIdentityPort`）。
- `bindLocalPiRuntime` / `LocalPiAdapter`：已有 Pi host port 映射与 `mapPiHostEvent`。
- `openbuddy-ui-enterprise/runtime-session.ts` reducer：`cancel-pending`、`disconnected`、按 session/seq 去重。
- SQLite `session_bindings` 表：已存在的会话绑定机制，可承载 runtime 绑定。
- Gateway：幂等收据（tenant/workspace/operation/resource/key）、单终态、审批 digest 与过期校验。

# 3. 范围

## 3.1 本 PRD 包含

1. 会话契约的分层（Manager / Session）与设计草图的映射，不新增第三份契约。
2. 会话→Runtime 绑定的持久化与按绑定路由。
3. Local Pi 经真实 host 绑定接入 Adapter，同时保持现有 Pi Chat 体验不退化。
4. Remote Hermes 单一远端栈：替换 `collectChat`，合并平台 Hermes 与企业控制器。
5. Renderer 侧的 Runtime 无关会话客户端与事件投影，取消显示待确认或不确定。
6. 能力协商、IPC 可达、身份端口注入、策略检查覆盖所有变更类操作。
7. 旧桥退役与删除门槛；文档漂移纠偏。

## 3.2 不包含

- 第三方插件、企业 Workspace 目录 UI（P2-05/M3）。本文只要求会话能携带 workspace scope。
- 真实 Hermes 上游适配与 staging 验收（D03 外部阻塞）。本文只要求合同与 loopback fixture 通过。
- Hermes 安装与生命周期管理（设计草图明确不负责）。
- 把本地 Pi 历史迁移或上传到企业空间（宪章 P5）。
- 新的 Runtime 种类（nanobot、qwenclaw 等仍保持 unsupported）。

# 4. 目标设计

## 4.1 架构

```text
Renderer
  ChatView（不变） ← ChatStore（不变）
        ↑ 投影
  RuntimeSessionClient（新增，src/lib/runtime/session-client.ts）
    ├─ local-pi 会话：沿用 pi-client / useAgentSession（原生 Pi 事件，功能不退化）
    └─ 其他 Runtime：runtime://event → RuntimeEventProjector → ChatStore
        ↓ typed preload（runtime-session:* 通道）
Electron Main
  RuntimeSessionService（新增）
    ├─ SessionCatalog：uiSessionId → { runtimeId, instanceId, remoteSessionRef, cursor, scope, epoch }
    ├─ RuntimeRouter：所有变更类操作按绑定路由；不支持即返回 UNSUPPORTED_CAPABILITY
    └─ AdapterRegistry（已有，转为生产使用）
          ├─ local-pi    → LocalPiAdapter（bindLocalPiRuntime 接真实 Pi host）
          └─ remote-hermes:<instance> → RemoteHermesAdapter → hermes-agent-gateway
  RuntimeManager（收窄）：只管默认 Runtime、健康与能力，不再参与消息路由
  EnterpriseIdentityPort（D16）：远端 Adapter 只从端口取 scope 与 token
```

## 4.2 设计草图到现有契约的映射

`types.ts` 内部拆成两个接口，`RuntimeAdapter` 保持为二者的组合，现有实现无需改名：

| 设计草图 | 现有契约 | 层 |
|---|---|---|
| `connect()` | `connect(config, options) → Capabilities` | Manager（`RuntimeConnection`） |
| `stop()` | `disconnect(options)` | Manager |
| `status()` | `queryStatus()` 收紧为返回 `RuntimeStatus`（见下） | Manager |
| `sendMessage(sessionId, message)` | `sendMessage(MessageInput) → RunReceipt` | Session（`RuntimeSessionPort`） |
| `stream(callback)` | `stream(SessionRef, afterSeq, options) → AsyncIterable<RuntimeEvent>`，回调形式只在 IPC 边界由 Main 适配 | Session |
| （草图未列） | `createSession/getSession/cancel/resolveApproval` | Session |

状态模型分两层，不合并：

- **连接状态 `RuntimeStatus.state`**（新增到 `types.ts`，替代草图的大写枚举）：`disconnected | connecting | connected | degraded | error | stopped`。草图的 `RUNNING` 不是连接状态；用 `RuntimeStatus.activeRuns` 表达“有运行中任务”。
- **运行状态**：沿用 `types.ts` 已有的 `RuntimePhase`（`idle/accepted/running/waiting/completed/failed/cancel-pending/cancelled/disconnected`）。`runtime-core` 的同名 `RuntimePhase` 改名为 `RuntimeLifecyclePhase`，并在 RA-08 后删除。

## 4.3 会话绑定规则

1. 新建会话时确定 `runtimeId`（默认取 `RuntimeManager.defaultId`，或由 UI 显式选择），写入 SessionCatalog 后**不可变**。
2. 修改默认 Runtime 只影响之后新建的会话，不迁移、不重绑已有会话或运行中的 run。
3. 远端会话 `create` 只发生一次。之后的 send/stream/cancel/decide 都使用 catalog 中保存的远端 `SessionRef`。本地 Pi UUID 永远不发送给远端。
4. 绑定记录包含 `scope = {tenantId, workspaceId, actorId}` 与创建时的身份 `epoch`。身份端口 epoch 变化后，远端会话进入 `suspended`：只读展示历史，发送前必须由新身份重新 attach（`getSession` 校验归属），校验失败则保持只读，不静默换主体。
5. Runtime 不支持某个操作时，返回结构化错误 `UNSUPPORTED_CAPABILITY`，UI 禁用对应入口。**禁止回落到另一个引擎。**

## 4.4 终态与取消语义

- `sendMessage` 只返回 `RunReceipt { status: "accepted" }`，不代表完成。
- 终态只来自 `run.completed / run.failed / run.cancelled` 事件，每个 run 只接受第一个终态。
- 用户取消：UI 进入 `cancel-pending`；收到 `run.cancelled` 才显示已取消；若与 `run.completed` 竞态，以先到的终态为准。
- 超时或断流：进入 `disconnected`，按 `lastSeq` 续流；续流失败（如 410 `RESUME_EXPIRED`）显示 `uncertain`，提供重新加载，不伪报完成。
- Local Pi 保持现有 `agent:abort → session.abort()` 行为，但 Renderer 不再在 `finally` 中把回合直接标记为 `completed`，改为等待 Pi `complete` 事件或本地超时后标记 `uncertain`。

## 4.5 远端流

第一阶段保留 Gateway 的分页 SSE 加轮询（不阻塞收敛），但要求：

- Main 侧的 `RuntimeSessionService` 为每个活跃远端会话维护**一个**订阅，按 `seq` 去重并推送 `runtime://event`；Renderer 不轮询。
- 轮询间隔可配置，默认 500 ms；会话空闲时退避到 2 s。
- 第二阶段（RA-09 可选项）由 Gateway 提供常驻 SSE，Adapter 按能力 `features.liveStream` 选择。

# 5. 需求

## 5.1 契约（REQ-RA-01～08）

- **REQ-RA-01** 唯一会话契约是 `packages/runtime/openbuddy-runtime-adapter/src/types.ts`。新增类型只加在这里；禁止在 `runtime-core`、`runtime-adapters`、`src/lib`、`ui-enterprise` 或 Gateway 中再定义 `SessionRef/RuntimeEvent/RunReceipt` 的不兼容副本。
- **REQ-RA-02** `types.ts` 拆出 `RuntimeConnection`（connect/disconnect/queryStatus/listTools）与 `RuntimeSessionPort`（createSession/getSession/sendMessage/stream/cancel/resolveApproval/executeTask/executeTool），`RuntimeAdapter = RuntimeConnection & RuntimeSessionPort`。
- **REQ-RA-03** 新增 `RuntimeStatus { runtimeId; kind; state; activeRuns; capabilities?; lastError?: RuntimeError; checkedAt }`，`queryStatus()` 返回它。
- **REQ-RA-04** `Capabilities.features` 增加 `attachments`、`steer`、`followUp`、`modelSwitch`、`liveStream`，缺省为 `false`。
- **REQ-RA-05** `runtime-core` 的 `RuntimePhase` 改名为 `RuntimeLifecyclePhase`；`RuntimeResponse`、`chat()` 标记 `@deprecated`，仅供 RA-08 删除前的兼容。
- **REQ-RA-06** Runtime 标识统一为 `local-pi` 与 `remote-hermes:<instanceId>`。旧值 `pi`、`hermes` 只在读取设置与历史时映射，写入只用新值。
- **REQ-RA-07** `@openbuddy/runtime-adapter` 的 package exports 补齐 `./adapter-registry` 与 `./local-pi-events`；消费方改用包名导入，不再用跨目录相对路径。
- **REQ-RA-08** `packages/runtime-adapters` 不得 import `electron/main/**`。Adapter 实现留在 `electron/main/runtime/`（依赖 Electron 与 host），包内只保留可移植的纯函数，或在 RA-08 整体删除。

## 5.2 Main 进程（REQ-RA-10～22）

- **REQ-RA-10** 新增 `electron/main/runtime/session-catalog.ts`，复用现有 SQLite 表 `session_bindings(session_id, binding_type, binding_id, metadata_json)`：`binding_type = "runtime"`，`binding_id = runtimeId`，`metadata_json` 存 `{instanceId, remoteSessionId, scope, lastSeq, identityEpoch, createdAt}`。该表外键指向 `sessions`，绑定须在会话行写入之后创建；远端会话也要先登记一条 `sessions` 行。没有记录的旧会话视为 `local-pi`。不新增表、不改列。
- **REQ-RA-11** 新增 `electron/main/runtime/runtime-session-service.ts`，负责 create（只一次）、send、subscribe、cancel、decide、attach、dispose，并持有每会话一个流订阅。
- **REQ-RA-12** `agent:prompt`、`agent:prompt-content`、`agent:abort`、`agent:steer`、`agent:follow-up`、`agent:set-model` 先查 catalog：`local-pi` 走现有 Pi host；其他 Runtime 交给 `RuntimeSessionService`；不支持的操作返回 `UNSUPPORTED_CAPABILITY`。其余 Pi 专有通道（compact、rewind、fork 等）对非 Pi 会话返回同一错误。
- **REQ-RA-13** `policies.agents` 检查移到 RuntimeRouter，覆盖 REQ-RA-12 列出的所有变更类操作，检查对象是会话绑定的 `runtimeId`，而不是全局 active。
- **REQ-RA-14** `RuntimeManager` 只保留 `defaultId`、`setDefault`、`health`、`list`、`capabilities`；删除 `chat()`。
- **REQ-RA-15** 启动装配调用 `installPlatformPiBinding`（或其替代），把 `LocalPiAdapter` 接到真实 Pi host。未绑定时 `local-pi` 的状态为 `disconnected`，不得报 healthy。
- **REQ-RA-16** `agent-prompt.ts` 必须响应传入的 `AbortSignal`：signal 触发时调用 `session.abort()`，并记录取消审计。
- **REQ-RA-17** `LocalPiAdapter.createSession` 不再把 `agentInstanceId` 当路径：新会话由 host 创建，已有会话通过 `getSession({sessionId})` 解析为 host 已知路径；`cancel` 校验 `runId` 与当前 run 一致，不一致返回 `NOT_FOUND`。
- **REQ-RA-18** 合并远端栈：平台 Hermes 与企业控制器共用 `RuntimeSessionService` 和同一个 Gateway 端点解析函数。删除 `platform-runtime.ts` 中的 `http://127.0.0.1:8642` 默认回落；未配置时 `remote-hermes` 状态为 `disconnected` 并在 UI 上提示配置。
- **REQ-RA-19** 远端 Adapter 的 scope 与 token 只来自 `EnterpriseIdentityPort`（D16）。Renderer 传入的 tenant/actor 一律忽略；`workspaceId` 作为请求字段发给 Gateway，由 Gateway 校验成员资格。
- **REQ-RA-20** 身份 epoch 变化时：停止所有远端订阅，catalog 中远端绑定标记 `suspended`，迟到事件按 epoch 丢弃（与身份 PRD 的 REQ 一致）。
- **REQ-RA-21** 远端能力取自 Gateway `/v1/capabilities` 与实例状态，按 schema 校验；字段缺失按 `false`。不再写死。
- **REQ-RA-22** 每个远端调用必须带截止时间：控制面（create/send/cancel/decide）默认 15 s，单次事件页 30 s；可配置。不再使用 `collectChat` 的 2 s 总超时。

## 5.3 IPC 与 Preload（REQ-RA-30～33）

- **REQ-RA-30** `platform-runtime:list/health/switch` 加入 preload 白名单（通过 `channel-allowlist-parity` 测试）。`platform-plugin:*` 的处理不在本文范围，但须在 ledger 登记其仍不可达。
- **REQ-RA-31** 新增通道：`runtime-session:create`、`runtime-session:attach`、`runtime-session:capabilities`、`runtime-session:decide`，事件 `runtime://event`（载荷为脱敏的 `RuntimeEmission` 加 `uiSessionId`）。`send/cancel` 复用 `agent:prompt/agent:abort`，不新增平行通道。
- **REQ-RA-32** `enterprise-runtime:*` 改为调用 `RuntimeSessionService` 的薄门面，保持兼容；RA-08 后在零消费者时删除。
- **REQ-RA-33** 所有新通道在 `wrapIpcHandler` 内校验 sender 为主窗口主 frame，并对入参做 schema 校验。

## 5.4 Renderer（REQ-RA-40～46）

- **REQ-RA-40** 新增 `src/lib/runtime/session-client.ts`：`create(runtimeId)`、`send`、`sendContent`、`cancel`、`decide`、`capabilities(sessionId)`、`subscribe(uiSessionId)`。`local-pi` 会话内部仍委托 `pi-client`。
- **REQ-RA-41** 新增 `src/lib/runtime/runtime-event-projector.ts`：把 `RuntimeEvent` 投影到现有 ChatStore（`message.delta` → 助手增量，`tool.*` → 工具卡，`approval.requested` → 权限卡，`run.*` → 回合终态）。投影按 `(uiSessionId, seq)` 去重。
- **REQ-RA-42** `useAppShellRuntime` 的 send/content/cancel 改调 `session-client`。`local-pi` 路径的行为与现在逐项一致（多模态、队列、steer、follow-up、权限、工具、扩展 UI）。
- **REQ-RA-43** 取消不再在 `finally` 中直接 `abandonInFlightStream(status: "completed")`。等待终态；本地兜底超时（默认 10 s）后标记 `uncertain`。
- **REQ-RA-44** Composer 按 `capabilities` 禁用不支持的操作（附件、steer、模型切换、审批），并显示 Runtime 名称与实例。
- **REQ-RA-45** 新建会话时可选择 Runtime；设置页 `AgentRuntimeSection` 的“切换”改名为“设为新会话默认”，文案说明不影响已有会话。
- **REQ-RA-46** `useAgentSession` 本阶段不重写；只抽出 Runtime 无关的回合状态读写，供投影器复用。

## 5.5 Gateway（REQ-RA-50～54，与 GW-01/P1-08 协调）

- **REQ-RA-50** `POST /v1/sessions` 接受 `workspaceId`；Gateway 校验其属于 token 主体的 tenant，否则返回 403。
- **REQ-RA-51** `GET /v1/capabilities` 返回 REQ-RA-04 的 features；实例状态返回实例级能力。
- **REQ-RA-52** 请求体上限（默认 1 MiB），超限返回 413。
- **REQ-RA-53** 新增 `src/main.ts` 启动入口，用 `createCasdoorAccessTokenVerify` 装配 verify；静态 token 表只允许在测试中使用（D17）。
- **REQ-RA-54**（可选）常驻 SSE：`GET /v1/sessions/:id/events?afterSeq=&live=1` 保持连接并推送，能力位 `liveStream=true`。

# 6. 任务拆分

一个任务一个会话，沿用 `specs/<TaskId>-<name>/` 交付包。状态最高只能到 `done-fixture`，直到 D03 Hermes staging 可用。

| ID | 依赖 | 内容 | 主要文件 | 验收 |
|---|---|---|---|---|
| RA-00 | — | 基线与契约冻结：记录受影响测试基线；落 REQ-RA-01～06 的类型变更（不改行为）；登记建议决策 D18～D21 | `types.ts`；`runtime-core/src/runtime-adapter.ts`；`docs/roadmap/decisions.md` | typecheck 通过；现有 runtime 测试数量与结果不变 |
| RA-01 | RA-00 | IPC 可达：`platform-runtime:*` 加入 preload；修 parity 测试中的 runtime 部分 | `electron/preload/index.ts`；parity 测试 | 真实 preload 下 list/health/switch 可达；未知通道仍拒绝 |
| RA-02 | RA-00 | Pi 真实绑定：启动时安装绑定；未绑定报 `disconnected`；`AbortSignal` 生效；修 `LocalPiAdapter` 路径与 `runId` 校验 | `runtime-registry.ts`；`bind-local-pi.ts`；`agent-prompt.ts`；`local-pi-adapter.ts` | 未绑定时 health 非 healthy；signal 触发后 Pi 回合中止；Pi 多轮、附件、工具回归通过 |
| RA-03 | RA-00 | SessionCatalog 持久化 | `session-catalog.ts`；storage migration | 重启后绑定仍在；旧会话默认 `local-pi`；绑定不可变 |
| RA-04 | RA-02, RA-03 | RuntimeRouter：变更类通道按绑定路由；策略检查迁移；不支持即报错 | `prompt-cycle.ts`；`session-misc.ts`；`sessions.ts`；新 `runtime-router.ts` | Hermes 会话的 abort/附件不触发 Pi；Pi 会话行为不变；`policies.agents` 覆盖全部变更类操作 |
| RA-05 | RA-03, RA-04 | 远端单栈：`RuntimeSessionService` 替代 `collectChat`；create 一次；一个订阅；截止时间；合并平台与企业控制器；删除 8642 回落 | `runtime-session-service.ts`；`remote-hermes-adapter.ts`；`platform-runtime.ts`；`enterprise-runtime.ts` | loopback Gateway 下两轮对话只 create 一次；send/stream/cancel 同一远端会话；无 2 s 超时；迟到 epoch 事件被丢弃 |
| RA-06 | RA-05 | Renderer 会话客户端与投影器；取消待确认；能力禁用 | `src/lib/runtime/*`；`useAppShellRuntime.ts`；composer | 远端回合增量显示；cancel 显示 pending 后收敛；附件在不支持时禁用；Pi 回归通过 |
| RA-07 | RA-05 | 能力协商：Gateway 返回能力；Adapter 校验；UI 消费 | `remote-hermes-adapter.ts`；`hermes-client/src/client.ts`；Gateway `server.ts` | 能力缺失按 false；cancel/approval 仅在能力为 true 时可用 |
| RA-08 | RA-06 | 退役旧桥：删除 `collectChat`、`publish-assistant-turn.ts`、`runtime-core` 的 `chat()`、`runtime-adapters` 的反向依赖；`enterprise-runtime:*` 零消费者后删除 | 见第 7 节 | import 扫描为零；全部 runtime 测试迁移到新路径并通过 |
| RA-09 | RA-05 | Gateway 补强：`workspaceId` 校验、请求体上限、`main.ts` 装配 Casdoor verify；可选常驻 SSE | `services/hermes-agent-gateway/src/*` | 跨 workspace 403；超限 413；生产入口不接受静态 token |
| RA-10 | RA-06 | Electron 集成验收与文档纠偏：真实窗口两种 Runtime 各两轮；修正 P1-06 evidence 的挂载描述（追加，不改写） | `specs/RA-10-*/evidence.md`；`specs/P1-06-runtime-panel/evidence.md`；ledger | 打包或开发窗口录像/日志证据；ledger 分列 fixture 与 staging |

并行关系：RA-01、RA-02、RA-03 在 RA-00 后可并行；RA-07、RA-09 在 RA-05 后可与 RA-06 并行。

# 7. 删除清单与门槛

| 对象 | 处理 | 删除门槛 | 不可误删 |
|---|---|---|---|
| `packages/runtime-adapters/src/session-chat.ts`（`collectChat`） | RA-05 后从生产路径摘除，RA-08 删除 | 生产 import 为零；替代链两轮、取消、审批通过 | 测试中有价值的断言迁移到新服务测试 |
| `electron/main/runtime/publish-assistant-turn.ts` | RA-08 删除 | Renderer 不再依赖合成 `pi://complete` | 真实 Pi 事件链 |
| `runtime-core` 的 `chat()`、`RuntimeResponse`、`RuntimeRequest` | RA-08 删除 | `RuntimeManager.chat` 已删除 | `RuntimeRegistry` 与健康检查（迁移到收窄后的 Manager） |
| `packages/runtime-adapters` 对 `electron/main` 的导入 | RA-08 移除 | 包内无 Electron 依赖 | `LocalPiAdapter`、`RemoteHermesAdapter` 本体 |
| `electron/main/runtime/session-coordinator.ts`、`runtime-coordinator.ts` | RA-08 删除或改为服务内部实现 | 仅测试引用，测试迁移 | `SessionProjection` 的去重与 gap 逻辑（并入投影器并加 scope 键） |
| `enterprise-runtime:*` 8 个通道 | RA-05 改门面，RA-08 删除 | Renderer 与测试零消费者 | 主进程 token 持有与会话归属校验语义 |
| `platform-runtime.ts` 的 `127.0.0.1:8642` 默认回落 | RA-05 删除 | — | 端点 URL 校验函数 |

所有删除逐文件证明替代路径，不做目录级批量清理。

# 8. 验收标准

| AC | 场景 | 必须观察到的事实 | 层级 |
|---|---|---|---|
| AC-RA-01 | 设置页 Runtime 列表 | 真实 preload 下 list/health/switch 可达；未知通道拒绝 | Electron 集成 |
| AC-RA-02 | Local Pi 回归 | 两轮、附件、工具、权限、steer、follow-up、扩展 UI、历史重放均与基线一致；不联网 | 本地 + Electron |
| AC-RA-03 | 远端多轮 | 第一轮 create 一次，第二轮复用；send/stream/cancel 使用同一远端 `SessionRef`；Gateway 日志中无本地 Pi UUID | 合同 + loopback |
| AC-RA-04 | 切换默认 Runtime | 已有会话继续去往原 Runtime；新会话使用新默认；无静默回落 | 集成 |
| AC-RA-05 | 远端取消 | 点击取消后显示 pending；收到 `run.cancelled` 后显示已取消；与 `run.completed` 竞态时只出现一个终态 | 单元 + 集成 |
| AC-RA-06 | 断流恢复 | 断开后按 `lastSeq` 续流不重复；续流过期显示 uncertain 并可重载 | 合同 |
| AC-RA-07 | 不支持的操作 | 远端会话不支持附件时 composer 禁用附件；强行调用返回 `UNSUPPORTED_CAPABILITY`，Pi 未被调用 | 单元 + 集成 |
| AC-RA-08 | 身份变化 | 退出或切租户后远端订阅停止；迟到事件不进入 ChatStore；远端会话变为只读 | 单元 + 集成 |
| AC-RA-09 | 策略 | `policies.agents` 不含会话 Runtime 时，prompt、附件、steer、follow-up 全部被拒绝 | 单元 |
| AC-RA-10 | Pi 未绑定 | 未安装绑定时 `local-pi` 显示 disconnected，不显示 healthy | 单元 |
| AC-RA-11 | 重启 | 重启后会话仍绑定原 Runtime；远端会话 attach 校验归属后可继续 | 集成 |
| AC-RA-12 | 契约唯一 | 代码扫描：`SessionRef/RuntimeEvent/RunReceipt` 仅在 `types.ts` 定义；`runtime-adapters` 无 `electron/main` 导入 | 架构检查 |
| AC-RA-13 | Gateway 补强 | 跨 workspace 创建会话 403；请求体超限 413；生产入口拒绝静态 token | 合同 |
| AC-RA-14 | 真实上游 | 固定 Hermes 版本下 send/stream/cancel/approval 通过 | 授权 staging（D03，外部阻塞） |

# 9. 建议决策（实施前登记到 decisions.md）

按宪章 P2，以下采用推荐答案：

| 编号 | 问题 | 推荐决策 |
|---|---|---|
| D18 | 设计草图的 5 方法接口是否新建？ | 不新建。映射到 `types.ts`，拆为 `RuntimeConnection` 与 `RuntimeSessionPort`，`RuntimeAdapter` 为组合 |
| D19 | 会话 Runtime 绑定能否变更？ | 创建后不可变。切换默认只影响新会话；不做自动迁移或故障转移 |
| D20 | Local Pi 是否改走通用事件投影？ | 本阶段不改。Pi 保留原生 `pi://` 事件与 `useAgentSession`；只有非 Pi Runtime 走投影器。待 RA-10 后再评估合并 |
| D21 | 远端流是否必须先改常驻 SSE？ | 不必须。先保留分页轮询，由 Main 单订阅推送；常驻 SSE 作为能力位可选（REQ-RA-54） |

# 10. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| RuntimeRouter 改动 20 余个 `agent:*` 通道，可能让 Pi 回归 | 用户主链受损 | RA-04 先写 Pi 行为快照测试；Pi 会话的路由分支保持原调用，不经过 Adapter |
| `useAgentSession` 与 Pi 事件深度耦合 | 投影器难以复用 | D20：本阶段不重写，仅抽取回合状态 |
| 绑定写入影响现有会话目录 | 会话列表异常 | 只新增 `session_bindings` 的 `binding_type = "runtime"` 行，不改表结构；无记录默认 `local-pi`；远端会话在 `sessions` 中的行需标注来源，避免被 Pi JSONL 扫描误删 |
| 轮询带来延迟与请求量 | 首字慢 | 默认 500 ms 并空闲退避；常驻 SSE 作为后续能力 |
| 远端会话在身份变化后只读，用户体验突兀 | 用户困惑 | UI 显示“需以当前账号重新连接”，并提供 attach 入口 |
| Gateway 无真实 Hermes | 不能宣称生产可用 | 状态停在 `done-fixture`，D03 继续阻塞 |

# 11. 首个实施任务

先做 **RA-00 + RA-01**：类型冻结不改行为，加上 preload 白名单这一处小修复，风险最低，并能让设置页的 Runtime 健康检查真实可达。然后并行 RA-02（Pi 真实绑定与 signal）与 RA-03（SessionCatalog）。在 RA-04 完成之前，不要在 UI 上开放“新会话选择 Runtime”，否则会暴露 G-RA-02 的跨引擎取消与附件问题。
