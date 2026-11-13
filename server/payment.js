/* Test checkout for paid papers. The Airwallex key stays on this server.
   A successful test still does not unlock the file. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8787;
const API = 'https://api.sandbox.airwallex.com';

let token = '';
let tokenExp = 0;

function publicConfig() {
  const text = fs.readFileSync(path.join(ROOT, 'assets/supabase-public.js'), 'utf8');
  const url = text.match(/url:\s*'([^']+)'/);
  const key = text.match(/key:\s*'([^']+)'/);
  if (!url || !key) throw new Error('The public database settings are missing.');
  return { url: url[1], key: key[1] };
}

function configured() {
  return !!(process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY);
}

function signWebhook(secret, timestamp, raw) {
  return crypto.createHmac('sha256', secret).update(String(timestamp) + raw).digest('hex');
}

function webhookOk(secret, timestamp, raw, signature) {
  if (!secret || !timestamp || !signature) return false;
  const expected = signWebhook(secret, timestamp, raw);
  const left = Buffer.from(expected);
  const right = Buffer.from(String(signature));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

async function login() {
  if (token && Date.now() < tokenExp - 60000) return token;
  if (!configured()) {
    const error = new Error('Payment is not configured.');
    error.status = 503;
    throw error;
  }
  const response = await fetch(API + '/api/v1/authentication/login', {
    method: 'POST',
    headers: {
      'x-client-id': process.env.AIRWALLEX_CLIENT_ID,
      'x-api-key': process.env.AIRWALLEX_API_KEY,
      'content-type': 'application/json'
    }
  });
  const body = await response.json().catch(function () { return {}; });
  if (!response.ok || !body.token) {
    const error = new Error(body.message || 'Airwallex login failed.');
    error.status = 502;
    throw error;
  }
  token = body.token;
  tokenExp = Date.parse(body.expires_at) || (Date.now() + 20 * 60 * 1000);
  return token;
}

async function resourceById(id) {
  const cfg = publicConfig();
  const response = await fetch(cfg.url + '/rest/v1/resources_live?id=eq.' + encodeURIComponent(id) + '&select=id,title,kind,price', {
    headers: { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key }
  });
  const rows = await response.json().catch(function () { return []; });
  if (!response.ok || !Array.isArray(rows) || !rows.length) return null;
  return rows[0];
}

async function createIntent(resource) {
  const amount = Math.round(Number(resource.price) * 100) / 100;
  if (!isFinite(amount) || amount <= 0) {
    const error = new Error('This paper does not have a price yet.');
    error.status = 400;
    throw error;
  }
  const access = await login();
  const response = await fetch(API + '/api/v1/pa/payment_intents/create', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + access, 'content-type': 'application/json' },
    body: JSON.stringify({
      request_id: crypto.randomUUID(),
      amount: amount,
      currency: 'HKD',
      merchant_order_id: 'resource-' + resource.id + '-' + Date.now(),
      descriptor: 'Revision paper',
      metadata: { resource_id: String(resource.id), mode: 'test' }
    })
  });
  const body = await response.json().catch(function () { return {}; });
  if (!response.ok || !body.id || !body.client_secret) {
    const error = new Error(body.message || 'The test payment could not be started.');
    error.status = 502;
    throw error;
  }
  return {
    intentId: body.id,
    clientSecret: body.client_secret,
    currency: 'HKD',
    countryCode: 'HK',
    amount: amount,
    title: resource.title || 'Untitled paper'
  };
}

async function intentStatus(id) {
  if (!/^int_[A-Za-z0-9]+$/.test(id)) {
    const error = new Error('That payment id is not valid.');
    error.status = 400;
    throw error;
  }
  const access = await login();
  const response = await fetch(API + '/api/v1/pa/payment_intents/' + id, {
    headers: { Authorization: 'Bearer ' + access }
  });
  const body = await response.json().catch(function () { return {}; });
  if (!response.ok) {
    const error = new Error(body.message || 'The payment could not be checked.');
    error.status = 502;
    throw error;
  }
  return {
    id: body.id,
    status: body.status || '',
    paid: false,
    message: body.status === 'SUCCEEDED'
      ? 'Test payment received. The download stays locked.'
      : 'The test payment is not complete. The download stays locked.'
  };
}

function sendJson(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(raw);
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on('data', function (chunk) { chunks.push(chunk); });
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

function fileFor(urlPath) {
  const clean = decodeURIComponent(String(urlPath || '/').split('?')[0]);
  const rel = clean === '/' ? '/index.html' : clean;
  if (rel.split('/').some(function (part) { return part.startsWith('.'); })) return null;
  const file = path.resolve(ROOT, '.' + rel);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return null;
  return file;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg'
};

async function handle(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  try {
    if (req.method === 'GET' && url.pathname === '/api/payments/health') {
      sendJson(res, 200, { ok: true, configured: configured(), mode: 'sandbox' });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/payments/checkout') {
      if (!configured()) {
        sendJson(res, 503, { error: 'Payment is not configured.' });
        return;
      }
      const raw = await readBody(req);
      const input = JSON.parse(raw || '{}');
      const id = Number(input.resourceId);
      if (!Number.isInteger(id) || id <= 0) {
        sendJson(res, 400, { error: 'Choose a paper first.' });
        return;
      }
      const resource = await resourceById(id);
      if (!resource) {
        sendJson(res, 404, { error: 'That paper is not for sale.' });
        return;
      }
      sendJson(res, 200, await createIntent(resource));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/payments/status') {
      sendJson(res, 200, await intentStatus(url.searchParams.get('id') || ''));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/payments/webhook') {
      const raw = await readBody(req);
      const ok = webhookOk(
        process.env.AIRWALLEX_WEBHOOK_SECRET,
        req.headers['x-timestamp'],
        raw,
        req.headers['x-signature']
      );
      if (!ok) {
        sendJson(res, 400, { error: 'The webhook signature did not match.' });
        return;
      }
      sendJson(res, 200, { ok: true });
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, { error: 'That action is not available.' });
      return;
    }
    const file = fileFor(url.pathname);
    if (!file) {
      sendJson(res, 403, { error: 'That file is not available.' });
      return;
    }
    fs.stat(file, function (error, stat) {
      if (error || !stat.isFile()) {
        sendJson(res, 404, { error: 'Not found.' });
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      if (req.method === 'HEAD') res.end();
      else fs.createReadStream(file).pipe(res);
    });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || 'The payment server failed.' });
  }
}

function listen() {
  const server = http.createServer(handle);
  server.listen(PORT, '127.0.0.1');
  return server;
}

module.exports = { signWebhook: signWebhook, webhookOk: webhookOk, configured: configured, handle: handle };

if (require.main === module) listen();
