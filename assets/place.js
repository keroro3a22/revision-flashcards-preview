/* Book, level, and the last home view.
   Saved on this device. Updated whenever the reader changes book, level, or tab. */
window.RevisionPlace = (function () {
  var STORAGE_KEY = 'revision-place-v1';
  var HOME = 'home';

  var books = [
    { id: 'longman', label: 'Longman', image: 'covers/unit2.jpg' },
    { id: 'oxford', label: 'Oxford', image: 'covers/unit1.jpg' }
  ];
  var levels = [
    { id: 'p1', label: 'P1', image: 'unit1/thumb_01.jpg' },
    { id: 'p2', label: 'P2', image: 'unit2/thumb_01.png' },
    { id: 'p3', label: 'P3', image: 'unit3/thumb_01.jpg' },
    { id: 'p4', label: 'P4', image: 'unit4/thumb_02.png' },
    { id: 'p5', label: 'P5', image: 'dictation3/thumb_01.png' },
    { id: 'p6', label: 'P6', image: 'covers/unit4.jpg' }
  ];

  var cardArt = {
    unit1: {
      words: 'unit1/thumb_01.jpg',
      grammar: 'practice/grammar/illust/u1_09_fair.jpg',
      revision: 'covers/unit1.jpg',
      game: 'game/illust/intro/detective.png',
      practice: 'unit1/thumb_08.jpg'
    },
    unit2: {
      words: 'unit2/thumb_03.png',
      grammar: 'practice/grammar/illust/u2_06_typhoon.jpg',
      revision: 'covers/unit2.jpg',
      game: 'practice/grammar/illust/u2_07_floodroad.png',
      practice: 'unit2/thumb_09.jpg'
    },
    unit3: {
      words: 'unit3/thumb_01.jpg',
      grammar: 'unit3/thumb_06.jpg',
      revision: 'covers/unit3.jpg',
      game: 'unit3/thumb_12.jpg',
      practice: 'unit3/thumb_04.jpg'
    },
    unit4: {
      words: 'unit4/thumb_01.png',
      grammar: 'practice/grammar/illust/u4_sparkly_finale.jpg',
      revision: 'covers/unit4.jpg',
      game: 'game/illust/intro/map.png',
      practice: 'unit4/thumb_10.jpg'
    },
    dictation3: {
      words: 'dictation3/thumb_01.png',
      grammar: 'dictation3/thumb_05.png',
      revision: 'covers/dictation3.jpg',
      game: 'dictation3/card_01_action_film.png',
      practice: 'dictation3/thumb_12.png'
    }
  };

  var covers = {
    unit1: 'covers/unit1.jpg',
    unit2: 'covers/unit2.jpg',
    unit3: 'covers/unit3.jpg',
    unit4: 'covers/unit4.jpg',
    dictation3: 'covers/dictation3.jpg'
  };

  function unitsFor(book, level) {
    var titles = book === 'oxford' && level === 'p6'
      ? [
          ['unit1', 'Unit 1', 'For a good cause'],
          ['unit2', 'Unit 2', 'Lend a helping hand'],
          ['unit3', 'Unit 3', 'Junior Super Chef'],
          ['unit4', 'Unit 4', 'Film magic'],
          ['dictation3', 'Dictation', 'Films and similes']
        ]
      : [
          ['unit1', 'Unit 1', ''],
          ['unit2', 'Unit 2', ''],
          ['unit3', 'Unit 3', ''],
          ['unit4', 'Unit 4', '']
        ];
    return titles.map(function (row) {
      return { id: row[0], label: row[1], title: row[2], cover: covers[row[0]] };
    });
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
    var unit = input.unit === HOME || known(units, input.unit) ? input.unit : HOME;
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
      unit: Object.prototype.hasOwnProperty.call(next, 'unit') ? next.unit : (base ? base.unit : HOME)
    });
  }

  function door(id, label, href, image) {
    return { id: id, label: label, href: href || '', ready: !!href, note: '', image: image || '' };
  }

  function entriesFor(place) {
    if (!place || place.unit === HOME) return [];
    var art = cardArt[place.unit] || cardArt.unit1;
    var names = [
      ['words', 'Words'],
      ['grammar', 'Grammar'],
      ['revision', 'Revision 卡'],
      ['game', 'Game'],
      ['practice', 'Practice']
    ];
    var live = place.book === 'oxford' && place.level === 'p6';
    if (!live) {
      return names.map(function (pair) { return door(pair[0], pair[1], '', art[pair[0]]); });
    }
    var unit = place.unit;
    var card = unit === 'dictation3' ? 'dictation3/index.html' : unit + '/index.html';
    var grammar = unit === 'dictation3' ? '' : 'practice/grammar/' + unit + '-hub.html';
    return [
      door('words', 'Words', card, art.words),
      door('grammar', 'Grammar', grammar, art.grammar),
      door('revision', 'Revision 卡', card, art.revision),
      door('game', 'Game', 'game/index.html', art.game),
      door('practice', 'Practice', 'practice/index.html?unit=' + encodeURIComponent(unit), art.practice)
    ];
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    HOME: HOME,
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
