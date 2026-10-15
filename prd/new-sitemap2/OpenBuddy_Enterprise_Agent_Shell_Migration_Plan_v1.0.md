# OpenBuddy → Enterprise Agent Shell Migration Plan

**版本 v1.0｜基于实际源码差距的增量实施计划｜2026-10-14**

## 0. 基线与计划性质

仓库 `loudon84/open-buddy`，分支 `roadmap/enterprise-agent-os`，固定提交 `1a4bf84160e368206c5582ce96e0bb00ff21740c`，根包版本 `0.15.0`。本计划与《OpenBuddy Current Code Architecture Audit v1.0》配套。

这是待实施计划，不是代码已改、测试已通过或可上线的声明。文件标记：**M**=修改已有；**A**=新增文件；**C**=原目录补齐 package/发布契约；**D**=满足迁移门槛后删除；**K**=保留。新文件名是建议，实施前须按最新 tree 查重。

目标与非目标遵循本提交 [prd/roadmap.md](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/prd/roadmap.md)、Phase-1 Platform Engineering PRD v1.2、Shell PRD、ADR-0001、[packages/ui/AGENTS.md](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/ui/AGENTS.md)；本计划补充审计修复任务，不另起一套相互冲突的 Runtime/Workspace/Plugin 契约。

## 1. 推荐结论

**不重写 OpenBuddy；先消除身份与运行链分叉，再把现有企业模块接成可验证的桌面产品。**

执行顺序：

1. 固定源码、核实测试/接线/发布边界；
2. 修身份失效与 IPC 入口；
3. 会话绑定 Runtime，统一 send/stream/cancel/approval；
4. 接入真正的企业 Workspace Shell；
5. 插件 SDK/Host/Broker 收敛，再补真实隔离与安装事务；
6. 真实受控环境验收、发布与回滚演练。

业务插件数量、Web/Mobile 客户端、额外模型/Runtime 的扩展都应排在上述基本链路之后。Cursor/Codex 在本计划中是实施与审阅工具，不代表给产品新增 Cursor/Codex Runtime。

### 1.1 完成后的用户效果

- 用户能登录企业账号，看到与当前主体一致的 tenant/workspace/agent 实例列表；匿名 Local Pi 仍可按产品政策离线使用。
- 新建会话时选择 Runtime，之后该会话的消息、附件、取消、审批、工具结果、引用、用量均属于同一 Runtime；切默认 Runtime 不改变旧会话。
- 断网显示断线/恢复中；receipt accepted 不冒充 completed；取消待确认不会伪装已取消。
- 退出/切租户立即撤销旧订阅与企业执行权限；迟到响应不得把旧身份、缓存、会话或面板重新带回来。
- 企业插件只获得获批能力；停用后只撤自身贡献；第三方代码不进入可信 Electron 宿主。
- 运维能区分 UI/IPC/Adapter/Gateway/上游故障，关联 requestId/runId/receipt/event，并看到真实部署验收记录。

## 2. 目标架构与唯一权威

```text
Electron Renderer
  AppShell / root slot / ChatView / Enterprise UI
  只持有视图DTO、选择状态与事件投影
        ↓ typed preload bridge（通道、schema、可信sender）
Electron Main
  Enterprise Session Authority（登录、subject、tenant、epoch、凭据引用）
  Session Service / Runtime Router（按session binding路由）
  Workspace Coordinator / Plugin lifecycle broker / 本地能力授权
        ├─ Local Pi adapter → 现有Pi host / JSONL历史 / trusted plugins
        └─ Remote adapter → 企业Agent Gateway
                              ├─ 可信身份与Workspace授权
                              ├─ receipt / idempotency / events / cancel / approval
                              └─ 外部Hermes执行服务

Plugin SDK/Host以旁路扩展UI/Tool/Command，不串在每条消息必经路径
第三方UI → 受限frame/message broker
第三方backend → 独立worker/container
身份/资源Gateway ≠ Agent Gateway ≠ Workspace业务权威
```

### 2.1 权威归属表

| 数据/行为 | 唯一权威 | Renderer职责 | 禁止的替代 |
|---|---|---|---|
| 企业当前主体、登录轮次、凭据 | Main Session Authority + 身份后端 | 显示精简账户/tenant视图 | 两套独立登录状态暗中互补 |
| 企业资源授权 | 后端/PDP；Main进行入口复核 | 显示可用性，处理拒绝 | UI隐藏按钮、提示词permissions当强制授权 |
| Runtime默认值 | Main Manager | 用户设置 | 改默认值即重绑定运行中会话 |
| Session→Runtime/instance映射 | Main Session Catalog；远端真实session由Gateway返回 | 持有无密DTO与UI id | 把本地Pi UUID当远端sessionId |
| Run终态 | 执行端事件经Gateway持久化收敛 | 投影completed/failed/cancelled/uncertain | IPC返回成功即标completed |
| tenant/workspace/member/artifact ACL | Workspace服务 | 展示目录与选择 | 客户端传入tenant就是可信授权 |
| 安装包/审批/信任根 | Registry + 持久安装事务 | 插件状态与操作入口 | manifest自行声明approved |
| UI/tool/command贡献 | owner-aware Host/Broker | 渲染/触发获批贡献 | 卸载一个slot name清掉所有插件 |

