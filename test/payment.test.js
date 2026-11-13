const test = require('node:test');
const assert = require('node:assert/strict');
const payment = require('../server/payment.js');

test('a webhook is accepted only when the signature matches', () => {
  const raw = '{"name":"payment_intent.succeeded"}';
  const signature = payment.signWebhook('test-secret', '1700000000', raw);
  assert.equal(payment.webhookOk('test-secret', '1700000000', raw, signature), true);
  assert.equal(payment.webhookOk('test-secret', '1700000000', raw, 'nope'), false);
  assert.equal(payment.webhookOk('', '1700000000', raw, signature), false);
});

test('the payment server is not configured until both Airwallex values are present', () => {
  const previousId = process.env.AIRWALLEX_CLIENT_ID;
  const previousKey = process.env.AIRWALLEX_API_KEY;
  delete process.env.AIRWALLEX_CLIENT_ID;
  delete process.env.AIRWALLEX_API_KEY;
  assert.equal(payment.configured(), false);
  process.env.AIRWALLEX_CLIENT_ID = 'client';
  assert.equal(payment.configured(), false);
  process.env.AIRWALLEX_API_KEY = 'key';
  assert.equal(payment.configured(), true);
  if (previousId == null) delete process.env.AIRWALLEX_CLIENT_ID;
  else process.env.AIRWALLEX_CLIENT_ID = previousId;
  if (previousKey == null) delete process.env.AIRWALLEX_API_KEY;
  else process.env.AIRWALLEX_API_KEY = previousKey;
});
