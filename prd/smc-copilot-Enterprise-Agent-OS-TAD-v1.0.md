# smc-copilot Enterprise Agent OS 总体技术架构设计 TAD

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. Architecture Baseline
<a id="REQ-T01"></a>
**REQ-T01**：OpenBuddy HEAD `2dd37e9eaa8c35496846883c0c47b60153f9ddfb`为扫描时静态快照；独立核验时目标HEAD已由外部推进至`0b011f9d59ef4e808ea530206cc15555eaf88153`。P0-01实施前必须刷新HEAD、dirty清单及相对快照差异，更新证据并保留外部改动。真实Shell在`electron/`与`src/`，保留现有pnpm/moon monorepo。Work只提供本地客户端迁移参考，源HEAD与限制见迁移PRD。扫描未运行测试/构建；下述内容是目标设计和待实施验收。

架构职责：Client Shell（交互/IPC/UI slots）→ Control Plane（runtime选择、workspace/session/task目录）→ Runtime Adapter（Local Pi或Remote Hermes）；远端adapter→项目Agent Gateway兼容桥→外部Hermes执行服务。Business Plugin通过host/broker注册工具/UI；Plugin Host与Runtime并列，不是每条聊天都经过Plugin Runtime的串联节点。

## 2. 服务所有权与持久化
<a id="REQ-T02"></a>
**REQ-T02**：

- Desktop主进程拥有本地Pi、preload权限桥、credentialRef和browser进程；renderer不拥有密钥、Node或upstream client。
- Workspace service拥有tenant/workspace/membership/agent目录、Artifact ACL和Task业务字段；OIDC provider拥有身份，服务复用现有Casdoor边界而非重复登录系统。
- Agent Gateway拥有remote session/run路由、幂等receipt、事件日志/游标、approval；外部Hermes拥有执行/skills/MCP/memory。Gateway上游能力不足时降级/阻塞，不造假完成状态。
- Plugin Registry拥有package/trust/grant，Plugin Worker拥有受限backend执行；UI third-party是受限surface。业务数据由Knowledge/CRM/ERP/BI连接器权威服务拥有。
- 首期服务端持久化推荐PostgreSQL事务存储+对象存储，迁移、备份/恢复和tenant边界在服务端验收；桌面维持SQLite/JSONL。外部服务已有存储由其管理，不强行迁库。

Workspace目录projection消费Gateway事件并幂等更新；无跨服务同步双写事务。TraceId和scope贯穿授权/调用/事件/产物。D03确定部署环境与外部Hermes版本，D01/D02确定身份/数据政策，未定不能进企业生产。

## 3. 唯一契约与目录
<a id="REQ-T03"></a>
**REQ-T03**：Runtime SDK负责统一类型、Gateway Spec负责HTTP/SSE、Workspace PRD负责授权和实体、Plugin SDK负责manifest/注册。目录唯一来源[Monorepo设计](OpenBuddy-Enterprise-Fork-Monorepo目标目录设计-v1.0.md#REQ-D01)。不把业务代码放core；不创建与现有包功能重复的抽象壳；不搬整个app或锁文件。

## 4. 安全及运维
<a id="REQ-T04"></a>
**REQ-T04**：信任边界为renderer→main、client→service、plugin→broker、gateway→upstream、外部文档/页面→model。每层schema验证、scope复核、最小capability、timeout/cancel和audit。prompt注入靠数据/指令隔离与工具授权约束，不能声称字符串过滤可以彻底解决。来源内容不能自主修改系统策略或获取秘密。

Gateway/Workspace/Registry/Worker部署必须含独立secret注入、TLS、非root、DB migration、health/readiness、备份恢复、限流/配额、trace/log/metrics、告警和回滚runbook；禁止把桌面自动启动本地Hermes等同远端部署。服务版本、schema版本、plugin协议版本的兼容矩阵随发布保存。

## 5. 非功能验收
<a id="REQ-T05"></a>
**REQ-T05**：强制门槛为跨tenant泄漏0、令牌/秘密入renderer与日志0、取消单终态、幂等无重复业务写、未授权plugin拒绝、scope cache撤权失效、旧Pi会话可用。性能/规模是推荐试点基线而非业务SLA：受控同区域环境20并发会话，Gateway接收receipt p95≤1秒（不含模型生成）；10分钟断续网络注入无重复消息；24小时事件/幂等保留窗口可配置并暴露；备份演练RPO≤24小时/RTO≤4小时。D11须确认硬件、数据量、region和目标值后作为生产release gate。

Local UI回归预算建议相对同机基线启动/内存不增加超过20%，测量脚本、版本、fixture与报告入库；若超预算附决策/优化而非隐瞒。任何性能测试未执行都标未验证。
