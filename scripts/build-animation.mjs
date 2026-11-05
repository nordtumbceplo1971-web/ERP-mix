import {mkdir,readFile,writeFile} from 'node:fs/promises';
const web=new URL('../simulator/web/',import.meta.url);
const read=path=>readFile(new URL(path,web),'utf8');
const [html,css,generic,shopify,app]=await Promise.all(['animation.html','animation.css','animation-model.mjs','shopify-model.mjs','animation.js'].map(read));
const javascript=[generic,shopify,app].map(source=>source.replace(/^import .+;\r?\n/gm,'').replace(/^export /gm,'')).join('\n');
new Function(javascript);
const result=html.replace('<link rel="stylesheet" href="/animation.css">',()=>`<style>\n${css}\n</style>`)
  .replace('<script type="module" src="/animation.js"></script>','')
  .replace('<a class="back" href="/">打开验证实验室 ↗</a>','<span class="back">离线演示 · 无外部连接</span>')
  .replace('</body>',()=>`<script>\n(()=>{\n${javascript}\n})();\n</script></body>`);
if(/<script[^>]+src=|<link[^>]+stylesheet/.test(result))throw new Error('Standalone page still has external runtime assets');
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
const output=new URL('../dist/erp-shopify-animation.html',import.meta.url);
await writeFile(output,result);
console.log(`Standalone animation: ${output.pathname}`);
