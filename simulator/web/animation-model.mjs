export const SCENARIOS = [
  ['normal', '正常经营闭环', '商品从接入到刊登；随后订单进入统计投影。'],
  ['rate-limit', '外部 API 限流', '连接器遇到429，交给重试调度，等待后重新接入。'],
  ['auth-expired', '平台授权失效', '暂停接入，等待恢复授权，再从原位置继续。'],
  ['malformed', '外部数据缺字段', '校验失败进入隔离队列；人工修复后重放原数据。'],
  ['worker-failed', '加工节点连续失败', '只重试失败节点；耗尽预算后人工介入，保留已完成的图片结果。'],
  ['accepted-timeout', '刊登已受理但响应超时', '先查回执，避免再次刊登；任务与外部结果分开确认。'],
  ['unknown-timeout', '刊登结果持续未知', '不自动重发；等待人工查到回执后继续对账。'],
  ['duplicate-order', '订单重复与乱序', '事件去重与对象版本分别拦截，取消状态不被旧事件覆盖。'],
];

export const NODES = [
  { id:'external', title:'外部 API', sub:'虚构货源 / 订单数据', group:'ingest', owner:'平台 / 货源服务', detail:'演示外部数据生产者；不调用真实平台。Webhook、分页与供应商协议尚未验证。', refs:'E02 / E15 · 外部协议未知', port:'外部协议未采集', kind:'design' },
  { id:'connector', title:'平台连接器', sub:'授权 · 限流 · 字段映射', group:'ingest', owner:'接入适配层', detail:'将外部字段转换为统一对象；识别授权失效和可重试错误。平台差异留在适配层。', refs:'E11 / E12 / E15 · 职责推断', port:'design://connectors/ingest', kind:'design' },
  { id:'inbox', title:'校验与收件箱', sub:'事件去重 · 版本检查', group:'ingest', owner:'数据接入模块', detail:'检查必填字段，拒绝同键异值；重复事件丢弃，旧版本不能覆盖新快照。', refs:'E18 · S05 / S09', port:'design://inbox/accept', kind:'design' },
  { id:'snapshot', title:'标准化业务快照', sub:'草稿 / SKU / 订单', group:'ingest', owner:'商品与订单域', detail:'保存核对后的业务数据和来源版本；订单、收件箱、发件箱与游标应同一事务提交。', refs:'E03 / E13 / E15 · 模型推断', port:'观察：GET /erp-boot/pipeline/collection/list', kind:'observed' },
  { id:'queue', title:'任务队列', sub:'认领店铺 · 固定输入版本', group:'workflow', owner:'任务编排器', detail:'明确认领目标，创建幂等任务并固定输入版本。真实队列类型和调度方式未证实。', refs:'E04 / E14 · 内部实现未知', port:'观察：GET /erp-boot/pipeline/workflow/list', kind:'observed' },
  { id:'scheduler', title:'Workflow 调度', sub:'依赖 · 检查点 · 恢复', group:'workflow', owner:'任务编排器', detail:'演示分发文案和图片两个独立节点；检查点保留成功产物，恢复时只执行失败节点。', refs:'E18 · 编排为本次设计', port:'design://workflow/dispatch', kind:'design' },
  { id:'text', title:'文案加工节点', sub:'标题 · 描述 · 属性', group:'workflow', owner:'加工执行器', detail:'使用固定输入生成结构化文案；演示只标记产物就绪，不调用AI或消耗额度。', refs:'E02 / E07 · 节点拓扑推断', port:'design://workers/text', kind:'design' },
  { id:'media', title:'图片加工节点', sub:'主图 · 规格 · 素材', group:'workflow', owner:'加工执行器', detail:'与文案节点并行。图片已完成而文案失败时保留图片检查点，避免全部重跑。', refs:'E07 / E18 · 本地模型', port:'design://workers/media', kind:'design' },
  { id:'join', title:'依赖汇合与发布门禁', sub:'文案 + 图片均就绪', group:'workflow', owner:'编排器 / 业务校验', detail:'AND门禁等待两个依赖就绪；同时检查资料版本与核对状态。演示门禁通过不代表真实平台合规审核。', refs:'E03 / E18 · 自建设计', port:'design://workflow/publish-gate', kind:'design' },
  { id:'publisher', title:'刊登执行器', sub:'幂等身份 · 提交记录', group:'workflow', owner:'平台命令适配层', detail:'提交前记录命令身份；超时进入结果未知，不能把HTTP错误等同于平台未受理。', refs:'E04 / E18 · S03', port:'design://commands/publish', kind:'design' },
  { id:'platform', title:'目标店铺平台', sub:'受理商品 · 返回回执', group:'workflow', owner:'虚构销售平台', detail:'本地假设平台支持按命令身份查询回执；真实平台能力需沙箱核实。', refs:'E03 / E12 · 协议未知', port:'外部刊登/回执协议未采集', kind:'design' },
  { id:'outbox', title:'事件发件箱', sub:'业务更新与事件同提交', group:'analytics', owner:'商品 / 订单域', detail:'业务提交后产生待投递事件。统计消费者可稍后处理，避免跨模块双写丢失。', refs:'E18 · S06 / S07', port:'design://outbox/deliver', kind:'design' },
  { id:'stats', title:'统计投影', sub:'版本替换 · 可重放', group:'analytics', owner:'经营分析模块', detail:'演示按订单最新版本替换投影、排除取消订单；不将重复同步金额再次累加。真实有效口径仍未知。', refs:'E08 / E16 / E18', port:'观察：POST /erp-boot/sales/store-stats/page', kind:'observed' },
  { id:'dashboard', title:'工作台与经营复盘', sub:'任务进度 · 有效销售额', group:'analytics', owner:'运营 / 经营负责人', detail:'显示刊登结果、订单与统计积压；业务完成与统计追平分别呈现。', refs:'E01 / E08 / E16', port:'观察：/dashboard/workbench', kind:'observed' },
  { id:'retry', title:'重试调度', sub:'预算上限 · 等待后继续', group:'fallback', owner:'可靠性控制器', detail:'对临时错误进行有上限的重试，区分限流等待和加工失败；耗尽预算转隔离/人工。', refs:'E18 · 本地恢复设计', port:'design://retry/schedule', kind:'design' },
  { id:'auth', title:'连接恢复', sub:'等待授权 · 原位置续跑', group:'fallback', owner:'授权管理 / 店铺管理员', detail:'授权失效时停止外部调用。人工恢复连接后续跑，不读取或展示任何真实凭据。', refs:'E12 / E18 · S04', port:'design://connections/reauthorize', kind:'design' },
  { id:'reconcile', title:'发布回执对账', sub:'结果未知 · 禁止盲重发', group:'fallback', owner:'平台适配器 / 对账任务', detail:'查询原提交结果。已受理则记录回执；持续未知则保持等待并交人工，而不是自动再发。', refs:'E18 · S03 / S09', port:'design://publication/reconcile', kind:'design' },
  { id:'dlq', title:'隔离 / 死信队列', sub:'保留原因 · 输入 · 检查点', group:'fallback', owner:'故障隔离模块', detail:'接收坏数据或耗尽预算的任务。记录错误与最后成功位置，不自动丢弃数据或跳过失败节点。', refs:'E18 / 本次局部模型', port:'design://dead-letter/replay', kind:'design' },
  { id:'human', title:'人工处理台', sub:'修复 · 审核 · 受控重放', group:'fallback', owner:'运营 / 平台管理员', detail:'人工修复输入、确认回执或恢复失败节点。每次动作记录审计，按检查点续跑。', refs:'本次设计 · 非原站入口', port:'design://operations/review', kind:'design' },
];

