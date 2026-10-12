# 开发默认决策（D01–D12）

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
