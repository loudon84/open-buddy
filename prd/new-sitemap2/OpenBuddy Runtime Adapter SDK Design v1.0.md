# OpenBuddy Runtime Adapter SDK Design v1.0

## 1. 目标

定义 OpenBuddy 与 Agent Runtime 的标准连接协议。

支持：

-   Hermes
-   Pi
-   Remote Runtime

## 2. Runtime Adapter Interface

``` typescript
interface RuntimeAdapter {
  connect(): Promise<void>;

  sendMessage(
    sessionId:string,
    message:string
  ): Promise<void>;

  stream(
    callback:(event:any)=>void
  ):void;

  stop():Promise<void>;

  status():Promise<RuntimeStatus>;
}
```

## 3. Hermes Adapter

负责：

-   Gateway 连接
-   SSE Stream
-   Session 映射

不负责：

-   Hermes 安装
-   Hermes 生命周期管理

## 4. Pi Adapter

负责：

-   Pi Runtime 调用
-   Tool Event 转换
-   Session Bridge

## 5. Remote Runtime Adapter

支持：

-   企业 Agent Gateway
-   云端 Agent
-   多租户 Runtime

## 6. 状态模型

``` text
DISCONNECTED
CONNECTED
RUNNING
ERROR
STOPPED
```
