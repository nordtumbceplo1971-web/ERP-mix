# ERP-mix

通过 Tabbit CLI 研究 [易客 ERP 工作台](https://erp.yeeke.com/dashboard/workbench) 的实际业务页面，沉淀流程、领域边界和可追溯的架构建议。

当前版本为0.3.0：完成页面研究、API边界调查和本地模拟验证。保留35条API元数据与7项原站待验证假设，新增虚构业务模拟器及9项实验，用反例改进框架。没有在原站执行采集、发布、采购、发货或付费操作；页面自身发起的跟踪及偏好保存请求已单独记录。原站观察与本地模拟证据分别标记。

## 启动模拟器

```powershell
npm run simulator
```

打开 http://127.0.0.1:4173 。可交互注入故障、推进任务和刷新投影。`npm run simulate` 运行9项确定性实验；使用虚构数据，进程重启后交互数据重置。详见[模拟器说明](docs/simulator.md)与[架构修订](docs/architecture-refinements.md)。

## 阅读顺序

1. [业务流程](docs/business-flows.md)：角色、前置条件、步骤、异常和验证边界。
2. [系统框架](docs/architecture.md)：领域划分、对象关系、状态维度及实现建议。
3. [商业模块边界](docs/commercial-boundary.md)：单独隔离的计费和商业转化入口。
4. [证据](research/evidence.json)及[溯源映射](research/traceability.json)。
5. [首轮更新报告](docs/iterations/0001-baseline.md)及[更新日志](CHANGELOG.md)。
6. [外部API分析](docs/api-integration-analysis.md)、[REA方法说明](docs/rea-method.md)、[API元数据](research/api-observations.json)、[假设清单](research/hypotheses.json)及[第二轮报告](docs/iterations/0002-api-boundaries.md)。
7. [模拟实验结果](research/simulation-results.json)与[第三轮报告](docs/iterations/0003-simulator.md)。本地实验验证自建方案，不证明原站内部实现。

## 开发环境

Node.js 22+、Git；原站研究需要已安装并登录的 Tabbit。模拟器自身零依赖，不需要登录。当前没有生产数据库或真实平台后端。

```powershell
npm run check
npm test
npm run report:new -- 0002-workflow-detail 工作流配置深挖
git diff --check
```

新迭代需同时维护更新日志、报告和溯源映射；本地校验证据引用与本轮报告索引。浏览器临时脚本放在被忽略的 `.local/`，不要将真实数据用作样例。

[CI 模板](docs/ci/validate.yml) 已准备，但未启用：当前 GitHub Token 缺少 workflow 权限，远程拒绝创建 Actions 工作流。将来具备相应权限时，可将模板放到 `.github/workflows/validate.yml`。当前每次迭代需手动运行上述检查。

## 后续验证

在隔离测试店铺中，验证一件模拟商品的采集、核对、认领、加工、失败恢复及发布回执；验证一笔模拟订单的履约和取消分支。测试前需确认测试环境、可执行动作和清理方式。当前仓库没有伪造这些操作的成功记录。
