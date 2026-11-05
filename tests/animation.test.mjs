import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FlowRun,SCENARIOS,NODES} from '../simulator/web/animation-model.mjs';
import {validateAnimation} from '../simulator/animation-validation.mjs';
import {ShopifyRun,SHOPIFY_SCENARIOS,SHOPIFY_NODES} from '../simulator/web/shopify-model.mjs';

test('seventeen animation paths reproduce retained evidence and fault assertions',async()=>{
  assert.deepEqual(validateAnimation(),JSON.parse(await readFile(new URL('../research/animation-results.json',import.meta.url),'utf8')));
});
test('Shopify writes respect the dependency gate and ACTIVE precedes publication confirmation',()=>{
  const ids=new Set(SHOPIFY_NODES.map(n=>n.id));
  for(const [scenario] of SHOPIFY_SCENARIOS){
    const run=new ShopifyRun(scenario);let guard=0,sawActiveUnpublished=false;
    while(!run.done){
      assert(++guard<160);assert(ids.has(run.current.from));assert(ids.has(run.current.to));
      if(run.waiting){const before=run.snapshot();assert.equal(run.complete(),false);assert.deepEqual(run.snapshot(),before);run.resolve();}
      else run.complete();
      const state=run.state;
      if(state.productStatus==='ACTIVE'&&!state.channelPublished)sawActiveUnpublished=true;
      if(state.publishAttempts)assert(state.gid&&state.variantsReady&&state.mediaReady&&state.inventoryReady&&state.publicationReady);
      if(state.channelPublished)assert.equal(state.productStatus,'ACTIVE');
      assert(state.creationAttempts<=1);
    }
    assert(sawActiveUnpublished,'Do not collapse ACTIVE and channel publication');
  }
});
test('every route targets a real node and publishing never overtakes dependencies',()=>{
  const ids=new Set(NODES.map(n=>n.id));
  for(const [scenario] of SCENARIOS){
    const run=new FlowRun(scenario);let guard=0;
    while(!run.done){
      assert(++guard<160);assert(ids.has(run.current.from));assert(ids.has(run.current.to));
      for(const [from,to] of run.current.parallel??[]){assert(ids.has(from));assert(ids.has(to));}
      if(run.waiting){const frozen=run.snapshot();assert.equal(run.complete(),false);assert.deepEqual(run.snapshot(),frozen);run.resolve();}
      else run.complete();
      if(run.state.publishAttempts>0)assert(run.state.titleReady&&run.state.mediaReady);
    }
  }
});
test('unknown scenarios and unrequested resolution fail explicitly',()=>{
  assert.throws(()=>new FlowRun('unknown'),/UNKNOWN_SCENARIO/);
  assert.throws(()=>new FlowRun().resolve(),/NOT_WAITING/);
});
