# Review: SMC-OE-AOS-001 PRD v1.1 能否驱动实施

- **Date**: 2026-10-13
- **Verdict**: **fail** — 当前状态无法针对本 PRD 推进实施
- **Reviewer focus**: PRD 与执行体系（roadmap.md / WORKFLOW.md / ledger）的可追溯性

## 证据

1. `prd/roadmap.md` 全文 **0 处**引用 SMC-OE-AOS-001（grep 无匹配）。55 个 Task 引用的 REQ 全部来自专项规范：REQ-R01–R05（Runtime-Adapter-SDK-Interface-Design）、REQ-G02–G05（Hermes-Gateway-API-Specification）、REQ-W02–W05、REQ-P02–P05、REQ-SDK01–04、REQ-MK02–04、REQ-K01–K05、REQ-B02 等。roadmap 第 2 节明文规定"共享契约以 roadmap 第 2 节列出的 REQ 为唯一来源"，其中不含本 PRD。
2. 本 PRD 仅有两个 REQ（REQ-RUNTIME-001、REQ-PLUGIN-001），编号体系与 roadmap 引用的 REQ 不兼容，无任何 Task 可回溯到本 PRD。
3. ledger 实际进度：Phase 0 已退出；Phase 1 全部 done/done-fixture；Phase 2–4E 基本 done/done-fixture（P2-05 被 2026-10-12 review 重开）。**P1-03 已交付 Full RemoteHermesAdapter**（roadmap Phase 1，REQ-G02/R02）。
4. `prd/new-sitemap/` 下仍存 v1.0 副本。

## Findings

- **F1 (blocker) 断链**：PRD ↔ roadmap 双向无引用。WORKFLOW 要求"以该 Task 引用的 REQ 为根"，本 PRD 无 REQ 可被 Task 引用，也没有条款→Task 映射，因此"针对 PRD 推进实施"在机制上不存在。
- **F2 (blocker) 进度倒挂**：PRD §14 把 Runtime Platform 写为 Phase 1 待执行、Plugin 为 Phase 3，但这些 Phase 在 ledger 中均已完成。PRD 无与 ledger 的同步机制，描述的交付状态是假的。
- **F3 (major) 条款与现实冲突**：§3 表格称 `remote_gateway` 归 Phase-2（前置 Casdoor+mTLS），但 RemoteHermesAdapter 已在 P1-03 交付。grilling 决策 Q12 依据的信息已过时。
- **F4 (major) 仲裁规则缺失**：接口细节分散在 7+ 份专项规范中，本 PRD §5/§8/§10/§11 与它们存在重叠面。v1.1 只声明了"Session 层以代码为准"，未声明本 PRD 与专项规范冲突时谁赢，实施者遇到分歧会停摆。
- **F5 (major) 验收双轨**：§15 另立 tests/enterprise 映射，而执行体系验收是 roadmap Milestone exit + 每 Task 的 evidence.md。两套表述无对齐表，PASS 仍无单一判据。
- **F6 (minor) 遗留副本**：`prd/new-sitemap/` 的 v1.0 副本未标注 superseded，版本混淆风险。

## Required fixes（回到修订，产出 v1.2）

- **R1** 新增"需求溯源"章节：PRD 条款 → 专项规范 REQ → roadmap Task/Milestone → specs evidence 映射表（至少覆盖 SCOPE-001~003、§13 Audit、Non-Goal）。
- **R2** 建立双向链接与仲裁规则：roadmap.md 头部加入对本 PRD 的北极星引用；PRD 声明——接口/契约细节以专项规范与代码为准，分层边界、Non-Goal、治理原则以本 PRD 为准。
- **R3** 修正与现实冲突的条款：`remote_gateway` 状态改为"已交付（P1-03，见 ledger）"；§14 改为引用 ledger 实时状态，删除静态 Phase 描述。
- **R4** Acceptance 改为引用 roadmap Phase exit 条件 + ledger 状态的对齐表，不再另立判据。
- **R5** 处理 `prd/new-sitemap/` 的 v1.0 遗留副本（删除或标注 superseded）。

## 处理记录

- Round 1: 待处理（R1–R5 均未应用）