### 2.2 必须保留的契约语义

- Manager 与 Session 是两层，不强行合并接口。完整 Session 契约以 [packages/runtime/openbuddy-runtime-adapter/src/types.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-runtime-adapter/src/types.ts) 为中心；flat runtime-core 若保留，只做生命周期/门面映射，不能再维护独立消息与会话真源。
- 使用已有 Scope/SessionRef/RequestContext/RuntimeEvent/receipt，先明确别名 `pi`/`local-pi`、`hermes`/`remote-hermes:<instance>` 的映射，不能简单字符串替换历史数据。
- `send` 返回 receipt；`stream` 提供事件；`cancel` 是请求，最终由 terminal event 确认。未知结果保持 uncertain 并进行安全对账。
- 同一用户意图重试复用幂等语义，不为每次网络重试生成新的业务命令；键至少绑定 tenant/workspace/operation/resource。
- session identity snapshot 用于溯源；授权撤销仍逐次检查。要修改当前 stale-cache 降级行为，必须同步修订 Identity PRD 与测试，不能仅“修代码”隐藏产品决策。

## 3. 文件级改造清单

### 3.1 Main / Preload / 身份与登录

| ID | 文件或明确目录 | 动作 | 具体改造 | 退出验收 |
|---|---|---|---|---|
| F01 | [electron/preload/index.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/preload/index.ts)；[electron/main/ipc/platform-runtime.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/platform-runtime.ts) | M | 修合法通道闭环；从共享通道描述生成/校验invoke allowlist；不能通配开放所有channel | 实际renderer合法health/switch可达；未知channel仍拒绝 |
| F02 | `packages/shared/openbuddy-types/src/ipc-contract.ts`（建议新增）；[electron/main/ipc/_wrap.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/_wrap.ts) | A/M | 类型化通道、输入/输出schema；通用senderFrame/主frame/可信URL校验。逐域权限仍保留 | iframe/错误origin/伪参数/RPC绕路均拒绝，正常路径回归 |
| F03 | [electron/main/backend-auth/backend-auth-service.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/backend-auth/backend-auth-service.ts) | M | auth epoch；统一login/cancel/logout/origin-change失效；先本地退出，再有界远端撤销；exchange/refresh超时与单飞 | 迟到exchange/refresh不恢复登录；断网退出有界完成 |
| F04 | [electron/main/backend-auth/oauth-window.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/backend-auth/oauth-window.ts) | M | 登录导航与popup允许来源/协议；明确callback round绑定、窗口关闭状态与取消提示 | 非预期导航/重复callback拒绝；用户关窗明确结束 |
| F05 | [electron/main/identity/identity-service.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/identity/identity-service.ts)；[packages/shared/openbuddy-types/src/identity.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/shared/openbuddy-types/src/identity.ts) | M | context绑定origin/subject/tenant/epoch；clear取消在途请求；旧response不可落盘；拆display cache与execution readiness | 登出/换origin/换账号后旧GET无论何时返回都不复活 |
| F06 | `electron/main/identity/enterprise-session-authority.ts`（建议新增） | A | 暴露统一当前身份、epoch、订阅与凭据引用端口；不向renderer暴露token | backend-auth、runtime、resource消费者主体一致 |
| F07 | [electron/main/security/casdoor.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/security/casdoor.ts)；[electron/main/casdoor/casdoor-management.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/casdoor/casdoor-management.ts)；[electron/main/ipc/casdoor.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/casdoor.ts)；[electron/main/index.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/index.ts) | M | 旧消费者适配统一authority；保留必要Casdoor管理API adapter；拒绝新A/旧B混合态 | 旧管理与资源功能回归；统一logout清理所有企业访问 |
| F08 | [src/lib/backend-auth/backend-auth-client.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/lib/backend-auth/backend-auth-client.ts)；[src/lib/identity/identity-client.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/lib/identity/identity-client.ts)；[src/features/app/useAppShellRuntime.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/features/app/useAppShellRuntime.ts)；[packages/ui/openbuddy-ui-settings/src/EnterpriseLoginPanel.tsx](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/ui/openbuddy-ui-settings/src/EnterpriseLoginPanel.tsx) | M | 统一账户投影与identity变化事件；即时更新tenant/stale；错误文案区分后台登录/资源授权/连接失败 | 初次登录刷新完成自动展示tenant，不需再点击或等定时刷新 |
| F09 | [electron/main/main-window.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/main-window.ts) | M | 精确可信renderer文档、dev origin、导航约束；评估preload依赖后推进sandbox | 打包窗口及开发窗口回归，不以布尔翻转代替安全验证 |

