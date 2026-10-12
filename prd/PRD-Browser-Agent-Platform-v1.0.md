# Browser Agent Platform PRD

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 目标、现状和依赖
<a id="REQ-B01"></a>
**REQ-B01**：Phase4B交付企业网页理解与受控操作。现有OpenBuddy BrowserPreview是sandbox iframe预览；Work仅有开发用CDP/Playwright，两者均不是生产Browser Agent。新增浏览器宿主由 `electron/main/browser` 管理，业务注册位于 `plugins/browser`；先完成Runtime/Workspace/Plugin/Knowledge-Preview接口。实现Chromium/CDP/Playwright需生产依赖、版本兼容、打包与进程回收验收，不能引用devDependency就宣称可上线。

## 2. 会话与工具契约
<a id="REQ-B02"></a>
**REQ-B02**：BrowserContext `{contextId,tenantId,workspaceId,userId,sessionId,allowedOrigins,credentialMode,expiresAt}`；Page `{pageId,contextId,url,revision}`。上下文与Agent Session绑定、跨tenant绝不共用cookie/profile。远程Hermes只能请求Gateway→授权tool broker→可信桌面browser executor，桌面离线返回executor unavailable，不从公网暴露CDP。

统一工具：`browser.open({url,contextId?}) → {contextId,pageId,url,revision}`；`browser.read({pageId,revision?}) → {text,elements:[{elementRef,role,label}],revision}`；`browser.snapshot({pageId}) → {artifactId,revision}`；`browser.click({pageId,elementRef,revision,actionDigest,approvalId?}) → {status,newRevision}`；`browser.fill({pageId,elementRef,revision,valueRef,actionDigest,approvalId?}) → {status,newRevision}`。valueRef由宿主解析敏感值，秘密不进模型prompt。stale revision重新读取，不猜选择器继续点击；元素引用由context内映射而非任意JS字符串。

## 3. 用户价值与范围
<a id="REQ-B03"></a>
**REQ-B03**：MVP覆盖打开允许站点、DOM读取、页面摘要/引用、元素定位、截图、受控click/fill；销售客户网站分析和采购供应商查询/比价先生成草稿。CRM录入在Phase4C通过CRM API/审批服务完成，浏览器MVP仅提供提案，不能越过CRM gate。Research Agent可作为这些能力的受控工作流模板；跨站自主采购/付款/无人确认发布不纳入首期。

## 4. 权限与安全
<a id="REQ-B04"></a>
**REQ-B04**：初始URL/重定向/新窗口/下载均检查Domain Policy与网络解析，阻断loopback、内网、云metadata与file/javascript/data导航；需要企业内网站点时D05按域精确授权代理。读取需browser.page.read，打开需browser.page.open；click/fill可能触发提交或外部副作用，一律先由动作分类器/人工批准策略判断，不以DOM标签推断无害。

写动作默认ask，批准绑定scope/page revision/目标/参数摘要/有效期且一次消费；凭据输入仅用户交互或安全vault映射。页面/DOM/OCR属于不可信外部输入，文本“忽略规则”等不能改变工具权限。默认Cookie只在单次session临时profile，退出/撤权销毁；持久化登录须D05安全确认。审计记录域、动作摘要、决策和结果，默认不保存明文表单/截图秘密。

## 5. 验收与失败
<a id="REQ-B05"></a>
**REQ-B05**：fixture网站验证read/snapshot/click/fill、stale元素、超时、弹窗/重定向越域、伪造approval、恶意页面提示注入、下载、崩溃清理；2 tenants交替登录cookie不共享。用户拒绝后无写副作用；桌面断线使pending动作失败，不自动重放已提交动作；关闭context杀子进程并回收profile。受控真实站点通过D05白名单后做e2e，不能用开发CDP端口验收生产能力。
