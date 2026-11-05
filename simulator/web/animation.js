import { FlowRun, SCENARIOS, NODES } from './animation-model.mjs';
import { ShopifyRun, SHOPIFY_SCENARIOS, SHOPIFY_NODES } from './shopify-model.mjs';

const $=selector=>document.querySelector(selector),canvas=$('#system-canvas'),ctx=canvas.getContext('2d');
let nodeList=SHOPIFY_NODES,nodes=new Map(nodeList.map(node=>[node.id,node]));
let run=new ShopifyRun(),playing=false,progress=0,lastTime=0,inspected=null,boxes=new Map(),paths=new Map(),width=0,height=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const colors={fg:'#e4edf7',muted:'#9aafc4',border:'#35506b',teal:'#61ddc6',amber:'#f2bb66',blue:'#81b8ff',surface:'#11243a',active:'#17394b'};

for(const [label,scenarios] of [['Shopify 自动上架 SOP',SHOPIFY_SCENARIOS],['ERP 通用经营闭环',SCENARIOS]]){const group=document.createElement('optgroup');group.label=label;for(const [value,title] of scenarios){const option=document.createElement('option');option.value=value;option.textContent=title;group.append(option);}$('#scenario').append(group);}
function populateModules(){ $('#module-picker').replaceChildren();for(const node of nodeList){const option=document.createElement('option');option.value=node.id;option.textContent=node.title;$('#module-picker').append(option);}}
populateModules();

function inspect(id){
  const node=nodes.get(id);if(!node)return;
  $('#module-picker').value=id;$('#module-title').textContent=node.title;$('#module-detail').textContent=node.detail;
  $('#module-owner').textContent='责任方：'+node.owner;$('#module-port').textContent=node.port;$('#module-ref').textContent=node.refs;
  $('#module-kind').textContent=node.kind==='official'?'官方能力映射 · 本页仅模拟':node.kind==='observed'?'有原站页面 / 查询入口线索':'自建设计 · 真实实现未证实';
  $('#module-doc').hidden=!node.doc;if(node.doc)$('#module-doc').href=node.doc;
}
function refresh(){
  const state=run.state,item=run.current,isShopify=state.profile==='shopify';
  $('#scenario-note').textContent=[...SHOPIFY_SCENARIOS,...SCENARIOS].find(s=>s[0]===run.scenario)[2];
  $('#hero-title').textContent=isShopify?'从 ERP 商品资料，到 Shopify 渠道发布':'一份外部数据，如何变成下一步任务？';
  $('#stage-title').textContent=isShopify?'资料映射 → DRAFT → 配置 → ACTIVE → 渠道回读':'接入 → 编排 → 平台执行 → 经营投影';
  $('#context-scope').textContent=isShopify?'Shopify能力参考官方2026-10文档；ERP编排为自建设计':'原站已观察的查询入口与自建设计分别标记';
  $('#sop-rail').hidden=!isShopify;document.querySelectorAll('.shopify-only').forEach(el=>el.hidden=!isShopify);
  for(const element of document.querySelectorAll('[data-stage]')){const index=Number(element.dataset.stage);element.classList.toggle('current',index===state.sopStage);element.classList.toggle('complete',index<(state.sopStage??0));}
  $('#play').textContent=playing?'暂停':run.done?'演示完成':'开始 / 继续';$('#play').disabled=run.done||!!run.waiting;$('#step').disabled=run.done||!!run.waiting;
  $('#resolve').hidden=!run.waiting;$('#resolve').textContent=run.waiting??'恢复';
  const status=run.done?'闭环已完成':run.waiting?'等待人工确认':playing?'数据流转中':'已暂停 / 可单步';
  $('#run-status').textContent=status;$('#run-status').classList.toggle('waiting',!!run.waiting);
  $('#step-title').textContent=run.done?(isShopify?'Shopify上架SOP已确认完成':'经营闭环已完成'):item?.label??'等待开始';
  $('#step-detail').textContent=run.done?(isShopify?'已分别确认DRAFT GID、变体、媒体、库存、ACTIVE及目标渠道。仅验证本地编排，不代表所有访客已可购买。':'数据经过接入、任务编排、刊登确认和订单投影。可更换场景查看不同模块如何兜底。'):item?.detail??'';
  $('#checkpoint').textContent=state.checkpoint;$('#packet-label').textContent=run.done?'数据与任务已到达终点':run.waiting?'暂停在兜底入口：'+run.waiting:item?.payload??item?.label??'';
  $('#progress-label').textContent=run.history.length+' 个步骤';$('#publication-count').textContent=isShopify?`${state.remoteProducts} / ${state.creationAttempts}`:`${state.listings} / ${state.publishAttempts}`;
  $('#metric-publication-label').textContent=isShopify?'Shopify商品 / 创建调用':'平台商品 / 刊登提交';$('#metric-rejected-label').textContent=isShopify?'渠道发布调用':'拦截重复 / 过期事件';$('#metric-amount-label').textContent=isShopify?'Shopify商品状态':'投影有效销售额 · CNY';$('#metric-pending-label').textContent=isShopify?'目标渠道发布':'待投影事件';
  $('#rejected-count').textContent=isShopify?state.publishAttempts:state.rejected;$('#amount').textContent=isShopify?state.productStatus:(state.amountMinor/100).toFixed(2);$('#pending').textContent=isShopify?(state.channelPublished?'已回读确认':'尚未确认'):state.pendingEvents;
  for(const [name,ready] of [['text',state.titleReady],['media',state.mediaReady],['variant',state.variantsReady],['inventory',state.inventoryReady],['publication',state.publicationReady]]){const row=$('#'+name+'-check');row.classList.toggle('ready',!!ready);row.querySelector('strong').textContent=ready?'✓ 已就绪':'未就绪';}
  const gateReady=state.titleReady&&state.mediaReady&&(!isShopify||(state.variantsReady&&state.inventoryReady&&state.publicationReady&&state.mediaLinked));
  $('#gate-state').classList.toggle('ready',gateReady);$('#gate-state').textContent=gateReady?'AND门禁已通过 → 允许发布':'等待全部依赖 → 禁止提前发布';
  $('#product-state').textContent=state.productStatus??'';$('#publication-state').textContent=state.channelPublished?'目标渠道已确认':'目标渠道未确认';$('#product-gid').textContent=state.gid??'尚无Shopify GID';
  $('#empty-log').hidden=run.history.length>0;$('#event-count').textContent=run.history.length+' 条事件';$('#event-log').replaceChildren();
  for(const event of run.history.slice(-12).reverse()){
    const li=document.createElement('li'),num=document.createElement('span'),content=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small');
    num.className='event-number';num.textContent=String(event.index).padStart(2,'0');title.textContent=event.label;
    meta.textContent=`${nodes.get(event.from)?.title??event.from} → ${nodes.get(event.to)?.title??event.to}`;content.append(title,meta);li.append(num,content);$('#event-log').append(li);
  }
  $('#announcement').textContent=run.waiting?'等待：'+run.waiting:run.done?'演示完成':item?.label??'';
  if(!inspected)inspect(item?.to??'dashboard');draw();
}
function next(){if(run.done||run.waiting)return;run.complete();progress=0;if(run.done||run.waiting)playing=false;refresh();}

