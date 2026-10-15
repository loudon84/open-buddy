---
change_type:
- ARCHITECTURE_CHANGE
prd_id: SMC-OE-PLUGIN-SDK-001
product: smc-copilot Enterprise Agent OS
status: APPROVED_FOR_PLAN
title: Enterprise Plugin SDK Design v1.0
version: 1.0
---

# 1. 一句话目标

建设类似 VS Code Extension / Cursor Plugin 的企业 Agent Plugin 平台。

# 2. Plugin Architecture

``` text
Plugin Marketplace

        |

Plugin Runtime

        |

Capability Registry
```

# 3. Plugin Manifest

示例：

``` json
{
"id":"crm-plugin",
"version":"1.0",
"type":"enterprise",
"permissions":[
 "browser",
 "network"
],
"capabilities":[
 "tool",
 "ui",
 "connector"
]
}
```

# 4. SDK Contract

Plugin MUST 支持：

``` typescript
registerTool()

registerCommand()

registerUI()

registerConnector()

registerMCP()
```

# 5. Lifecycle

``` text
Installed

Loaded

Activated

Running

Disabled

Removed
```

# 6. Permission Model

权限类型：

``` text
filesystem

network

browser

credential

business-api
```

所有权限必须声明。

# 7. UI Extension

支持：

``` text
Sidebar

Panel

Toolbar

Chat Action

Settings Page
```

# 8. Backend Connector

支持：

-   CRM。
-   ERP。
-   Email。
-   Knowledge。
-   OA。

# 9. Security Boundary

Plugin：

MUST NOT:

-   直接访问 Electron Node API。
-   绕过 Permission Manager。
-   修改 Core Runtime。

# 10. Acceptance

A-001:

第三方 Plugin 可以安装。

A-002:

Plugin 可以注册 Tool。

A-003:

Plugin UI 可以动态加载。

A-004:

权限拒绝时必须阻断执行。
