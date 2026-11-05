const $ = selector => document.querySelector(selector);
async function request(url, body) {
  const response = await fetch(url, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
}
function renderState(data) {
  const job = Object.values(data.state.jobs)[0];
  $('#job-state').textContent = job.state;
  $('#listing-count').textContent = `${Object.keys(data.state.externalListings).length} / ${job.attempt}`;
  $('#amount').textContent = ((data.metrics.currencies.CNY?.effectiveAmountMinor ?? 0) / 100).toFixed(2);
  $('#pending').textContent = `${data.metrics.pendingEvents} / ${data.state.clock}ms`;
  $('#state-json').textContent = JSON.stringify(data, null, 2);
}
async function scenarios() {
  const result = await request('/api/scenarios'); $('#scenarios').replaceChildren();
  for (const scenario of result.scenarios) {
    const article = document.createElement('article'); article.className = 'scenario';
    const title = document.createElement('h3'); title.textContent = `${scenario.id} · ${scenario.title}`;
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = `通过 ${scenario.checks.length} 项断言`;
    const finding = document.createElement('p'); finding.textContent = scenario.finding;
    const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = '查看实验断言';
    const list = document.createElement('ul');
    for (const check of scenario.checks) { const row = document.createElement('li'); row.textContent = check.name; list.append(row); }
    details.append(summary, list); article.append(title, badge, finding, details); $('#scenarios').append(article);
  }
}
document.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button || button.disabled) return;
  const buttons = [...document.querySelectorAll('button')]; buttons.forEach(b => { b.disabled = true; });
  try {
    if (button.id === 'rerun') { await scenarios(); $('#notice').textContent = '9项实验重新运行通过。'; }
    else { renderState(await request('/api/command', { command: button.dataset.command, fault: button.dataset.fault })); $('#notice').textContent = '本地模拟状态已更新。'; }
  } catch (error) { $('#notice').textContent = `操作未完成：${error.message}`; }
  finally { buttons.forEach(b => { b.disabled = false; }); }
});
Promise.all([request('/api/state').then(renderState), scenarios()]).catch(error => { $('#notice').textContent = error.message; });