function resize(){
  width=Math.floor(canvas.parentElement.getBoundingClientRect().width);const cols=width>=1040?5:width>=780?4:width>=560?3:2;
  const margin=width<560?18:28,gap=width<560?18:24,nodeWidth=(width-margin*2-gap*(cols-1))/cols,nodeHeight=78,rowHeight=128;
  boxes.clear();paths.clear();const main=nodeList.filter(n=>n.group!=='fallback'),fallback=nodeList.filter(n=>n.group==='fallback');
  const place=(set,startY)=>set.forEach((node,index)=>{const row=Math.floor(index/cols),column=row%2?cols-1-index%cols:index%cols;const x=margin+column*(nodeWidth+gap),y=startY+row*rowHeight;boxes.set(node.id,{id:node.id,x,y,w:nodeWidth,h:nodeHeight,cx:x+nodeWidth/2,cy:y+nodeHeight/2});});
  place(main,42);const fallbackY=42+Math.ceil(main.length/cols)*rowHeight+30;place(fallback,fallbackY);
  height=fallbackY+Math.ceil(fallback.length/cols)*rowHeight-20;const dpr=window.devicePixelRatio||1;
  canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.height=height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);draw();
}

function route(from,to){
  const cacheKey=from+'>'+to;if(paths.has(cacheKey))return paths.get(cacheKey);
  const a=boxes.get(from),b=boxes.get(to);if(!a||!b)return [];
  if(from===to){const points=[[a.cx,a.y-7],[a.cx,a.y-26],[a.x+a.w+9,a.y-26],[a.x+a.w+9,a.cy],[a.x+a.w+7,a.cy]];paths.set(cacheKey,points);return points;}
  let start,end;const dx=b.cx-a.cx,dy=b.cy-a.cy;
  if(Math.abs(dy)<10){start=[a.cx+Math.sign(dx)*(a.w/2+8),a.cy];end=[b.cx-Math.sign(dx)*(b.w/2+8),b.cy];}
  else{start=[a.cx,a.cy+Math.sign(dy)*(a.h/2+8)];end=[b.cx,b.cy-Math.sign(dy)*(b.h/2+8)];}
  const unit=8,nx=Math.floor(width/unit),ny=Math.floor(height/unit),encode=(x,y)=>y*nx+x;
  const sx=Math.round(start[0]/unit),sy=Math.round(start[1]/unit),ex=Math.round(end[0]/unit),ey=Math.round(end[1]/unit);
  const first=encode(sx,sy),goal=encode(ex,ey),queue=[first],parents=new Map([[first,null]]);
  const blocked=(x,y)=>[...boxes.values()].some(box=>x*unit>box.x-3&&x*unit<box.x+box.w+3&&y*unit>box.y-3&&y*unit<box.y+box.h+3);
  for(let index=0;index<queue.length&&!parents.has(goal);index++){
    const current=queue[index],x=current%nx,y=Math.floor(current/nx);
    const directions=Math.abs(ex-x)>Math.abs(ey-y)?[[Math.sign(ex-x)||1,0],[0,Math.sign(ey-y)||1],[0,-(Math.sign(ey-y)||1)],[-(Math.sign(ex-x)||1),0]]:[[0,Math.sign(ey-y)||1],[Math.sign(ex-x)||1,0],[-(Math.sign(ex-x)||1),0],[0,-(Math.sign(ey-y)||1)]];
    for(const [vx,vy] of directions){const xx=x+vx,yy=y+vy,k=encode(xx,yy);if(xx<1||xx>=nx-1||yy<1||yy>=ny-1||parents.has(k)||(k!==goal&&blocked(xx,yy)))continue;parents.set(k,current);queue.push(k);}
  }
  let result;
  if(parents.has(goal)){
    const points=[];for(let k=goal;k!==null;k=parents.get(k))points.push([(k%nx)*unit,Math.floor(k/nx)*unit]);points.reverse();
    result=[start];for(let i=1;i<points.length-1;i++){const before=points[i-1],p=points[i],after=points[i+1];if((p[0]-before[0])*(after[1]-p[1])!==(p[1]-before[1])*(after[0]-p[0]))result.push(p);}result.push(end);
  }else result=[start,[start[0],(start[1]+end[1])/2],[end[0],(start[1]+end[1])/2],end];
  paths.set(cacheKey,result);return result;
}
function line(points,color,alpha=1,weight=1.4){if(points.length<2)return;ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();const a=points.at(-2),b=points.at(-1),angle=Math.atan2(b[1]-a[1],b[0]-a[0]);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...b);ctx.lineTo(b[0]-6*Math.cos(angle-.5),b[1]-6*Math.sin(angle-.5));ctx.lineTo(b[0]-6*Math.cos(angle+.5),b[1]-6*Math.sin(angle+.5));ctx.closePath();ctx.fill();ctx.globalAlpha=1;}
function along(points,t){const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));let remaining=t*lengths.reduce((a,b)=>a+b,0);for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]||i===lengths.length-1){const f=lengths[i]?remaining/lengths[i]:0;return [points[i][0]+(points[i+1][0]-points[i][0])*f,points[i][1]+(points[i+1][1]-points[i][1])*f];}remaining-=lengths[i];}return points[0];}
function wrapText(text,maxWidth){const rows=[];let row='';for(const char of text){if(ctx.measureText(row+char).width>maxWidth&&row){rows.push(row);row=char;}else row+=char;}if(row)rows.push(row);return rows;}
function draw(){
  if(!width||!boxes.size)return;ctx.clearRect(0,0,width,height);
  const fallbackTop=Math.min(...nodeList.filter(n=>n.group==='fallback').map(n=>boxes.get(n.id).y));
  ctx.strokeStyle=colors.border;ctx.globalAlpha=.4;ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(20,fallbackTop-30);ctx.lineTo(width-20,fallbackTop-30);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
  ctx.fillStyle=colors.muted;ctx.font='12px system-ui, sans-serif';ctx.textAlign='left';ctx.fillText('业务数据与任务编排',24,21);ctx.fillStyle=colors.amber;ctx.fillText('可靠性兜底 · 故障时接管',24,fallbackTop-10);
  const base=run.state.profile==='shopify'?[['external','connector'],['connector','inbox'],['inbox','snapshot'],['snapshot','queue'],['queue','scheduler'],['queue','text'],['queue','media'],['text','join'],['join','publisher'],['media','publisher'],['publisher','platform'],['platform','outbox'],['outbox','stats'],['stats','dashboard']]:[['external','connector'],['connector','inbox'],['inbox','snapshot'],['snapshot','queue'],['queue','scheduler'],['scheduler','text'],['scheduler','media'],['text','join'],['media','join'],['join','publisher'],['publisher','platform'],['snapshot','outbox'],['outbox','stats'],['stats','dashboard']];
  base.forEach(([a,b])=>line(route(a,b),colors.border,.65));
  const item=run.current,active=item?.parallel??(item?[[item.from,item.to]]:[]),activeNodes=new Set(active.flat());
  for(const node of nodeList){
    const b=boxes.get(node.id),on=activeNodes.has(node.id),fallback=node.group==='fallback',tint=fallback?colors.amber:node.group==='analytics'?colors.blue:colors.teal;
    ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,9);ctx.fillStyle=on?colors.active:colors.surface;ctx.fill();ctx.lineWidth=on?1.8:1;ctx.strokeStyle=on?tint:colors.border;ctx.stroke();
    ctx.fillStyle=tint;ctx.globalAlpha=.85;ctx.beginPath();ctx.arc(b.x+12,b.y+13,2.5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    if(run.visited.has(node.id)){ctx.fillStyle=colors.teal;ctx.font='11px system-ui';ctx.textAlign='right';ctx.fillText('✓',b.x+b.w-11,b.y+17);}
    ctx.textAlign='center';ctx.fillStyle=colors.fg;ctx.font=`500 ${b.w<150?12:13}px system-ui, sans-serif`;const labels=wrapText(node.title,b.w-20);
    labels.forEach((label,i)=>ctx.fillText(label,b.cx,b.y+(labels.length>1?34:37)+i*16));
    if(b.w>=150&&labels.length===1){ctx.fillStyle=colors.muted;ctx.font='11px system-ui, sans-serif';ctx.fillText(node.sub,b.cx,b.y+58);}
  }
  for(const [from,to] of active){const points=route(from,to),fallback=nodes.get(to)?.group==='fallback'||nodes.get(from)?.group==='fallback',color=fallback?colors.amber:nodes.get(to)?.group==='analytics'?colors.blue:colors.teal;line(points,color,.95,2);
    const [x,y]=along(points,reduced.matches?1:Math.min(progress,1));ctx.shadowBlur=14;ctx.shadowColor=color;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  }
}

