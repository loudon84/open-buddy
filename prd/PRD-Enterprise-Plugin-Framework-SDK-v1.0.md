# Enterprise Plugin Framework SDK PRD

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 基线与边界
<a id="REQ-P01"></a>
**REQ-P01**：扩展已有 `openbuddy-plugin-host` loader/registry/lifecycle/security 与UI slot runtime，保持可信 `apply(ctx)` 兼容。现有 `openbuddy-plugin-sdk` 主要是manifest serializer/Pi ExtensionFactory输出；新增企业SDK功能不能声称原包已完整具备。Core只含生命周期/事件/权限等基础设施；Knowledge/CRM/BI/Browser/Ontology业务位于plugins。

## 2. Manifest与能力协商
<a id="REQ-P02"></a>
**REQ-P02**：唯一manifest/schema/SDK签名见[SDK规范](Enterprise-Plugin-SDK开发规范-v1.0.md#REQ-SDK01)。必填id、name、semver version、apiVersion、publisher、entry、permissions、dependencies、capabilities；每permission分read/write/admin且描述用途；域名/路径等资源限制放grant配置，禁止仅有字符串就当已授权。

host公布sdkVersion、supportedSurfaces、isolationProfiles和capabilities；安装前验证版本/依赖DAG/平台/完整性/签名/批准权限；不支持的backend或sandbox不能静默降级。循环依赖和重复command/tool id拒绝且不污染既有注册。

## 3. 隔离与调用链
<a id="REQ-P03"></a>
**REQ-P03**：可信第一方插件可保留现有in-process Cordis apply，仅用于已审核受信代码；权限声明本身不是沙箱。首期第三方插件须企业审核签名：UI在禁用Node且context-isolated的iframe/受限surface运行，消息走schema校验broker；backend放拟建 `services/enterprise-plugin-worker` 的受限容器（非root、只读rootfs、资源/超时限额、默认禁网、按grant broker访问服务）。不能用worker_threads或Node VM声称安全隔离。

不提供容器能力的host只允许declarative-only第三方包；需要backend的包安装明确失败。容器不可用时禁止回退主进程任意Node。秘密由宿主/服务端代理，不注入bundle；net/fs/process/credential都必须经broker限定scope。插件runtime与Agent runtime是并列基础设施，tool registry通过统一authorize桥接，不允许插件绕过Gateway。

## 4. 生命周期和分发
<a id="REQ-P04"></a>
**REQ-P04**：`discovered → verified → installed → enabled → disabled → removed`；upgrade在临时slot验证后原子切换，失败恢复旧bundle/registration/grants。新增权限先禁用新版本并重新批准。每次apply注册返回Disposable，deactivate撤销路由/tool/订阅；卸载数据删除必须显式选择并服从D02保留策略。安装目录阻止path traversal/zip bomb/symlink逃逸；签名覆盖规范化manifest+完整文件hash清单，hash不等于publisher可信。

首期企业内部Registry允许经管理员审核的第三方包，公开Marketplace商业运营后续D09；详见[Marketplace](Enterprise-Plugin-Marketplace-Architecture-v1.0.md#REQ-MK01)。

## 5. 验收
<a id="REQ-P05"></a>
**REQ-P05**：Phase3用无业务后端的fixture plugin验收安装/启停/注册/卸载/升级回滚/签名/版本/权限拒绝/恶意包隔离；真实Knowledge属于Phase4A，不能用未建Knowledge阻塞平台基本验收。至少一个第三方受限UI包实际动态加载；backend容器fixture试探宿主文件、网络、秘密被拒绝；无容器host拒装backend并给出可理解原因。旧可信Pi扩展和UI slots回归通过。
