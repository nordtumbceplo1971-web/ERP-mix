import {FlowRun} from './animation-model.mjs';

export const SHOPIFY_SCENARIOS=[
  ['shopify-normal','Shopify · 正常自动上架','ERP资料准备后创建DRAFT，配置媒体/变体/库存，通过门禁后ACTIVE并发布到目标渠道，最后回读确认。'],
  ['shopify-media-wait','Shopify · 媒体仍在处理','fileCreate受理不代表媒体READY；媒体检查器等待完成，期间禁止发布。'],
  ['shopify-user-error','Shopify · HTTP 200但变体报错','检测mutation的userErrors；保留草稿和媒体，只修复失败的变体节点。'],
  ['shopify-stock-conflict','Shopify · 库存并发冲突','库存期望值与平台当前值不同，进入对账；确认权威值后按新的比较值更新。'],
  ['shopify-throttled','Shopify · GraphQL成本限流','识别THROTTLED并根据可用预算调度，不假设所有限流都是HTTP429。'],
  ['shopify-scope-missing','Shopify · 缺少发布权限','发布权限预检不通过则等待连接恢复；不通过Shopify店铺登录来绕过应用权限。'],
  ['shopify-create-timeout','Shopify · 创建草稿响应丢失','先对账来源映射和Shopify GID；结果未明确前不再次productCreate。'],
  ['shopify-publication-timeout','Shopify · 渠道发布响应超时','草稿、变体与库存已完成，仅回读目标publication结果，不重建商品。'],
  ['shopify-result-unknown','Shopify · 发布结果持续未知','保持待对账，人工模拟查到渠道回执后继续；不能把ACTIVE当成已发布。'],
];