F09 直接修改已有 [electron/main/main-window.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/main-window.ts)，不新建平行窗口管理器。

### 3.2 Chat / Runtime / Session

| ID | 文件或目录 | 动作 | 具体改造 | 退出验收 |
|---|---|---|---|---|
| F10 | [packages/runtime/openbuddy-runtime-adapter/src/types.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-runtime-adapter/src/types.ts) | M | 补或收紧SessionRef/RequestContext/能力与配置映射；已有字段尽量复用；Manager/Session命名清晰 | 兼容fixtures；无另一份scope/error/event模型 |
| F11 | [electron/main/runtime/session-coordinator.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/runtime/session-coordinator.ts)；`session-service.ts`（建议新增）；`session-catalog.ts`（建议新增） | M/A | 真正会话服务，保存UI id与后端ref映射、cursor、owner与恢复状态；持久化复用现有storage | 首轮只创建一次；多轮send/stream/cancel同session；重启能恢复 |
| F12 | [electron/main/runtime/runtime-manager.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/runtime/runtime-manager.ts)；`runtime-registry.ts`；`dispatch-prompt.ts` | M | Manager仅选新会话默认；调用由catalog owner路由；Pi未绑定必须unavailable；明确安装绑定调用点 | Runtime切换不改现有会话；Pi no-op不能health假绿 |
| F13 | [electron/main/ipc/prompt-cycle.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/prompt-cycle.ts)；`agent.ts`；`sessions.ts`；`session-misc.ts` | M | prompt/content/cancel/steer/follow-up/model/permission等按会话路由；不支持返回明确错误，不落回另一个引擎 | Hermes不意外触发Pi；旧Pi多模态/工具/排队功能不退化 |
| F14 | [electron/main/runtime/local-pi-adapter.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/runtime/local-pi-adapter.ts)；`bind-local-pi.ts`；[electron/main/agent/host-modules/pi-runtime-factories.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/agent/host-modules/pi-runtime-factories.ts) | M | 真实Pi host port接线，local session/path/run校验，cancel signal语义，旧JSONL不自动搬远端 | 离线Pi完整可用；合法历史读取；错误路径/owner拒绝 |
| F15 | [electron/main/runtime/remote-hermes-adapter.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/runtime/remote-hermes-adapter.ts)；`enterprise-runtime-controller.ts`；[electron/main/ipc/enterprise-runtime.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/enterprise-runtime.ts) | M | 同authority；scope变化主动dispose；实例能力；resume/snapshot；恢复已有session；期限分层 | 401/403、断流、游标失效、租户切换与旧流迟到均正确 |
| F16 | [packages/runtime/openbuddy-hermes-client/src/client.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-hermes-client/src/client.ts)；`transport.ts` | M | 固定Gateway协议协商、真实token resolver、受控refresh、网络预算及幂等；secretRef不进renderer/log | 无效token拒绝；重试不重复执行副作用；外部调用次数可观测 |
| F17 | [packages/runtime-adapters/src/session-chat.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime-adapters/src/session-chat.ts)；[electron/main/runtime/publish-assistant-turn.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/runtime/publish-assistant-turn.ts) | M→D | 先从生产主路径摘除per-chat create/聚合文本/合成Pi终态桥；调用者迁移后删除或显式legacy-test保留 | consumer/import扫描为零；多轮与流式替代链通过 |
| F18 | [src/features/app/useAppShellRuntime.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/features/app/useAppShellRuntime.ts)；[src/lib/agent/pi-client.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/lib/agent/pi-client.ts)；[src/hooks/useAgentSession.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/hooks/useAgentSession.ts)；`src/lib/runtime/session-client.ts`（建议新增） | M/A | 保留Pi适配兼容层；抽通用会话client、事件投影与运行态；取消显示pending/uncertain | 不把cancel receipt标completed；内容/工具/引用可重放且无重复 |
| F19 | `packages/ui/openbuddy-ui-conversation`；[packages/ui/openbuddy-ui-settings/src/AgentRuntimeSection.tsx](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/ui/openbuddy-ui-settings/src/AgentRuntimeSection.tsx) | M | UI复用显示层，提供Runtime/instance/scope提示；按能力隐藏或禁用操作；切换默认值文案清晰 | 真实窗口两Runtime多轮与历史只读验收 |

### 3.3 企业 Shell / Workspace

