---
branch: roadmap/enterprise-agent-os
change_type:
- ARCHITECTURE_CHANGE
- BROWNFIELD_CHANGE
prd_id: SMC-OE-AOS-FILE-001
product: smc-copilot Enterprise Agent OS
repository: github.com/loudon84/open-buddy
status: APPROVED_FOR_PLAN
title: OpenBuddy Enterprise Agent OS 文件级改造清单 v1.0
version: 1.0
---

# 1. 一句话目标

让 OpenBuddy 从单一 Agent Desktop 演进为 Enterprise Agent OS
Desktop，通过 Runtime Adapter、Plugin Platform、Browser Platform
三个基础能力实现企业级扩展。

# 2. Current State

当前系统已有 Electron Shell、React Renderer、Preload IPC、Main
Process、Agent Runtime 集成能力。

主要问题：

-   Desktop 与 Runtime 耦合。
-   Plugin 扩展缺少企业级生命周期。
-   Browser 能力未形成平台层。

# 3. Scope

## In Scope

-   Runtime Adapter 文件改造。
-   Plugin SDK 文件改造。
-   Browser Platform 文件改造。
-   IPC Contract 扩展。

## Out of Scope

-   不重写 Agent Runtime。
-   不合并 Hermes/Pi Runtime 源码。
-   不开发新的 LLM Gateway。

# 4. Target Repository Structure

``` text
open-buddy

apps/
  desktop/

packages/
  runtime-core/
  runtime-adapters/
  plugin-sdk/
  plugin-platform/
  browser-platform/
  capability-sdk/

plugins/
  hermes-runtime/
  crm-plugin/
  knowledge-plugin/
```

# 5. File Level Change Plan

## 5.1 Electron Main

新增：

``` text
electron/
 src/main/runtime/
   runtime-manager.ts
   runtime-registry.ts
   runtime-health.ts

 src/main/plugins/
   plugin-loader.ts
   plugin-registry.ts

 src/main/browser/
   browser-manager.ts
   browser-session.ts
```

职责：

-   管理 Runtime 生命周期。
-   管理 Plugin 生命周期。
-   管理 Browser Session。

# 6. Renderer Changes

新增：

``` text
src/renderer/screens/runtime/
src/renderer/screens/plugins/
src/renderer/screens/browser/
```

页面：

-   Runtime Manager
-   Plugin Center
-   Browser Center

# 7. Package Changes

新增：

``` text
packages/runtime-core

packages/runtime-adapters

packages/plugin-sdk

packages/browser-platform
```

# 8. Acceptance

A-001:

可以注册 Hermes Adapter。

A-002:

可以切换 Pi/Hermes Runtime。

A-003:

可以安装并加载 Plugin。

A-004:

Browser Platform 可以创建 Session 并执行 Action。

# 9. Evidence

必须提供：

-   Runtime health 输出。
-   Plugin manifest。
-   Browser action execution log。
