const test = require('node:test');
const assert = require('node:assert/strict');
const draft = require('../assets/studio-draft.js');

const oxford = { book: 'oxford', series: 'oxford', term: 'first', level: 'p6', unit: 'unit1', section: 'revision', kind: 'vocab' };

test('vocab and grammar each continue their own card numbers', () => {
  assert.equal(draft.nextNumber(oxford, [1, 2, 10]), 11);
  assert.equal(draft.nextNumber(Object.assign({}, oxford, { unit: 'unit5' }), []), 17);
  assert.equal(draft.nextNumber(Object.assign({}, oxford, { unit: 'unit1', kind: 'grammar' }), []), 5);
  assert.equal(draft.nextNumber(Object.assign({}, oxford, { unit: 'unit3', kind: 'grammar' }), [1, 2]), 4);
});

test('a missing-letter example hides one legal easy or hard set', () => {
  const easy = draft.letterExample('adopt a pet', 'easy', () => 0);
  assert.equal(easy[0], undefined);
  assert.equal(easy[1], true);
  assert.equal(easy[6], undefined);
  assert.equal(easy[9], true);
  const hard = draft.letterExample('adopt a pet', 'hard', () => 0);
  assert.equal(hard[0], true);
  assert.equal(hard[1], true);
  assert.equal(hard[6], undefined);
  assert.equal(hard[8], true);
});

test('a fill sentence keeps the missing words separate from the rest', () => {
  const parts = draft.fillParts('They want to ______ today.', 'adopt a pet');
  assert.deepEqual(parts, { before: 'They want to ', missing: 'adopt a pet', after: ' today.' });
  assert.deepEqual(draft.fillStored(parts.before, 'adopt pets', parts.after), {
    sentence: 'They want to ______ today.',
    answer: 'adopt pets'
  });
});

test('removing a row closes the gap without touching earlier numbers first', () => {
  const plan = draft.compactNumbers([
    { id: 4, n: 4 },
    { id: 1, n: 1 },
    { id: 3, n: 3 }
  ]);
  assert.deepEqual(plan, [
    { id: 3, from: 3, n: 2 },
    { id: 4, from: 4, n: 3 }
  ]);
});

test('a new practice question numbers only that mode', () => {
  const fill = Object.assign({}, oxford, { section: 'practice', kind: 'vocab', mode: 'fill', difficulty: 'hard' });
  assert.equal(draft.nextNumber(fill, [1, 2]), 3);
  assert.equal(draft.difficulty(fill), 'hard');
  assert.equal(draft.difficulty(Object.assign({}, fill, { mode: 'letters' })), 'easy');
  assert.equal(draft.unitId(Object.assign({}, fill, { kind: 'grammar', mode: 'boss' })), 'mixed');
  assert.equal(draft.unitId(fill), 'unit1');
});

test('a draft stays off the site until publish copies a snapshot', () => {
  const card = draft.revisionInsert(Object.assign({}, oxford, { kind: 'grammar' }), 5);
  assert.equal(card.status, 'draft');
  assert.equal(card.published, null);
  assert.equal(card.track, 'grammar');
  assert.equal(card.n, 5);
  const saved = draft.revisionPatch({ en: 'so many', zh: '這麼多' }, 'draft');
  assert.equal(saved.status, 'draft');
  assert.equal(Object.prototype.hasOwnProperty.call(saved, 'published'), false);
  const live = draft.revisionPatch({ en: 'so many', zh: '這麼多' }, 'published');
  assert.equal(live.status, 'published');
  assert.equal(live.published.en, 'so many');
  assert.equal(Object.prototype.hasOwnProperty.call(live.published, 'status'), false);
  const again = draft.revisionPatch({ en: 'so many', zh: '這麼多' }, 'published', { cutout: true, chips: [{ ok: true, text: 'of' }] });
  assert.equal(again.published.cutout, true);
  assert.equal(again.published.chips[0].text, 'of');
});

