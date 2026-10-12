# OpenBuddy → smc-copilot 12个月 Roadmap 与人力评估

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 计划性质
<a id="REQ-Y01"></a>
**REQ-Y01**：以下是从项目启动算起的相对建议窗口，不是日期承诺。统一GUIDE Phase0–4；年度执行WBS见[roadmap](roadmap.md)。阶段必须按exit gate验收，业务决策/外部环境未就绪时月窗顺延，不使用mock代替真实完成。

## 2. 窗口和交付

- 月0–1：Phase0，Architecture Baseline、源迁移inventory、版本/契约、CI和试点风险清单。
- 月1–3：Phase1，Local Pi适配+Remote Hermes Gateway/流/取消/重连/部署；Workspace Manager基础目录并入。
- 月3–4.5：Phase2，企业Workspace权威服务、身份/ACL、Agent/Task/Artifact、审计和隔离。
- 月4.5–6：Phase3，扩展现有Plugin Host/SDK、私有Registry、第三方受限UI/容器backend、签名/升级回滚。
- 月6–7：Phase4A，Knowledge授权迁移、六格式公共FilePreview、RAG/工具联调。
- 月7–9：Phase4B，独立Browser Runtime、受控网页操作、Domain/Action Policy、browser executor部署。
- 月9–10：Phase4C，CRM查询、来源草稿、人工确认写客户；报价/订单/库存字段和动作评审。
- 月10–11：Phase4D，BI语义指标/只读查询/权限/图表/解释与真实数据源验收。
- 月11–12：Phase4E，Ontology对象/关系/版本/动作和报价试点，全年集成/备份回滚演练。

契约确定后可先行UI/fixture/connector评审，不跳过Runtime→Workspace→Plugin→业务的生产依赖。Knowledge/Preview提前抽取候选文件不等于提前完成业务phase。

## 3. 人力与容量
<a id="REQ-Y02"></a>
**REQ-Y02**：推荐核心团队Frontend 2–3、Backend 2、AI Agent 2、Product Architect 1、QA 1，合计8–9人，不再写“约8人即可保证完成”。安全/DevOps/业务owner为共享支持角色，是否独立编制和供应商成本由D10确认。

Phase0架构/后端/AI定义契约，前端/QA建立baseline；Phase1后端+AI主导runtime，前端对接，QA注入故障；Phase2后端+前端主导身份/目录，QA隔离；Phase3平台前后端+安全主导plugin；Phase4A知识前后端+AI、4B浏览器前端/AI/安全、4C CRM业务owner+后端、4D数据owner+后端/前端、4E架构/业务owner+AI逐段主导，QA和运维全程参与。该分配是专长重心而非多套重复全职团队。

容量不足优先保住P0平台和安全/回归，缩小业务试点范围或延期，不能暗中删除原需求。月窗变更需同步roadmap/总体PRD和decision log。

## 4. 年度外候选
Mail、Expert Factory、公开Marketplace、完整Web/Mobile、独立Local Hermes/Claude/OpenAI Runtime、高级Multi-Agent/Workflow、订单/库存写入等保留为D09或专项业务gate后的候选；每项须有PRD、可用服务/数据/许可、权限矩阵、成本与验收，再纳入后续计划。首年仅复用SkillRun/Expert客户端状态经验，不自动承诺Expert Factory产品完成。
