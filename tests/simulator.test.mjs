import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runScenarios, setup, ready, order } from '../simulator/scenarios.mjs';

test('nine fault experiments are deterministic and match retained simulation evidence', async () => {
  const result = runScenarios();
  assert.deepEqual(result, runScenarios());
  assert.equal(result.scenarios.length, 9);
  const retained = JSON.parse(await readFile(new URL('../research/simulation-results.json', import.meta.url), 'utf8'));
  assert.deepEqual(result, retained, 'Refresh evidence intentionally with npm run simulate:record');
});
test('authorization blocks reconciliation as well as initial publishing', () => {
  const { sim, job } = ready(); sim.step('demo', job, { fault: 'accepted-timeout' });
  sim.authorize('demo', 'shop-a', false); assert.equal(sim.step('demo', job), 'WAITING_AUTH');
  sim.authorize('demo', 'shop-a', true); sim.step('demo', job); assert.equal(sim.step('demo', job), 'COMPLETED');
});
test('negative/fractional money and forged cross-shop batches do not advance cursor', () => {
  const sim = setup();
  for (const amountMinor of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => sim.ingestOrder(order({ amountMinor })), /INVALID_INTEGER/);
  assert.throws(() => sim.syncBatch('demo', 'shop-a', { cursor: null, nextCursor: 'p1', events: [order({ shop: 'shop-b' })] }), /SHOP_MISMATCH/);
  assert.equal(Object.keys(sim.state.cursors).length, 0);
});

test('50 deterministic shuffled deliveries converge to the newest order versions', () => {
  let seed = 731;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed; };
  const events = [];
  for (let object = 0; object < 8; object++) {
    for (let version = 1; version <= 4; version++) events.push(order({ eventId: `event-${object}-${version}`, externalId: `object-${object}`, version, status: version === 4 && object % 2 === 0 ? 'CANCELLED' : 'PENDING', amountMinor: (object + 1) * 100 }));
  }
  for (let trial = 0; trial < 50; trial++) {
    const shuffled = [...events, ...events.slice(0, 12)];
    for (let index = shuffled.length - 1; index > 0; index--) { const target = random() % (index + 1); [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]; }
    const sim = setup(); for (const event of shuffled) sim.ingestOrder(event); sim.project();
    assert(Object.values(sim.state.orders).every(event => event.version === 4));
    assert.deepEqual(sim.metrics('demo').currencies.CNY, { totalOrders: 8, cancelledOrders: 4, effectiveOrders: 4, effectiveAmountMinor: 2000 });
  }
});
