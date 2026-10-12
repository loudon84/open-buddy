# Enterprise Plugin Marketplace Architecture

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 分发范围
<a id="REQ-MK01"></a>
**REQ-MK01**：Phase3交付企业私有Registry与管理界面，支持第一方和已审核第三方包；公开Marketplace、支付结算、开放发布者入驻列入年度后候选D09。保留原生态目标，不能把公开平台排入无预算的首期承诺。

## 2. 拓扑与包信任
<a id="REQ-MK02"></a>
**REQ-MK02**：Registry管理元数据/不可变package blob/approval/撤销列表；Host查询并校验后交给plugin runtime，执行位置按宿主isolationProfiles决定。拟建 `services/enterprise-plugin-registry`，对象存储以tenant/channel/plugin/version/hash分区；不是新增apps/runtime等空壳目录。

目标接口 `GET /v1/plugins?channel&cursor`、`GET /v1/plugins/{id}/versions/{version}`、`POST /v1/plugin-installations`、`POST /v1/plugin-installations/{id}/actions`，返回 `{installationId,pluginId,version,state,grantRevision}`；动作install/enable/disable/upgrade/rollback/uninstall。发布 `POST /v1/plugin-releases` 先进入pending审核，审批与上传者默认分离，最终审批主体D09确认。服务器校验tenant可见性和publish/install/admin权限。

签名工程选择Ed25519；`integrity.json`包含排序的相对路径、size、SHA-256及canonical manifest hash；signature envelope含算法、keyId、publisher、signedAt、integrity hash和signature。信任根由企业admin分发，吊销在安装/启用/更新时重新验证；私钥只在受控签名服务/CI secret，不能随app发布。验签与解压校验任何失败均fail closed。

## 3. 生命周期
<a id="REQ-MK03"></a>
**REQ-MK03**：沿[平台REQ-P04](PRD-Enterprise-Plugin-Framework-SDK-v1.0.md#REQ-P04)的原子升级/回滚；lockfile保存版本+hash+grantRevision，防依赖漂移。升级脚本不可任意访问DB，数据迁移通过版本化storage broker；先备份再迁移，降级不兼容则恢复旧快照或停止而不是损坏数据。撤销紧急禁用保留审计，卸载不默认删业务数据。

## 4. 验收
<a id="REQ-MK04"></a>
**REQ-MK04**：批准包可按tenant可见性安装；未批准/签名篡改/吊销key/越权版本/zip路径逃逸被拒绝。升级崩溃仍可启用旧版，撤销所有注册；D02数据政策决定卸载清理。Knowledge/CRM/Browser/BI是后续真实包，Phase3以fixture覆盖流程。
