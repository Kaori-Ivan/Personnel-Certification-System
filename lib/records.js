const { createHash, timingSafeEqual } = require('node:crypto');
const fields = ['request_id', 'employee_id', 'certification_id'];
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value);
const equal = (a, b) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
function validInput(data) {
  return data && typeof data === 'object' && !Array.isArray(data) &&
    Object.keys(data).length === fields.length && fields.every(key => id(data[key]));
}
function cleanRecord(data) {
  if (!data || !fields.every(key => id(data[key])) || !id(data.record_id) ||
      typeof data.created_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data.created_at) ||
      !Number.isFinite(Date.parse(data.created_at))) throw new Error('Invalid upstream');
  return Object.fromEntries([...fields, 'record_id', 'created_at'].map(key => [key, data[key]]));
}
function createHandler({ env = process.env, fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
  return async function records(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const fail = (status, code) => res.status(status).json({ ok: false, code });
    if (!['GET', 'POST'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST');
      return fail(405, 'METHOD_NOT_ALLOWED');
    }
    if (!env.TEST_API_TOKEN) return fail(503, 'CONFIGURATION_ERROR');
    const auth = req.headers.authorization;
    if (typeof auth !== 'string' || !equal(auth, `Bearer ${env.TEST_API_TOKEN}`)) return fail(401, 'UNAUTHORIZED');
    // This POC accepts no URL parameters, including credentials.
    if (new URL(req.url, 'http://localhost').search) return fail(400, 'QUERY_NOT_ALLOWED');
    let data;
    if (req.method === 'POST') {
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return fail(415, 'JSON_REQUIRED');
      try {
        if (req.body !== undefined) {
          if (Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) > 4096) return fail(413, 'BODY_TOO_LARGE');
          data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } else {
          const chunks = []; let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 4096) return fail(413, 'BODY_TOO_LARGE');
            chunks.push(chunk);
          }
          data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        }
      } catch { return fail(400, 'INVALID_INPUT'); }
      if (!validInput(data)) return fail(400, 'INVALID_INPUT');
    }
    let url;
    try {
      url = new URL(env.GAS_URL);
      if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.port ||
          !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) || url.search || url.hash || url.username || url.password ||
          !env.GAS_SHARED_SECRET || env.GAS_SHARED_SECRET === env.TEST_API_TOKEN) throw new Error();
    } catch { return fail(503, 'CONFIGURATION_ERROR'); }
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      let response = await fetchImpl(url.href, {
        method: 'POST', redirect: 'manual', signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: env.GAS_SHARED_SECRET, action: req.method === 'GET' ? 'list' : 'create', ...(data ? { data } : {}) })
      });
      // ContentService redirects to a response URL. Never resend the POST secret.
      if ([302, 303].includes(response.status)) {
        const redirect = new URL(response.headers.get('location'));
        if (redirect.protocol !== 'https:' || redirect.hostname !== 'script.googleusercontent.com' || redirect.port || redirect.username || redirect.password) throw new Error();
        response = await fetchImpl(redirect.href, { method: 'GET', redirect: 'error', signal });
      }
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (result.ok !== true) {
        if (result.code === 'REQUEST_ID_CONFLICT') return fail(409, 'REQUEST_ID_CONFLICT');
        if (result.code === 'BUSY') return fail(503, 'UPSTREAM_BUSY');
        throw new Error();
      }
      if (req.method === 'GET') {
        if (result.code !== 'OK' || !Array.isArray(result.records)) throw new Error();
        return res.status(200).json({ ok: true, code: 'OK', records: result.records.map(cleanRecord) });
      }
      if (!['CREATED', 'DUPLICATE'].includes(result.code)) throw new Error();
      const record = cleanRecord(result.record);
      if (!fields.every(key => record[key] === data[key])) throw new Error();
      return res.status(result.code === 'CREATED' ? 201 : 200).json({ ok: true, code: result.code, record });
    } catch {
      return fail(signal.aborted ? 504 : 502, signal.aborted ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_ERROR');
    }
  };
}
module.exports = { handler: createHandler(), createHandler };
