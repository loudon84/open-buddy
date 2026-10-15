# OpenBuddy 二开实施 Roadmap（供 Cursor 执行）

> 修订日期：2026-10-12。本文与21份PRD/设计文件和审查记录构成实施基线。本次只完成文档；没有实现产品功能、执行产品测试、安装依赖、发布或提交代码。

> 架构北极星：[SMC-OE-AOS-001](OpenBuddy%20Enterprise%20Agent%20OS%20Phase-1%20Platform%20Engineering%20PRD%20v1.2.md) 管分层边界、Non-Goal 与治理原则；接口/契约细节以第 2 节列出的专项规范 REQ 与代码为准。分工冲突的仲裁规则见该 PRD「文档定位」。

## 1. 执行口径、证据与来源

遵循[GUIDE](GUIDE-smc-copilot-Enterprise-Agent-OS-v1.0.md#REQ-GUIDE02)的Phase0–4；Phase4展开为4A–4E，共9个执行段、18个Milestone、18个Epic、55个Task。每段按依赖验收后退出，月份只是从启动时起的建议窗口。首期Desktop+Local Pi/Remote Hermes；年度外候选保留在总体PRD和D09，不能把它们当已交付。

证据来自GPT-6 Luna本地静态扫描，由GPT-6 Astra统一分析修订：OpenBuddy扫描时快照HEAD `2dd37e9eaa8c35496846883c0c47b60153f9ddfb`（不是实施时当前HEAD；独立核验时外部已推进到`0b011f9d59ef4e808ea530206cc15555eaf88153`）；Work扫描时HEAD `68de354235f2796da8c89b869a9db70955fae20e`。只从`E:/git/smc-copilot/apps/work`选择迁移，不fetch/pull或从GitHub补代码。扫描发现的源兄弟包`packages/runtime-client-ts`超出指定迁移范围，默认不复制，以接口隔离/目标实现处理；确需纳入先走D12。所有候选目录须逐文件核验hash/license/import闭包。

OpenBuddy已有Pi、plugin host/manifest serializer、Casdoor授权、本地KB与iframe BrowserPreview；这些不能分别等同Hermes、完整企业SDK、企业Workspace、远端知识后端或Browser Agent。Work只有Hermes客户端和启动编排；server不在迁移目录，Knowledge HTTP provider与未实现remote facade要区分。不得把下述目标API标成上游已支持。

## 2. 共享接口与依赖图

唯一接口来源：[REQ-R02](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R02), [REQ-G03](Hermes-Gateway-API-Specification-v1.0.md#REQ-G03), [REQ-W02](PRD-Enterprise-Workspace-v1.0.md#REQ-W02), [REQ-SDK01](Enterprise-Plugin-SDK开发规范-v1.0.md#REQ-SDK01), [REQ-K03](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K03), [REQ-B02](PRD-Browser-Agent-Platform-v1.0.md#REQ-B02)。所有Task继承：可信scope、server鉴权、错误schema、timeout/cancel、幂等、trace/audit；不得自行定义不兼容副本。

```text
Phase0（P0四主线契约/基线）
  → Phase1（Pi兼容 + Remote Gateway/会话/流）
  → Phase2（权威Workspace + 企业隔离）
  → Phase3（Plugin SDK/隔离/私有分发）
  → Phase4A（Knowledge → Preview → RAG）
  → Phase4B（Browser） → Phase4C（CRM）
  → Phase4D（BI） → Phase4E（Ontology + 全年验收）
```

阶段内仅依赖列表全部完成后开工；没有互相依赖且不改同一文件/契约的任务可并行，合并前先跑共同contract suite。跨阶段可提前做业务决策、只读源清单、DTO评审和fixture准备，不能提前放行生产能力。P0四主线均最高优先，但实现按Runtime→Workspace→Plugin依赖排序。

## 3. 文件、测试与交付约定

下文“现有/复用”中的标注“前期新增”表示依赖任务完成后才存在；路径的花括号、通配符和目录是建议范围，开工前必须落成精确文件。新增建议不是已创建文件。全部路径相对`E:/git/open-buddy`，明确“源”才相对`E:/git/smc-copilot`；源文件不得写入。真实目录沿Monorepo设计，UI遵循其局部AGENTS；Core只放基础设施。

已有验证命令仅确认脚本入口存在，本次未运行：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build`、`pnpm test:electron`、`pnpm verify:agent-host-boundaries`、`pnpm enterprise:release-audit`、`pnpm tenant:boundary-audit`、`pnpm eval:acceptance`。实施先记录baseline。Windows注意：现有`tenant:boundary-audit`实际调用`bash scripts/verify-tenant-boundaries.sh`，需可用Git Bash/WSL等bash环境；仅在PowerShell中有pnpm并不保证该脚本能运行。P0-06须验证shell/依赖前提或建立等价跨平台入口，并保持原检查语义。新测试和`verify:*`/`test:*`入口均标“待建”，在P0-06接线或所属task增加；不可直接假定能运行。默认`pnpm exec vitest run tests/enterprise/<TaskId>.test.ts`是拟建用例，先接入Vitest发现/环境/依赖，Node服务和Electron e2e应选相应runner。现有audit/eval脚本必须补新模块覆盖才有证明力。

每个Task的验收产物为：精确diff/新增文件清单、对应REQ、失败→通过测试证据或文档/配置可核验输出、运行命令/版本/fixture/环境、已知限制、回滚步骤。测试用例围绕行为/边界而非复制实现；服务e2e必须真实受控环境，mock结果单列。任务失败回滚本task增量，保留receipt/审计；Schema和外部写不能通过删数据假回滚。

## 4. Phase → Milestone → Epic → Task → Acceptance

<a id="phase-0"></a>
## Phase 0：基础架构准备

- **建议窗口 / 目标**：月0–1；完成可执行Architecture Baseline，确定P0四主线和本地源迁移边界。
- **PRD与条款**：[REQ-T01](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md#REQ-T01)、[REQ-GUIDE03](GUIDE-smc-copilot-Enterprise-Agent-OS-v1.0.md#REQ-GUIDE03)、[REQ-D01](OpenBuddy-Enterprise-Fork-Monorepo目标目录设计-v1.0.md#REQ-D01)
- **前置依赖**：本地源码、原PRD和现有工作区可读；先保留并发用户修改。
- **边界**：只做基线、契约、CI接线与可运行fixture；不提前移植业务、不迁移整个monorepo。
- **阶段验收 / 退出门槛**：P0-01至P0-06证据齐备；确认源/目标版本、文件映射与许可限制、统一scope/协议、真实远端试点D03清单及可执行baseline；上游未知能力写明阻塞，不能标现成支持。
- **回滚策略**：回退新增配置/fixture，不删除旧源码和用户未跟踪材料；依赖锁变化可单独撤回。

### M0.1 Milestone：证据和边界定稿

**Milestone验收**：P0-01–P0-03全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E0.1 Epic：来源清单与原位架构

<a id="P0-01"></a>
##### Task P0-01：冻结代码/文档基线与许可清单

- **目标 / PRD**：冻结代码/文档基线与许可清单；[REQ-F01](OpenBuddy-Fork-代码改造清单-v1.0.md#REQ-F01)、[REQ-K01](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K01)
- **依赖与顺序**：无（起始任务）。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：package.json、pnpm-workspace.yaml、moon.yml；源apps/work/LICENSE和package.json。
- **Scope—新增建议**：docs/architecture/baseline.md；docs/architecture/migration-inventory.json；行为测试默认新增`tests/enterprise/P0-01.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入两个本地checkout与18份修订原文；输出开工时重新冻结的源/目标HEAD、dirty清单、相对扫描快照的差异、逐文件hash/license/import闭包及existing/new分类。扫描HEAD不能当当前HEAD；发现外部提交或未提交改动须更新相关证据和映射，不重置或覆盖它们。
- **边界 / Cursor约束**：不联网取源、不覆写锁文件，不将glob当完整闭包。
- **Acceptance**：来源只在apps/work；React19/npm/Nx→React18/pnpm/moon差异逐条有处置，显式登记目标react-dom ^18.3.1、@types/react-dom ^19.2.7与@types/react ^18.3.12的现有组合，验证JSX/组件/DOM类型兼容，以目标typecheck结果裁定而不擅改依赖；range外依赖列D12不复制；SHA改变停止该文件迁移，保留他人改动。
- **验证命令/方法**：已有命令：`git rev-parse HEAD`、`git status --short`；PowerShell `Get-FileHash -Algorithm SHA256 <逐文件路径>`。人工核对inventory每条来源/许可证。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 0数据/外部副作用回滚限制，不撤销他人改动。

<a id="P0-02"></a>
##### Task P0-02：裁定服务权威、数据流与目录边界

- **目标 / PRD**：裁定服务权威、数据流与目录边界；[REQ-T02](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md#REQ-T02)、[REQ-D02](OpenBuddy-Enterprise-Fork-Monorepo目标目录设计-v1.0.md#REQ-D02)、[REQ-S02](PRD-OpenBuddy-Enterprise-Shell-改造-v1.0.md#REQ-S02)
- **依赖与顺序**：[P0-01](#P0-01)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：electron/main/agent/pi-session-runtime.ts；electron/preload/index.ts；packages/runtime/openbuddy-plugin-host/src/index.ts。
- **Scope—新增建议**：docs/architecture/adr-001-enterprise-boundaries.md；docs/architecture/dependency-boundaries.json；行为测试默认新增`tests/enterprise/P0-02.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入实际Pi/IPC/host/auth位置；输出客户端、Gateway、Workspace、Plugin Registry/Worker与外部Hermes责任和依赖图。
- **边界 / Cursor约束**：“Ekko架构”不假定存在外部Ekko SDK；现有plugin serializer不标为完整运行时。
- **Acceptance**：无core→业务、UI→Hermes和portable→Electron反向依赖；Agent Gateway与resource gateway职责分开；无apps/desktop大搬家。
- **验证命令/方法**：待建命令：`node scripts/architecture/check-enterprise-boundaries.mjs --spec-only`；检查ADR责任与deny-edge fixture。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 0数据/外部副作用回滚限制，不撤销他人改动。

<a id="P0-03"></a>
##### Task P0-03：定义迁移兼容与远端环境探针

- **目标 / PRD**：定义迁移兼容与远端环境探针；[REQ-H03](PRD-Hermes-Remote-Runtime-Gateway-v1.0.md#REQ-H03)、[REQ-K01](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K01)、[REQ-T04](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md#REQ-T04)
- **依赖与顺序**：[P0-01](#P0-01)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：源apps/work/src/main/hermes.ts；src/main/skill-run/skill-run-gateway-client.ts（源apps/work内）。
- **Scope—新增建议**：docs/architecture/hermes-capability-matrix.json；docs/architecture/deployment-prerequisites.md；行为测试默认新增`tests/enterprise/P0-03.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入本地客户端调用证据和经D03授权的测试环境参数；输出上游版本→路径/auth/event/cancel/approval/artifact/resume能力矩阵及缺口。
- **边界 / Cursor约束**：无测试环境仅完成矩阵，不能退出P1真实远端验收；不得使用生产数据探针。
- **Acceptance**：每能力标observed-client/contract-tested/unsupported，缺server实现明确；声明服务部署、许可证、凭据负责人，未知项阻塞对应e2e而不阻塞纯DTO。
- **验证命令/方法**：待建命令：`pnpm verify:hermes-contract -- --profile=staging`；无D03环境时只跑`--fixtures`并标未实测。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 0数据/外部副作用回滚限制，不撤销他人改动。

### M0.2 Milestone：契约与验证就绪

**Milestone验收**：P0-04–P0-06全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E0.2 Epic：跨边界协议与CI

<a id="P0-04"></a>
##### Task P0-04：冻结Runtime、Gateway与scope契约

- **目标 / PRD**：冻结Runtime、Gateway与scope契约；[REQ-R02](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R02)、[REQ-G03](Hermes-Gateway-API-Specification-v1.0.md#REQ-G03)、[REQ-W02](PRD-Enterprise-Workspace-v1.0.md#REQ-W02)
- **依赖与顺序**：[P0-02](#P0-02)、[P0-03](#P0-03)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：electron/preload/index.ts（只对照现有桥）。
- **Scope—新增建议**：packages/runtime/openbuddy-runtime-adapter/src/types.ts；services/hermes-agent-gateway/contracts/openapi.yaml；services/hermes-agent-gateway/contracts/events.schema.json；行为测试默认新增`tests/enterprise/P0-04.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入scope/session/run/task/error/event模型和能力矩阵；输出版本化DTO/OpenAPI/事件schema、兼容桥映射与黄金fixture。
- **边界 / Cursor约束**：仅契约，服务实现进入P1；协议不兼容返回可理解错误。
- **Acceptance**：SDK方法与端点一一映射；cancel/approval/断线/错误/幂等/schema版本可表达；跨tenant例子必拒绝；不把/api草案当上游现成路径。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P0-04.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 0数据/外部副作用回滚限制，不撤销他人改动。

<a id="P0-05"></a>
##### Task P0-05：准备Workspace和Plugin P0扩展契约

- **目标 / PRD**：准备Workspace和Plugin P0扩展契约；[REQ-W03](PRD-Enterprise-Workspace-v1.0.md#REQ-W03)、[REQ-P02](PRD-Enterprise-Plugin-Framework-SDK-v1.0.md#REQ-P02)、[REQ-SDK01](Enterprise-Plugin-SDK开发规范-v1.0.md#REQ-SDK01)
- **依赖与顺序**：[P0-02](#P0-02)、[P0-04](#P0-04)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/auth/openbuddy-casdoor/src/authorization.ts；packages/runtime/openbuddy-plugin-host/src/plugin-manifest.ts。
- **Scope—新增建议**：packages/runtime/openbuddy-workspace/src/types.ts；packages/runtime/openbuddy-plugin-sdk/src/enterprise-contract.ts；docs/architecture/permission-matrix.json；行为测试默认新增`tests/enterprise/P0-05.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入统一scope/授权与现有manifest；输出Workspace DTO、manifest v1 schema、capability协商、trusted/third-party host profiles。
- **边界 / Cursor约束**：不提前承诺企业隔离已完成；tenant策略不会仅在UI过滤。
- **Acceptance**：用户多tenant、workspace membership、Task权威、plugin permission命名、disposable生命周期有fixture；未知业务角色用D01标注；沙箱不可用fail closed。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P0-05.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 0数据/外部副作用回滚限制，不撤销他人改动。

<a id="P0-06"></a>
##### Task P0-06：接入增量workspace和验证流水线

- **目标 / PRD**：接入增量workspace和验证流水线；[REQ-D03](OpenBuddy-Enterprise-Fork-Monorepo目标目录设计-v1.0.md#REQ-D03)、[REQ-T05](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md#REQ-T05)
- **依赖与顺序**：[P0-04](#P0-04)、[P0-05](#P0-05)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：package.json；pnpm-workspace.yaml；moon.yml；scripts/architecture/check-agent-host-boundaries.mjs。
- **Scope—新增建议**：scripts/architecture/check-enterprise-boundaries.mjs；tests/enterprise/fixtures/；docs/architecture/validation-baseline.md；行为测试默认新增`tests/enterprise/P0-06.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入新包/服务最小骨架和fixture；输出typecheck/build/test/边界CI入口、测试发现配置和基线报告。
- **边界 / Cursor约束**：只增加本项目必要依赖与测试发现规则；不把现有未执行测试写成通过。
- **Acceptance**：新包被workspace/moon/tsconfig发现；故意反向import样例会失败；确认Windows所需bash/WSL、pnpm及依赖可用，或为tenant boundary检查建立语义等价跨平台入口；已有脚本实际执行并保存结果，baseline失败不隐藏；无源lock覆盖。
- **验证命令/方法**：已有命令：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build`、`pnpm verify:agent-host-boundaries`；待建：`pnpm verify:enterprise-boundaries`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 0数据/外部副作用回滚限制，不撤销他人改动。

<a id="phase-1"></a>
## Phase 1：Runtime Platform

- **建议窗口 / 目标**：月1–3；Desktop经统一Adapter连接真实Remote Hermes，保留Local Pi并具备可恢复会话。
- **PRD与条款**：[REQ-R05](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R05)、[REQ-H05](PRD-Hermes-Remote-Runtime-Gateway-v1.0.md#REQ-H05)、[REQ-G05](Hermes-Gateway-API-Specification-v1.0.md#REQ-G05)、[REQ-E04](PRD-Ekko-Runtime-Architecture-Integration-v1.0.md#REQ-E04)
- **前置依赖**：Phase 0退出门槛通过；允许提前设计的条件见§2。
- **边界**：不把企业Workspace全量治理提前宣称完成；只在明确授权的测试tenant验证远端链路，生产企业试点待Phase2。
- **阶段验收 / 退出门槛**：P1全部任务通过；Local Pi离线/旧会话回归、真实远端消息/工具/审批/产物/取消/重连、服务重启与双tenant隔离测试有证据；D03与许可证门槛关闭。
- **回滚策略**：关闭remote feature flag，新会话回local-pi；remote session只读/继续remote，不自动转换；服务数据按兼容版本回滚，保留receipt和审计。

### M1.1 Milestone：本地兼容与远端基础

**Milestone验收**：P1-01–P1-04全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E1.1 Epic：Adapter与企业兼容网关

<a id="P1-01"></a>
##### Task P1-01：以LocalPiAdapter封装原会话运行时

- **目标 / PRD**：以LocalPiAdapter封装原会话运行时；[REQ-R01](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R01)、[REQ-R03](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R03)
- **依赖与顺序**：[P0-06](#P0-06)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：electron/main/agent/pi-session-runtime.ts；electron/main/agent/agent-host.ts；packages/core/openbuddy-session/src/index.ts。
- **Scope—新增建议**：electron/main/runtime/local-pi-adapter.ts；packages/runtime/openbuddy-runtime-adapter/src/adapter-registry.ts；行为测试默认新增`tests/enterprise/P1-01.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入Pi SDK事件/旧JSONL session；输出统一Session/RuntimeEvent/Capabilities，local scope与企业scope严格区分。
- **边界 / Cursor约束**：local-pi不是Local Hermes；fixture adapter不可成为生产默认。
- **Acceptance**：旧会话能加载并继续，无网能聊天；权限提问/工具/错误/取消映射稳定；不改Pi历史存储格式，不导入业务插件。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P1-01.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 1数据/外部副作用回滚限制，不撤销他人改动。

<a id="P1-02"></a>
##### Task P1-02：实现服务端Hermes兼容桥与实例路由

- **目标 / PRD**：实现服务端Hermes兼容桥与实例路由；[REQ-H02](PRD-Hermes-Remote-Runtime-Gateway-v1.0.md#REQ-H02)、[REQ-H03](PRD-Hermes-Remote-Runtime-Gateway-v1.0.md#REQ-H03)、[REQ-G03](Hermes-Gateway-API-Specification-v1.0.md#REQ-G03)
- **依赖与顺序**：[P0-04](#P0-04)、[P0-06](#P0-06)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：services/casdoor-resource-gateway/src/index.ts（身份接口参考，不迁入Agent执行）。
- **Scope—新增建议**：services/hermes-agent-gateway/src/{server,upstream-adapter,router,session-store}.ts；services/hermes-agent-gateway/migrations/；行为测试默认新增`tests/enterprise/P1-02.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入经过验证的OIDC identity/实例登记/目标API；输出上游Hermes调用及canonical receipt/session/event，服务端持久化路由。
- **边界 / Cursor约束**：新增Gateway必须有真正server实现；不复制Work启动本地进程伪装远端服务。
- **Acceptance**：创建会话→发送→获取状态对应实测上游；不支持能力false；同tenant可选两实例，跨tenant部署/会话拒绝；upstream URL只来自admin登记。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P1-02.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 1数据/外部副作用回滚限制，不撤销他人改动。

<a id="P1-03"></a>
##### Task P1-03：完成Gateway安全transport和RemoteHermesAdapter

- **目标 / PRD**：完成Gateway安全transport和RemoteHermesAdapter；[REQ-G02](Hermes-Gateway-API-Specification-v1.0.md#REQ-G02)、[REQ-R02](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R02)
- **依赖与顺序**：[P1-02](#P1-02)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：electron/preload/index.ts；electron/main/casdoor/casdoor-auth.ts。
- **Scope—新增建议**：packages/runtime/openbuddy-hermes-client/src/{client,transport,protocol}.ts；electron/main/runtime/remote-hermes-adapter.ts；行为测试默认新增`tests/enterprise/P1-03.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入endpointRef/credentialRef/可信scope；输出经过schema校验的API响应/错误与能力，token只在main。
- **边界 / Cursor约束**：不照搬Work全套Portal auth或runtime-client-ts源范围外包。
- **Acceptance**：握手major不兼容拒绝；401单飞刷新一次、403不重试、429遵Retry-After；renderer日志没有token；SDK portable部分不导入Electron。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P1-03.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 1数据/外部副作用回滚限制，不撤销他人改动。

<a id="P1-04"></a>
##### Task P1-04：实现持久事件、幂等与取消审批语义

- **目标 / PRD**：实现持久事件、幂等与取消审批语义；[REQ-G04](Hermes-Gateway-API-Specification-v1.0.md#REQ-G04)、[REQ-R04](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R04)
- **依赖与顺序**：[P1-02](#P1-02)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/runtime/openbuddy-storage/src/index.ts（桌面存储模式参考）。
- **Scope—新增建议**：services/hermes-agent-gateway/src/{event-log,idempotency,approval,cancellation}.ts；行为测试默认新增`tests/enterprise/P1-04.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入写命令key、上游事件、审批与取消；输出稳定seq/唯一receipt/单终态以及过期游标snapshot。
- **边界 / Cursor约束**：不能承诺跨外部系统exactly-once；上游恢复不可用要显式降级。
- **Acceptance**：重发同key同receipt，变body409；服务重启不重复run；取消与完成竞态一终态；审批过期/参数变更拒绝；未知外部写结果进入对账。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P1-04.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 1数据/外部副作用回滚限制，不撤销他人改动。

### M1.2 Milestone：可恢复Desktop远端体验

**Milestone验收**：P1-05–P1-08全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E1.2 Epic：投影、故障和运维

<a id="P1-05"></a>
##### Task P1-05：建立Session目录与流投影恢复

- **目标 / PRD**：建立Session目录与流投影恢复；[REQ-E03](PRD-Ekko-Runtime-Architecture-Integration-v1.0.md#REQ-E03)、[REQ-R03](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R03)、[REQ-R04](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R04)
- **依赖与顺序**：[P1-01](#P1-01)、[P1-03](#P1-03)、[P1-04](#P1-04)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：src/stores/sessions-store.ts；src/stores/session-store.ts；electron/main/pi-stream-transport.ts。
- **Scope—新增建议**：electron/main/runtime/session-coordinator.ts；packages/runtime/openbuddy-workspace/src/session-projection.ts；行为测试默认新增`tests/enterprise/P1-05.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入local/remote session引用和SSE事件；输出scope分区目录、投影/游标事务、断线snapshot恢复。
- **边界 / Cursor约束**：Workspace企业权威服务尚在Phase2；本任务只建立目录契约与恢复基础。
- **Acceptance**：重复seq不重复delta，缺序补流；410改走snapshot；切runtime只影响新session；旧Pi和remote引用不混存、不泄漏memory。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P1-05.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 1数据/外部副作用回滚限制，不撤销他人改动。

<a id="P1-06"></a>
##### Task P1-06：对接Shell的远端会话与审批交互

- **目标 / PRD**：对接Shell的远端会话与审批交互；[REQ-S02](PRD-OpenBuddy-Enterprise-Shell-改造-v1.0.md#REQ-S02)、[REQ-S04](PRD-OpenBuddy-Enterprise-Shell-改造-v1.0.md#REQ-S04)
- **依赖与顺序**：[P1-05](#P1-05)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：src/App.tsx；electron/preload/index.ts；packages/ui/openbuddy-ui-conversation/；packages/ui/openbuddy-ui-workbench/。
- **Scope—新增建议**：electron/main/runtime/runtime-coordinator.ts；packages/ui/openbuddy-ui-enterprise/src/runtime-panel.tsx；行为测试默认新增`tests/enterprise/P1-06.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入typed preload状态/commands；输出runtime选择、连接状态、流、cancel/approval UI与可访问快捷入口。
- **边界 / Cursor约束**：不迁移整个Work renderer，不把server密钥装进React context。
- **Acceptance**：accepted/running/waiting/completed可区分；取消后等终态；断线提示不伪成功；无UI直接fetch Hermes；局部UI AGENTS slot约定符合。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P1-06.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 1数据/外部副作用回滚限制，不撤销他人改动。

<a id="P1-07"></a>
##### Task P1-07：验证真实Hermes全链与错误注入

- **目标 / PRD**：验证真实Hermes全链与错误注入；[REQ-R05](Runtime-Adapter-SDK-Interface-Design-v1.0.md#REQ-R05)、[REQ-H05](PRD-Hermes-Remote-Runtime-Gateway-v1.0.md#REQ-H05)、[REQ-G05](Hermes-Gateway-API-Specification-v1.0.md#REQ-G05)
- **依赖与顺序**：[P1-06](#P1-06)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：已有pnpm test:electron入口；electron/main/observability/。
- **Scope—新增建议**：tests/enterprise/runtime-e2e.spec.ts；tests/enterprise/gateway-faults.test.ts；docs/architecture/runtime-acceptance.md；行为测试默认新增`tests/enterprise/P1-07.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入D03受控环境、2 tenants/2 instances、旧Pi golden session与网络故障；输出client/gateway/upstream同trace验收包。
- **边界 / Cursor约束**：测试不读取生产秘密，D03缺失时任务保持blocked并允许只跑fixture。
- **Acceptance**：真实远端消息/工具/审批/产物闭环，token撤销/断网/取消/上游500/重复event/服务重启测试通过；Pi离线兼容；fake与真实报告分开。
- **验证命令/方法**：已有命令：`pnpm test:electron`；待建：`pnpm test:runtime-e2e -- --profile=staging`、`pnpm exec vitest run tests/enterprise/gateway-faults.test.ts`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 1数据/外部副作用回滚限制，不撤销他人改动。

<a id="P1-08"></a>
##### Task P1-08：部署运维和remote开关回滚演练

- **目标 / PRD**：部署运维和remote开关回滚演练；[REQ-H04](PRD-Hermes-Remote-Runtime-Gateway-v1.0.md#REQ-H04)、[REQ-T04](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md#REQ-T04)、[REQ-T05](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md#REQ-T05)
- **依赖与顺序**：[P1-07](#P1-07)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：package.json；moon.yml；electron/main/observability/。
- **Scope—新增建议**：services/hermes-agent-gateway/deploy/；docs/architecture/runtime-runbook.md；scripts/enterprise/runtime-smoke.mjs；行为测试默认新增`tests/enterprise/P1-08.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入服务镜像/配置/secretRef/DB备份；输出受控部署、健康告警、版本矩阵、可复现恢复/回滚报告。
- **边界 / Cursor约束**：部署需用户/环境现有授权，文档任务不执行生产发布。
- **Acceptance**：readiness依赖DB/upstream健康；TLS/限流/secret轮换；恢复后receipt与seq一致；回滚到local flag不误转换remote session；D11试点容量报告记录硬件。
- **验证命令/方法**：待建：`pnpm verify:runtime-deployment -- --profile=staging`；已有：`pnpm build`、`pnpm enterprise:release-audit`（当前脚本不等于完整新服务审计）。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 1数据/外部副作用回滚限制，不撤销他人改动。

<a id="phase-2"></a>
## Phase 2：Enterprise Workspace

- **建议窗口 / 目标**：月3–4.5；把客户端目录提升为服务端权威企业Workspace，贯通Tenant/User/Agent/Session/Task/Artifact授权。
- **PRD与条款**：[REQ-W05](PRD-Enterprise-Workspace-v1.0.md#REQ-W05)、[REQ-004](PRD-SMC-COPILOT-ENTERPRISE-AGENT-OS-v1.0.md#REQ-004)、[REQ-S04](PRD-OpenBuddy-Enterprise-Shell-改造-v1.0.md#REQ-S04)
- **前置依赖**：Phase 1退出门槛通过；允许提前设计的条件见§2。
- **边界**：复用Casdoor和工具权限基础；不把登录角色标签等同资源授权，不把本地历史自动上传。
- **阶段验收 / 退出门槛**：P2-01至P2-07完成；D01身份角色与D02数据政策签字，九条越权路径/撤权/缓存/Artifact通过，服务恢复对账正确。
- **回滚策略**：冻结企业写，客户端退只读或local独立空间；执行expand-contract和备份恢复，不删除企业审计/远端任务。

### M2.1 Milestone：权威模型与授权服务

**Milestone验收**：P2-01–P2-04全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E2.1 Epic：实体、身份和资源授权

<a id="P2-01"></a>
##### Task P2-01：落地Workspace关系模型与迁移

- **目标 / PRD**：落地Workspace关系模型与迁移；[REQ-W02](PRD-Enterprise-Workspace-v1.0.md#REQ-W02)
- **依赖与顺序**：[P1-08](#P1-08)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/auth/openbuddy-casdoor/src/authorization.ts；packages/core/openbuddy-session/src/index.ts。
- **Scope—新增建议**：services/enterprise-workspace/src/models.ts；services/enterprise-workspace/migrations/；行为测试默认新增`tests/enterprise/P2-01.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入Tenant/Organization/Membership/Workspace/AgentInstance/session引用/task/artifact DTO；输出schema/FK/tenant索引/恢复脚本。
- **边界 / Cursor约束**：不能用Tenant→User→Agent单链替代多对多membership。
- **Acceptance**：user多tenant、org树无环、跨tenant FK拒绝；Task权威分离；旧Pi数据不迁移；D02归档/物理删除规则显式配置。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P2-01.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 2数据/外部副作用回滚限制，不撤销他人改动。

<a id="P2-02"></a>
##### Task P2-02：统一OIDC membership与服务授权

- **目标 / PRD**：统一OIDC membership与服务授权；[REQ-W04](PRD-Enterprise-Workspace-v1.0.md#REQ-W04)、[REQ-G02](Hermes-Gateway-API-Specification-v1.0.md#REQ-G02)
- **依赖与顺序**：[P2-01](#P2-01)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/auth/openbuddy-casdoor/src/authorization.ts；electron/main/casdoor/casdoor-auth.ts；packages/auth/openbuddy-permission/src/index.ts。
- **Scope—新增建议**：services/enterprise-workspace/src/{identity,authorization,revocation}.ts；行为测试默认新增`tests/enterprise/P2-02.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入验证token/active tenant/resource/action；输出allow/deny/ask+reason/policyVersion与脱敏audit。
- **边界 / Cursor约束**：身份层与Pi工具许可取交集，不替换成单一粗粒度isAdmin。
- **Acceptance**：伪造actor/tenant、退出tenant、过期token拒绝；管理员无默认读全数据；approval绑定参数；角色矩阵D01已映射。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P2-02.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 2数据/外部副作用回滚限制，不撤销他人改动。

<a id="P2-03"></a>
##### Task P2-03：实现Workspace成员和Agent目录API

- **目标 / PRD**：实现Workspace成员和Agent目录API；[REQ-W03](PRD-Enterprise-Workspace-v1.0.md#REQ-W03)
- **依赖与顺序**：[P2-02](#P2-02)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：services/casdoor-resource-gateway/（治理接口复用边界）。
- **Scope—新增建议**：services/enterprise-workspace/src/{workspace-api,membership-api,agent-api}.ts；packages/runtime/openbuddy-workspace/src/client.ts；行为测试默认新增`tests/enterprise/P2-03.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入scope、cursor、If-Match、Idempotency-Key；输出workspace/member/AgentInstance与revision，部署状态由健康证据驱动。
- **边界 / Cursor约束**：实例登记不等于已具备自动集群调度。
- **Acceptance**：member不能自升权；list/get权限一致；并发修改409不丢更新；Agent provisioning失败可解释且可幂等重试。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P2-03.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 2数据/外部副作用回滚限制，不撤销他人改动。

<a id="P2-04"></a>
##### Task P2-04：打通Task projection与Artifact权限

- **目标 / PRD**：打通Task projection与Artifact权限；[REQ-W02](PRD-Enterprise-Workspace-v1.0.md#REQ-W02)、[REQ-W03](PRD-Enterprise-Workspace-v1.0.md#REQ-W03)
- **依赖与顺序**：[P2-02](#P2-02)、[P1-04](#P1-04)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/runtime/openbuddy-storage/src/index.ts；src/stores/sessions-store.ts。
- **Scope—新增建议**：services/enterprise-workspace/src/{task-projection,artifact-api,event-consumer}.ts；行为测试默认新增`tests/enterprise/P2-04.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入Gateway Task/run事件与Artifact metadata；输出幂等目录projection、受权resolve引用与对账状态。
- **边界 / Cursor约束**：不将本地绝对路径作为remote Artifact引用，不新增第二套执行任务API。
- **Acceptance**：重复event不重复Task；Task业务字段不重写run终态；Artifact跨tenant/撤权拒绝；gateway snapshot重建后seq一致。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P2-04.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 2数据/外部副作用回滚限制，不撤销他人改动。

### M2.2 Milestone：企业Workspace闭环

**Milestone验收**：P2-05–P2-07全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E2.2 Epic：客户端、审计与隔离

<a id="P2-05"></a>
##### Task P2-05：接入企业Workspace Shell交互

- **目标 / PRD**：接入企业Workspace Shell交互；[REQ-S02](PRD-OpenBuddy-Enterprise-Shell-改造-v1.0.md#REQ-S02)、[REQ-W05](PRD-Enterprise-Workspace-v1.0.md#REQ-W05)
- **依赖与顺序**：[P2-03](#P2-03)、[P2-04](#P2-04)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：src/stores/session-store.ts；src/App.tsx；electron/preload/index.ts。
- **Scope—新增建议**：packages/ui/openbuddy-ui-enterprise/src/{workspace-navigation,membership-panel,task-panel}.tsx；行为测试默认新增`tests/enterprise/P2-05.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入typed workspace client/tenant状态；输出导航、成员/Agent/Task/Artifact视图及切scope生命周期。
- **边界 / Cursor约束**：不在renderer储存raw token，不静默把local历史导入企业空间。
- **Acceptance**：切tenant清缓存/撤旧流，活跃run明确留后台/取消；stale响应不得污染新scope；offline只读带时间；Slot-only注册。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P2-05.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 2数据/外部副作用回滚限制，不撤销他人改动。

<a id="P2-06"></a>
##### Task P2-06：补齐审计留存与资源生命周期

- **目标 / PRD**：补齐审计留存与资源生命周期；[REQ-W04](PRD-Enterprise-Workspace-v1.0.md#REQ-W04)、[REQ-W02](PRD-Enterprise-Workspace-v1.0.md#REQ-W02)、[REQ-T04](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md#REQ-T04)
- **依赖与顺序**：[P2-03](#P2-03)、[P2-04](#P2-04)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：electron/main/observability/；packages/core/openbuddy-logging-*/；packages/runtime/openbuddy-storage/。
- **Scope—新增建议**：services/enterprise-workspace/src/{audit,retention,reconciliation}.ts；docs/architecture/data-lifecycle.md；行为测试默认新增`tests/enterprise/P2-06.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入D02留存/删除/法定锁规则与授权事件；输出脱敏audit、归档→清理job和可恢复状态。
- **边界 / Cursor约束**：D02未决定不做不可逆物理删除，但明确阻止生产生命周期gate。
- **Acceptance**：无token/cookie/默认正文日志；审计读取独立授权；删除先阻断再清索引/cache；恢复和对账脚本可执行。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P2-06.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 2数据/外部副作用回滚限制，不撤销他人改动。

<a id="P2-07"></a>
##### Task P2-07：运行隔离矩阵和服务恢复试点

- **目标 / PRD**：运行隔离矩阵和服务恢复试点；[REQ-W05](PRD-Enterprise-Workspace-v1.0.md#REQ-W05)、[REQ-T05](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md#REQ-T05)
- **依赖与顺序**：[P2-05](#P2-05)、[P2-06](#P2-06)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：已有tenant:boundary-audit、enterprise:release-audit入口。
- **Scope—新增建议**：tests/enterprise/workspace-isolation.test.ts；docs/architecture/workspace-acceptance.md；services/enterprise-workspace/deploy/；行为测试默认新增`tests/enterprise/P2-07.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入2 tenants×2 users×2 workspaces，权限撤销、服务故障/DB恢复；输出九条路径测试与试点runbook。
- **边界 / Cursor约束**：原有audit脚本仅基线，必须新增Workspace/Gateway覆盖，不能只跑旧脚本作完成证据。
- **Acceptance**：列表/ID/搜索/缓存/事件/下载/工具/审批/成员管理跨scope零泄漏；撤权即时失效；恢复目录与Gateway对账；旧Pi回归。
- **验证命令/方法**：已有：`pnpm tenant:boundary-audit`、`pnpm enterprise:release-audit`；待建：`pnpm exec vitest run tests/enterprise/workspace-isolation.test.ts`、`pnpm verify:workspace-deployment -- --profile=staging`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 2数据/外部副作用回滚限制，不撤销他人改动。

<a id="phase-3"></a>
## Phase 3：Plugin Platform

- **建议窗口 / 目标**：月4.5–6；扩展现有host为有签名、权限、能力协商与隔离的企业插件平台。
- **PRD与条款**：[REQ-P05](PRD-Enterprise-Plugin-Framework-SDK-v1.0.md#REQ-P05)、[REQ-SDK04](Enterprise-Plugin-SDK开发规范-v1.0.md#REQ-SDK04)、[REQ-MK04](Enterprise-Plugin-Marketplace-Architecture-v1.0.md#REQ-MK04)
- **前置依赖**：Phase 2退出门槛通过；允许提前设计的条件见§2。
- **边界**：首期私有Registry+审核第三方；fixture验证平台，真实Knowledge留Phase4A。
- **阶段验收 / 退出门槛**：P3全部任务通过；第三方受限UI动态加载、backend容器隔离/不支持拒装、签名/生命周期/升级回滚/旧Pi扩展回归；D09内部审批主体明确。
- **回滚策略**：禁用新插件和新host profile，保留旧可信host；回滚bundle/grant/兼容storage snapshot，不能回退到不受限Node执行。

### M3.1 Milestone：企业SDK和执行隔离

**Milestone验收**：P3-01–P3-04全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E3.1 Epic：Manifest、broker与host能力

<a id="P3-01"></a>
##### Task P3-01：实现企业Manifest兼容和capability协商

- **目标 / PRD**：实现企业Manifest兼容和capability协商；[REQ-P02](PRD-Enterprise-Plugin-Framework-SDK-v1.0.md#REQ-P02)、[REQ-SDK01](Enterprise-Plugin-SDK开发规范-v1.0.md#REQ-SDK01)
- **依赖与顺序**：[P2-07](#P2-07)、[P0-05](#P0-05)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/runtime/openbuddy-plugin-host/src/plugin-manifest.ts；packages/runtime/openbuddy-plugin-sdk/src/index.ts。
- **Scope—新增建议**：packages/runtime/openbuddy-plugin-sdk/src/{enterprise-manifest,compatibility}.ts；行为测试默认新增`tests/enterprise/P3-01.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入旧Pi/renderer manifest与企业v1 manifest；输出validated package descriptor、dependency lock和host兼容结果。
- **边界 / Cursor约束**：扩展已有SDK，不创建平行plugin-sdk导致双规范。
- **Acceptance**：semver/重复ID/循环依赖/未知权限/不支持surface拒绝；旧serializer行为回归，legacy别名不能扩大grant。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P3-01.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 3数据/外部副作用回滚限制，不撤销他人改动。

<a id="P3-02"></a>
##### Task P3-02：实现统一Plugin broker权限和工具注册

- **目标 / PRD**：实现统一Plugin broker权限和工具注册；[REQ-SDK03](Enterprise-Plugin-SDK开发规范-v1.0.md#REQ-SDK03)、[REQ-P03](PRD-Enterprise-Plugin-Framework-SDK-v1.0.md#REQ-P03)
- **依赖与顺序**：[P3-01](#P3-01)、[P2-02](#P2-02)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/runtime/openbuddy-plugin-host/src/plugin-security.ts；packages/capability/openbuddy-mcp-client/。
- **Scope—新增建议**：packages/runtime/openbuddy-plugin-host/src/{enterprise-broker,tool-registration}.ts；行为测试默认新增`tests/enterprise/P3-02.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入plugin activation/API/tool/MCP请求与grant；输出受权调用、Disposable、标准RuntimeError/audit。
- **边界 / Cursor约束**：不可把manifest权限列表当作已授予，不能绕Gateway自建Hermes连接。
- **Acceptance**：resource ACL∩grant∩tool策略执行时复核；伪scope/token索取/任意MCP URL拒绝；撤销注册/取消timeout无泄漏。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P3-02.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 3数据/外部副作用回滚限制，不撤销他人改动。

<a id="P3-03"></a>
##### Task P3-03：构建第三方UI受限surface

- **目标 / PRD**：构建第三方UI受限surface；[REQ-SDK02](Enterprise-Plugin-SDK开发规范-v1.0.md#REQ-SDK02)、[REQ-P03](PRD-Enterprise-Plugin-Framework-SDK-v1.0.md#REQ-P03)
- **依赖与顺序**：[P3-02](#P3-02)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/ui/AGENTS.md；packages/runtime/openbuddy-plugin-host/src/index.ts；electron/preload/index.ts。
- **Scope—新增建议**：packages/runtime/openbuddy-plugin-host/src/isolated-ui-host.ts；packages/ui/openbuddy-ui-enterprise/src/plugin-surface.tsx；行为测试默认新增`tests/enterprise/P3-03.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入签名plugin viewRef与host grant；输出受限iframe/surface、schema消息桥、route/menu/panel注册。
- **边界 / Cursor约束**：不把第三方JS直接import进可信React树；界面权限与后台权限均须校验。
- **Acceptance**：第三方不能访问Node/parent secrets/任意IPC；scope变化销毁旧surface；禁用无菜单/订阅残留；trusted slot旧路径不回归。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P3-03.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 3数据/外部副作用回滚限制，不撤销他人改动。

<a id="P3-04"></a>
##### Task P3-04：建设可协商的远端容器backend执行

- **目标 / PRD**：建设可协商的远端容器backend执行；[REQ-P03](PRD-Enterprise-Plugin-Framework-SDK-v1.0.md#REQ-P03)、[REQ-T04](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md#REQ-T04)
- **依赖与顺序**：[P3-02](#P3-02)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/runtime/openbuddy-plugin-host/src/index.ts（接入生命周期）。
- **Scope—新增建议**：services/enterprise-plugin-worker/src/{runner,broker,limits}.ts；services/enterprise-plugin-worker/deploy/；行为测试默认新增`tests/enterprise/P3-04.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入verified bundle和scope-bound invocation；输出容器内结果/资源计量/标准错误，由broker代办授权服务访问。
- **边界 / Cursor约束**：不能用worker_threads/Node VM替代安全隔离，不能降级到main任意执行。
- **Acceptance**：非root只读rootfs、无默认网/host fs/secret；超时/CPU/内存限额；恶意fixture越界被拒绝；无此capability拒装backend。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P3-04.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 3数据/外部副作用回滚限制，不撤销他人改动。

### M3.2 Milestone：私有分发与生命周期

**Milestone验收**：P3-05–P3-07全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E3.2 Epic：Registry、回滚与第三方验收

<a id="P3-05"></a>
##### Task P3-05：实现私有Registry和签名批准链

- **目标 / PRD**：实现私有Registry和签名批准链；[REQ-MK02](Enterprise-Plugin-Marketplace-Architecture-v1.0.md#REQ-MK02)、[REQ-MK04](Enterprise-Plugin-Marketplace-Architecture-v1.0.md#REQ-MK04)
- **依赖与顺序**：[P3-01](#P3-01)、[P2-02](#P2-02)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：electron/main/agent/marketplace/（现有市场桥接复用点）。
- **Scope—新增建议**：services/enterprise-plugin-registry/src/{catalog,releases,signatures,approvals}.ts；services/enterprise-plugin-registry/deploy/；行为测试默认新增`tests/enterprise/P3-05.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入企业发布者包、Ed25519 trust root、审批决策；输出immutable release、tenant catalog和install receipt。
- **边界 / Cursor约束**：不建设公开付费Marketplace；上传和批准主体D09最终映射。
- **Acceptance**：篡改hash/key吊销/跨tenant版本/未批准包拒绝；秘密不进bundle；zip traversal/炸弹拒绝；权限新增重新批准。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P3-05.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 3数据/外部副作用回滚限制，不撤销他人改动。

<a id="P3-06"></a>
##### Task P3-06：实现安装启停升级回滚和数据策略

- **目标 / PRD**：实现安装启停升级回滚和数据策略；[REQ-P04](PRD-Enterprise-Plugin-Framework-SDK-v1.0.md#REQ-P04)、[REQ-MK03](Enterprise-Plugin-Marketplace-Architecture-v1.0.md#REQ-MK03)
- **依赖与顺序**：[P3-03](#P3-03)、[P3-04](#P3-04)、[P3-05](#P3-05)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/runtime/openbuddy-plugin-host/src/index.ts；electron/main/agent/marketplace/。
- **Scope—新增建议**：packages/runtime/openbuddy-plugin-host/src/{enterprise-lifecycle,installation-store}.ts；行为测试默认新增`tests/enterprise/P3-06.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入已验证release/grant/安装动作；输出installed/enabled/disabled state、原子切换与可恢复snapshot。
- **边界 / Cursor约束**：旧版本不得重新获得已撤销权限；回滚也要当前policy重新校验。
- **Acceptance**：apply失败完整dispose，升级失败旧版可用，禁用撤route/tool/MCP，卸载不默认删业务；不兼容schema降级明确阻止。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P3-06.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 3数据/外部副作用回滚限制，不撤销他人改动。

<a id="P3-07"></a>
##### Task P3-07：第三方fixture与旧扩展回归验收

- **目标 / PRD**：第三方fixture与旧扩展回归验收；[REQ-P05](PRD-Enterprise-Plugin-Framework-SDK-v1.0.md#REQ-P05)、[REQ-SDK04](Enterprise-Plugin-SDK开发规范-v1.0.md#REQ-SDK04)
- **依赖与顺序**：[P3-06](#P3-06)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：src/lib/__tests__/plugins-marketplace.test.ts；packages/runtime/openbuddy-plugin-host/。
- **Scope—新增建议**：tests/enterprise/plugin-fixtures/；tests/enterprise/plugin-isolation.test.ts；docs/architecture/plugin-acceptance.md；行为测试默认新增`tests/enterprise/P3-07.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入可信旧插件、受限UI第三方、容器backend与恶意包；输出package→sign→install→load→upgrade→rollback→uninstall证据。
- **边界 / Cursor约束**：不依赖真实Knowledge后端完成本阶段；mock示例不冒充业务插件交付。
- **Acceptance**：实际第三方面板可加载，恶意网络/fs/IPC与跨tenant请求被拒绝；无backend host明确拒装；旧Pi serializer和slot插件继续工作。
- **验证命令/方法**：待建：`pnpm test:plugin-e2e -- --profile=staging`、`pnpm exec vitest run tests/enterprise/plugin-isolation.test.ts`；已有：`pnpm test`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 3数据/外部副作用回滚限制，不撤销他人改动。

<a id="phase-4A"></a>
## Phase 4A：Knowledge → FilePreview业务闭环

- **建议窗口 / 目标**：月6–7；从限定本地Work源选择迁移Knowledge/Preview，形成真实授权知识检索与公共预览。
- **PRD与条款**：[REQ-K05](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K05)、[REQ-005](PRD-SMC-COPILOT-ENTERPRISE-AGENT-OS-v1.0.md#REQ-005)
- **前置依赖**：Phase 3退出门槛通过；允许提前设计的条件见§2。
- **边界**：Knowledge业务留plugin，公共Preview只做授权文件呈现；保留OpenBuddy本地provider。
- **阶段验收 / 退出门槛**：P4A全部完成；真实Knowledge服务D04满足ACL/版本/删除，六格式预览和RAG引用通过；源hash/license/React兼容和旧Pi本地KB回归完整。
- **回滚策略**：禁用企业Knowledge与新preview provider，回原本地能力；服务端停止摄取而非删数据；不兼容索引保留旧版本和重建方案。

### M4A.1 Milestone：Knowledge插件与来源适配

**Milestone验收**：P4A-01–P4A-03全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E4A.1 Epic：真实后端、授权与摄取

<a id="P4A-01"></a>
##### Task P4A-01：锁定迁移文件和Knowledge后端契约

- **目标 / PRD**：锁定迁移文件和Knowledge后端契约；[REQ-K01](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K01)、[REQ-K02](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K02)
- **依赖与顺序**：[P3-07](#P3-07)、[P0-01](#P0-01)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：源apps/work/components/file-preview/；源apps/work/src/main/knowledge/knowledge-http-provider.ts；knowledge-service-url.ts（同源目录）。
- **Scope—新增建议**：docs/architecture/knowledge-migration-map.json；plugins/knowledge/src/backend-contract.ts；行为测试默认新增`tests/enterprise/P4A-01.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入源commit/hash和D04测试服务契约；输出逐文件source→target/依赖/license映射及NoDeskClaw→统一DTO适配规则。
- **边界 / Cursor约束**：只读本地apps/work；待确认大小/保留等业务参数不写成既定政策。
- **Acceptance**：确定实际HTTP provider路径，明确placeholder remote facade不迁入；React19依赖逐项适配React18；真实后端ACL/版本/删除探针通过。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4A-01.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4A数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4A-02"></a>
##### Task P4A-02：建立Knowledge插件与授权provider

- **目标 / PRD**：建立Knowledge插件与授权provider；[REQ-K02](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K02)、[REQ-SDK03](Enterprise-Plugin-SDK开发规范-v1.0.md#REQ-SDK03)
- **依赖与顺序**：[P4A-01](#P4A-01)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：src/lib/files/knowledge-base-runtime.ts；src/lib/files/electron-kb-reader.ts。
- **Scope—新增建议**：plugins/knowledge/{manifest.json,src/index.ts,src/provider.ts,src/authorization.ts}；行为测试默认新增`tests/enterprise/P4A-02.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入host scope/grant和Knowledge HTTP配置；输出list/get/search/retrieve等DTO及注册面板，local/enterprise provider明确区分。
- **边界 / Cursor约束**：不能将“有知识UI”作为服务端索引/权限已完成证据。
- **Acceptance**：两tenant同名文档不串；服务端ACL执行，token/endpoint不泄露UI；plugin动态启停撤销注册；后端不可用明确失败；迁入组件在目标React18和现有ReactDOM类型组合下通过JSX/组件签名typecheck，不默认采用源React19类型。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4A-02.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4A数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4A-03"></a>
##### Task P4A-03：实现摄取任务、版本和删除对账

- **目标 / PRD**：实现摄取任务、版本和删除对账；[REQ-K04](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K04)、[REQ-W02](PRD-Enterprise-Workspace-v1.0.md#REQ-W02)
- **依赖与顺序**：[P4A-02](#P4A-02)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：源apps/work/src/shared/knowledge/；源apps/work/src/main/knowledge/（候选逐文件由P4A-01锁定）。
- **Scope—新增建议**：plugins/knowledge/src/{ingestion,document-lifecycle,reconciliation}.ts；行为测试默认新增`tests/enterprise/P4A-03.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入fileHandle/hash/ACL和幂等key；输出Document/IngestionJob状态，版本索引及删除清理receipt。
- **边界 / Cursor约束**：上传大小/扫描/留存D04确认；Source的SQLite/fs由宿主broker替换。
- **Acceptance**：重复上传不重复job；失败可重试并保留版本；撤权立即阻断检索，删除完成后blob/index/cache均对账；不能无限poll。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4A-03.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4A数据/外部副作用回滚限制，不撤销他人改动。

### M4A.2 Milestone：公共Preview与RAG闭环

**Milestone验收**：P4A-04–P4A-07全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E4A.2 Epic：安全呈现和可引用知识

<a id="P4A-04"></a>
##### Task P4A-04：抽取公共Preview契约与三类provider

- **目标 / PRD**：抽取公共Preview契约与三类provider；[REQ-K03](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K03)
- **依赖与顺序**：[P4A-03](#P4A-03)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/ui/openbuddy-ui-workbench/src/FilePreview.tsx；源apps/work/components/file-preview/types.ts；providers/（同源组件目录）。
- **Scope—新增建议**：packages/capability/openbuddy-file-preview/src/{types,resolve,providers}.ts；行为测试默认新增`tests/enterprise/P4A-04.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入artifactId或localHandle及sourceVersion；输出scope绑定previewHandle/bytes/range/expiry与release操作。
- **边界 / Cursor约束**：先Knowledge授权文档能力后Preview实现；公共service不包含知识业务对象。
- **Acceptance**：local/http/knowledge provider分权，跨tenant/撤权/过期handle拒绝；无raw本机路径远传；src全局hermesAPI替换显式host接口。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4A-04.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4A数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4A-05"></a>
##### Task P4A-05：迁入六格式预览与内容安全

- **目标 / PRD**：迁入六格式预览与内容安全；[REQ-K03](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K03)
- **依赖与顺序**：[P4A-04](#P4A-04)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/ui/openbuddy-ui-workbench/src/FilePreview.tsx；源apps/work/components/file-preview/adapters/open-file-viewer.tsx。
- **Scope—新增建议**：packages/capability/openbuddy-file-preview/src/content-policy.ts；tests/enterprise/preview-fixtures/；行为测试默认新增`tests/enterprise/P4A-05.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入已授权bytes与MIME；输出Markdown/PDF/DOCX/HTML/TXT/Image只读视图和损坏/超限降级。
- **边界 / Cursor约束**：不覆盖OpenBuddy既有预览技术栈，移植收益不足则保留当前renderer并适配统一provider。
- **Acceptance**：每格式golden fixture可预览；HTML/Markdown脚本/外链净化，MIME伪装/URL重定向SSRF/path逃逸拒绝；PDF.js等许可与bundle验证。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4A-05.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4A数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4A-06"></a>
##### Task P4A-06：注册Knowledge tools与可追溯RAG

- **目标 / PRD**：注册Knowledge tools与可追溯RAG；[REQ-K04](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K04)、[REQ-SDK03](Enterprise-Plugin-SDK开发规范-v1.0.md#REQ-SDK03)
- **依赖与顺序**：[P4A-03](#P4A-03)、[P4A-05](#P4A-05)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/capability/openbuddy-mcp-client/；src/lib/files/knowledge-base-runtime.ts。
- **Scope—新增建议**：plugins/knowledge/src/{tools,answer,citations}.ts；行为测试默认新增`tests/enterprise/P4A-06.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入knowledge.search/retrieve/answer参数与可信scope；输出答案/Citation/sourceVersion及preview Artifact引用。
- **边界 / Cursor约束**：不把模型常识回答伪标企业知识，不把MCP安装等同授权。
- **Acceptance**：答案引用当次授权可见版本；删文档/撤权后工具不可返回；无证据拒答或明确无支持；恶意文档不能改变tool grant。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4A-06.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4A数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4A-07"></a>
##### Task P4A-07：迁移一致性与真实知识闭环验收

- **目标 / PRD**：迁移一致性与真实知识闭环验收；[REQ-K05](PRD-Knowledge-FilePreview-Plugin-Migration-v1.0.md#REQ-K05)
- **依赖与顺序**：[P4A-06](#P4A-06)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：src/lib/__tests__/knowledge-base-runtime.test.ts；src/lib/__tests__/knowledge-base.test.ts。
- **Scope—新增建议**：tests/enterprise/knowledge-e2e.spec.ts；docs/architecture/knowledge-acceptance.md；行为测试默认新增`tests/enterprise/P4A-07.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入源/目标golden fixtures和D04测试后端；输出上传→摄取→查询→RAG→六格式预览→撤权/删除的追踪报告。
- **边界 / Cursor约束**：mock只能作开发验证，后端真实闭环未完成则4A不得退出。
- **Acceptance**：UI/工具权限结果一致，两租户隔离、断网/损坏文件/重复上传通过；源许可/hash mapping齐全；旧本地KB/Pi兼容。
- **验证命令/方法**：待建：`pnpm test:knowledge-e2e -- --profile=staging`；已有：`pnpm test`、`pnpm test:electron`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4A数据/外部副作用回滚限制，不撤销他人改动。

<a id="phase-4B"></a>
## Phase 4B：Browser Agent

- **建议窗口 / 目标**：月7–9；交付独立浏览器上下文、网页理解和受控click/fill，连接Hermes工具链。
- **PRD与条款**：[REQ-B05](PRD-Browser-Agent-Platform-v1.0.md#REQ-B05)、[REQ-BT04](Browser-Agent技术设计-Chromium-CDP-Playwright-Hermes-MCP-v1.0.md#REQ-BT04)
- **前置依赖**：Phase 4A退出门槛通过；允许提前设计的条件见§2。
- **边界**：BrowserPreview保持只读预览；CRM录入此阶段只生成草稿，写入依4C。
- **阶段验收 / 退出门槛**：P4B全部完成，D05站点/凭据政策明确；进程/域/上下文/审批/提示注入/断线unknown路径可测，受控真实站点闭环及打包通过。
- **回滚策略**：禁用browser tool，销毁executor/profile并保留审计；已发生网页副作用需对账/补偿，不能自动重放。

### M4B.1 Milestone：Browser Runtime和只读理解

**Milestone验收**：P4B-01–P4B-03全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E4B.1 Epic：隔离进程、DOM和Artifacts

<a id="P4B-01"></a>
##### Task P4B-01：建设生产Browser Runtime和隔离profile

- **目标 / PRD**：建设生产Browser Runtime和隔离profile；[REQ-B01](PRD-Browser-Agent-Platform-v1.0.md#REQ-B01)、[REQ-BT02](Browser-Agent技术设计-Chromium-CDP-Playwright-Hermes-MCP-v1.0.md#REQ-BT02)
- **依赖与顺序**：[P4A-07](#P4A-07)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/ui/openbuddy-ui-workbench/src/BrowserPreview.tsx；package.json（现有Playwright为开发依赖）。
- **Scope—新增建议**：electron/main/browser/{process-manager,context-store}.ts；plugins/browser/manifest.json；行为测试默认新增`tests/enterprise/P4B-01.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入允许的Chromium/Playwright版本和scope；输出受限CDP连接、独立context/page、生命周期和健康状态。
- **边界 / Cursor约束**：不能直接启用Work CDP调试端口替代本模块。
- **Acceptance**：打包包含匹配生产浏览器且许可证齐；CDP不暴露公网；跨tenant profile隔离；崩溃/退出无孤儿进程，原iframe预览继续工作。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4B-01.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4B数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4B-02"></a>
##### Task P4B-02：实现Domain Policy和受控导航

- **目标 / PRD**：实现Domain Policy和受控导航；[REQ-B04](PRD-Browser-Agent-Platform-v1.0.md#REQ-B04)
- **依赖与顺序**：[P4B-01](#P4B-01)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：src/lib/platform/browser-preview.ts（现有URL检查参考）。
- **Scope—新增建议**：electron/main/browser/{domain-policy,navigation,download-policy}.ts；行为测试默认新增`tests/enterprise/P4B-02.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入初始URL/重定向/新窗口/下载与D05allowlist；输出allow/deny以及audited navigation结果。
- **边界 / Cursor约束**：不仅校验初始URL，不把hostname字符串过滤当完整SSRF保护。
- **Acceptance**：DNS/redirect/loopback/内网/metadata/file/javascript导航拒绝，显式企业私域走授权代理；下载Artifact按ACL保存。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4B-02.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4B数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4B-03"></a>
##### Task P4B-03：提供DOM读取截图与页面摘要

- **目标 / PRD**：提供DOM读取截图与页面摘要；[REQ-B02](PRD-Browser-Agent-Platform-v1.0.md#REQ-B02)、[REQ-BT03](Browser-Agent技术设计-Chromium-CDP-Playwright-Hermes-MCP-v1.0.md#REQ-BT03)
- **依赖与顺序**：[P4B-02](#P4B-02)、[P4A-04](#P4A-04)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/ui/openbuddy-ui-workbench/（页面呈现接入）。
- **Scope—新增建议**：plugins/browser/src/{read-tools,dom-context,snapshot}.ts；行为测试默认新增`tests/enterprise/P4B-03.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入pageId/revision；输出裁剪脱敏text、elements/elementRef、Artifact截图和可引用摘要。
- **边界 / Cursor约束**：无任意evaluate/JS执行工具；read与snapshot也需要权限。
- **Acceptance**：秘密字段不进入prompt；导航后revision变化，stale元素不能复用；引用来自当前页；页面恶意指令不能提升tool权限。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4B-03.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4B数据/外部副作用回滚限制，不撤销他人改动。

### M4B.2 Milestone：受控写操作和远端执行

**Milestone验收**：P4B-04–P4B-06全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E4B.2 Epic：审批、broker与安全验收

<a id="P4B-04"></a>
##### Task P4B-04：实现click/fill审批与结果对账

- **目标 / PRD**：实现click/fill审批与结果对账；[REQ-B04](PRD-Browser-Agent-Platform-v1.0.md#REQ-B04)、[REQ-BT04](Browser-Agent技术设计-Chromium-CDP-Playwright-Hermes-MCP-v1.0.md#REQ-BT04)
- **依赖与顺序**：[P4B-03](#P4B-03)、[P3-02](#P3-02)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/auth/openbuddy-permission/src/index.ts（复用许可语义）。
- **Scope—新增建议**：plugins/browser/src/{action-tools,approval,action-receipts}.ts；行为测试默认新增`tests/enterprise/P4B-04.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入elementRef/revision/valueRef/actionDigest/approval；输出authorized→executing→success/failed/unknown及新revision。
- **边界 / Cursor约束**：Browser不能绕开CRM批准，不能将批准一次变成永久授权。
- **Acceptance**：拒绝无副作用；参数/页面变更审批失效；stale读后重提案；网络未知结果不重放；敏感值不出vault/人工输入。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4B-04.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4B数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4B-05"></a>
##### Task P4B-05：连接Hermes到桌面browser executor

- **目标 / PRD**：连接Hermes到桌面browser executor；[REQ-BT01](Browser-Agent技术设计-Chromium-CDP-Playwright-Hermes-MCP-v1.0.md#REQ-BT01)、[REQ-B02](PRD-Browser-Agent-Platform-v1.0.md#REQ-B02)
- **依赖与顺序**：[P4B-04](#P4B-04)、[P1-04](#P1-04)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/capability/openbuddy-mcp-client/；electron/preload/index.ts。
- **Scope—新增建议**：electron/main/browser/executor.ts；services/hermes-agent-gateway/src/browser-executor-broker.ts；plugins/browser/src/mcp.ts；行为测试默认新增`tests/enterprise/P4B-05.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入Gateway scope-bound invocation/expiry；输出桌面认证ack/result、幂等receipt及Gateway tool.result。
- **边界 / Cursor约束**：Gateway不能直连CDP，桌面未上线不能假装浏览器调用成功。
- **Acceptance**：device/tenant绑定，伪造命令拒绝；断线executor unavailable；重复invocation不二次写；MCP与普通tool相同授权和schema。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4B-05.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4B数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4B-06"></a>
##### Task P4B-06：Browser安全、打包和真实站点验收

- **目标 / PRD**：Browser安全、打包和真实站点验收；[REQ-B05](PRD-Browser-Agent-Platform-v1.0.md#REQ-B05)、[REQ-BT04](Browser-Agent技术设计-Chromium-CDP-Playwright-Hermes-MCP-v1.0.md#REQ-BT04)
- **依赖与顺序**：[P4B-05](#P4B-05)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：已有test:electron/build入口。
- **Scope—新增建议**：tests/enterprise/browser-agent.spec.ts；tests/enterprise/browser-security-fixtures/；docs/architecture/browser-acceptance.md；行为测试默认新增`tests/enterprise/P4B-06.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入fixture恶意网站、D05真实测试站点、两tenant；输出读取/摘要/截图/批准click-fill与进程资源/性能证据。
- **边界 / Cursor约束**：支付/自动采购/无批准CRM写入不作为本阶段交付。
- **Acceptance**：越域/提示注入/凭据串用/假approval/超时/cancel竞态拒绝；Cookie清理，Windows打包离线启动；销售/采购调研草稿可生成。
- **验证命令/方法**：待建：`pnpm test:browser-agent -- --profile=staging`；已有：`pnpm build`、`pnpm test:electron`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4B数据/外部副作用回滚限制，不撤销他人改动。

<a id="phase-4C"></a>
## Phase 4C：CRM Plugin

- **建议窗口 / 目标**：月9–10；把调研来源转成可审核客户草稿，并通过真实CRM连接器受控写入。
- **PRD与条款**：[REQ-C04](PRD-CRM-Plugin-v1.0.md#REQ-C04)
- **前置依赖**：Phase 4B退出门槛通过；允许提前设计的条件见§2。
- **边界**：Customer查询/草稿/批准commit为MVP；Quotation/Order/Inventory明确保留接口与后续gate。
- **阶段验收 / 退出门槛**：P4C全部完成；D06数据源/字段/去重/审批/PII确认，真实测试CRM查询→草稿→批准→receipt闭环，幂等/并发/未知结果可对账。
- **回滚策略**：关闭write grant保留授权read；已写入客户需业务补偿，保留所有receipt/审计。

### M4C.1 Milestone：CRM连接与客户草稿

**Milestone验收**：P4C-01–P4C-03全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E4C.1 Epic：授权数据与来源提案

<a id="P4C-01"></a>
##### Task P4C-01：确认CRM业务映射和连接器边界

- **目标 / PRD**：确认CRM业务映射和连接器边界；[REQ-C01](PRD-CRM-Plugin-v1.0.md#REQ-C01)、[REQ-C02](PRD-CRM-Plugin-v1.0.md#REQ-C02)
- **依赖与顺序**：[P4B-06](#P4B-06)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：无已核验CRM实现；复用packages/runtime/openbuddy-plugin-sdk/。
- **Scope—新增建议**：plugins/crm/src/{schema,connector}.ts；docs/architecture/crm-field-map.json；行为测试默认新增`tests/enterprise/P4C-01.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入D06真实系统/字段/去重/审批规则；输出Customer/Draft schema、connector契约和server凭据引用。
- **边界 / Cursor约束**：D06未定只做fixture，不能把模拟CRM当上线目标。
- **Acceptance**：不臆造必填字段、价格或审批角色；外部ID与tenant绑定；数据权威/同步方向明确，API/Browser补充路径均经统一策略。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4C-01.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4C数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4C-02"></a>
##### Task P4C-02：实现授权客户查询和受限插件UI

- **目标 / PRD**：实现授权客户查询和受限插件UI；[REQ-C02](PRD-CRM-Plugin-v1.0.md#REQ-C02)、[REQ-C03](PRD-CRM-Plugin-v1.0.md#REQ-C03)
- **依赖与顺序**：[P4C-01](#P4C-01)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/runtime/openbuddy-plugin-host/；packages/ui/openbuddy-ui-enterprise/（前期新增）。
- **Scope—新增建议**：plugins/crm/{manifest.json,src/read-tools.ts,src/customer-panel.tsx}；行为测试默认新增`tests/enterprise/P4C-02.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入crm.customer.search/get与scope；输出脱敏Customer列表/详情和cursor/revision。
- **边界 / Cursor约束**：UI隐藏不能代替后端授权，禁任意query字符串注入。
- **Acceptance**：row/field ACL在connector端执行，两tenant同externalId不交叉；数据源错误可解释；只读凭据不能写入。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4C-02.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4C数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4C-03"></a>
##### Task P4C-03：接入Browser/Knowledge来源草稿

- **目标 / PRD**：接入Browser/Knowledge来源草稿；[REQ-C02](PRD-CRM-Plugin-v1.0.md#REQ-C02)、[REQ-B03](PRD-Browser-Agent-Platform-v1.0.md#REQ-B03)
- **依赖与顺序**：[P4C-02](#P4C-02)、[P4A-06](#P4A-06)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：plugins/browser/（前期新增）；plugins/knowledge/（前期新增）。
- **Scope—新增建议**：plugins/crm/src/{proposals,diff-review}.ts；行为测试默认新增`tests/enterprise/P4C-03.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入授权网页/知识Citation和拟更新fields；输出Draft/sourceVersion/diff供用户复核。
- **边界 / Cursor约束**：草稿不是外部客户已更新，UI须分清状态。
- **Acceptance**：来源点击可验证，撤权来源不泄露；模型不能直接commit；D06缺字段提示待补，保存草稿使用revision防覆盖。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4C-03.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4C数据/外部副作用回滚限制，不撤销他人改动。

### M4C.2 Milestone：批准写入与业务验收

**Milestone验收**：P4C-04–P4C-05全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E4C.2 Epic：幂等提交和失败恢复

<a id="P4C-04"></a>
##### Task P4C-04：实现批准commit、幂等和outbox对账

- **目标 / PRD**：实现批准commit、幂等和outbox对账；[REQ-C03](PRD-CRM-Plugin-v1.0.md#REQ-C03)
- **依赖与顺序**：[P4C-03](#P4C-03)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/webhook-outbox/（可靠投递参考）；services/enterprise-workspace/（前期新增）。
- **Scope—新增建议**：plugins/crm/src/{commit,outbox,reconciliation}.ts；行为测试默认新增`tests/enterprise/P4C-04.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入draftId/revision/approvalId/idempotencyKey；输出真实Customer revision/receiptId或conflict/unknown。
- **边界 / Cursor约束**：不把浏览器click回报成功等同CRM数据已确认写入。
- **Acceptance**：批准绑定字段摘要，重复提交仅一业务结果；人工并发修改409；timeout不盲重试；补偿/对账留审计。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4C-04.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4C数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4C-05"></a>
##### Task P4C-05：CRM端到端和后续对象范围验收

- **目标 / PRD**：CRM端到端和后续对象范围验收；[REQ-C04](PRD-CRM-Plugin-v1.0.md#REQ-C04)、[REQ-C03](PRD-CRM-Plugin-v1.0.md#REQ-C03)
- **依赖与顺序**：[P4C-04](#P4C-04)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：已有企业隔离/插件测试基础。
- **Scope—新增建议**：tests/enterprise/crm-e2e.spec.ts；docs/architecture/crm-acceptance.md；docs/architecture/crm-business-backlog.md；行为测试默认新增`tests/enterprise/P4C-05.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入D06测试CRM、同名客户/重复提交/冲突fixture；输出闭环报告与Quotation/Order/Inventory业务gate清单。
- **边界 / Cursor约束**：不通过静默删除报价/订单/库存原需求获得完成状态。
- **Acceptance**：真实读→草稿→拒绝无写/批准有receipt通过；越权/PII/unknown回归；报价写转4E，订单库存写待业务流程批准，有明确保留项。
- **验证命令/方法**：待建：`pnpm test:crm-e2e -- --profile=staging`；已有：`pnpm tenant:boundary-audit`（需扩展新对象覆盖）。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4C数据/外部副作用回滚限制，不撤销他人改动。

<a id="phase-4D"></a>
## Phase 4D：BI Plugin

- **建议窗口 / 目标**：月10–11；交付授权指标/只读数据查询、图表和有来源的Agent解释。
- **PRD与条款**：[REQ-I04](PRD-BI-Plugin-v1.0.md#REQ-I04)
- **前置依赖**：Phase 4C退出门槛通过；允许提前设计的条件见§2。
- **边界**：预定义数据集与参数化查询；不开放任意SQL或数据库管理。
- **阶段验收 / 退出门槛**：P4D全部完成；D07指标口径、真实数据源、导出策略确认，golden totals/行列权限/缓存隔离与真实查询闭环通过。
- **回滚策略**：停用connector/新查询，保留按当前ACL可见的历史Artifact；撤权失效缓存，不能以旧缓存绕授权。

### M4D.1 Milestone：指标契约和查询服务

**Milestone验收**：P4D-01–P4D-02全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E4D.1 Epic：语义、连接器与访问策略

<a id="P4D-01"></a>
##### Task P4D-01：定义数据集指标语义与连接器

- **目标 / PRD**：定义数据集指标语义与连接器；[REQ-I01](PRD-BI-Plugin-v1.0.md#REQ-I01)、[REQ-I02](PRD-BI-Plugin-v1.0.md#REQ-I02)
- **依赖与顺序**：[P4C-05](#P4C-05)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：无已核验BI业务实现；复用CRM外部对象ID契约。
- **Scope—新增建议**：plugins/bi/src/{semantic-model,connector}.ts；docs/architecture/bi-metric-catalog.json；行为测试默认新增`tests/enterprise/P4D-01.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入D07来源/时区/币种/指标公式；输出versioned Dataset/Metric/Query/Result schema与只读credentialRef。
- **边界 / Cursor约束**：fixture语义模型不代表已有生产数仓/数据源。
- **Acceptance**：每指标可追溯批准口径，时间/单位/聚合明确，未定不填臆造公式；golden数据及预期结果先建立。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4D-01.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4D数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4D-02"></a>
##### Task P4D-02：实现策略查询、限额和隔离缓存

- **目标 / PRD**：实现策略查询、限额和隔离缓存；[REQ-I03](PRD-BI-Plugin-v1.0.md#REQ-I03)
- **依赖与顺序**：[P4D-01](#P4D-01)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：services/enterprise-workspace/与SDK broker（前期新增）。
- **Scope—新增建议**：plugins/bi/src/{query-engine,policy,query-cache}.ts；行为测试默认新增`tests/enterprise/P4D-02.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入allowlist Query与scope；输出授权row/column结果、lineage/freshness/queryId或限额错误。
- **边界 / Cursor约束**：不让Agent提供任意SQL，不把所有用户共享query hash作cache key。
- **Acceptance**：参数化执行，行列过滤服务端生效；缓存含scope/权利/版本，撤权失效；cancel终止资源，超限/超时返回规范错误。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4D-02.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4D数据/外部副作用回滚限制，不撤销他人改动。

### M4D.2 Milestone：可解释展示与验证

**Milestone验收**：P4D-03–P4D-04全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E4D.2 Epic：图表、导出和业务口径

<a id="P4D-03"></a>
##### Task P4D-03：建立图表解释与受控导出

- **目标 / PRD**：建立图表解释与受控导出；[REQ-I02](PRD-BI-Plugin-v1.0.md#REQ-I02)、[REQ-I03](PRD-BI-Plugin-v1.0.md#REQ-I03)
- **依赖与顺序**：[P4D-02](#P4D-02)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：packages/ui/（现有slot注册模式）。
- **Scope—新增建议**：plugins/bi/src/{dashboard,tools,export}.tsx；行为测试默认新增`tests/enterprise/P4D-03.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入QueryResult；输出图表、bi.explain引用、独立授权导出Artifact。
- **边界 / Cursor约束**：图表支持不意味着生产指标口径已获批准。
- **Acceptance**：图表和文本取同一queryId/metricVersion；无数据不编造；导出ACL/短期下载/CSV公式注入处理；显示freshness。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4D-03.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4D数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4D-04"></a>
##### Task P4D-04：验证真实数据与指标一致性

- **目标 / PRD**：验证真实数据与指标一致性；[REQ-I04](PRD-BI-Plugin-v1.0.md#REQ-I04)、[REQ-T05](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md#REQ-T05)
- **依赖与顺序**：[P4D-03](#P4D-03)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：已有tenant:boundary-audit入口。
- **Scope—新增建议**：tests/enterprise/bi-e2e.spec.ts；docs/architecture/bi-acceptance.md；行为测试默认新增`tests/enterprise/P4D-04.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入固定golden dataset和D07真实测试数据；输出指标核对、权限/缓存/导出/性能报告。
- **边界 / Cursor约束**：性能数值记录硬件和数据量，D11未确认不能对外称生产SLA。
- **Acceptance**：null/重复/时区边界totals与批准口径一致；跨tenant/字段泄漏0；查询超限/cancel不留资源；真实connector验证。
- **验证命令/方法**：待建：`pnpm test:bi-e2e -- --profile=staging`；已有：`pnpm tenant:boundary-audit`（需扩展）。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4D数据/外部副作用回滚限制，不撤销他人改动。

<a id="phase-4E"></a>
## Phase 4E：Ontology与年度集成

- **建议窗口 / 目标**：月11–12；贯通企业对象/关系/版本化动作，完成平台和业务试点的统一验收。
- **PRD与条款**：[REQ-O05](smc-copilot-Enterprise-Ontology-Plugin-Design-v1.0.md#REQ-O05)、[REQ-006](PRD-SMC-COPILOT-ENTERPRISE-AGENT-OS-v1.0.md#REQ-006)
- **前置依赖**：Phase 4D退出门槛通过；允许提前设计的条件见§2。
- **边界**：Customer/Product/Quotation首批闭环；其他原对象保留目录/schema和独立启用门槛。
- **阶段验收 / 退出门槛**：P4E全部完成；D08对象/ERP/报价动作批准，关系授权/版本兼容/幂等/补偿通过；全年跨runtime/plugin/业务恢复与安全验收有证据，后续愿景有明确backlog。
- **回滚策略**：关闭Ontology写动作，降为授权query；schema版本pinning、恢复索引，已发生外部动作依receipt补偿/对账。

### M4E.1 Milestone：企业对象和动作治理

**Milestone验收**：P4E-01–P4E-03全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E4E.1 Epic：Schema、Connector与批准动作

<a id="P4E-01"></a>
##### Task P4E-01：定义对象目录关系与schema版本

- **目标 / PRD**：定义对象目录关系与schema版本；[REQ-O01](smc-copilot-Enterprise-Ontology-Plugin-Design-v1.0.md#REQ-O01)、[REQ-O02](smc-copilot-Enterprise-Ontology-Plugin-Design-v1.0.md#REQ-O02)
- **依赖与顺序**：[P4D-04](#P4D-04)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：plugins/crm/；plugins/bi/（前期新增，复用外部ID/metric版本）。
- **Scope—新增建议**：plugins/ontology/src/{schema-registry,object-types,relations}.ts；行为测试默认新增`tests/enterprise/P4E-01.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入D08对象字段/关系和CRM/BI映射；输出ObjectType/ObjectRef/Relation版本化目录及migration规则。
- **边界 / Cursor约束**：目录覆盖与生产连接器启用分开，不声称8对象全部上线。
- **Acceptance**：Customer/Vendor/Brand/Product/Inquiry/Quotation/SalesOrder/Inventory均有范围状态；首批字段完整，跨tenant引用拒绝，旧schema兼容fixture。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4E-01.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4E数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4E-02"></a>
##### Task P4E-02：实现授权对象查询与关系连接器

- **目标 / PRD**：实现授权对象查询与关系连接器；[REQ-O02](smc-copilot-Enterprise-Ontology-Plugin-Design-v1.0.md#REQ-O02)、[REQ-O04](smc-copilot-Enterprise-Ontology-Plugin-Design-v1.0.md#REQ-O04)
- **依赖与顺序**：[P4E-01](#P4E-01)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：plugins/crm/src/connector.ts；plugins/bi/src/connector.ts（前期新增）。
- **Scope—新增建议**：plugins/ontology/src/{query,traverse,connectors}.ts；行为测试默认新增`tests/enterprise/P4E-02.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入typeId/filter/ObjectRef/relationType/depth；输出逐跳授权objects/nodes/edges和sourceVersion。
- **边界 / Cursor约束**：Ontology不是第二套ERP数据库，不允许绕CRM/BI字段权限。
- **Acceptance**：Customer→Quotation→Product可贯通，隐藏对象不可通过关系/计数泄漏；depth/cycle限额；Inventory只读返回权威源版本。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4E-02.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4E数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4E-03"></a>
##### Task P4E-03：建立报价prepare/commit与补偿

- **目标 / PRD**：建立报价prepare/commit与补偿；[REQ-O03](smc-copilot-Enterprise-Ontology-Plugin-Design-v1.0.md#REQ-O03)、[REQ-C03](PRD-CRM-Plugin-v1.0.md#REQ-C03)
- **依赖与顺序**：[P4E-02](#P4E-02)、[P4C-04](#P4C-04)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：plugins/crm/src/commit.ts；packages/webhook-outbox/（复用可靠投递模式）。
- **Scope—新增建议**：plugins/ontology/src/{action-registry,proposals,commit,saga}.ts；行为测试默认新增`tests/enterprise/P4E-03.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入actionId/objectRefs/input与D08批准流程；输出proposal/digest/requiredApprovals、receipt和补偿状态。
- **边界 / Cursor约束**：D06/D08价格/审批规则缺失则阻止commit上线；不承诺跨ERP原子事务。
- **Acceptance**：默认prepare可用，commit需批准；同key不重复外部报价，版本冲突/部分失败/unknown对账可测；记录schema/policy版本。
- **验证命令/方法**：待建：`pnpm exec vitest run tests/enterprise/P4E-03.test.ts`；实现前先添加对应行为/故障fixture，并在P0-06测试发现配置中接入。相关包另跑已有`pnpm typecheck`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4E数据/外部副作用回滚限制，不撤销他人改动。

### M4E.2 Milestone：Ontology及全年交付验证

**Milestone验收**：P4E-04–P4E-05全部Acceptance与证据通过；未决业务gate仅允许独立fixture推进，不放行依赖功能。

#### E4E.2 Epic：业务闭环、恢复与后续边界

<a id="P4E-04"></a>
##### Task P4E-04：Ontology真实对象与安全回归

- **目标 / PRD**：Ontology真实对象与安全回归；[REQ-O05](smc-copilot-Enterprise-Ontology-Plugin-Design-v1.0.md#REQ-O05)
- **依赖与顺序**：[P4E-03](#P4E-03)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：既有Workspace/Plugin/CRM/BI隔离测试（前期新增）。
- **Scope—新增建议**：tests/enterprise/ontology-e2e.spec.ts；docs/architecture/ontology-acceptance.md；行为测试默认新增`tests/enterprise/P4E-04.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入D08测试ERP/CRM及跨tenant/旧schema/重复动作fixture；输出query→prepare→审批→commit→对账证据。
- **边界 / Cursor约束**：无真实ERP时完成fixture并保留blocked，不标整阶段完成。
- **Acceptance**：首批对象真实闭环，拒绝/越权/旧schema/补偿场景通过；其余对象标schema-only或未启用；receipt可回链原审批。
- **验证命令/方法**：待建：`pnpm test:ontology-e2e -- --profile=staging`；已有：`pnpm tenant:boundary-audit`（需扩展）。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4E数据/外部副作用回滚限制，不撤销他人改动。

<a id="P4E-05"></a>
##### Task P4E-05：全年端到端、恢复演练与后续范围移交

- **目标 / PRD**：全年端到端、恢复演练与后续范围移交；[REQ-T05](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md#REQ-T05)、[REQ-OS01](PRD-SMC-COPILOT-ENTERPRISE-AGENT-OS-v1.0.md#REQ-OS01)、[REQ-Y02](OpenBuddy-to-smc-copilot-12个月Roadmap-v1.0.md#REQ-Y02)
- **依赖与顺序**：[P4E-04](#P4E-04)。可与同阶段无依赖交叉且文件不冲突的任务并行；对共享契约先串行定稿。
- **Scope—现有/复用**：package.json既有验证入口；各服务/插件runbook（前期新增）。
- **Scope—新增建议**：docs/architecture/enterprise-release-evidence.md；docs/architecture/follow-up-backlog.md；tests/enterprise/platform-journey.spec.ts；行为测试默认新增`tests/enterprise/P4E-05.test.ts`（若使用下列专项e2e命令则以对应测试文件为准）。
- **接口输入→输出 / 行为**：输入所有phase evidence和D01–D12状态；输出Desktop→Hermes→知识→Browser→CRM→BI→Ontology试点及备份回滚/容量矩阵。
- **边界 / Cursor约束**：不以12月已到替代验收，不把文档完结说成产品完结。
- **Acceptance**：无关键隔离/凭据/幂等回归；旧Pi与可信扩展可用；生产gate明确关闭；Mail/Expert Factory/Web/Mobile/Future Runtime/公开市场/高级Workflow等有下一步PRD门槛，不丢原意。
- **验证命令/方法**：已有：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build`、`pnpm test:electron`、`pnpm enterprise:release-audit`、`pnpm tenant:boundary-audit`、`pnpm eval:acceptance`；待建：`pnpm test:enterprise-journey -- --profile=staging`。
- **完成证据 / 回滚**：保存§3规定的证据包；本Task Acceptance全部通过方关闭。回退本task增量与feature flag，遵守Phase 4E数据/外部副作用回滚限制，不撤销他人改动。

<a id="identity-casdoor"></a>
## 企业身份统一（Casdoor 直连）

依据：[prd/new-sitemap2/OpenBuddy_Enterprise_Identity_Casdoor_Unification_PRD_v1.0.md](new-sitemap2/OpenBuddy_Enterprise_Identity_Casdoor_Unification_PRD_v1.0.md)、冻结契约 v1.1、decisions.md D13–D17。外部 nodeskclaw-backend（BE-01～03）不在本仓库实现；缺该环境时相关验收记 `done-fixture`。

<a id="ID-02"></a>
##### Task ID-02：casdoorAuth 加固与配置收口

- **目标 / PRD**：REQ-CU-01、REQ-CU-02、REQ-CU-04、REQ-CU-05、REQ-CU-06
- **依赖**：ID-00 已登记。
- **Acceptance**：refresh 单飞；临近过期按 skew 视为过期；token 交换与刷新有界超时且不发送 client secret；login/logout/切租户/issuer 变更递增 epoch，迟到响应不落盘；退出先本地失效。

<a id="ID-03"></a>
##### Task ID-03：回调与多租户

- **目标 / PRD**：REQ-CU-03、REQ-CU-07。Q1 默认 loopback 优先、`casdoor://` 兼容一版；Q3 沿用现有 JWT claims 解析。
- **依赖**：[ID-02](#ID-02)
- **Acceptance**：重复或错误来源回调拒绝；单租户自动选中；多租户可切换；请求可带 `X-Tenant-Id`。

<a id="ID-04"></a>
##### Task ID-04：EnterpriseIdentityPort 与运行时接入

- **目标 / PRD**：REQ-CU-30～REQ-CU-33
- **依赖**：[ID-02](#ID-02)
- **Acceptance**：企业/平台运行时与 workbench scope 只经端口取身份；退出或切租户 dispose 运行时；迟到事件按 epoch 丢弃。

<a id="ID-05"></a>
##### Task ID-05：IdentityService 改用 Casdoor token

- **目标 / PRD**：REQ-CU-20～REQ-CU-25
- **依赖**：[ID-02](#ID-02)；真实验收依赖外部 BE-01
- **Acceptance**：身份上下文用 Casdoor token 与 `X-Tenant-Id`；缓存绑定 issuer/subject/tenant/epoch；本地 Pi 的空 authorize 不再拦截；workbench-summary 不含 permissions/capabilities 原文。无 backend 时 `done-fixture`。

<a id="ID-06"></a>
##### Task ID-06：侧栏与设置入口切换

- **目标 / PRD**：REQ-CU-10～REQ-CU-13、REQ-CU-40 第一步
- **依赖**：[ID-04](#ID-04)、[ID-05](#ID-05)
- **Acceptance**：侧栏登录/退出走 Casdoor；审计事件名为 `casdoor.login` / `casdoor.logout`；`OPENBUDDY_IDENTITY_MODE=backend` 可回退旧入口；本阶段不删除旧会话。

<a id="ID-07"></a>
##### Task ID-07：升级清理与 backend-auth 退役

- **目标 / PRD**：REQ-CU-40～REQ-CU-43
- **依赖**：[ID-06](#ID-06) 且零消费者确认
- **Acceptance**：casdoor 模式下首次启动清理 `backend-auth` 会话与企业 OAuth 分区；死 import 清除。源码删除仅在零消费者之后，删除后不可回滚。

<a id="ID-08"></a>
##### Task ID-08：enforcer 迁移

- **目标 / PRD**：REQ-CU-62、REQ-CU-63
- **依赖**：[ID-05](#ID-05)；真实验收依赖 BE-01 `/api/v1/authz/check`
- **Acceptance**：项目/计费/WeKnora 远端授权走 backend；无 backend 时 fail closed；桌面端不再用 client secret 调 `/api/enforce`。无 backend 时 `done-fixture`。

<a id="GW-01"></a>
##### Task GW-01：Hermes 网关生产 verify

- **目标 / PRD**：REQ-CU-60、D17
- **依赖**：契约 v1.1；真实 staging 依赖 D03
- **Acceptance**：伪造、过期、错误 aud 的 token 不通过；静态 token 表仅限测试。无 staging 时 `done-fixture`。

<a id="GW-02"></a>
##### Task GW-02：resource-gateway audience 对齐

- **目标 / PRD**：REQ-CU-61、Q2（首期共用一个应用 aud）
- **依赖**：契约 v1.1
- **Acceptance**：校验仍要求 Casdoor iss/aud/JWKS；现有资源与计费回归不放宽。

<a id="runtime-adapter"></a>
## Runtime Adapter 会话收敛

依据：[prd/new-sitemap2/OpenBuddy_Runtime_Adapter_Session_Convergence_PRD_v1.0.md](new-sitemap2/OpenBuddy_Runtime_Adapter_Session_Convergence_PRD_v1.0.md)、decisions.md D18–D21。无 Hermes staging 时验收记 `done-fixture`，AC-RA-14 挂 D03。

<a id="RA-00"></a>
##### Task RA-00：契约分层

- **依赖**：无。
- **Acceptance**：`RuntimeAdapter` 为 `RuntimeConnection & RuntimeSessionPort`；新增 `RuntimeStatus` 与 feature 位；`runtime-core` 的阶段类型改名为 `RuntimeLifecyclePhase`；不改变现有调用行为。

<a id="RA-01"></a>
##### Task RA-01：平台 Runtime IPC 可达

- **依赖**：[RA-00](#RA-00)
- **Acceptance**：preload 放行 `platform-runtime:list/health/switch`；`platform-plugin:*` 仍拒绝；切换表示新会话默认。

<a id="RA-02"></a>
##### Task RA-02：Pi 真实绑定与取消信号

- **依赖**：[RA-00](#RA-00)
- **Acceptance**：未绑定不报 healthy；`agent:prompt` 的 AbortSignal 会中止 Pi；`cancel` 校验 runId。

<a id="RA-03"></a>
##### Task RA-03：会话 Runtime 绑定

- **依赖**：[RA-00](#RA-00)
- **Acceptance**：绑定写入 `session_bindings` 且不可变；无记录视为 `local-pi`。

<a id="RA-04"></a>
##### Task RA-04：按绑定路由

- **依赖**：[RA-02](#RA-02)、[RA-03](#RA-03)
- **Acceptance**：变更类 `agent:*` 按会话绑定路由；不支持返回 `UNSUPPORTED_CAPABILITY`；`policies.agents` 覆盖这些操作。

<a id="RA-05"></a>
##### Task RA-05：远端单栈

- **依赖**：[RA-03](#RA-03)、[RA-04](#RA-04)
- **Acceptance**：远端会话只创建一次；同一 SessionRef 发送与取消；无 2 秒总超时；身份 epoch 变化丢弃迟到事件。无 staging 时 `done-fixture`。

<a id="RA-06"></a>
##### Task RA-06：Renderer 投影与取消

- **依赖**：[RA-05](#RA-05)
- **Acceptance**：远端事件按 seq 去重投影；取消进入 pending，超时标 uncertain；Local Pi 仍走 `pi-client`。

<a id="RA-07"></a>
##### Task RA-07：能力协商

- **依赖**：[RA-05](#RA-05)
- **Acceptance**：能力来自 Gateway；缺失字段按 false。

<a id="RA-08"></a>
##### Task RA-08：退役旧桥

- **依赖**：[RA-06](#RA-06)
- **Acceptance**：生产 prompt 路径不再调用 `collectChat` 或合成 `pi://complete`。

<a id="RA-09"></a>
##### Task RA-09：Gateway 补强

- **依赖**：[RA-05](#RA-05)
- **Acceptance**：跨 workspace 403；超限 413；`main.ts` 装配 Casdoor verify。常驻 SSE 不做（D21）。

<a id="RA-10"></a>
##### Task RA-10：验收与纠偏

- **依赖**：[RA-06](#RA-06)
- **Acceptance**：受影响测试与 typecheck 记录在 evidence；P1-06 挂载描述已纠偏；AC-RA-14 保持 D03 阻塞。

## 5. Cursor执行提示（自包含）

每次从依赖已满足的一个Task开始；建议一次工作单元覆盖一个可测试行为，较大Task先按schema→实现→错误/恢复→集成拆成小提交，但保持Task验收完整。Cursor可以使用已有技能/子代理；本计划不依赖Codex专用工具或预装技能。

```text
请实施 prd/roadmap.md 中的 <TaskId>。
1. 阅读根/局部AGENTS、该Task及其精确PRD条款；检查git状态和当前文件。
2. 验证前置Task证据、业务decision gate、输入输出schema及源hash；缺条件时只做独立工作。
3. 列出本次精确文件；区分现有与新增；不得从GitHub补smc-copilot源码。
4. 写有价值的失败用例或契约fixture，小步实现；保留Pi与现有插件功能。
5. 执行Task指定测试及受影响typecheck/build；必要时真实受控e2e。
6. 对照Acceptance逐条附证据；同步PRD/ADR的合法调整和migration mapping。
7. 报告修改文件、验证结果、限制、回滚；没有授权不提交/push或部署生产。
```

所有业务待决与阻塞影响见[审查记录D01–D12](PRD-审查与修订记录.md#decisions)。不得凭elapsed time、mock成功或月份到期解除gate。
