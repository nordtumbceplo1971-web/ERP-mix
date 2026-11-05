# ERP-mix

通过 Tabbit CLI 研究 [易客 ERP 工作台](https://erp.yeeke.com/dashboard/workbench) 的实际业务页面，沉淀流程、领域边界和可追溯的架构建议。

当前版本为首轮页面研究基线：已浏览选品、选品库、上架任务、Shopee 商品优化、AI 创作、订单处理、两类统计及采集上架配置页面。没有在真实店铺执行采集、发布、采购、发货或付费操作。页面文案支持的流程与实际执行验证分别记录。

## 阅读顺序

1. [业务流程](docs/business-flows.md)：角色、前置条件、步骤、异常和验证边界。
2. [系统框架](docs/architecture.md)：领域划分、对象关系、状态维度及实现建议。
3. [商业模块边界](docs/commercial-boundary.md)：单独隔离的计费和商业转化入口。
4. [证据](research/evidence.json)及[溯源映射](research/traceability.json)。
5. [首轮更新报告](docs/iterations/0001-baseline.md)及[更新日志](CHANGELOG.md)。

## 开发环境

Node.js 22+、Git、已安装并登录的 Tabbit。当前采用零依赖文档与结构化模型工程；尚未选择应用 UI 框架、数据库或实现生产后端。

```powershell
npm run check
npm run report:new -- 0002-workflow-detail 工作流配置深挖
git diff --check
```

新迭代需同时维护更新日志、报告和溯源映射；本地校验证据引用与本轮报告索引。浏览器临时脚本放在被忽略的 `.local/`，不要将真实数据用作样例。

[CI 模板](docs/ci/validate.yml) 已准备，但未启用：当前 GitHub Token 缺少 workflow 权限，远程拒绝创建 Actions 工作流。将来具备相应权限时，可将模板放到 `.github/workflows/validate.yml`。当前每次迭代需手动运行上述检查。

## 后续验证

在隔离测试店铺中，验证一件模拟商品的采集、核对、认领、加工、失败恢复及发布回执；验证一笔模拟订单的履约和取消分支。测试前需确认测试环境、可执行动作和清理方式。当前仓库没有伪造这些操作的成功记录。
