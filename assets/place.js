/* Book, level, and unit for the home screen.
   The choice is remembered on this device. Account settings do not store it. */
window.RevisionPlace = (function () {
  var STORAGE_KEY = 'revision-place-v1';
  var BUILDING = '這個單元還在砌緊。';

  var books = [
    { id: 'longman', label: 'Longman' },
    { id: 'oxford', label: 'Oxford' }
  ];
  var levels = [
    { id: 'p1', label: 'P1' },
    { id: 'p2', label: 'P2' },
    { id: 'p3', label: 'P3' },
    { id: 'p4', label: 'P4' },
    { id: 'p5', label: 'P5' },
    { id: 'p6', label: 'P6' }
  ];

  function unitsFor(book, level) {
    if (book === 'oxford' && level === 'p6') {
      return [
        { id: 'unit1', label: 'Unit 1', title: 'For a good cause' },
        { id: 'unit2', label: 'Unit 2', title: 'Lend a helping hand' },
        { id: 'unit3', label: 'Unit 3', title: 'Junior Super Chef' },
        { id: 'unit4', label: 'Unit 4', title: 'Film magic' },
        { id: 'dictation3', label: 'Dictation', title: 'Films and similes' }
      ];
    }
    return [
      { id: 'unit1', label: 'Unit 1', title: '' },
      { id: 'unit2', label: 'Unit 2', title: '' },
      { id: 'unit3', label: 'Unit 3', title: '' },
      { id: 'unit4', label: 'Unit 4', title: '' }
    ];
  }

  function labelOf(list, id) {
    var found = list.filter(function (item) { return item.id === id; })[0];
    return found ? found.label : '';
  }

  function headerText(place) {
    return labelOf(books, place.book) + ' · ' + labelOf(levels, place.level);
  }

  function known(list, id) {
    return list.some(function (item) { return item.id === id; });
  }

  function normalize(input) {
    if (!input || typeof input !== 'object') return null;
    if (!known(books, input.book) || !known(levels, input.level)) return null;
    var units = unitsFor(input.book, input.level);
    var unit = known(units, input.unit) ? input.unit : units[0].id;
    return { book: input.book, level: input.level, unit: unit };
  }

  function read(storage) {
    try {
      var raw = storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalize(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  function write(storage, input) {
    var place = normalize(input);
    if (!place) return null;
    storage.setItem(STORAGE_KEY, JSON.stringify(place));
    return place;
  }

  function withChange(place, patch) {
    var base = normalize(place);
    var next = patch || {};
    return normalize({
      book: next.book || (base ? base.book : ''),
      level: next.level || (base ? base.level : ''),
      unit: Object.prototype.hasOwnProperty.call(next, 'unit') ? next.unit : (base ? base.unit : '')
    });
  }

  function door(id, label, href) {
    if (href) return { id: id, label: label, href: href, ready: true, note: '' };
    return { id: id, label: label, href: '', ready: false, note: BUILDING };
  }

  function entriesFor(place) {
    var names = [
      ['words', 'Words'],
      ['grammar', 'Grammar'],
      ['revision', 'Revision 卡'],
      ['game', 'Game'],
      ['practice', 'Practice']
    ];
    var live = place.book === 'oxford' && place.level === 'p6';
    if (!live) {
      return names.map(function (pair) { return door(pair[0], pair[1], ''); });
    }
    var unit = place.unit;
    var card = unit === 'dictation3' ? 'dictation3/index.html' : unit + '/index.html';
    var grammar = unit === 'dictation3' ? '' : 'practice/grammar/' + unit + '-hub.html';
    return [
      door('words', 'Words', card),
      door('grammar', 'Grammar', grammar),
      door('revision', 'Revision 卡', card),
      door('game', 'Game', 'game/index.html'),
      door('practice', 'Practice', 'practice/index.html?unit=' + encodeURIComponent(unit))
    ];
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    BUILDING: BUILDING,
    books: books,
    levels: levels,
    unitsFor: unitsFor,
    headerText: headerText,
    normalize: normalize,
    read: read,
    write: write,
    withChange: withChange,
    entriesFor: entriesFor
  };
})();
