# ERP → Shopify 自动上架 SOP

本轮将动画默认视角改为Shopify自动上架，并保留ERP通用经营闭环。使用Shopify技能检索官方资料，按2026-10版本说明设计；来源见 research/shopify-sources.json。这里是将来接入的SOP建议与本地模型，不是真实店铺集成。

## 运行与单文件页面

```powershell
npm run simulator
```

打开 http://127.0.0.1:4173/animation 。当前会话另使用4175作为预览端口；端口可由ERP_SIM_PORT指定。

```powershell
npm run animation:build
```

输出 dist/erp-shopify-animation.html，可直接在浏览器打开，脚本、样式、模型均在同一文件内，无运行时网络依赖。该构建产物被Git忽略，源文件和构建脚本已跟踪。

页面支持播放/暂停、单步、调速、重置与17种场景：9种Shopify路径、8种ERP通用路径。点击节点或选择模块查看职责、来源与建议入口。design://是概念职责标识，不是TCP端口、原站路径或已实现的HTTP接口。

## 推荐主路径

| 阶段 | 依赖与动作 | 成功条件 | 失败时谁兜底 |
|---|---|---|---|
| ERP核对 | 核对来源、SKU、选项、价格币种；冻结输入版本 | 来源与目标店铺映射明确，资料通过检查 | 数据隔离与人工修复 |
| 连接预检 | 检查应用/用户权限、location与publication | 同一目标店铺的配置和权限可用 | 连接与权限恢复 |
| 创建草稿 | 显式DRAFT，productCreate；保存Shopify GID | 业务无错，来源映射与GID被记录 | 创建结果对账，未知时不再次创建 |
| 变体 / 媒体 | 变体价格与SKU映射；文件处理并关联商品 | 变体无userErrors；媒体READY且已关联 | 失败节点隔离、有限重试；保留成功检查点 |
| Location库存 | 确认库存项激活；ERP为权威时设置绝对库存 | 使用比较值保护更新，无业务冲突 | 库存对账与人工确认权威值 |
| 发布门禁 | 等待变体、媒体、库存、渠道权限全就绪 | 输入版本有效，全部依赖通过 | 停止在门禁，禁止半成品发布 |
| ACTIVE与渠道 | productUpdate变为ACTIVE，再按publication发布 | 检查顶层errors和mutation userErrors | 成本调度、权限恢复、结果对账 |
| 回读与ERP回写 | 按已保存GID检查状态和目标渠道结果 | ACTIVE和渠道结果分别确认 | 对账与人工核查，不重建商品 |

这是一条便于观察检查点的实现方案，不是Shopify唯一允许的调用顺序。产品创建、多变体配置和渠道发布是不同职责，不能把HTTP200或存在DRAFT视作自动上架完成。[productCreate](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/productCreate)、[变体创建](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/productVariantsBulkCreate)、[渠道发布](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/publishablePublish)。

## 关键约束与兜底设计

- **媒体异步处理**：fileCreate被受理后仍需检查FileStatus，并确认商品关联；READY才表示文件可显示。动画用等待分支演示，不代表真实耗时。[文件处理](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/fileCreate)、[状态枚举](https://shopify.dev/docs/api/admin-graphql/2026-10/enums/FileStatus)。
- **库存权威与并发**：本地假设ERP是库存权威；才演示inventorySetQuantities。比较值冲突时先对账，不自动跳过比较。该版本应遵循changeFromQuantity和各操作的幂等要求，未来生成请求时须重新校验schema。[库存设置](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/inventorySetQuantities)、[激活](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/inventoryActivate)。
- **ACTIVE不等于渠道发布确认**：商品状态和publication分别保存。动画最终只验证这两项API层条件，未验证Markets、配送、主题、库存策略及所有访客是否可购买。[发布条件](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/publishablePublish)。
- **幂等不应一概而论**：ERP命令身份、商品映射和平台各操作的幂等支持是三件事。不得推断productCreate支持通用幂等键。创建结果未知时等待来源映射确认，发布结果未知时检查已有商品的目标渠道。
- **限流不只有HTTP429**：GraphQL Admin API按成本控制预算；业务userErrors进入修复流程，不能与临时限流统一重试。[限额说明](https://shopify.dev/docs/api/usage/limits)。
- **外部同步可考虑productSet**：它适合权威完整状态同步，但列表字段存在替换语义；部分SKU增量不能当作完整列表发送。本轮默认分步SOP便于检查点恢复，没有实现productSet路径。[productSet](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/productSet)。

## 模型与生产接入的边界

动画使用浏览器内的确定性FlowRun/ShopifyRun，不包含可执行GraphQL、OAuth配置、真实Token、真实图片上传或真实店铺写入。因此没有执行Shopify mutation schema校验；本轮验证对象是本地状态机、依赖和门禁。所标操作名是官方能力映射，不是可直接部署的集成代码。

真实接入还需要：应用与店铺授权、固定API版本、生成并校验GraphQL、持久化命令日志与GID映射、店铺/商品并发锁、事务发件箱、平台回读和受控沙箱验收。原站是否采用Shopify及这些内部模块均未证实。

本地证据为E20；官方资料为E19，不能混作易客网页观察证据。动画现支持创建响应丢失、媒体等待、变体userErrors、库存冲突、成本限流、缺权限、渠道超时与持续未知等恢复路径。人工按钮仅模拟确认，不执行真实授权或发布。
