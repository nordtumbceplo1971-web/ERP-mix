# 0001 — 业务研究与开发环境基线

日期：2026-11-05（Asia/Shanghai）

## 本轮目标与变更

使用 Tabbit CLI 的已登录页面走查选品、刊登、优化、创作、履约及统计；初始化零依赖 Node.js 工程、Git、CI模板、后续迭代模板和溯源校验。详细内容见 business-flows.md 与 architecture.md。

## 来源与方法

原始入口：https://erp.yeeke.com/dashboard/workbench 。证据 E01–E10 为脱敏人工摘要；仅保留页面结构与公共业务标签。Tabbit request ID 保存在证据中，用于说明采集过程；CLI finish 后临时回执会清理，因此它们不是永久原始快照地址。

初次用户信息请求返回401，用户重新登录后导航恢复。研究不把初始失败当作最终权限状态。页面初始加载空态不用于统计结论。采集配置最初按弹窗等待超时，后核实跳转至独立配置中心页；确认三种采集模式，未保存配置。

## 验证

- 页面导航及 UI 标签观察：已完成；各页面路径记录于 evidence.json。
- 真实采集、认领、生成、刊登、采购、发货：未执行；端到端验证未完成。
- npm run check 已通过：10条证据、7项结论、1份报告；git diff --cached --check 已通过。
- 首次推送被 GitHub 拒绝：Token 缺少 workflow scope。CI配置已改存 docs/ci/validate.yml 为待启用模板；本地校验继续可用，远程CI未启用。

## 影响、限制与下一步

本轮产物是研究与开发基线，不是完整 ERP 应用。所有工程架构、实体关系与状态迁移建议明确标为推断。商业转化只登记隔离边界。下轮需在隔离测试条件下验证认领配置及工作流异常恢复。

溯源：research/traceability.json，证据：research/evidence.json。回退：保留研究历史，通过新提交修正结论，不改写已推送历史。
