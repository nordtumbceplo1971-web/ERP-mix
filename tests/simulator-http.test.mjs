import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createSimulatorServer } from '../simulator/server.mjs';

test('local HTTP facade keeps query POST read-only and recovers ambiguous publication', async () => {
  const server = createSimulatorServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async path => (await fetch(base + path)).json();
  const post = async (path, body, extra = {}) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });
  try {
    const before = await get('/api/state');
    const query = await (await post('/erp-boot/orders/queryOrderList', {})).json();
    assert.equal(query.contract, 'synthetic-not-site-schema'); assert.equal(query.data.length, 1);
    assert.deepEqual(await get('/api/state'), before);
    assert.equal((await post('/api/command', { command: 'step' }, { origin: 'https://foreign.example' })).status, 403);
    assert.equal((await post('/api/command', { command: 'unknown' })).status, 400);
    assert.equal((await fetch(base + '/api/command', { method: 'POST', body: 'command=step' })).status, 415);
    await post('/api/command', { command: 'step', fault: 'accepted-timeout' });
    await post('/api/command', { command: 'step' });
    const after = await get('/api/state');
    assert.equal(Object.values(after.state.jobs)[0].state, 'COMPLETED');
    assert.equal(Object.keys(after.state.externalListings).length, 1);
    assert.equal((await get('/api/scenarios')).scenarios.length, 9);
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await fetch(base + '/constructor')).status, 404);
    assert.equal((await fetch(base + '/__proto__')).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