const n=(id,title,sub,owner,detail,port,group='workflow',doc=null)=>({id,title,sub,owner,detail,port,group,kind:doc?'official':'design',refs:doc?'Shopify Admin GraphQL 2026-10 · 官方能力':'ERP自建编排建议 · 本地演示',doc});
const base='https://shopify.dev/docs/api/admin-graphql/2026-10/';
export const SHOPIFY_NODES=[
  n('external','外部货源数据','来源ID · SKU · 素材','货源连接器','虚构外部商品进入ERP。来源系统、源版本和目标店铺用于后续映射；这里不调用真实API。','design://sources/ingest','ingest'),
  n('connector','ERP校验与映射','必填字段 · SKU唯一性','商品资料域','核对标题、选项组合、SKU和价格币种，建立ERP商品到Shopify商品/变体的映射。','design://erp/shopify/map','ingest'),
  n('inbox','连接与权限预检','店铺 · scope · 渠道','连接管理','检查需要的产品、文件、库存和publication权限及用户权限；确认location与publication来自目标店铺，凭据仅留在未来服务端。','design://connections/preflight','ingest'),
  n('snapshot','版本冻结与认领','店铺 + ERP版本 + SOP','工作流入口','冻结本次输入，记录命令日志与来源映射；恢复时复用已有Shopify GID，避免整条SOP重建商品。','design://workflow/claim','ingest'),
  n('queue','Shopify任务队列','状态 · 锁 · 检查点','ERP任务调度','按店铺和商品串行保护写入，保留每步结果；调度器是ERP模块，不是Shopify Flow应用。','design://workflow/dispatch'),
  n('scheduler','创建Shopify草稿','明确DRAFT · 记录GID','Shopify产品适配器','演示productCreate明确创建DRAFT并记录GID；该操作只创建初始变体，不应被当作多变体全配置。','Admin GraphQL · productCreate', 'workflow',base+'mutations/productCreate'),
  n('text','变体与价格配置','选项 · SKU · price','Shopify变体适配器','演示productVariantsBulkCreate/Update；需处理初始变体策略，逐项检查userErrors，并保存ERP SKU到variant GID映射。','Admin GraphQL · productVariantsBulkCreate / Update','workflow',base+'mutations/productVariantsBulkCreate'),
  n('media','媒体处理与关联','fileStatus · READY','Shopify媒体适配器','fileCreate后异步检查fileStatus；READY后关联到商品，受理成功不等于媒体可用。实际关联方式需在实现阶段验证。','Admin GraphQL · fileCreate + 商品媒体关联','workflow',base+'mutations/fileCreate'),
  n('join','Location库存配置','激活 · CAS · 库存权威','Shopify库存适配器','先确认库存项在location已激活。仅当ERP是库存权威时演示inventorySetQuantities，使用changeFromQuantity并遵循该版本幂等要求；冲突先对账。','Admin GraphQL · inventoryActivate / inventorySetQuantities','workflow',base+'mutations/inventorySetQuantities'),
  n('publisher','发布门禁与ACTIVE','依赖全就绪 · 受控激活','ERP发布门禁','确认媒体、变体、库存与目标publication均就绪后，才演示productUpdate设置ACTIVE。ACTIVE本身不代表渠道已发布。','Admin GraphQL · productUpdate（ACTIVE）','workflow',base+'mutations/publishablePublish'),
  n('platform','发布到目标渠道','publicationId · userErrors','Shopify发布适配器','使用publishablePublish针对明确publication发布；检查GraphQL errors与userErrors，不能只看HTTP200。','Admin GraphQL · publishablePublish','workflow',base+'mutations/publishablePublish'),
  n('outbox','回读与一致性确认','GID · 状态 · 渠道可见性','Shopify对账任务','回读product状态与目标publication的发布结果，再标记SOP完成。API发布确认不等于所有市场/访客都可购买。','Admin GraphQL · product / publishedOnPublication','analytics',base+'mutations/publishablePublish'),
  n('stats','ERP状态回写','映射 · SKU · 节点审计','ERP商品域','将确认后的Shopify GID、variant映射和publication结果写回ERP。未来需持久化事务、可靠事件与对账；本页仅内存。','design://erp/shopify/commit','analytics'),
  n('dashboard','上架SOP完成','草稿存在 ≠ 渠道已发布','运营工作台','显示创建、配置、激活、渠道发布、回读分别是否完成。订单履约和销售统计不混入上架成功指标。','design://erp/listing-status','analytics'),
  n('retry','成本与重试调度','THROTTLED · 预算上限','可靠性控制器','按GraphQL查询成本与平台反馈控制并发；可重试错误进入等待，业务userErrors不能无脑重试。','design://retry/shopify','fallback'),
  n('auth','连接与权限恢复','等待重新授权 / 配置','应用管理员','缺少scope、用户权限或连接失效时暂停。恢复相同店铺连接后继续，不在浏览器存放真实Token。','design://connections/reauthorize','fallback'),
  n('reconcile','Shopify结果对账','GID映射 · 库存 · 渠道','对账与补偿模块','创建、库存和渠道发布各自对账；不假设所有mutation都支持同一种幂等参数。未知结果先查，禁止重建商品。','design://shopify/reconcile','fallback'),
  n('dlq','错误隔离队列','userErrors · 最后成功节点','工作流故障隔离','隔离不可重试业务错误与重试耗尽任务，保留已有DRAFT/GID和成功媒体，避免全链路重跑。','design://dead-letter/replay','fallback'),
  n('human','人工修复与放行','确认映射 · 修复 · 审计','运营 / 应用管理员','受控确认来源映射、修复变体或库存权威冲突。动画按钮只制造虚构确认，不是真实授权或发布。','design://operations/review','fallback'),
];