test('practice publish keeps the draft fields and does not publish early', () => {
  const row = draft.practiceInsert(Object.assign({}, oxford, { section: 'practice', mode: 'fill', difficulty: 'easy' }), 1);
  assert.equal(row.status, 'draft');
  assert.equal(row.published, null);
  assert.equal(row.level_name, 'easy');
  assert.equal(row.mode, 'fill');
  const draftPatch = draft.practicePatch({ prompt: 'adopt a pet', answer: '領養寵物', level_name: 'easy' }, {}, 'draft');
  assert.equal(Object.prototype.hasOwnProperty.call(draftPatch, 'published'), false);
  const published = draft.practicePatch({ prompt: 'adopt a pet', answer: '領養寵物', level_name: 'easy' }, { wordKey: 'unit1:adopt' }, 'published');
  assert.equal(published.published.sentence, 'adopt a pet');
  assert.equal(published.published.zh, '領養寵物');
  assert.equal(published.published.wordKey, 'unit1:adopt');
  const scene = draft.practicePatch(
    { prompt: 'There are ____ ideas.', answer: 'so many', explain: 'Countable.', options: 'so many | so much', level_name: 'easy' },
    { item: { parts: ['There are ', '____', ' flags.'], answer: 'so many', options: ['so many', 'so much'], explain: 'Old.' } },
    'published'
  );
  assert.deepEqual(scene.published.item.parts, ['There are ', '____', ' ideas.']);
  assert.equal(scene.published.item.explain, 'Countable.');
});

function memory() {
  const map = new Map();
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); }
  };
}

test('a blank studio opens on the Oxford P6 revision table', () => {
  const place = draft.readStudioPlace(memory());
  assert.deepEqual(place, {
    book: 'oxford',
    series: 'oxford',
    term: 'first',
    level: 'p6',
    unit: 'unit1',
    section: 'revision',
    kind: 'vocab',
    mode: 'fill',
    difficulty: 'easy',
    set: '1',
    review: 'all'
  });
});

test('the studio returns to the last table on this device', () => {
  const store = memory();
  const saved = draft.writeStudioPlace(store, {
    book: 'longman',
    series: 'elect',
    term: 'second',
    level: 'p5',
    unit: 'unit4',
    section: 'practice',
    kind: 'grammar',
    mode: 'chat',
    difficulty: 'hard',
    set: '3',
    review: 'draft'
  });
  assert.equal(saved.mode, 'chat');
  assert.deepEqual(draft.readStudioPlace(store), saved);
  assert.equal(store.getItem(draft.STUDIO_PLACE_KEY).includes('elect'), true);
});

test('the library is not a lesson section', () => {
  const store = memory();
  store.setItem(draft.STUDIO_PLACE_KEY, JSON.stringify({ section: 'library', book: 'oxford', series: 'oxford' }));
  assert.equal(draft.readStudioPlace(store).section, 'revision');
});

test('a stored studio table drops choices that no longer fit', () => {
  const store = memory();
  store.setItem(draft.STUDIO_PLACE_KEY, '{');
  assert.equal(draft.readStudioPlace(store).unit, 'unit1');
  draft.writeStudioPlace(store, {
    book: 'oxford',
    series: 'elect',
    term: 'second',
    level: 'p6',
    unit: 'mixed',
    section: 'revision',
    kind: 'grammar',
    mode: 'letters',
    set: '9',
    review: 'later'
  });
  const place = draft.readStudioPlace(store);
  assert.equal(place.book, 'oxford');
  assert.equal(place.series, 'oxford');
  assert.equal(place.term, 'second');
  assert.equal(place.unit, 'unit1');
  assert.equal(place.section, 'revision');
  assert.equal(place.kind, 'grammar');
  assert.equal(place.mode, 'story');
  assert.equal(place.set, '1');
  assert.equal(place.review, 'all');
});

test('the pages table can stay on Get started', () => {
  const store = memory();
  const saved = draft.writeStudioPlace(store, {
    book: 'oxford',
    series: 'oxford',
    term: 'second',
    level: 'p6',
    unit: 'home',
    section: 'pages'
  });
  assert.equal(saved.section, 'pages');
  assert.equal(saved.unit, 'home');
  assert.equal(draft.readStudioPlace(store).unit, 'home');
  assert.equal(draft.studioPath(saved), 'oxford/Livingoxfordenglish/bookB/p6/home/pages');
  const row = draft.studioPath(saved, { slot: 'hear' });
  assert.equal(row, 'oxford/Livingoxfordenglish/bookB/p6/home/pages/hear');
  assert.equal(draft.parseStudioPath(row).slot, 'hear');
  assert.equal(draft.parseStudioPath(row).term, 'second');
  assert.equal(draft.parseStudioPath(row).unit, 'home');
  const grammar = 'oxford/Livingoxfordenglish/second/p6/unit1/pages/revision-grammar';
  assert.equal(draft.parseStudioPath(grammar).slot, 'revision-grammar');
  assert.equal(draft.parseStudioPath(grammar).term, 'second');
  assert.equal(draft.parseStudioPath(grammar).section, 'pages');
});

