# Roadmap 任务工作流

长期分支：`roadmap/enterprise-agent-os`。

总目标来自 [prd/roadmap.md](../../prd/roadmap.md)：Phase 0 到 4E，9 个执行段、18 个 Milestone、55 个 Task。状态总账是 [ledger.md](ledger.md)。开发默认决策是 [decisions.md](decisions.md)。项目原则是 [.specify/memory/constitution.md](../../.specify/memory/constitution.md)。

一个会话只推进一个 Task。开始前重新读取本文件、ledger、该 Task 在 roadmap 中的原文，以及它引用的 PRD 条款。不要依赖上一轮对话。

## 状态

| 状态 | 含义 |
| --- | --- |
| `pending` | 尚未开始 |
| `in-progress` | 本会话正在做 |
| `done` | Acceptance 全部有真实证据 |
| `done-fixture` | 契约、实现和 fixture 完成；依赖外部环境的验收项记在 ledger 的外部阻塞表。后续 Task 可以继续，对应 Phase 退出门槛标为「等待外部环境」 |
| `blocked` | 连 fixture 范围内的工作也无法完成。记下原因，按依赖找下一个仍可做的 Task |

`done-fixture` 不能解除生产 gate。mock 成功、月份到期或等待时间都不能把外部阻塞改成通过。

## 每个 Task 的六步

产物目录：`specs/<TaskId>-<short-name>/`。模板在 [templates/](templates/)。

1. **Grilling**。用 grilling 与 domain-modeling。以该 Task 引用的 REQ 为根，列出当前可决定的问题，每题给出推荐答案并直接标 `adopted`。事实去代码和本地 `E:/git/smc-copilot` 查，不向人提问。D01–D12 采用 [decisions.md](decisions.md)。产出 `grilling.md` 和 `spec.md`。新术语写入根目录 `CONTEXT.md`。只有难逆转、缺少上下文会令人惊讶、且存在真实取舍的决定才写成 `docs/adr/NNNN-slug.md`。
2. **Review**。另开一个不写实现的审阅，对照 PRD 条款、roadmap Acceptance、宪章和已有 ADR。结论写入 `review.md`。逐条处理意见，最多 3 轮；不通过则回到 grilling 改 spec。
3. **Plan**。用 writing-plans。产出 `plan.md`：精确文件（现有/新增分开）、先失败测试再实现、验证命令、回滚。
4. **Execute**。用 test-driven-development。先写失败用例或契约 fixture，再小步实现。故障用 systematic-debugging。保留 Local Pi 和现有插件行为。
5. **验证**。实际运行该 Task 指定的命令，以及受影响包的 `pnpm typecheck`。把命令、版本、fixture、环境和逐条 Acceptance 写入 `evidence.md`。fixture 结果与真实环境结果分列。
6. **Commit**。信息格式：

```text
feat(<TaskId>): <目标>

Roadmap-Task: <TaskId>
```

同一提交更新 ledger 中该 Task 的状态、证据路径和已知限制。Task 过大时可按 schema、实现、错误与恢复、集成拆成多个小提交；只有最后一次提交把状态改为 `done` 或 `done-fixture`。

不 push，不开 PR，不部署生产。

## 边界

- 对 `E:/git/smc-copilot` 只读。不联网补源码，不覆写 lock 文件，不把 glob 当成完整 import 闭包。
- 迁移来源只限 `apps/work`。范围外依赖（含 `packages/runtime-client-ts`）默认在目标侧重写接口，不复制源码。
- 源文件 hash 变化则停止该文件迁移，不覆盖他人未提交改动。
- 命令在 Windows PowerShell 下运行。依赖 bash 的现有脚本先确认 Git Bash 或 WSL；不可用时在所属 Task 建立语义等价的跨平台入口。
- 共享契约以 roadmap 第 2 节列出的 REQ 为唯一来源，不另写不兼容副本。
- 回滚只撤回本 Task 增量与 feature flag。Schema 和外部写入不能靠删数据假装回滚。保留 receipt 和审计。

## 交接

会话结束时 ledger 必须反映真实状态。下一会话从 ledger 里第一个 `pending` 且依赖已终态的 Task 开始。
