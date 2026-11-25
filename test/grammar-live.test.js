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
    const source = fs.readFileSync(path.join(root, 'practice/grammar', page, 'index.html'), 'utf8');
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
  const pages = fs.readdirSync(path.join(root, 'practice/grammar')).filter((name) => /^(unit\d-(story|chat|join)|boss)$/.test(name));
  assert.equal(pages.length, 19);
  pages.forEach((page) => {
    const html = fs.readFileSync(path.join(root, 'practice/grammar', page, 'index.html'), 'utf8');
    assert.match(html, /grammar-live\.js\?v=4/);
    assert.match(html, /function boot\(SETS\)/);
    assert.match(html, /GrammarLive\.load/);
    const script = html.slice(html.lastIndexOf('<script>'), html.lastIndexOf('</script>'));
    new Function(script.replace(/^<script>/, ''));
  });
});

test('a library photo on supabase.co stays the address students can open', () => {
  const coats = 'https://kveotksbvqsxchztmwez.supabase.co/storage/v1/object/public/lesson-media/library/1730000000-winter-coats.jpg';
  const story = 'https://kveotksbvqsxchztmwez.supabase.co/storage/v1/object/public/lesson-media/unit3/story-set-2.jpg?width=800';
  assert.equal(grammar.officialArt(coats), coats);
  assert.equal(grammar.officialArt(story), story);
  const sets = grammar.rebuild([{
    n: 1,
    published: {
      set: 1,
      bucket: 'bubbles',
      meta: { hero: coats },
      item: { speaker: 'amy', img: story, parts: ['two similar boxes of winter coats'], answer: 'similar' }
    }
  }]);
  assert.equal(sets[0].hero, coats);
  assert.equal(sets[0].bubbles[0].img, story);
});

test('Book B art keeps the draft-6b-20261123 folder', () => {
  const file = 'chat_u4_s1_hero.jpg';
  const raw = 'https://raw.githubusercontent.com/keroro3a22/revision-flashcards-preview/b9dc342f18c1d63613b47e142f66d1933063b75d/practice/grammar/illust/draft-6b-20261123/' + file;
  assert.equal(grammar.officialArt(raw), 'illust/draft-6b-20261123/' + file);
  assert.equal(
    grammar.officialArt('https://cdn.example/packs/draft-6b-20261123/' + file + '?raw=1'),
    'illust/draft-6b-20261123/' + file
  );
  assert.equal(
    grammar.officialArt('/practice/grammar/illust/draft-6b-20261123/' + file),
    'illust/draft-6b-20261123/' + file
  );
  assert.equal(fs.existsSync(path.join(root, 'practice/grammar/illust/draft-6b-20261123/' + file)), true);
  assert.equal(fs.existsSync(path.join(root, 'practice/grammar/illust/' + file)), false);
});

test('older Book A art still flattens to illust and the file name', () => {
  assert.equal(
    grammar.officialArt('https://raw.githubusercontent.com/keroro3a22/revision-flashcards-preview/09b8e7064cfe845d90632916f3cffd1a69cf0ac2/practice/grammar/illust/draft-20261113/boss_u16_s1_q1.jpg'),
    'illust/boss_u16_s1_q1.jpg'
  );
  assert.equal(grammar.officialArt('processed/u6_s5_q4.jpg'), 'illust/u6_s5_q4.jpg');
  assert.equal(
    grammar.officialArt('https://cynthiasumyi-spec.github.io/revision-flashcards/practice/grammar/illust/u6_s5_q4.jpg'),
    'illust/u6_s5_q4.jpg'
  );
  assert.equal(grammar.officialArt('https://example.test/photos/u5_s1_q1.jpg'), 'illust/u5_s1_q1.jpg');
});

test('relative illustration paths stay as they are written', () => {
  assert.equal(grammar.officialArt('illust/draft-6b-20261123/chat_u4_s1_hero.jpg'), 'illust/draft-6b-20261123/chat_u4_s1_hero.jpg');
  assert.equal(grammar.officialArt('illust/draft-6b-20261123/chat_u4_s1_hero.jpg?v=1'), 'illust/draft-6b-20261123/chat_u4_s1_hero.jpg?v=1');
  assert.equal(grammar.officialArt('illust/u1_s1_chat_hero.jpg'), 'illust/u1_s1_chat_hero.jpg');
  assert.equal(fs.existsSync(path.join(root, 'practice/grammar/illust/u1_s1_chat_hero.jpg')), true);
});

test('the missing Unit 1 chat hero still uses the walkathon picture', () => {
  assert.equal(
    grammar.officialArt('https://raw.githubusercontent.com/keroro3a22/revision-flashcards-preview/c87376a62a769c9a61287749600b774c13ff95b8/practice/grammar/illust/draft-20261113/u1_s2_chat_hero.jpg'),
    'illust/u1_08_walkathon.jpg'
  );
});
