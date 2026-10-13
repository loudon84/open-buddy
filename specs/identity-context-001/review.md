# Review: PRD-OPENBUDDY-IDENTITY-CONTEXT-001 v1.1 能否驱动实施

- **Date**: 2026-10-13
- **Verdict**: **fail** — 5 个 major 缺口会让实施者在同一处做出互相矛盾的代码
- **Reviewer focus**: PRD v1.1 条款 ↔ 现有 `backend-auth`、`prompt-cycle`、`runtime-core` 的可执行性

## 证据

1. `electron/main/backend-auth/backend-auth-service.ts:140` `init()` 只读 origin 和 cipher，不触发任何网络请求。PRD 要求"启动时如果 session 有效，立即后台拉取"，但 `init()` 没有返回 session 是否有效的信号（`hold` 字段是私有的），`IdentityService` 无法知道何时该拉取。
2. `packages/runtime-core/src/runtime-adapter.ts:20` `RuntimeRequest` 只有 `text` 和 `sessionId`。PRD 要求扩展 `identityContext`，但没说 `IdentityContext` 类型定义放哪（`runtime-core` 还是 `identity` 包），也没说 Pi 和 Hermes 两条路径的注入是否用同一个类型。
3. `electron/main/ipc/prompt-cycle.ts:134` Pi 分支是 `agentHost.prompt(text, { traceId, sessionId, signal })`。`agentHost` 的 `prompt` 方法签名在 `packages/runtime/openbuddy-runtime-adapter/src/types.ts`，不在 `runtime-core`。PRD 没说改哪个接口。
4. `electron/main/ipc/prompt-cycle.ts:100-119` Hermes 分支是 `platform.chat({ text, sessionId })`。`platform` 是 `getPlatformRuntimeManager()` 返回的 `RuntimeRegistry`，其 `chat` 方法签名在 `runtime-core`。PRD 没说 `identityContext` 是必选还是可选，以及 `platform.chat` 的调用方（`dispatch-prompt.ts`）是否也要改。
5. `packages/ui/openbuddy-ui-sidebar/src/Sidebar.tsx:1960` 侧栏账户区显示 `accountLabel` 和 `accountStatus`，没有 `tenant` 字段。PRD 要求"用户登录后展示企业信息（tenant 名称）"，但没说 tenant 名称从哪来（`identity:context` IPC 还是 `backendAuthStatus()` 扩展）。

## Findings

- **F1 (major) IdentityService 与 backend-auth 的联动未规定**：PRD 说"启动时如果 session 有效，立即后台拉取"，但 `backend-auth` 的 `init()` 不暴露 session 有效性。IdentityService 是订阅 `backend-auth://status` 事件，还是由 `backend-auth` 主动调用 `identity.refresh()`？两种实现的生命周期完全不同。
- **F2 (major) `IdentityContext` 类型定义位置未规定**：`runtime-core` 是纯接口包，不应该依赖 `electron/main/identity/`。但 `identityContext` 要进 `RuntimeRequest`，而 `RuntimeRequest` 在 `runtime-core`。类型定义放 `runtime-core` 会导致主进程类型泄漏到接口包，放 `identity` 包会导致 `runtime-core` 无法引用。
- **F3 (major) Pi 分支的 `agentHost.prompt` 接口未规定**：PRD 说"Pi 分支扩展 `agentHost.prompt` options"，但 `agentHost` 的 `prompt` 签名在 `packages/runtime/openbuddy-runtime-adapter/src/types.ts`，不在 `runtime-core`。PRD 没说改这个文件，也没说 `identityContext` 是加到 `PromptOptions` 还是新增一个 `PromptWithIdentity` 方法。
- **F4 (major) Hermes 分支的 `platform.chat` 签名未规定**：PRD 说"Hermes 分支 `platform.chat({ text, sessionId, identityContext })` 透传"，但 `RuntimeAdapter.chat` 的签名是 `chat(request: RuntimeRequest): Promise<RuntimeResponse>`。`RuntimeRequest` 扩展后，`dispatch-prompt.ts` 的 `chatActive: () => platform.chat({ text, sessionId })` 是否也要传 `identityContext`？`dispatch-prompt.ts` 的 `PromptDispatch` 接口是否也要扩展？
- **F5 (major) 侧栏 tenant 显示的数据源未规定**：PRD 说"用户登录后展示企业信息（tenant 名称）"，但侧栏现在只有 `backendSession.displayName` 和 `backendSession.status`。tenant 名称是从 `identity:context` IPC 获取，还是扩展 `BackendAuthView` 加 `tenant` 字段？两种实现影响 `backend-auth` 的边界。
- **F6 (minor) 审计日志的字段类型未规定**：`identity.context.fetch` 记 `userId, tenantId, result, error?, durationMs`，但没说 `result` 是 `"success" | "failure"` 还是 `"ok" | "error"`，`error` 是 string 还是 `{ code, message }`。
- **F7 (minor) 手动刷新按钮的 UI 状态未规定**：PRD 说"设置页提供手动刷新按钮"，但没说按钮在刷新中是否 disabled，刷新成功/失败显示什么。

