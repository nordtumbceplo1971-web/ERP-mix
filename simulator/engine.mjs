import assert from 'node:assert/strict';

const key = (...parts) => JSON.stringify(parts);
const copy = value => structuredClone(value);
const id = value => { assert(typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value), 'INVALID_ID'); return value; };
const integer = value => { assert(Number.isSafeInteger(value) && value >= 0, 'INVALID_INTEGER'); return value; };
const has = (object, name) => Object.hasOwn(object, name);

export class Simulator {
  constructor(snapshot) {
    this.state = snapshot ? copy(snapshot) : {
      schemaVersion: 1, clock: 0, sequence: 0, stores: {}, drafts: {}, jobs: {},
      externalListings: {}, orders: {}, inbox: {}, cursors: {}, outbox: [],
      projection: { applied: [], orders: {}, through: 0 }, audit: [],
    };
    assert.equal(this.state.schemaVersion, 1, 'UNSUPPORTED_SNAPSHOT');
  }
  snapshot() { return copy(this.state); }
  log(type, data) { this.state.audit.push({ sequence: ++this.state.sequence, at: this.state.clock, type, ...copy(data) }); }
  store(tenant, shop) {
    const found = this.state.stores[key(id(tenant), id(shop))];
    assert(found, 'STORE_NOT_FOUND'); return found;
  }
  addStore(tenant, shop, { platform = 'mock-platform', capabilities = ['publish', 'orders'] } = {}) {
    const k = key(id(tenant), id(shop)); assert(!has(this.state.stores, k), 'STORE_EXISTS');
    assert(Array.isArray(capabilities) && capabilities.every(c => ['publish', 'orders'].includes(c)), 'INVALID_CAPABILITIES');
    this.state.stores[k] = { tenant, shop, platform: id(platform), capabilities: [...capabilities], authorized: true };
    this.log('StoreConnected', { tenant, shop });
  }
  authorize(tenant, shop, authorized) {
    assert(typeof authorized === 'boolean'); this.store(tenant, shop).authorized = authorized;
    this.log('AuthorizationChanged', { tenant, shop, authorized });
  }
  collect(tenant, source, externalId, title) {
    id(tenant); id(source); id(externalId); assert(typeof title === 'string' && title.trim().length > 0 && title.length <= 200, 'INVALID_TITLE');
    const k = key(tenant, source, externalId);
    if (!has(this.state.drafts, k)) {
      this.state.drafts[k] = { tenant, source, externalId, title, revision: 1, reviewedRevision: null };
      this.log('ProductCollected', { tenant, source, externalId });
    }
    // Collection never implicitly schedules publication in this model.
    return k;
  }
  draft(tenant, draftKey) { const draft = this.state.drafts[draftKey]; assert(draft && draft.tenant === id(tenant), 'DRAFT_NOT_FOUND'); return draft; }
  editDraft(tenant, draftKey, title) {
    assert(typeof title === 'string' && title.trim() && title.length <= 200, 'INVALID_TITLE');
    const draft = this.draft(tenant, draftKey); draft.title = title; draft.revision++; draft.reviewedRevision = null;
    this.log('DraftEdited', { tenant, draftKey, revision: draft.revision });
  }
  review(tenant, draftKey) { const draft = this.draft(tenant, draftKey); draft.reviewedRevision = draft.revision; this.log('DraftReviewed', { tenant, draftKey, revision: draft.revision }); }
  claim(tenant, shop, draftKey) {
    const store = this.store(tenant, shop); assert(store.capabilities.includes('publish'), 'CAPABILITY_UNAVAILABLE');
    const draft = this.draft(tenant, draftKey); assert.equal(draft.reviewedRevision, draft.revision, 'REVIEW_REQUIRED');
    const jobKey = key(tenant, shop, draftKey, draft.revision);
    if (!has(this.state.jobs, jobKey)) {
      this.state.jobs[jobKey] = { tenant, shop, draftKey, revision: draft.revision, title: draft.title, state: 'QUEUED', attempt: 0, nextAt: 0, idempotencyKey: jobKey, receipt: null };
      this.log('WorkflowClaimed', { tenant, shop, jobKey });
    }
    return jobKey;
  }
  job(tenant, jobKey) { const job = this.state.jobs[jobKey]; assert(job && job.tenant === id(tenant), 'JOB_NOT_FOUND'); return job; }
  tick(milliseconds) { this.state.clock += integer(milliseconds); assert(Number.isSafeInteger(this.state.clock)); }
  pause(tenant, jobKey) {
    const job = this.job(tenant, jobKey); assert(['QUEUED', 'RUNNING', 'READY_TO_PUBLISH', 'RETRY_WAIT'].includes(job.state), 'CANNOT_PAUSE');
    job.resumeState = job.state; job.state = 'PAUSED'; this.log('WorkflowPaused', { tenant, jobKey });
  }
  resume(tenant, jobKey) {
    const job = this.job(tenant, jobKey); assert.equal(job.state, 'PAUSED', 'NOT_PAUSED'); job.state = job.resumeState; delete job.resumeState;
    this.log('WorkflowResumed', { tenant, jobKey });
  }
  step(tenant, jobKey, { fault = 'none', retryAfter = 1000 } = {}) {
    assert(['none', 'rate-limit', 'accepted-timeout', 'unknown-timeout'].includes(fault), 'INVALID_FAULT'); integer(retryAfter);
    const job = this.job(tenant, jobKey); const store = this.store(tenant, job.shop);
    if (['COMPLETED', 'FAILED', 'PAUSED'].includes(job.state)) return job.state;
    const before = job.state;
    if (!store.authorized) {
      job.resumeAfterAuth ??= job.state; job.state = 'WAITING_AUTH';
      this.log('WorkflowAdvanced', { tenant, jobKey, before, after: job.state }); return job.state;
    }
    if (job.state === 'RECONCILE_REQUIRED') {
      // A read receipt resolves an ambiguous external acceptance. No blind republish.
      const receipt = this.state.externalListings[job.idempotencyKey];
      if (receipt) { job.receipt = copy(receipt); job.state = 'COMPLETED'; }
      this.log('PublicationReconciled', { tenant, jobKey, before, after: job.state }); return job.state;
    }
    if (job.state === 'WAITING_AUTH') { job.state = job.resumeAfterAuth; delete job.resumeAfterAuth; }
    else if (this.draft(tenant, job.draftKey).revision !== job.revision) { job.state = 'FAILED'; job.error = 'STALE_INPUT'; }
    else if (job.state === 'QUEUED') job.state = 'RUNNING';
    else if (job.state === 'RUNNING') job.state = 'READY_TO_PUBLISH';
    else if (job.state === 'RETRY_WAIT') { if (this.state.clock >= job.nextAt) job.state = 'READY_TO_PUBLISH'; }
    else if (job.state === 'READY_TO_PUBLISH') {
      job.attempt++;
      if (fault === 'rate-limit') { job.state = 'RETRY_WAIT'; job.nextAt = this.state.clock + retryAfter; }
      else {
        job.state = 'PUBLISHING';
        if (fault !== 'unknown-timeout' && !has(this.state.externalListings, job.idempotencyKey)) {
          this.state.externalListings[job.idempotencyKey] = { listingId: `mock-listing-${Object.keys(this.state.externalListings).length + 1}`, platformState: 'ON_SALE', title: job.title };
        }
        if (fault.endsWith('timeout')) job.state = 'RECONCILE_REQUIRED';
        else { job.receipt = copy(this.state.externalListings[job.idempotencyKey]); job.state = 'COMPLETED'; }
      }
    }
    this.log('WorkflowAdvanced', { tenant, jobKey, before, after: job.state }); return job.state;
  }
  ingestOrder(event) {
    const { tenant, shop, eventId, externalId, version, status, amountMinor, currency } = event;
    const store = this.store(tenant, shop); assert(store.capabilities.includes('orders'), 'CAPABILITY_UNAVAILABLE'); assert(store.authorized, 'AUTH_REQUIRED');
    id(eventId); id(externalId); integer(version); assert(version > 0, 'INVALID_VERSION'); integer(amountMinor);
    assert(['PENDING', 'CANCELLED', 'SHIPPED'].includes(status), 'INVALID_ORDER_STATE'); assert(/^[A-Z]{3}$/.test(currency), 'INVALID_CURRENCY');
    const normalized = { tenant, shop, externalId, version, status, amountMinor, currency };
    const fingerprint = JSON.stringify(normalized);
    const eventKey = key(tenant, shop, eventId); const orderKey = key(tenant, shop, externalId);
    if (has(this.state.inbox, eventKey)) { assert.equal(this.state.inbox[eventKey], fingerprint, 'EVENT_ID_CONFLICT'); return 'DUPLICATE'; }
    const previous = this.state.orders[orderKey];
    if (previous && previous.version === version) assert.equal(JSON.stringify(previous), fingerprint, 'VERSION_CONFLICT');
    this.state.inbox[eventKey] = fingerprint;
    if (previous && previous.version >= version) return 'STALE';
    this.state.orders[orderKey] = normalized;
    // Order snapshot and outbox event are one local commit in syncBatch.
    this.state.outbox.push({ id: this.state.outbox.length + 1, orderKey, snapshot: copy(normalized) });
    this.log('OrderAccepted', { tenant, shop, externalId, version }); return 'APPLIED';
  }
  syncBatch(tenant, shop, { cursor, nextCursor, events, failAfter = null }) {
    this.store(tenant, shop); assert(Array.isArray(events) && events.length <= 100, 'INVALID_BATCH');
    for (const value of [cursor, nextCursor]) assert(value === null || (typeof value === 'string' && value.length <= 100), 'INVALID_CURSOR');
    const cursorKey = key(tenant, shop);
    assert.equal(this.state.cursors[cursorKey] ?? null, cursor, 'CURSOR_CONFLICT');
    const before = this.snapshot();
    try {
      const results = events.map((event, index) => {
        assert.equal(event.tenant, tenant, 'TENANT_MISMATCH'); assert.equal(event.shop, shop, 'SHOP_MISMATCH');
        const result = this.ingestOrder(event);
        if (index === failAfter) throw new Error('INJECTED_LOCAL_COMMIT_FAILURE');
        return result;
      });
      this.state.cursors[cursorKey] = nextCursor;
      return results;
    } catch (error) { this.state = before; throw error; }
  }
  project({ limit = Infinity } = {}) {
    assert(limit === Infinity || (Number.isSafeInteger(limit) && limit >= 0), 'INVALID_LIMIT');
    let applied = 0;
    for (const event of this.state.outbox) {
      if (this.state.projection.applied.includes(event.id)) continue;
      if (applied >= limit) break;
      const previous = this.state.projection.orders[event.orderKey];
      if (!previous || previous.version < event.snapshot.version) this.state.projection.orders[event.orderKey] = copy(event.snapshot);
      this.state.projection.applied.push(event.id); this.state.projection.through = event.id; applied++;
    }
    return applied;
  }
  metrics(tenant) {
    id(tenant); const currencies = {};
    for (const order of Object.values(this.state.projection.orders).filter(o => o.tenant === tenant)) {
      const group = currencies[order.currency] ??= { totalOrders: 0, cancelledOrders: 0, effectiveOrders: 0, effectiveAmountMinor: 0 };
      group.totalOrders++;
      if (order.status === 'CANCELLED') group.cancelledOrders++;
      else { group.effectiveOrders++; group.effectiveAmountMinor += order.amountMinor; assert(Number.isSafeInteger(group.effectiveAmountMinor), 'AMOUNT_OVERFLOW'); }
    }
    return { model: 'synthetic-v1-excludes-cancelled', currencies, projectedThrough: this.state.projection.through, pendingEvents: this.state.outbox.filter(e => !this.state.projection.applied.includes(e.id) && e.snapshot.tenant === tenant).length };
  }
}
