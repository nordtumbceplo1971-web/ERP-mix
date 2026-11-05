import assert from 'node:assert/strict';
import { Simulator, SIMULATOR_MODEL_VERSION } from './engine.mjs';

export const order = (changes = {}) => ({ tenant: 'demo', shop: 'shop-a', eventId: 'evt-1', externalId: 'order-1', version: 1, status: 'PENDING', amountMinor: 1000, currency: 'CNY', ...changes });
export function setup() {
  const sim = new Simulator(); sim.addStore('demo', 'shop-a'); return sim;
}
export function ready(sim = setup()) {
  const draft = sim.collect('demo', 'mock-source', 'product-1', '虚构商品');
  sim.review('demo', draft); const job = sim.claim('demo', 'shop-a', draft);
  sim.step('demo', job); sim.step('demo', job); return { sim, draft, job };
}

export function runScenarios() {
  const results = [];
  const experiment = (id, title, evidenceIds, hypothesisIds, fn) => {
    const checks = [];
    const check = (name, actual, expected) => { assert.deepEqual(actual, expected, `${id}: ${name}`); checks.push({ name, actual, expected, passed: true }); };
    const details = fn(check);
    results.push({ id, title, evidenceIds, hypothesisIds, status: 'passed', checks, ...details });
  };
  experiment('S01', '仅采集、核对、分店认领和暂停恢复', ['E03', 'E04', 'E10', 'E14'], ['H02', 'H03'], check => {
    const sim = setup(); const draft = sim.collect('demo', 'mock-source', 'product-1', '虚构商品');
    check('仅采集不自动创建任务', Object.keys(sim.state.jobs).length, 0);
    assert.throws(() => sim.claim('demo', 'shop-a', draft), /REVIEW_REQUIRED/);
    sim.review('demo', draft); const job = sim.claim('demo', 'shop-a', draft);
    check('重复认领复用同一任务', sim.claim('demo', 'shop-a', draft), job);
    sim.addStore('demo', 'shop-b'); sim.claim('demo', 'shop-b', draft);
    check('目标店铺不同则任务不同', Object.keys(sim.state.jobs).length, 2);
    sim.pause('demo', job); check('暂停不推进', sim.step('demo', job), 'PAUSED'); sim.resume('demo', job);
    sim.step('demo', job); sim.step('demo', job); sim.step('demo', job);
    check('正常刊登完成', sim.job('demo', job).state, 'COMPLETED');
    check('平台状态独立于任务状态', sim.job('demo', job).receipt.platformState, 'ON_SALE');
    return { finding: '认领身份应包含目标店铺和输入版本；仅采集与创建任务必须分开。', audit: sim.state.audit };
  });
  experiment('S02', '核对后编辑造成的过期输入', ['E03', 'E05'], ['H03'], check => {
    const { sim, draft, job } = ready(); sim.editDraft('demo', draft, '修改后的虚构商品');
    check('过期任务被阻止', sim.step('demo', job), 'FAILED');
    check('失败原因可区分', sim.job('demo', job).error, 'STALE_INPUT');
    check('未产生平台商品', Object.keys(sim.state.externalListings).length, 0);
    assert.throws(() => sim.claim('demo', 'shop-a', draft), /REVIEW_REQUIRED/);
    sim.review('demo', draft); check('新版本产生新任务', sim.claim('demo', 'shop-a', draft) !== job, true);
    return { finding: '任务需固定输入版本；人工编辑应使旧核对失效，不能读取随时变化的草稿。' };
  });
  experiment('S03', '平台已受理但本地超时，重启后对账', ['E04', 'E14', 'E17'], ['H03'], check => {
    const { sim, job } = ready(); sim.step('demo', job, { fault: 'accepted-timeout' });
    check('超时保留未知结果', sim.job('demo', job).state, 'RECONCILE_REQUIRED');
    const restarted = new Simulator(JSON.parse(JSON.stringify(sim.snapshot())));
    restarted.step('demo', job); restarted.step('demo', job);
    check('对账确认完成', restarted.job('demo', job).state, 'COMPLETED');
    check('实际平台商品只有一个', Object.keys(restarted.state.externalListings).length, 1);
    check('未盲目再次提交', restarted.job('demo', job).attempt, 1);
    // Counterexample: a provider without idempotency allocates a new listing on each accepted call.
    const naiveProvider = []; const publishWithoutKey = () => naiveProvider.push(`listing-${naiveProvider.length + 1}`);
    publishWithoutKey(); publishWithoutKey();
    check('反例：超时后盲重试生成两个商品', naiveProvider.length, 2);
    return { baseline: { duplicateListings: naiveProvider.length }, guarded: { listings: 1, submissions: 1 }, finding: '发布应独立记录不确定结果，通过幂等键与回执查询恢复；不能把超时直接当失败重试。' };
  });
  experiment('S04', '限流等待与授权失效分别恢复', ['E04', 'E12', 'E14'], ['H03', 'H07'], check => {
    const { sim, job } = ready(); sim.step('demo', job, { fault: 'rate-limit', retryAfter: 2000 });
    check('立即重试保持等待', sim.step('demo', job), 'RETRY_WAIT');
    check('等待期间没有再次提交', sim.job('demo', job).attempt, 1);
    sim.tick(2000); sim.step('demo', job); sim.authorize('demo', 'shop-a', false);
    check('授权失效进入独立队列', sim.step('demo', job), 'WAITING_AUTH');
    sim.authorize('demo', 'shop-a', true); sim.step('demo', job); sim.step('demo', job);
    check('恢复后刊登成功', sim.job('demo', job).state, 'COMPLETED');
    return { finding: '授权等待、限流等待和人工暂停应分别建模，避免统一错误重试造成无效流量。' };
  });
  experiment('S05', '重复和乱序订单不会覆盖较新取消状态', ['E06', 'E15'], ['H01', 'H05'], check => {
    const sim = setup(); const events = [order(), order({ eventId: 'evt-2', version: 2, status: 'CANCELLED' }), order({ eventId: 'evt-2', version: 2, status: 'CANCELLED' }), order({ eventId: 'evt-old', version: 1 })];
    const naive = new Map(); for (const event of events) naive.set(event.externalId, event);
    check('反例：最后到达覆盖导致取消回退', naive.get('order-1').status, 'PENDING');
    check('重复与过期事件被区分', sim.syncBatch('demo', 'shop-a', { cursor: null, nextCursor: 'page-1', events }), ['APPLIED', 'APPLIED', 'DUPLICATE', 'STALE']);
    sim.project(); check('正确有效订单数', sim.metrics('demo').currencies.CNY.effectiveOrders, 0);
    check('正确取消订单数', sim.metrics('demo').currencies.CNY.cancelledOrders, 1);
    return { baseline: { finalStatus: naive.get('order-1').status }, guarded: sim.metrics('demo'), finding: '幂等事件身份与业务对象版本都必需；只做其中一种仍无法解决乱序覆盖。' };
  });
  experiment('S06', '同步批次失败后，订单、收件箱、事件和游标一起回滚', ['E15'], ['H05'], check => {
    const sim = setup(); const events = [order(), order({ eventId: 'evt-2', externalId: 'order-2' })];
    assert.throws(() => sim.syncBatch('demo', 'shop-a', { cursor: null, nextCursor: 'page-1', events, failAfter: 0 }), /INJECTED/);
    check('失败批次无订单残留', Object.keys(sim.state.orders).length, 0);
    check('失败批次未推进游标', Object.keys(sim.state.cursors).length, 0);
    check('失败批次未残留幂等记录', Object.keys(sim.state.inbox).length, 0);
    check('失败批次未发出统计事件', sim.state.outbox.length, 0);
    sim.syncBatch('demo', 'shop-a', { cursor: null, nextCursor: 'page-1', events });
    check('同页重试完整恢复', Object.keys(sim.state.orders).length, 2);
    assert.throws(() => sim.syncBatch('demo', 'shop-a', { cursor: null, nextCursor: 'page-2', events: [] }), /CURSOR_CONFLICT/);
    return { finding: '游标必须与订单、收件箱及待投递事件同一事务提交；游标比较可阻止陈旧同步器覆盖进度。' };
  });
  experiment('S07', '统计延迟、重启重放、取消与多币种', ['E08', 'E09', 'E16'], ['H04'], check => {
    const sim = setup(); sim.syncBatch('demo', 'shop-a', { cursor: null, nextCursor: 'page-1', events: [order(), order({ eventId: 'evt-usd', externalId: 'order-usd', amountMinor: 299, currency: 'USD' })] });
    check('同步完成不等于统计已更新', sim.metrics('demo').pendingEvents, 2);
    sim.project({ limit: 1 }); const restarted = new Simulator(JSON.parse(JSON.stringify(sim.snapshot())));
    restarted.project(); check('重放没有重复金额', restarted.project(), 0);
    check('人民币按最小单位计数', restarted.metrics('demo').currencies.CNY.effectiveAmountMinor, 1000);
    check('美元单独汇总', restarted.metrics('demo').currencies.USD.effectiveAmountMinor, 299);
    restarted.ingestOrder(order({ eventId: 'evt-cancel', version: 2, status: 'CANCELLED' })); restarted.project();
    check('取消后撤销有效金额', restarted.metrics('demo').currencies.CNY.effectiveAmountMinor, 0);
    check('取消不影响其他币种', restarted.metrics('demo').currencies.USD.effectiveOrders, 1);
    return { guarded: restarted.metrics('demo'), finding: '统计应使用按对象版本替换的投影，并显式显示积压；不能简单累加每次同步的金额，也不能直接相加不同币种。' };
  });
  experiment('S08', '跨租户/店铺身份与能力隔离', ['E12', 'E15', 'E17'], ['H01', 'H07'], check => {
    const sim = setup(); sim.addStore('demo', 'shop-b'); sim.addStore('other', 'shop-a'); sim.addStore('demo', 'read-only', { capabilities: ['orders'] });
    for (const [tenant, shop] of [['demo', 'shop-a'], ['demo', 'shop-b'], ['other', 'shop-a']]) sim.ingestOrder(order({ tenant, shop }));
    check('相同外部订单ID仍为三个对象', Object.keys(sim.state.orders).length, 3); sim.project();
    check('租户统计隔离', sim.metrics('demo').currencies.CNY.effectiveOrders, 2);
    const { draft } = ready(sim);
    assert.throws(() => sim.claim('other', 'shop-a', draft), /DRAFT_NOT_FOUND/);
    assert.throws(() => sim.claim('demo', 'read-only', draft), /CAPABILITY_UNAVAILABLE/);
    const before = sim.snapshot();
    assert.throws(() => sim.syncBatch('demo', 'shop-a', { cursor: null, nextCursor: 'p1', events: [order({ tenant: 'other' })] }), /TENANT_MISMATCH/);
    check('跨租户批次没有污染状态', sim.snapshot(), before);
    return { finding: '外部ID和事件ID必须绑定租户与店铺；连接器能力检查不应只依赖前端按钮隐藏。' };
  });
  experiment('S09', '同一身份的冲突事件隔离，未知发布结果不自动重发', ['E14', 'E15'], ['H03', 'H05'], check => {
    const sim = setup(); sim.ingestOrder(order());
    assert.throws(() => sim.ingestOrder(order({ amountMinor: 1 })), /EVENT_ID_CONFLICT/);
    assert.throws(() => sim.ingestOrder(order({ eventId: 'evt-conflict', amountMinor: 1 })), /VERSION_CONFLICT/);
    check('冲突未增加事件', sim.state.outbox.length, 1);
    const { job } = ready(sim); sim.step('demo', job, { fault: 'unknown-timeout' });
    sim.step('demo', job); sim.step('demo', job);
    check('查不到回执仍保持不确定', sim.job('demo', job).state, 'RECONCILE_REQUIRED');
    check('没有盲重发', sim.job('demo', job).attempt, 1);
    return { finding: '重复键却不同内容应进入冲突处理；查不到回执不等同于平台明确拒绝，需要继续对账或人工介入。' };
  });
  return { schemaVersion: 1, scope: 'local-synthetic-only', simulatorVersion: SIMULATOR_MODEL_VERSION, deterministic: true, scenarios: results };
}
