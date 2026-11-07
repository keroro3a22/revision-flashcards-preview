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
  assert.equal(P.headerText({ book: 'oxford', level: 'p6' }), 'Oxford · P6');
});

test('Oxford P6 keeps the live units and other books use four empty units', () => {
  const P = place();
  const live = P.unitsFor('oxford', 'p6').map((unit) => unit.id).join(',');
  assert.equal(live, 'unit1,unit2,unit3,unit4,dictation3');
  assert.equal(P.unitsFor('oxford', 'p6')[0].title, 'For a good cause');
  assert.equal(P.unitsFor('longman', 'p3').map((unit) => unit.id).join(','), 'unit1,unit2,unit3,unit4');
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
});

test('a book without pages says the unit is still being built', () => {
  const P = place();
  const doors = P.entriesFor({ book: 'longman', level: 'p1', unit: 'unit2' });
  assert.equal(doors.map((door) => door.id).join(','), 'words,grammar,revision,game,practice');
  doors.forEach((door) => {
    assert.equal(door.ready, false);
    assert.equal(door.href, '');
    assert.equal(door.note, '這個單元還在砌緊。');
  });
});

test('dictation keeps its cards and practice, and grammar stays unfinished', () => {
  const P = place();
  const doors = P.entriesFor({ book: 'oxford', level: 'p6', unit: 'dictation3' });
  const href = Object.fromEntries(doors.map((door) => [door.id, door.href]));
  assert.equal(href.words, 'dictation3/index.html');
  assert.equal(href.revision, 'dictation3/index.html');
  assert.equal(href.grammar, '');
  assert.equal(href.practice, 'practice/index.html?unit=dictation3');
  assert.equal(doors.find((door) => door.id === 'grammar').note, P.BUILDING);
});

test('the last place is remembered on this device and a missing unit falls back', () => {
  const storage = memoryStorage();
  const P = place();
  assert.equal(P.read(storage), null);
  const saved = P.write(storage, { book: 'oxford', level: 'p6', unit: 'dictation3' });
  assert.equal(JSON.stringify(saved), JSON.stringify({ book: 'oxford', level: 'p6', unit: 'dictation3' }));
  assert.equal(JSON.stringify(P.read(storage)), JSON.stringify(saved));

  const moved = P.withChange(saved, { book: 'longman', level: 'p5' });
  assert.equal(moved.unit, 'unit1');
  assert.equal(JSON.stringify(P.write(storage, moved)), JSON.stringify(moved));

  const kept = P.withChange({ book: 'oxford', level: 'p6', unit: 'unit4' }, { book: 'longman' });
  assert.equal(JSON.stringify(kept), JSON.stringify({ book: 'longman', level: 'p6', unit: 'unit4' }));
  assert.equal(P.normalize({ book: 'nope', level: 'p6', unit: 'unit1' }), null);
  assert.equal(P.read(memoryStorage()), null);
});