## Required fixes（修订为 v1.2）

- **R1** 明确 `IdentityService` 与 `backend-auth` 的联动：是事件订阅还是主动调用，给出时序图。
- **R2** 明确 `IdentityContext` 类型定义位置：建议放 `packages/shared/openbuddy-types` 或 `runtime-core`，并说明理由。
- **R3** 明确 Pi 分支的接口修改：是改 `packages/runtime/openbuddy-runtime-adapter/src/types.ts` 的 `PromptOptions`，还是新增方法。
- **R4** 明确 Hermes 分支的调用链：`RuntimeRequest` 扩展后，`dispatch-prompt.ts` 和 `prompt-cycle.ts` 是否同步修改。
- **R5** 明确侧栏 tenant 显示的数据源：是 `identity:context` IPC 还是 `BackendAuthView` 扩展。
- **R6** 审计日志字段类型对齐现有 `auditRecord` 的 `outcome` 和 `detail` 形状。
- **R7** 手动刷新按钮的 UI 状态（disabled/loading/result）补充到 REQ-IDC-004。

## 处理记录

### 2026-10-13 Round 2

- R1 已应用：PRD v1.2 明确 `backend-auth` 暴露 `onSignedIn(listener)` 钩子，`IdentityService` 注册后由 `backend-auth` 在 `init()` 完成且 `signed_in` 时主动调用 `identity.refresh()`。
- R2 已应用：PRD v1.2 明确 `IdentityContext` 类型放 `packages/shared/openbuddy-types/src/identity.ts`。
- R3 已应用：PRD v1.2 明确修改 `packages/runtime/openbuddy-runtime-adapter/src/types.ts` 的 `CallOptions`。
- R4 已应用：PRD v1.2 明确 `PromptDispatch` 和 `dispatch-prompt.ts` 同步扩展。
- R5 已应用：PRD v1.2 明确侧栏 tenant 通过扩展 `BackendAuthView` 加 `tenant` 字段。
- R6 已应用：PRD v1.2 审计字段对齐 `auditRecord({ event, outcome, detail })`。
- R7 已应用：PRD v1.2 补充手动刷新按钮状态。

**Verdict after Round 2**: pass

### 2026-10-13 Round 3（批准前代码核对）

- 发现 R3 事实性错误：`agentHost.prompt` 实际签名在 `electron/main/agent/host-modules/pi-runtime-factories.ts`（`prompt: (text: string, options?: any)`），`packages/runtime/openbuddy-runtime-adapter/src/types.ts` 的 `CallOptions` 只属于 v1 远程契约的 `RuntimeAdapter`，与 Pi host 无关。已在 PRD v1.2 修正 REQ-IDC-003、§15 Implementation Boundary 与 §16 R3 行：目标改为在 host 侧定义 `PromptOptions`（含 `identityContext`），`prompt-cycle.ts` 调用处传入。
- R4 复核无误：`RuntimeRequest` 在 `packages/runtime-core/src/runtime-adapter.ts`（`{text, sessionId?}`），`RuntimeManager.chat` → `registry.getActive().chat(request)` 透传链路成立。
- R1/R2/R5/R6/R7 复核无误。

**Verdict after Round 3**: pass — `status: APPROVED_FOR_PLAN`
