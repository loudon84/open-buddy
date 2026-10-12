# Enterprise Plugin SDK 开发规范

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 包结构与唯一Manifest
<a id="REQ-SDK01"></a>
**REQ-SDK01**：`manifest.json`、`frontend/`、`backend/`（可选）、`tools/`、`skills/`、`docs/`、`integrity.json`、`signature.json`。规范JSON序列化和hash/signature envelope见Marketplace规范，包本身不携带token或企业数据。

```json
{
  "id":"com.smc.crm", "name":"CRM", "version":"1.0.0",
  "apiVersion":"1.0", "publisher":"smc",
  "entry":{"frontend":"frontend/index.js","backend":"backend/index.js"},
  "permissions":["crm.customer.read"], "dependencies":{},
  "capabilities":{"surfaces":["isolated-ui","remote-backend"],
    "isolationProfile":"remote-container-v1"}
}
```

version为SemVer，apiVersion兼容major必须一致；dependencies为id→semver range，在lock中固定解析版本/hash；permissions命名`<plugin>.<resource>.<action>`。原customer.read/quotation.write示例统一为crm.customer.read/crm.quotation.write，迁移兼容别名仅给显式批准的旧包，禁止扩大默认grant。

## 2. Frontend SDK
<a id="REQ-SDK02"></a>
**REQ-SDK02**：`activate(ctx: PluginContext): Promise<void|Disposable>`；`deactivate(): Promise<void>`。ctx只暴露pluginId/scopeRef/capabilities/logger和授权API broker，不能获得raw token、Electron、Node、任意HTTP。

`registerRoute({id,path,title,viewRef}): Disposable`、`registerMenu({id,title,commandId}): Disposable`、`registerPanel({id,slot,viewRef}): Disposable`，id统一`pluginId:localId`，path限制plugin命名空间。trusted-first-party viewRef可映射现有slot apply；第三方viewRef必须指向受限surface，不把其JS注入可信React树。输入schema校验、撤权时销毁view、异步响应带scope版本防串租户。

## 3. Backend SDK
<a id="REQ-SDK03"></a>
**REQ-SDK03**：`registerAPI({id,inputSchema,outputSchema,permission,handler}): Disposable`；`registerTool({descriptor:ToolDescriptor,handler}): Disposable`；`registerMCP({id,tools,transportRef}): Disposable`。handler输入 `{scope,actor,requestId,traceId,invocationId,input,approvalReceipt?}`（由宿主校验注入），输出 `{output,artifactIds?}` 或规范RuntimeError。abort/timeout资源回收必须实现；MCP配置由admin批准且不能接收任意外部server URL。

工具必须声明sideEffect/read或write；write需稳定idempotencyKey和动作digest，approvalReceipt绑定actor/scope/参数hash/有效期。运行时接收工具输出作为数据，输出中的指令不获得权限。Skill文本同样按不可信插件内容处理。

## 4. 示例和验收
<a id="REQ-SDK04"></a>
**REQ-SDK04**：Phase3 fixture只展示scope和受限echo工具，compile→package→sign→install→activate→dispose全程可重复。Phase4C CRM样例涵盖Customer Query；Quotation/Order/Inventory逐步按CRM/Ontology PRD交付，禁止在示例中绕过业务授权。SDK发布前contract tests、旧manifest迁移fixture、unsupported capability拒绝、route/tool重复注册及dispose泄漏测试通过。
