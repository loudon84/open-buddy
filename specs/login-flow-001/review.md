# Review: PRD-OpenBuddy-Enterprise-Login-Optimization-001 v1.1 能否驱动实施

- **Date**: 2026-10-13
- **Verdict**: **fail** — 3 个 major 缺口会让实施者在同一处做出互相矛盾的代码
- **Reviewer focus**: PRD v1.1 条款 ↔ 现有 `electron/main/backend-auth`、登录入口、设置页的可执行性

## 证据

1. `src/features/app/AppShell.tsx:544` 侧栏「登录」唯一地 `onLogin={openSignIn}` → `setSignInOpen(true)` → `overlay.sign-in` 渲染 `BackendSignInDialog`。该对话框是登录的唯一 UI 落点。
2. `electron/main/backend-auth/backend-auth-service.ts:92-94` 保存空地址时 `store().delete(CONFIG_NAMESPACE)`：当前实现下「从未写过」与「用户清空」在存储层不可区分。
3. `backend-auth-service.ts:60-75` 本机回调服务器对 `/callback` 直接返回 200 HTML；窗口导航到该地址与页面展示之间只有一个 HTTP 响应，PRD 要求"不展示 HTML"必须依赖 `did-navigate` 级别拦截，而非响应后关闭。
4. `backend-auth-service.ts:200-205` `cancel()` 自增 `round` 使进行中的换票失效；而 REQ-LOGIN-002 同时要求"回调到达立刻关窗"和"关窗即取消"，两个动作落在同一事件上。
5. nodeskclaw-backend 的 `/api/v1/auth/casdoor/login` 是带 `return_to` 参数的重定向入口（`backend-auth-service.ts:188`）；不带参数直接 GET 的响应码未在本仓库任何测试中出现。

## Findings

- **F1 (major) 登录对话框的存废未规定**：REQ-LOGIN-001 要求有地址时「直接调用 backend-auth:login，不打开 BackendSignInDialog」，而文件修改范围却写「BackendSignInDialog.tsx 去掉地址输入」。证据 1 表明该对话框只由登录入口打开；入口不再打开它之后，它要么整体删除（连带 `overlay.sign-in` slot、`signInOpen` 状态、audit 记录），要么保留作其它用途。PRD 没有声明删还是留，A-001「不出现地址弹窗」在两种实现下判据不同。
- **F2 (major) 「关窗即取消」与「回调后立即关窗」冲突**：REQ-LOGIN-002 两条 MUST 在同一事件序列上自相矛盾——回调到达时既要立刻关窗（成功路径），又规定关窗等同取消登录（证据 4 的 `cancel()` 会使换票失效）。PRD 未规定取消的时序边界：只有「本轮回调尚未被监听端消费」时的关窗才应取消；回调已消费后的关窗不得取消本轮。实施者按字面写 `close → cancel()` 会让每次成功登录都被自己取消。
- **F3 (major) 测试连接的请求形状未规定**：REQ-CONFIG-002 只说请求 `{origin}/api/v1/auth/casdoor/login` 不跟随跳转、2xx/3xx 成功。该端点是带 `return_to` 的重定向入口（证据 5），裸 GET 很可能返回 4xx 参数错误——此时身份网关实际可达，测试却报失败。PRD 必须二选一：带上占位 `return_to` 参数，或把"有 HTTP 响应（含 4xx 业务错误）"定义为可达。
- **F4 (minor) 存量升级副作用**：REQ-CONFIG-001 以"配置文档是否存在"区分首次与用户清空，但现行实现清空即删文档（证据 2）。升级后，所有曾保存空地址的老用户会被视为"从未写过"而写入默认地址。升级策略第 1 条"保留已有用户配置"未覆盖这一迁移分支。
- **F5 (minor) 测试连接超时未规定**：REQ-CONFIG-002 列了超时作为失败分支，但未给数值。实施者只能猜。
- **F6 (minor) Evidence 缺口**：A-002 要求"不调用系统浏览器"，§12 测试清单没有"断言 `shell.openExternal` 在登录路径中零调用"的用例；§10 也未列入需要同步修改的 `electron/main/backend-auth/error-copy.ts` 消费方（toast 文案来源）。
- **F7 (minor) 元数据滞后**：frontmatter `status: DRAFT`，但 §13 已记录 grilling 全量确认；文件名仍为 v1.0 而内容为 v1.1。

## Required fixes（修订为 v1.2）

- **R1** 明确 `BackendSignInDialog` 与 `overlay.sign-in` 的命运：删除或保留，给出 A-001 对应的判据。
- **R2** 给「关窗即取消」加时序边界：仅当本轮回调未被消费时关窗才取消；回调消费后关窗不再影响本轮。
- **R3** 规定测试连接的请求形状（是否带 `return_to`、可达判据是否含 4xx）与超时时间。
- **R4** 升级策略补充：升级前已清空地址的用户按何种语义处理。
- **R5** §12 增加"登录路径零 `shell.openExternal` 调用"断言；§10 补 error-copy/toast 消费方。
- **R6** 元数据与实际版本对齐。

## 处理记录

- Round 2 (2026-10-13): R1–R6 全部应用，PRD 修订为 v1.2。
  - R1: REQ-LOGIN-001 明确删除 `BackendSignInDialog` 及 `overlay.sign-in` 全链；§10 列出删除范围（含 AppShell、types、测试）。
  - R2: REQ-LOGIN-002 写入时序边界：回调消费前关窗才 `cancel()`；回调消费后（含换票中）关窗不影响本轮。
  - R3: REQ-CONFIG-002 固定请求形状：带占位 `return_to`、`redirect: "manual"`、超时 5 秒、2xx/3xx 成功、4xx/5xx 失败。
  - R4: §9 升级策略补充迁移分支：老版本清空即删文档的机器按"从未写过"写入默认值，用户可再清空一次，新语义保留空值。
  - R5: §12 增加 `shell.openExternal` 零调用断言与超时断言；§10 补 `error-copy.ts` 为 toast 文案来源。
  - R6: `status: REVIEWED`，frontmatter 与内容对齐 v1.2。
- **Verdict after Round 2**: pass（三个 major 缺口均有唯一解，条款可直接驱动实施）
