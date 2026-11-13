const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadScripts } = require('./helpers');

const root = path.join(__dirname, '..');

test('sentence fill continues an unfinished set and rotates after it is finished', () => {
  const { window } = loadScripts(['practice/fill-sets.js']);
  const F = window.FillSets;
  const sets = F.group([
    { id: 'a', set: 1 },
    { id: 'b', set: 1 },
    { id: 'c', set: 2 },
    { id: 'd', set: 3 },
    { id: 'e' }
  ]);
  function same(actual, expected) {
    assert.equal(JSON.stringify(actual), JSON.stringify(expected));
  }
  assert.equal(sets.length, 3);
  same(sets[0].map(item => item.id), ['a', 'b', 'e']);
  same(F.resume(null, sets), { set: 0, item: 0 });
  same(F.resume({ set: 1, item: 0, finished: false }, sets), { set: 1, item: 0 });
  same(F.resume({ set: 1, item: 0, finished: true }, sets), { set: 2, item: 0 });
  same(F.resume({ set: 2, item: 0, finished: true }, sets), { set: 0, item: 0 });
  same(F.resume({ set: 0, item: 9, finished: false }, sets), { set: 0, item: 2 });
  same(F.resume({ set: 1, item: 4, finished: false }, sets), { set: 1, item: 0 });
  same(F.locate(sets, 'c'), { set: 1, item: 0 });
  const mem = { store: {}, getItem(k) { return this.store[k] || null; }, setItem(k, v) { this.store[k] = v; } };
  const storageKey = F.key('unit5', 'easy');
  F.write(mem, storageKey, { set: 1, item: 0, finished: false });
  same(F.read(mem, storageKey), { set: 1, item: 0, finished: false });
});

test('the fill page rotates sets without a picker and letters stay unsplit', () => {
  const fill = fs.readFileSync(path.join(root, 'practice/fill.html'), 'utf8');
  const letters = fs.readFileSync(path.join(root, 'practice/letters.html'), 'utf8');
  const match = fs.readFileSync(path.join(root, 'practice/match.html'), 'utf8');
  const timed = fs.readFileSync(path.join(root, 'practice/timed.html'), 'utf8');
  const live = fs.readFileSync(path.join(root, 'practice/practice-live.js'), 'utf8');
  assert.match(fill, /fill-sets\.js/);
  assert.match(fill, /PracticeLive\.ready\('fill'\)/);
  assert.match(fill, /F\.resume/);
  assert.doesNotMatch(fill, /Choose a set|set picker|<select[^>]*set/i);
  assert.doesNotMatch(letters, /FillSets/);
  assert.doesNotMatch(match, /FillSets/);
  assert.doesNotMatch(timed, /FillSets/);
  assert.match(live, /set_no/);
  assert.match(live, /mode === 'letters'/);
  assert.match(live, /mode === 'match'/);
  assert.match(live, /mode === 'timed'/);
});
