import { writeFile } from 'node:fs/promises';
import { validateAnimation } from './animation-validation.mjs';
const result=validateAnimation();
await writeFile(new URL('../research/animation-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(`Recorded ${result.scenarios.length} synthetic animation scenarios; ${result.scenarios.reduce((n,s)=>n+s.checks.length,0)} checks passed.`);
