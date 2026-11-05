# 更新日志

## 0.2.0 — 2026-11-05

- 采用REA调查原则；记录规范版本、工具边界和证据覆盖限制，未安装或运行REA工具。
- 走查店铺授权页，并被动观察7个页面阶段的同源API，保存35条脱敏页面/路径记录。
- 新增E11–E17证据，关联外部接入预测、数据链路、同步机制和7项开放假设。
- 区分浏览器到ERP接口与后端到第三方API；供应商、Webhook、OAuth续期和增量水位保持未验证。
- 记录页面自动跟踪POST与偏好保存PUT；未主动提交业务写操作。
- 扩展证据校验，拒绝API目录中的正文、请求头、查询值及未归一化标识，并增加负向验证用例。

报告：[0002-api-boundaries](docs/iterations/0002-api-boundaries.md)。溯源：[traceability.json](research/traceability.json)。

## 0.1.0 — 2026-11-05

- 初始化 Node.js 零依赖研究工程及 Git 仓库。
- 使用 Tabbit CLI 浏览核心业务与采集上架配置页面，记录10条脱敏结构证据。
- 沉淀选品到刊登、存量商品优化、订单履约和经营复盘流程。
- 单独隔离充值、升级、推广佣金及营销转化边界。
- 建立迭代报告、证据 ID、结论映射及本地校验；准备未启用的 CI 模板。
- 推送限制：现有 Token 无 workflow 权限，因此 CI 模板存于 docs/ci，不作为活跃 Actions 工作流提交。
- 验证限制：页面级走查完成，真实写操作及端到端业务效果未验证。

报告：[0001-baseline](docs/iterations/0001-baseline.md)。溯源：[traceability.json](research/traceability.json)。
