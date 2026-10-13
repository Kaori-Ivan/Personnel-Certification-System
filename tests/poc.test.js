const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createHandler } = require('../lib/records');
const { createServer } = require('../server');
const health = require('../api/health');
const env = { TEST_API_TOKEN: randomUUID(), GAS_SHARED_SECRET: randomUUID(), GAS_URL: 'https://script.google.com/macros/s/mock/exec' };
const input = { request_id: 'test-request-1', employee_id: 'TEST_EMP_001', certification_id: 'TEST_CERT_001' };
function gas() {
  const state = { held: false, busy: false, writes: 0, releases: 0, flushes: 0, fail: false, rows: [['request_id', 'record_id', 'employee_id', 'certification_id', 'created_at']] };
  const locked = () => assert.equal(state.held, true);
  const sheet = {
    getLastColumn: () => 5, getLastRow: () => state.rows.length,
    getDataRange: () => { locked(); return { getValues: () => state.rows }; },
    appendRow: row => { locked(); if (state.fail) throw Error(env.GAS_SHARED_SECRET); state.rows.push(Array.from(row)); state.writes++; }
  };
  const context = vm.createContext({
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => ({ GAS_SHARED_SECRET: env.GAS_SHARED_SECRET, TEST_SHEET_ID: 'mock-sheet-private' })[key] }) },
    LockService: { getScriptLock: () => ({ tryLock: () => { if (state.busy) return false; assert.equal(state.held, false); state.held = true; return true; }, releaseLock: () => { locked(); state.held = false; state.releases++; } }) },
    SpreadsheetApp: { openById: () => { locked(); return { getSheetByName: name => { assert.equal(name, 'Sprint1_TestRecords'); return sheet; } }; }, flush: () => { locked(); state.flushes++; } },
    Utilities: { getUuid: randomUUID }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../gas/Code.gs'), 'utf8'), context);
  const call = body => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(body) } }).text);
  return { state, call, context };
}
async function invoke(handler, { method = 'GET', token = env.TEST_API_TOKEN, body, url = '/api/test-records', type = 'application/json' } = {}) {
  const response = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(s) { this.statusCode = s; return this; }, json(b) { this.body = b; return this; } };
  await handler({ method, url, body, headers: { ...(token === null ? {} : { authorization: `Bearer ${token}` }), 'content-type': type } }, response);
  return response;
}
test('health works without configuration or credentials', async () => {
  const r = await invoke(health, { token: null }); assert.equal(r.statusCode, 200); assert.equal(r.body.ok, true);
});
test('missing and wrong API credentials never reach GAS', async () => {
  const handler = createHandler({ env, fetchImpl: () => { assert.fail('must not access GAS'); } });
  for (const token of [null, 'wrong']) assert.equal((await invoke(handler, { token })).statusCode, 401);
});
test('API → actual GAS source with mocked Google services: create/list/duplicate/conflict', async () => {
  const g = gas();
  const handler = createHandler({ env, fetchImpl: async (url, options) => {
    assert.equal(url, env.GAS_URL); assert.equal(options.method, 'POST');
    const body = JSON.parse(options.body); assert.equal(body.secret, env.GAS_SHARED_SECRET);
    return { ok: true, status: 200, json: async () => ({ ...g.call(body), secret: env.GAS_SHARED_SECRET, sheet_id: 'mock-sheet-private' }) };
  } });
  const first = await invoke(handler, { method: 'POST', body: input });
  const repeat = await invoke(handler, { method: 'POST', body: input });
  assert.equal(first.statusCode, 201); assert.equal(repeat.body.code, 'DUPLICATE');
  assert.deepEqual(first.body.record, repeat.body.record); assert.equal(g.state.writes, 1);
  const listing = await invoke(handler); assert.equal(listing.body.records.length, 1);
  assert.equal(JSON.stringify(listing.body).includes(env.GAS_SHARED_SECRET), false);
  assert.equal(JSON.stringify(listing.body).includes('mock-sheet-private'), false);
  assert.equal((await invoke(handler, { method: 'POST', body: { ...input, employee_id: 'TEST_OTHER' } })).statusCode, 409);
  assert.equal(g.state.flushes, 1); assert.equal(g.state.releases, 4); assert.equal(g.state.held, false);
});
test('GAS authenticates, validates schema/input and releases lock on errors', () => {
  const g = gas();
  for (const secret of [undefined, 'wrong']) assert.equal(g.call({ secret, action: 'list' }).code, 'UNAUTHORIZED');
  assert.equal(g.state.releases, 0);
  assert.equal(g.call({ secret: env.GAS_SHARED_SECRET, action: 'create', data: { ...input, employee_id: '=formula' } }).code, 'INVALID_INPUT');
  const request = { secret: env.GAS_SHARED_SECRET, action: 'create', data: input };
  g.state.busy = true; assert.equal(g.call(request).code, 'BUSY'); assert.equal(g.state.writes, 0);
  g.state.busy = false; g.state.fail = true;
  assert.deepEqual(g.call(request), { ok: false, code: 'INTERNAL_ERROR' }); assert.equal(g.state.held, false);
  g.state.fail = false; g.state.rows[0][0] = 'bad';
  assert.equal(g.call(request).code, 'SCHEMA_ERROR'); assert.equal(g.state.held, false);
  assert.equal(JSON.parse(g.context.doGet().text).code, 'METHOD_NOT_ALLOWED');
});
test('upstream failures and malformed responses are sanitized', async () => {
  const failures = [
    async () => { throw Error(env.GAS_SHARED_SECRET + env.TEST_API_TOKEN); },
    async () => ({ ok: false, status: 500 }),
    async () => ({ ok: true, status: 200, json: async () => ({ ok: false, code: env.GAS_SHARED_SECRET }) }),
    async () => ({ ok: true, status: 200, json: async () => { throw Error('private'); } }),
    async () => ({ ok: true, status: 200, json: async () => ({ ok: true, code: 'OK', records: [{}] }) })
  ];
  for (const fetchImpl of failures) {
    const r = await invoke(createHandler({ env, fetchImpl }));
    assert.equal(r.statusCode, 502); assert.deepEqual(r.body, { ok: false, code: 'UPSTREAM_ERROR' });
  }
});
test('timeout yields sanitized 504', async () => {
  const fetchImpl = async (_, { signal }) => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 1000);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(Error('timeout')); });
  });
  const r = await invoke(createHandler({ env, fetchImpl, timeoutMs: 10 })); assert.equal(r.statusCode, 504);
});
test('ContentService redirect follows with GET and no credentials; other hosts rejected', async () => {
  let calls = 0;
  const handler = createHandler({ env, fetchImpl: async (url, options) => {
    if (++calls === 1) return { status: 302, headers: new Headers({ location: 'https://script.googleusercontent.com/macros/echo?mock=1' }) };
    assert.equal(options.method, 'GET'); assert.equal(options.body, undefined); assert.equal(options.headers, undefined);
    return { ok: true, status: 200, json: async () => ({ ok: true, code: 'OK', records: [] }) };
  } });
  assert.equal((await invoke(handler)).statusCode, 200); assert.equal(calls, 2);
  assert.equal((await invoke(createHandler({ env, fetchImpl: async () => ({ status: 302, headers: new Headers({ location: 'https://example.com' }) }) }))).statusCode, 502);
});
test('query credentials, bad input, large body, method and bad configuration rejected', async () => {
  const handler = createHandler({ env, fetchImpl: () => assert.fail('unexpected upstream') });
  assert.equal((await invoke(handler, { url: '/api/test-records?secret=x' })).statusCode, 400);
  assert.equal((await invoke(handler, { method: 'DELETE' })).statusCode, 405);
  for (const body of [{}, { ...input, extra: 'x' }, { ...input, employee_id: '=1+1' }, '{']) assert.equal((await invoke(handler, { method: 'POST', body })).statusCode, 400);
  assert.equal((await invoke(handler, { method: 'POST', body: 'x'.repeat(4097) })).statusCode, 413);
  assert.equal((await invoke(handler, { method: 'POST', body: input, type: 'text/plain' })).statusCode, 415);
  assert.equal((await invoke(createHandler({ env: { ...env, GAS_URL: env.GAS_URL + '?secret=x' } }))).statusCode, 503);
});
test('local HTTP server routes and parses a real request', async t => {
  const g = gas();
  const server = createServer({ health, records: createHandler({ env, fetchImpl: async (_, o) => ({ ok: true, status: 200, json: async () => g.call(JSON.parse(o.body)) }) }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/api/health')).status, 200);
  assert.equal((await fetch(base + '/api/test-records')).status, 401);
  const response = await fetch(base + '/api/test-records', { method: 'POST', headers: { authorization: `Bearer ${env.TEST_API_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(input) });
  assert.equal(response.status, 201); assert.equal((await response.json()).code, 'CREATED');
});
