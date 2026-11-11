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

  function exampleHighlight(row) {
    return (row && row.highlight) || '';
  }

  function advancedHighlight(row) {
    if (!row) return '';
    if (row.highlight_adv == null || String(row.highlight_adv).trim() === '') return row.highlight || '';
    return row.highlight_adv;
  }

  function rememberSideHighlight(row, side, chosen) {
    var next = {
      highlight: (row && row.highlight) || '',
      highlight_adv: row ? row.highlight_adv : null
    };
    if (side === 'adv') {
      next.highlight_adv = chosen;
      return next;
    }
    if (next.highlight_adv == null) next.highlight_adv = next.highlight;
    next.highlight = chosen;
    return next;
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

  function optionList(value) {
    return splitList(value).map(function (part) { return part.trim(); }).filter(function (part) { return part !== ''; });
  }

  function joinOptions(list) {
    return (list || []).map(function (part) { return String(part || '').trim(); }).filter(function (part) { return part !== ''; }).join(' | ');
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
  var STUDIO_WIDTH_KEY = 'revision-studio-widths';
  var MIN_COLUMN_PX = 48;
  var MAX_COLUMN_PX = 4000;

  function readColumnWidths(storage) {
    try {
      var raw = storage && storage.getItem(STUDIO_WIDTH_KEY);
      if (!raw) return {};
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
      return data;
    } catch (e) {
      return {};
    }
  }

  function shapeWidths(storage, shape) {
    var group = readColumnWidths(storage)[shape];
    if (!group || typeof group !== 'object' || Array.isArray(group)) return {};
    var out = {};
    Object.keys(group).forEach(function (key) {
      if (!/^[a-z0-9-]+$/.test(key)) return;
      var px = Math.round(Number(group[key]));
      if (px >= MIN_COLUMN_PX && px <= MAX_COLUMN_PX) out[key] = px;
    });
    return out;
  }

  function writeColumnWidth(storage, shape, key, px) {
    var all = readColumnWidths(storage);
    var next = Math.round(Number(px));
    if (!isFinite(next)) next = MIN_COLUMN_PX;
    next = Math.min(MAX_COLUMN_PX, Math.max(MIN_COLUMN_PX, next));
    if (!all[shape] || typeof all[shape] !== 'object' || Array.isArray(all[shape])) all[shape] = {};
    all[shape][key] = next;
    try { storage.setItem(STUDIO_WIDTH_KEY, JSON.stringify(all)); } catch (e) {}
    return next;
  }

  function clearColumnWidth(storage, shape, key) {
    var all = readColumnWidths(storage);
    if (all[shape] && typeof all[shape] === 'object' && !Array.isArray(all[shape])) delete all[shape][key];
    try { storage.setItem(STUDIO_WIDTH_KEY, JSON.stringify(all)); } catch (e) {}
  }

  function dragColumnWidth(start, delta) {
    var next = Math.round(Number(start) + Number(delta));
    if (!isFinite(next)) return MIN_COLUMN_PX;
    return Math.min(MAX_COLUMN_PX, Math.max(MIN_COLUMN_PX, next));
  }

  function columnResizeLabel(column) {
    var text = String(column && column.label || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return 'Resize ' + (text || (column && column.key) || 'column');
  }

  function columnLayout(columns, saved, measured) {
    var custom = false;
    var widths = columns.map(function (column, index) {
      var chosen = saved && Number(saved[column.key]);
      if (chosen >= MIN_COLUMN_PX && chosen <= MAX_COLUMN_PX) {
        custom = true;
        return Math.round(chosen);
      }
      var current = Number(measured && measured[index]);
      if (isFinite(current) && current > 0) return Math.round(current);
      return 0;
    });
    return { widths: widths, custom: custom };
  }

  function mountStudioColumns(table, head, columns, shape, storage) {
    var doc = table.ownerDocument;
    table.dataset.shape = shape;
    var group = table.querySelector('colgroup');
    group.replaceChildren();
    var cols = columns.map(function (column) {
      var col = doc.createElement('col');
      col.className = column.col;
      col.dataset.key = column.key;
      group.appendChild(col);
      return col;
    });
    var row = doc.createElement('tr');
    var cells = columns.map(function (column) {
      var cell = doc.createElement('th');
      cell.dataset.key = column.key;
      cell.innerHTML = column.label;
      var grip = doc.createElement('button');
      grip.type = 'button';
      grip.className = 'studio-col-resize';
      grip.setAttribute('aria-label', columnResizeLabel(column));
      cell.appendChild(grip);
      row.appendChild(cell);
      return cell;
    });
    head.replaceChildren(row);

    function measuredWidths() {
      return cells.map(function (cell) {
        var box = cell.getBoundingClientRect();
        var current = box && Number(box.width);
        return isFinite(current) && current > 0 ? Math.round(current) : 0;
      });
    }
    function paint(widths, custom) {
      if (!custom || widths.some(function (px) { return !(px > 0); })) {
        cols.forEach(function (col) { col.style.width = ''; });
        table.style.width = '';
        table.style.minWidth = '';
        return;
      }
      var sum = 0;
      cols.forEach(function (col, index) {
        var px = Math.round(widths[index]);
        col.style.width = px + 'px';
        sum += px;
      });
      table.style.width = sum + 'px';
      table.style.minWidth = sum + 'px';
    }
    function applySaved() {
      var saved = shapeWidths(storage, shape);
      cols.forEach(function (col) { col.style.width = ''; });
      table.style.width = '';
      table.style.minWidth = '';
      if (!Object.keys(saved).length) return;
      var layout = columnLayout(columns, saved, measuredWidths());
      paint(layout.widths, layout.custom);
    }
    function explicitWidths() {
      return cols.map(function (col, index) {
        var inline = parseFloat(col.style.width);
        if (inline > 0) return Math.round(inline);
        var box = cells[index].getBoundingClientRect();
        var current = box && Number(box.width);
        if (isFinite(current) && current > 0) return Math.round(current);
        return MIN_COLUMN_PX;
      });
    }
    function dragging(on) {
      var body = doc.body;
      if (!body || !body.classList) return;
      if (on) body.classList.add('studio-col-dragging');
      else body.classList.remove('studio-col-dragging');
    }

    cells.forEach(function (cell, index) {
      var grip = cell.querySelector('.studio-col-resize');
      var key = columns[index].key;
      grip.addEventListener('dblclick', function (event) {
        event.preventDefault();
        event.stopPropagation();
        clearColumnWidth(storage, shape, key);
        applySaved();
      });
      grip.addEventListener('keydown', function (event) {
        var step = event.key === 'ArrowRight' ? 8 : (event.key === 'ArrowLeft' ? -8 : 0);
        if (!step) return;
        event.preventDefault();
        var widths = explicitWidths();
        widths[index] = dragColumnWidth(widths[index], step);
        paint(widths, true);
        writeColumnWidth(storage, shape, key, widths[index]);
      });
      grip.addEventListener('pointerdown', function (event) {
        if (event.button != null && event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        var widths = explicitWidths();
        var startX = event.clientX;
        var start = widths[index];
        var moved = false;
        dragging(true);
        grip.classList.add('is-dragging');
        if (grip.setPointerCapture && event.pointerId != null) {
          try { grip.setPointerCapture(event.pointerId); } catch (e) {}
        }
        function move(e) {
          if (e.clientX === startX) return;
          moved = true;
          widths[index] = dragColumnWidth(start, e.clientX - startX);
          paint(widths, true);
        }
        function up() {
          grip.classList.remove('is-dragging');
          dragging(false);
          grip.removeEventListener('pointermove', move);
          grip.removeEventListener('pointerup', up);
          grip.removeEventListener('pointercancel', up);
          if (moved) writeColumnWidth(storage, shape, key, widths[index]);
        }
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', up);
        grip.addEventListener('pointercancel', up);
      });
    });
    applySaved();
  }
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

  var PATH_BOOK = { oxford: 'Oxford', longman: 'Longman' };
  var PATH_SERIES = { oxford: 'Oxford', 'mypearson-express': 'MyPearson Express', elect: 'Elect' };
  var PATH_TERM = { first: 'Book A', second: 'Book B' };
  var PATH_SECTION = { revision: 'Revision card', practice: 'Practice' };
  var PATH_KIND = { vocab: 'Vocab', grammar: 'Grammar' };
  var PATH_MODE = {
    fill: 'Sentence fill-in',
    letters: 'Missing letters',
    match: 'Memory match',
    timed: 'Timed challenge',
    story: 'Story',
    chat: 'Chat',
    join: 'Join',
    boss: 'Boss'
  };

  function studioPath(place, row) {
    var here = place || {};
    var practice = here.section === 'practice';
    var grammar = here.kind === 'grammar';
    var bits = [here.book, here.series, here.term, here.level, here.unit, here.section, here.kind];
    var title = [
      PATH_BOOK[here.book] || here.book,
      String(here.level || '').toUpperCase(),
      PATH_TERM[here.term] || here.term,
      here.unit === 'mixed' ? 'Mixed topic' : ('Unit ' + String(here.unit || '').replace(/^unit/, '')),
      PATH_SECTION[here.section] || here.section,
      PATH_KIND[here.kind] || here.kind
    ];
    if (here.book === 'longman') title.splice(1, 0, PATH_SERIES[here.series] || here.series);
    if (practice) {
      bits.push(here.mode);
      title.push(PATH_MODE[here.mode] || here.mode);
    }
    if (practice && grammar) {
      bits.push('set' + here.set);
      title.push('Set ' + here.set);
    }
    var lines = [];
    if (row && row.n) {
      bits.push(String(row.n));
      title.push('#' + row.n);
    }
    if (row && (row.level === 'easy' || row.level === 'hard')) {
      bits.push(row.level);
      title.push(row.level === 'hard' ? 'Hard' : 'Easy');
    }
    if (row && row.n) {
      if (row.label) title.push(row.label);
      lines.push('Studio row ' + row.n);
    } else {
      lines.push('Studio table');
    }
    lines.push(title.join(' · '));
    lines.push(bits.join('/'));
    if (row && row.label) lines.push(String(row.label));
    return lines.join('\n');
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
    if (extra) patch.extra = extra;
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
    exampleHighlight: exampleHighlight,
    advancedHighlight: advancedHighlight,
    rememberSideHighlight: rememberSideHighlight,
    revisionPatch: revisionPatch,
    practicePatch: practicePatch,
    compactNumbers: compactNumbers,
    letterExample: letterExample,
    STUDIO_PLACE_KEY: STUDIO_PLACE_KEY,
    STUDIO_WIDTH_KEY: STUDIO_WIDTH_KEY,
    MIN_COLUMN_PX: MIN_COLUMN_PX,
    MAX_COLUMN_PX: MAX_COLUMN_PX,
    shapeWidths: shapeWidths,
    writeColumnWidth: writeColumnWidth,
    clearColumnWidth: clearColumnWidth,
    dragColumnWidth: dragColumnWidth,
    mountStudioColumns: mountStudioColumns,
    readStudioPlace: readStudioPlace,
    writeStudioPlace: writeStudioPlace,
    studioPath: studioPath,
    optionList: optionList,
    joinOptions: joinOptions,
    fillParts: fillParts,
    fillStored: fillStored
  };
});
