# OpenBuddy Enterprise Agent Shell Architecture v2.0

## 1. 文档定位

本文重新定义 OpenBuddy 当前 roadmap/enterprise-agent-os
分支后的目标架构。

OpenBuddy 不再定位为 Hermes Desktop，而定位为 Enterprise Agent Shell：

> 企业智能体工作入口、身份入口、能力编排入口。

## 2. 架构原则

OpenBuddy 负责： - 用户交互 - 身份连接 - Session - Workspace - Plugin
UI - Runtime 管理

OpenBuddy 不负责： - LLM 推理 - Agent Loop - Tool Runtime - Memory
Engine

Hermes 作为 Runtime Adapter 之一。

## 3. 总体架构

``` text
OpenBuddy Desktop
        |
        |
Capability Layer
        |
Runtime Adapter SDK
        |
+----------------+
| Hermes Runtime |
| Pi Runtime     |
| Remote Agent   |
+----------------+
```

## 4. 分层职责

### UI Layer

包含： - Chat - Workspace - Knowledge - Mail - Browser - Plugin Pages

### Capability Layer

包含： - MCP Client - Connector - Permission - Plugin SDK

### Runtime Adapter Layer

统一连接不同 Agent Runtime。

### Runtime Layer

外部执行： - Hermes Agent - Pi - Cloud Agent

## 5. 关键约束

MUST： - OpenBuddy 不实现 Agent Loop - Runtime 必须通过 Adapter 接入 -
Plugin 不修改核心 Runtime
