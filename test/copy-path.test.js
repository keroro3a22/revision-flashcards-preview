const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('public copy path waits for a signed-in content editor', () => {
  const src = fs.readFileSync('assets/copy-path.js', 'utf8');
  assert.match(src, /is_content_editor/);
  assert.match(src, /copy-path-answer/);
  assert.match(src, /'Answer'/);
  assert.match(src, /'Victory'/);
  assert.match(src, /RevisionTestAnswer/);
  assert.match(src, /RevisionTestVictory/);
  assert.match(src, /mode !== 'boss'/);
  assert.match(src, /p6-sb-auth/);
  assert.doesNotMatch(src, /revision-copy-path/);
  assert.doesNotMatch(src, /copy=1/);
});
