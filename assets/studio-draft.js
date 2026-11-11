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

  var SHOWN_WORDS = { a: 1, an: 1, the: 1, and: 1, or: 1, but: 1, nor: 1, as: 1 };

  function functionWordAt(word, index) {
    if (!/[a-zA-Z]/.test(word.charAt(index))) return false;
    var start = index;
    var end = index;
    while (start > 0 && /[a-zA-Z]/.test(word.charAt(start - 1))) start -= 1;
    while (end + 1 < word.length && /[a-zA-Z]/.test(word.charAt(end + 1))) end += 1;
    return !!SHOWN_WORDS[word.slice(start, end + 1).toLowerCase()];
  }

  function letterMasks(phrase) {
    var word = String(phrase || '');
    var easy = {};
    var hard = {};
    var letters = [];
    var i;
    for (i = 0; i < word.length; i += 1) {
      if (!/[a-zA-Z]/.test(word.charAt(i)) || functionWordAt(word, i)) continue;
      letters.push(i);
    }
    letters.forEach(function (index, n) {
      hard[index] = true;
      if (n % 3 === 1) easy[index] = true;
    });
    if (letters.length && !Object.keys(easy).length) easy[letters[0]] = true;
    return { easy: easy, hard: hard };
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
    letterMasks: letterMasks,
    fillParts: fillParts,
    fillStored: fillStored
  };
});
