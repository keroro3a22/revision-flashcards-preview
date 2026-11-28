const test = require('node:test');
const assert = require('node:assert/strict');
const pages = require('../assets/site-pages.js');

const bookB = { book: 'oxford', series: 'oxford', term: 'second', level: 'p6', unit: 'unit1' };
const bookA = { book: 'oxford', series: 'oxford', term: 'first', level: 'p6', unit: 'unit1' };

test('Book B revision stays open and practice follows published rows', () => {
  const lessons = [{ unit_id: 'unit1', track: 'vocab', n: 1, img: 'https://cdn.example/pick.png' }];
  const unit = pages.resolveUnit(bookB, 'unit1', [], lessons, [{ unit_id: 'unit1', track: 'vocab' }]);
  const vocab = unit.items.filter((item) => item.id === 'revision-vocab')[0];
  const grammar = unit.items.filter((item) => item.id === 'revision-grammar')[0];
  const practiceVocab = unit.items.filter((item) => item.id === 'practice-vocab')[0];
  const practiceGrammar = unit.items.filter((item) => item.id === 'practice-grammar')[0];
  assert.equal(vocab.ready, true);
  assert.equal(vocab.href, 'unit1/?term=second');
  assert.equal(vocab.image, 'https://cdn.example/pick.png');
  assert.equal(vocab.note, 'Review the words in this unit.');
  assert.equal(grammar.note, 'Review the grammar in this unit.');
  assert.equal(grammar.ready, true);
  assert.equal(grammar.href, 'unit1/grammar/?term=second');
  assert.equal(grammar.image, 'oxford-6b/u1-grammar-01-1x1.png');
  assert.equal(practiceVocab.ready, true);
  assert.equal(practiceVocab.href, 'practice/?unit=unit1&term=second');
  assert.equal(practiceVocab.note, 'Try the word quizzes.');
  assert.equal(practiceVocab.image, 'https://cdn.example/pick.png');
  assert.equal(practiceGrammar.ready, false);
  assert.equal(practiceGrammar.href, '');
  assert.equal(practiceGrammar.note, 'Coming soon');
  assert.equal(practiceGrammar.image, '');
  assert.equal(unit.words, 1);
  assert.equal(unit.listed, true);
});

test('practice uses the second photo and its own questions', () => {
  const lessons = [
    { unit_id: 'unit1', track: 'vocab', n: 1, img: 'one.png' },
    { unit_id: 'unit1', track: 'vocab', n: 2, img: 'two.png' }
  ];
  const bookBUnit = pages.resolveUnit(bookB, 'unit1', [], lessons, [{ unit_id: 'unit1', track: 'vocab' }]);
  const practice = bookBUnit.items.filter((item) => item.id === 'practice-vocab')[0];
  assert.equal(practice.ready, true);
  assert.equal(practice.image, 'unit1/two.png');
  assert.equal(practice.href, 'practice/?unit=unit1&term=second');
  const open = pages.resolveUnit(bookA, 'unit1', [], lessons, [{ unit_id: 'unit1', track: 'vocab' }]);
  const door = open.items.filter((item) => item.id === 'practice-vocab')[0];
  assert.equal(door.ready, true);
  assert.equal(door.image, 'unit1/two.png');
  assert.equal(door.href, 'practice/?unit=unit1&term=first');
});

test('one card is reused when practice has no second photo', () => {
  const lessons = [{ unit_id: 'unit1', track: 'vocab', n: 1, img: 'only.png' }];
  const unit = pages.resolveUnit(bookA, 'unit1', [], lessons, [{ unit_id: 'unit1', track: 'vocab' }]);
  const door = unit.items.filter((item) => item.id === 'practice-vocab')[0];
  assert.equal(door.image, 'unit1/only.png');
});

test('a saved picture replaces the card photo and an empty field falls back', () => {
  const lessons = [{ unit_id: 'unit1', track: 'vocab', n: 1, img: 'card.png' }];
  const pagesRows = [{ unit_id: 'unit1', slot: 'revision-vocab', label: 'Words', note: 'Start here.', image: 'covers/custom.jpg' }];
  const custom = pages.resolveUnit(bookB, 'unit1', pagesRows, lessons, []);
  const door = custom.items.filter((item) => item.id === 'revision-vocab')[0];
  assert.equal(door.label, 'Words');
  assert.equal(door.note, 'Start here.');
  assert.equal(door.image, 'covers/custom.jpg');
  const cleared = pages.resolveUnit(bookB, 'unit1', [
    { unit_id: 'unit1', slot: 'revision-vocab', label: '', note: '', image: '' }
  ], lessons, []);
  assert.equal(cleared.items[0].image, 'unit1/card.png');
  assert.equal(cleared.items[0].note, 'Review the words in this unit.');
});