const step = (from, to, label, detail, extra={}) => ({ from, to, label, detail, duration:1100, ...extra });
const ensure = (condition, message) => { if(!condition) throw new Error(message); };

export class FlowRun {
  constructor(scenario='normal', {scenarios=SCENARIOS}={}) {
    ensure(scenarios.some(s=>s[0]===scenario),'UNKNOWN_SCENARIO');this.scenario=scenario;
    this.state={ phase:'READY', titleReady:false, mediaReady:false, publishAttempts:0, listings:0, receiptConfirmed:false, orderVersion:0, rejected:0, committedOrders:0, projectedVersion:0, amountMinor:0, pendingEvents:0, retries:0, checkpoint:'尚未接入', events:[] };
    this.history=[];this.visited=new Set();this.current=null;this.waiting=null;this.done=false;this.iterator=this.build();this.next();
  }
  next(){const result=this.iterator.next();this.done=!!result.done;this.current=result.done?null:result.value;if(this.done)this.state.phase='COMPLETED';}
  complete(){
    if(this.done||this.waiting)return false;
    const item=this.current;item.apply?.(this.state);this.state.phase=item.phase??item.label;
    for(const node of [item.from,item.to,...(item.parallel?.map(p=>p[1])??[])])this.visited.add(node);
    const {apply,...safe}=item;this.history.push({index:this.history.length+1,...safe});
    if(item.block)this.waiting=item.block;else this.next();return true;
  }
  resolve(){ensure(this.waiting,'NOT_WAITING');const action=this.waiting;this.waiting=null;this.history.push({index:this.history.length+1,from:'human',to:this.current.to,label:`人工确认：${action}`,detail:'仅修改本地虚构演示状态。'});this.next();}
  snapshot(){const {apply,...current}=this.current??{};return {scope:'local-synthetic-only',scenario:this.scenario,state:structuredClone(this.state),current:this.current?current:null,waiting:this.waiting,done:this.done,history:structuredClone(this.history)};}
  *build(){
    const mode=this.scenario,s=this.state;
    yield step('external','connector','拉取虚构商品数据','外部API返回商品来源ID、规格和图片引用；尚未创建工作流。');
    if(mode==='rate-limit'){
      yield step('connector','retry','429：接入被限流','把限流错误交给重试调度；本地演示一次等待，不访问真实API。',{phase:'RETRY_WAIT',apply:s=>s.retries++});
      yield step('retry','connector','等待结束，恢复接入','尊重重试时间；没有在等待期间不断重复调用。',{duration:2100});
    }
    if(mode==='auth-expired'){
      yield step('connector','auth','授权失效，停止拉取','授权管理接管；需要店铺管理员恢复连接。',{phase:'WAITING_AUTH',block:'恢复授权'});
      yield step('auth','connector','连接已恢复，从接入继续','复用原任务身份和来源位置，不创建重复商品。');
    }
    yield step('connector','inbox','映射字段并校验来源','平台字段归一化；进入事件收件箱和必填字段检查。');
    if(mode==='malformed'){
      yield step('inbox','dlq','缺少SKU：拒绝入业务库','坏数据进入隔离队列，保留输入和原因；不会让不完整数据直接刊登。',{phase:'QUARANTINED'});
      yield step('dlq','human','等待修复输入','修复后按原事件身份受控重放；不是丢弃该页并推进游标。',{block:'修复并重放'});
      yield step('human','inbox','补齐虚构SKU并重新校验','本地人工修复示例；重新经过校验，不绕过门禁。');
    }
    yield step('inbox','snapshot','校验通过，保存商品草稿','仅采集分支到此可结束；本演示继续模拟用户核对并认领。',{apply:s=>s.checkpoint='商品草稿已保存'});
    yield step('snapshot','queue','核对并认领到虚构店铺','固定输入版本v1与目标店铺，生成稳定任务身份；这是模拟的用户操作。',{apply:s=>s.checkpoint='已核对 / 认领v1'});
    yield step('queue','scheduler','调度器领取任务','先检查依赖与输入版本，再分发独立加工节点。');
    yield step('scheduler','media','并行加工：文案 + 图片','两条支线同时执行；发布门禁必须等待二者均完成。',{parallel:[['scheduler','text'],['scheduler','media']],apply:s=>{s.mediaReady=true;s.titleReady=mode!=='worker-failed';s.checkpoint=mode==='worker-failed'?'图片已完成 / 文案失败':'文案 + 图片已完成';}});
    if(mode==='worker-failed'){
      yield step('text','retry','文案失败：仅重试文案节点','图片检查点保留；不重新执行已经成功的图片加工。',{apply:s=>s.retries++});
      yield step('retry','text','预算内重试仍失败','本例最多两次执行；不允许无限重试。');
      yield step('text','dlq','重试预算耗尽，任务隔离','保留输入版本与图片产物，等待人工修复。',{phase:'FAILED_NODE'});
      yield step('dlq','human','等待恢复失败节点','人工修复文案处理问题后，从失败节点继续。',{block:'恢复失败节点'});
      yield step('human','text','文案节点恢复成功','复用图片产物，补全依赖。',{apply:s=>{s.titleReady=true;s.checkpoint='文案 + 图片已完成';}});
    }
    yield step('text','join','文案产物进入汇合门禁','文案节点就绪；汇合门禁还会检查图片与资料版本。');
    yield step('media','join','图片产物进入汇合门禁','AND门禁：不能因为单个节点完成就提前发布。',{apply:s=>ensure(s.titleReady&&s.mediaReady,'DEPENDENCY_NOT_READY')});
    yield step('join','publisher','所有依赖就绪，生成发布命令','记录幂等身份与输入版本，准备向平台提交。',{phase:'READY_TO_PUBLISH'});
    yield step('publisher','platform','提交刊登命令','发出一次模拟提交。外部平台是否受理与本地是否收到响应分别记录。',{apply:s=>{ensure(s.titleReady&&s.mediaReady,'DEPENDENCY_NOT_READY');s.publishAttempts++;s.listings=mode==='unknown-timeout'?0:1;}});
    if(mode==='accepted-timeout'||mode==='unknown-timeout'){
      yield step('platform','reconcile','响应超时：结果未知','对账模块兜底；查询原命令结果，不直接再次刊登。',{phase:'RECONCILE_REQUIRED'});
      if(mode==='unknown-timeout'){
        yield step('reconcile','human','尚无确定回执，暂停自动处理','不把查不到记录当作明确失败；需要人工/后续对账确认。',{block:'模拟查到平台回执'});
        yield step('human','reconcile','人工确认平台已受理','仅演示找到原命令回执，不发送第二次刊登命令。',{apply:s=>s.listings=1});
      }
      yield step('reconcile','outbox','回执确认，发布完成','只产生一次平台商品；业务完成事件进入发件箱。',{apply:s=>{ensure(s.listings===1,'RECEIPT_NOT_FOUND');s.receiptConfirmed=true;s.checkpoint='刊登结果已确认';}});
    }else{
      yield step('platform','outbox','平台返回回执，记录完成事件','平台商品状态和工作流状态分开；这里只确认虚构发布。',{apply:s=>{s.receiptConfirmed=true;s.checkpoint='刊登结果已确认';}});
    }
    yield step('outbox','dashboard','任务进度更新到工作台','刊登已完成；销售统计要等待订单事件，不能把刊登数当作成交数。');
    const events=mode==='duplicate-order'?[{id:'o1-v1',version:1,status:'PENDING'},{id:'o1-v2',version:2,status:'CANCELLED'},{id:'o1-v2',version:2,status:'CANCELLED'},{id:'o1-old',version:1,status:'PENDING'}]:[{id:'o1-v1',version:1,status:'PENDING'}];
    const seen=new Set();
    for(const e of events){
      yield step('external','connector',`接收到订单事件 v${e.version}`,`同一虚构订单，状态${e.status}；传输可能重复和乱序。`,{payload:`订单 v${e.version}`});
      yield step('connector','inbox','订单映射与事件身份检查','事件幂等和业务对象版本分别判断；不以到达顺序覆盖状态。');
      if(seen.has(e.id)||e.version<=s.orderVersion){
        yield step('inbox','inbox',seen.has(e.id)?'重复事件已拦截':'过期版本已拦截','不写订单、不产生新统计事件，较新的取消状态保持不变。',{apply:s=>s.rejected++});continue;
      }
      seen.add(e.id);
      yield step('inbox','snapshot','事务提交订单、事件与游标','演示订单快照与发件箱同一业务提交；不是实际数据库事务。',{apply:s=>{s.orderVersion=e.version;s.committedOrders=1;s.events.push({...e});s.pendingEvents++;s.checkpoint=`订单v${e.version}已提交`;}});
      yield step('snapshot','outbox','待投影事件可靠交付','订单已提交而投影尚未更新：允许短暂积压。');
      yield step('outbox','stats','按对象版本更新统计投影','本地口径：有效金额排除取消，货币CNY；不含退款和汇率。',{apply:s=>{if(e.version>s.projectedVersion){s.projectedVersion=e.version;s.amountMinor=e.status==='CANCELLED'?0:19900;}s.pendingEvents=Math.max(0,s.pendingEvents-1);}});
      yield step('stats','dashboard','工作台读取最新统计','展示当前销售额与投影位置，复盘结果再影响选品。',{phase:'PROJECTED'});
    }
  }
}

export function runToEnd(scenario,{resolve=true}={}){
  const run=new FlowRun(scenario);let count=0;
  while(!run.done){ensure(++count<160,'FLOW_DID_NOT_TERMINATE');if(run.waiting){if(!resolve)break;run.resolve();}else run.complete();}
  return run.snapshot();
}
