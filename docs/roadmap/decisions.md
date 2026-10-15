# 开发默认决策（D01–D17）

采纳日期：2026-10-12。依据：实施启动指令「grilling 的所有决策按推荐选项决定，不需要人工确认」。

这些值是开发与 fixture 的默认，不是生产 owner 的签字。来源是 [prd/PRD-审查与修订记录.md](../../prd/PRD-审查与修订记录.md) 的推荐默认。生产 gate 仍关闭，直到对应 owner 在审查记录中填写日期、决定值和验证证据。

| ID | 开发默认 | 仍然阻塞的生产项 |
| --- | --- | --- |
| D01 | 复用现有 Casdoor/OIDC。角色起点：tenant-admin、workspace-admin、member、viewer。用户可属于多个 tenant。admin 没有全量数据的隐式读权限。 | Phase 2 生产试点的身份映射签字 |
| D02 | 默认可恢复归档、审计脱敏、禁止默认物理删除。不臆造留存天数、地域、法定锁或恢复窗口。 | P2-06 及之后的物理删除与卸载 |
| D03 | 项目内兼容桥加能力矩阵。推荐独立受控 staging 与按 tenant 隔离的实例。不把客户端进程伪装成远端 Hermes。 | 真实上游联调，以及 P1-07、P1-08 的环境退出 |
| D04 | 知识后端必须有 tenant 过滤和版本检索。placeholder remote facade 不上线。上传大小、扫描和留存用 fixture 上限，不写成业务政策。 | P4A 真实后端退出 |
| D05 | 域 allowlist、临时 session profile、潜在外部写一律 ask、CDP 只绑定本机。持久 cookie 和私域访问需要站点级批准，fixture 中默认拒绝。 | 真实站点与写操作退出 |
| D06 | 客户查询、带来源的草稿、批准后写客户。API 优先于浏览器写入。报价、订单、库存只保留接口，不编造价格或审批角色。 | 真实 CRM 闭环；报价写入还要 D08 |
| D07 | 预定义只读数据集、版本化指标、行列权限、独立导出权限。未签字的公式不填入生产口径，fixture 使用显式标注的示例公式。 | 真实 BI 验收 |
| D08 | 首批贯通 Customer、Product、Quotation。八个对象都保留目录和范围状态。报价 commit 在价格与审批规则未批准时只允许 prepare。 | 真实 ERP/报价动作 |
| D09 | 首期私有 Registry，第三方包需审核。Mail、Expert Factory、Web、Mobile、公开市场、Future Runtime、高级 Workflow 不进入本期范围。Registry 批准主体在 fixture 中使用显式测试角色，不代表生产审批人。 | Phase 3 生产发布的批准主体 |
| D10 | 不把 8–9 人写成交付保证。缺资源时缩小试点或顺延，安全与回归门槛不降。 | 排期与资源承诺；不阻塞实现 |
| D11 | 试点起点：20 并发、receipt p95 不超过 1 秒、RPO 24 小时、RTO 4 小时。这些是测试起点，没有硬件和数据证据时不称生产 SLA。 | 各阶段生产发布 |
| D12 | 迁移源限定 `E:/git/smc-copilot/apps/work`。只借鉴接口并在目标实现。`packages/runtime-client-ts` 不复制。 | 任何扩大复制范围的请求 |

后续 Task 的 grilling 若与上表冲突，以上表为准，并在该 Task 的 `grilling.md` 里记下引用的决策编号。

## 架构决策（D13–D17）：企业身份统一到 Casdoor

采纳日期：2026-10-14。来源：[prd/new-sitemap2/OpenBuddy_Enterprise_Identity_Casdoor_Unification_PRD_v1.0.md](../../prd/new-sitemap2/OpenBuddy_Enterprise_Identity_Casdoor_Unification_PRD_v1.0.md) 第 2 节。接口定义冻结于 [prd/new-sitemap2/OpenBuddy_Enterprise_Identity_Interface_Contract_v1.0.md](../../prd/new-sitemap2/OpenBuddy_Enterprise_Identity_Interface_Contract_v1.0.md)。与 D01（复用现有 Casdoor/OIDC）一致。生产 gate 的签字要求不变。

