const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const grammar = require('../practice/grammar/grammar-live.js');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).sort().forEach((key) => { out[key] = stable(value[key]); });
    return out;
  }
  return value;
}

const root = path.join(__dirname, '..');

test('a published grammar list rebuilds the sets students play', () => {
  const pages = ['unit1-story', 'unit1-chat', 'unit1-join', 'unit2-story', 'unit4-chat'];
  pages.forEach((page) => {
    const source = fs.readFileSync(path.join(root, 'practice/grammar', page + '.html'), 'utf8');
    const sets = grammar.extractSets(source);
    assert.equal(sets.length, 5, page);
    const rows = grammar.flatten(sets).map((body) => ({ published: body }));
    assert.equal(JSON.stringify(stable(grammar.rebuild(rows))), JSON.stringify(stable(sets)), page);
  });
});

test('grammar pages wait for the published list before they start', () => {
  const pages = fs.readdirSync(path.join(root, 'practice/grammar')).filter((name) => /^(unit\d-(story|chat|join)|boss)\.html$/.test(name));
  assert.equal(pages.length, 13);
  pages.forEach((page) => {
    const html = fs.readFileSync(path.join(root, 'practice/grammar', page), 'utf8');
    assert.match(html, /grammar-live\.js\?v=1/);
    assert.match(html, /function boot\(SETS\)/);
    assert.match(html, /GrammarLive\.load/);
    const script = html.slice(html.lastIndexOf('<script>'), html.lastIndexOf('</script>'));
    new Function(script.replace(/^<script>/, ''));
  });
});
