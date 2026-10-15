---
change_type:
- ARCHITECTURE_CHANGE
prd_id: SMC-OE-RUNTIME-SDK-001
product: smc-copilot Enterprise Agent OS
status: APPROVED_FOR_PLAN
title: Runtime Adapter SDK Interface Design v1.0
version: 1.0
---

# 1. 一句话目标

定义统一 Agent Runtime Adapter SDK，使 Desktop 可以连接
Hermes、Pi、Nanobot、QwenClaw 等不同运行时。

# 2. Architecture Boundary

``` text
Desktop Shell

   Runtime Manager

        Runtime Adapter

             Agent Runtime
```

# 3. Runtime Adapter Contract

## REQ-RUNTIME-001

所有 Runtime MUST 实现：

``` typescript
interface RuntimeAdapter {

 id:string;

 name:string;

 start():Promise<void>;

 stop():Promise<void>;

 health():Promise<RuntimeHealth>;

 chat(request):Promise<RuntimeResponse>;

 capabilities():Promise<Capability[]>;

}
```

# 4. Runtime Types

支持：

``` text
local_process
remote_gateway
container
embedded
```

# 5. Hermes Adapter

目标：

``` text
OpenBuddy

   HermesAdapter

       localhost:8642

          hermes-agent
```

职责：

-   Gateway 连接。
-   Health Check。
-   SSE Chat。
-   Capability Discovery。

# 6. Pi Adapter

职责：

-   Embedded Runtime。
-   本地开发模式。
-   快速测试。

# 7. Remote Runtime Adapter

支持：

``` text
Desktop

   HTTPS

      Remote Agent Gateway
```

能力：

-   Token Authentication。
-   Streaming。
-   Session Binding。

# 8. State Machine

``` text
UNINITIALIZED

 INIT

READY

 START

RUNNING

 ERROR

STOPPED
```

# 9. Acceptance

A-001:

Hermes Runtime 可启动。

A-002:

Pi Runtime 可切换。

A-003:

Remote Runtime 可以连接。