test('Book A keeps its title and the saved cover', () => {
  const lessons = [{ unit_id: 'unit1', track: 'vocab', n: 1, img: 'thumb_01.jpg' }];
  const plain = pages.resolveUnit(bookA, 'unit1', [], lessons, [{ unit_id: 'unit1', track: 'vocab' }]);
  assert.equal(plain.title, 'For a good cause');
  assert.match(plain.packNote, /Charity verbs/);
  assert.equal(plain.items[0].image, 'unit1/thumb_01.jpg');
  const kept = pages.resolveUnit(bookA, 'unit1', [
    { unit_id: 'unit1', slot: 'revision-vocab', image: 'covers/unit1.jpg' },
    { unit_id: 'unit1', slot: 'practice-vocab', image: 'unit1/thumb_08.jpg' }
  ], lessons, [{ unit_id: 'unit1', track: 'vocab' }]);
  assert.equal(kept.items[0].image, 'covers/unit1.jpg');
  assert.equal(kept.items[2].image, 'unit1/thumb_08.jpg');
});

test('grammar practice opens for Units 5 and 6 and stays closed without a game page', () => {
  const unit = pages.resolveUnit(bookA, 'unit5', [], [], [{ unit_id: 'unit5', track: 'grammar' }]);
  const door = unit.items.filter((item) => item.id === 'practice-grammar')[0];
  assert.equal(door.ready, true);
  assert.equal(door.href, 'practice/grammar/unit5-hub/?term=first');
  const unit6 = pages.resolveUnit(bookA, 'unit6', [], [], [{ unit_id: 'unit6', track: 'grammar' }]);
  assert.equal(unit6.items.filter((item) => item.id === 'practice-grammar')[0].ready, true);
  const closed = pages.resolveUnit(bookA, 'unit7', [], [], [{ unit_id: 'unit7', track: 'grammar' }]);
  assert.equal(closed.items.filter((item) => item.id === 'practice-grammar')[0].ready, false);
});

test('a saved crop stays on the automatic photo', () => {
  const lessons = [{ unit_id: 'unit1', track: 'grammar', n: 1, img: 'https://cdn.example/grammar.png' }];
  const frame = { x: 20, y: 40, z: 1.2, bg: '#ffffff' };
  const unit = pages.resolveUnit(bookB, 'unit1', [
    { unit_id: 'unit1', slot: 'revision-grammar', label: '', note: '', image: '', frame: frame }
  ], lessons, []);
  const grammar = unit.items.filter((item) => item.id === 'revision-grammar')[0];
  assert.equal(grammar.image, 'https://cdn.example/grammar.png');
  assert.deepEqual(grammar.frame, frame);
});

test('page photos use the shape students see', () => {
  assert.equal(Math.round(pages.photoRatio('hear') * 100) / 100, Math.round(4 / 3 * 100) / 100);
  assert.equal(pages.photoRatio('title'), 1);
  assert.equal(pages.photoRatio('pack-unit1'), 1);
  assert.equal(Math.round(pages.photoRatio('revision-vocab') * 100) / 100, Math.round(4 / 3 * 100) / 100);
  assert.equal(Math.round(pages.photoRatio('see') * 100) / 100, Math.round(4 / 3 * 100) / 100);
});

test('empty door notes use the approved sentences', () => {
  const lessons = [
    { unit_id: 'unit1', track: 'vocab', n: 1, img: 'a.png' },
    { unit_id: 'unit1', track: 'grammar', n: 1, img: 'b.png' }
  ];
  const practices = [
    { unit_id: 'unit1', track: 'vocab' },
    { unit_id: 'unit1', track: 'grammar' }
  ];
  const unit = pages.resolveUnit(bookA, 'unit1', [], lessons, practices);
  const notes = {};
  unit.items.forEach((item) => { notes[item.id] = item.note; });
  assert.deepEqual(notes, {
    'revision-vocab': 'Review the words in this unit.',
    'revision-grammar': 'Review the grammar in this unit.',
    'practice-vocab': 'Try the word quizzes.',
    'practice-grammar': 'Practise the grammar in games.'
  });
});

