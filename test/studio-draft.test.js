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
  assert.equal(draft.studioPath(saved).includes('Get started'), true);
  assert.equal(draft.studioPath(saved).includes('Pages'), true);
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
  assert.match(table, /^Studio table\n/);
  assert.match(table, /Oxford · P6 · Book A · Unit 1 · Practice · Vocab · Missing letters/);
  const longman = draft.studioPath({
    book: 'longman',
    series: 'mypearson-express',
    term: 'first',
    level: 'p6',
    unit: 'unit1',
    section: 'revision',
    kind: 'vocab'
  });
  assert.match(longman, /Longman · Primary Longman Express · P6 · Book A/);
  assert.match(table, /oxford\/oxford\/first\/p6\/unit1\/practice\/vocab\/letters$/);

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
  assert.equal(revision.includes('fill'), false);
  assert.match(revision, /Revision card · Grammar/);
  assert.match(revision, /oxford\/oxford\/first\/p6\/unit3\/revision\/grammar$/);

  const row = draft.studioPath({
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
  assert.match(row, /^Studio row 4\n/);
  assert.match(row, /Set 2 · #4 · where/);
  assert.match(row, /practice\/grammar\/story\/set2\/4\nwhere$/);

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
  assert.match(easy, /#3 · Easy · bad for/);
  assert.match(hard, /#3 · Hard · bad for/);
  assert.match(easy, /letters\/3\/easy\nbad for$/);
  assert.match(hard, /letters\/3\/hard\nbad for$/);
  assert.notEqual(easy, hard);
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

test('option tags split on bars and keep a dotted pair together', () => {
  assert.deepEqual(draft.optionList('so many | so much | although'), ['so many', 'so much', 'although']);
  assert.deepEqual(draft.optionList('  as · as | so · that  '), ['as · as', 'so · that']);
  assert.deepEqual(draft.optionList(''), []);
  assert.equal(draft.joinOptions(['so many', ' so much ', '']), 'so many | so much');
  assert.equal(draft.joinOptions(draft.optionList('will · so that | would · although')), 'will · so that | would · although');
});
