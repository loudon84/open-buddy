# BI Plugin 专项 PRD

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 目标和范围
<a id="REQ-I01"></a>
**REQ-I01**：Phase4D交付授权业务指标查询、图表与Agent解释，复用Workspace/Plugin/CRM对象引用；源apps/work未核验有BI实现。先只读预定义数据集与指标，任意SQL/直接生产数据库管理不纳入首期。真实数据源、指标口径/时区/币种/刷新频率/导出权限由D07确认。

## 2. 语义和接口
<a id="REQ-I02"></a>
**REQ-I02**：Dataset `{datasetId,tenantId,schemaVersion,dimensions,measures,policyRef}`；Metric `{metricId,definitionVersion,unit,timeZone,aggregation}`；Query `{datasetId,metricIds,dimensions,filters,timeRange,limit}`（所有字段allowlist）；Result `{queryId,rows,columns,metricVersions,freshnessAt,lineage,redactedFields}`。工具 `bi.dataset.list`、`bi.query`、`bi.explain({queryId})`、`bi.export({queryId,format})` 均走受控connector，不允许模型输入任意SQL。解释必须引用结果queryId和metric版本，不补造数据。

## 3. 权限和性能
<a id="REQ-I03"></a>
**REQ-I03**：查询服务端执行tenant/row/column policy，缓存key含tenant/user权利摘要、dataset版本、query hash与policyVersion；revoke立即使缓存失效。只读credential，参数化查询、行数/时间/资源限额，超限给明确可缩小范围的错误。导出独立bi.result.export权限，Artifact经Workspace ACL/短期下载与审计，公式注入CSV必须处理。推荐fixture查询p95<5秒，线上阈值D11以真实数据量批准。

## 4. 验收
<a id="REQ-I04"></a>
**REQ-I04**：固定数据集golden totals、null/重复/时区边界一致，UI图表与Agent解释引用同一结果；跨tenant/列权限/缓存越权为零，取消查询终止资源，超限不拖垮服务。真实测试连接器和D07指标签字后方退出；mock图表不代表BI上线。回滚停connector并保留已授权历史结果引用。
