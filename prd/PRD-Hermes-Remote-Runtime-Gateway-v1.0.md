# Hermes Remote Runtime Gateway PRD

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 产品与现状
<a id="REQ-H01"></a>
**REQ-H01**：建设Desktop→项目Agent Gateway→外部Hermes Runtime的统一远程接入层，预留Web/Mobile。Work仅含客户端/本地进程manager，Gateway HTTP server不在迁移目录；现有OpenBuddy Casdoor Resource Gateway也不是Hermes Gateway。必须新增兼容桥或取得经验证外部服务并匹配本项目契约，禁止宣称复制客户端即交付Gateway。

## 2. 责任与接口
<a id="REQ-H02"></a>
**REQ-H02**：Session Gateway持久化session/receipt/event；Router按validated tenant/workspace/agentInstance映射受控upstream deployment；Streaming采用HTTPS+SSE首期；Security复用OIDC membership并独立校验资源授权。接口操作createSession/sendMessage/streamResponse/executeTool/queryStatus及cancel/approval/tasks一律映射[Gateway Spec REQ-G03](Hermes-Gateway-API-Specification-v1.0.md#REQ-G03)。MCP只承载工具，WebSocket不是首期必须。

<a id="REQ-H03"></a>
**REQ-H03**：兼容矩阵逐上游版本核验路径、鉴权、run/session、事件schema、cancel/approval/artifact/resume/tools。Work `hermes.ts`和SkillRun/Expert client提供行为证据，不是上游保证；不能支持的能力返回明确false或阻塞必需验收，禁止fake成功。实例配置属于admin受控注册，不接受用户任意URL防SSRF；TLS、credential rotation、租户分区、最小上游权限必须部署验证。

## 3. 部署与故障
<a id="REQ-H04"></a>
**REQ-H04**：提供service/DB/object storage配置模板、health/readiness、migration/backup/restore、rate limit、trace/metrics与rollback runbook；凭据不入仓库。D03必须提供真实受控Hermes环境、版本/许可、部署负责人和访问授权后进行联调。上游无企业tenant隔离时按tenant独立执行进程/实例和memory/workdir，不靠客户端标签隔离。

取消/重试/恢复/错误码按Gateway Spec；服务重启不能丢receipt/重发外部写。未知结果进reconciliation流程。关闭remote开关可回到local-pi新会话，不能把remote session自动当Pi继续。

## 4. 验收
<a id="REQ-H05"></a>
**REQ-H05**：真实Desktop连接受控远端Hermes完成消息/流/工具授权/产物，两个AgentInstance独立，取消/重连/刷新/未知结果/进程重启被测；tenant mismatch拒绝且审计。mock suite通过只允许合并client契约阶段，不允许宣告Phase1远端验收。Phase2还需补齐全Workspace权限矩阵方可企业试点。
