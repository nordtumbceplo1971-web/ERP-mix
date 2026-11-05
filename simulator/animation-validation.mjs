import assert from 'node:assert/strict';
import { SCENARIOS, NODES, runToEnd } from './web/animation-model.mjs';
import { SHOPIFY_SCENARIOS, SHOPIFY_NODES, runShopifyToEnd } from './web/shopify-model.mjs';

export function validateAnimation() {
  const scenarios=SCENARIOS.map(([name,title],index)=>{
    const checks=[];
    const check=(label,actual,expected)=>{assert.deepEqual(actual,expected,`${name}: ${label}`);checks.push({name:label,actual,expected,passed:true});};
    const result=runToEnd(name),state=result.state;
    check('人工解决本地阻塞后完成',result.done,true);
    check('发布依赖均已就绪',[state.titleReady,state.mediaReady],[true,true]);
    check('只提交一次刊登',state.publishAttempts,1);
    check('只创建一个虚构平台商品',state.listings,1);
    check('平台回执已确认',state.receiptConfirmed,true);
    check('拦截重复与过期事件',state.rejected,name==='duplicate-order'?2:0);
    check('统计采用最新订单版本',state.amountMinor,name==='duplicate-order'?0:19900);
    check('投影积压归零',state.pendingEvents,0);
    const blocked=runToEnd(name,{resolve:false});
    const expectedWait={'auth-expired':'恢复授权',malformed:'修复并重放','worker-failed':'恢复失败节点','unknown-timeout':'模拟查到平台回执'}[name]??null;
    check('阻塞场景不会自动越过人工动作',blocked.waiting,expectedWait);
    if(name==='unknown-timeout')check('未确认回执时没有伪造完成',[blocked.state.receiptConfirmed,blocked.state.listings,blocked.state.publishAttempts],[false,0,1]);
    if(name==='worker-failed')check('失败时保留成功的图片检查点',[blocked.state.mediaReady,blocked.state.titleReady],[true,false]);
    return {id:`A${String(index+1).padStart(2,'0')}`,name,title,status:'passed',checks,finalState:state,steps:result.history.map(({index,from,to,label})=>({index,from,to,label}))};
  });
  for(const [name,title] of SHOPIFY_SCENARIOS){
    const result=runShopifyToEnd(name),state=result.state,checks=[];
    const check=(label,actual,expected)=>{assert.deepEqual(actual,expected,`${name}: ${label}`);checks.push({name:label,actual,expected,passed:true});};
    check('解决本地阻塞后SOP完成',result.done,true);
    check('同一商品只创建一次',[state.remoteProducts,state.creationAttempts],[1,1]);
    check('只调用一次渠道发布',state.publishAttempts,1);
    check('媒体READY且已关联',[state.mediaReady,state.mediaLinked],[true,true]);
    check('变体和库存均完成',[state.variantsReady,state.inventoryReady],[true,true]);
    check('商品状态为ACTIVE',state.productStatus,'ACTIVE');
    check('GID已保存',state.gid,'gid://shopify/Product/mock-1');
    check('目标渠道经过回读确认',[state.channelPublished,state.receiptConfirmed],[true,true]);
    check('库存仅完成一次有效更新',state.inventoryWrites,1);
    const blocked=runShopifyToEnd(name,{resolve:false});
    const waiting={'shopify-scope-missing':'模拟补齐发布权限','shopify-user-error':'修复变体并重放','shopify-stock-conflict':'确认库存权威值','shopify-create-timeout':'确认草稿来源映射','shopify-result-unknown':'模拟确认渠道已发布'}[name]??null;
    check('人工门禁不会自动跳过',blocked.waiting,waiting);
    if(name==='shopify-create-timeout')check('创建结果未明时不再次创建',[blocked.state.creationAttempts,blocked.state.remoteProducts,blocked.state.gid],[1,1,null]);
    if(name==='shopify-result-unknown')check('ACTIVE不等于渠道已发布',[blocked.state.productStatus,blocked.state.channelPublished,blocked.state.publishAttempts],['ACTIVE',false,1]);
    if(name==='shopify-user-error')check('变体失败不提前激活商品',[blocked.state.productStatus,blocked.state.mediaReady,blocked.state.variantsReady],['DRAFT',true,false]);
    if(name==='shopify-stock-conflict')check('冲突时未强制覆盖库存',blocked.state.inventoryWrites,0);
    scenarios.push({id:`A${String(scenarios.length+1).padStart(2,'0')}`,name,title,status:'passed',checks,finalState:state,steps:result.history.map(({index,from,to,label})=>({index,from,to,label}))});
  }
  return {schemaVersion:1,scope:'local-synthetic-only',modelVersion:'animation-v2-shopify-sop',nodeCount:NODES.length,shopifyNodeCount:SHOPIFY_NODES.length,scenarios};
}
