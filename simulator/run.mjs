import { writeFile } from 'node:fs/promises';
import { runScenarios } from './scenarios.mjs';
const results = runScenarios();
if (process.argv.includes('--write')) {
  await writeFile(new URL('../research/simulation-results.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
}
for (const scenario of results.scenarios) console.log(`${scenario.id} PASS ${scenario.title} (${scenario.checks.length} checks)`);
console.log(`${results.scenarios.length} synthetic scenarios passed; original-site implementation remains unverified.`);
