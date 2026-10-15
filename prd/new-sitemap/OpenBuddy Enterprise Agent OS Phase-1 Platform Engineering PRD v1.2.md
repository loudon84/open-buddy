
# smc-copilot OpenBuddy Enterprise Agent OS Phase-1 Platform Engineering PRD v1.0

## 文档元数据

```yaml
title: smc-copilot OpenBuddy Enterprise Agent OS Phase-1 Platform Engineering PRD
prd_id: SMC-OE-AOS-001
version: 1.0
status: APPROVED_FOR_PLAN
product: smc-copilot Enterprise Agent OS
repository: github.com/loudon84/open-buddy
branch: roadmap/enterprise-agent-os
change_type:
  - ARCHITECTURE_CHANGE
  - PLATFORM_EXTENSION
golden_consumer:
  - Cursor
  - Codex
  - AI Coding Agent
target_release:
  Phase-1
```

---

# 1. 一句话目标

让企业员工通过 OpenBuddy Desktop 在统一桌面入口中管理和使用不同类型 Agent Runtime、企业插件以及 Browser Agent 能力，同时保持 Desktop、Runtime、Plugin、Browser 四层职责隔离。

---

# 2. 背景与问题定义

## 2.1 Current State

当前 OpenBuddy 已具备：

```text
Electron Desktop
        |
        |
React Renderer
        |
        |
Preload IPC
        |
        |
Electron Main
        |
        |
Pi Agent Runtime
```

同时已有：

```text
Skills
MCP Connectors
Experts
Plugins
Enterprise Auth
```

能力基础。


## 2.2 Problem

当前架构存在以下限制：

### Runtime 强绑定

当前 Agent 执行路径：

```text
OpenBuddy
    |
    |
Pi Runtime
```

导致：

- Hermes-agent 无法作为标准 Runtime 接入；
- qwenclaw 无法接入；
- nanobot 无法接入；
- 企业无法按员工/部门选择 Runtime。


### Plugin 边界不足

当前 Plugin 更多偏能力扩展：

```text
Skill
MCP
Tool
```

缺少：

```text
Enterprise Plugin Lifecycle
Manifest
Permission
UI Extension
Backend Connector
Audit
```

能力。


### Browser 能力不足

企业 Agent 场景需要：

```text
CRM
ERP
OA
Email
BI
Web Automation
```

当前浏览器只是工具，不是平台。


---

# 3. Scope

## 3.1 In Scope

## SCOPE-001 Runtime Adapter Platform

实现：

```text
OpenBuddy Desktop

        Runtime Manager

             |
    -----------------
    |       |       |
 Hermes   Pi    Nanobot
 Runtime Runtime Runtime
```

支持：

- Runtime 注册
- Runtime 生命周期管理
- Runtime 配置
- Runtime 健康检查
- Runtime 切换


---

## SCOPE-002 Enterprise Plugin Platform

实现：

```text
Plugin Marketplace

        |
        |
Plugin Runtime

        |
        |
Capability Registry
```

支持：

- 插件安装
- 插件卸载
- 插件权限
- 插件 UI Extension
- Tool 注册
- MCP 注册
- Backend Connector


---

## SCOPE-003 Browser Agent Platform

实现：

```text
Browser Platform

       |
       |
Chromium Controller

       |
       |
Browser Skill

       |
       |
Agent Runtime
```

支持：

- 浏览器 Session
- 页面状态
- DOM Snapshot
- Action Execution
- 企业网站自动化


---

# 4. Architecture Boundary

## 最终目标架构


```text
                    smc-copilot Desktop


┌──────────────────────────────────────┐
│              React UI                │
│                                      │
│ Chat                                │
│ Runtime Manager                     │
│ Plugin Center                       │
│ Browser Center                      │
└──────────────────────────────────────┘


                 IPC


┌──────────────────────────────────────┐
│          Enterprise Shell            │
│                                      │
│ Runtime Manager                      │
│ Plugin Manager                       │
│ Browser Manager                      │
│ Permission Manager                   │
└──────────────────────────────────────┘



          Runtime Adapter Layer


 ┌──────────┐ ┌──────────┐ ┌──────────┐

 Hermes      Pi          Nanobot

 └──────────┘ └──────────┘ └──────────┘
```


---

# 5. Runtime Adapter Platform Design


## REQ-RUNTIME-001 Runtime Adapter Interface


## Goal

定义统一 Agent Runtime 接口。


## Requirement


MUST:

所有 Runtime 必须实现统一 Adapter。


接口：

```typescript
interface RuntimeAdapter {


id:string;


name:string;


type:string;


start():Promise<void>;


stop():Promise<void>;


health():Promise<RuntimeHealth>;


chat(request:RuntimeRequest)
:Promise<RuntimeResponse>;


listCapabilities():
Promise<Capability[]>

}
```


---

## Runtime 类型


```yaml
runtime:
  type:
    - local_process
    - remote_gateway
    - embedded
    - container
```


---

## Hermes Adapter


目标：

