# 0004-animation — Shopify上架SOP动画与兜底演示

日期：2026-11-05（Asia/Shanghai）

## 目标与变更

新增HTML/Canvas/CSS运行演示。主视角为未来ERP接入Shopify自动上架：外部商品→ERP核对/连接预检→版本认领→DRAFT/GID→变体和媒体→location库存→发布门禁→ACTIVE→目标publication→回读与ERP回写。保留8条ERP通用路径，新增9条Shopify路径。支持播放、暂停、单步、调速、检查点、事件记录与人工放行。

另提供零依赖单文件构建，输出dist/erp-shopify-animation.html。源码、脚本与验证入库，dist忽略。本地预览复用模拟器服务；当前会话端口4175，默认启动端口仍4173。

## 来源与证据ID

Shopify技能admin参考与官方检索解析为2026-10，来源E19及research/shopify-sources.json。连接器文档搜索工具未可用，采用技能内置search_docs与官方网页核对；未调用真实店铺API。

E20为local-experiment，输出research/animation-results.json，来源npm run animation:record。C15–C17和本轮索引加入research/traceability.json。E01–E17仍为原站观察，E18核心模拟保留；原站H01–H07均保持open。

## 验证结果

17条动画路径通过168项断言；自动测试14项通过，包括Shopify依赖门禁、ACTIVE先于渠道确认、创建不重复、人工阻塞冻结、原有乱序与HTTP测试。npm run animation:build生成自包含文件并检查语法/无外部运行资源；npm run check通过（20条证据、17项结论、4份报告、9项核心与17项动画场景），git diff --check通过。

浏览器执行草稿创建超时、变体userErrors和渠道持续未知路径。首轮长程序在整页截图阶段触发120秒硬期限，随后重新接管保留页面，只读核实已到达ACTIVE但渠道未确认，并完成视口截图与人工放行。最终产品数、创建调用、发布调用均为1，渠道确认true。390px视口的文档宽度390、canvas宽364，无横向溢出。

离线文件通过file URL打开，默认shopify-normal；单步6次得到DRAFT、模拟GID、创建1次；切换ERP通用场景成功。未把浏览器演示当作平台真实集成验收。

## 限制、风险与回退

无真实API、OAuth、Token、AI生成、商品写入或扣费。GraphQL操作名称仅作官方能力映射，未生成可执行GraphQL，故没有声称通过其schema验证。design://是建议模块入口，不是原站或本地HTTP接口。

SOP顺序和发布前媒体/库存门禁为ERP建议策略；Shopify接口能力来自文档，不证明原站或任何店铺实现。真实可购买性还涉及市场/配送等；ACTIVE+publication不是全部条件。库存模型假设ERP是库存权威；没有实现真实比较、锁、持久化、限流算法、媒体关联或事件投递。

回退用新提交撤销页面/源码，不改写既有证据与远程历史。停止本地进程不会影响真实店铺；浏览器交互状态不持久化。

## 后续工作

选择店铺沙箱与连接方式，固定实际API版本后生成并验证GraphQL；实现服务端凭据保护、命令日志与GID映射、初始变体策略、媒体关联、location库存比较、渠道发现与回读对账。生产化前验证创建/发布响应丢失与并发竞争。商业转化流程仍排除。