$('#play').addEventListener('click',()=>{playing=!playing;lastTime=0;inspected=null;refresh();});
$('#step').addEventListener('click',()=>{playing=false;inspected=null;next();});
$('#reset').addEventListener('click',()=>reset());$('#scenario').addEventListener('change',()=>reset());
$('#resolve').addEventListener('click',()=>{run.resolve();progress=0;inspected=null;refresh();});
$('#module-picker').addEventListener('change',event=>{inspected=event.target.value;inspect(inspected);draw();});
canvas.addEventListener('click',event=>{const r=canvas.getBoundingClientRect(),x=event.clientX-r.left,y=event.clientY-r.top;for(const b of boxes.values())if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){inspected=b.id;inspect(b.id);break;}});
function reset(){const scenario=$('#scenario').value,isShopify=scenario.startsWith('shopify-');run=isShopify?new ShopifyRun(scenario):new FlowRun(scenario);nodeList=isShopify?SHOPIFY_NODES:NODES;nodes=new Map(nodeList.map(n=>[n.id,n]));populateModules();progress=0;playing=false;inspected=null;lastTime=0;resize();refresh();}
function frame(time){if(playing&&!run.done&&!run.waiting){if(lastTime)progress+=Math.min(200,time-lastTime)*Number($('#speed').value)/(run.current.duration??1100);lastTime=time;if(progress>=1)next();else draw();}else lastTime=0;requestAnimationFrame(frame);}
new ResizeObserver(resize).observe(canvas.parentElement);reduced.addEventListener('change',draw);
refresh();resize();requestAnimationFrame(frame);
window.erpAnimation={snapshot:()=>run.snapshot()};
