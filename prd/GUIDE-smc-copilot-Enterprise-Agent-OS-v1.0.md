# smc-copilot Enterprise Agent OS — Cursor/Codex Implementation Guide

> 修订日期：2026-10-12；文内修订版 v1.1，保留 v1.0 文件名以保持链接。状态：供 Cursor 实施的设计基线；本次仅完成文档，没有宣称功能已实现或测试已通过。业务待决项见[修订记录](PRD-审查与修订记录.md#decisions)，执行顺序见[roadmap](roadmap.md)。

## 1. 用途和目标
<a id="REQ-GUIDE01"></a>
**REQ-GUIDE01**：用于OpenBuddy二开实施计划，交付企业Desktop Client + Ekko Control Plane架构 + Hermes Execution Plane + Enterprise Plugins。首年与长期范围以[总体PRD](PRD-SMC-COPILOT-ENTERPRISE-AGENT-OS-v1.0.md#REQ-OS01)为准；本次是文档修订，不是功能完成。

## 2. 核心原则
Client与Runtime解耦不意味着删除本地Agent：首期必须保留Local Pi，通过Adapter并存Remote Hermes。Runtime管理execution/skills/MCP/memory/tool；Plugin管理Knowledge/CRM/BI/Browser/Ontology，host为公共基础设施；企业tenant/user/role/permission/audit/workspace作为贯穿边界。禁止UI直调Hermes、core导入业务、Plugin绕过Runtime授权、强绑单一runtime或模型。

## 3. 阅读与权威顺序
先读[TAD](smc-copilot-Enterprise-Agent-OS-TAD-v1.0.md)、[总体PRD](PRD-SMC-COPILOT-ENTERPRISE-AGENT-OS-v1.0.md)、[roadmap](roadmap.md)；再按task读Shell/Ekko/Gateway/Workspace/Plugin/Knowledge/Browser/CRM/BI/Ontology专项PRD与精确REQ锚点。Runtime SDK定义types，Gateway Spec定义HTTP/SSE，Workspace定义scope/授权，Plugin SDK定义manifest/注册，Monorepo定义路径，不能各写一套冲突接口。

原18份全部保留文件名并修订；缺口新增Workspace、CRM、BI专项PRD。所有来源/冲突决定与业务待决项见[修订记录](PRD-审查与修订记录.md)。

## 4. 阶段与优先级
<a id="REQ-GUIDE02"></a>
**REQ-GUIDE02**：唯一编号Phase0基础架构→Phase1 Runtime→Phase2 Workspace→Phase3 Plugin→Phase4业务。Phase4按4A Knowledge/FilePreview、4B Browser、4C CRM、4D BI、4E Ontology顺序；4A内部Knowledge接口先行、FilePreview后接，再RAG整体验收。相对月窗参考[12个月计划](OpenBuddy-to-smc-copilot-12个月Roadmap-v1.0.md)，资源/部署阻塞会顺延。

P0四主线是Runtime Adapter、Hermes Gateway Client、Workspace Manager、Plugin Runtime；Phase0统一契约，Phase1/2/3逐步实现，优先级不代表取消安全或依赖。Phase0输出Architecture Baseline；Phase1真实远端Hermes+Pi兼容；Phase2企业隔离；Phase3第三方受限加载；Phase4真实业务闭环。

## 5. 任务规范
<a id="REQ-GUIDE03"></a>
**REQ-GUIDE03**：每task包含Phase→Milestone→Epic→Task→Acceptance，写目标、边界、现有/新增建议文件、输入输出与行为、对应PRD/REQ精确链接、依赖/可并行条件、验证命令（现有入口/待建入口区分）、产物与退出/回滚。实施前把候选路径/glob落成具体文件清单；单task可拆多个小提交但不能删验收。

## 6. Cursor实施约束
<a id="REQ-GUIDE04"></a>
**REQ-GUIDE04**：读取当前AGENTS/局部约束和git状态；保留共享未提交内容，不擅自提交/push。源码迁移只从`E:/git/smc-copilot/apps/work`读取，不拉GitHub；源范围外依赖先隔离重写或按D12确认，许可证和hash必留。真实路径以当前代码验证，建议新路径不可当已存在。

先写/跑失败的有价值契约测试，再小步实现/验证；文档与代码不一致立即修正规范/ADR而非默默跳过。所有mock/fixture、上游未知能力、推荐参数、部署前置要明确标注。遇业务待决可继续独立DTO/fixture工作，停止依赖该决定的生产放行；技术常规选择按本规范执行，无需反复征求许可。
