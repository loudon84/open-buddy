# Knowledge / FilePreview Plugin Migration PRD

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 迁移证据和范围
<a id="REQ-K01"></a>
**REQ-K01**：仅迁移本机 `E:/git/smc-copilot/apps/work`，源HEAD `68de354235f2796da8c89b869a9db70955fae20e`；禁止fetch/pull/从GitHub补实现。`packages/runtime-client-ts`只是已识别的本地依赖闭包候选，不在apps/work范围内，默认不复制；如确需使用，列精确文件和必要性后单独确认扩展源范围，可在目标项目独立实现等价传输以避免越界。

候选真实来源：`apps/work/components/file-preview/`，`apps/work/src/main/knowledge/knowledge-http-provider.ts`、`knowledge-service-url.ts`、`knowledge-authorized-transport.ts`，`apps/work/src/shared/knowledge/`。目录/glob为候选，迁入前必须落成逐文件 source→target/hash/license/依赖清单；不能宣称现在已知完整闭包。源`KnowledgeProviderFacade`的remote分支是未实现placeholder，禁止作为生产provider移植；使用有实际REST调用的HTTP provider作为适配参考，仍需验证目标服务部署和ACL。

Work是React19/npm/Nx，OpenBuddy是React18/pnpm/moon；逐项核验hooks/UI/ESM/types/依赖license兼容，禁止覆盖目标lockfile或整套搬package.json。独立核验发现目标运行时react-dom为^18.3.1，但@types/react-dom为^19.2.7、@types/react为^18.3.12；这是需显式验证的既有类型组合，不证明必然失败。P0-01登记此差异，P4A-02/迁入预览组件验证JSX、组件与DOM类型，依据目标typecheck结果处理，不擅自调整依赖。源MIT notice（apps/work/LICENSE）在实质复制时保留，并核验Open File Viewer/PDF.js等依赖许可。源main的token、Node进程、fs、SQLite、hermesAPI都必须替换为宿主授权接口，不能搬进renderer。

## 2. Knowledge领域与后端
<a id="REQ-K02"></a>
**REQ-K02**：Knowledge Plugin业务在 `plugins/knowledge`（拟建），宿主公共preview capability在 `packages/capability/openbuddy-file-preview`（拟建），preview UI按现有UI package规范注册；不把Knowledge数据模型放core。OpenBuddy本地KB与文件预览保留作为local-provider与旧会话体验。

目标Document `{documentId,tenantId,workspaceId,knowledgeBaseId,sourceVersion,sha256,mimeType,size,acl,indexState,deletedAt?}`；IngestionJob `{jobId,documentId,status,attempt,error?}`；Citation `{documentId,sourceVersion,chunkId,pageOrOffset,excerpt,artifactId?}`。Document ACL由存储/索引/检索三个边界都执行，不能只在UI过滤。

Backend contract为插件授权broker：`upload({workspaceId,fileHandle,knowledgeBaseId,idempotencyKey}) → {document,job}`；`list/get/update/deleteDocument`；`getJob(jobId)`；`search({query,knowledgeBaseIds,limit,cursor?}) → {hits: Citation[],nextCursor?}`；`retrieve({documentId,sourceVersion,chunkIds?}) → {chunks,citations}`；`answer({question,knowledgeBaseIds}) → {answer,citations,grounded:boolean}`。metadata写入带revision；上传/删除幂等。FileHandle是宿主授予的opaque本地文件或已授权Artifact引用，服务端不接收客户端任意本机路径。

Work调用过 `/api/v1/source-files`、`/api/v1/ingestion-jobs`、`/api/v2/knowledge-bases`/knowledge-sets等NoDeskClaw私有接口，不能改名即认为后端存在。D04确认服务地址、部署/鉴权、API版本、存储/embedding/search服务和ACL能力；Phase4A先做服务契约探针。若仅有mock，UI可开发但此阶段不得宣告完成。建议复用已部署服务；不具备ACL/删除/版本检索则补服务端适配器后验收。

## 3. 文件预览公共服务
<a id="REQ-K03"></a>
**REQ-K03**：host接口 `resolvePreview({scope,artifactId|localHandle,sourceVersion}) → {previewHandle,mimeType,size,expiresAt,readOnly:true}`，由显式互斥schema校验引用；`readPreview({previewHandle,range?}) → bytes`、`releasePreview(handle)`。previewHandle绑定user/tenant/workspace/文档版本与有效期，不能跨会话滥用；服务端下载逐次校验撤权，禁止公开永久URL。UI消费bytes/短期宿主URL，不获得存储密钥。

首期格式 Markdown/PDF/DOCX/HTML/TXT/Image，逐种有真实fixture、损坏/超限/未知类型降级下载或错误页；Markdown/HTML净化且禁脚本、禁外部资源默认加载，图片解码限制、MIME sniff和扩展名不一致拒绝。DOCX渲染不运行宏/外部链接。URL provider必须经服务端/宿主SSRF规则检查初始URL、每次重定向和最终解析地址，阻断loopback/内网/云metadata，私有站点仅显式allowlist代理。local provider受folder-trust/path canonicalization约束，防symlink逃逸。

## 4. 索引、RAG与Agent调用
<a id="REQ-K04"></a>
**REQ-K04**：上传状态 queued→processing→indexed/failed；重复内容按sourceVersion+hash去重，不混淆不同ACL资源。删除先拒绝访问，再异步清理blob/index/cache并可对账；撤权即时阻止search/retrieve/preview，不能等索引刷新。检索每次按actor权限过滤，答案只能引用当次可见且存在的sourceVersion；无证据明确拒答或标无知识支持，不制造citation。

Hermes tools `knowledge.search`、`knowledge.retrieve`、`knowledge.answer`使用上述schema，权限分别knowledge.document.search/read/answer，传递可信scope/traceId；文档内容与检索结果均外部输入，不可用其文本开启工具/提升权限。联网回答和知识库RAG分开标来源。上传大小、文件扫描策略、检索limit/超时、留存等D04配置未定前只在测试fixture限额下运行。

## 5. 验收
<a id="REQ-K05"></a>
**REQ-K05**：先Knowledge插件授权metadata/upload/search，后FilePreview公共服务，最后联调RAG/citations；满足GUIDE顺序且类型契约可提前并行设计。两个tenant同名文档无交叉；六格式预览、安全fixture、文档更新/删除/撤权/坏文件/断网/重复上传可验证；UI与Hermes工具返回同一授权结果。迁移前后golden fixture结构、预览截图/交互对比，许可清单和精确hash mapping齐备；既有OpenBuddy本地KB/预览与Pi继续通过。