| ID | 文件或目录 | 动作 | 具体改造 | 退出验收 |
|---|---|---|---|---|
| F20 | `packages/ui/openbuddy-ui-enterprise/{package.json,tsconfig.json,moon.yml,src/index.ts,src/client.tsx}` | C/A | 现有目录补正式package与apply；依赖只走DTO/授权bridge；禁止复建新的enterprise-ui目录 | workspace发现、类型、构建、导出与slot注册都通过 |
| F21 | 同包 `src/workspace-navigation.tsx`、`workspace-shell.ts`、`runtime-panel.tsx`、`runtime-session.ts` | M | 从字符串/状态骨架升级为目录驱动UI；pending/dirty/run切换确认；scope epoch隔离迟到结果 | A→B切换不见A数据/订阅；断线只读；可恢复任务 |
| F22 | [src/App.tsx](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/App.tsx)；[src/features/app/AppShell.tsx](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/features/app/AppShell.tsx)；[packages/ui/openbuddy-ui-runtime/src/builtin-applies.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/ui/openbuddy-ui-runtime/src/builtin-applies.ts) | M | 经root/既有slot注册企业壳；默认AppShell可回退；只做组合不塞全部业务 | feature flag off完整旧壳；on真实挂载工作区而非孤立component test |
| F23 | [packages/runtime/openbuddy-workspace/src/types.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-workspace/src/types.ts)；`session-projection.ts`；`client.ts`（建议新增） | M/A | typed目录API client与scope-bound projection；同一shared模型，已知/未知状态明确 | 乱序/重复/缺口/跨scope事件拒绝；认证和分页一致 |
| F24 | `services/enterprise-workspace/src/{directory-api,models,authorization,task-projection,audit,isolation}.ts`；`migrations/001_workspace.sql` | M | 从模型接到真实authenticated service与持久库；租户复合键、revision/幂等与删除/归档规则 | 多进程/重启/并发更新；九类隔离路径真实验证 |
| F25 | `services/enterprise-workspace/{package.json,tsconfig.json,moon.yml,src/main.ts,deploy/*}` | C/A | 明确build/start/config/migrate/readiness；仅在批准staging部署 | 可从干净构建启动；备份恢复；无内置fixture身份 |

### 3.4 Plugin / 服务发布 / 工程门禁

| ID | 文件或目录 | 动作 | 具体改造 | 退出验收 |
|---|---|---|---|---|
| F26 | `packages/runtime/openbuddy-plugin-sdk/src/{enterprise-contract,enterprise-manifest,compatibility,author,index}.ts`；[package.json](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/package.json) | M | 单一企业schema与旧格式adapter；协商真实surface；修不存在的`./schema`导出；owner精确dispose | 支持与拒绝矩阵、包public import、旧Pi/slot serializer回归 |
| F27 | [packages/ui/openbuddy-ui-runtime/src/client.tsx](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/ui/openbuddy-ui-runtime/src/client.tsx)；`slot-core.ts` | M | pluginId/localId/scope generation贡献键；卸载不清同槽其他贡献；重复ID明确拒绝 | 两插件同slot，卸载一个另一个仍可用 |
| F28 | `packages/runtime/openbuddy-plugin-host/src/{enterprise-broker,enterprise-lifecycle,installation-store,tool-registration,isolated-ui-host}.ts`；`index.ts` | M | 验证身份来源、动态ACL、审批/幂等、持久安装、inflight清理、公开exports；可信与受限路径分离 | 假scope/撤权/忽略signal/重启/失败升级矩阵 |
| F29 | [electron/main/ipc/platform-plugin.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/platform-plugin.ts)；`electron/main/plugins/*`；`packages/plugin-platform/src/*` | M→D | 短期兼容门面代理统一host；移走CRM硬编码；确认零调用后删除重复权威 | 老UI list/enable兼容；只有一份安装状态；不无条件删API |
| F30 | [packages/ui/openbuddy-ui-enterprise/src/plugin-surface.tsx](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/ui/openbuddy-ui-enterprise/src/plugin-surface.tsx)；[packages/runtime/openbuddy-plugin-host/src/isolated-ui-host.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-plugin-host/src/isolated-ui-host.ts) | M | 受控view资源、真实frame握手、origin/source/channel/schema、workspace/epoch撤销 | 真实第三方fixture显示；Node、父窗口secret、任意IPC均不可访问 |
| F31 | `services/enterprise-plugin-worker/src/{runner,broker,limits}.ts`；`container-adapter.ts`（建议新增）与部署文件 | M/A/C | verified bundle/entry/input明确输入；真正容器资源与网络/文件限制；缺沙箱fail closed | 实际恶意fixture/timeout kill/资源上限测试，而非fake run=ok |
| F32 | `services/enterprise-plugin-registry/src/{catalog,releases,approvals,signatures}.ts` 与持久层/部署入口 | M/A/C | tenant复合键、不可变版本、信任根/撤销、真实安全解包与审计 | 跨tenant同内容不覆盖；同version异内容拒绝；zip/symlink/总量限制 |
| F33 | `services/hermes-agent-gateway/src/{server,session-store,command-log,event-log,upstream-adapter,operations}.ts` | M | 生产verify、scope、事务存储、请求体上限、期限与幂等、事件对账；工具不支持显式拒绝 | 真Hermes合同、并发冲突、崩溃恢复、单终态、取消审批真实闭环 |
| F34 | `services/hermes-agent-gateway/{package.json,tsconfig.json,moon.yml,src/main.ts,deploy/*}` | C/A | 实际可配置入口/构建/迁移/运维；替换测试启动形态不削弱安全 | 干净镜像启动、readiness、secretRef、TLS、备份恢复 |
| F35 | `packages/capability/openbuddy-file-preview/{package.json,tsconfig.json,moon.yml,src/index.ts}` | C/A | 原目录补package公开API；保留provider/resolve/sanitize | 从消费包public import可用，不能仅相对源文件import通过 |
| F36 | [pnpm-workspace.yaml](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/pnpm-workspace.yaml)；[.moon/workspace.yml](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/.moon/workspace.yml)；[tsconfig.enterprise.json](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/tsconfig.enterprise.json)；根/消费方package与TS/Vite配置；[scripts/architecture/check-enterprise-boundaries.mjs](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/scripts/architecture/check-enterprise-boundaries.mjs) | M | 注册实际独立服务与包；解析真实imports/alias；禁止portable→Electron/Renderer→secrets | package闭包构建、跨层负例真实被捕获、打包Electron可运行 |
| F37 | `docs/roadmap/{ledger,review-2026-10-12}.md`；`docs/architecture/*`；相关`specs/*/evidence.md` | M | 保留历史记录，追加此SHA接线纠偏与分层验收状态；不要篡改旧记录伪造完成 | 一条用户流程一份可复现证据；外部gate未满足不标production |

