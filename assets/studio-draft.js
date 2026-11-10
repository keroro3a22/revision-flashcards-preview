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
    'oxford|oxford|first|p6|unit1': 14,
    'oxford|oxford|first|p6|unit2': 12,
    'oxford|oxford|first|p6|unit3': 15,
    'oxford|oxford|first|p6|unit4': 16,
    'oxford|oxford|first|p6|unit5': 33,
    'oxford|oxford|first|p6|unit6': 23
  };

  function placeKey(place) {
    return [place.book, place.series, place.term, place.level, place.unit].join('|');
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
      n: n,
      prompt: '',
      answer: '',
      explain: '',
      options: '',
      extra: {},
      published: null,
      status: 'draft'
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
    practicePatch: practicePatch
  };
});
