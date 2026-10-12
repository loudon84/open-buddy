# PRD 审查与修订记录

> 日期：2026-10-12；审查/分析：GPT-6 Astra；本地代码与文档事实采集：GPT-6 Luna。状态：文档基线修订完成，产品实现和验收尚未执行。原18份文件名v1.0保持，正文标文内修订版v1.1。

## 1. 来源与覆盖

审查覆盖原18份完整原文；通过Luna完整快照与报告统一分析，不把缺实现当已完成。目标OpenBuddy扫描快照HEAD `2dd37e9eaa8c35496846883c0c47b60153f9ddfb`；独立核验时外部已推进至`0b011f9d59ef4e808ea530206cc15555eaf88153`，P0-01须刷新当前HEAD/dirty/差异，不得将快照当现状；本地Work扫描HEAD `68de354235f2796da8c89b869a9db70955fae20e`。本次没有联网取smc-copilot，没有改产品代码/配置，没有跑产品测试、提交或push。报告是静态证据，真实能力需未来Task验收。

原始文件SHA-256保存在本记录§5，写入前与当前文件逐项比对；若不一致必须重新读取并合并，不能覆盖并发修改。原未跟踪prd与外部新增`.cursor/`、`.ges/`、`.specify/`、`AGENTS.md`均保留。新增文档为Workspace、CRM、BI三专项PRD、roadmap及本记录，共23份交付。

技术常规选择已经定案：保留Local Pi；原位pnpm/moon；项目Gateway兼容桥；HTTPS+SSE；受限第三方UI+可协商远端容器backend；私有Registry+Ed25519；推荐PostgreSQL/对象存储。业务政策未编造成事实，D01–D12明确推荐和阻塞条件。

## 2. 问题、修正与验收追踪

### ISSUE-001 · GUIDE-smc-copilot-Enterprise-Agent-OS-v1.0.md

