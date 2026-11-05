# 更新日志

## 0.4.0 — 2026-11-05

- 新增Canvas/CSS系统运行动画，支持播放、暂停、单步、速度、模块检查、检查点和人工恢复。
- 默认优化为ERP → Shopify自动上架SOP：核对/连接预检、DRAFT/GID、变体与媒体、location库存、ACTIVE、publication、回读回写。
- 支持9条Shopify故障/正常路径与8条ERP通用路径；17条路径共168项模型断言。
- 单独展示DRAFT、ACTIVE和渠道确认；创建结果未知、业务userErrors、库存冲突与发布超时分别恢复。
- 增加单文件HTML构建，无服务器也可打开；390px布局与离线操作已验证。
- 引入E19官方资料、E20本地动画证据；未生成或发送真实GraphQL，未连接店铺。

报告：[0004-animation](docs/iterations/0004-animation.md)。溯源：[traceability.json](research/traceability.json)。

## 0.3.0 — 2026-11-05

- 新建零依赖本地模拟器与交互实验页面，使用虚构数据，支持限流、授权失效、发布超时和统计延迟等故障。
- 实现草稿审核/版本、分店认领、任务状态、发布幂等/对账、订单去重/版本、同步批次回滚及统计投影。
- 提供6个同名查询接口的自建响应契约；不声称兼容原站schema。
- 新增9项确定性实验和40项显式对比断言；补充HTTP、权限及50组乱序测试。
- 根据反例修订框架；E18单独标记本地实验，H01–H07原站实现结论保持open。

报告：[0003-simulator](docs/iterations/0003-simulator.md)。溯源：[traceability.json](research/traceability.json)。

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
