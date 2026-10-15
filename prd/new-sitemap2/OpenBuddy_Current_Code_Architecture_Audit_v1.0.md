# OpenBuddy Current Code Architecture Audit v1.0

**基于实际源码的 Architecture Gap Analysis｜2026-10-14**

## 0. 基线、范围与证据规则

- 仓库：`loudon84/open-buddy`；用户指定分支：`roadmap/enterprise-agent-os`。
- 固定提交：`1a4bf84160e368206c5582ce96e0bb00ff21740c`；Git tree：`2a3731a4a8c18cd371c16af6c4e4515c5b916a7d`。
- 提交时间：2026-10-13 12:47:13 UTC；提交说明：`feat: cache enterprise identity context and inject it into agent prompts`。
- 根 [package.json](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/package.json) 版本：`0.15.0`。这里是代码版本，不是对已发布安装包版本的认定。
- 目标依据：仓库 Enterprise Shell PRD（文件名 v1.0，正文 v1.1）、Phase-1 Platform Engineering PRD v1.2、专项 Runtime/Plugin/Login/Identity 规范、roadmap/ledger/ADR。文档声明与代码冲突时，当前状态以固定提交的接线为准；需求冲突显式列入迁移计划。
- 本次完整枚举 Git tree：4,933 个条目、4,360 个 blob；对关键入口、跨进程调用、运行时、登录、插件与构建配置作定向源码审计。**没有逐行审核全部 4,360 个文件。**
- 本次不修改业务仓库，不安装依赖，不启动 Electron，不调用模型、身份服务或业务 API，不执行生产部署。产品单元/E2E/性能测试没有在本次重新运行。
- 报告中的“确认缺口”指静态源码足以确认的接线/实现差异；“静态风险”指可推导但尚未动态复现的问题，不等于已证实可利用漏洞。仓库历史测试记录只作历史证据，不当成本次测试结果。

