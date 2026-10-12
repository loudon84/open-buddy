# Hermes Gateway API Specification

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 权威与上游差异
<a id="REQ-G01"></a>
**REQ-G01**：本文是拟建 `services/hermes-agent-gateway` 的项目目标契约 v1，不是上游 Hermes 已实现 API。Work 本地源码仅证明 chat/run/SkillRun/Expert 客户端与进程启动编排；Hermes server 不在 `apps/work`。Phase 0 建上游 capability matrix，Phase 1 编写兼容桥并在受控服务验证。现有 `services/casdoor-resource-gateway` 负责身份/资源治理，不冒充 Agent Gateway；可复用其身份验证接口，禁止把 Agent turn 塞入资源接口。

## 2. 传输、安全和公共类型
<a id="REQ-G02"></a>
**REQ-G02**：API 前缀 `/v1`，HTTPS + JSON 命令 + SSE 事件为首期唯一基线；WebSocket 是后续能力，MCP 是 Tool 协议，不是 REST/SSE 的替代传输。主进程 JS SDK 为首期；Web/Mobile SDK 后续复用 DTO，不能继承 Electron secrets/process API。

Scope、Session、Task、RuntimeEvent、RunReceipt、RuntimeError、Capabilities 类型以[Runtime SDK §2](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R02)为准。每请求 Authorization bearer + X-Request-ID；写请求 Idempotency-Key 必填。tenant/workspace 由经验证 token/membership 与请求资源关联导出，客户端 scope 必须匹配。OIDC 校验签名、issuer、audience、exp/nbf、membership/revocation；远端禁止沿用本地开发的匿名模式。服务到 Hermes 凭据仅存在服务端 secret store，不能把用户 token 无条件转发第三方。

Token 刷新在可信主进程执行，单飞刷新后最多重试一次；401 不无限重连。退租/登出撤销订阅、删除客户端 credential 和敏感缓存引用。已有 audit 包可接入，但每条决策须记录 actor/tenant/workspace/resource/action/outcome/policyVersion/requestId/traceId/time（去除token、cookie和默认原文内容）。

## 3. 端点与方法对应
<a id="REQ-G03"></a>
**REQ-G03**：以下端点均待建并以 OpenAPI/JSON Schema 生成客户端。

- `GET /v1/capabilities` → Capabilities；对应 connect 握手，返回版本/支持能力与限制，不暴露上游密钥。
- `POST /v1/sessions`，body `{workspaceId,agentInstanceId}` → 201 Session；对应 createSession。actor/tenant 为服务端权威。
- `GET /v1/sessions/{sessionId}` → 200 Session；对应 getSession。额外 `GET /v1/sessions/{sessionId}/snapshot` → `{session,activeRun,terminalRuns,projection,lastSeq}`，snapshot 与 lastSeq 同一一致性点。
- `POST /v1/sessions/{sessionId}/messages`，body `{text,artifactIds}` → 202 RunReceipt；对应 sendMessage，用户输入为不可信内容。
- `GET /v1/sessions/{sessionId}/events` → `text/event-stream`；对应 stream。`Last-Event-ID` 为 session seq 的十进制字符串，首次可用 `afterSeq` query；两者同时存在必须相同，否则 400。
- `POST /v1/sessions/{sessionId}/runs/{runId}/cancel`，body `{}` → 202 `{accepted:true}`；对应 cancel。已终态返回200 `{accepted:false}`，不再发第二终态。
- `POST /v1/sessions/{sessionId}/approvals/{approvalId}/decision`，body `{decision:"approve"|"reject"}` → 202 `{accepted:true}`；对应 resolveApproval，权限、run、动作摘要和审批有效期必须匹配。过期/已决返回409，重复相同幂等请求重放原响应。
- `POST /v1/tasks`，body `{workspaceId,sessionId,title,text,artifactIds}` → 202 Task；对应 executeTask；`GET /v1/tasks/{taskId}` 返回权威状态，`POST /v1/tasks/{taskId}/cancel` 转同一 run cancel（带同样鉴权与幂等）。
- `GET /v1/sessions/{sessionId}/tools` → `{tools:ToolDescriptor[]}`；对应 listTools。
- `POST /v1/sessions/{sessionId}/tools/{toolName}/invocations`，body `{input,approvalId?}` →202 `{invocationId,runId}`；对应受授权 executeTool，非任意 Renderer 后门。结果进入 tool.result，写动作经审批守卫。
- `GET /v1/agent-instances/{agentInstanceId}/status` → `{agentInstanceId,status,capabilities,updatedAt}`；queryStatus；`GET /health/live` 与 `/health/ready` 为运维探针，不返回业务数据。

