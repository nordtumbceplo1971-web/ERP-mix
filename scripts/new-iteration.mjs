import { writeFile } from 'node:fs/promises';
const [id, ...words] = process.argv.slice(2);
if (!id || !/^\d{4}-[a-z0-9-]+$/.test(id) || !words.length) {
  console.error('Usage: npm run report:new -- 0002-workflow-detail 标题');
  process.exit(1);
}
const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date());
const target = new URL(`../docs/iterations/${id}.md`, import.meta.url);
await writeFile(target, `# ${id} — ${words.join(' ')}\n\n日期：${date}（Asia/Shanghai）\n\n## 目标与变更\n\nTODO\n\n## 来源与证据ID\n\nTODO\n\n## 验证结果\n\nTODO\n\n## 限制、风险与回退\n\nTODO\n\n## 后续工作\n\nTODO\n`, { flag: 'wx' });
console.log(`Created ${target.pathname}. Update CHANGELOG.md and research/traceability.json before committing.`);
