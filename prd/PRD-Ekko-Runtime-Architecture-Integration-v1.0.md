# Ekko Runtime Architecture Integration PRD

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 定义与范围
<a id="REQ-E01"></a>
**REQ-E01**：采用Ekko的Runtime/Workspace Control Plane职责分离思想；不假设存在可复制的Ekko server、SDK或许可证授权。仓库新增runtime coordinator/typed workspace service完成选路、状态、目录管理；Agent执行仍由Local Pi或外部Hermes。多Agent先实现独立AgentInstance选择与状态，不隐含复杂协作Workflow已交付。

## 2. Runtime Manager
<a id="REQ-E02"></a>
**REQ-E02**：统一实现[Runtime SDK REQ-R01–R05](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R01)，禁止保留另一套缺cancel/capabilities的AgentRuntime接口。首期local-pi+remote-hermes；Local Hermes/Future Model Runtime/Claude/OpenAI依相同contract suite后续立项。RuntimeManager维护adapter registry/连接状态/能力，不能把Work仅probe/ensureReady/restart的本地生命周期接口直接当全功能session SDK。

## 3. Workspace Manager
<a id="REQ-E03"></a>
**REQ-E03**：Phase1建立local/remote session引用和projection，Phase2接入[Workspace权威模型](PRD-Enterprise-Workspace-v1.0.md#REQ-W02)。管理AgentInstance/Session/Task/Artifact引用和用户导航上下文；Context/Memory为runtime私有，不在切换时无授权复制。session固定runtimeId，Task执行状态来自Gateway事件，恢复时对账游标。

Workflow/Multi-Agent Coordinator长期需求保留：首年支持显式人工发起独立任务与状态聚合；自动跨Agent任务分解、共享memory、跨系统补偿工作流须D09另定规格与成本门槛，不以一个空类验收。

## 4. 验收
<a id="REQ-E04"></a>
**REQ-E04**：Local Pi/Remote Hermes新会话选择、旧会话继续、远端重连/取消/权限提問投影正确；多实例各session互不串流；断线状态不谎报完成；持久化恢复projection无重复，Workspace服务不可用时只读缓存显示来源/时间。架构边界和SDK contract tests均通过。
