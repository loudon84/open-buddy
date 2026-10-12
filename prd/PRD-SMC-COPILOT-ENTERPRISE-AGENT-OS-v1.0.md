# SMC-COPILOT Enterprise Agent OS 总体 PRD

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 产品定位与年度交付
<a id="REQ-OS01"></a>
**REQ-OS01**：构建面向企业员工的Agent工作平台：OpenBuddy Desktop Shell + Ekko Control Plane架构 + Hermes执行平台 + Enterprise Plugins。年度首期是可治理的Desktop、Local Pi/Remote Hermes、企业Workspace、私有插件平台及Knowledge/Preview→Browser→CRM→BI→Ontology闭环；月份是资源假设下的建议，不保证全部一年完成。

Desktop/Web/Mobile、多Runtime、Mail、Expert Factory、Research Agent、Workflow/Multi-Agent均保留长期产品意图。Web/Mobile只做portable接口与边界；Mail/Expert Factory、公开Marketplace与高级Workflow在年度后候选D09，进入前需专项PRD、权限/业务动作、安全和人员成本验收。Research Agent首年可做Browser+Knowledge受控调研模板；不是自主无限研究产品。Local Hermes/Claude/OpenAI runtime扩展同理。

## 2. 现状与问题
OpenBuddy已有Pi本地执行、plugin host、serializer SDK、Casdoor tenant auth、本地KB/预览、资源gateway；这些不等于远端Hermes、多客户端Workspace或完整第三方沙箱。Work `apps/work`已有Hermes客户端/本地进程manager、Knowledge HTTP provider/FilePreview，但没有目标Gateway server/企业插件runtime/Browser Agent。其KnowledgeProviderFacade有未实现remote占位路径。迁移须按本地源与逐文件依赖闭包完成，不拉GitHub或搬整个monorepo。

## 3. 架构与责任
<a id="REQ-OS02"></a>
**REQ-OS02**：Shell负责交互和受限UI；Control Plane负责Runtime/Agent目录/Session/Task；Hermes执行Skill/MCP/Memory/Tool；业务插件负责Knowledge/Browser/CRM/BI/Ontology。Plugin Host是并列基础设施，runtime和core不能导入业务插件。权威服务与运行链按[TAD REQ-T02](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md#REQ-T02)，目录按Monorepo设计，不再另列冲突apps布局。

## 4. 核心需求与验收映射
<a id="REQ-001"></a>
**REQ-001 Runtime Adapter**：以[Runtime SDK](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R02)为唯一接口，含connect/disconnect/createSession/getSession/sendMessage/stream/cancel/resolveApproval/executeTask/listTools。Phase1 Local Pi+Remote Hermes、切换仅新会话、旧Pi/流/取消/断线恢复验收通过；外部Gateway能力必须实测。

<a id="REQ-002"></a>
**REQ-002 Plugin SDK**：按[Plugin PRD](PRD-Enterprise-Plugin-Framework-SDK-v1.0.md#REQ-P02)和[SDK](Enterprise-Plugin-SDK开发规范-v1.0.md#REQ-SDK01)定义manifest/入口/版本/权限/能力；Phase3安装、启停、隔离、审批、回滚、第三方fixture加载。不得用SDK包存在替代验收。

<a id="REQ-003"></a>
**REQ-003 Browser Agent**：按[Browser PRD](PRD-Browser-Agent-Platform-v1.0.md#REQ-B02)页面读取/DOM/截图/受控操作，Phase4B独立context、domain policy、审批和恶意页面fixture通过；CRM写入依Phase4C。

<a id="REQ-004"></a>
**REQ-004 Enterprise Workspace**：按[Workspace PRD](PRD-Enterprise-Workspace-v1.0.md#REQ-W02)建Tenant、Organization、Membership、Workspace、AgentInstance、Session、Task、Artifact。采用关系模型而非Tenant→Organization→User→Agent单一树；Phase2服务端隔离、撤权和九条越权路径验收。

<a id="REQ-005"></a>
**REQ-005 Knowledge/FilePreview**：按[迁移PRD](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K01)先授权知识操作，后六格式公共预览，再RAG/工具；真实后端、ACL、citation版本/删除同步与源许可验证完成。

<a id="REQ-006"></a>
**REQ-006 业务插件**：CRM按[专项PRD](PRD-CRM-Plugin-v1.0.md#REQ-C01)先查询/草稿/批准写客户，BI按[专项PRD](PRD-BI-Plugin-v1.0.md#REQ-I01)授权指标，Ontology按[设计](smc-copilot-Enterprise-Ontology-Plugin-Design-v1.0.md#REQ-O01)对象/关系/动作治理。报价/订单/库存写入须业务决策，不能省略也不能自行假定已获批准。

## 5. 企业安全与非功能
<a id="REQ-007"></a>
**REQ-007**：Tenant/User/Role/Permission/Policy/Audit贯穿所有服务。Tool执行时复核授权，外部内容不获得系统权限；plugin isolation和身份/数据政策见Workspace/Plugin PRD。错误、幂等、取消、断线恢复采用Gateway统一规范。推荐性能、恢复、规模验证见TAD REQ-T05；D11确认前不是生产SLA。

## 6. 唯一阶段口径
<a id="REQ-OS03"></a>
**REQ-OS03**：Phase0基础架构（建议月0–1）；Phase1 Runtime（1–3）；Phase2 Enterprise Workspace（3–4.5）；Phase3 Plugin（4.5–6）；Phase4业务（4A Knowledge/Preview 6–7、4B Browser 7–9、4C CRM 9–10、4D BI 10–11、4E Ontology 11–12）。契约稳定后可并行设计/fixture，生产退出仍按依赖链；关键环境/业务gate延误顺延，不能按日历强行完成。详细任务与退出/回滚在[roadmap](roadmap.md)。

## 7. 风险和决策
Runtime迁移以Pi回归保护；上游能力/部署以真实契约测试保护；插件以可信兼容和第三方隔离双模式保护；Browser/CRM外部写以批准+幂等+对账保护。业务D01–D12记录在[修订记录](PRD-审查与修订记录.md#decisions)，未确认参数有明确阻塞阶段和推荐默认。任何能力只有验收证据通过后才改变为已实现。
