import { readFile, access, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateApiObservations, validateHypotheses } from './research-validation.mjs';
import { SIMULATOR_MODEL_VERSION } from '../simulator/engine.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = async path => readFile(resolve(root, path), 'utf8');
const exists = async path => {
  const target = resolve(root, path);
  const rel = relative(root, target);
  assert(!rel.startsWith('..') && !isAbsolute(rel), `Path escapes repository: ${path}`);
  await access(target);
};
const evidence = JSON.parse(await read('research/evidence.json'));
const trace = JSON.parse(await read('research/traceability.json'));
assert.equal(evidence.schemaVersion, 1);
assert.equal(trace.schemaVersion, 1);
const ids = new Set();
for (const item of evidence.evidence) {
  assert(item.id && !ids.has(item.id), `Duplicate/missing evidence ID: ${item.id}`);
  ids.add(item.id);
  if (item.kind === 'local-experiment') {
    assert.equal(item.scope, 'local-synthetic-only');
    assert(item.command && item.artifact && item.scenarioIds.length);
    await exists(item.artifact);
    const result = JSON.parse(await read(item.artifact));
    assert.equal(result.scope, item.scope);
    for (const id of item.scenarioIds) assert(result.scenarios.some(s => s.id === id && s.status === 'passed'), `Missing simulated scenario: ${id}`);
  } else if (item.kind === 'official-documentation') {
    assert.equal(item.scope, 'official-documentation-only');
    await exists(item.artifact);
    const docs = JSON.parse(await read(item.artifact));
    assert.equal(docs.scope, item.scope);
    assert(docs.sources.length > 0 && docs.apiVersion);
    const sourceIds = new Set();
    for (const source of docs.sources) {
      assert.equal(new URL(source.url).origin, 'https://shopify.dev');
      assert(source.id && !sourceIds.has(source.id) && source.facts.length);
      sourceIds.add(source.id);
    }
  } else {
    assert(!item.kind || item.kind === 'website', 'Unknown evidence kind');
    assert.equal(new URL(item.url).origin, 'https://erp.yeeke.com');
    assert(item.requestIds.length);
  }
  assert(item.facts.length && item.limitations);
  assert.equal(item.level, 'observed');
}
const claims = new Set();
for (const claim of trace.claims) {
  assert(claim.id && !claims.has(claim.id), `Duplicate/missing claim: ${claim.id}`);
  claims.add(claim.id);
  assert(['observed', 'inferred', 'unverified'].includes(claim.level));
  assert(claim.statement && claim.evidenceIds.length && claim.documents.length);
  for (const id of claim.evidenceIds) assert(ids.has(id), `Unknown evidence: ${id}`);
  for (const doc of claim.documents) await exists(doc);
}
const indexed = new Set();
const changelog = await read('CHANGELOG.md');
for (const iteration of trace.iterations) {
  assert(!indexed.has(iteration.report), `Duplicate iteration: ${iteration.report}`);
  indexed.add(iteration.report);
  const report = await read(iteration.report);
  assert(!report.includes('TODO'), `Incomplete iteration: ${iteration.id}`);
  assert(changelog.includes(iteration.changelogVersion) && changelog.includes(iteration.report));
  for (const id of iteration.evidenceIds) assert(ids.has(id), `Unknown evidence: ${id}`);
}
for (const name of await readdir(resolve(root, 'docs/iterations'))) {
  if (name.endsWith('.md')) assert(indexed.has(`docs/iterations/${name}`), `Unindexed report: ${name}`);
}
const api = JSON.parse(await read('research/api-observations.json'));
const hypotheses = JSON.parse(await read('research/hypotheses.json'));
validateApiObservations(api, ids);
validateHypotheses(hypotheses, ids);
const simulation = JSON.parse(await read('research/simulation-results.json'));
const animation = JSON.parse(await read('research/animation-results.json'));
assert.equal(animation.scope, 'local-synthetic-only');
const animationIds = new Set();
for (const scenario of animation.scenarios) {
  assert(scenario.id && !animationIds.has(scenario.id));
  animationIds.add(scenario.id);
  assert.equal(scenario.status, 'passed');
  assert(scenario.checks.length > 0);
  for (const check of scenario.checks) { assert.equal(check.passed, true); assert.deepEqual(check.actual, check.expected); }
}
assert.equal(simulation.scope, 'local-synthetic-only');
assert.equal(simulation.simulatorVersion, SIMULATOR_MODEL_VERSION);
const scenarioIds = new Set();
const hypothesisIds = new Set(hypotheses.hypotheses.map(h => h.id));
for (const scenario of simulation.scenarios) {
  assert(scenario.id && !scenarioIds.has(scenario.id), 'Duplicate/missing simulation ID');
  scenarioIds.add(scenario.id);
  assert.equal(scenario.status, 'passed');
  assert(scenario.checks.length > 0);
  for (const check of scenario.checks) { assert.equal(check.passed, true); assert.deepEqual(check.actual, check.expected); }
  for (const id of scenario.evidenceIds) assert(ids.has(id), `Unknown scenario evidence: ${id}`);
  for (const id of scenario.hypothesisIds) assert(hypothesisIds.has(id), `Unknown scenario hypothesis: ${id}`);
}
for (const h of hypotheses.hypotheses) {
  if (!h.simulationAssessment) continue;
  const assessment = h.simulationAssessment;
  assert(evidence.evidence.some(e => e.id === assessment.evidenceId && e.kind === 'local-experiment'));
  assert.equal(assessment.originalImplementationResolution, 'open');
  for (const id of assessment.scenarioIds) assert(simulation.scenarios.some(s => s.id === id && s.hypothesisIds.includes(h.id)), `Invalid simulation mapping for ${h.id}`);
}
for (const item of evidence.evidence) {
  if (!item.capture) continue;
  await exists(item.capture.artifact);
  assert.equal(item.capture.artifact, 'research/api-observations.json');
  assert(api.endpoints.some(row => row.evidenceId === item.id && row.phase === item.capture.phase), `Capture missing for ${item.id}`);
}
console.log(`Validated ${ids.size} evidence records, ${claims.size} claims, ${indexed.size} iteration reports, ${api.endpoints.length} API observations, ${hypotheses.hypotheses.length} hypotheses, ${scenarioIds.size} core + ${animationIds.size} animation scenarios.`);
