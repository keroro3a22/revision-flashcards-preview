const test = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts, memoryStorage } = require('./helpers');

function place() {
  return loadScripts(['assets/place.js']).window.RevisionPlace;
}

test('books are Longman and Oxford, levels are P1 to P6', () => {
  const P = place();
  assert.equal(P.books.map((book) => book.id).join(','), 'longman,oxford');
  assert.equal(P.levels.map((level) => level.id).join(','), 'p1,p2,p3,p4,p5,p6');
  assert.equal(P.books.every((book) => book.image), true);
  assert.equal(P.levels.every((level) => level.image), true);
  assert.equal(P.seriesFor('oxford').map((item) => item.label).join(','), 'Living Oxford English');
  assert.equal(P.seriesFor('longman').map((item) => item.label).join(','), 'Primary Longman Express,Primary Longman Elect');
  assert.equal(P.terms.map((item) => item.id).join(','), 'first,second');
  assert.equal(P.terms.map((item) => item.label).join(','), 'Book A,Book B');
  assert.equal(P.headerText({ book: 'oxford', level: 'p6' }), 'Oxford · P6 · Book A');
  assert.equal(P.headerText({ book: 'longman', series: 'elect', level: 'p6', term: 'second' }), 'Longman · Primary Longman Elect · P6 · Book B');
  assert.equal(P.HOME, 'home');
});

function flat(groups) {
  return groups.flatMap((group) => group.items);
}

test('Oxford P6 keeps four units and there is no dictation tab', () => {
  const P = place();
  const live = P.unitsFor('oxford', 'p6').map((unit) => unit.id).join(',');
  assert.equal(live, 'unit1,unit2,unit3,unit4,unit5,unit6');
  assert.equal(P.unitsFor('oxford', 'p6')[0].title, 'For a good cause');
  assert.equal(P.unitsFor('longman', 'p3').map((unit) => unit.id).join(','), 'unit1,unit2,unit3,unit4');
  assert.equal(P.normalize({ book: 'oxford', level: 'p6', unit: 'dictation3' }).unit, 'home');
  assert.equal(P.normalize({ book: 'oxford', level: 'p6', unit: 'resources' }).unit, 'resources');
  assert.equal(P.tabsFor({ book: 'oxford', series: 'oxford', level: 'p6', term: 'first' }).slice(-2).map((tab) => tab.label).join(','), 'Game,Resources');
  assert.equal(flat(P.entriesFor({ book: 'oxford', series: 'oxford', level: 'p6', term: 'second', unit: 'unit1' }))[0].ready, false);
});

test('a unit opens revision cards and practice, split into vocab and grammar', () => {
  const P = place();
  const groups = P.entriesFor({ book: 'oxford', level: 'p6', unit: 'unit1' });
  assert.equal(groups.map((group) => group.label).join(','), 'Revision card,Practice');
  const revision = Object.fromEntries(groups[0].items.map((door) => [door.label, door.href]));
  const practice = Object.fromEntries(groups[1].items.map((door) => [door.label, door.href]));
  assert.deepEqual(revision, { Vocab: 'unit1/', Grammar: 'unit1/grammar/' });
  assert.deepEqual(practice, {
    Vocab: 'practice/?unit=unit1',
    Grammar: 'practice/grammar/unit1-hub/'
  });
  assert.equal(groups[0].items[1].href, 'unit1/grammar/');
  const later = P.entriesFor({ book: 'oxford', level: 'p6', unit: 'unit5' });
  assert.equal(later[1].items[1].ready, true);
  assert.equal(later[1].items[1].href, 'practice/grammar/unit5-hub/');
  const bookB = P.entriesFor({ book: 'oxford', series: 'oxford', level: 'p6', term: 'second', unit: 'unit6' });
  assert.equal(bookB[1].items[1].ready, false);
  const other = P.entriesFor({ book: 'oxford', level: 'p6', unit: 'unit2' });
  assert.notEqual(flat(groups).map((door) => door.image).join('|'), flat(other).map((door) => door.image).join('|'));
});

test('a book without pages keeps both groups, with no status line yet', () => {
  const P = place();
  const doors = flat(P.entriesFor({ book: 'longman', level: 'p1', unit: 'unit2' }));
  assert.equal(doors.map((door) => door.label).join(','), 'Vocab,Grammar,Vocab,Grammar');
  doors.forEach((door) => {
    assert.equal(door.ready, false);
    assert.equal(door.href, '');
    assert.equal(door.note, 'Coming soon');
    assert.equal(door.image, '');
  });
  assert.equal(JSON.stringify(doors).includes('砌緊'), false);
});

test('the same grade shares one game across books and terms', () => {
  const P = place();
  const oxford = flat(P.entriesFor({ book: 'oxford', level: 'p6', term: 'first', unit: 'game' }))[0];
  const elect = flat(P.entriesFor({ book: 'longman', series: 'elect', level: 'p6', term: 'second', unit: 'game' }))[0];
  assert.equal(oxford.href, 'game/');
  assert.equal(elect.href, oxford.href);
  assert.equal(flat(P.entriesFor({ book: 'oxford', level: 'p1', unit: 'game' }))[0].ready, false);
  const stayed = P.withChange({ book: 'oxford', level: 'p6', term: 'first', unit: 'game' }, { book: 'longman', term: 'second' });
  assert.equal(stayed.unit, 'game');
  assert.equal(stayed.series, 'mypearson-express');
});

test('the last place is remembered on this device and a missing unit falls back', () => {
  const storage = memoryStorage();
  const P = place();
  assert.equal(P.read(storage), null);
  const saved = P.write(storage, { book: 'oxford', level: 'p6', unit: 'unit4' });
  assert.equal(JSON.stringify(saved), JSON.stringify({ book: 'oxford', series: 'oxford', level: 'p6', term: 'first', unit: 'unit4' }));
  assert.equal(JSON.stringify(P.read(storage)), JSON.stringify(saved));

  const started = P.write(storage, { book: 'oxford', level: 'p6', unit: 'home' });
  assert.equal(started.unit, 'home');
  const moved = P.withChange(saved, { book: 'longman', level: 'p5' });
  assert.equal(moved.unit, 'unit4');
  assert.equal(JSON.stringify(P.write(storage, moved)), JSON.stringify(moved));

  const kept = P.withChange({ book: 'oxford', level: 'p6', unit: 'unit4' }, { book: 'longman' });
  assert.equal(JSON.stringify(kept), JSON.stringify({ book: 'longman', series: 'mypearson-express', level: 'p6', term: 'first', unit: 'unit4' }));
  assert.equal(P.normalize({ book: 'nope', level: 'p6', unit: 'unit1' }), null);
  assert.equal(P.read(memoryStorage()), null);
});