## 4. 到底新增哪些 packages

### 4.1 本轮应补齐：已有源码目录正式 package 化

| 目录 | 建议包名 | 现在 | 本轮动作 |
|---|---|---|---|
| `packages/ui/openbuddy-ui-enterprise` | `@openbuddy/ui-enterprise` | 5个UI/状态源码文件，缺独立manifest和apply入口 | 补package、exports、TS/moon、index/client/apply；作为企业壳与面板 |
| `packages/capability/openbuddy-file-preview` | `@openbuddy/capability-file-preview` | provider/resolve/sanitize/types源码 | 补package/public API/测试/build消费注册 |

这是补齐原目录，**不是再造另一份组件库或preview实现**。

### 4.2 现有包扩展，不新增同职责包

- `@openbuddy/runtime-adapter`：完整Session契约、config/secretRef schema与兼容协商。
- `@openbuddy/hermes-client`：项目Gateway transport/client。
- `@openbuddy/workspace`：DTO、client、scope投影。
- `@openbuddy/plugin-sdk`、`@openbuddy/plugin-host`：企业manifest、broker、生命周期与公开API。
- shared-types、storage、logging、evidence、ui-conversation/ui-runtime：复用，不分别再建enterprise-types、enterprise-storage、enterprise-chat等平行包。
- 统一Capability Registry优先落在既有plugin-host的`capability-registry.ts`（新增文件建议），汇聚runtime/plugin/MCP来源；有独立消费与依赖隔离证据后才拆新package。

### 4.3 服务工作区：原目录补 deployable project

`services/hermes-agent-gateway`、`enterprise-workspace`、`enterprise-plugin-registry`、`enterprise-plugin-worker` 各自补manifest/build/start/配置/migration/health/deploy。服务不等于浏览器共享SDK，不应被renderer作为源码依赖打包。

Browser/CRM/BI/Ontology后续按实际里程碑分别package化；当前只完成基础Shell时，不为目录对称而一次性建立全部可部署服务。

### 4.4 明确不新增

- 不搬到 `apps/desktop`，不建 `enterprise/auth`、`sdk/runtime-sdk`、`apps/runtime`。
- 不重新创建已有 flat `runtime-core`/`runtime-adapters`/`plugin-platform`。
- 不在本轮创建 Web/Mobile 成品，不引入未验证的 Ekko SDK。
- `secretRef`/统一Capability/Runtime策略下发应先在现有包落位，并把 NorthStar GAP-1/2/3/4登记为具体补强任务。

## 5. 删除哪些旧设计：先替代语义，再删除代码

