# OpenBuddy Enterprise Agent OS Constitution

Version: 1.0.0  
Ratified: 2026-10-12  
Last amended: 2026-10-12

本宪章约束 `roadmap/enterprise-agent-os` 上按 [prd/roadmap.md](../../prd/roadmap.md) 实施的工作。执行步骤见 [docs/roadmap/WORKFLOW.md](../../docs/roadmap/WORKFLOW.md)。

## Principle 1: Task Is the Delivery Unit

每个交付单元是 roadmap 中的一个 Task。关闭条件是该 Task 的 Acceptance 都有证据，并且 [docs/roadmap/ledger.md](../../docs/roadmap/ledger.md) 已更新。月份窗口、mock 成功和文档写完都不能代替验收。

## Principle 2: Recommended Decisions Are Adopted

Grilling 中每个问题采用当轮推荐答案，并记为 adopted。D01–D12 采用 [docs/roadmap/decisions.md](../../docs/roadmap/decisions.md)。不得为这些默认值停下来等待人工确认。生产 owner 未签字的项保持外部阻塞，不升格为生产决定。

## Principle 3: Evidence Before Completion

声称完成之前必须运行该 Task 指定的命令，并把命令、结果、环境和限制写入 `specs/<TaskId>-*/evidence.md`。未运行的检查不得写成通过。fixture 证据和真实环境证据必须分开。

## Principle 4: Contracts Stay Singular

Runtime、Gateway、Workspace、Plugin SDK、Knowledge preview 与 Browser 的共享契约以 roadmap 第 2 节点名的 REQ 为唯一来源。新代码不得复制一份不兼容的 scope、错误或事件模型。

## Principle 5: Preserve the Local Pi

Local Pi 与现有可信插件继续可用。Remote Hermes 经 Adapter 并存，不删除本地会话，不把 local-pi 说成 Local Hermes，不把旧会话自动上传到企业空间。

## Principle 6: Migrate Only the Named Source

迁移只读 `E:/git/smc-copilot/apps/work`。不联网拉取源码，不覆盖 lock 文件，不把范围外的包整份复制进来。源文件 hash 变化时停止该文件的迁移。

## Principle 7: Fail Closed

未知权限、缺失沙箱、跨 tenant 引用、不兼容协议和未批准的外部写必须拒绝。UI 隐藏不能代替服务端授权。不能用删数据伪装回滚。

## Principle 8: No Unrequested Release Actions

实施会话不 push、不开 pull request、不部署生产。远程环境只使用已授权的测试或 staging 参数；没有该环境时 Task 以 `done-fixture` 结束，并登记阻塞。

## Governance

修正本宪章须更新版本：不兼容的原则删除或重定义为 MAJOR，新增原则为 MINOR，措辞澄清为 PATCH。修正须说明原因，并检查 WORKFLOW、ledger 模板和进行中的 spec 是否仍一致。

每个 Task 在 plan 与 review 时对照上述原则。与原则冲突的实现不得提交。
