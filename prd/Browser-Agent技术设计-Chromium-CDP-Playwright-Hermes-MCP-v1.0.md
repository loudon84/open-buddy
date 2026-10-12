# Browser Agent 技术设计：Chromium / CDP / Playwright / Hermes MCP

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 执行拓扑
<a id="REQ-BT01"></a>
**REQ-BT01**：`Remote Hermes → Agent Gateway → tool invocation broker → desktop authenticated executor → Browser Runtime → Chromium`；Playwright经受限CDP连接管理context/page，DOM Context转换成带revision的可引用数据。Browser Plugin只定义工具/UI，宿主掌管进程/凭据/授权。反向executor通道使用租户/设备绑定短期认证，首期可复用项目受控SSE命令与HTTPS回报；执行命令带invocationId/expiry，回报幂等，断线需ack/对账，不能把CDP端口穿透公网。

工具名字、输入输出、审批/状态模型唯一来源[Browser PRD REQ-B02–B05](PRD-Browser-Agent-Platform-v1.0.md#REQ-B02)。MCP wrapper只做schema/授权映射，不另实现一套绕权工具。

## 2. Browser Runtime和Context Layer
<a id="REQ-BT02"></a>
**REQ-BT02**：推荐独立Chromium自动化进程与app renderer分离；采用与生产Playwright锁定版本匹配的浏览器，Phase4B验证发行许可、下载离线供应、Windows打包大小和升级兼容。若采用Electron内嵌Chromium，须提供同等隔离/兼容证据后ADR替换，不默认其CDP兼容。

CDP仅绑定受限本机通道/随机端口，服务端无法直接访问；profile临时目录权限只给应用用户，每scope/session独立。Browser Runtime负责启动、健康、超时、资源限额、关闭；Context Layer保留页面revision、元素引用、navigation history摘要和cookie隔离，不在共享core保存站点业务数据。

## 3. DOM到工具
<a id="REQ-BT03"></a>
**REQ-BT03**：提取可访问性树/可见DOM，裁剪体积、遮盖密码/令牌字段，给elementRef生成当前页面局部索引。工具调用先验证scope/context/page/revision/权限/approval再执行；结果记录navigation变化并递增revision。无通用evaluate/任意JS工具。截图转Artifact走Workspace ACL；模型只能获得已授权图片引用。

## 4. 验证与降级
<a id="REQ-BT04"></a>
**REQ-BT04**：网络边界/恶意DOM/进程泄漏/跨tenant cookie/cancel与click竞态有自动化fixture；Browser包未安装或版本不匹配时capability=false且UI可解释失败。保留原BrowserPreview只读预览。一次写调用状态 `received→authorized→executing→succeeded|failed|unknown`；unknown必须对账/用户确认，不自动重放。推荐fixture动作p95<3秒不含站点网络/模型耗时，实际阈值与硬件按D11验证。