| 旧设计 | 处理方式 | 删除前门槛 | 不可误删 |
|---|---|---|---|
| 每条chat都createSession，再收集最终文本 | 从生产主链退役collectChat；复用SessionService | 多轮、stream、cancel、approval、usage与历史全部通过 | 完整Session Adapter与本地Pi |
| 将远端最终字符串伪装成Pi complete | 统一RuntimeEvent projection后删合成桥 | renderer所有调用者已迁移；终态不再假造 | 真Pi事件及兼容读取层 |
| 全局active runtime决定已有session去向 | 替换成session binding；默认仅影响新建 | 切换期间的旧run仍回原引擎；无自动failover | Manager健康/默认选择功能 |
| backend-auth/Casdoor两套企业态平行使用 | 先统一authority/退出，再迁移旧OAuth入口 | 全部Casdoor消费者、管理/资源/计费/协议回调完成迁移或明确停用 | state/PKCE/签名/tenant约束；需要的Casdoor API adapter |
| flat plugin-platform独立CRM状态权威 | IPC保兼容，贡献迁至SDK/Host | import/调用者为零；一份安装记录与lifecycle | 可用的兼容客户端接口、可信插件 |
| slot按name整组卸载 | owner/id/disposable替代后删全局撤销行为 | 双插件同slot与scope切换回归 | SlotProvider、apply注册机制 |
| about:blank、fake container作为完成证明 | 保留为unit fixture，退出标准换真实E2E | 真frame/容器证据到位 | 恶意fixture与失败关闭测试 |
| 内存Map/JSON文件模型被当成生产服务状态 | 通过storage port迁移持久事务 | 并发、崩溃恢复、对账、回滚验证 | receipt/审计/旧数据，不靠删数据回滚 |
| 过时“已挂载/已完成”文档 | 追加纠偏与证据状态，不抹历史 | 文档与固定SHA用户入口一致 | 历史失败、外部阻塞记录 |

**当前审计阶段无需删除任何目录。** 迁移中 D 类操作必须逐文件证明替代路径和消费者迁移，禁止“清理整个旧目录”式批量重构。

## 6. 分阶段 Cursor / Codex 实施计划

角色按能力分工，不绑定工具优劣：每个任务只允许一个实现者；另一个负责只读审阅和独立验收。可交换角色，但不可让两者同时修改共享契约/同一核心文件。

| 阶段 | 任务建议ID / 对应roadmap | Cursor实施包 | Codex独立审阅重点 | 退出门槛 |
|---|---|---|---|---|
| M0 基线与真源 | AUD-00；P0-01/P0-02/P0-06补强 | 更新接线图、测试基线、依赖/manifest矩阵；无业务重构 | 精确SHA、dirty状态、文档与代码一致；真实入口而非mock | 完成清单、无隐含工作区改动、受影响测试可运行 |
| M1 身份与IPC | AUD-01/AUD-02；Identity/Login补强 | F01–F09，先deferred-response失败测试，再epoch/bridge修复 | auth竞态、双身份、403/stale策略、非可信sender/RPC | 退出/换origin后迟到响应无效；合法Runtime IPC真实可达 |
| M2 Runtime会话收敛 | AUD-03；P1-01/03/05/06/07补强 | F10–F19，一次只迁一组操作；Pi回归先行 | session/run/idempotency绑定；不丢tool/approval；无跨引擎回退 | Pi+loopback Hermes各两轮、流/取消/审批/历史全部通过 |
| M3 企业Shell | AUD-04；重开P2-05，复核P2-03/07 | F20–F25，正式package + root slot +目录与scope控制 | 真实App挂载、所有列表/流/缓存scope隔离，dirty/run切换 | 打包窗口登录→选workspace→实例→会话→产物闭环 |
| M4 插件统一治理 | AUD-05；P3-01/02/05/06补强、GAP-2 | F26–F29/F32，schema、owner、broker、安装事务 | 不新增另一套SDK；tenant版本键与授权不可伪造 | 旧插件兼容；重复注册/撤权/升级失败/重启恢复通过 |
| M5 真实隔离与服务化 | AUD-06；P3-03/04/07、P1-08、GAP-1 | F30–F36，真实frame/worker、Gateway部署 | 无daemon不降级；依赖闭包、凭据边界、实际资源隔离 | 授权staging真实UI+container+Hermes链及故障演练 |
| M6 生产候选审查 | AUD-07；各Phase外部gate | 只修验收暴露缺陷、runbook与回滚 | D01/D02/D03/D09/D11及相应业务gate；独立复验 | 满足已选范围的所有真实门槛，方可申请发布 |

### 6.1 依赖与并行

- M0之后，M1身份epoch与IPC测试可由不同工作区分别实施，但统一authority合并前不能各自定义另一套subject/scope。
- M2依赖M1的有效身份与bridge；M3可并行做纯UI/DTO，但不能在M2未完成时宣称远端会话闭环。
- M4 schema/owner工作可较早做；真实broker授权依赖M1/M3。M5的受限UI与container adapter可分任务并行，部署要共同通过scope、签名与安装事务门槛。
- Gateway真实上游和身份后端不在本次已验证范围。没有环境时保持 `done-fixture`，不能用截止日期或mock通过替代staging。
- 不承诺固定几天全部完成；每任务计划给出文件数、测试范围和环境前置，完成M0后再估排期。

### 6.2 每个实施任务的交付包

