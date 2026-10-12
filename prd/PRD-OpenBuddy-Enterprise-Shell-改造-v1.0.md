# OpenBuddy Enterprise Shell 改造 PRD

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 产品目标与实际起点
<a id="REQ-S01"></a>
**REQ-S01**：保留Electron Desktop、本地Pi与现有UI slots，增加Runtime选择、企业Workspace、Plugin UI、Browser容器。现有OpenBuddy已具备Casdoor/permission/plugin host等基础，不再称其完全没有企业/插件能力；但完整remote workspace和企业插件治理尚待实施。Web/Mobile保留可复用契约目标，首年不交付客户端成品。

## 2. 交互与技术边界
<a id="REQ-S02"></a>
**REQ-S02**：`Renderer UI → preload DTO bridge → main runtime/workspace coordinator → Local Pi 或 Hermes Gateway`；Plugin Host经独立extension broker挂接UI/tool，不在每条Agent消息链中串行执行。原“Adapter→Plugin Runtime→Gateway”串联图取消。

Workspace导航显示tenant/workspace/agent/runtime/session/task/artifact；tenant切换先处理活跃run/dirty draft，再撤销旧订阅、清cache、加载新scope。runtime切换新建会话，明确当前会话运行环境。断线展示stale/offline/reconnecting，不把accepted当completed；取消/权限提问/审批有可操作状态与失败提示。

## 3. Extension与Command System
<a id="REQ-S03"></a>
**REQ-S03**：可信UI插件按`packages/ui/AGENTS.md` Slot-only与apply注册；第三方受限UI只通过broker注册菜单/面板/route，不能执行任意Electron API。统一command registry以pluginId命名空间和Disposable管理，快捷键触发仍检查permission/scope；禁用插件撤销command/视图。

## 4. 实施阶段与验收
<a id="REQ-S04"></a>
**REQ-S04**：统一映射Phase0边界设计；Phase1运行时/流/旧Pi；Phase2企业Workspace；Phase3插件；Phase4业务。每段退出见roadmap。验收包括旧Pi无网会话、远端Hermes消息/流/取消、切tenant不串数据、第三方面板动态启停、无效凭据返回登录态而不暴露token；Electron smoke覆盖实际壳，不仅React单测。
