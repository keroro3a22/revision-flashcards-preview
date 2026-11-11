const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('public copy path waits for a signed-in content editor', () => {
  const src = fs.readFileSync('assets/copy-path.js', 'utf8');
  assert.match(src, /is_content_editor/);
  assert.match(src, /p6-sb-auth/);
  assert.doesNotMatch(src, /revision-copy-path/);
  assert.doesNotMatch(src, /copy=1/);
});
