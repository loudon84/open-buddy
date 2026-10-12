# OpenBuddy Casdoor Login Flow Integration Engineering PRD v1.2

## 0. Document Metadata

| Item | Value |
| --- | --- |
| PRD ID | SMC-IDG-OPENBUDDY-001 |
| Version | v1.2 |
| Status | APPROVED_FOR_PLAN |
| Project | smc-copilot Enterprise Agent OS |
| Component | OpenBuddy Desktop |
| Backend contract | nodeskclaw `PRD-nodeskclaw-backend-Identity-Gateway-Casdoor-Adapter-Engineering-v1.2` |

本文描述桌面如何接入已经落地的 nodeskclaw-backend 身份网关。桌面不实现第二套 PKCE，也不直接连接 Casdoor。

------------------------------------------------------------------------

# 1. Background

```
OpenBuddy Desktop
        |
nodeskclaw-backend
        |
Casdoor Adapter
```

Casdoor 是 backend 使用的 OIDC 身份源。成员记录在 backend 的 `users` 中。桌面只配置 backend 根地址，只保存 backend 的 `LoginResponse`。

这次登录只替换左下角账户。`LoginResponse` 与邮箱登录同形。它不写入原有 Casdoor 会话，也不满足企业运行时的登录检查。企业运行时、租户成员和设置里的账户管理仍读取原有 Casdoor 会话。

backend 根地址与 `OPENBUDDY_ENTERPRISE_GATEWAY_URL` 是两项独立配置。根地址不读取环境变量。

------------------------------------------------------------------------

# 2. Scope

## In scope

- 登录框与设置中的 backend 根地址
- 系统浏览器登录与本机 `return_to` 回调
- `POST /api/v1/auth/casdoor/exchange`
- 主进程会话、刷新与退出
- 左下角账户的显示名、门户说明和退出

## Out of scope

- 桌面 PKCE、`state`、`code_verifier`
- 桌面直接访问 Casdoor
- 用户注册、组织设置页、修改密码页、解除绑定
- 把 `LoginResponse` 接入 `casdoorAuth` 或企业运行时
- 短信登录、微信登录
- Mobile / Web 客户端实现。backend 流程可供它们以后复用，本文件不规定其界面

------------------------------------------------------------------------

# 3. Architecture

```
Renderer
   |  显示名、登录状态、两个标记、错误说明
   |  不接收令牌
IPC
   |
Main Process
   |  系统加密的 LoginResponse
   |  临时端口与兑换
SMC Backend API
```

新增会话逻辑放在 Electron 主进程，使用与 Casdoor 令牌不同的存储键。不在渲染进程的 `src/auth/` 下新增 `AuthManager`、`OAuthFlow`、`TokenStore` 或 `SessionManager`。

------------------------------------------------------------------------

# 4. Backend origin

登录框和设置中的「企业登录」读写同一份已保存的源。源只包含协议、主机和端口。

| 规则 | 结果 |
| --- | --- |
| 任意 `https` | 可保存 |
| `http` 且主机为 `127.0.0.1`、`localhost`、`10/8`、`172.16/12` 或 `192.168/16` | 可保存 |
| 未写端口 | `https` 按 443，`http` 按 80 |
| 末尾斜杠 | 去掉后保存 |
| 空地址 | 登录按钮不可用 |
| 带路径、查询、用户名或密码 | 不保存，登录按钮不可用 |
| 其他 `http` 主机 | 不保存，登录按钮不可用 |

合法源在输入框失焦、点击「登录」或关闭登录框时写入。点击「登录」时先写入，再打开浏览器。输入过程中不保存、不退出。非法内容不写入，已保存的地址保持不变。

设置里清空并失焦时，先向旧地址退出，再删除本地令牌。退出请求失败也删除本地令牌。等待回调期间，登录框里的地址不可编辑。要改地址，先取消这一轮，或到设置里修改。设置里的修改会取消当前轮次，并按上一句退出旧会话。

证书校验使用系统信任库。本功能不提供跳过证书校验的开关。

------------------------------------------------------------------------

# 5. Login flow