[固定提交](https://github.com/loudon84/open-buddy/commit/1a4bf84160e368206c5582ce96e0bb00ff21740c) · [目标 Shell PRD](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/prd/PRD-OpenBuddy-Enterprise-Shell-改造-v1.0.md) · [路线图状态](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/docs/roadmap/ledger.md)

## 1. 执行摘要：现在究竟是什么架构

OpenBuddy 已是 **Electron 桌面壳 + 本地 Pi 主执行链 + 丰富 UI/能力包 + 多条企业化增量链路**，不是一个只有聊天界面的空壳，也不是已经完成统一企业 Runtime/Workspace/Plugin 控制面的产品。

最重要的迁移判断：

1. **原位演进，保留已有基础。** `electron/main`、`electron/preload`、`src`、UI slots、Pi、Cordis/Plugin Host、加密凭据与共享契约都有价值。不应重建 `apps/desktop`，也不应把 Pi 一次性删除。
2. **优先修“接线与权威归属”，不是增加更多目录。** 普通 Chat、简化 platform runtime、企业 Session Adapter 并存；后两者的 UI/IPC/会话语义尚未形成同一条可验收链。
3. **企业身份已接入，但存在新旧双会话。** 新 backend-auth/IdentityContext 与旧 Casdoor 授权、租户、管理链同时活跃，需要统一身份与注销生命周期，而不是仅统一登录按钮。
4. **插件基础成熟度不均。** 可信 Pi/Cordis/renderer 插件能复用；第三方受限 UI、容器执行、私有 Registry 与安装持久化主要仍是契约、模型和 fixture，不能等同生产级隔离。
5. **文档完成状态需要纠偏。** ledger 如实保留大量 `done-fixture` 和外部 gate，但部分“dock 已挂载”的历史描述不能由此提交的默认 UI 接线证明。应分别记录 contract / unit / fixture / desktop E2E / staging / production。

### 1.1 最优先的实际阻断

| 编号 | 优先级 | 发现 | 证据性质 | 业务影响 |
|---|---|---|---|---|
| G01 | P0 | Settings 调用 `platform-runtime:health/switch`，preload invoke 白名单缺少对应通道 | 确认接线缺口 | 有设置 UI 和 main handler，不代表用户能完成切换 |
| G02 | P0 | `collectChat` 创建新 Session，可能向传入 Session ID 发消息，却订阅新 Session；取消、附件等仍有 Pi 路径 | 条件成立时的确定实现差异 | 多轮对话、取消、流式和引用可能与目标 Runtime 脱节 |
| G03 | P0 | Identity 清理未失效在途请求；新登录 logout 未统一失效进行中的换票 | 静态竞态风险 | 退出/换账号后迟到响应可能恢复旧上下文或会话 |
| G04 | P0（企业发布门槛） | backend-auth 与旧 Casdoor 各自持有企业态；新侧栏退出不等同旧权限链退出 | 确认并行设计 + 风险 | 企业主体、租户与权限可能来自不同真源 |
| G05 | P1 | 企业 Workspace UI 仅骨架；默认 AppShell 未挂载完整企业目录与会话流 | 确认整合缺口 | 用户无法完成真实 tenant/workspace/agent/session 导航闭环 |
| G06 | P1 | 第三方 UI 是 `about:blank`；worker 是注入式容器接口而非已部署隔离执行体 | 确认交付层级 | 不能发布“第三方安全插件平台已完成” |
| G07 | P1 | Registry release key 未含 tenant；slot dispose 缺 owner 精确定位 | 静态数据/生命周期风险 | 跨租户记录覆盖、一个插件撤销其他插件贡献 |
| G08 | P1 | 服务/部分 UI 目录缺 package/build/deploy 闭环；边界扫描不能解析完整 import 图 | 确认工程缺口 | typecheck/纯函数测试不足以证明可发布 |

P0/P1 表示本报告建议的处理顺序，不声称是仓库已有的漏洞分级或已发生生产事故。

## 2. 当前目录：真实布局与交付层级

```text
open-buddy/
├─ electron/
│  ├─ main/
│  │  ├─ index.ts                     启动装配
│  │  ├─ agent/                       Pi host、生命周期、插件装配
│  │  ├─ ipc/                         agent / sessions / runtime / auth 等通道
│  │  ├─ runtime/                     platform manager + enterprise controller + adapters
│  │  ├─ backend-auth/                新企业后台登录、换票、加密会话
│  │  ├─ identity/                    企业上下文缓存与策略读取
│  │  ├─ casdoor/ + security/          旧身份/租户/资源授权仍在使用
│  │  └─ plugins/                     窄型 platform-plugin 门面
│  └─ preload/index.ts                contextBridge、invoke/event 白名单
├─ src/
│  ├─ App.tsx                         SlotProvider + root slot + AppShell fallback
│  ├─ features/app/                   壳、路由、账号和会话协调
│  ├─ stores/                         Chat/session 等 renderer 状态
│  └─ lib/                            IPC客户端、事件处理、账号/身份/平台包装
├─ packages/
│  ├─ runtime-core/                   简化生命周期/health/chat 契约
│  ├─ runtime-adapters/               PiAdapter / HermesAdapter / collectChat
│  ├─ plugin-platform/                CRM 专用的简化注册模型
│  ├─ runtime/
│  │  ├─ openbuddy-runtime-adapter/    完整 Session/stream/cancel/approval 契约
│  │  ├─ openbuddy-hermes-client/      Gateway transport/client
│  │  ├─ openbuddy-workspace/          Workspace DTO / session projection
│  │  ├─ openbuddy-plugin-sdk/         现有插件契约、serializer、作者接口
│  │  ├─ openbuddy-plugin-host/        Cordis 可信宿主 + 企业治理模型
│  │  └─ openbuddy-storage/ …          本地存储等
│  ├─ renderer/openbuddy-renderer-host/ 插件 renderer 宿主
│  ├─ auth/ + capability/ + core/ + collaboration/ + shared/
│  └─ ui/openbuddy-ui-*/              大量已有 UI 功能包
│     └─ openbuddy-ui-enterprise/src/ 企业面板/Scope模型；未完整 package 化
├─ services/
│  ├─ casdoor-resource-gateway/        已有独立 package/部署配置的资源服务
│  ├─ hermes-agent-gateway/            可启动的桥接函数、事件/receipt/路由实现
│  ├─ enterprise-workspace/            目录、授权、审计等模型与 SQL 草案
│  ├─ enterprise-plugin-registry/      签名/审核/发布模型
│  └─ enterprise-plugin-worker/ …      worker、Browser/CRM/BI/Ontology 骨架
├─ plugins/knowledge/ + crm-plugin/    业务插件源码或 manifest
├─ apps/admin-portal/ + openbuddy-website/
├─ tests/enterprise/                  契约、loopback、fixture 测试
├─ prd/ + specs/ + docs/roadmap/       目标、实施与历史证据
└─ pnpm-workspace.yaml + .moon/ + tsconfig* + electron.vite.config.ts
```

### 2.1 构建事实与易误判之处

- Electron 打包入口是根 [package.json](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/package.json) 的 `out/main/index.js`；[electron.vite.config.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron.vite.config.ts) 分 main/preload/renderer 三个 bundle。现有桌面源码不在 `apps/desktop`。
- pnpm workspace 显式包含平层 `runtime-core`、`runtime-adapters`、`plugin-platform` 和分组 packages；[.moon/workspace.yml](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/.moon/workspace.yml) 也有对应发现规则。
- `packages/ui/openbuddy-ui-enterprise` 与 `packages/capability/openbuddy-file-preview` 在 tree 中已有源码，但没有各自 [package.json](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/package.json)；不能把“目录已存在”称为“可独立构建/发布的包”。
- `services/enterprise-*`、`hermes-agent-gateway`、`plugins/knowledge` 有源码和测试；大多数没有独立 package/可部署启动入口。`startGateway()` 可在 loopback fixture 启动 Node HTTP server，与独立生产服务交付是两个层级。
- [tsconfig.enterprise.json](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/tsconfig.enterprise.json) 显式 include 这些源码，是有意义的类型覆盖，**不是**服务打包、启动、健康检查、数据库迁移和镜像交付的证明。
- [.gitignore:2-4](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/.gitignore#L2-L4) 忽略 `node_modules`、pnpm/npm lock。代码声明的依赖范围并不能重建历史依赖解析；后续应确定 reproducible build 策略，不能在审计中擅自生成/覆盖锁文件。
- `check-enterprise-boundaries.mjs` 只扫描指定 roots 并正则匹配 import 字符串；没有完整解析相对路径、TS/Vite alias、re-export 与动态加载。因此历史“boundary pass”只能证明该检查覆盖的边，不是完整安全证明。

证据：[package.json](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/package.json)、[pnpm-workspace.yaml](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/pnpm-workspace.yaml)、[.moon/workspace.yml](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/.moon/workspace.yml)、[electron.vite.config.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron.vite.config.ts)、[tsconfig.enterprise.json](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/tsconfig.enterprise.json)、[scripts/architecture/check-enterprise-boundaries.mjs](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/scripts/architecture/check-enterprise-boundaries.mjs)。所有包发现结论均与完整 Git tree 交叉检查。

## 3. Electron Main / Preload / Renderer：当前边界

当前基本方向正确：Renderer 做 UI 与状态，preload 暴露受限 API，Main 持有 Node、凭据、文件/服务调用、Runtime 与 IPC handler。但“通道白名单”不等于“调用者授权”。

```text
React App / UI slots / stores
  → src/lib/platform/electron-api.invoke
  → window API / preload allowlist
  → ipcMain.handle / domain handlers
  → Identity / permission / session coordinator
  → Pi host 或 Runtime Adapter / Gateway
  → events / MessagePort / IPC → renderer projection
```

应保留：contextIsolation、Node integration 关闭、显式 allowlist、精简 Identity DTO、main-only token ownership。

应补强：senderFrame/可信文档校验、请求 schema、runtime/session/scope 绑定、RPC 同等权限检查、logout/scope 切换清理、主窗导航范围与 sandbox 兼容验证。具体证据与竞态分析见附录 A；不能只把 `sandbox` 布尔值改为 true 就宣称安全收敛完成。

## 4. Chat 与 Runtime：必须把“文本转发”升级成“会话协议”

当前存在三条相关链路：

1. 既有 Chat → Pi host：成熟的 renderer 状态、消息事件、工具/权限与会话行为依赖这条链。
2. 新 platform manager：Settings 选择 Pi/Hermes，普通文本 dispatch 到简化 `chat()`；存在白名单阻断和会话/流式语义问题。
3. 企业 Session 链：`enterprise-runtime:*` → Main controller → `RemoteHermesAdapter` → 项目 Gateway → 上游。完整接口和 loopback 测试存在，但不能推导默认 Chat 已完整采用它。

目标应保留两层契约：Manager 管生命周期/默认选择；Session 管 create/send/stream/cancel/approval。问题不在“有两层”，而在同一产品出现独立身份、会话与消息真源。Settings 切换只能影响新会话，历史/进行中会话必须按绑定 Runtime 路由；不能每次发送再读取全局 active Runtime，也不能把 Pi session ID 当远端 session ID。

详细入口、路径、stream/receipt/cancel 差异与逐项缺口见附录 B。

## 5. Login Flow：新链已落地，企业身份尚未单一化

新链是：设置企业地址 → 打开授权子窗口 → loopback callback → backend 换票 → safeStorage 加密落盘 → Identity API → main 缓存 → renderer 精简视图与 prompt context。

旧链仍包括：Casdoor OAuth、独立 token、workbench tenant/subject、管理 API、部分资源能力判定。两条链都被 Main 初始化并注册 IPC。

迁移应先增加单一企业会话权威与 epoch，再适配旧消费者。缓存可用于 UI 展示，不应自动成为撤权后的执行授权；离线可展示旧数据与是否允许企业动作必须分开定义。PRD 中“旧 session 保留 context”也不应被解释为“旧 session 永久保留旧权限”。

新回调仅客户端未见 state/PKCE，不能推导外部身份后台未做对应保护；必须对接验证单次短期 code、return_to/设备/会话绑定和防重放。不能盲删旧链中已存在的 state/nonce/PKCE 保障。

详细状态机、文件与验收见附录 A。

## 6. Plugin 可插入点：按信任级别复用，而不是全部动态 import

- 可信第一方：既有 Cordis loader/fork/dispose、Pi serializer、renderer host、UI slots/apply。
- 企业治理：现有 plugin-sdk 扩展 manifest/兼容协商；plugin-host 的 broker、lifecycle、installation store 承接执行与清理。
- 第三方 UI：受限资源加载 + frame/message broker，不进入可信 renderer 插件动态加载路径。
- 第三方 backend：实际独立受限 worker/container；没有沙箱应拒绝，不降级到 Electron Main。
- Shell：`root` slot 有默认 AppShell fallback，是企业壳的已有接缝；插件不是每条 Agent 消息中必经的串行转发层。

`packages/plugin-platform` 已有 IPC 门面，但 loader/registry 是 CRM 特例元数据注册；既不能称完整企业宿主，也不能假装完全未接线。应收敛到既有 SDK/Host，迁移兼容门面之后再考虑删除重复实现。

详细插入点、manifest 差异、scope/owner/registry 风险见附录 C。

## 7. 企业 Workspace / 服务侧的额外差距

1. `workspace-navigation.tsx` 目前只是展示 tenant/offline/items 的 section；`workspace-shell.ts` 只有 scope reducer。尚非真实 tenant→workspace→agent→session→task→artifact 导航。
2. `DirectoryApi` 使用内存 Map，`WorkspaceDirectory` 使用数组；`createWorkspace/getWorkspace/provisionAgent` 是模型方法，不自带真实 HTTP 身份校验、租户复合键、数据库事务。不要把类名带 Api 当成部署 API。
3. Workspace 授权函数验证主体/过期/租户/成员与 grant，值得保留；但调用方负责提供 token/membership，仍需权威认证与服务侧强制接线。
4. `SessionProjection` 目前内存 Map 以 sessionId 为键，提供 seq 去重/gap 检测。目标跨 workspace/tenant 使用时应显式绑定 scope，恢复时也要重新验权；不要仅依据注释“scope-partitioned”判定已完整隔离。
5. Gateway 有真实请求处理代码，仍需生产 bootstrap、认证适配、持久化/并发/限流/请求大小/网络截止、安全配置和可运维交付。现有 JSON stores、loopback server 与 staging-ready 不是同义词。

证据：[packages/ui/openbuddy-ui-enterprise/src/workspace-navigation.tsx](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/ui/openbuddy-ui-enterprise/src/workspace-navigation.tsx)、`workspace-shell.ts`、[services/enterprise-workspace/src/directory-api.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/services/enterprise-workspace/src/directory-api.ts)、`models.ts`、`authorization.ts`、[packages/runtime/openbuddy-workspace/src/session-projection.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-workspace/src/session-projection.ts)、[services/hermes-agent-gateway/src/server.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/services/hermes-agent-gateway/src/server.ts)、两项服务 `deploy/README.md`。

## 8. 目标差距表与判定口径

| 目标 | 当前可复用 | 尚缺闭环 | 不应声称 |
|---|---|---|---|
| 企业 Shell | AppShell/root slot/UI packages | 目录数据源、租户切换、实际挂载/恢复/E2E | 看到 Workspace 类型就已完成企业工作台 |
| 多 Runtime | 两层契约、manager、Pi/remote adapters | IPC可达、session binding、统一stream/cancel/approval | 任意设置切换后所有 Chat 操作都走选中引擎 |
| 企业登录 | backend-auth、安全存储、Identity服务 | 单一主体/退出、epoch、fresh授权、协议联调 | 侧栏显示登录即所有企业工具已授权 |
| 插件平台 | Cordis/SDK/slots + 企业策略模型 | 真实受限UI/worker、持久安装事务、统一registry | Promise超时或Cordis fork就是安全沙箱 |
| 企业服务 | Gateway可启动函数/授权/receipt模型 | 部署入口、DB、凭据引用、真实故障与隔离测试 | loopback fixture证明真实Hermes兼容 |
| 工程门禁 | typecheck、fixture、boundary scripts | 全import图、受影响测试基线、打包实测 | 代码存在/历史done就是验收通过 |

## 9. 本次验证与后续证据要求

本次完成 Git tree/固定源码交叉核对、捕获源码 blob 校验、静态接线核查及文档引用检查；详见随附审计验证记录。没有把历史测试结果改写为本次通过。

历史 [docs/architecture/validation-baseline.md](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/docs/architecture/validation-baseline.md) 记录过 159 tests failed / 7,360 passed；[docs/roadmap/review-2026-10-12.md](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/docs/roadmap/review-2026-10-12.md) 另记录企业 fixture 69 tests passed。两者时间、范围不同，均不能作为当前完整仓库绿色基线。后续实施必须重新执行受影响测试并记录基线增减，不能靠删除失败测试清空债务。

建议下一步按第二份文档的 M0→M1→M2 推进：先修身份与IPC风险，再统一运行时会话，再挂企业壳；不先扩建业务插件数量。

---

# 附录 A：Electron 边界、Login Flow 与身份上下文详细证据

### 审计口径

固定仓库 loudon84/open-buddy，commit `1a4bf84160e368206c5582ce96e0bb00ff21740c`（用户指定 roadmap/enterprise-agent-os 分支的固定快照）。只读拉取源码；没有安装依赖、执行测试或访问真实身份服务。以下“已实现”指可追踪代码；“风险”指静态推断，不能等同已复现漏洞。已阅读根 AGENTS.md 和 packages/ui/AGENTS.md。两个 new-sitemap 文档虽然文件名 v1.0，front matter/title 的实际版本都是 v1.2，状态 APPROVED_FOR_PLAN；PRD 只作目标和差异参考。


### 1. 核心结论

1. 这不是“还没有企业登录/Identity Context”的代码库。新的 backend-auth 登录服务、Electron 授权窗口、SQLite 加密会话、身份缓存、精简 IPC DTO、agent:prompt 的 runtime allowlist 都已经存在且接入启动路径。
2. 更准确状态是“新企业身份链已接入，但旧 Casdoor 企业授权/租户/管理链仍并行活跃”。新的侧栏登录成功不等于旧 Casdoor 能力已登录；新的侧栏登出也不等于旧 Casdoor 会话已销毁。
3. 当前新身份是单例缓存，不是完整授权控制平面。缓存陈旧、登出竞争、跨 origin 在途响应、上下文 readiness、身份刷新事件传播需要收口。不能据此宣称 Skill/MCP/Knowledge 全链授权完成。
4. Renderer/main 的基础隔离和 IPC 白名单已有，但白名单是通道可达性控制，不是按调用者授权。主窗 sandbox=false，统一 wrapper 不做 sender/frame 验证；需要进一步按能力收窄边界。

### 2. 可验证调用链

#### 新企业登录链：已实现

- [src/features/app/useAppShellRuntime.ts:538-550](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/features/app/useAppShellRuntime.ts#L538-L550)：读取 backendAuthStatus，调用 startEnterpriseLogin。
- [src/features/app/start-enterprise-login.ts:1-13](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/features/app/start-enterprise-login.ts#L1-L13)：origin 为空打开 enterprise-login 设置，否则调用 login，不再经过地址对话框。
- [src/lib/backend-auth/backend-auth-client.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/lib/backend-auth/backend-auth-client.ts)：renderer 的 backend-auth:* invoke 包装。
- [electron/main/ipc/backend-auth.ts:9-18](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/backend-auth.ts#L9-L18)：注册 status/origin-save/login/cancel/refresh/logout/test-connection；setStatusListener 发送 backend-auth://status。
- [electron/main/backend-auth/backend-auth-service.ts:237-282](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/backend-auth/backend-auth-service.ts#L237-L282)：safeStorage 可用性门槛；loopback 临时端口；登录地址 `{origin}/api/v1/auth/casdoor/login?return_to=...`；非模态授权窗口。
- [electron/main/backend-auth/oauth-window.ts:17-66](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/backend-auth/oauth-window.ts#L17-L66)：persist:enterprise-oauth；无 Node integration、context isolation；导航/重定向/新窗口回调消费后关闭；回调消费前关窗取消。
- `backend-auth-service.ts:370-401`：code 换票 `/api/v1/auth/casdoor/exchange`，令牌写主进程会话、加密落盘、调度 refresh，并通知 IdentityService。
- `backend-auth-service.ts:187-204,444-458`：启动解密并先 refresh，完成后才显示 signed_in。

#### 身份上下文链：已实现到 prompt 入口

- [electron/main/index.ts:280-286](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/index.ts#L280-L286)：先初始化旧 Casdoor，再 identity.attachBackendAuth，再 backendAuth.init。
- [electron/main/identity/identity-service.ts:139-152,155-209](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/identity/identity-service.ts#L139-L152)：注册登录/退出回调；从新 backend session 获取 Bearer token；GET `/api/v1/identity/context`；schema parse；SQLite namespace identity:context。
- [packages/shared/openbuddy-types/src/identity.ts:3-16,30-45](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/shared/openbuddy-types/src/identity.ts#L3-L16)：user/tenant/roles/permissions/policies.agents + cache envelope，运行时 parser。
- [electron/main/ipc/identity-view.ts:3-11](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/identity-view.ts#L3-L11)：新 identity IPC 只传 user、tenant、roles，不传 permissions/policies。
- [electron/main/ipc/agent.ts:106-117](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/agent.ts#L106-L117)：向 prompt handler 注入 identity.contextForPrompt。
- [electron/main/ipc/prompt-cycle.ts:103-160](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/prompt-cycle.ts#L103-L160)：每个 prompt 取 context；policies.agents 存在时检查 activeRuntimeId；记录 context.use；透传 Pi prompt 或 platform.chat。

#### 旧 Casdoor 链：仍是生产接线，不能按“无用旧代码”删除

- [electron/main/ipc/index.ts:1120-1122](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/index.ts#L1120-L1122)：Casdoor、backend-auth、identity 三组 IPC 同时注册。
- [electron/main/ipc/casdoor.ts:61-93](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/casdoor.ts#L61-L93)：workbench-summary/status/config/login/refresh/logout 仍开放。workbench-summary 还返回旧 permissions/capabilities 等字段（64-75）；新的精简 identity DTO 不代表所有旧身份出口已经精简。
- [electron/main/casdoor/casdoor-auth.ts:411-438,475-525](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/casdoor/casdoor-auth.ts#L411-L438)：旧直连 OAuth 使用 state、nonce、PKCE S256，系统浏览器和 casdoor:// 回调；并持有独立 access/refresh token。
- [electron/main/security/casdoor.ts:89-95,105-118,152-172](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/security/casdoor.ts#L89-L95)：workbench scope 仍来自旧 Casdoor tenant/subject；Casdoor 生命周期同步 scope 与 session tenant。
- [electron/main/casdoor/casdoor-management.ts:226-298,337-338](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/casdoor/casdoor-management.ts#L226-L298)：仍使用旧 Casdoor token 调真实管理 API，执行旧权限检查与变更后 session revalidation。
- [src/features/app/useAppShellRuntime.ts:554-568](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/features/app/useAppShellRuntime.ts#L554-L568)：新侧栏登出只 backendAuthLogout，但 audit event 仍命名 casdoor.logout；这会让观测上难区分两套会话。

### 3. 已实现与 PRD 范围的区别

#### Login Flow v1.2：主要功能有实际代码

默认地址仅配置文档缺失时写入（backend-auth-service.ts:187-194），显式空值保留（207-217）；保存与测试连接分开、5 秒超时且 manual redirect（220-234）；设置页有显式保存、测试、身份刷新按钮（EnterpriseLoginPanel.tsx:18-47,63-70）。授权子窗口、分区生命周期、启动刷新和 UI toast 监听均有接线。

PRD 要求“用户关闭授权窗口时 toast 显示原因”，但 onClosedBeforeConsume 调用 cancel（backend-auth-service.ts:271-275），cancel 只重置 phase/publish，不设置 error（285-295）。因此常规用户关窗可能静默退出，与失败文案目标不完全一致；需要 UI 验收确认。

#### Identity v1.2：基础能力存在，授权完备性未证明

- 缓存版本、TTL clamp、401 refresh 一次、403 保留缓存、网络错误保留旧缓存、audit 已实现。
- “过期先用旧缓存后台刷新”本来就是 PRD 要求，并由代码 108-114 实现，不应写成需求漏做。但其用于企业权限撤销时的风险需要设计补充：stale 展示数据和可执行授权上下文应分开。
- Skill/MCP/Knowledge 在该 PRD 是“为未来扩展提供基础”，不能因为 `IdentityContext.permissions` 字段存在就宣称工具已逐次验权。
- PRD 要求当前 session 用旧 context、新 session 用新 context。prompt-cycle 当前每次取 global context；最终 session 固定语义需结合 Pi host/runtime 下游验证，不能仅由 IPC 层断言满足。
- 后端由外部 nodeskclaw-backend 提供；本审计未读取该后端仓库，也没请求接口。API 的实际部署、token issuer/audience 校验和一次性 code 绑定不能从客户端通过测试断言推导。

### 4. 优先风险与缺口

#### P0/安全门槛候选：旧响应在退出/换 origin 后复活身份

证据：IdentityService.refresh 只有全局 inflight single-flight（117-120）；clear 只清 envelope，未取消 fetch 或递增 epoch（123-137）；fetchContext 捕获 auth 后，网络返回就直接 this.envelope=...、persist（155-165,196-209），没有检查 current origin/user/session generation。

推演：A 的 context GET 进行中 → logout 或 origin 切 B → clear → A 迟到返回 → 写回 A 的身份/权限。B 登录触发 refresh 时还可能复用旧 inflight。是可推导竞态，不是已运行复现。

建议：auth epoch/subject+origin binding；clear abort 并递增 epoch；响应落盘前校验 epoch；inflight 按 epoch 隔离；token/identity 清理形成原子语义。验收用 deferred fetch：切 origin/退出后释放旧响应，memory、SQLite、IPC、prompt 均不得出现 A。

#### P0/安全门槛候选：新登录 round 在 logout 后没有失效

证据：cancel 和 dropOrigin 自增 round（285-295,341-350），logout 318-338 没有 round++、closeListener、关闭授权窗口；onCallback 只比较 round（370-383），成功后写 session（395-401）。

推演：code exchange 进行中时主动 logout，随后 exchange 返回，可能重新写入 session。新一轮 login 也只 closeListener，没有先关闭旧授权窗口。现有 cancel 晚响应测试不能覆盖 logout。

建议所有终结操作使用统一 invalidateAuthAttempt；exchange/refresh 各自 epoch + single-flight；验收 cancel/logout/origin-change/重启/并发 callback 对迟到响应均不恢复登录。

#### P1：缓存可见性与 authorization readiness 没有强约束

证据：current 无 auth 判断（96-99），缓存仅 namespace 单值、envelope 无 origin/session binding（shared identity.ts:11-16）；BackendAuth.init 无有效 token 时不发 onSignedOut（187-204）；logout/origin-change 只有 hadSession 才通知（331-335,343-349）。因此“缓存存在但 token 不存在/解密失败”时 identity:context 仍可返回旧用户，不满足未登录 null 的绝对契约。

prompt-cycle.ts:112-117 在 context 为 null 或无 policies.agents 时不拒绝；这是本地匿名能力兼容性，不可直接定性为所有请求越权，但企业模式应有明确 ready/required 门槛。PRD Q8 的“缓存已清除则拒绝”与当前 null context 仍允许 Pi 的测试行为存在范围冲突，需明确 enterprise-required 与 local-anonymous 两种模式。

#### P1：新旧会话、租户、权限事实源未统一

旧 Casdoor workbench scope、管理 API、资源治理仍独立；新 backend 会话仅用于侧栏和 IdentityService。建议建立 EnterpriseIdentityPort/SessionAuthority 作为唯一企业态来源，旧调用通过兼容 adapter 消费同一主体和租户。迁移期显式禁止“新用户 A + 旧用户 B”的混合态，退出联动清理。不能让双 token 暗中互相补齐。

#### P1：授权失效与展示降级未拆开

contextForPrompt 无上限地返回 stale cache，网络失败/403 不清旧权限；即使服务端撤销，客户端仍可继续按旧 policies.agents 放行。TTL clamp 还会把服务端过去的 expiresAt 提升至 now+1m（68-71）。这些主要是现行 PRD 的降级设计，不宜只修代码而不改验收。

建议显示缓存可保留，执行权限使用短时策略快照/撤销版本；403 对企业动作 fail closed；离线有明确 bounded grace 与只读能力白名单。远程后端仍必须自验身份与租户，不能信任 Desktop 传入的 context。

#### P1：回调绑定/窗口导航的协议保证尚需外部证明

新链 onCallback 仅取 code/error，未实现客户端 state/nonce/PKCE（370-382）；旧直连链已有这些措施。不能据此断言 OAuth 服务端没有 state：Gateway 可能承担 IdP state，但 Desktop 回调与本次本地会话绑定仍需契约证明。新窗口 callback 匹配 origin+pathname（oauth-window.ts:32-46），但其它导航和 popup loadURL 无 issuer allowlist（49-60）。建议验证 backend 一次性短期 code 与设备/return_to/session 的绑定、防重放，并对窗口允许导航的 origins、scheme、权限申请建立策略。

#### P1：无界网络等待影响退出与恢复

只有 testConnection 有 AbortController 5s。登录交换和 refresh 使用 post 的 fetch 无 timeout（410-425）；onCallback 在 exchange 前 closeListener 清掉 round timer（370-382,507-511）。因此 exchange 可无限停留 exchanging；logout 先 ensureFresh 且等待服务端 logout（318-329），本地清理被网络挂起阻塞；dropOrigin 也先 await logoutAt 才清 session/保存新地址。需先本地终结，再有界 best-effort 服务端撤销；测试断网/永不返回请求。

#### P1：IPC 边界是粗白名单，不是调用者权限边界

基础：main-window.ts:42-47 开 contextIsolation、关 Node，但 sandbox=false；preload/index.ts:273-298 有 invoke allowlist；611 exposeInMainWorld(api)。白名单包括大量 casdoor 管理操作（54-65），并另有 rpc.request 直接到 dsh:rpc（300-305）。

`ipc/_wrap.ts:23-35` 只 try/catch 日志，不校验 sender/frame/origin/schema，不能把 wrapper 命名理解为安全中间件。具体领域可有自己的检查（例如 casdoor-management.ts:337-338），故不能声称所有 IPC 无授权。

主窗导航认可任何 file: URL（main-window.ts:140-148），不是精确 rendererIndex 文件。建议 main-process 统一 senderFrame+mainFrame+document URL 检查，逐通道 schema 与 capability allowlist，RPC 承担同等授权；收窄到精确本地 app 文档/受信 dev origin。sandbox 切换要验证 preload Node 依赖后逐步推进，不能只改布尔量。

#### P2：身份刷新完成的 UI 事件未闭环

IdentityService attachBackendAuth 仅注入 summary getter（139-152）；fetchContext 更新 cache 时没有 backendAuth.publish 调用（205-209）。登录流程先 publish 再异步 onSignedIn（backend-auth-service.ts:399-401）。Renderer 只监听 backend-auth://status（useAppShellRuntime.ts:249-263）。首次无缓存登录后，tenant/identityStale 变化可能要等下一次 backend status 事件/主动查询才展示。需 identity change event 驱动 status projection；设置页“已刷新”之后侧栏应即时刷新。

### 5. 保留、替换、删除边界

保留并加固：BackendAuthService 主进程 token ownership、safeStorage；独立 OAuth partition；origin 显式空值语义；IdentityContext 共享类型/parser；identityView 脱敏 DTO；真实缓存与审计；已有测试依赖注入设计。

替换接线：统一会话 authority + epoch；旧 Casdoor workbench scope/管理权限端口迁往企业 backend；权限判断由可验证的主进程授权服务与后端 PDP 承担；renderer 只消费投影。

有条件删除旧直连登录：必须先证明旧 casdoor:* consumer（管理、资源、计费、WeKnora、workbench scope、协议 handler、harness/agent auth facade）都迁移或明确停用，旧加密 refresh token 有升级清理策略，回归与可回滚开关完备。仅删除侧栏登录 UI 不构成旧链可删除证据。

不应删除：旧 Casdoor 的 state/PKCE、签名校验、tenant-bound 授权约束等安全语义。迁移应保持或转移这些保障，而非因为新链更短就丢失。

### 6. 测试证据和最低验收

现有测试源码（本次未执行）：
- backend-auth-service.test.ts：启动 refresh 门槛、配置空值、cancel 晚响应、关窗时序、分区生命周期、测试连接、identity 通知。
- identity-service.test.ts:48-145：TTL/version/network/401/403/clear；signed-out 测试只覆盖“没有缓存”，没有带残留缓存。
- ipc/__tests__/prompt-cycle-identity.test.ts:57-83：null identity 仍允许 Pi、runtime policy 拒绝、Hermes 透传。

必须增加：
1. identity 在途 fetch + logout/origin-change/account-change 的迟到写入、旧 inflight复用；断言 memory/SQLite/IPC/prompt 全部一致。
2. backend code exchange + logout、重复 callback、并发 refresh 的 token 旋转；断言不可重新登录、只换票一次。
3. 无 token/坏 cipher + 已有 identity cache 的启动：identity:context=null，不展示旧 tenant，不用于企业动作。
4. identity API 401/403/500、超过 grace、无 context、无 policies 与 empty policies 分别定义 local/enterprise 模式行为。
5. identity 更新立即刷新侧栏，取消授权明确 toast，改地址立即本地退出，所有网络挂起有界终结。
6. renderer XSS/非主 frame/非 app 文档不能调用高危 IPC；RPC 和旧 casdoor channels 同样验证。
7. 同一个新 backend 会话统一驱动 tenant、资源、agent、工具与审计；旧会话 B 不得在新会话 A 下被使用；统一退出真实覆盖所有权限链。
8. Gateway 合同测试：code 短期单次、return_to+设备绑定、重放/错误来源拒绝；后端独立校验主体、租户、权限，不接受客户端伪造 context。

验收证据应分三层：纯单元可重现竞态；Electron 集成验证窗口/IPC/存储；隔离 staging 验证真实 Gateway/Casdoor 合同。源码有测试文件不等于这些测试已通过，也不等于真实环境验收完成。

---

# 附录 B：Chat 与 Runtime 详细调用链及差距证据

审计基线：`loudon84/open-buddy@1a4bf84160e368206c5582ce96e0bb00ff21740c`，2026-10-14。只读 GitHub 固定 SHA 文件；未运行应用、未运行测试、未访问模型或真实业务 API。以下“确定”是代码静态证据，“风险”是该代码路径可推导的结果，不把 fixture 测试当生产验证。所有文件行号均对应上述 SHA。根 AGENTS.md 与 packages/ui/AGENTS.md 已阅读。

### 一、最重要的结论

这不是“尚无 Runtime 抽象”的项目，而是**三条并存、能力不等价且接线未闭合的执行链**：

1. 成熟的 Pi 本地主链：ChatView → AppShell callbacks → pi-client → agent:* IPC → agentHost → Pi AgentSession；事件从 pi://* / MessagePort 回写会话 store。
2. platform-runtime 选择器链：RuntimeManager / runtime-core 的 chat() 抽象，PiAdapter / HermesAdapter 包装 session 型 adapter；普通文本 agent:prompt 增加了分流，但其他操作仍在 Pi。设置里的选择器真实渲染，**preload 未允许 platform-runtime:*，所以用户入口调用会被拒绝**。
3. enterprise-runtime 会话链：main 已注册八个 IPC，RemoteHermesAdapter + EnterpriseRuntimeController + gateway 代码具备会话、流、取消、审批接口；但是当前 renderer Chat 未接这条链。ui-enterprise 的 RuntimePanel / runtime-session reducer 只是孤立组件/函数，不是已挂载的企业 Chat。

因此应当保留 Pi 的真实产品能力，以 enterprise session/run/event 合约收口，而不是继续扩展只返回最终字符串的 collectChat 临时桥。

### 二、Current Code Audit 可直接使用的模块地图

| 模块 | 真实入口及职责 | 已实现能力 | 不能据此声称的能力 |
|---|---|---|---|
| App/Chat | src/App.tsx:31-33；src/features/app/AppShell.tsx:172-175,391-414 | Slot 可替换的 conversation surface，默认 ChatView，传入 send/content/cancel callbacks | 企业 Runtime session 投影已经接管 Chat |
| Renderer actions | src/features/app/useAppShellRuntime.ts:601-692 | 新会话乐观 UI、文本、附件、错误回退、取消 | send/cancel/content 统一经过 runtime adapter |
| Pi client/events | src/lib/agent/pi-client.ts:356-361,395-400,446-459,2172-2245 | 显式 IPC、MessagePort优先且IPC降级、事件去重gate | 真正服务器 SSE 是普通Chat的唯一传输；注释写SSE不能替代实际transport |
| Pi stream state | src/hooks/useAgentSession.ts:715-761,773-785 | 有游标 replay、覆盖缺口检测、Pi持久化历史重建；1123行hook处理权限、工具、队列、通知等 | 任意Runtime的统一无关投影 |
| Pi host | electron/main/ipc/prompt-cycle.ts:103-168；agent/host-modules/agent-prompt.ts:115-166；agent/pi-session-runtime.ts:39-92,130-149 | session guard、真实Pi依赖 @earendil-works/pi-coding-agent、世代隔离、旧session abort/dispose | 传入signal已自动中断底层prompt |
| 平台Runtime | packages/runtime-core/src/runtime-adapter.ts:23-49；electron/main/runtime/runtime-manager.ts:4-21 | start/stop/health/chat/listCapabilities；全局active runtime | session/run cancel/approval的等价抽象 |
| 平台适配器 | packages/runtime-adapters/src/{pi-adapter,hermes-adapter,session-chat}.ts | 包装另一套RuntimeAdapter，收集最终文本 | 端到端流式chat、正确多轮session复用 |
| 企业Runtime | electron/main/ipc/enterprise-runtime.ts:30-116；runtime/enterprise-runtime-controller.ts:56-191 | main-frame guard、identity来自main、session归属检查、token留main、subscribe/cancel/decision | 企业Chat已挂载；重启恢复远端session已经做完 |
| 远端transport | electron/main/runtime/remote-hermes-adapter.ts:74-254；packages/runtime/openbuddy-hermes-client/src/transport.ts:19-56 | Bearer认证，401单次singleflight刷新、403不重试、429一次retry-after、结构化error映射 | 实例级动态capability协商、持续SSE增量parser、真实Hermes兼容已验收 |
| gateway | services/hermes-agent-gateway/src/server.ts:125-225 | 按可信identity tenant/workspace查实例/会话；会话映射；有限SSE页；权限与feature guard | 已连接真实Hermes；启动入口中已配置生产verify（本次未验证） |
| 企业UI零件 | packages/ui/openbuddy-ui-enterprise/src/runtime-panel.tsx:18-27；runtime-session.ts:43-74 | cancelled/pending/disconnected状态、按session/seq去重 | App已安装EnterpriseRuntimeDock |

### 三、完整调用链（区分实际与候选）

#### 3.1 已挂载的普通 Chat / 本地 Pi

App.tsx → ShellWithRuntime/useAppShellRuntime → AppShell/MainContent/ConversationSurface → ChatView。

发送：ChatView `onSend` → handleSendCurrent（useAppShellRuntime:630-654）乐观写入 sessionStore，调用 piSend（pi-client:356-361）→ preload invoke allowlist → agent:prompt（prompt-cycle:103）→ 若activeId是pi，ensureAgentHost + 验证loaded session（147-149）→ agentHost.prompt（160）→ agent-prompt.prompt → state.session.prompt(text)（153）→ PiSessionRuntime所持AgentSession。

取消：handleCancel（684-691）→ piCancel → agent:abort（216-241）→ inflight controller.abort + agentHost.abort（234）→ state.session.abort（agent-prompt:458-465）。**前端finally即调用abandonInFlightStream并标completed；这只是本地UI收尾，不是服务端run.cancelled证据。**

附件：handleSendContent（656-682）→ piSendContent → agent:prompt-content（410-442）→ ctx.get("piSession").promptContent。它没有active runtime路由，也没有复用agent:prompt的identity policies检查。

事件：Pi host事件 → renderer pi://update/complete/... → subscribePiEvents；update优先 openPiStream MessagePort，失败才IPC（pi-client:2220-2240）。useAgentSession做合并、store写入、回放，缺失时读取Pi session entries重建。

身份：registerAgentIpc在agent.ts117提供identity.contextForPrompt；prompt-cycle:108-125取身份和agents白名单，记录audit；agent-prompt:142-143只把user/tenant放日志。**不是把完整tenant/workspace/authorization context一路注入Pi工具调用的证据。**

#### 3.2 平台 Runtime 文本分流（存在但未闭合）

main `registerIpc` 同时调用 registerEnterpriseRuntimeIpc 和 registerPlatformRuntimeIpc（ipc/index.ts:1143-1145）。后者createPlatformRuntime注册PiAdapter/HermesAdapter并setPlatformRuntimeManager，初始pi（runtime-registry:50-59）。

设置挂载确实存在：builtin-applies.ts:56,92 → ui-settings/client.tsx:26-32 → SettingsPanel → SettingsSections.tsx:128,2289 → AgentRuntimeSection，后者调用platform-runtime:health与switch（25,37）。但preload/index.ts的allowedInvokeChannels（10-135）无任何platform-runtime:*，invoke在275-276明确拒绝。因此选择器不是生产可用的证据。

若main端active runtime已被切到hermes，agent:prompt:127-145走dispatchPrompt → platform.chat → HermesAdapter.chat → collectChat；完成后publishAssistantTurn把最终字符串重新包装成pi://update与pi://complete。`publish-assistant-turn.ts:3-28`没有逐token推送或run/projection接管；对renderer表现为一次合成回复。

collectChat（session-chat.ts:40-78）存在具体边界问题：
- 每次chat都connect/createSession（49,54），send却用 request.sessionId ?? newSession.sessionId（57），stream用新session（63）。现有Chat总是携带本地sessionId，因此很可能向远端不存在的本地ID发消息；即使传入有效远端ID，也订阅了另一个新会话。
- 写死2000ms timer（51）。signal只传给stream，connect/create/send不携带signal，因此不能称为整个请求2秒有界；timer超时也不调用remote cancel。
- 没有暴露runId、cancel、approval、artifact、增量event给普通UI；返回仅text/sessionId/traceId。
- HermesAdapter默认scope是local/desktop/desktop，固定agentInstanceId `hermes-desktop`（27,60），RuntimeRequest.identityContext没有在collectChat消费。不能据此认定HTTP绕过鉴权：真正HTTP identity来自Bearer，gateway自行verify，但产品上下文与session映射未统一。
- `agent:abort`仍只走Pi；steer/follow-up/content/set-model同样未沿Hermes适配器分流。出现“文本发到A、取消/附件发到B”的一致性缺口。

#### 3.3 企业 session/run/event 通道（main已接，renderer未接）

enterprise-runtime:* 八个IPC已在preload:129-130放行，事件openbuddy://enterprise-runtime在158放行；controller由ipc/index.ts:1144注册。只有OPENBUDDY_ENTERPRISE_GATEWAY_URL通过校验才enabled（允许https及loopback/private IPv4 http，controller:23-45）。

controller从main casdoor status取tenant/actor（ipc/enterprise-runtime:11-15），tokens从main取/refresh（18-37），每次requireSession校验当前identity与缓存session归属（controller:175-184）。这是真实的安全边界，不应误写“租户完全由renderer传入”。workspaceId虽然IPC可传，但RemoteHermesAdapter请求正文只发送agentInstanceId；最终gateway按token identity workspace授权（server:134-142,173-193）。需要显式workspace选择/绑定契约，不能假设传入值已传播。

createSession缓存SessionRef；send/cancel/decide使用它；subscribe以AbortController驱动stream并向renderer发RuntimeEmission。流轮询通过GET /v1/sessions/:id/events?afterSeq=...，读完整response.text后parseSse；gateway主动res.end（server:225）。所以现在是“有限SSE格式事件页 + 轮询”，不是常驻SSE实时连接。该事实不等于bug，但迁移SLO和真实上游适配必须按它验收。

controller的sessions/streams是内存Map（58-59）；无已存在会话attach/load/get入口、无cursor持久化恢复；dispose存在但注册返回值在ipc/index.ts未持有。identity变更后调用受guard，但已运行的订阅生命周期不能仅靠requireSession假定被立即撤销，应补logout/tenant-switch主动dispose测试。

RemoteHermesAdapter capabilities（35-42）硬编码resume=true其余false；HermesClient connect仅读protocolVersion（client.ts:19-26）。取消/审批方法虽然存在，UI不能因此展示“支持”；应取实例能力而不是把协议方法当能力。

#### 3.4 局部实现不能算已替代主链

- `runtime-coordinator.ts`只有runtimeShellState纯对象工厂（8-9）；不是掌控connect/send/cancel的orchestrator。
- `session-coordinator.ts`是18行projection wrapper；不是主Chat正在消费的session服务。
- `LocalPiAdapter`已写read JSONL、openExisting、stream、cancel、approval；但createSession将agentInstanceId当文件路径（113-115），cancel忽略runId（148-152）；requireLocal只查local tenant + connected（242-246），没有完整session/workspace/run绑定校验。
- `runtime-registry.ts:10-27`初始piSlot是empty/no-op；installPlatformPiBinding存在（42-48），在本次已读取生产源文件未找到调用点。不能声称全仓库绝对没有，但不得将此slot视为已验证真实Pi绑定。普通Pi Chat特意绕过PiAdapter，仍走既有host。
- runtime-adapters包反向import electron/main/runtime/{local-pi-adapter,remote-hermes-adapter}；跨包再指向desktop宿主，移植到web/服务端时并非干净的独立SDK。

### 四、差距优先级 / 文件级改造 / 验收

| 优先级 | 差距与影响 | 建议文件级工作 | 必须通过的验收 |
|---|---|---|---|
| P0 | platform选择器被preload拒绝；UI与main契约断裂 | preload/index.ts、ipc/platform-runtime.ts、channel allowlist parity tests；生成单一typed channel manifest | Electron真实renderer经window.api调用list/health/switch，允许合法channel、拒绝未知channel，不用mock invoke掩盖 |
| P0 | collectChat多轮session错配 | 废弃per-chat create，新增SessionService保存local UI id→RuntimeSessionRef映射；修改session-chat.ts、runtime-manager.ts、dispatch-prompt.ts | 第一轮创建1次；第二轮复用；send/stream/cancel同一个session与run；本地UUID不会发送到远端gateway |
| P0 | 只路由文本，取消/附件落到Pi | prompt-cycle所有mutating会话操作经SessionService按session owner路由；明确unsupported而非回退另一个引擎 | Hermes文本+取消+附件+审批在同一runtime；不支持附件时禁用并报结构化错误；Pi无意外调用 |
| P0 | 超时/取消只是本地UI结束 | 用runId与cancel receipt保留cancel-pending；等terminal事件收敛；修改useAppShellRuntime handleCancel、runtime-session reducer、adapter signal传播 | cancel accepted≠cancelled；超时显示uncertain/reconnect；迟到completed与cancelled只接受一个终态；不伪报完成 |
| P1 | 双RuntimeAdapter / phase定义 / identity上下文 | 选session型合约为canonical；runtime-core保留服务生命周期但改名区分RunPhase；注入IdentityService而不静态scope | 一个shared-contract定义SessionRef/RequestContext/Event；类型check禁止renderer传token与伪造tenant；工具、run、audit可关联同一requestId |
| P1 | 企业UI未挂载；runtime-panel与Chat分离 | 新增真正runtime-aware Chat controller，适配现有ChatView展示；在AppShell/slot registration接入，ui-enterprise补package/index/client或明确并入conversation | 从实际App启动、登录、选workspace/instance、发两轮、审批、取消、重启恢复；fixture矩阵和真实部署矩阵分开标注 |
| P1 | capability硬编码与health可能假绿 | remote capabilities改为instance级、schema校验；Pi port未安装应unavailable；runtime health不能connect改变状态 | 未安装Pi port不healthy；gateway不可达/无实例不ready；禁用功能不显示可执行按钮 |
| P1 | 内存会话和订阅没绑定identity lifecycle | controller恢复接口、SessionCatalog与cursor存储、logout/tenant-switch销毁；map key带tenant/workspace/runtime | 重启续聊；旧tenant流停止；不能用相同sessionId串租户；RESUME_EXPIRED走snapshot并去重 |
| P1 | gateway项目协议≠真实Hermes | 在upstream-adapter替换路线/鉴权/事件映射，固定真实Hermes版本与capability matrix | 使用真实受控部署验证session/send/stream/cancel/approval；运行记录含commit、endpoint类型、模型及脱敏trace；绝不把fakeHermes当production signoff |
| P2 | UI hooks和package边界耦合 | ChatView保留显示；把Pi命名store/event解析收敛为runtime-independent reducer；移出adapter对electron目录依赖 | renderer bundle无Node/secret；纯reducer可重放；adapter包可在无Electron测试环境装载；Pi现有多模态/工具/历史回归通过 |

### 五、建议迁移顺序（保住现有Pi产品能力）

1. 先做“真实入口”门禁：修通allowlist，用Electron合同测试证明UI→preload→main；同步修文档中错误挂载状态。此阶段不承诺Hermes生产可用。
2. 冻结统一契约：sessionRef = tenant/workspace/runtime/instance/session；runId、requestId、idempotencyKey、eventId/seq；Capability与生命周期状态分离。抽象保留本地Pi continuation，不改写现有JSONL。
3. 引入SessionService与RuntimeRouter：按会话owner路由，不按可变全局activeId重新解释已有会话。runtime切换默认影响新会话；迁移旧会话须显式操作与兼容性检查。
4. 先接企业session型adapter到同一Chat UI，仍保留Pi fallback；去掉collectChat“新建+收最终文本”的主路径。事件统一投影，tool/approval/artifact保留结构而非扁平text。
5. 补断线恢复、取消确认、identity lifecycle、capability downgrade；最后做真实Hermes端到端。最晚此时下线重复runtime-core chat路径，避免两份修复。
6. 完成迁移验收后再删旧bridge/合成pi事件转发；before/after对比多模态、工具、权限、队列、错误恢复、usage和历史，防止“企业化”退化已有功能。

### 六、测试证据与尚未验证

[tests/enterprise/runtime-main-chain.test.ts:37-95](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/tests/enterprise/runtime-main-chain.test.ts#L37-L95)确实测试adapter→gateway→upstream链、审批digest、防重、恢复、取消及viewer拒绝；但导入的是`fakeHermes`（8,40），verify为静态token表（43）。这证明代码作者写了有价值的合同测试，不证明真实Hermes部署成功，本次也未执行它。

[tests/enterprise/platform-runtime.test.ts:7-28,57-69](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/tests/enterprise/platform-runtime.test.ts#L7-L28)使用fake runtime和vi.fn验证分流，未覆盖真实preload、Settings挂载和collectChat实际多轮错误。因此不能以该测试文件名“acceptance”代替实际产品链验收。

本次未全仓运行tests/architecture checks，也未构建应用。没有验证生产login/模型/网络；没有操作仓库或用户业务数据。所有迁移步骤是建议，不是已经提交实现。

### 七、固定证据链接

所有相对路径都可按此模板构造永久证据链接：
`https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/<path>#L<start>-L<end>`。

最关键三处：
- [普通prompt路由与Pi专属cancel](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/prompt-cycle.ts#L103-L240)
- [会话新建/发送/订阅错配与2秒流定时器](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime-adapters/src/session-chat.ts#L40-L78)
- [preload allowlist拒绝未列出的channel](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/preload/index.ts#L273-L281)

#### 文档漂移记录

如果 ledger/review 叙述“EnterpriseRuntimeDock 已挂载且受 OPENBUDDY_ENTERPRISE_GATEWAY_URL 控制”，应在两份正式文档中标为**与本SHA实现不符的历史叙述**：固定tree无该命名文件；App/AppShell真实挂载路径无该组件；builtin-applies无ui-enterprise；只有main controller的endpoint启用条件得到源码支持。`P2-05 reopened/in-progress`可作项目状态背景，不可替代源码挂载证据。

#### Response / Receipt / Event 的迁移约束

platform RuntimeResponse（runtime-core/runtime-adapter.ts:29-33）是最终文本结果，没有runId；企业 RunReceipt（runtime/openbuddy-runtime-adapter/src/types.ts:87-92）只是accepted且有runId；RuntimeEvent（125-132）才承载事件序号与终态。三者不可混用：HTTP send成功或receipt accepted不表示任务完成；stream disconnect不表示任务失败；取消accepted不表示已取消。正式迁移必须显式保存receipt并继续消费event直至终态，断线用cursor恢复，不再通过publishAssistantTurn制造一个假定end_turn完成事件。

---

# 附录 C：Plugin 插入点、契约与生命周期详细证据

审计基线：loudon84/open-buddy，roadmap/enterprise-agent-os，固定 commit `1a4bf84160e368206c5582ce96e0bb00ff21740c`。本报告为源码静态审计，未运行产品、测试、真实容器、真实服务；以下“实现”表示有可读代码，不表示生产验收通过。行号以固定 commit 为准。GitHub链接统一前缀：`https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/`。

### 1. 核心裁定

1. **不能新建另一套 plugin-sdk / plugin-host / slot runtime。** 已存在真实 Cordis loader、生命周期、Pi serializer、renderer loader、UI slot core。企业治理应扩展并接入这些边界。
2. **`packages/plugin-platform` 是另一个窄型平台注册模型，不能当作现有完整插件运行时。** 其路径仅允许 CRM，本质读取 manifest 后硬编码注册元数据，不执行插件 entry，也没有 handler 调度。它确有 Electron IPC 接入，因此也不能说它“只是未接线的测试目录”。应保留兼容门面、收敛状态权威，避免继续做第二套宿主。
3. **可信第一方 in-process 插件能力与第三方隔离是两种信任等级。** Cordis fork、dispose 和 service isolation 不等于 OS/container 安全隔离；不得把现有动态 import 路径开放给未受信第三方。
4. **P3 企业文件已建立契约与 fixture，但关键链条尚未达到PRD验收。** 受限 UI 目前 iframe `about:blank`；worker 目前只有注入接口和参数检查；企业 manifest 支持的 surfaces 与PRD样例不一致。ledger 的 done / done-fixture 需要按证据层级解释。
5. **Shell 已有整壳替换点。** [src/App.tsx:36–48](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/App.tsx#L36-L48) 的 `root` slot 可保留默认 AppShell fallback，企业 Shell 应优先沿该接缝接入，而非推倒现有 UI runtime。

### 2. 真实插入点与文件级证据

| 层 | 事实、入口 | 文件证据 | 迁移决策 |
|---|---|---|---|
| platform-plugin IPC | list/install/activate/disable 调用本地单例 registry | [electron/main/ipc/platform-plugin.ts:7–26](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/platform-plugin.ts#L7-L26)；[electron/main/plugins/plugin-registry.ts:1–11](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/plugins/plugin-registry.ts#L1-L11) | 短期保留 IPC 兼容门面，改为代理统一安装/生命周期服务；不要保留独立权威状态 |
| 窄型平台 loader | 只接受 `plugins/crm-plugin`，只读 `plugin.json`，强制 id `crm-plugin` | [packages/plugin-platform/src/plugin-loader.ts:5–21](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/plugin-platform/src/plugin-loader.ts#L5-L21) | 不能把此实现描述为通用安装器；先抽掉 CRM 特例再迁入统一契约 |
| 窄型注册表 | Map 存 manifest/phase/tool/UI 元数据；activate 硬编码 CRM；没有工具 handler | [packages/plugin-platform/src/plugin-registry.ts:58–86,130–146](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/plugin-platform/src/plugin-registry.ts#L58-L86) | CRM 贡献应由插件包提供，经 broker 注册执行；兼容现有列表输出 |
| Cordis 基础 | `@openbuddy/cordis` 包装并导出 Cordis Context/Service | [packages/runtime/openbuddy-cordis/src/index.ts:16,32–46,73–75](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-cordis/src/index.ts#L16) | 复用上下文及生命周期；不将其当安全沙箱 |
| Main loader | 默认 dynamic import；加载时建立 Cordis plugin fork，记录 cleanup，错误清理 | [packages/runtime/openbuddy-plugin-host/src/index.ts:490–526,1066–1160](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-plugin-host/src/index.ts#L490-L526) | 保持可信 Pi/Cordis 插件；企业入口在验证/授权之后选择可信宿主或受限 surface/worker |
| Electron装配 | `initPluginLoader` 构造 ElectronHarnessPluginLoader；解析 core/capability/relative/npm，读取PluginStateStore | [electron/main/agent/host-modules/bootstrap/init-plugin-loader.ts:87–158,161–170](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/agent/host-modules/bootstrap/init-plugin-loader.ts#L87-L158) | 在此传入统一策略/可信度判定，不另写loader；注意103、107、112、127、135动态加载路径 |
| Renderer loader | load/rollback/profile/patch/对应fork与dispose已存在 | [packages/renderer/openbuddy-renderer-host/src/index.ts:387–466,472–533,745–792](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/renderer/openbuddy-renderer-host/src/index.ts#L387-L466) | 保留已受信 renderer plugin 兼容，不让第三方受限UI绕到这里 |
| UI runtime | 当前 client 实际创建自己的 `createSlotCore`，内置注册+SDK桥接 | [packages/ui/openbuddy-ui-runtime/src/client.tsx:81–84,293–304,695–790](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/ui/openbuddy-ui-runtime/src/client.tsx#L81-L84)；`slot-core.ts` | 不根据较早AGENTS文字断言当前仍只包裹renderer-host SlotCore；代码显示已有微内核演进 |
| SDK 作者接口 | `defineExtension` 发 window CustomEvent 注册 slot/command，dispose发反注册事件 | [packages/runtime/openbuddy-plugin-sdk/src/author.ts:48–103](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-plugin-sdk/src/author.ts#L48-L103) | 可信插件兼容层保留；企业第三方另走受限message broker，复用同包、不同信任入口 |
| 整壳UI | RootSurface 用 root slot，fallback ShellWithRuntime；SlotProvider 是现有根 | [src/App.tsx:23–58](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/App.tsx#L23-L58) | 企业 Shell 在root接缝落位，继续沿用 theme、i18n、composer与slot基础设施 |
| 企业 broker | manifest permission + grant + resource ACL；每次call复核；tenant/workspace相等；AbortSignal/timeout | [packages/runtime/openbuddy-plugin-host/src/enterprise-broker.ts:47–102](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-plugin-host/src/enterprise-broker.ts#L47-L102) | 可复用策略骨架；生产接入需服务端scope来源、统一工具描述/审批/幂等/审计/动态ACL |
| 企业 UI隔离 | mount只检查uiGrant，返回sandbox；receive检查简单字段；scope只有tenant | [packages/runtime/openbuddy-plugin-host/src/isolated-ui-host.ts:3–42](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-plugin-host/src/isolated-ui-host.ts#L3-L42) | 建真实frame session、origin/source/channel绑定、schema验证、scope generation与路由撤销 |
| 企业worker | ContainerRuntime接口注入；launch检查profile后仅调用runtime.run(profile) | [services/enterprise-plugin-worker/src/runner.ts:12–31](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/services/enterprise-plugin-worker/src/runner.ts#L12-L31) | 添加真实受限容器adapter与部署，不使用VM/worker_threads或main进程降级 |
| 私有registry | Ed25519验签、tenant approver、key revoke、内存release Map | [services/enterprise-plugin-registry/src/catalog.ts:37–107](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/services/enterprise-plugin-registry/src/catalog.ts#L37-L107) | 复用签名算法；补持久存储/不可变版本/租户键/信任根运维/安全解包 |

### 3. 已实现 vs 声明 vs 缺口

#### 3.1 Manifest契约尚未统一到企业PRD

- PRD要求 entry、dependencies及版本range/lock、host sdkVersion/surface/isolation能力协商：[prd/PRD-Enterprise-Plugin-Framework-SDK-v1.0.md:9–19](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/prd/PRD-Enterprise-Plugin-Framework-SDK-v1.0.md#L9-L19)；[prd/Enterprise-Plugin-SDK开发规范-v1.0.md:7–20](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/prd/Enterprise-Plugin-SDK%E5%BC%80%E5%8F%91%E8%A7%84%E8%8C%83-v1.0.md#L7-L20)。
- 当前 `EnterpriseManifest` 没有 entry/dependencies，验证器只验证id、permission命名和remote-backend布尔sandbox条件：[packages/runtime/openbuddy-plugin-sdk/src/enterprise-contract.ts:5–32](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-plugin-sdk/src/enterprise-contract.ts#L5-L32)。
- 当前 `negotiate` 仅接受 surfaces `[renderer,tool]`，仅认识2个permission，依赖为string[]，semver只接受x.y.z，固定publisher=openbuddy和isolationProfile=host：`compatibility.ts:3–12,20–67`。
- 因而PRD示例 `isolated-ui + remote-backend + crm.customer.read + remote-container-v1` 会被当前negotiate拒绝；不能称企业SDK完整实现。将正式schema落到现有SDK包，以迁移adapter读旧格式；不要删Pi/slot serializer。

#### 3.2 Broker具备策略函数，尚非完整安全调用边界

- 当前每次call重新读grants是实质能力，不能说“完全没权限校验”。但resourceAcl是注册时捕获数组，未见每次向权威服务读ACL；scope由call传入，模块内部只比较tenant/workspace，并不认证actor来源。
- tool Map 用裸id覆盖，未显式拒绝重复；dispose仅设置disposed并删除map，不中止已有handler；timeout是Promise.race+AbortSignal，handler忽略signal时其副作用可继续。证据 `enterprise-broker.ts:55–87`。
- `connectMcp` 仅检查URL host，既不是建立连接，也不是完整transport授权；hostname含hermes是启发式拒绝，不能证明无法直接访问Hermes。证据 `enterprise-broker.ts:91–95`。
- PRD要求 host注入scope/actor/requestId/traceId/invocationId/approvalReceipt，output schema，write幂等及approval digest：[prd/Enterprise-Plugin-SDK开发规范-v1.0.md:28–32](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/prd/Enterprise-Plugin-SDK%E5%BC%80%E5%8F%91%E8%A7%84%E8%8C%83-v1.0.md#L28-L32)。应经统一授权Gateway/tool registry接线，以真实调用链验证，避免把controller内纯函数检查当认证。

#### 3.3 第三方UI目前是安全骨架，不是实际动态加载

- `PluginSurface` iframe 始终 `src:about:blank`，viewRef只放data-view，sandbox直接来自props：[packages/ui/openbuddy-ui-enterprise/src/plugin-surface.tsx:3–9](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/ui/openbuddy-ui-enterprise/src/plugin-surface.tsx#L3-L9)。
- 测试主动断言about:blank，并验证没有第三方JS URL和dynamic import：[tests/enterprise/P3-03.test.ts:10–35](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/tests/enterprise/P3-03.test.ts#L10-L35)。该测试证明没有把JS注入可信树，不证明包可加载、消息桥已绑定或Electron隔离生效。
- `IsolatedUiHost.receive()`未绑定message事件origin/source/nonce；backendGrant字段未参与mount或receive；scope切换只比较tenant，workspace变化不可由本类表达：`isolated-ui-host.ts:3–35`。
- PRD要求“至少一个第三方受限UI包实际动态加载”：[prd/PRD-Enterprise-Plugin-Framework-SDK-v1.0.md:27–29](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/prd/PRD-Enterprise-Plugin-Framework-SDK-v1.0.md#L27-L29)。需要真实renderer/Electron E2E，不足以用renderToStaticMarkup替代。

#### 3.4 Worker和生命周期尚缺生产运行体

- runner没有传bundle/entry/input给runtime.run，仅传profile；CPU/内存/timeout只做正数检查，没有实际系统资源限制实现：`runner.ts:12–31`。
- [tests/enterprise/P3-04.test.ts:6–18](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/tests/enterprise/P3-04.test.ts#L6-L18)使用run直接返回ok的fake runtime；[tests/enterprise/plugin-isolation.test.ts:44–46](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/tests/enterprise/plugin-isolation.test.ts#L44-L46)期待staging smoke退出2。
- ledger如实写P3-04/P3-07 done-fixture/no container daemon，P3-05 D09 keys unsigned：[docs/roadmap/ledger.md:64–70](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/docs/roadmap/ledger.md#L64-L70)。不要把其改写成已真实安全隔离通过。
- `enterprise-lifecycle.ts:11–64`只是内存snapshot/state；`installation-store.ts`只重导出该类，并非数据库/文件持久层。apply/disable未调用真实Cordis disposal、broker撤销或UI unmount。当前升级失败恢复snapshot是有用的模型测试，但不是安装事务原子切换证据。

#### 3.5 Registry必须补的确定性风险

- `catalog.ts:57–59` 内存Map；releaseId=`id@version:digest(payload)`不含tenant（79行），key是releaseId（88行）。相同签名内容在两个tenant发布可共享key，后发布覆盖前tenant记录。install再做tenant检查，能拒绝跨租户读取但不能避免前tenant条目被挤掉。**这是静态可推导的隔离/可用性风险，不宣称已在服务中可被利用。** 修复为租户复合主键与不可变release记录。
- 同id/version不同内容生成不同digest，函数没有拒绝同版本重发；未见版本不可变索引。
- archive校验只是收到的file name/size；没有实际zip解包、总展开量、compression ratio或symlink验证。SECRET=扫描也不是通用secret检测：`catalog.ts:67–89`。签名验真不等于安全解包或publisher治理全部完成。

#### 3.6 可信slot桥也需要所有权收敛

- SDK `unregisterSlot(name,payloadId?)`实现忽略payloadId，只发name：`author.ts:21–25,71–74`。
- UI桥接 `onUnregisterSlot`删除所有同name的disposers，没有plugin owner：`client.tsx:735–742`；registrant固定 `@openbuddy/plugin-sdk`（725行）。一个扩展dispose可撤掉其他同槽贡献。
- 修复需pluginId+localId+scope generation及返回Disposable，保留旧接口为显式兼容入口。不要把window CustomEvent当第三方认证边界。


### 6. Package wiring补充（按North Star v1.2校正）

- 实际v1.2逻辑分层位于§12（文件489–505行），明确“逻辑视图，不是目录重组要求”。plugin-platform逻辑层映射既有 `packages/runtime/openbuddy-plugin-sdk` + `openbuddy-plugin-host`（497行）；runtime-core映射 `openbuddy-runtime-adapter`（495行）。因此flat示范包即使在workspace中也不是新的企业权威。
- [pnpm-workspace.yaml:43–61](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/pnpm-workspace.yaml#L43-L61)明确加入flat `packages/plugin-platform` / runtime-core等目录；这是包发现修复，不是它们已整合既有深目录实现的证据。
- 现有 `openbuddy-plugin-host/package.json:8–18`已提供manifest/security/renderer-patch等subpath，但没有enterprise-broker/lifecycle/isolated-ui；host index.ts也未导出这些企业模块。SDK package exports（`openbuddy-plugin-sdk/package.json:9–15`）及index.ts（18–67）同样未导出企业contract/negotiate。当前企业测试采用源码相对路径导入，不能视为发布SDK已经可消费。**应补现有包exports、dependencies、type入口与package消费者测试，不新建第三套enterprise SDK。**
- 发现确定的exports漂移：SDK [package.json:14](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/package.json#L14)把 `./schema` 指向 `./src/schema.ts`，固定commit tree中该文件不存在；index.ts注释也声称提供该subpath。需补合法重导出或移除错误声明，并加exports目标存在性测试。
- `packages/ui/openbuddy-ui-enterprise/`存在5个源码文件，但固定tree没有package.json、tsconfig.json、moon.yml、src/index.ts。`services/enterprise-plugin-worker/`与`services/enterprise-plugin-registry/`也无这些package/build入口。它们目前由 [tsconfig.enterprise.json:11–18](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/tsconfig.enterprise.json#L11-L18)直接include源码，不等于独立workspace package或可部署service。
- 对ui-enterprise：在原目录补package manifest、exports、apply入口、project references/alias、内置或root-slot装配和测试；遵守packages/ui/AGENTS.md的注册三表。对worker/registry：在原services目录补package/build/start入口、运行时配置和部署health/readiness，不另复制一个同名新目录。
- North Star GAP-2明确三源Capability Registry目前仅plugin来源（PRD:365,554）。P-M2除broker权限补强还应建立本地工具/MCP/插件三源统一descriptor与owner视图，授权/effect仍走各自安全executor；这不是再造新插件宿主。GAP-1 secretRef应与parent Runtime计划对齐，不把凭据放plugin bundle；GAP-3策略下发不由插件迁移暗中扩scope；GAP-4 artifact/receipt术语在验收证据中统一。

---

# 附录 D：本次验证记录

- 固定完整 Git tree：4,933条目 / 4,360 blobs；truncated=false。
- 本地审计捕获的 **154 个不同源码/文档文件**与该 Git tree 的 blob SHA 精确匹配。该核验只证明读取对象与固定提交一致，不是对第三方发布签名或全部代码正确性的证明。
- 执行环境：Node v24.19.0、Python3.12.14（审计环境，不是应用生产运行版本）。
- 实际执行：`python openbuddy_audit/verify_findings.py`；六组静态断言通过。
- 静态断言覆盖：IPC白名单缺口；collectChat ID选择/流预算；默认入口与Dock历史描述差异；identity迟到响应保护缺口及403测试语义；package manifest存在性；logout轮次失效缺口。
- 这些是源码结构断言，没有动态复现登录竞态，也没有运行Electron、Vitest、真实容器或Hermes API。
- 本次另校验交付文档中的GitHub源码链接指向固定tree里的文件；对比实施清单中的既有/新增路径。
- 真实测试证据、性能和业务权限结论仍按第二份迁移计划的AC矩阵补齐。

## 应保留的不确定性

1. Gateway/Casdoor/nodeskclaw-backend 的实际部署配置与服务端认证保证未由本次客户端仓库审计验证。
2. “当前默认UI入口没有该Dock接线”不排除未来或外部插件动态注入；不能扩大为所有可能运行环境绝无该功能。
3. 2秒只是流收集信号预算，不是整个请求或服务器run的强制截止。
4. 无独立manifest不等于源码无法被根级构建/镜像打包；本报告要求的是补齐并证明独立发布与启动契约。
5. 403保留缓存是现行设计；授权是否可以继续使用应单独裁定，不能把UI缓存与有效权限等同。
