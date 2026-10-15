# OpenBuddy Plugin Framework SDK Design v1.0

## 1. 定位

OpenBuddy Plugin Framework 类似：

-   VS Code Extension
-   Cursor Plugin

插件提供：

-   UI
-   Tool
-   Connector
-   Setting
-   Permission

## 2. Plugin Model

``` text
Plugin

├── manifest.json
├── frontend/
├── backend/
├── tools/
└── permissions/
```

## 3. Manifest

``` json
{
"name":"example",
"version":"1.0",
"permissions":[
 "workspace.read",
 "runtime.tool"
]
}
```

## 4. 扩展能力

插件可以：

-   注册页面
-   注册工具
-   注册 MCP Connector
-   添加设置项

插件不能：

-   修改 Runtime Core
-   绕过权限
-   读取未授权数据

## 5. 生命周期

``` text
Install
 |
Enable
 |
Load
 |
Execute
 |
Disable
 |
Remove
```