1. 用户在左下角未登录菜单点击「登录」。
2. 主进程确认系统加密可用，并在 `127.0.0.1` 绑定一个临时端口。
3. `return_to` 为 `http://127.0.0.1:<端口>/callback`。协议是 `http`，主机是 `127.0.0.1`，端口由系统分配，路径恰好是 `/callback`，没有用户信息、查询或片段。
4. 系统浏览器打开 `GET {源}/api/v1/auth/casdoor/login?return_to=`，`return_to` 按查询参数编码。backend 校验通过后 302 到 Casdoor。桌面自己不调用这个登录接口，也不读取 `authorization_url`。该接口的失败响应显示在系统浏览器中。
5. 监听最多保持 10 分钟。浏览器完成登录后打开 `return_to`。页面只显示「可以关闭此页面」，页面上不出现 `code` 或令牌。
6. 收到回调后先关掉端口，再处理参数。只有路径恰好为 `/callback`、且查询串里单独存在 `code` 时，才 `POST /api/v1/auth/casdoor/exchange`，请求体为 `{ "code": "..." }`。
7. 成功响应是 `ApiResponse`，其中 `data` 为 `LoginResponse`：`access_token`、`refresh_token`、`token_type`、`expires_in`、`user`、`needs_org_setup`、`provider`。Casdoor 令牌不到达桌面。

`user.name` 是侧栏显示名。`needs_org_setup` 在 `LoginResponse` 上，`must_change_password` 在 `user` 上。这两个标记只决定门户说明，不取消已登录状态。

------------------------------------------------------------------------

# 6. One login round

同一时间只有一轮可以保存登录结果。

| 事件 | 行为 |
| --- | --- |
| 系统加密不可用 | 不打开浏览器，不写令牌。登录框显示「系统加密不可用，无法登录。」侧栏保持未登录 |
| 端口绑不上 | 不打开浏览器，不向 backend 发登录请求。显示「登录未能开始，请重试。」 |
| 系统浏览器打不开 | 关掉监听。显示「无法打开系统浏览器。」不兑换 |
| 等待回调 | 登录框显示「请在系统浏览器中完成登录。」主按钮为「取消」，地址不可编辑 |
| 再次点击「登录」 | 作废上一轮，另开一轮 |
| 等待期间点击「取消」或关闭登录框 | 关掉监听并作废这一轮，不打开新的浏览器。侧栏保持未登录 |
| 兑换成功后点击「关闭」 | 只关闭对话框，会话保持已登录。此时若根地址与已保存值不同，先按修改根地址处理，退出并回到未登录表单 |
| 设置里改地址或清空地址 | 关掉监听，作废这一轮，再向旧地址退出并保存新值 |
| 10 分钟没有回调 | 关掉端口。显示「登录已超时，请重新登录。」 |
| 兑换请求尚未返回时发生上述作废 | 这一轮作废。晚到的响应丢弃，不保存令牌，不改变侧栏 |
| 兑换失败 | 显示错误。同一个 `code` 不再重试 |

只有单独的 `code` 才兑换。存在 `error` 时不兑换。`code` 与 `error` 同时存在时按 `error` 处理。没有单独 `code` 的回调都不兑换。

------------------------------------------------------------------------

# 7. Session

主进程用系统加密保存最近一次有效的 `LoginResponse`：访问令牌、刷新令牌、`user`（含 `must_change_password`）、`needs_org_setup` 和访问令牌到期时间。存储键与 Casdoor 令牌分开。渲染进程只收到 `user.name`、已登录或未登录、两个标记和错误说明。

启动时用已保存的 `refresh_token` 调用 `POST /api/v1/auth/refresh`，请求体为 `{ "refresh_token" }`。刷新完成前侧栏保持未登录。成功后再显示 `user.name`。失败则删除本地令牌并保持未登录。

窗口开着时，在访问令牌到期前 60 秒刷新一次。主进程每次要使用访问令牌时也检查有效期，包括退出。剩余不足 60 秒或已经过期，就先刷新。响应中的新令牌替换本地令牌。响应里若有 `user`，同时更新显示名和两个标记。不调用 `GET /api/v1/auth/me`。刷新失败则清空会话，侧栏回到未登录。

退出调用 `POST /api/v1/auth/logout`，并带上当前访问令牌，然后删除本地 `LoginResponse`。退出请求发不出去时，仍然删除本地令牌。不调用 `casdoorAuth.logout()`，也不调用 `DELETE /api/v1/auth/casdoor/binding`。

