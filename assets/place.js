/* Book, level, and the last home view.
   Saved on this device. Updated whenever the reader changes book, level, or tab. */
window.RevisionPlace = (function () {
  var STORAGE_KEY = 'revision-place-v1';
  var HOME = 'home';
  var GAME = 'game';
  var SOON = 'Coming soon';

  var books = [
    { id: 'longman', label: 'Longman', image: 'covers/unit2.jpg' },
    { id: 'oxford', label: 'Oxford', image: 'covers/unit1.jpg' }
  ];
  var levels = [
    { id: 'p1', label: 'P1', image: 'unit1/thumb_01.jpg' },
    { id: 'p2', label: 'P2', image: 'unit2/thumb_01.png' },
    { id: 'p3', label: 'P3', image: 'unit3/thumb_01.jpg' },
    { id: 'p4', label: 'P4', image: 'unit4/thumb_02.png' },
    { id: 'p5', label: 'P5', image: 'covers/unit4.jpg' },
    { id: 'p6', label: 'P6', image: 'covers/unit4.jpg' }
  ];
  var seriesByBook = {
    oxford: [{ id: 'oxford', label: 'Living Oxford English' }],
    longman: [
      { id: 'mypearson-express', label: 'Primary Longman Express' },
      { id: 'elect', label: 'Primary Longman Elect' }
    ]
  };
  var terms = [
    { id: 'first', label: 'Book A' },
    { id: 'second', label: 'Book B' }
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
    unit5: {
      words: 'unit5/thumb_01.png',
      grammar: 'unit5/thumb_17.png',
      revision: 'covers/unit5.jpg',
      game: 'game/illust/intro/detective.png',
      practice: 'unit5/thumb_09.png'
    },
    unit6: {
      words: 'unit6/thumb_01.png',
      grammar: 'unit6/thumb_20.png',
      revision: 'covers/unit6.jpg',
      game: 'game/illust/intro/map.png',
      practice: 'unit6/thumb_10.png'
    }
  };

  var covers = {
    unit1: 'covers/unit1.jpg',
    unit2: 'covers/unit2.jpg',
    unit3: 'covers/unit3.jpg',
    unit4: 'covers/unit4.jpg',
    unit5: 'covers/unit5.jpg',
    unit6: 'covers/unit6.jpg'
  };

  function seriesFor(book) {
    return seriesByBook[book] || seriesByBook.oxford;
  }

  function chosenSeries(book, series) {
    var list = seriesFor(book);
    return list.some(function (item) { return item.id === series; }) ? series : list[0].id;
  }

  function chosenTerm(term) {
    return term === 'second' ? 'second' : 'first';
  }

  function unitsFor(book, level, series, term) {
    var live = book === 'oxford' && chosenSeries(book, series) === 'oxford' && level === 'p6' && chosenTerm(term) === 'first';
    var titles = live
      ? [
          ['unit1', 'Unit 1', 'For a good cause'],
          ['unit2', 'Unit 2', 'Lend a helping hand'],
          ['unit3', 'Unit 3', 'Junior Super Chef'],
          ['unit4', 'Unit 4', 'Film magic'],
          ['unit5', 'Unit 5', 'The Land of Kangaroos'],
          ['unit6', 'Unit 6', 'International Week']
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
    var seriesList = seriesFor(place.book);
    var series = chosenSeries(place.book, place.series);
    var parts = [labelOf(books, place.book)];
    if (seriesList.length > 1) parts.push(labelOf(seriesList, series));
    parts.push(labelOf(levels, place.level));
    parts.push(labelOf(terms, chosenTerm(place.term)));
    return parts.join(' · ');
  }

  function known(list, id) {
    return list.some(function (item) { return item.id === id; });
  }

  function normalize(input) {
    if (!input || typeof input !== 'object') return null;
    if (!known(books, input.book) || !known(levels, input.level)) return null;
    var series = chosenSeries(input.book, input.series);
    var term = chosenTerm(input.term);
    var units = unitsFor(input.book, input.level, series, term);
    var unit = input.unit === HOME || input.unit === GAME || known(units, input.unit) ? input.unit : HOME;
    return { book: input.book, series: series, level: input.level, term: term, unit: unit };
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
      series: Object.prototype.hasOwnProperty.call(next, 'series') ? next.series : (base ? base.series : ''),
      level: next.level || (base ? base.level : ''),
      term: Object.prototype.hasOwnProperty.call(next, 'term') ? next.term : (base ? base.term : ''),
      unit: Object.prototype.hasOwnProperty.call(next, 'unit') ? next.unit : (base ? base.unit : HOME)
    });
  }

  function door(id, label, href, image, ready) {
    if (ready && href) return { id: id, label: label, href: href, ready: true, note: '', image: image || '' };
    return { id: id, label: label, href: '', ready: false, note: SOON, image: '' };
  }

  function lessonLive(place) {
    return place.book === 'oxford'
      && chosenSeries(place.book, place.series) === 'oxford'
      && place.level === 'p6'
      && chosenTerm(place.term) === 'first';
  }

  function entriesFor(place) {
    if (!place || place.unit === HOME) return [];
    if (place.unit === GAME) {
      var sameGame = place.level === 'p6';
      return [{
        id: 'game',
        label: 'Game',
        items: [door('game', 'School Mystery', sameGame ? 'game/index.html' : '', 'game/illust/intro/detective.png', sameGame)]
      }];
    }
    var art = cardArt[place.unit] || cardArt.unit1;
    var live = lessonLive(place);
    var unit = place.unit;
    var grammarPractice = live && /^unit[1-4]$/.test(unit);
    return [
      {
        id: 'revision',
        label: 'Revision card',
        items: [
          door('revision-vocab', 'Vocab', unit + '/index.html', art.revision, live),
          door('revision-grammar', 'Grammar', unit + '/grammar.html', art.grammar, live)
        ]
      },
      {
        id: 'practice',
        label: 'Practice',
        items: [
          door('practice-vocab', 'Vocab', 'practice/index.html?unit=' + encodeURIComponent(unit), art.practice, live),
          door('practice-grammar', 'Grammar', 'practice/grammar/' + unit + '-hub.html', art.grammar, grammarPractice)
        ]
      }
    ];
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    HOME: HOME,
    GAME: GAME,
    SOON: SOON,
    books: books,
    levels: levels,
    terms: terms,
    seriesFor: seriesFor,
    unitsFor: unitsFor,
    headerText: headerText,
    normalize: normalize,
    read: read,
    write: write,
    withChange: withChange,
    entriesFor: entriesFor
  };
})();