test('mixed topic is kept only for vocab practice', () => {
  const store = memory();
  draft.writeStudioPlace(store, {
    book: 'oxford',
    series: 'oxford',
    term: 'first',
    level: 'p6',
    unit: 'mixed',
    section: 'practice',
    kind: 'vocab',
    mode: 'letters',
    review: 'published'
  });
  const place = draft.readStudioPlace(store);
  assert.equal(place.unit, 'mixed');
  assert.equal(place.mode, 'letters');
  assert.equal(place.review, 'published');
});

test('grammar practice pictures load from the grammar folder', () => {
  assert.equal(draft.mediaSrc('illust/u1_02_volunteer.jpg', {
    section: 'practice', kind: 'grammar', unit: 'unit1'
  }), 'practice/grammar/illust/u1_02_volunteer.jpg');
  assert.equal(draft.mediaSrc('thumb_01.jpg', {
    section: 'revision', kind: 'vocab', unit: 'unit6'
  }), 'unit6/thumb_01.jpg');
  assert.equal(draft.mediaSrc('https://cdn.example/a.png', {
    section: 'practice', kind: 'grammar', unit: 'unit1'
  }), 'https://cdn.example/a.png');
});

test('a studio path names the table and one row', () => {
  const table = draft.studioPath({
    book: 'oxford',
    series: 'oxford',
    term: 'first',
    level: 'p6',
    unit: 'unit1',
    section: 'practice',
    kind: 'vocab',
    mode: 'letters',
    set: '1'
  });
  assert.equal(table, 'oxford/Livingoxfordenglish/bookA/p6/unit1/practice/vocab/letters');
  const longman = draft.studioPath({
    book: 'longman',
    series: 'mypearson-express',
    term: 'first',
    level: 'p6',
    unit: 'unit1',
    section: 'revision',
    kind: 'vocab'
  });
  assert.equal(longman, 'longman/Primarylongmanexpress/bookA/p6/unit1/revision/vocab');

  const revision = draft.studioPath({
    book: 'oxford',
    series: 'oxford',
    term: 'first',
    level: 'p6',
    unit: 'unit3',
    section: 'revision',
    kind: 'grammar',
    mode: 'fill',
    set: '1'
  });
  assert.equal(revision, 'oxford/Livingoxfordenglish/bookA/p6/unit3/revision/grammar');

  const row = draft.studioPath({
    book: 'oxford',
    series: 'oxford',
    term: 'first',
    level: 'p6',
    unit: 'unit6',
    section: 'revision',
    kind: 'vocab'
  }, { n: '4', label: 'Korea' });
  assert.equal(row, 'oxford/Livingoxfordenglish/bookA/p6/unit6/revision/vocab/4');
  const opened = draft.parseStudioPath(row);
  assert.equal(opened.term, 'first');
  assert.equal(opened.series, 'oxford');
  assert.equal(opened.unit, 'unit6');
  assert.equal(opened.n, '4');
  assert.equal(draft.parseStudioPath('oxford/Livingoxfordenglish/first/p6/unit6/revision/vocab/4').n, '4');
  const old = draft.parseStudioPath('Studio row 4\nOxford · P6 · Book A\noxford/oxford/first/p6/unit6/revision/vocab/4\nKorea');
  assert.equal(old.series, 'oxford');
  assert.equal(old.n, '4');

  const story = draft.studioPath({
    book: 'oxford',
    series: 'oxford',
    term: 'first',
    level: 'p6',
    unit: 'unit1',
    section: 'practice',
    kind: 'grammar',
    mode: 'story',
    set: '2'
  }, { n: '4', label: 'where' });
  assert.equal(story, 'oxford/Livingoxfordenglish/bookA/p6/unit1/practice/grammar/story/set2/4');
  assert.equal(draft.parseStudioPath(story).set, '2');
  assert.equal(draft.parseStudioPath(story).mode, 'story');

  const letters = {
    book: 'oxford',
    series: 'oxford',
    term: 'first',
    level: 'p6',
    unit: 'unit1',
    section: 'practice',
    kind: 'vocab',
    mode: 'letters',
    set: '1'
  };
  const easy = draft.studioPath(letters, { n: '3', label: 'bad for', level: 'easy' });
  const hard = draft.studioPath(letters, { n: '3', label: 'bad for', level: 'hard' });
  assert.equal(easy, 'oxford/Livingoxfordenglish/bookA/p6/unit1/practice/vocab/letters/3/easy');
  assert.equal(hard, 'oxford/Livingoxfordenglish/bookA/p6/unit1/practice/vocab/letters/3/hard');
  assert.equal(draft.parseStudioPath('not a path'), null);
});

