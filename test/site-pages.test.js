const test = require('node:test');
const assert = require('node:assert/strict');
const pages = require('../assets/site-pages.js');

const bookB = { book: 'oxford', series: 'oxford', term: 'second', level: 'p6', unit: 'unit1' };
const bookA = { book: 'oxford', series: 'oxford', term: 'first', level: 'p6', unit: 'unit1' };

test('a published vocab card opens only that revision door', () => {
  const lessons = [{ unit_id: 'unit1', track: 'vocab', n: 1, img: 'https://cdn.example/pick.png' }];
  const unit = pages.resolveUnit(bookB, 'unit1', [], lessons, []);
  const vocab = unit.items.filter((item) => item.id === 'revision-vocab')[0];
  const rest = unit.items.filter((item) => item.id !== 'revision-vocab');
  assert.equal(vocab.ready, true);
  assert.equal(vocab.href, 'unit1/?term=second');
  assert.equal(vocab.image, 'https://cdn.example/pick.png');
  assert.equal(vocab.note, 'Open the word cards.');
  rest.forEach((item) => {
    assert.equal(item.ready, false);
    assert.equal(item.href, '');
    assert.equal(item.note, 'Coming soon');
    assert.equal(item.image, '');
  });
  assert.equal(unit.words, 1);
  assert.equal(unit.listed, true);
});

test('practice uses the second photo and its own questions', () => {
  const lessons = [
    { unit_id: 'unit1', track: 'vocab', n: 1, img: 'one.png' },
    { unit_id: 'unit1', track: 'vocab', n: 2, img: 'two.png' }
  ];
  const closed = pages.resolveUnit(bookB, 'unit1', [], lessons, []);
  const practice = closed.items.filter((item) => item.id === 'practice-vocab')[0];
  assert.equal(practice.ready, false);
  const open = pages.resolveUnit(bookB, 'unit1', [], lessons, [{ unit_id: 'unit1', track: 'vocab' }]);
  const door = open.items.filter((item) => item.id === 'practice-vocab')[0];
  assert.equal(door.ready, true);
  assert.equal(door.image, 'unit1/two.png');
  assert.equal(door.href, 'practice/?unit=unit1&term=second');
});

test('one card is reused when practice has no second photo', () => {
  const lessons = [{ unit_id: 'unit1', track: 'vocab', n: 1, img: 'only.png' }];
  const unit = pages.resolveUnit(bookB, 'unit1', [], lessons, [{ unit_id: 'unit1', track: 'vocab' }]);
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
  assert.equal(cleared.items[0].note, 'Open the word cards.');
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
  assert.equal(Math.round(pages.photoRatio('revision-vocab') * 100) / 100, Math.round(4 / 3 * 100) / 100);
  assert.equal(Math.round(pages.photoRatio('see') * 100) / 100, Math.round(4 / 3 * 100) / 100);
});

test('Get started packs follow titles and open doors', () => {
  const catalog = {
    pages: [{ unit_id: 'unit2', slot: 'title', label: 'Helping', note: 'Storms.', image: '' }],
    lessons: [{ unit_id: 'unit1', track: 'vocab', n: 1, img: 'https://cdn.example/pick.png' }],
    practices: []
  };
  const packs = pages.packsFor(bookB, ['unit1', 'unit2', 'unit3'], catalog);
  assert.deepEqual(packs.map((unit) => unit.id), ['unit1', 'unit2']);
  assert.equal(packs[0].items[0].ready, true);
  assert.equal(packs[1].title, 'Helping');
  const home = pages.homeCopy(bookB, []);
  assert.equal(home.hero.label, 'English Revision');
  assert.equal(home.see.label, 'See it');
});
