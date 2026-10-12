# Enterprise Workspace 专项 PRD

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 范围与权威
<a id="REQ-W01"></a>
**REQ-W01**：Phase 2 交付跨客户端可复用的服务端 Workspace 权威模型；Phase 0/1 已预留 scope 和 Session/Task 引用。复用 OpenBuddy Casdoor membership/authorization 基础，不把已有登录状态或 Work 的 current_org_id/portal_org_role 当成完整隔离。服务端拟建 `services/enterprise-workspace`，可信 DTO/客户端位于 `packages/runtime/openbuddy-workspace`。本地 Pi 离线空间继续可用，未经显式导入不上传历史。

## 2. 数据模型
<a id="REQ-W02"></a>
**REQ-W02**：所有企业资源具有 tenantId、全局 opaque id、revision、createdAt/updatedAt；FK 必须带 tenantId，列表/索引/缓存/对象存储key同样分区。

- Tenant 为隔离根；Organization 是 tenant 内可选组织树（parentOrgId不能跨tenant、禁止环），不把组织层级等同用户所有权。
- User为OIDC subject映射；Membership `(tenantId,userId)` 连接用户和tenant，可有多个组织/角色，一个用户可加入多个tenant。
- Workspace属于一个tenant；WorkspaceMembership明确成员/角色。User不是Agent的唯一父节点。
- AgentInstance属于 `(tenantId,workspaceId)`，记录runtimeId、deploymentRef、owner/ACL、state；共享实例仍须隔离session/context/memory，未通过隔离证明不得跨tenant共享执行池。
- Session包含workspaceId、agentInstanceId、runtimeId和createdBy；Gateway拥有执行状态，Workspace保存目录引用/可见性，不建立双写状态权威。
- Task为Workspace里的工作项，引用sessionId/runId与gateway执行任务；Gateway拥有run终态，Workspace消费带seq事件形成projection，重复消费幂等。用户维护title/assignee等业务字段使用revision乐观锁。
- Artifact记录workspaceId、sessionId/runId、storageRef、mimeType、size、sha256、ACL/classification与expiry；仅通过授权解析下载引用，不能直接传本机绝对路径给remote。

删除：先禁止新run和新访问，再终止/确认存量任务、清理关联缓存/索引；保留/法定锁/恢复窗口由D02决定，未确认前只支持可恢复归档且阻止生产物理清除。DB迁移须expand-contract、可恢复备份；不得靠降级旧客户端回滚不兼容schema。

## 3. API与并发
<a id="REQ-W03"></a>
**REQ-W03**：目标 `/v1/workspaces` GET/POST、`/v1/workspaces/{id}` GET/PATCH、`/memberships` GET/PUT、`/agent-instances` GET/POST/PATCH、`/tasks` GET/PATCH、`/artifacts/{id}/resolve` POST。所有端点scope由可信identity导出；列表cursor分页，写请求If-Match revision防丢更新、Idempotency-Key防重，返回 `{items,nextCursor}` 或资源/revision；409冲突须由UI重新加载后提示合并。

创建/执行Task通过Gateway `/v1/tasks`；Workspace `/tasks`只列目录和修改业务字段，不重复启动run。部署Agent需要先创建登记为provisioning再经运维部署连接，ready必须健康检查成功；失败状态可重试且幂等，不声称有自动集群调度实现。

## 4. 权限与审计
<a id="REQ-W04"></a>
**REQ-W04**：推荐角色基线 tenant-admin（成员/工作区策略管理）、workspace-admin（本空间成员与Agent配置）、member（授权范围内创建会话/任务）、viewer（仅读取明确分享资源）；业务字段/对象权限仍由插件策略附加，管理员不自动读取全部文档/会话。角色名称为D01推荐默认，生产映射待业务确认。

统一决策 `authorize(actor,tenant,workspace,resource,action,policyVersion) → allow|deny|ask + reason`；服务端执行时复核。最终许可是成员资格∩workspace ACL∩资源ACL∩plugin授权∩tool/action策略，任一deny优先；ask需绑定具体动作摘要审批，不能将一次批准提升成永久授权。对象不存在和跨tenant均404；同tenant无动作权可403。缓存带scope与policyVersion，切tenant/撤权立即清空并断开旧订阅。

审计字段沿Gateway定义，审计员仅通过专门授权读取脱敏日志；member不能自升权。管理操作与外部写动作必须留记录。生产审计留存/导出/PII策略由D02门槛约束。

## 5. 验收
<a id="REQ-W05"></a>
**REQ-W05**：2 tenants×2 users×2 workspaces夹具覆盖列表/直接ID/搜索/缓存/事件/下载/工具/审批/成员管理九条越权路径；跨tenant零可见性，撤权后活跃流/下载失效。重复事件不重复Task；If-Match冲突不丢更新；断网只展示缓存并标旧数据，不在UI伪造远端成功。DB备份恢复后目录与gateway对账一致，旧Pi数据未被改变。
