const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const GrammarLive = require('../practice/grammar/grammar-live.js');

const root = path.join(__dirname, '..');
const grammar = path.join(root, 'practice', 'grammar');

function read(name) {
  const nested = name.endsWith('.html')
    ? path.join(grammar, name.replace(/\.html$/, ''), 'index.html')
    : '';
  if (nested && fs.existsSync(nested)) return fs.readFileSync(nested, 'utf8');
  return fs.readFileSync(path.join(grammar, name), 'utf8');
}

test('grammar hub and practice entry open Units 5 and 6 and Boss covers Units 1–6', () => {
  const hub = read('grammar-hub.html');
  const entry = read('practice-entry.html');
  const boss = read('boss.html');
  assert.match(hub, /href="unit5-hub\/"/);
  assert.match(hub, /href="unit6-hub\/"/);
  assert.match(hub, /Units 1–6/);
  assert.match(hub, /5 sets × 12/);
  assert.match(entry, /Units 1–6/);
  assert.match(boss, /Mixed Units 1–6/);
  assert.match(boss, /5 sets × 12/);
  assert.match(boss, /GrammarLive\.load\(\{ unit: 'mixed', mode: 'boss' \}\)/);
  ['unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6'].forEach(unit => {
    ['story', 'chat', 'join'].forEach(mode => {
      const html = read(unit + '-' + mode + '.html');
      assert.match(html, new RegExp("GrammarLive\\.load\\(\\{ unit: '" + unit + "', mode: '" + mode + "' \\}\\)"), unit + ' ' + mode);
      assert.match(html, /vendor\/supabase\.js/, unit + ' ' + mode);
    });
  });
});

test('Unit 5 and 6 chat uses approved names and the same quest chrome', () => {
  const expected = {
    'unit5-chat.html': /const names = \{ ben: "Ben", lily: "Lily", miss: "Miss Ho" \}/,
    'unit6-chat.html': /const names = \{ tom: "Tom", may: "May", mr: "Mr Tam" \}/
  };
  Object.entries(expected).forEach(([file, names]) => {
    const html = read(file);
    assert.match(html, names, file);
    assert.match(html, /id="phase-chip">1 \/ 10</, file);
    assert.match(html, /id="q-label">Fill the blank</, file);
    assert.doesNotMatch(html, /Bubble\s+\d/, file);
    assert.doesNotMatch(html, /Fill each chat blank/, file);
    assert.doesNotMatch(html, /name-tag|cast-row/, file);
    assert.match(html, new RegExp("GrammarLive\\.load\\(\\{ unit: '" + file.slice(0, 5) + "', mode: 'chat' \\}\\)"), file);
    assert.doesNotMatch(html, /cynthiasumyi-spec\.github\.io/, file);
    assert.doesNotMatch(html, /raw\.githubusercontent\.com\/keroro3a22/, file);
  });
  ['unit5', 'unit6'].forEach(unit => {
    ['story', 'join', 'hub'].forEach(mode => {
      assert.equal(fs.existsSync(path.join(grammar, unit + '-' + mode, 'index.html')), true, unit + ' ' + mode);
    });
    const hub = read(unit + '-hub.html');
    assert.match(hub, /href="\.\.\/\.\.\/">← Back to packs/);
    assert.match(hub, new RegExp('href="' + unit + '-story/"'));
    assert.match(hub, new RegExp('href="' + unit + '-chat/"'));
    assert.match(hub, new RegExp('href="' + unit + '-join/"'));
  });
});

test('published preview art is rewritten to official illustration paths', () => {
  assert.equal(
    GrammarLive.officialArt('https://raw.githubusercontent.com/keroro3a22/revision-flashcards-preview/09b8e7064cfe845d90632916f3cffd1a69cf0ac2/practice/grammar/illust/draft-20261113/boss_u16_s1_q1.jpg'),
    'illust/boss_u16_s1_q1.jpg'
  );
  assert.equal(
    GrammarLive.officialArt('https://raw.githubusercontent.com/keroro3a22/revision-flashcards-preview/c87376a62a769c9a61287749600b774c13ff95b8/practice/grammar/illust/draft-20261113/u1_s2_chat_hero.jpg'),
    'illust/u1_08_walkathon.jpg'
  );
  assert.equal(
    GrammarLive.officialArt('https://cynthiasumyi-spec.github.io/revision-flashcards/practice/grammar/illust/u6_s5_q4.jpg'),
    'illust/u6_s5_q4.jpg'
  );
  assert.equal(GrammarLive.officialArt('illust/u1_08_walkathon.jpg'), 'illust/u1_08_walkathon.jpg');
  const sets = GrammarLive.rebuild([{
    n: 1,
    published: {
      set: 4,
      bucket: 'bubbles',
      meta: { hero: 'https://raw.githubusercontent.com/keroro3a22/revision-flashcards-preview/e72991435da1b6ea49ba0d2aadb9cc777de3816d/practice/grammar/illust/draft-20261113/u5_chat_s4_hero.jpg', art_hint: 'hidden' },
      item: { speaker: 'ben', img: 'https://example.test/draft-20261113/u5_s1_q1.jpg', parts: ['Hi'], answer: 'until' }
    }
  }]);
  assert.equal(sets[0].hero, 'illust/u5_chat_s4_hero.jpg');
  assert.equal(sets[0].art_hint, undefined);
  assert.equal(sets[0].bubbles[0].img, 'illust/u5_s1_q1.jpg');
  assert.equal(fs.existsSync(path.join(grammar, 'illust/boss_u16_s1_q1.jpg')), true);
  assert.equal(fs.existsSync(path.join(grammar, 'illust/u5_chat_s4_hero.jpg')), true);
  assert.equal(fs.existsSync(path.join(grammar, 'illust/u6_s5_q4.jpg')), true);
  assert.equal(fs.existsSync(path.join(grammar, 'illust/u6_chat_s5_hero.jpg')), true);
  assert.equal(fs.existsSync(path.join(grammar, 'illust/u6_s4_q1.jpg')), true);
  assert.equal(fs.existsSync(path.join(grammar, 'illust/u1_s2_chat_hero.jpg')), false);
  assert.equal(fs.existsSync(path.join(grammar, 'illust/u1_08_walkathon.jpg')), true);
  assert.equal(fs.existsSync(path.join(root, 'unit2/thumb_01.jpg')), true);
  assert.equal(fs.existsSync(path.join(root, 'unit5/thumb_29.jpg')), true);
});
