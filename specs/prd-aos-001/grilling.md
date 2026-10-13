# Grilling: SMC-OE-AOS-001 OpenBuddy Enterprise Agent OS Phase-1 Platform Engineering PRD

- **Date**: 2026-10-13
- **Target**: `prd/OpenBuddy Enterprise Agent OS Phase-1 Platform Engineering PRD v1.1.md` (revised from v1.0)
- **Outcome**: 23 decisions adopted; PRD revised to v1.1 as architecture north-star document

## Facts established before Round 1

- `packages/runtime/openbuddy-runtime-adapter` already exists with a full session-level
  interface: `connect/createSession/sendMessage/stream(AsyncIterable)/cancel/resolveApproval/listTools/executeTool`.
- `packages/runtime/openbuddy-hermes-client`, `services/hermes-agent-gateway`,
  `packages/runtime/openbuddy-plugin-sdk`, `packages/runtime/openbuddy-plugin-host`,
  `packages/auth/openbuddy-permission` already exist.
- `prd/roadmap.md` already defines Phase 0–4E (Phase 1 Runtime, Phase 2 Enterprise
  Workspace, Phase 3 Plugin, Phase 4B Browser); `specs/` already holds executed P0/P1
  tasks. Execution was ahead of this PRD.
- Existing assets reused by the decisions: `packages/collaboration/openbuddy-evidence`,
  `packages/capability/openbuddy-authorization`, `packages/auth/openbuddy-casdoor`,
  `services/casdoor-resource-gateway`, `tests/fixtures/marketplace-bundle`,
  `packages/ui/openbuddy-ui-slots`, `packages/ui/openbuddy-ui-primitives`.

## Round 1 — PRD 与现实对齐

### Q1. RuntimeAdapter 接口：PRD 与现有代码谁服从谁？

- **Question**: v1.0 第5节的接口（id/name/start/stop/health/chat）相比现有代码是倒退（丢 streaming/cancel/approval/tool）。替换、重写还是分层？
- **Recommended**: 两层契约——Manager 层（register/start/stop/health/switch）+ Session 层（沿用现有接口），接口细节以代码为准回写 PRD。
- **Resolution**: adopted

### Q2. 第15节目标目录结构：新包名 vs 现有包名？

- **Question**: v1.0 提出的 `packages/runtime-core`、`packages/plugin-platform` 等与现有 `packages/runtime/*` 命名体系不对应。重命名还是逻辑视图？
- **Recommended**: 第15节改为逻辑分层视图 + 到现有包的映射表；新增能力按现有命名规范落位；不做大规模重命名。
- **Resolution**: adopted

### Q3. 本 PRD 与 `prd/roadmap.md` 谁是 source of truth？

- **Question**: 两边 Phase 划分冲突（PRD: 1 Runtime/2 Plugin/3 Browser；roadmap: 1 Runtime/2 Workspace/3 Plugin/4B Browser），且执行进度已超过 PRD。
- **Recommended**: PRD 降级为架构北极星文档；删 Migration Plan 改为指向 roadmap.md；验收对齐 roadmap Milestone。
- **Resolution**: adopted

### Q4. Runtime 绑定粒度与切换语义？

- **Question**: 全局单选还是会话绑定？切换时进行中会话怎么办？能否并发多 Runtime？
- **Recommended**: Runtime 绑定到会话 + 全局默认值；切换只影响新会话；进行中会话钉死原 Runtime；并发多 Runtime。
- **Resolution**: adopted

### Q5. Hermes 连接模型：直连 8642 还是走 gateway？进程归谁管？

- **Question**: Desktop 直连 localhost:8642，还是经 hermes-agent-gateway？Python 进程谁启动？未启动时降级行为？
- **Recommended**: HermesAdapter 经 gateway 接入（gateway 管进程生命周期与本机鉴权）；Desktop 不 spawn Python；gateway 未运行时降级到 Pi 并提示。
- **Resolution**: adopted

### Q6. Browser 技术栈：BrowserView、CDP、Playwright 三者什么关系？

- **Question**: 两套浏览器栈混在一条链里，角色不清。
- **Recommended**: 两态分工——BrowserView 可视态（登录/人工接管）+ Playwright/CDP 自动化态。
- **Resolution**: adopted

### Q7. 插件代码在哪运行？权限在哪一层强制？

- **Question**: Manifest 声明权限但无执行位置与强制点。
- **Recommended**: 插件后端在主进程隔离环境运行；所有能力调用经 plugin-permission 网关强制；UI 走声明式 slot。
- **Resolution**: adopted

## Round 2 — Scope 缺口与治理

### Q8. 按员工/部门选择 Runtime 的策略从哪来？

- **Question**: 问题定义有此诉求，Scope 中无对应机制。
- **Recommended**: Phase-1 只定义策略数据模型（allowedRuntimes/defaultRuntime/部门维度），执行用本地配置；策略下发归 roadmap Phase 2。
- **Resolution**: adopted

### Q9. Audit 审计能力归谁？

- **Question**: PRD 提了 Audit 但无范围/存储/格式。
- **Recommended**: Audit 最小闭环——runtime 切换、插件安装/卸载、浏览器审批/执行三类事件统一 schema 落本地 append-only 日志，接入 `openbuddy-logging-*`；上报留存归 Phase 2。
- **Resolution**: adopted

