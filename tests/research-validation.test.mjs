import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateApiObservations, validateHypotheses } from '../scripts/research-validation.mjs';

const ids = new Set(['E15']);
const capture = () => ({ schemaVersion: 1, dropped: 0, endpoints: [{ phase: 'orders', origin: 'https://erp.yeeke.com', path: '/erp-boot/orders/queryOrderList', methods: ['POST'], statuses: [200], evidenceId: 'E15' }] });

test('POST query metadata is valid without claiming business success', () => {
  assert.doesNotThrow(() => validateApiObservations(capture(), ids));
});
test('capture refuses unapproved payload or credential containers', () => {
  for (const key of ['headers', 'body', 'cookies', 'response', 'query']) {
    const api = capture();
    api.endpoints[0][key] = 'should never be exported';
    assert.throws(() => validateApiObservations(api, ids), /Unexpected API field/);
  }
});
test('query values, fragments and unnormalized object IDs are rejected', () => {
  for (const path of ['/erp-boot/orders/list?shop=example', '/erp-boot/orders/list#value', '/erp-boot/orders/123456', '/erp-boot/orders/123e4567-e89b-12d3-a456-426614174000']) {
    const api = capture();
    api.endpoints[0].path = path;
    assert.throws(() => validateApiObservations(api, ids));
  }
});
test('foreign origins, missing evidence and duplicate rows are rejected', () => {
  const foreign = capture(); foreign.endpoints[0].origin = 'https://other.example';
  assert.throws(() => validateApiObservations(foreign, ids));
  const missing = capture(); missing.endpoints[0].evidenceId = 'missing';
  assert.throws(() => validateApiObservations(missing, ids));
  const duplicate = capture(); duplicate.endpoints.push({ ...duplicate.endpoints[0] });
  assert.throws(() => validateApiObservations(duplicate, ids));
});
test('open hypotheses require alternative explanations and next probes', () => {
  const hypotheses = { schemaVersion: 1, hypotheses: [{ id: 'H01', level: 'unverified', statement: 'Webhook ingestion', alternative: 'Periodic polling', unknown: 'Backend transport', nextProbe: 'Inspect controlled test logs', resolution: 'open', evidenceIds: ['E15'] }] };
  assert.doesNotThrow(() => validateHypotheses(hypotheses, ids));
  hypotheses.hypotheses[0].alternative = '';
  assert.throws(() => validateHypotheses(hypotheses, ids));
});
