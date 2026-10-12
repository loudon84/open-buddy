# CRM Plugin 专项 PRD

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 业务目标和范围
<a id="REQ-C01"></a>
**REQ-C01**：Phase4C将客户信息查询、浏览器调研草稿转换为授权CRM业务操作；先Customer Query和草稿确认，再Quotation/Order/Inventory扩展。源apps/work没有已核验CRM服务，不能假定可迁移成品。目标插件 `plugins/crm`、接口 `plugins/crm/src/connector.ts`均拟建；后端真实系统/客户字段/去重键/同步方向/报价审批主体为D06，未定可完成fixture但阻止生产集成退出。

## 2. 对象和接口
<a id="REQ-C02"></a>
**REQ-C02**：Customer `{id,tenantId,externalId,displayName,attributes,revision,sourceSystem}`；Draft `{draftId,customerId?,proposedFields,sources,revision,status}`；attributes由已批准schema验证，不自行编造行业必填项。工具 `crm.customer.search({query,cursor?}) → {customers,nextCursor}`、`crm.customer.get({id}) → Customer`、`crm.customer.propose({customerId?,fields,sources}) → Draft`、`crm.customer.commit({draftId,revision,approvalId,idempotencyKey}) → {customer,receiptId}`。

Connector输入可信scope/credentialRef/requestId，输出canonical DTO或标准错误；服务端把externalId与tenant绑定，禁止将调用者任意tenant字段写入CRM。`If-Match` revision防覆盖人工修改；proposal记录Browser/Knowledge引用及版本并要求用户复核。

## 3. 写动作和同步
<a id="REQ-C03"></a>
**REQ-C03**：read需要crm.customer.read；propose需要crm.customer.propose；commit需要crm.customer.write+动作摘要绑定批准。重复commit同key只产生一个外部业务结果；系统无幂等API时使用本地outbox+外部对账标记，网络结果unknown禁止盲重试。API优先，Browser作为补充连接器须相同策略和可审计receipt。

只读ERP/CRM权威数据通过connector查询；不在插件本地建立第二权威客户库。数据导出/PII字段权限和日志脱敏纳入D06。Quotation→Order→Inventory原需求保留：Phase4C完成接口/只读样例与业务评审，写报价转Phase4E统一Ontology action；销售订单写入和库存变更必须业务流程/事务/补偿定义获批后另扩展，不默认为首年已交付。

## 4. 验收
<a id="REQ-C04"></a>
**REQ-C04**：真实测试CRM中查询→草稿→差异展示→批准→写入→receipt可追踪；拒绝、撤权、跨tenant、stale revision、重复提交、上游timeout/unknown均有fixture。Browser结果不能直接提交CRM；回滚先关write capability并保留read，已发生业务变更按外部补偿流程处置，不能删审计伪装撤销。