- **来源原条款**：原§2.1禁止Desktop→Local Agent；§7 Phase0–4，§9四项P0。
- **问题/影响**：禁止耦合被误读为删本地Pi，优先级与其他稿冲突。
- **已修正文内决定**：正文改为Adapter并存Local Pi/Remote Hermes；统一Phase0–4/4A–4E；P0按依赖逐步交付。
- **目标条款**：[REQ-GUIDE02](GUIDE-smc-copilot-Enterprise-Agent-OS-v1.0.md#REQ-GUIDE02)；涉及Phase 0–4。
- **可验证方式**：检查阶段号/旧Pi合同与P0任务依赖，无独立冲突路线。

### ISSUE-002 · PRD-SMC-COPILOT-ENTERPRISE-AGENT-OS-v1.0.md

- **来源原条款**：原§2称缺Runtime Adapter等；§6 AgentRuntime五方法；§8租户树；§10/15多个Phase口径。
- **问题/影响**：把不同仓库现状混同，接口不全，用户/tenant关系与排期不成立。
- **已修正文内决定**：重写现状、权威接口/关系实体、REQ001–007和唯一阶段；Mail/Expert/Web/Mobile等保留年度后门槛。
- **目标条款**：[REQ-OS03](PRD-SMC-COPILOT-ENTERPRISE-AGENT-OS-v1.0.md#REQ-OS03)；涉及Phase 0–4。
- **可验证方式**：所有REQ映射专项PRD与Task，阶段/未来范围逐项核验。

### ISSUE-003 · PRD-OpenBuddy-Enterprise-Shell-改造-v1.0.md

- **来源原条款**：原§4 Shell→Workspace→Adapter→Plugin Runtime→Gateway；§6三阶段。
- **问题/影响**：插件被错误串入每条Agent请求，阶段号冲突。
- **已修正文内决定**：正文改为UI→preload→main→adapter链和并列Plugin Host；补切scope/取消/断线UX。
- **目标条款**：[REQ-S02](PRD-OpenBuddy-Enterprise-Shell-改造-v1.0.md#REQ-S02)；涉及Phase 0–3。
- **可验证方式**：架构图与Runtime链一致，UI无upstream直连，Shell smoke覆盖。

### ISSUE-004 · PRD-Ekko-Runtime-Architecture-Integration-v1.0.md

- **来源原条款**：原§4 Local Hermes/Remote Hermes/Future；§5 Manager管理Context/Memory。
- **问题/影响**：忽略实际Pi，假定Ekko实现和跨Runtime共享状态。
- **已修正文内决定**：明确架构思想非已存在server，Local Pi首期，runtime私有memory，session固定runtimeId。
- **目标条款**：[REQ-E03](PRD-Ekko-Runtime-Architecture-Integration-v1.0.md#REQ-E03)；涉及Phase 0–2。
- **可验证方式**：接口统一引用R02；旧session/切runtime/投影恢复contract。

### ISSUE-005 · PRD-Hermes-Remote-Runtime-Gateway-v1.0.md

- **来源原条款**：原§2 Client|Gateway|Cluster；§4仅操作名；验收泛化。
- **问题/影响**：无server来源/部署/桥接责任，上游能力被当现成。
- **已修正文内决定**：新增项目兼容桥与capability矩阵，真实Hermes gate，操作统一映射G03，部署/许可/回滚明确。
- **目标条款**：[REQ-H03](PRD-Hermes-Remote-Runtime-Gateway-v1.0.md#REQ-H03)；涉及Phase 0–1。
- **可验证方式**：fixture与真实联调报告分开，上游缺能力不能fake完成。

### ISSUE-006 · PRD-Enterprise-Plugin-Framework-SDK-v1.0.md

- **来源原条款**：原§3 manifest字段；§4前后端注册；§6只验Knowledge示例。
- **问题/影响**：现有serializer被误当企业平台，依赖业务才能验框架，权限非沙箱。
- **已修正文内决定**：复用host，企业manifest/能力协商、可信模式与第三方隔离、fixture先验平台。
- **目标条款**：[REQ-P05](PRD-Enterprise-Plugin-Framework-SDK-v1.0.md#REQ-P05)；涉及Phase 0/3。
- **可验证方式**：第三方实际受限加载、恶意backend拒绝、旧插件回归。

### ISSUE-007 · PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md

- **来源原条款**：原§1迁移已有Framework；§3六格式；§4上传/RAG；§6预览正常。
- **问题/影响**：无源闭包/许可/真实后端与ACL；placeholder路径可能误迁。
- **已修正文内决定**：逐文件本地迁移、React工具链适配；区分HTTP provider/空facade；补Document/Job/Citation/Preview契约。
- **目标条款**：[REQ-K01](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K01)；涉及Phase 0/4A。
- **可验证方式**：hash/license清单、真实后端、六格式/撤权/删除/RAG引用测试。

### ISSUE-008 · PRD-Browser-Agent-Platform-v1.0.md

- **来源原条款**：原§2 Electron Chromium/CDP；§4五工具；§5 CRM录入。
- **问题/影响**：把iframe/开发CDP当Agent，缺session/审批/域安全。
- **已修正文内决定**：新增隔离BrowserContext/工具I/O/可引用DOM，CRM写入延续4C gate。
- **目标条款**：[REQ-B02](PRD-Browser-Agent-Platform-v1.0.md#REQ-B02)；涉及Phase 4B–4C。
- **可验证方式**：两tenant cookie隔离、stale元素/域/审批/真实站点验收。

### ISSUE-009 · smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md

- **来源原条款**：原§2仅层图；§5高可维护/企业安全/多租户。
- **问题/影响**：没有权威状态/部署运维/NFR，不足以实现。
- **已修正文内决定**：重写服务所有权/持久化/信任边界、失败恢复、推荐试点阈值与D11生产gate。
- **目标条款**：[REQ-T02](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md#REQ-T02)；涉及Phase 0–4。
- **可验证方式**：接口与服务权威交叉检查，备份恢复/trace/隔离/容量实测。

### ISSUE-010 · OpenBuddy-to-smc-copilot-12个月Roadmap-v1.0.md

- **来源原条款**：原§2 Phase1–4月窗，末尾人数约8。
- **问题/影响**：与GUIDE编号及Workspace时序冲突，8–9人合计被写8人保证。
- **已修正文内决定**：统一建议月窗0–12与9执行段，人数8–9及共享DevOps/安全，超容量缩试点/延期。
- **目标条款**：[REQ-Y02](OpenBuddy-to-smc-copilot-12个月Roadmap-v1.0.md#REQ-Y02)；涉及Phase 0–4。
- **可验证方式**：人数加总、阶段窗口单一、延期条件/后续范围明确。

### ISSUE-011 · OpenBuddy-Fork-代码改造清单-v1.0.md

- **来源原条款**：原§2 apps/workspace/runtime/plugins/browser/enterprise；§4P0–P3。
- **问题/影响**：虚构当前目录且P0仅Adapter，诱发大搬家。
- **已修正文内决定**：用现有electron/src/packages路径和新增建议，四条P0统一，默认不删除目录。
- **目标条款**：[REQ-F04](OpenBuddy-Fork-代码改造清单-v1.0.md#REQ-F04)；涉及Phase 0–4。
- **可验证方式**：路径存在性由Luna核验，新增标记、无整仓/锁覆盖。

### ISSUE-012 · OpenBuddy-Enterprise-Fork-Monorepo目标目录设计-v1.0.md

- **来源原条款**：原§2 apps/desktop和重复sdk/enterprise/core/plugin-runtime。
- **问题/影响**：与真实仓库及Fork目录冲突，业务/基础设施边界不清。
- **已修正文内决定**：原位演进，runtime packages/extensions复用，新增service/plugin明确，future端后续。
- **目标条款**：[REQ-D01](OpenBuddy-Enterprise-Fork-Monorepo目标目录设计-v1.0.md#REQ-D01)；涉及Phase 0–4。
- **可验证方式**：workspace/moon/tsconfig接线与import-boundary fixture。

### ISSUE-013 · Runtime-Adapter-SDK-Interface-Design-v1.0.md

- **来源原条款**：原§2七个无类型方法；§3 Local Hermes/Claude/OpenAI；§5列四协议。
- **问题/影响**：缺取消/审批/能力/版本/隔离，模型和Runtime混淆。
- **已修正文内决定**：唯一强类型v1 contract、Local Pi/Remote首期、SSE/HTTPS与MCP工具区分、投影/恢复/取消语义。
- **目标条款**：[REQ-R02](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R02)；涉及Phase 0–1。
- **可验证方式**：adapter shared suite涵盖send/stream/cancel/approval/errors/old Pi。

### ISSUE-014 · Hermes-Gateway-API-Specification-v1.0.md

- **来源原条款**：原§3 /api/session/*等路径；§4WS/SSE/MCP；§5JWT/OAuth/RBAC。
- **问题/影响**：无schema/mapping/幂等/重连，路径未经证实。
- **已修正文内决定**：正文替换为目标/v1契约，声明不是上游现成API；错误/事件/receipt/恢复/授权完整。
- **目标条款**：[REQ-G03](Hermes-Gateway-API-Specification-v1.0.md#REQ-G03)；涉及Phase 0–1。
- **可验证方式**：OpenAPI/DTO一致，跨tenant/retry/cancel/resume真实fault tests。

### ISSUE-015 · Enterprise-Plugin-SDK开发规范-v1.0.md

- **来源原条款**：原§3 name/version/permissions；§4–5注册名；§6CRM示例。
- **问题/影响**：manifest不兼容、版本格式/注册签名/权限语义缺失。
- **已修正文内决定**：统一semver/apiVersion/entry/capabilities/schema，typed broker和Disposable；CRM扩展仍保留。
- **目标条款**：[REQ-SDK01](Enterprise-Plugin-SDK开发规范-v1.0.md#REQ-SDK01)；涉及Phase 0/3/4C。
- **可验证方式**：示例manifest对schema、compile/package/install/dispose，旧别名不扩权。

### ISSUE-016 · Enterprise-Plugin-Marketplace-Architecture-v1.0.md

- **来源原条款**：原§2 Marketplace→Registry→Runtime；§5签名审核无规格。
- **问题/影响**：公开市场与私有发布混同，签名/回滚/数据策略缺失。
- **已修正文内决定**：私有Registry首期+审核第三方，Ed25519/hash envelope/trust根/吊销/原子升级，公开候选D09。
- **目标条款**：[REQ-MK02](Enterprise-Plugin-Marketplace-Architecture-v1.0.md#REQ-MK02)；涉及Phase 3。
- **可验证方式**：篡改/吊销/越权安装拒绝，升级失败旧版可用。

### ISSUE-017 · Browser-Agent技术设计-Chromium-CDP-Playwright-Hermes-MCP-v1.0.md

- **来源原条款**：原§2 Chromium/CDP/Playwright串列；§3Cookie/Session；§5三安全词。
- **问题/影响**：无远端到本地执行通道，浏览器凭据/调试端口边界不明。
- **已修正文内决定**：完整executor broker topology、独立production browser/profile、受限CDP、DOM与unknown动作对账。
- **目标条款**：[REQ-BT01](Browser-Agent技术设计-Chromium-CDP-Playwright-Hermes-MCP-v1.0.md#REQ-BT01)；涉及Phase 4B。
- **可验证方式**：device/tenant绑定、重复invocation不重写、无公开CDP、进程回收。

### ISSUE-018 · smc-copilot-Enterprise-Ontology-Plugin-Design-v1.0.md

- **来源原条款**：原§2八对象；§5三个方法；§6User/Role/Object/Action。
- **问题/影响**：无schema版本/关系权限/connector/事务边界，不能一次验收八对象。
- **已修正文内决定**：首批对象闭环，原八对象保留范围状态，统一query/prepare/commit，授权与补偿门槛。
- **目标条款**：[REQ-O03](smc-copilot-Enterprise-Ontology-Plugin-Design-v1.0.md#REQ-O03)；涉及Phase 4E。
- **可验证方式**：跨tenant关系拒绝、旧schema兼容、真实报价/unknown对账。

### ISSUE-019 · PRD-Enterprise-Workspace-v1.0.md

- **来源原条款**：原GUIDE Phase2和总体PRD REQ004只有实体列举，无专项PRD。
- **问题/影响**：缺可落地的企业workspace所有权/权限/数据生命周期。
- **已修正文内决定**：新增专项PRD定义关系模型、服务端权威、API、角色推荐与九路径隔离。
- **目标条款**：[REQ-W02](PRD-Enterprise-Workspace-v1.0.md#REQ-W02)；涉及Phase 0–2。
- **可验证方式**：D01/D02与服务模型/授权/恢复测试对齐。

### ISSUE-020 · PRD-CRM-Plugin-v1.0.md

- **来源原条款**：原GUIDE Phase4 CRM和SDK CRM示例只有名称。
- **问题/影响**：CRM无范围、来源草稿、真实系统与动作审批标准。
- **已修正文内决定**：新增CRM PRD，Customer最小闭环，Quotation/Order/Inventory意图保留并设后续gate。
- **目标条款**：[REQ-C01](PRD-CRM-Plugin-v1.0.md#REQ-C01)；涉及Phase 4C/4E。
- **可验证方式**：D06真实CRM read/propose/approved commit+conflict/unknown tests。

### ISSUE-021 · PRD-BI-Plugin-v1.0.md

- **来源原条款**：原GUIDE Phase4 BI只有名称。
- **问题/影响**：缺指标口径/数据源/权限/缓存/导出，任务无法验收。
- **已修正文内决定**：新增BI PRD，语义版本、只读参数查询、行列ACL、图表/解释同源。
- **目标条款**：[REQ-I01](PRD-BI-Plugin-v1.0.md#REQ-I01)；涉及Phase 4D。
- **可验证方式**：D07 golden totals、权限/cache/export/真实connector测试。

### ISSUE-022 · roadmap.md

- **来源原条款**：原GUIDE§6/8要求Phase→Milestone→Epic→Task→Acceptance但没有执行计划。
- **问题/影响**：大纲不能让Cursor直接实施，未区分命令/文件是否已存在。
- **已修正文内决定**：新增55-task WBS与精确REQ/依赖/Scope/I-O/验收/退出/回滚、自包含Cursor步骤。
- **目标条款**：[phase-0](roadmap.md#phase-0)；涉及Phase 0–4。
- **可验证方式**：检查55唯一Task、18Milestone/18Epic、依赖无环/链接锚点存在。

## 3. 业务/部署待决项与阻塞范围
<a id="decisions"></a>

下列“推荐”是供实施起步的提案，不是用户已确认的业务参数。实现者可继续不依赖决定的契约/fixture；不得凭等待时间自动解除生产gate。业务owner最终批准后在本记录填写日期、决定值、受影响Task和验证证据并同步PRD。

### D01 · 身份提供方、tenant/组织映射与角色审批主体

- **推荐默认 / 当前状态**：推荐复用OpenBuddy Casdoor/OIDC；tenant-admin/workspace-admin/member/viewer为推荐起点，用户可多tenant，admin无全数据隐式读权。 待业务/环境确认。
- **决定主体**：业务owner+身份管理员。
- **阻塞影响**：P2-02/Phase2生产试点；P0 DTO/P1测试tenant可先行。

### D02 · 业务数据/审计/Artifact/卸载数据保留和物理删除

- **推荐默认 / 当前状态**：推荐先可恢复归档、audit脱敏、禁止默认删除；具体留存天数/地域/法定锁/恢复窗口不臆定。 待业务/环境确认。
- **决定主体**：业务数据owner+安全/运维。
- **阻塞影响**：P2-06/Phase2生产；所有后续插件物理清除与卸载沿用。

### D03 · Hermes服务版本、部署环境、访问授权、运行许可与owner

- **推荐默认 / 当前状态**：技术定案为项目兼容桥+能力矩阵；推荐独立受控staging和tenant隔离实例。server不在apps/work，不能复制客户端替代。 待业务/环境确认。
- **决定主体**：平台/运维owner。
- **阻塞影响**：P1-02真实上游联调、P1-07/08退出；mock DTO/client可并行。

### D04 · Knowledge真实服务/鉴权/ACL/存储与上传扫描限额

- **推荐默认 / 当前状态**：推荐复用具备tenant过滤和版本检索的服务；限制/留存由实际部署确认，placeholder facade不能上线。 待业务/环境确认。
- **决定主体**：知识业务owner+平台/安全。
- **阻塞影响**：P4A-01/03/07；UI/provider fixture可先行，真实4A退出被阻塞。

### D05 · Browser准入域/企业内网/凭据持久化和写动作分类

- **推荐默认 / 当前状态**：推荐域allowlist、临时session profile、所有潜在外部写ask、CDP仅本机；持久cookie/私域按站点批准。 待业务/环境确认。
- **决定主体**：业务系统owner+安全。
- **阻塞影响**：P4B-02真实站点、P4B-04写操作、P4B退出。

### D06 · CRM目标系统/字段/去重/同步方向/PII与批准流程

- **推荐默认 / 当前状态**：推荐客户查询→有来源草稿→批准写客户，API优先；Quotation/Order/Inventory先只读/接口评审，不编造价格规则。 待业务/环境确认。
- **决定主体**：销售/CRM owner。
- **阻塞影响**：P4C-01/04/05真实业务；报价写连同D08，未批准只prepare。

### D07 · BI数据源/指标公式/时区/币种/刷新和导出权

- **推荐默认 / 当前状态**：推荐预定义只读数据集、版本化metric、行列权限与独立export；指标需业务签字。 待业务/环境确认。
- **决定主体**：数据/财务或指标owner。
- **阻塞影响**：P4D-01/04真实BI验收；fixture schema可先行。

### D08 · Ontology首批字段/ERP连接器/报价审批和补偿

- **推荐默认 / 当前状态**：推荐Customer/Product/Quotation贯通，八对象完整保留目录；报价commit须业务事务/价格与审批规则批准。 待业务/环境确认。
- **决定主体**：领域业务owner+架构。
- **阻塞影响**：P4E-01/03/04；其它对象写动作未批准不启用。

### D09 · 年度范围、私有Registry审批人及后续产品门槛

- **推荐默认 / 当前状态**：推荐首期私有Registry+审核第三方，Mail/Expert Factory/Web/Mobile/公开市场/Future Runtime/高级Workflow年度后候选；若要求提前纳入须专项PRD、容量和月窗重估。 待业务/环境确认。
- **决定主体**：产品owner+安全/平台。
- **阻塞影响**：Phase3发布批准主体必须明确；后续愿景不阻塞当前baseline，但无决策不能当期新增上线范围。

### D10 · 8–9人团队、共享运维/安全支持及预算

- **推荐默认 / 当前状态**：8–9人为角色人数加总建议，不保证12月交付；缺资源缩试点或顺延，保持安全/回归门槛。 待业务/环境确认。
- **决定主体**：项目负责人。
- **阻塞影响**：启动排期与每里程碑资源承诺；不阻塞本次文档。

### D11 · SLA/规模/region/性能/恢复验收环境

- **推荐默认 / 当前状态**：推荐TAD试点值：20并发、receipt p95≤1秒、RPO24h/RTO4h等；这些是测试起点，须硬件/数据/成本验证后批准生产目标。 待业务/环境确认。
- **决定主体**：产品/平台/运维。
- **阻塞影响**：P1-08及各阶段生产发布；无环境证据不承诺指标。

### D12 · 迁移源范围外依赖与第三方许可闭包

- **推荐默认 / 当前状态**：用户限定apps/work；默认只借鉴接口并在目标实现。packages/runtime-client-ts仅已观察本地依赖，不默认复制；确需扩大范围应取得用户明确指示并核验许可。 待业务/环境确认。
- **决定主体**：迁移实施者；扩大范围由用户。
- **阻塞影响**：P0-01/P4A-01以及任何实际复制；独立重写接口/host替换不阻塞。

## 4. 文档验证与后续实现验收

本次验证限定于23份文档：原18份覆盖、内部Markdown链接与显式REQ/Task锚点、55任务唯一性/依赖无环/不存在未声明依赖、18里程碑和18Epic、已存在路径与建议路径区分、阶段与API/manifest/scope统一、源hash保护、全部关键意图保留。产品测试命令仅规划，不声称已通过。独立Luna路径核验覆盖55组现有/新增Scope、目录分类、42个具体路径抽查及9个既有script，未发现抽核现有路径缺失或拟建命令冒充已有。已据核验修正三项：扫描HEAD与当前外部推进区分、目标ReactDOM18/类型19组合的显式typecheck验收、Windows tenant:boundary-audit需要bash/WSL或等价跨平台入口。路径抽查不代替完整导入闭包/运行验证；其余文档结构核验结果由最终交付报告说明。

未来每phase按roadmap退出gate生成证据：Phase0基线/契约；Phase1真实Hermes+Pi；Phase2九路径隔离；Phase3第三方隔离/签名/回滚；4A六格式/真实知识；4B域/动作/真实浏览；4C客户读改闭环；4D批准指标；4E对象动作和全年恢复。任何上游服务或业务决策缺失必须保留blocked项，不能用mock通过移除。

## 5. 原18份文件的修订前指纹

- `prd/Browser-Agent技术设计-Chromium-CDP-Playwright-Hermes-MCP-v1.0.md`：`3dad6d431e30c006cb507f62ce6bd0c5b7ab1d43fe433e8b829d32709357ce1e`。
- `prd/Enterprise-Plugin-Marketplace-Architecture-v1.0.md`：`c069679ae83e4432a6d1c1223c0a306e1d060c5172f2c60a5c635859bb01e802`。
- `prd/Enterprise-Plugin-SDK开发规范-v1.0.md`：`bb054f7cb36441f9b3e3b2ba1a07da5dc0d01ef842ca729a2039f854e6052a7c`。
- `prd/GUIDE-smc-copilot-Enterprise-Agent-OS-v1.0.md`：`e3b79c9de5283278998b478c7b1c500c477fb04244109454d22e017d46d6b63d`。
- `prd/Hermes-Gateway-API-Specification-v1.0.md`：`4fcb1eb6eb48276384b09469618ca9d52fc2329bc94bd9678ba172305b8d5bda`。
- `prd/OpenBuddy-Enterprise-Fork-Monorepo目标目录设计-v1.0.md`：`729b64a3a6dcab49f3c57536d5840610d20b50fc41ca2995c8538159a1d650b9`。
- `prd/OpenBuddy-Fork-代码改造清单-v1.0.md`：`069664552c0e5155b321754a120b0bf7c691c25d114691e82bec45d7f70a790d`。
- `prd/OpenBuddy-to-smc-copilot-12个月Roadmap-v1.0.md`：`9673587568c517bbff05ad2549244da5d5b2bc97d8e4025b6b5424a2ff7b122e`。
- `prd/PRD-Browser-Agent-Platform-v1.0.md`：`b50e0ffdecb2ff387984b52c1b15e47ee7232cc58adba7b6942f1e8ff67c899d`。
- `prd/PRD-Ekko-Runtime-Architecture-Integration-v1.0.md`：`c17ff89988070e9f3226fed4aa96ac48692a7e2c2cd607de64116d4e1c653bf1`。
- `prd/PRD-Enterprise-Plugin-Framework-SDK-v1.0.md`：`10c63fd0db6bb9069d2e66a3a5db134cdaa9e3e4f5523ebd6c9cd018926e3d72`。
- `prd/PRD-Hermes-Remote-Runtime-Gateway-v1.0.md`：`33ede0b7e95e7585dca28e417c380fae6d86a4302dcf13ee5f5a12795a47be41`。
- `prd/PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md`：`8530185d09ae8fc1f78cca79602f63a93d10c1a88f385dfcdf55e8aeae3deaa5`。
- `prd/PRD-OpenBuddy-Enterprise-Shell-改造-v1.0.md`：`66845a25f3bce69ba87b921fd23c511cfc747f46896ed2f17a106356ef808bf3`。
- `prd/PRD-SMC-COPILOT-ENTERPRISE-AGENT-OS-v1.0.md`：`8cae3eb8bacd7d91e101c0793e8d37451676263d7fbd482042e5ff7fb2143f5d`。
- `prd/Runtime-Adapter-SDK-Interface-Design-v1.0.md`：`764306888c6de6da0300118461ea9c72d37b48efb6c5fe9b994c013b7a57f77f`。
- `prd/smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md`：`1786e7e7a4bdfabd9a941992ccc8727e5f1bf5c2d7a966cb13aeaee559094ffa`。
- `prd/smc-copilot-Enterprise-Ontology-Plugin-Design-v1.0.md`：`31388fdf86f9c438a1ea94dca6a74f292dff12f7d82955bb5c9fc4730f78c6b8`。