test('Get started packs follow titles and open doors', () => {
  const catalog = {
    pages: [{ unit_id: 'unit2', slot: 'title', label: 'Helping', note: 'Storms.', image: '' }],
    lessons: [{ unit_id: 'unit1', track: 'vocab', n: 1, img: 'https://cdn.example/pick.png' }],
    practices: []
  };
  const packs = pages.packsFor(bookB, ['unit1', 'unit2', 'unit3'], catalog);
  assert.deepEqual(packs.map((unit) => unit.id), ['unit1', 'unit2', 'unit3']);
  assert.equal(packs[0].items[0].ready, true);
  assert.equal(packs[1].title, 'Helping');
  const home = pages.homeCopy(bookB, []);
  assert.equal(home.hero.label, 'Play and Learn Club');
  assert.equal(home.see.label, 'See it');
  const shown = pages.packCard(bookB, packs[0], {
    pages: [{ unit_id: 'home', slot: 'pack-unit1', label: 'Green start', note: 'A new line.', image: 'covers/custom.jpg' }],
    lessons: catalog.lessons
  });
  assert.equal(shown.label, 'Green start');
  assert.equal(shown.note, 'A new line.');
  assert.equal(shown.image, 'covers/custom.jpg');
  const intro = pages.packsIntro([{ unit_id: 'home', slot: 'packs', label: 'Choose one', note: 'Swipe the row.' }]);
  assert.equal(intro.label, 'Choose one');
  assert.equal(intro.note, 'Swipe the row.');
  assert.equal(pages.packsIntro([]).label, 'The packs');
  assert.equal(pages.keptPhoto('https://cdn.example/storage/v1/object/public/lesson-media/new.jpg', 'unit1/thumb_01.jpg', false, null), 'https://cdn.example/storage/v1/object/public/lesson-media/new.jpg');
  assert.equal(pages.keptPhoto('https://keroro3a22.github.io/revision-flashcards-preview/unit1/thumb_01.jpg', 'unit1/thumb_01.jpg', false, null), '');
  assert.equal(pages.keptPhoto('unit1/thumb_01.jpg', 'unit1/thumb_01.jpg', false, { x: 12, y: 40, z: 1.4, bg: '#ffffff' }), 'unit1/thumb_01.jpg');
  assert.equal(pages.liveFrame({ x: 50, y: 50, z: 1, bg: '#ffffff' }), null);
  const fallback = pages.defaults(bookA, 'home', 'pack-unit1', catalog.lessons, catalog.pages);
  assert.equal(fallback.label, 'Unit 1 · For a good cause');
  assert.match(fallback.note, /Charity verbs/);
  assert.equal(pages.slotsFor('home', bookA).filter((slot) => slot.id === 'pack-unit6').length, 1);
  assert.equal(pages.slotsFor('home', bookA).filter((slot) => slot.id === 'packs')[0].photo, false);
});