```text
OpenBuddy

    |
HermesAdapter

    |
localhost:8642

    |
hermes-agent
```


Hermes Desktop 架构本身也是 Electron Shell + Python Runtime 分离模式：

Renderer 不负责 Agent 推理，Runtime 属于外部 Python Backend。


---

## Pi Adapter


保留：

```text
Embedded Runtime
```


作为默认开发 Runtime。


---

# 6. Runtime Registry


新增：

```
packages/runtime-core

src/

runtime-registry.ts

runtime-adapter.ts

runtime-health.ts

runtime-config.ts

```


Registry：

```typescript
registerRuntime(
 adapter
)


getRuntime(id)


switchRuntime(id)
```


---

# 7. Runtime UI


新增：

```
Settings

  Agent Runtime

       Hermes Agent

       Pi Runtime

       Nanobot

       QwenClaw
```


显示：

|字段|说明|
|-|-|
|Name|Runtime名称|
|Version|版本|
|Status|状态|
|Endpoint|连接地址|
|Capabilities|能力|


---

# 8. Enterprise Plugin Platform


## REQ-PLUGIN-001 Plugin Manifest


插件必须声明：

```json
{
"id":"crm-plugin",

"version":"1.0",

"type":"enterprise",

"permissions":[
 "browser",
 "filesystem",
 "network"
],

"capabilities":[
 "tool",
 "ui",
 "connector"
]

}
```


---

# 9. Plugin Runtime


目录：

```
packages/plugin-platform


plugin-loader

plugin-registry

plugin-permission

plugin-ui

plugin-sdk

```


---

插件生命周期：

```
Installed

 ↓

Loaded

 ↓

Activated

 ↓

Running

 ↓

Disabled
```


---

# 10. Plugin Extension


支持：

## UI Extension


例如：

CRM 插件：

```text
Sidebar

Customer Panel

Quotation Panel

```


## Tool Extension


注册：

```typescript
plugin.registerTool()
```


## MCP Extension


注册：

```typescript
plugin.registerMCP()
```


---

# 11. Browser Agent Platform


## Architecture


```text

Browser Manager


        |

Electron BrowserView


        |

CDP Controller


        |

Playwright


        |

Agent Action

```


---

# 12. Browser Adapter Interface


```typescript
interface BrowserAdapter{


open(url:string)


click(selector:string)


type(
 selector:string,
 value:string
)


snapshot()


execute()

}
```


---

# 13. Browser Session


数据：

```json
{
"id":"crm-session",

"url":"https://crm.xxx.com",

"cookies":"encrypted",

"storage":"encrypted"

}
```


---

# 14. Browser Security


MUST:


浏览器能力必须经过：

```text
Permission Manager

        |

Approval

        |

Execution
```


禁止：

- Agent 自动登录未知网站；
- 未授权读取 Cookie；
- 未授权提交业务数据。


---

# 15. Repository Target Structure


最终调整：


```
open-buddy


apps/

 desktop/


packages/


 runtime-core/

 runtime-adapters/

 plugin-platform/

 browser-platform/

 enterprise-auth/

 capability-sdk/


plugins/


 hermes-runtime/

 crm-plugin/

 email-plugin/

 knowledge-plugin/


```


---

# 16. Migration Plan


## Phase-1 Runtime Platform


目标：

完成：

- Runtime Adapter Interface
- Runtime Registry
- Pi Adapter
- Hermes Adapter


验收：

```text
用户可以在 UI:

Pi Runtime

↓

切换

↓

Hermes Runtime

↓

正常 Chat
```


---

## Phase-2 Plugin Platform


目标：

完成：

- Plugin SDK
- Manifest
- Loader
- Permission


验收：

安装：

```
CRM Plugin
```

出现：

```
CRM Sidebar
CRM Tool
CRM Connector
```


---

## Phase-3 Browser Platform


目标：

完成：

- Browser Manager
- CDP
- Browser Action
- Session


验收：

Agent：

```
打开CRM

查询客户

生成报价

等待审批
```


---

# 17. Non Goal


本阶段禁止：

## NON-GOAL-001

不重新开发 Agent Runtime。


## NON-GOAL-002

不把 Hermes/Pi/Nanobot 代码合并进入 Desktop。


## NON-GOAL-003

不开发新的 LLM Gateway。


---

# 18. Acceptance


## A-001 Runtime

PASS:

```text
至少支持:

Pi

Hermes

两个Runtime
```


## A-002 Plugin

PASS:

```text
第三方插件可以:

安装

加载

卸载
```


## A-003 Browser

PASS:

```text
Agent 可以:

创建浏览器Session

执行页面Action

返回Evidence
```


---

# 19. Engineering Principle


最终 OpenBuddy 不再定位：

```text
AI Chat Desktop
```


而定位：

```text
Enterprise Agent Operating System Desktop
```


核心：

```text
Desktop Shell

+
Runtime Platform

+
Plugin Platform

+
Browser Platform

+
Enterprise Governance
```

这才与 smc-copilot 长期目标一致。