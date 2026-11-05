import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { ready, order, runScenarios } from './scenarios.mjs';

export function createSimulatorServer() {
  let demo;
  const reset = () => {
    demo = ready();
    demo.sim.ingestOrder(order());
  };
  reset();
  const facade = new Map([
    ['GET /erp-boot/pipeline/collection/list', () => Object.values(demo.sim.state.drafts)],
    ['GET /erp-boot/pipeline/workflow/list', () => Object.values(demo.sim.state.jobs)],
    ['GET /erp-boot/pipeline/workflow/statistics', () => Object.values(demo.sim.state.jobs).reduce((r, job) => ({ ...r, [job.state]: (r[job.state] ?? 0) + 1 }), {})],
    ['GET /erp-boot/shop/info/list', () => Object.values(demo.sim.state.stores)],
    ['POST /erp-boot/orders/queryOrderList', () => Object.values(demo.sim.state.orders)],
    ['POST /erp-boot/sales/store-stats/page', () => demo.sim.metrics('demo')],
  ]);
  const server = http.createServer(async (request, response) => {
    const send = (status, body) => {
      response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify(body));
    };
    const port = server.address().port;
    const allowed = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    if (!allowed.has(request.headers.host)) return send(403, { error: 'LOCAL_HOST_REQUIRED' });
    if (request.headers.origin && ![...allowed].some(host => request.headers.origin === `http://${host}`)) return send(403, { error: 'FOREIGN_ORIGIN' });
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    let body = {};
    try {
      if (request.method === 'POST') {
        if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')) return send(415, { error: 'JSON_REQUIRED' });
        const chunks = []; let size = 0;
        for await (const chunk of request) {
          size += chunk.length; if (size > 16384) return send(413, { error: 'BODY_TOO_LARGE' }); chunks.push(chunk);
        }
        body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400, { error: 'OBJECT_REQUIRED' });
      }
      if (request.method === 'GET' && url.pathname === '/') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'" });
        return response.end(await readFile(new URL('./web/index.html', import.meta.url)));
      }
      const asset = new Map([['/app.js', ['app.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']]]).get(url.pathname);
      if (request.method === 'GET' && asset) {
        response.writeHead(200, { 'content-type': `${asset[1]}; charset=utf-8` });
        return response.end(await readFile(new URL(`./web/${asset[0]}`, import.meta.url)));
      }
      if (request.method === 'GET' && url.pathname === '/api/state') return send(200, { scope: 'local-synthetic-only', state: demo.sim.snapshot(), metrics: demo.sim.metrics('demo') });
      if (request.method === 'GET' && url.pathname === '/api/scenarios') return send(200, runScenarios());
      if (request.method === 'POST' && url.pathname === '/api/command') {
        const { sim, job } = demo;
        switch (body.command) {
          case 'reset': reset(); break;
          case 'step': sim.step('demo', job, { fault: body.fault ?? 'none' }); break;
          case 'tick': sim.tick(1000); break;
          case 'pause': sim.pause('demo', job); break;
          case 'resume': sim.resume('demo', job); break;
          case 'auth': sim.authorize('demo', 'shop-a', !sim.store('demo', 'shop-a').authorized); break;
          case 'project': sim.project(); break;
          case 'cancel': sim.ingestOrder(order({ eventId: 'evt-cancel', version: 2, status: 'CANCELLED' })); break;
          default: return send(400, { error: 'UNKNOWN_COMMAND' });
        }
        return send(200, { scope: 'local-synthetic-only', state: demo.sim.snapshot(), metrics: demo.sim.metrics('demo') });
      }
      const query = facade.get(`${request.method} ${url.pathname}`);
      if (query) return send(200, { contract: 'synthetic-not-site-schema', data: query() });
      return send(404, { error: 'NOT_IMPLEMENTED_IN_SIMULATOR' });
    } catch (error) { return send(400, { error: error.message }); }
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.ERP_SIM_PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid ERP_SIM_PORT');
  const server = createSimulatorServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`ERP synthetic simulator: http://127.0.0.1:${port} (memory only, no external calls)`));
}