旧草案 `/api/session/create`、`/api/session/message`、`/api/session/{id}/stream`、`/api/tool/execute`、`/api/agent/status` 被上述资源路径替代，它们从未被验证为现有上游契约，不要求虚构向后兼容路由。Work 真实路径只由兼容桥映射，版本矩阵留测试证据。

## 4. 流与重试规范
<a id="REQ-G04"></a>
**REQ-G04**：SSE `id: seq`、`event: type`、`data: RuntimeEvent JSON`；心跳为注释不占 seq。推荐默认心跳15秒、45秒无数据转reconnecting；指数退避1/2/4/8秒、上限30秒并加jitter，token无效先认证。数值为可配置工程默认，须在部署测试报告记录。

事件 payload schema 必须至少定义：run.accepted `{requestId}`；message.delta `{messageId,delta}`；tool.started `{invocationId,toolName,inputSummary}`；tool.result `{invocationId,output?,error?}`；approval.required `{approvalId,actionDigest,summary,expiresAt}`；approval.resolved `{approvalId,decision}`；artifact.created `{artifactId,mimeType}`；run.completed `{usage?,resultArtifactIds}`；run.failed `{error:RuntimeError}`；run.cancelled `{reason}`；session.updated `{revision,status}`。error/summary不得包含凭据；工具原文输出和文档/页面内容标为不可信输入，禁止提升为系统指令。

服务端先持久化事件再发布，seq 在 session 生命周期内不重置；每 run 单一终态，终态后迟到增量丢弃并计数。桥必须把上游无序/重复事件归一；上游不能恢复则能力降级并返回 RESUME_EXPIRED，禁止伪装可恢复。游标过期返回410及snapshot入口；客户端以快照+lastSeq重建，不能重发已接收命令。

幂等键作用域 `(tenant,workspace,actor,operation,idempotencyKey)`，持久化 request hash/receipt 与业务写入同事务；同键不同body409。推荐保留24小时，并在能力响应暴露实际窗口；跨上游崩溃边界无法证明是否已执行时置 `unknown/reconcile-required` 运维状态、禁止自动重放有副作用操作，直到查询/人工对账。不得声称外部 exactly-once。read 超时可重试，write 仅同key重试；429 obey Retry-After。

## 5. 错误与验收
<a id="REQ-G05"></a>
**REQ-G05**：HTTP 400→INVALID_ARGUMENT，401→UNAUTHENTICATED，403→FORBIDDEN，404→NOT_FOUND（跨租户隐藏资源），409→CONFLICT，410→RESUME_EXPIRED，429→RATE_LIMITED，501→UNSUPPORTED_CAPABILITY，502/503→UPSTREAM_UNAVAILABLE，504→TIMEOUT。响应 `{error:RuntimeError}`，traceId贯穿gateway/upstream/client。

验收：OpenAPI与SDK互验；两用户/两租户/同名session越权404；撤权中断流；重复POST仅一个receipt/run；断网恢复无重复增量；取消竞争只一终态；失效token仅一次刷新；上游不可用正确降级；服务重启后receipt/游标可恢复。fake仅覆盖契约测试，真实远端至少完整执行一次消息→工具授权→审批→产物→终态及取消/重连失败场景。