test('The packs Open button names the unit and does not link away', () => {
  const cards = [];
  const track = {
    replaceChildren() { cards.length = 0; },
    appendChild(node) { cards.push(node); }
  };
  const prev = global.document;
  global.document = {
    getElementById(id) { return id === 'pack-index' ? track : null; },
    querySelector() { return null; },
    getElementsByTagName() { return []; },
    createElement() {
      return { tagName: 'article', className: '', innerHTML: '', setAttribute() {} };
    }
  };
  try {
    pages.paintHome(bookA, { pages: [], lessons: [], practices: [] });
    pages.paintHome(bookB, { pages: [], lessons: [], practices: [] });
  } finally {
    if (prev === undefined) delete global.document;
    else global.document = prev;
  }
  assert.equal(cards.length, 6);
  cards.forEach((card, index) => {
    const n = index + 1;
    assert.equal(card.tagName, 'article');
    assert.match(card.className, /pack-card/);
    assert.match(card.innerHTML, new RegExp('<button type="button" class="btn btn-primary pack-open" data-unit="unit' + n + '">Open Unit ' + n + '</button>'));
    assert.doesNotMatch(card.innerHTML, /<a\b|href=|game\//);
  });
  const vocab = pages.resolveUnit(bookB, 'unit1', [], [
    { unit_id: 'unit1', track: 'vocab', n: 1, img: 'one.png' }
  ], [{ unit_id: 'unit1', track: 'vocab' }]).items.filter((item) => item.id === 'revision-vocab')[0];
  const practice = pages.resolveUnit(bookB, 'unit1', [], [], [{ unit_id: 'unit1', track: 'vocab' }]).items;
  const practiceVocab = practice.filter((item) => item.id === 'practice-vocab')[0];
  const practiceGrammar = practice.filter((item) => item.id === 'practice-grammar')[0];
  assert.equal(vocab.href, 'unit1/?term=second');
  assert.equal(practiceVocab.ready, true);
  assert.equal(practiceVocab.href, 'practice/?unit=unit1&term=second');
  assert.equal(practiceVocab.image, 'oxford-6b/u1-vocab-02-1x1.png');
  assert.equal(practiceGrammar.ready, false);
  assert.equal(practiceGrammar.note, 'Coming soon');
  assert.equal(practiceGrammar.image, '');
});

function catalogDb(answer) {
  const seen = [];
  return {
    seen,
    from(table) {
      const state = { table, filters: {}, orders: [], range: null, count: null, limited: null };
      const api = {
        select(_cols, opts) {
          state.count = opts && opts.count;
          return api;
        },
        eq(key, value) {
          state.filters[key] = value;
          return api;
        },
        order(key) {
          state.orders.push(key);
          return api;
        },
        limit(n) {
          state.limited = n;
          return api;
        },
        range(from, to) {
          state.range = [from, to];
          return api;
        },
        then(resolve, reject) {
          seen.push({
            table: state.table,
            filters: Object.assign({}, state.filters),
            orders: state.orders.slice(),
            range: state.range && state.range.slice(),
            count: state.count
          });
          return Promise.resolve()
            .then(() => answer(state))
            .then(resolve, reject);
        }
      };
      return api;
    }
  };
}

function practiceRows(counts) {
  const rows = [];
  Object.keys(counts).forEach((unitId) => {
    Object.keys(counts[unitId]).forEach((track) => {
      for (let i = 0; i < counts[unitId][track]; i += 1) rows.push({ unit_id: unitId, track });
    });
  });
  return rows;
}

function practiceAnswer(rows, options) {
  const opts = options || {};
  return function (state) {
    if (state.table !== 'practice_items_live') return { data: [], error: null };
    if (opts.term && state.filters.term !== opts.term) return { data: [], error: null, count: 0 };
    const from = state.range ? state.range[0] : 0;
    const to = state.range ? state.range[1] : rows.length - 1;
    if (opts.missPastEnd && from >= rows.length && from > 0) {
      return {
        data: null,
        error: { code: 'PGRST103', message: 'Requested range not satisfiable' },
        status: 416,
        count: null
      };
    }
    const data = rows.slice(from, to + 1);
    return { data, error: null, status: 200, count: opts.count === undefined ? rows.length : opts.count };
  };
}

test('practice doors read every page of the current book', async () => {
  const early = practiceRows({
    unit1: { vocab: 125, grammar: 125 },
    unit2: { vocab: 125, grammar: 125 },
    unit3: { vocab: 125, grammar: 125 },
    unit4: { vocab: 125, grammar: 125 }
  });
  const rows = early.concat(practiceRows({
    unit5: { vocab: 192, grammar: 120 },
    unit6: { vocab: 178, grammar: 120 }
  }));
  assert.equal(early.length, 1000);
  assert.equal(rows.slice(0, 1000).some((row) => row.unit_id === 'unit5' || row.unit_id === 'unit6'), false);
  const db = catalogDb(practiceAnswer(rows));
  const catalog = await pages.loadCatalog(db, bookA);
  const practiceCalls = db.seen.filter((call) => call.table === 'practice_items_live');
  assert.equal(practiceCalls.length, 2);
  practiceCalls.forEach((call) => {
    assert.equal(call.filters.book, 'oxford');
    assert.equal(call.filters.series, 'oxford');
    assert.equal(call.filters.term, 'first');
    assert.equal(call.filters.level, 'p6');
    assert.equal(call.count, 'exact');
    assert.deepEqual(call.orders, ['unit_id', 'track', 'mode', 'level_name', 'set_no', 'n']);
  });
  assert.deepEqual(practiceCalls.map((call) => call.range), [[0, 999], [1000, 1999]]);
  assert.equal(db.seen.some((call) => call.filters.term === 'second'), false);
  assert.equal(catalog.practices.length, rows.length);
  ['unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6'].forEach((unitId) => {
    const unit = pages.resolveUnit(bookA, unitId, [], [], catalog.practices);
    ['practice-vocab', 'practice-grammar'].forEach((id) => {
      const door = unit.items.filter((item) => item.id === id)[0];
      assert.equal(door.ready, true, unitId + ' ' + id);
      assert.notEqual(door.note, 'Coming soon');
      assert.notEqual(door.href, '');
    });
    unit.items.filter((item) => item.group === 'revision').forEach((door) => {
      assert.equal(door.ready, false);
    });
  });
  const grammar = pages.resolveUnit(bookA, 'unit5', [], [], catalog.practices)
    .items.filter((item) => item.id === 'practice-grammar')[0];
  assert.equal(grammar.href, 'practice/grammar/unit5-hub/?term=first');
});

test('a full last page still counts when the next range is past the end', async () => {
  const rows = practiceRows({ unit1: { vocab: 1000 } });
  const db = catalogDb(practiceAnswer(rows, { count: null, missPastEnd: true }));
  const catalog = await pages.loadCatalog(db, bookA);
  assert.equal(catalog.practices.length, 1000);
  const door = pages.resolveUnit(bookA, 'unit1', [], [], catalog.practices)
    .items.filter((item) => item.id === 'practice-vocab')[0];
  assert.equal(door.ready, true);
  assert.equal(db.seen.filter((call) => call.table === 'practice_items_live').length, 2);
});

test('Book B practice opens from its own published rows', async () => {
  const rows = practiceRows({
    unit5: { vocab: 192, grammar: 120 },
    unit6: { vocab: 178, grammar: 120 }
  });
  const db = catalogDb(practiceAnswer(rows));
  const catalog = await pages.loadCatalog(db, bookB);
  const practiceCalls = db.seen.filter((call) => call.table === 'practice_items_live');
  assert.equal(practiceCalls.length, 1);
  practiceCalls.forEach((call) => assert.equal(call.filters.term, 'second'));
  assert.equal(db.seen.some((call) => call.filters.term === 'first'), false);
  ['unit5', 'unit6'].forEach((unitId) => {
    const unit = pages.resolveUnit(bookB, unitId, [], [
      { unit_id: unitId, track: 'vocab', n: 1, img: 'card.png' }
    ], catalog.practices);
    unit.items.filter((item) => item.group === 'revision').forEach((door) => {
      assert.equal(door.ready, true);
      assert.notEqual(door.href, '');
    });
    const vocab = unit.items.filter((item) => item.id === 'practice-vocab')[0];
    const grammar = unit.items.filter((item) => item.id === 'practice-grammar')[0];
    assert.equal(vocab.ready, true);
    assert.equal(vocab.note, 'Try the word quizzes.');
    assert.equal(vocab.href, 'practice/?unit=' + unitId + '&term=second');
    assert.equal(vocab.image, unitId + '/card.png');
    assert.equal(grammar.ready, true);
    assert.equal(grammar.note, 'Practise the grammar in games.');
    assert.equal(grammar.href, 'practice/grammar/' + unitId + '-hub/?term=second');
    assert.equal(grammar.image, unitId === 'unit6'
      ? 'oxford-6b/u6-grammar-01-1x1-v2.png'
      : 'oxford-6b/u5-grammar-01-1x1.png');
  });
  const empty = pages.resolveUnit(bookB, 'unit1', [], [], catalog.practices);
  empty.items.filter((item) => item.group === 'practice').forEach((door) => {
    assert.equal(door.ready, false);
    assert.equal(door.note, 'Coming soon');
    assert.equal(door.href, '');
  });
  const unit4 = pages.resolveUnit(bookB, 'unit4', [], [], [{ unit_id: 'unit4', track: 'grammar' }])
    .items.filter((item) => item.id === 'practice-grammar')[0];
  assert.equal(unit4.ready, true);
  assert.equal(unit4.image, 'oxford-6b/u4-grammar-01-1x1-v2.png');
  const outside = pages.resolveUnit(bookB, 'unit7', [], [], [{ unit_id: 'unit7', track: 'grammar' }])
    .items.filter((item) => item.id === 'practice-grammar')[0];
  assert.equal(outside.ready, false);
  assert.equal(outside.href, '');
  assert.equal(outside.note, 'Coming soon');
});
