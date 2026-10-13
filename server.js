const http = require('node:http');
const health = require('./api/health');
const records = require('./api/test-records');
function createServer(handlers = { health, records }) {
  return http.createServer(async (req, res) => {
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); };
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/api/health') await handlers.health(req, res);
      else if (path === '/api/test-records') await handlers.records(req, res);
      else res.status(404).json({ ok: false, code: 'NOT_FOUND' });
    } catch { res.status(500).json({ ok: false, code: 'INTERNAL_ERROR' }); }
  });
}
if (require.main === module) createServer().listen(3000, '127.0.0.1', () => console.log('Sprint 1 POC: http://127.0.0.1:3000'));
module.exports = { createServer };