| ID | 决策 | 仍然阻塞的生产项 |
| --- | --- | --- |
| D13 | 企业身份单一权威为 `casdoorAuth` 直连内部 Casdoor（OIDC Code + PKCE）。`backendAuth` 登录链退役，不再作为任何企业能力的身份来源。 | 内部 Casdoor 桌面应用注册（公开客户端 + PKCE）、回调白名单；backend-auth 零消费者确认后才能删除代码 |
| D14 | Casdoor 是用户、组织、成员关系、粗粒度角色的唯一主数据源。nodeskclaw-backend 数据一次性迁入 Casdoor，之后 Casdoor → backend 单向同步（webhook + 定时对账）。backend 用户/组织写接口只读化。 | 迁移演练与 ID 映射表签字；webhook 配置与对账周期（PRD Q4、Q7） |
| D15 | 细粒度资源授权由 nodeskclaw-backend 作为 PDP 判定；不把资源权限清单写入签发给桌面端的 token。桌面端凭 Casdoor token 调 backend 获取身份上下文与授权结果，仅作展示与入口复核，服务端执行时逐次校验。桌面端直连 Casdoor `/api/enforce` 的既有授权路径（含 client secret 依赖）统一迁移到 `/api/v1/authz/check`。 | backend 身份上下文与授权查询接口的契约测试与部署；双 issuer 过渡窗口在桌面端零消费者后关闭 |
| D16 | 运行时（enterprise / platform / 后续 Runtime Adapter）只依赖注入的 `EnterpriseIdentityPort`（current、getAccessToken、refresh、onChange），不直接 import `casdoorAuth` / `backendAuth`。退出、切租户、换账号经端口事件触发运行时 dispose；迟到响应按 epoch 丢弃。 | 端口类型冻结见接口契约文档；旧链加固（single-flight、epoch）先行 |
| D17 | nodeskclaw-backend、hermes-agent-gateway、casdoor-resource-gateway 统一校验 Casdoor JWT（JWKS、iss、aud、exp、组织 claim）。hermes-agent-gateway 生产 verify 按此实现；静态 token 表仅限 fixture。 | audience 规划签字（PRD Q2）；网关生产 verify 依赖 D03 环境 |

## 架构决策（D18–D21）：Runtime Adapter 会话收敛

采纳日期：2026-10-15。来源：[prd/new-sitemap2/OpenBuddy_Runtime_Adapter_Session_Convergence_PRD_v1.0.md](../../prd/new-sitemap2/OpenBuddy_Runtime_Adapter_Session_Convergence_PRD_v1.0.md) 第 9 节。与 D16（运行时只依赖身份端口）和宪章 P4/P5 一致。

| ID | 决策 | 仍然阻塞的生产项 |
| --- | --- | --- |
| D18 | 不新建 5 方法 RuntimeAdapter。映射到 `packages/runtime/openbuddy-runtime-adapter/src/types.ts`，拆为 `RuntimeConnection` 与 `RuntimeSessionPort`，`RuntimeAdapter` 为二者组合 | 无 |
| D19 | 会话的 Runtime 绑定创建后不可变。切换默认只影响新会话；不做自动迁移或故障转移 | 无 |
| D20 | 本阶段不把 Local Pi 改走通用事件投影。Pi 保留原生 `pi://` 与 `useAgentSession`；只有非 Pi Runtime 走投影器 | RA-10 后再评估合并 |
| D21 | 远端流第一阶段保留分页轮询，由 Main 单订阅推送；常驻 SSE 作为 `liveStream` 能力位，不在本轮实现 | D03 Hermes staging |
