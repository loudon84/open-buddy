# Enterprise Ontology Plugin Design

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 业务目标与阶段
<a id="REQ-O01"></a>
**REQ-O01**：Phase4E形成企业对象/关系/动作语义层，基于已交付CRM与BI连接器；首批贯通Customer/Product/Quotation只读关系与经批准Quotation草稿动作。Vendor、Brand、Inquiry、SalesOrder、Inventory保留在对象目录和schema设计；生产字段、ERP系统、写动作流由D08确认后逐对象启用，禁止空schema就宣告所有对象完整落地。

## 2. 对象、关系和版本
<a id="REQ-O02"></a>
**REQ-O02**：ObjectType `{typeId,schemaVersion,attributes,relations,actions,policyRef}`；ObjectRef `{tenantId,typeId,objectId,sourceSystem,sourceVersion}`；Relation `{from,to,relationType,cardinality}`。强引用存在性与tenant一致性必检，关系遍历逐跳授权；schema migration采用兼容字段扩展→数据迁移→旧版停用，禁止无提示改变字段/计量单位。Ontology保存元数据和索引引用，ERP/CRM为业务数据权威，BI读取同一语义版本。

## 3. Connector与Action
<a id="REQ-O03"></a>
**REQ-O03**：`ontology.objects.query({typeId,filters,cursor}) → {objects,nextCursor}`；`ontology.relations.traverse({ref,relationType,depth}) → {nodes,edges}`（depth受限）；`ontology.actions.prepare({actionId,objectRefs,input}) → {proposalId,digest,requiredApprovals}`；`ontology.actions.commit({proposalId,approvalId,idempotencyKey}) → {receiptId,status,objectRefs}`。原customer.query/quotation.create/inventory.check作为语义别名分别映射CRM查询、报价prepare/commit、库存只读query，不绕过统一policy。

动作包含input/output schema、preconditions、sideEffect、permission、revision约束、事务边界、compensation和审计。单外部系统事务优先；跨系统使用outbox/saga状态，失败/unknown必须对账，不能承诺跨ERP原子事务。报价写操作依赖D06/D08批准的价格/审批/状态迁移，默认只有prepare，未批准不能开放commit。

## 4. 权限与治理
<a id="REQ-O04"></a>
**REQ-O04**：User/Role/Object/Action沿Workspace最终许可交集，关系隐藏的对象不可通过计数/遍历泄漏。管理员维护schema不自动获得业务读取/报价批准。schema版本和policyVersion写入每个receipt/lineage，变更审核与回滚有可追踪记录。

## 5. 验收
<a id="REQ-O05"></a>
**REQ-O05**：Customer→Quotation→Product贯通查询，拒绝跨tenant引用/环或超深遍历，旧schema fixture读兼容；批准报价动作在测试系统幂等写入，timeout/部分失败/补偿/拒绝有证据。Inventory只读反映源版本。其余对象只宣告目录/schema覆盖，生产启用逐对象验收。保留原面向企业智能对象层的长期目标，以真实对象/connector闭环验收，不以类比产品名称验收。