沿现有 `specs/<TaskId>-<short-name>/`，一会话一个Task：

1. `grilling.md/spec.md`：引用既有REQ，当前事实、新增目标、non-goal和影响面。
2. `review.md`：实现前的设计审阅，需区分旧PRD降级政策与新安全门槛。
3. `plan.md`：M/A/D文件列表、失败用例、验证命令、回滚、外部依赖。
4. 代码与测试：先失败测试，再最小实现，不扩大迁移来源。
5. `evidence.md`：命令、工具版本、测试名、结果、日志位置、fixture/staging标签、未验证项。
6. ledger：只对已满足的层级更新状态。提交如获授权按仓库Task格式；不自动push、开PR或部署。

## 7. 可直接交给 Cursor 的实施提示词

```text
任务：实施 <AUD-xx / 原TaskId>，仅处理本计划对应阶段。
源码基线：loudon84/open-buddy，roadmap/enterprise-agent-os，
1a4bf84160e368206c5582ce96e0bb00ff21740c。

先做：
1. 读取根AGENTS、packages/ui/AGENTS（若涉及UI）、WORKFLOW、ledger、decisions、
   constitution、该Task引用的专项REQ与两份审计文档。
2. 输出实际HEAD/branch/git status。若HEAD不同，先做受影响文件差异核对，
   不强制checkout旧SHA，不覆盖未提交改动。独立worktree仅在有权创建时使用。
3. 核实本阶段M/A/D文件路径，新增文件先查重。只修改批准清单。
4. 编写能覆盖真实缺口的失败测试；不得用mock invoke掩盖preload断链，
   不得用fixture token或about:blank/fake容器当真实验收。

实现边界：
- 保留Local Pi、历史数据、trusted Cordis/renderer插件与现有slots。
- 不建立第二份Scope/Session/Event/Error/PluginManifest契约。
- Runtime只按会话绑定路由；未知能力明确拒绝，不自动换引擎。
- Renderer不得得到token；新身份不与旧主体混用；迟到响应必须epoch校验。
- 不复制用户其他项目范围外源码，不改不相关业务，不更新依赖凑通过。
- 未授权不执行付费模型、真实身份/业务写入、production部署、push或PR。

交付：
逐文件diff说明；实际运行的测试与结果；所有Acceptance逐条证据；
fixture/真实环境分列；回滚步骤；已知限制。失败测试不能删掉或放宽断言。
发现范围外阻断只登记，不顺手重构整个壳。
```

## 8. 可直接交给 Codex 的独立审阅提示词

```text
对 <TaskId> 的变更做独立只读review，先不改实现。
以实际baseline SHA、Task spec、专项REQ和本迁移计划核对；不能相信实现者摘要。

重点复核：
- 从真实App入口到preload/Main/Adapter/Gateway是否全链接线；是否有死代码/孤立组件。
- session/runtime/run/scope/identity epoch是否一致；是否仍有旧路径绕过。
- logout/cancel/origin-change之后迟到响应、重复/乱序event、重启恢复是否正确。
- receipt与终态、signal与真正服务端取消、fixture与实际服务是否被混淆。
- 公开package exports是否有效，依赖闭包是否能构建，Renderer是否引入Node/secret。
- 插件manifest/owner/dispose/tenant release key/动态ACL与第三方隔离是否完整。
- Local Pi和旧插件能力有无回归；撤权、跨租户、空权限默认拒绝是否真实验证。

只报告有证据的问题：文件+行号、触发条件、影响、最小修复、应补测试。
证据不足标待验证，不把静态风险写成已利用漏洞。
实际重跑批准范围内的测试，记录命令和结果，不用“看起来通过”。
不能用真实业务文件/凭据/外网模型补验收，除非有该任务明确授权。
最后给出：阻断项、非阻断项、未验证项、是否满足该Task退出门槛。
```

## 9. 验收矩阵：先证明正确，再测性能与成本

