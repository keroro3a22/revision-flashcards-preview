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
