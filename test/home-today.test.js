const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadScripts } = require('./helpers');

function setup() {
  return loadScripts([
    'practice/data/unit1.js',
    'practice/data/unit2.js',
    'practice/data/unit3.js',
    'practice/data/unit4.js',
    'practice/data/unit5.js',
    'practice/data/unit6.js',
    'practice/data/registry.js',
    'assets/home-today.js'
  ]);
}

function cardsFrom(file) {
  const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const match = html.match(/(?:const|let) CARDS = (\[[\s\S]*?\]);/);
  assert.ok(match, file + ' has CARDS');
  return JSON.parse(match[1]);
}

test('word of the day stays on the same word for one calendar day', () => {
  const { window } = setup();
  const H = window.HomeToday;
  const words = H.syllabus(window.PracticeRegistry);
  assert.equal(words.length, 102);
  const day = new Date(2026, 9, 24);
  const first = H.wordOfDay(words, day);
  const second = H.wordOfDay(words, day);
  assert.equal(first.en, second.en);
  assert.equal(first.href, second.href);
  assert.equal(H.dateKey(day), '2026-10-24');
  assert.ok(first.zh);
  assert.match(first.audio, /^unit[1-6]\/audio\/audio_\d+\.mp3/);
  assert.equal(first.audio.startsWith('../'), false);
});

test('a different day can choose another word, and the index stays in range', () => {
  const { window } = setup();
  const H = window.HomeToday;
  const words = H.syllabus(window.PracticeRegistry);
  const a = H.pickIndex('2026-01-01', words.length);
  const b = H.pickIndex('2026-06-15', words.length);
  assert.ok(a >= 0 && a < words.length);
  assert.ok(b >= 0 && b < words.length);
  assert.equal(H.pickIndex('2026-01-01', words.length), a);
  assert.notEqual(a, b);
});

test('each pack card number matches the syllabus order', () => {
  const { window } = setup();
  const words = window.HomeToday.syllabus(window.PracticeRegistry);
  const files = {
    unit1: 'unit1/index.html',
    unit2: 'unit2/index.html',
    unit3: 'unit3/index.html',
    unit4: 'unit4/index.html'
  };
  Object.keys(files).forEach((id) => {
    const cards = cardsFrom(files[id]);
    const pack = words.filter((w) => w.unitId === id);
    assert.equal(pack.length, cards.length, id);
    pack.forEach((w, i) => {
      assert.equal(w.en, cards[i].en, id + ' card ' + (i + 1));
      assert.equal(w.zh, cards[i].zh);
      assert.equal(w.href, id + '/#c' + cards[i].n);
    });
  });
});

test('continue last reads a saved card and ignores a bad link', () => {
  const { window, localStorage } = setup();
  const H = window.HomeToday;
  assert.equal(H.loadLast(), null);
  localStorage.setItem(H.LAST_KEY, JSON.stringify({
    unitId: 'unit2',
    n: 4,
    en: 'flood',
    zh: '洪水',
    href: 'unit2/index.html#c4'
  }));
  assert.equal(H.loadLast().en, 'flood');
  assert.equal(H.loadLast().href, 'unit2/#c4');
  localStorage.setItem(H.LAST_KEY, JSON.stringify({ en: 'nope', href: 'https://example.com/phish' }));
  assert.equal(H.loadLast(), null);
});

test('opening a unit card stores a homepage resume link', () => {
  const { window, localStorage } = loadScripts(['assets/last-place.js'], {
    location: { pathname: '/revision-flashcards/unit3/index.html', hash: '' }
  });
  window.LastPlace.save({ n: 2, en: 'beat', zh: '攪打' });
  const saved = JSON.parse(localStorage.getItem('p6-flash-last-v1'));
  assert.equal(saved.href, 'unit3/#c2');
  assert.equal(saved.en, 'beat');
  assert.equal(saved.unitId, 'unit3');
});

test('homepage drops the old blurb and the keep-practising footer', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /Word of the day/);
  assert.ok(html.indexOf('id="place-shell"') < html.indexOf('id="daily"'));
  assert.match(html, /Continue last/);
  assert.match(html, /id="daily-play"/);
  assert.match(html, /Play audio/);
  assert.match(html, /class="daily-speaker"/);
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets/site.css'), 'utf8');
  const card = css.slice(css.indexOf('.daily-card {'), css.indexOf('.daily-kicker'));
  const cont = css.slice(css.indexOf('.daily-continue {'), css.indexOf('.daily-continue-copy'));
  const band = css.slice(css.indexOf('.cta {'), css.indexOf('.daily-card'));
  assert.match(band, /background:\s*color-mix\(in srgb, var\(--sunny\) 40%, #fff\)/);
  assert.doesNotMatch(band, /var\(--pink\)/);
  assert.match(css, /\.packs-field \{[^}]*background:\s*var\(--sunny\)/);
  assert.match(card, /border:\s*0/);
  assert.match(card, /box-shadow:\s*none/);
  assert.doesNotMatch(card, /border:\s*5px/);
  assert.match(cont, /border:\s*0/);
  assert.match(cont, /box-shadow:\s*none/);
  assert.match(html, /id="daily-open"/);
  assert.doesNotMatch(html, /Sixty-one real syllabus/);
  assert.doesNotMatch(html, /Keep practising/);
  assert.doesNotMatch(html, /class="site-footer"/);
});
