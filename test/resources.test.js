const test = require('node:test');
const assert = require('node:assert/strict');
const resources = require('../assets/resources.js');

test('a paper price is shown in Hong Kong dollars and the download stays locked', () => {
  assert.equal(resources.formatPrice(120), 'HK$120');
  assert.equal(resources.formatPrice(12.5), 'HK$12.50');
  assert.equal(resources.kindLabel('practice-paper'), 'Practice paper');
  assert.equal(resources.kindLabel('mock-test'), 'Mock test');
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '../assets/resources.js'), 'utf8');
  assert.match(source, /Download locked/);
  assert.match(source, /Test payment/);
  assert.match(source, /\/api\/payments\/health/);
});