| AC | 场景 | 必须观察的事实 | 测试层 |
|---|---|---|---|
| AC01 | Runtime设置 | renderer→preload→main真实可达；未知通道拒绝 | Electron集成 |
| AC02 | Pi离线会话 | 两轮/工具/附件/取消/历史行为不退化，不联网上传历史 | 本地+Electron |
| AC03 | Hermes多轮 | create一次；send/stream/cancel同SessionRef，非本地UUID | 合同+staging |
| AC04 | 切默认Runtime | 旧run不迁移，新session采用新默认；无静默failover | 集成 |
| AC05 | cancel race | accepted仅pending；与completed竞态最终只一终态 | 单元+集成 |
| AC06 | 断流/恢复 | seq去重、gap/snapshot、410处理、重启cursor恢复 | 合同+staging |
| AC07 | 权限/审批 | approval绑定actor/scope/digest/期限；不能靠客户端approved绕过 | 安全+staging |
| AC08 | 登录退出竞态 | 迟到exchange/refresh/context不恢复任何旧态 | deferred单元+Electron |
| AC09 | 双身份/切租户 | 新A不能借旧B凭据；旧订阅/面板/缓存立即失效 | 集成 |
| AC10 | stale/403/offline | 展示缓存与执行授权分开；企业拒绝与本地匿名策略明确 | 单元+后端联调 |
| AC11 | 真实Shell | 打包App可选择合法workspace/instance并进入统一Chat | Electron E2E |
| AC12 | 九路隔离 | list/id/search/cache/event/download/tool/approval/member均按scope | 后端+E2E |
| AC13 | 插件owner | 双插件同slot，disable一个另一个不受影响；调用中撤权 | 单元+Electron |
| AC14 | Manifest/包导出 | 公共exports能import，受支持surface协商成功、不支持显式失败 | package合同 |
| AC15 | 受限UI | 实际包加载，origin/source/nonce校验，不能任意Electron API | 恶意fixture+Electron |
| AC16 | 容器隔离 | 无host secret/fs、受控网、CPU/memory/pid限额、超时真终止 | 隔离staging |
| AC17 | 安装恢复 | 跨tenant同内容不覆盖、同版本不可变、失败升级/重启/回滚可恢复 | 持久层+集成 |
| AC18 | 真实上游 | 固定Hermes版本、协议/能力矩阵、消息/取消/审批真实通过 | 授权staging |
| AC19 | 故障/构建 | clean build、正式入口、secretRef、readiness、限流与备份恢复 | 发布候选 |
| AC20 | 观测与性能 | trace关联且无密钥；同硬件/任务/模型测receipt、首字、完成p50/p95、失败率及token | 性能试点 |

已有D11的20并发、receipt p95≤1秒、RPO24小时/RTO4小时只能作待实测起点，不能提前称生产SLA。Jev是否省钱/加速不属于本次OpenBuddy迁移已验证结果；如后续接Jev，必须在同一统一运行链、同任务质量门槛下另做有/无Jev配对测试。

## 10. 回滚与发布约束

- 企业壳/远端Runtime采用明确flag和配置版本；关闭flag仅影响新入口/新session，不改写已有远端session owner。
- 升级先存版本映射、schema版本与receipt，验证后切指针；失败回退到旧代码/旧可兼容配置，但回退也要跑当前权限校验。
- 不删除审计、不抹receipt、不归零幂等状态、不把物理删除当回滚。旧Pi本地历史默认保留原位，不自动上传。
- 外部服务迁移需可恢复DB策略；破坏性schema变更单独批准与演练。
- 第三方backend未拿到真实隔离证据前保持拒绝；无auth/未知scope不使用测试身份兜底。
- 本轮交付仅文档与审计证据。任何实现、真实服务调用、凭据配置、发布动作在对应实施任务中单独明确范围。

## 11. 首个实施任务建议

先做 **AUD-00基线 + AUD-01身份epoch/迟到响应测试**，然后 **AUD-02 IPC真实可达性**。不要先把Runtime切换按钮放通就开放给用户：否则会暴露尚未修复的多轮映射、取消和附件跨引擎问题。

首个小任务的最小交付：两项可复现的迟到响应失败测试、epoch修复、logout本地先失效与有界网络清理、相关回归、真实失败与通过记录。其余重构保持在后续Task，避免一个大补丁同时改登录、会话、插件和企业目录。


## 12. 核心固定源码证据

- [src/App.tsx](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/src/App.tsx)
- [electron/preload/index.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/preload/index.ts)
- [electron/main/ipc/prompt-cycle.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/ipc/prompt-cycle.ts)
- [packages/runtime-adapters/src/session-chat.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime-adapters/src/session-chat.ts)
- [electron/main/identity/identity-service.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/identity/identity-service.ts)
- [electron/main/backend-auth/backend-auth-service.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/electron/main/backend-auth/backend-auth-service.ts)
- [packages/runtime/openbuddy-runtime-adapter/src/types.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-runtime-adapter/src/types.ts)
- [packages/runtime/openbuddy-plugin-host/src/enterprise-broker.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-plugin-host/src/enterprise-broker.ts)
- [packages/runtime/openbuddy-plugin-sdk/src/compatibility.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/runtime/openbuddy-plugin-sdk/src/compatibility.ts)
- [packages/ui/openbuddy-ui-enterprise/src/plugin-surface.tsx](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/packages/ui/openbuddy-ui-enterprise/src/plugin-surface.tsx)
- [services/enterprise-plugin-registry/src/catalog.ts](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/services/enterprise-plugin-registry/src/catalog.ts)
- [docs/roadmap/ledger.md](https://github.com/loudon84/open-buddy/blob/1a4bf84160e368206c5582ce96e0bb00ff21740c/docs/roadmap/ledger.md)