------------------------------------------------------------------------

# 8. UI

未登录菜单提供「登录」和「打开设置」。「登录」打开登录框。登录框只有 backend 根地址和一个主按钮。

兑换成功且 `needs_org_setup` 与 `must_change_password` 都为 false 时，立即关闭登录框。

任一标记为 true 时，侧栏立即显示已登录，登录框保持打开，主按钮改为「关闭」：

- `needs_org_setup`：「请到业务门户完成组织设置。」
- `must_change_password`：「请到业务门户修改密码。」

两个标记同时为 true 时，两句都显示。账户菜单副标题重复同一说明。

已登录菜单显示 `user.name`，并提供「退出登录」「打开设置」「发送反馈」。菜单里不放「账户管理」，也不从这里再发起登录。换账户先退出，再从左下角进入登录框。

说明还显示着时，如果设置里的根地址被修改或清空，退出完成后登录框回到未登录表单，门户说明去掉，侧栏变为未登录。

设置中的「企业登录」只放 backend 根地址。「账户管理」继续只配置原有 Casdoor，入口在设置内。

------------------------------------------------------------------------

# 9. Errors

浏览器回到 `return_to?error=` 时，按下表显示 backend 合同中的条件说明：

| 机器码 | 登录框说明 |
| --- | --- |
| `email_missing` | userinfo 没有邮箱 |
| `email_unverified` | 首次绑定且 `email_verified` 不是 JSON `true` |
| `member_not_found` | 没有匹配的可用成员 |
| `binding_conflict` | 成员已有另一条 Casdoor 绑定，或唯一索引冲突 |
| `org_missing` | 没有 `owner` |
| `account_disabled` | 已绑定用户停用，或绑定指向的用户已软删除、不存在 |
| `domain_not_allowed` | 当前成员邮箱不在白名单，或邮箱为空 |
| `login_expired` | 事务过期、state 已使用，或兑换码无效、过期、已使用 |
| `idp_failed` | 未配置、发现、换票、userinfo 失败，Casdoor 返回 error，缺少 code，或 `sub` 不是不可变用户 id |

机器码不在表中时显示「登录未完成」，并带上该机器码。

兑换、刷新和退出的失败直接显示 backend 的 `message`。已确定的文案包括「回调地址无效」「登录已失效，请重新发起登录」「企业单点登录未配置」。登录接口本身由系统浏览器打开，它的失败响应不在桌面登录框里解析。

日志不记录一次性 `code`、访问令牌、刷新令牌、`code_verifier` 或 client secret。

------------------------------------------------------------------------

# 10. Test plan

测试使用假的 backend HTTP。不连接真实 Casdoor，也不检查桌面是否生成 PKCE。

- 非法根地址不打开浏览器，也不覆盖已保存的合法源
- 合法 `return_to` 被交给登录接口，主机为 `127.0.0.1`，路径为 `/callback`
- 单独的 `code` 会兑换，成功结果写入主进程加密存储
- `error`、未知机器码，以及 `code` 与 `error` 同时存在时不兑换
- 取消、关闭登录框或改地址后，晚到的兑换响应被丢弃
- 启动时刷新完成前侧栏为未登录；刷新失败会删除本地令牌
- 退出调用 `POST /api/v1/auth/logout`；请求失败时本地令牌仍然删除
- 修改或清空根地址会先退出旧会话
- 渲染进程收到的状态不含令牌

------------------------------------------------------------------------

# 11. Acceptance criteria

AC-001：在只配置 backend 根地址时，桌面能完成企业登录并显示 `user.name`。

AC-002：登录框和「企业登录」设置不要求 Casdoor issuer、client ID、client secret 或 Casdoor 回调地址。

AC-003：兑换结果与邮箱登录相同，都是 backend 的 `LoginResponse`。该结果不接入 `casdoorAuth`，也不满足企业运行时的登录检查。

AC-004：登录、回调、兑换、刷新和退出都调用 backend 已有接口，桌面不持有 Casdoor 令牌。以后的 Mobile / Web 可以复用同一组 backend 接口。

------------------------------------------------------------------------

# 12. Release gate

- 第 10 节的假 backend 测试通过
- 会话恢复、刷新失败和退出测试通过
- 渲染进程与日志都不含令牌、一次性 `code` 或 client secret