const event=(from,to,label,detail,extra={})=>({from,to,label,detail,duration:1100,...extra});
const check=(ok,message)=>{if(!ok)throw new Error(message);};
export class ShopifyRun extends FlowRun{
  constructor(scenario='shopify-normal'){super(scenario,{scenarios:SHOPIFY_SCENARIOS});}
  *build(){
    const mode=this.scenario,s=this.state;
    Object.assign(s,{profile:'shopify',sopStage:0,productStatus:'未创建',gid:null,remoteProducts:0,creationAttempts:0,variantsReady:false,inventoryReady:false,publicationReady:false,channelPublished:false,remotePublished:false,mediaLinked:false,inventoryWrites:0,inventorySourceOfTruth:true});
    yield event('external','connector','外部商品进入ERP','记录来源ID和版本，核对标题、SKU、选项与价格。本次只使用虚构数据。',{apply:s=>{s.titleReady=true;s.checkpoint='ERP资料已核对';}});
    yield event('connector','inbox','检查Shopify连接与目标配置','确认店铺、权限、location、publication；不要把另一店铺的GID带进本次任务。');
    if(mode==='shopify-scope-missing'){
      yield event('inbox','auth','缺少发布权限，停止SOP','产品写入与渠道发布需要不同权限；由应用管理员修复连接。',{phase:'WAITING_SCOPE',block:'模拟补齐发布权限'});
      yield event('auth','inbox','权限恢复，重新通过预检','继续同一目标店铺的任务，不绕过授权检查。');
    }
    yield event('inbox','snapshot','冻结资料版本，绑定上架目标','ERP商品+目标店铺+输入版本形成任务身份；这不是Shopify通用幂等参数。',{apply:s=>{s.publicationReady=true;s.checkpoint='已冻结输入 / 绑定publication';}});
    yield event('snapshot','queue','创建ERP上架工作流','节点顺序：DRAFT → 媒体/变体 → location库存 → ACTIVE → publication → 回读。');
    if(mode==='shopify-throttled'){
      yield event('queue','retry','GraphQL THROTTLED，进入等待','限流可出现在GraphQL错误层，不只HTTP429。成本调度器减少并发并等待预算恢复。',{phase:'RETRY_WAIT',apply:s=>s.retries++});
      yield event('retry','queue','预算恢复，继续原节点','遵循平台反馈与有限重试预算；不在等待期间反复提交。',{duration:2100});
    }
    yield event('queue','scheduler','productCreate：明确创建DRAFT','先建立未发布的商品骨架；模拟Shopify已创建一个商品。',{apply:s=>{s.creationAttempts++;s.remoteProducts=1;s.productStatus='DRAFT';s.sopStage=1;}});
    if(mode==='shopify-create-timeout'){
      yield event('scheduler','reconcile','草稿创建响应丢失，禁止再次创建','Shopify可能已创建商品；先按ERP命令日志和来源标记调查已有商品，不假设productCreate有通用幂等键。',{phase:'CREATE_RESULT_UNKNOWN'});
      yield event('reconcile','human','等待确认来源与Shopify商品映射','无可靠映射时停住；本地按钮模拟人工确认已创建的DRAFT。',{block:'确认草稿来源映射'});
      yield event('human','scheduler','确认原草稿GID，恢复任务','复用原草稿；创建调用次数保持1。',{apply:s=>{s.gid='gid://shopify/Product/mock-1';s.checkpoint='DRAFT GID已对账';}});
    }else yield event('scheduler','queue','保存DRAFT GID与命令结果','后续所有配置使用同一商品GID；HTTP成功仍需检查mutation业务错误。',{apply:s=>{s.gid='gid://shopify/Product/mock-1';s.checkpoint='DRAFT GID已保存';}});
    yield event('queue','media','并行准备：变体价格 + 媒体文件','变体写入与媒体处理可独立准备；库存依赖变体库存项，发布依赖全部分支完成。',{parallel:[['queue','text'],['queue','media']],apply:s=>{s.variantsReady=mode!=='shopify-user-error';s.mediaReady=!['shopify-media-wait'].includes(mode);s.mediaLinked=s.mediaReady;s.sopStage=2;s.checkpoint=s.variantsReady?'变体完成 / 媒体待检查':'媒体完成 / 变体userErrors';}});
    if(mode==='shopify-user-error'){
      yield event('text','dlq','HTTP200，但变体userErrors非空','业务失败不可当作节点成功；不自动激活或发布。保留DRAFT与成功媒体。',{phase:'VARIANT_USER_ERRORS'});
      yield event('dlq','human','修复SKU/选项映射错误','人工修复后只重放变体节点，不重建商品或重复上传成功媒体。',{block:'修复变体并重放'});
      yield event('human','text','变体修复成功，保存variant映射','模拟productVariantsBulkCreate/Update确认无业务错误。',{apply:s=>{s.variantsReady=true;s.checkpoint='变体修复 / 复用已有媒体';}});
    }
    if(mode==='shopify-media-wait'){
      yield event('media','retry','fileCreate已受理，媒体仍PROCESSING','异步文件必须等待fileStatus完成；不能把上传受理等同于READY。',{phase:'WAITING_MEDIA'});
      yield event('retry','media','媒体转READY，关联到商品','仅模拟等待；真实接入需有超时/失败隔离上限，并验证文件关联操作。',{duration:2100,apply:s=>{s.mediaReady=true;s.mediaLinked=true;s.checkpoint='媒体READY且已关联';}});
    }
    yield event('text','join','配置目标location与库存项','库存分支依赖variant映射；必要时inventoryActivate。按API版本遵循幂等要求。',{apply:s=>check(s.variantsReady,'VARIANT_DEPENDENCY_NOT_READY')});
    if(mode==='shopify-stock-conflict'){
      yield event('join','reconcile','库存比较值过期，拒绝覆盖','演示changeFromQuantity与平台现值不符；旧快照不能覆盖并发订单造成的库存变化。',{phase:'STOCK_CONFLICT'});
      yield event('reconcile','human','确认库存权威和最新比较值','只有ERP确为库存权威时才设置绝对库存；否则采用其他同步策略。',{block:'确认库存权威值'});
      yield event('human','join','使用已确认的最新比较值更新','模拟CAS成功，不使用跳过比较的方式强制覆盖。',{apply:s=>{s.inventoryReady=true;s.inventoryWrites++;s.checkpoint='location库存已确认';}});
    }else yield event('join','join','库存配置成功，检查业务错误','演示ERP是库存权威，以比较值保护更新；无userErrors后记录本节点。',{apply:s=>{s.inventoryReady=true;s.inventoryWrites++;s.checkpoint='location库存已确认';}});
    yield event('media','publisher','发布前AND门禁','检查DRAFT GID、变体、媒体关联、库存和目标publication；本门禁是ERP业务策略。',{apply:s=>{check(!!s.gid&&s.variantsReady&&s.mediaReady&&s.mediaLinked&&s.inventoryReady&&s.publicationReady,'SHOPIFY_PUBLISH_GATE_NOT_READY');s.sopStage=3;}});
    yield event('publisher','platform','productUpdate：DRAFT → ACTIVE','ACTIVE只表示商品状态；此时channelPublished仍为false，尚未确认目标渠道发布。',{apply:s=>{s.productStatus='ACTIVE';s.checkpoint='ACTIVE / 渠道尚未确认';}});
    yield event('platform','platform','publishablePublish：发布到指定渠道','显式使用目标publication；检查顶层errors与mutation userErrors。本地只发起一次虚构发布。',{apply:s=>{check(s.productStatus==='ACTIVE','PRODUCT_NOT_ACTIVE');s.publishAttempts++;s.remotePublished=mode!=='shopify-result-unknown';s.sopStage=4;}});
    if(['shopify-publication-timeout','shopify-result-unknown'].includes(mode)){
      yield event('platform','reconcile','渠道发布响应超时，转回读对账','不重建商品、变体或库存，也不把ACTIVE当作已发布。',{phase:'PUBLICATION_UNKNOWN'});
      if(mode==='shopify-result-unknown'){
        yield event('reconcile','human','持续未知，等待人工确认','保留待对账状态；按钮只模拟找到原提交的渠道结果。',{block:'模拟确认渠道已发布'});
        yield event('human','reconcile','找到目标publication的发布记录','确认原命令结果；未调用第二次publishablePublish。',{apply:s=>s.remotePublished=true});
      }
      yield event('reconcile','outbox','回读原商品与目标渠道结果','用已保存GID核对状态与目标publication，不依赖“请求曾返回200”。');
    }else yield event('platform','outbox','回读商品与目标publication','ACTIVE和渠道发布结果分别确认；这不是完整的访客可购买性检查。');
    yield event('outbox','stats','确认渠道发布，回写ERP映射','回读确认后才标记上架成功。真实接入还需处理市场、配送与库存政策等可购买性条件。',{apply:s=>{check(s.remotePublished&&s.productStatus==='ACTIVE','PUBLICATION_NOT_CONFIRMED');s.channelPublished=true;s.receiptConfirmed=true;s.listings=1;s.sopStage=5;s.checkpoint='ACTIVE + 目标publication回读确认';}});
    yield event('stats','dashboard','Shopify上架SOP完成','草稿数、创建次数、发布调用和渠道确认分别展示；本次没有连接任何真实店铺。');
  }
}

export function runShopifyToEnd(scenario,{resolve=true}={}){const run=new ShopifyRun(scenario);let guard=0;while(!run.done){check(++guard<160,'SHOPIFY_FLOW_DID_NOT_TERMINATE');if(run.waiting){if(!resolve)break;run.resolve();}else run.complete();}return run.snapshot();}