### Q10. Capability Registry 与现有 Skill/MCP/Expert 体系的关系？

- **Question**: 能力来源至少三处（runtime 自报、插件注册、内置 Skill/MCP），不统一会冲突。
- **Recommended**: 一个注册表三种来源（runtime/plugin/builtin）；命名空间隔离 + 冲突消解（plugin 不得覆盖 builtin）。
- **Resolution**: adopted

### Q11. Runtime 健康检查与故障降级语义？

- **Question**: health 语义、探活频率、chat 中途失败处理、历史会话 runtime 缺失行为。
- **Recommended**: 不自动 failover；health 只做 UI 状态与切换前预检；历史会话 runtime 不可用时只读打开；对齐 P1-07 结论回写。
- **Resolution**: adopted

### Q12. remote_gateway 类型与 Hermes gateway 部署形态？

- **Question**: 四种 runtime type 只有两种有验收路径；remote 集中部署缺鉴权/TLS 方案。
- **Recommended**: Phase-1 只交付 embedded(Pi) + local_process(Hermes)；remote_gateway 归 Phase 2（Casdoor + mTLS）；container 从 v1 删除。
- **Resolution**: adopted

### Q13. Browser 两态的登录态如何共享？

- **Question**: 用户可视态登录后，自动化态如何复用登录态？两套栈 cookie 不互通。
- **Recommended**: 单一 Electron session partition 为事实源；Playwright CDP attach 同 partition；cookie 加密 = Electron safeStorage，不另起方案。
- **Resolution**: adopted

### Q14. Browser Evidence 的格式与存储？

- **Question**: A-003 要求返回 Evidence 但无定义。
- **Recommended**: Evidence = 动作前 DOM 摘要 + 动作描述 + 动作后截图三元组；对齐 `openbuddy-evidence` schema；本地保留 + 手动清除；审批人以此为依据。
- **Resolution**: adopted

### Q15. Plugin Marketplace 的分发与信任模型？

- **Question**: 插件包来源与可信验证未定义。
- **Recommended**: 企业私有分发：签名 tarball + 内置公钥验签 + Manifest 权限校验；公开第三方市场列 Non-Goal；复用 marketplace-bundle fixture 格式。
- **Resolution**: adopted

### Q16. 本 grilling 结论如何落盘？

- **Question**: 23 项决策需要载体。
- **Recommended**: 写 `specs/prd-aos-001/grilling.md`；PRD 修订为 v1.1；分别提交。
- **Resolution**: adopted

## Round 3 — 执行层细节

### Q17. 权限网关的拦截模型：授权发生在什么时候？

- **Question**: 安装时授权 / 运行期逐次弹窗 / 混合？
- **Recommended**: 分层授权——激活时校验 Manifest↔策略并颁发能力句柄，Tool/MCP 调用零打扰；对外副作用操作（浏览器提交、写文件、非白名单网络请求）仍走 resolveApproval 审批链。
- **Resolution**: adopted

### Q18. 插件 UI Extension 的 schema 边界？

- **Question**: 白名单组件目录还是任意前端代码？
- **Recommended**: 白名单组件目录（openbuddy-ui-primitives）+ slot JSON 声明；禁止任意 JS 进 Renderer；iframe 沙箱归后续 Phase。
- **Resolution**: adopted

### Q19. Runtime 配置 schema：Endpoint 和凭据怎么存？

- **Question**: 配置模型与密钥存放未定义。
- **Recommended**: 非密字段明文 + 密钥引用（secretRef → OS keychain/safeStorage），禁止内联；定义 adapter 接口版本兼容性校验，不兼容置灰。
- **Resolution**: adopted

### Q20. Browser 审批的交互粒度？

- **Question**: 逐 action 还是整会话？谁批？超时行为？
- **Recommended**: 三级策略——白名单只读自动批；白名单写逐次批（Evidence 预览，可会话内记住）；非白名单拒绝。Phase-1 审批人为本机用户；超时默认拒绝。
- **Resolution**: adopted

### Q21. 切换 Runtime 后上下文有延续吗？

- **Question**: 自动迁移还是断裂？
- **Recommended**: 不做自动迁移；提供可选"交接摘要"（旧 Runtime 生成摘要作为新会话首条消息），明确有损。
- **Resolution**: adopted

### Q22. 插件对 Runtime 能力有依赖声明吗？

- **Question**: 插件 Tool 需要 Runtime 支持 tool-use，如何声明与校验？
- **Recommended**: Manifest 可选声明 requiredRuntimeCapabilities；不硬阻断，组装工具列表时按会话 Runtime 能力过滤并提示。
- **Resolution**: adopted

### Q23. 验收标准如何变成可执行的？

- **Question**: A-001~A-003 是文字描述，PASS 无定义。
- **Recommended**: Acceptance 改为指向 tests/enterprise/ 自动化测试的映射；PRD 不自带验收脚本。
- **Resolution**: adopted

## ADR needed

- none — decisions are recorded in PRD v1.1 and this file; roadmap Phase 2+ items tracked via `prd/roadmap.md`.
