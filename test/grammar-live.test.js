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

test('the page can ask for published grammar without crashing before the sentences are drawn', async () => {
  const previousPublic = global.SUPABASE_PUBLIC;
  const previousClient = global.supabase;
  delete global.SUPABASE_PUBLIC;
  delete global.supabase;
  try {
    assert.equal(await grammar.load({ unit: 'unit1', mode: 'story' }), null);

    const rows = [{
      n: 1,
      published: {
        set: 1,
        bucket: 'scenes',
        meta: { sub: 'Home' },
        item: { label: 'Scene 1', parts: ['Class 6A wants to help. There are ', '____', ' ideas.'], options: ['so many'], answer: ['so many'] }
      }
    }];
    const seen = [];
    global.SUPABASE_PUBLIC = { url: 'https://example.test', key: 'publishable' };
    global.supabase = {
      createClient(url, key) {
        seen.push(url, key);
        const chain = {
          select() { return chain; },
          eq(column, value) { seen.push([column, value]); return chain; },
          order() { return Promise.resolve({ data: rows, error: null }); }
        };
        return { from(table) { seen.push(table); return chain; } };
      }
    };
    const sets = await grammar.load({ unit: 'unit1', mode: 'story' });
    assert.equal(sets[0].scenes[0].parts.join(''), 'Class 6A wants to help. There are ____ ideas.');
    assert.ok(seen.includes('practice_items_live'));
    assert.deepEqual(seen.filter((entry) => Array.isArray(entry) && entry[0] === 'unit_id'), [['unit_id', 'unit1']]);
    assert.deepEqual(seen.filter((entry) => Array.isArray(entry) && entry[0] === 'mode'), [['mode', 'story']]);
  } finally {
    if (previousPublic === undefined) delete global.SUPABASE_PUBLIC;
    else global.SUPABASE_PUBLIC = previousPublic;
    if (previousClient === undefined) delete global.supabase;
    else global.supabase = previousClient;
  }
});

test('grammar pages wait for the published list before they start', () => {
  const pages = fs.readdirSync(path.join(root, 'practice/grammar')).filter((name) => /^(unit\d-(story|chat|join)|boss)\.html$/.test(name));
  assert.equal(pages.length, 19);
  pages.forEach((page) => {
    const html = fs.readFileSync(path.join(root, 'practice/grammar', page), 'utf8');
    assert.match(html, /grammar-live\.js\?v=3/);
    assert.match(html, /function boot\(SETS\)/);
    assert.match(html, /GrammarLive\.load/);
    const script = html.slice(html.lastIndexOf('<script>'), html.lastIndexOf('</script>'));
    new Function(script.replace(/^<script>/, ''));
  });
});
