# Runtime Adapter SDK Interface Design

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 责任和支持范围
<a id="REQ-R01"></a>
**REQ-R01**：统一桌面主进程到 Runtime 的边界。现有 OpenBuddy 是 `PiSessionRuntime`，不能称为 Local Hermes。首期生产适配器是 `local-pi` 和 `remote-hermes`；fake adapter 仅用于契约测试。Local Hermes、Claude、OpenAI 等独立 Runtime 是扩展槽，须通过相同契约测试、许可证和运维门槛后另立项，不等于首期支持。模型选择与 Runtime 选择分开。

Ekko 指 Control Plane 架构职责，不依赖一个未经核验的 Ekko 服务。Renderer 仅调用受 allowlist 管理的 preload DTO API；身份令牌、HTTP transport、Node/Pi 实例留在 main/service。

## 2. 唯一接口定义
<a id="REQ-R02"></a>
**REQ-R02**：以下为本项目拟建 v1 契约，其他 PRD 引用它，不另定义 AgentRuntime 子集。所有异步操作支持 AbortSignal（本地取消等待不等于远端取消运行）。

```typescript
type RuntimeKind = 'local-pi' | 'remote-hermes' | string;
type Scope = { tenantId: string; workspaceId: string; actorId: string };
type SessionRef = Scope & { sessionId: string; agentInstanceId: string; runtimeId: string };
type ErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' |
  'INVALID_ARGUMENT' | 'UNSUPPORTED_CAPABILITY' | 'RATE_LIMITED' |
  'UPSTREAM_UNAVAILABLE' | 'RESUME_EXPIRED' | 'TIMEOUT' | 'CANCELLED';
type RuntimeError = { code: ErrorCode; message: string; retryable: boolean; traceId: string };
type Capabilities = { protocolVersion: '1.0'; runtimeId: string; kind: RuntimeKind;
  features: { resume: boolean; cancel: boolean; approvals: boolean; tools: boolean;
    tasks: boolean; artifacts: boolean }; toolSchemaVersion: string };
type CallOptions = { signal?: AbortSignal; timeoutMs?: number };
type RequestContext = Scope & { requestId: string; idempotencyKey: string };
type ConnectionConfig = { endpointRef: string; credentialRef: string; scope: Scope };
type Session = SessionRef & { status: 'idle'|'running'|'waiting_approval'|'closed';
  revision: number; lastSeq: number; createdAt: string; updatedAt: string };
type MessageInput = RequestContext & { sessionId: string; text: string;
  artifactIds: string[] };
type RunReceipt = { sessionId: string; runId: string; status: 'accepted'; traceId: string };
type TaskInput = MessageInput & { title: string };
type Task = { taskId: string; sessionId: string; runId: string; status:
  'queued'|'running'|'waiting_approval'|'succeeded'|'failed'|'cancelled' };
type ToolDescriptor = { name: string; inputSchema: object; outputSchema: object;
  permission: string; sideEffect: 'read'|'write'; version: string };
type EventType = 'run.accepted'|'message.delta'|'tool.started'|'tool.result'|
  'approval.required'|'approval.resolved'|'artifact.created'|'run.completed'|
  'run.failed'|'run.cancelled'|'session.updated';
type RuntimeEvent = SessionRef & { eventId: string; seq: number; runId: string|null;
  type: EventType; occurredAt: string; traceId: string; payload: unknown };
interface RuntimeAdapter {
  connect(config: ConnectionConfig, options?: CallOptions): Promise<Capabilities>;
  disconnect(options?: CallOptions): Promise<void>;
  createSession(input: RequestContext & { agentInstanceId: string }, options?: CallOptions): Promise<Session>;
  getSession(ref: SessionRef, options?: CallOptions): Promise<Session>;
  sendMessage(input: MessageInput, options?: CallOptions): Promise<RunReceipt>;
  stream(ref: SessionRef, afterSeq: number, options?: CallOptions): AsyncIterable<RuntimeEvent>;
  cancel(ref: SessionRef, runId: string, context: RequestContext, options?: CallOptions): Promise<{accepted: boolean}>;
  resolveApproval(ref: SessionRef, approvalId: string, decision: 'approve'|'reject',
    context: RequestContext, options?: CallOptions): Promise<{accepted: boolean}>;
  executeTask(input: TaskInput, options?: CallOptions): Promise<Task>;
  listTools(ref: SessionRef, options?: CallOptions): Promise<ToolDescriptor[]>;
}
```

`payload: unknown` 只是 transport 边界类型；消费前必须以 `type` 对应的版本化 JSON Schema 校验（Gateway §4），禁止直接向 UI 透传上游对象。credentialRef 指安全凭据存储引用，禁止把 token 放进 Renderer/日志。Scope 来自主进程可信身份状态；服务端重新验证，不信任客户端 actorId。local-pi 使用 `tenantId=local:<installationId>`、本地 workspace、OS/profile actor；不得伪造企业身份或自动上传本地历史。

## 3. 生命周期、持久化与兼容
<a id="REQ-R03"></a>
**REQ-R03**：连接状态 `disconnected → connecting → ready → reconnecting/degraded → ready/closed`，握手 major 不兼容即拒绝。未协商能力调用返回 UNSUPPORTED_CAPABILITY。disconnect 关闭传输、不取消远端已接收 run。关闭会话、取消 run、断开传输是三种独立动作。

Session 绑定 runtimeId 不变；切换 runtime 仅影响新会话。活跃会话必须明确继续、取消或留后台，不静默迁移上下文、memory 和凭据。现有 Pi JSONL/SQLite catalog 保留读取与继续能力；remote catalog 保存引用/游标，不把远端权威状态写成 Pi session。Context/Memory 由各 runtime 管理，跨 runtime 导出须独立授权。

<a id="REQ-R04"></a>
**REQ-R04**：事件按 session 单调 seq，至少一次交付，客户端按 (runtimeId,sessionId,seq) 去重并事务性提交 projection+cursor。缺序先补流；过期游标重取 session/运行快照再订阅，不补造 delta。一个 session 首期串行 run，第二个并发写返回 CONFLICT；不同会话可并行。cancel 返回 accepted 后仍等待唯一终态；工具已产生的外部副作用不自动撤回。

## 4. 验收
<a id="REQ-R05"></a>
**REQ-R05**：local-pi、fake、remote-hermes 运行相同 contract suite：创建/发送/流/工具/权限提问/取消/错误/断线重连。Pi 旧会话可继续，本地无网络也可运行；remote 仅支持声明能力。端到端每 run 恰有一个有效终态；两租户复用相同 sessionId 测试不能串流；重复 delta 不重复显示。未验证上游能力不得以 fake 通过替代远端验收。Phase 1 退出还需真实受控 Hermes 环境，见 Gateway PRD。
