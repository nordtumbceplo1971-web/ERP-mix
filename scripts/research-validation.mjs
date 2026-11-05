import assert from 'node:assert/strict';

export function validateApiObservations(api, evidenceIds) {
  assert.equal(api.schemaVersion, 1);
  const topKeys = new Set(['schemaVersion', 'capturedOn', 'timezone', 'transport', 'scope', 'coverage', 'dropped', 'endpoints']);
  for (const key of Object.keys(api)) assert(topKeys.has(key), `Unexpected capture field: ${key}`);
  assert(Number.isInteger(api.dropped) && api.dropped >= 0);
  assert(Array.isArray(api.endpoints) && api.endpoints.length);
  const seen = new Set();
  const rowKeys = new Set(['phase', 'origin', 'path', 'methods', 'statuses', 'evidenceId']);
  for (const row of api.endpoints) {
    for (const key of Object.keys(row)) assert(rowKeys.has(key), `Unexpected API field: ${key}`);
    assert.equal(row.origin, 'https://erp.yeeke.com');
    assert(/^\/erp-boot\/[A-Za-z0-9_/:.-]+$/.test(row.path), 'Only normalized ERP paths without queries or fragments are allowed');
    assert(!row.path.split('/').some(part => /^\d+$/.test(part) || /^[0-9a-f-]{24,}$/i.test(part)), 'Dynamic identifiers must be normalized');
    assert(typeof row.phase === 'string' && row.phase.length);
    assert(evidenceIds.has(row.evidenceId), `Unknown API evidence: ${row.evidenceId}`);
    assert(Array.isArray(row.methods) && row.methods.length && row.methods.every(m => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(m)));
    assert(Array.isArray(row.statuses) && row.statuses.every(s => Number.isInteger(s) && s >= 100 && s <= 599));
    const key = `${row.phase} ${row.path}`;
    assert(!seen.has(key), `Duplicate API observation: ${key}`);
    seen.add(key);
  }
}

export function validateHypotheses(data, evidenceIds) {
  assert.equal(data.schemaVersion, 1);
  const seen = new Set();
  for (const item of data.hypotheses) {
    assert(item.id && !seen.has(item.id), 'Duplicate/missing hypothesis ID');
    seen.add(item.id);
    assert(['inferred', 'unverified'].includes(item.level));
    assert.equal(item.resolution, 'open');
    for (const field of ['statement', 'alternative', 'unknown', 'nextProbe']) assert(typeof item[field] === 'string' && item[field].trim());
    assert(Array.isArray(item.evidenceIds) && item.evidenceIds.length);
    for (const id of item.evidenceIds) assert(evidenceIds.has(id), `Unknown hypothesis evidence: ${id}`);
  }
}
