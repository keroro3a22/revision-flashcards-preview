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
  assert.equal(P.seriesFor('longman').map((item) => item.label).join(','), 'MyPearson Express,Elect');
  assert.equal(P.terms.map((item) => item.id).join(','), 'first,second');
  assert.equal(P.headerText({ book: 'oxford', level: 'p6' }), 'Oxford · P6 · 上學期');
  assert.equal(P.headerText({ book: 'longman', series: 'elect', level: 'p6', term: 'second' }), 'Longman · Elect · P6 · 下學期');
  assert.equal(P.HOME, 'home');
});

test('Oxford P6 keeps the live units and other books use four empty units', () => {
  const P = place();
  const live = P.unitsFor('oxford', 'p6').map((unit) => unit.id).join(',');
  assert.equal(live, 'unit1,unit2,unit3,unit4,dictation3');
  assert.equal(P.unitsFor('oxford', 'p6')[0].title, 'For a good cause');
  assert.equal(P.unitsFor('longman', 'p3').map((unit) => unit.id).join(','), 'unit1,unit2,unit3,unit4');
  assert.equal(P.entriesFor({ book: 'oxford', series: 'oxford', level: 'p6', term: 'second', unit: 'unit1' })[0].ready, false);
});

test('Oxford P6 unit doors open the pages that already exist', () => {
  const P = place();
  const doors = P.entriesFor({ book: 'oxford', level: 'p6', unit: 'unit1' });
  const href = Object.fromEntries(doors.map((door) => [door.id, door.href]));
  assert.deepEqual(href, {
    words: 'unit1/index.html',
    grammar: 'practice/grammar/unit1-hub.html',
    revision: 'unit1/index.html',
    game: 'game/index.html',
    practice: 'practice/index.html?unit=unit1'
  });
  assert.equal(doors.every((door) => door.ready), true);
  const other = P.entriesFor({ book: 'oxford', level: 'p6', unit: 'unit2' });
  assert.notEqual(doors.map((door) => door.image).join('|'), other.map((door) => door.image).join('|'));
});

test('a book without pages keeps the doors and pictures, with no status line yet', () => {
  const P = place();
  const doors = P.entriesFor({ book: 'longman', level: 'p1', unit: 'unit2' });
  assert.equal(doors.map((door) => door.id).join(','), 'words,grammar,revision,game,practice');
  doors.forEach((door) => {
    assert.equal(door.ready, false);
    assert.equal(door.href, '');
    assert.equal(door.note, 'Coming soon');
    assert.equal(door.image, '');
  });
  assert.equal(JSON.stringify(doors).includes('砌緊'), false);
});

test('dictation keeps its cards and practice, and grammar stays unfinished', () => {
  const P = place();
  const doors = P.entriesFor({ book: 'oxford', level: 'p6', unit: 'dictation3' });
  const href = Object.fromEntries(doors.map((door) => [door.id, door.href]));
  assert.equal(href.words, 'dictation3/index.html');
  assert.equal(href.revision, 'dictation3/index.html');
  assert.equal(href.grammar, '');
  assert.equal(href.practice, 'practice/index.html?unit=dictation3');
  assert.equal(doors.find((door) => door.id === 'grammar').note, 'Coming soon');
  assert.equal(doors.find((door) => door.id === 'grammar').image, '');
  assert.equal(doors.find((door) => door.id === 'revision').label, 'Revision card');
  assert.notEqual(doors.find((door) => door.id === 'words').image, doors.find((door) => door.id === 'grammar').image);
});

test('the last place is remembered on this device and a missing unit falls back', () => {
  const storage = memoryStorage();
  const P = place();
  assert.equal(P.read(storage), null);
  const saved = P.write(storage, { book: 'oxford', level: 'p6', unit: 'dictation3' });
  assert.equal(JSON.stringify(saved), JSON.stringify({ book: 'oxford', series: 'oxford', level: 'p6', term: 'first', unit: 'dictation3' }));
  assert.equal(JSON.stringify(P.read(storage)), JSON.stringify(saved));

  const started = P.write(storage, { book: 'oxford', level: 'p6', unit: 'home' });
  assert.equal(started.unit, 'home');
  const moved = P.withChange(saved, { book: 'longman', level: 'p5' });
  assert.equal(moved.unit, 'home');
  assert.equal(JSON.stringify(P.write(storage, moved)), JSON.stringify(moved));

  const kept = P.withChange({ book: 'oxford', level: 'p6', unit: 'unit4' }, { book: 'longman' });
  assert.equal(JSON.stringify(kept), JSON.stringify({ book: 'longman', series: 'mypearson-express', level: 'p6', term: 'first', unit: 'unit4' }));
  assert.equal(P.normalize({ book: 'nope', level: 'p6', unit: 'unit1' }), null);
  assert.equal(P.read(memoryStorage()), null);
});
