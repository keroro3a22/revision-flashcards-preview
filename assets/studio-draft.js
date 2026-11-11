/* Shared draft rules for people and agents.
   Add a row with status "draft" and leave published empty.
   A person checks that row in the studio.
   Publish only when a person, or an agent who was asked to publish, is ready.
   Publish sets status to "published" and stores the snapshot students read. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StudioDraft = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var STATIC_LAST = {
    'oxford|oxford|first|p6|unit1|vocab': 10,
    'oxford|oxford|first|p6|unit1|grammar': 4,
    'oxford|oxford|first|p6|unit2|vocab': 10,
    'oxford|oxford|first|p6|unit2|grammar': 2,
    'oxford|oxford|first|p6|unit3|vocab': 12,
    'oxford|oxford|first|p6|unit3|grammar': 3,
    'oxford|oxford|first|p6|unit4|vocab': 14,
    'oxford|oxford|first|p6|unit4|grammar': 2,
    'oxford|oxford|first|p6|unit5|vocab': 16,
    'oxford|oxford|first|p6|unit5|grammar': 17,
    'oxford|oxford|first|p6|unit6|vocab': 19,
    'oxford|oxford|first|p6|unit6|grammar': 4
  };

  function placeKey(place) {
    var track = place && place.kind === 'grammar' ? 'grammar' : 'vocab';
    return [place.book, place.series, place.term, place.level, place.unit, track].join('|');
  }

  function nextNumber(place, existingNumbers) {
    var max = 0;
    (existingNumbers || []).forEach(function (n) {
      var value = Number(n) || 0;
      if (value > max) max = value;
    });
    if (!place || place.section !== 'practice') {
      var known = STATIC_LAST[placeKey(place || {})] || 0;
      if (known > max) max = known;
    }
    return max + 1;
  }

  function difficulty(place) {
    if (place && place.section === 'practice' && place.mode === 'fill') {
      return place.difficulty === 'hard' ? 'hard' : 'easy';
    }
    return 'easy';
  }

  function unitId(place) {
    if (place && place.section === 'practice' && place.mode === 'boss') return 'mixed';
    return place.unit;
  }

  function revisionInsert(place, n) {
    return {
      book: place.book,
      series: place.series,
      term: place.term,
      level: place.level,
      unit_id: place.unit,
      track: place.kind === 'grammar' ? 'grammar' : 'vocab',
      n: n,
      en: '',
      zh: '',
      pos: '',
      syllables: '',
      pattern: '',
      note_zh: '',
      highlight: '',
      ex_en: '',
      ex_zh: '',
      adv_en: '',
      adv_zh: '',
      img: '',
      audio: '',
      video: '',
      published: null,
      status: 'draft'
    };
  }

  function practiceInsert(place, n) {
    return {
      book: place.book,
      series: place.series,
      term: place.term,
      level: place.level,
      unit_id: unitId(place),
      track: place.kind === 'grammar' ? 'grammar' : 'vocab',
      mode: place.mode,
      level_name: difficulty(place),
      set_no: place.kind === 'grammar' ? (Number(place.set) || 1) : 1,
      n: n,
      prompt: '',
      answer: '',
      explain: '',
      options: '',
      extra: place.kind === 'grammar' ? { set: Number(place.set) || 1, item: {} } : {},
      published: null,
      status: 'draft'
    };
  }

  function letterRules() {
    if (typeof globalThis !== 'undefined' && globalThis.LetterRules) return globalThis.LetterRules;
    if (typeof require === 'function') return require('./letter-rules.js');
    return null;
  }

  function letterExample(phrase, mode, random, ignoreWords) {
    return letterRules().hiddenIndexes(phrase, mode, random, ignoreWords);
  }

  function fillParts(sentence, answer, blank) {
    var token = blank || '______';
    var text = String(sentence || '');
    var at = text.indexOf(token);
    if (at < 0) return { before: text, missing: String(answer || ''), after: '' };
    return {
      before: text.slice(0, at),
      missing: String(answer || ''),
      after: text.slice(at + token.length)
    };
  }

  function fillStored(before, missing, after) {
    return {
      sentence: String(before || '') + '______' + String(after || ''),
      answer: String(missing || '').trim()
    };
  }

  function revisionPatch(data, status, previous) {
    var patch = Object.assign({ status: status }, data);
    if (status === 'published') {
      var keep = previous && previous.published ? previous.published : (previous || {});
      patch.published = Object.assign({}, data);
      if (keep.cutout) patch.published.cutout = true;
      if (keep.chips) patch.published.chips = keep.chips;
    }
    return patch;
  }

  function splitList(value) {
    return String(value || '').split(/\s*\|\s*/).filter(function (part) { return part !== ''; });
  }

  function syncItem(item, patch) {
    var next = Object.assign({}, item || {});
    next.explain = patch.explain;
    if (Array.isArray(next.parts)) {
      var pieces = String(patch.prompt || '').split('____');
      var parts = [];
      pieces.forEach(function (piece, index) {
        parts.push(piece);
        if (index < pieces.length - 1) parts.push('____');
      });
      next.parts = parts;
    }
    if (Array.isArray(next.preview)) {
      var previewBits = String(patch.prompt || '').split('____');
      var preview = [];
      previewBits.forEach(function (piece, index) {
        preview.push(piece);
        if (index < previewBits.length - 1) preview.push('REL');
      });
      next.preview = preview;
    }
    if (Array.isArray(next.answer)) next.answer = splitList(patch.answer);
    else next.answer = patch.answer;
    if (next.q) next.q = patch.prompt || '';
    if (Array.isArray(next.options) || patch.options) next.options = splitList(patch.options);
    if (Array.isArray(next.optionPairs)) {
      if (next.options.every(function (opt) { return opt.indexOf('·') !== -1; })) {
        next.optionPairs = next.options.map(function (opt) { return opt.split(/\s*·\s*/); });
      }
    }
    if (Array.isArray(next.preview)) {
      var filled = Array.isArray(next.answer) ? next.answer.join(' ') : next.answer;
      next.full = next.preview.map(function (part) { return part === 'REL' ? filled : part; }).join('');
    } else if (next.full && String(patch.prompt || '').indexOf('____') >= 0) {
      var token = Array.isArray(next.answer) ? next.answer[0] : next.answer;
      next.full = String(patch.prompt).replace('____', token);
    }
    return next;
  }

  function compactNumbers(rows) {
    return (rows || []).slice().sort(function (a, b) {
      return (Number(a.n) || 0) - (Number(b.n) || 0);
    }).map(function (row, index) {
      return { id: row.id, from: Number(row.n) || 0, n: index + 1 };
    }).filter(function (row) {
      return row.from !== row.n;
    });
  }

  var STUDIO_PLACE_KEY = 'revision-studio-place';
  var STUDIO_BOOKS = ['oxford', 'longman'];
  var STUDIO_SERIES = {
    oxford: ['oxford'],
    longman: ['mypearson-express', 'elect']
  };
  var STUDIO_TERMS = ['first', 'second'];
  var STUDIO_LEVELS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  var STUDIO_UNITS = ['unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6'];
  var STUDIO_MODES = {
    vocab: ['fill', 'letters', 'match', 'timed'],
    grammar: ['story', 'chat', 'join', 'boss']
  };

  function oneOf(list, value, fallback) {
    return list.indexOf(value) >= 0 ? value : fallback;
  }

  function studioPlace(input) {
    var raw = input || {};
    var book = oneOf(STUDIO_BOOKS, raw.book, 'oxford');
    var series = oneOf(STUDIO_SERIES[book], raw.series, STUDIO_SERIES[book][0]);
    var section = raw.section === 'practice' ? 'practice' : 'revision';
    var kind = raw.kind === 'grammar' ? 'grammar' : 'vocab';
    var unit = raw.unit;
    if (!(section === 'practice' && kind === 'vocab' && unit === 'mixed')) {
      unit = oneOf(STUDIO_UNITS, unit, 'unit1');
    }
    var set = oneOf(['1', '2', '3', '4', '5'], String(raw.set || ''), '1');
    var review = raw.review === 'draft' || raw.review === 'published' ? raw.review : 'all';
    return {
      book: book,
      series: series,
      term: oneOf(STUDIO_TERMS, raw.term, 'first'),
      level: oneOf(STUDIO_LEVELS, raw.level, 'p6'),
      unit: unit,
      section: section,
      kind: kind,
      mode: oneOf(STUDIO_MODES[kind], raw.mode, STUDIO_MODES[kind][0]),
      difficulty: raw.difficulty === 'hard' ? 'hard' : 'easy',
      set: set,
      review: review
    };
  }

  function readStudioPlace(storage) {
    try {
      var raw = storage && storage.getItem(STUDIO_PLACE_KEY);
      return studioPlace(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return studioPlace(null);
    }
  }

  function writeStudioPlace(storage, input) {
    var next = studioPlace(input);
    storage.setItem(STUDIO_PLACE_KEY, JSON.stringify(next));
    return next;
  }

  function practicePatch(data, extra, status) {
    var patch = {
      prompt: data.prompt || '',
      answer: data.answer || '',
      explain: data.explain || '',
      options: data.options || '',
      level_name: data.level_name === 'hard' ? 'hard' : 'easy',
      status: status
    };
    if (status === 'published') {
      var published = Object.assign({}, extra || {}, {
        prompt: patch.prompt,
        answer: patch.answer,
        explain: patch.explain,
        options: patch.options,
        sentence: patch.prompt,
        zh: patch.answer
      });
      if (published.item) published.item = syncItem(extra.item, patch);
      else if (published.kind === 'letters') published.word = patch.prompt;
      else if (published.kind === 'match') {
        published.en = patch.prompt;
        published.zh = patch.answer;
      } else if (published.accept) published.accept = [patch.answer];
      patch.published = published;
    }
    return patch;
  }

  return {
    STATIC_LAST: STATIC_LAST,
    nextNumber: nextNumber,
    difficulty: difficulty,
    unitId: unitId,
    revisionInsert: revisionInsert,
    practiceInsert: practiceInsert,
    revisionPatch: revisionPatch,
    practicePatch: practicePatch,
    compactNumbers: compactNumbers,
    letterExample: letterExample,
    STUDIO_PLACE_KEY: STUDIO_PLACE_KEY,
    readStudioPlace: readStudioPlace,
    writeStudioPlace: writeStudioPlace,
    fillParts: fillParts,
    fillStored: fillStored
  };
});
