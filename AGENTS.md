# 项目协作约定

目标：通过已授权浏览器会话学习 ERP 业务流程，沉淀可溯源的领域设计。商业转化流程不拆解。

- 浏览器操作使用 Tabbit CLI。凭据由浏览器管理，不读取、导出或提交 Cookie、Token、浏览器存储和 HAR。
- 每次迭代必须更新 CHANGELOG.md、新建 docs/iterations 下的更新报告，并更新 research/traceability.json。
- 使用 npm run report:new -- <迭代ID> <标题> 创建报告模板；补全内容后才可提交。
- 新发现必须关联 research/evidence.json 的证据 ID。区分 observed（页面观察）、inferred（设计推断）与 unverified（未验证）。
- 观察到按钮不等于操作已执行；看到状态不等于状态迁移已验证。
- 不把真实账号、企业、店铺、订单、客户、商品数据及未脱敏截图提交到仓库。
- 本项目默认只浏览页面、切换筛选和查看配置；真实发布、采购、发货、扣费等另行确定测试条件。
- 运行 npm run check 和 git diff --check。每次提交包含迭代报告和溯源文件；不强推远程分支。
