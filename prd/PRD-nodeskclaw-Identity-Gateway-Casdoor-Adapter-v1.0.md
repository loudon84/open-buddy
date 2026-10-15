# nodeskclaw Identity Gateway + Casdoor Adapter Integration PRD v1.0

## 1. 项目目标

基于现有 nodeskclaw-backend member user 体系增加 Casdoor Adapter。

原则：

不替换原用户体系。

## 2. 保留能力

保持：

-   member user
-   workspace member
-   role
-   permission
-   agent ownership

## 3. 新增 identity_binding

字段：

-   member_user_id
-   provider
-   provider_user_id
-   provider_org
-   last_login_at

关系：

Casdoor User -\> identity_binding -\> member user

## 4. 新增路由

    /api/identity/casdoor/login
    /api/identity/casdoor/callback
    /api/identity/providers
    /api/identity/unbind

## 5. Adapter模块

    identity/

    provider.py

    casdoor_adapter.py

    mapping_service.py

    token_exchange.py

## 6. 登录流程

User -\> Gateway -\> Casdoor -\> Mapping -\> member user -\> SMC JWT

## 7. 原功能影响

无影响：

-   原账号密码登录保持
-   原JWT保持
-   原权限保持

新增：

Casdoor作为额外登录入口。

## 8. 验收

-   已有member user无需迁移
-   Casdoor账号可绑定member user
-   OpenBuddy通过Gateway登录
-   Hermes可验证SMC Token
