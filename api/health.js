module.exports = function health(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, code: 'METHOD_NOT_ALLOWED' });
  }
  return res.status(200).json({ ok: true, service: 'sprint1-poc' });
};