test('a blank advanced highlight still uses the example highlight', () => {
  assert.equal(draft.advancedHighlight({ highlight: 'adopt a pet', highlight_adv: '' }), 'adopt a pet');
  assert.equal(draft.advancedHighlight({ highlight: 'adopt a pet', highlight_adv: null }), 'adopt a pet');
  assert.equal(draft.advancedHighlight({ highlight: 'adopt a pet', highlight_adv: 'adopted a pet' }), 'adopted a pet');
});

test('example and advanced highlights stay on their own sentence', () => {
  const shared = { highlight: 'does voluntary work', highlight_adv: null };
  assert.equal(draft.advancedHighlight(shared), 'does voluntary work');
  const example = draft.rememberSideHighlight(shared, 'example', 'do voluntary work');
  assert.equal(example.highlight, 'do voluntary work');
  assert.equal(example.highlight_adv, 'does voluntary work');
  assert.equal(draft.advancedHighlight(example), 'does voluntary work');
  const advanced = draft.rememberSideHighlight(example, 'adv', 'did voluntary work');
  assert.equal(advanced.highlight, 'do voluntary work');
  assert.equal(advanced.highlight_adv, 'did voluntary work');
  assert.equal(draft.exampleHighlight(advanced), 'do voluntary work');
});

test('search suggestions quote nearby words and put a starting match first', () => {
  const hits = draft.searchSuggestions({
    lessons: [
      { book: 'oxford', series: 'oxford', term: 'first', level: 'p6', unit_id: 'unit6', track: 'vocab', n: 4, en: 'Korea', zh: '韓國', ex_en: 'A student is visiting Korea.' },
      { book: 'oxford', series: 'oxford', term: 'first', level: 'p6', unit_id: 'unit1', track: 'vocab', n: 2, en: 'donate', zh: '捐贈', ex_en: 'They donate money for Korea.' }
    ],
    practice: [
      { book: 'oxford', series: 'oxford', term: 'second', level: 'p6', unit_id: 'unit1', track: 'vocab', mode: 'fill', set_no: 1, n: 3, level_name: 'easy', prompt: 'Please throw the bottles away.', answer: 'throw' }
    ],
    pages: [
      { book: 'oxford', series: 'oxford', term: 'second', level: 'p6', unit_id: 'unit1', slot: 'title', label: 'For a good cause', note: 'Charity verbs.' }
    ]
  }, 'Korea');
  assert.equal(hits.length, 2);
  const many = draft.searchSuggestions({
    lessons: Array.from({ length: 12 }, (_, index) => ({
      book: 'oxford', series: 'oxford', term: 'first', level: 'p6', unit_id: 'unit1', track: 'vocab', n: index + 1, en: 'Korea ' + (index + 1)
    }))
  }, 'Korea');
  assert.equal(many.length, 12);
  assert.equal(hits[0].snippet.match, 'Korea');
  assert.equal(hits[0].snippet.before, '');
  assert.match(hits[0].snippet.after, /韓國/);
  assert.equal(hits[0].place.unit, 'unit6');
  assert.equal(hits[0].place.section, 'revision');
  assert.equal(hits[0].row.n, '4');
  assert.match(hits[1].snippet.before, /donate money for /);
  assert.equal(hits[1].place.unit, 'unit1');
  assert.deepEqual(draft.searchSuggestions({ lessons: [{ en: 'Korea', unit_id: 'unit6', n: 4 }] }, 'K'), []);
  assert.deepEqual(draft.searchSuggestions({
    practice: [{ book: 'oxford', series: 'oxford', term: 'first', level: 'p6', unit_id: 'unit1', track: 'vocab', mode: 'fill', n: 1, prompt: 'Pick one.', answer: 'cat', explain: 'A pet.', options: 'Korea | Japan' }]
  }, 'Korea'), []);
  const pages = draft.searchSuggestions({
    pages: [{ book: 'oxford', series: 'oxford', term: 'first', level: 'p6', unit_id: 'home', slot: 'hear', label: 'Hear it', note: 'Tap Play on a card.' }]
  }, 'Hear');
  assert.equal(pages[0].row.slot, 'hear');
  assert.match(pages[0].snippet.after, /Tap Play/);
});

test('option tags split on bars and keep a dotted pair together', () => {
  assert.deepEqual(draft.optionList('so many | so much | although'), ['so many', 'so much', 'although']);
  assert.deepEqual(draft.optionList('  as · as | so · that  '), ['as · as', 'so · that']);
  assert.deepEqual(draft.optionList(''), []);
  assert.equal(draft.joinOptions(['so many', ' so much ', '']), 'so many | so much');
  assert.equal(draft.joinOptions(draft.optionList('will · so that | would · although')), 'will · so that | would · although');
});
