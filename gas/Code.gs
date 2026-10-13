var HEADERS = ['request_id', 'record_id', 'employee_id', 'certification_id', 'created_at'];
function reply_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
function fail_(code) { return reply_({ ok: false, code: code }); }
function id_(value) { return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value); }
function record_(row) {
  var result = {};
  HEADERS.forEach(function (key, i) { result[key] = row[i] instanceof Date ? row[i].toISOString() : row[i]; });
  return result;
}
function doGet() { return fail_('METHOD_NOT_ALLOWED'); }
function doPost(e) {
  var lock;
  var acquired = false;
  try {
    if (!e || e.queryString || !e.postData || e.postData.length > 4096 ||
        typeof e.postData.contents !== 'string' || e.postData.contents.length > 4096) return fail_('INVALID_INPUT');
    var body;
    try { body = JSON.parse(e.postData.contents); } catch (_) { return fail_('INVALID_INPUT'); }
    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty('GAS_SHARED_SECRET');
    if (!secret) return fail_('CONFIGURATION_ERROR');
    if (!body || typeof body.secret !== 'string' || body.secret !== secret) return fail_('UNAUTHORIZED');
    if (body.action !== 'list' && body.action !== 'create') return fail_('INVALID_INPUT');
    if (Object.keys(body).sort().join(',') !== (body.action === 'list' ? 'action,secret' : 'action,data,secret')) return fail_('INVALID_INPUT');
    var data = body.data;
    if (body.action === 'create' && (!data || Array.isArray(data) ||
        Object.keys(data).sort().join(',') !== 'certification_id,employee_id,request_id' ||
        !['request_id', 'employee_id', 'certification_id'].every(function (key) { return id_(data[key]); }))) return fail_('INVALID_INPUT');
    var sheetId = props.getProperty('TEST_SHEET_ID');
    if (!sheetId) return fail_('CONFIGURATION_ERROR');
    lock = LockService.getScriptLock();
    acquired = lock.tryLock(10000);
    if (!acquired) return fail_('BUSY');
    var sheet = SpreadsheetApp.openById(sheetId).getSheetByName('Sprint1_TestRecords');
    if (!sheet || sheet.getLastColumn() !== HEADERS.length || sheet.getLastRow() < 1) return fail_('SCHEMA_ERROR');
    var rows = sheet.getDataRange().getValues();
    if (JSON.stringify(rows[0]) !== JSON.stringify(HEADERS)) return fail_('SCHEMA_ERROR');
    var records = rows.slice(1).map(record_);
    if (body.action === 'list') return reply_({ ok: true, code: 'OK', records: records });
    var existing = records.filter(function (r) { return r.request_id === data.request_id; });
    if (existing.length) {
      if (existing.length !== 1 || existing[0].employee_id !== data.employee_id || existing[0].certification_id !== data.certification_id) return fail_('REQUEST_ID_CONFLICT');
      return reply_({ ok: true, code: 'DUPLICATE', record: existing[0] });
    }
    var row = [data.request_id, Utilities.getUuid(), data.employee_id, data.certification_id, new Date().toISOString()];
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return reply_({ ok: true, code: 'CREATED', record: record_(row) });
  } catch (_) {
    return fail_('INTERNAL_ERROR');
  } finally {
    if (acquired) lock.releaseLock();
  }
}
