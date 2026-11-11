/* People and agents add a draft here first. A person checks it. Publish is what students read. */
(function () {
  var BOOKS = [
    { id: 'oxford', label: 'Oxford' },
    { id: 'longman', label: 'Longman' }
  ];
  var SERIES = {
    oxford: [{ id: 'oxford', label: 'Oxford' }],
    longman: [
      { id: 'mypearson-express', label: 'MyPearson Express' },
      { id: 'elect', label: 'Elect' }
    ]
  };
  var TERMS = [
    { id: 'first', label: '上學期' },
    { id: 'second', label: '下學期' }
  ];
  var LEVELS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  var UNITS = [
    { id: 'unit1', label: 'Unit 1' },
    { id: 'unit2', label: 'Unit 2' },
    { id: 'unit3', label: 'Unit 3' },
    { id: 'unit4', label: 'Unit 4' },
    { id: 'unit5', label: 'Unit 5' },
    { id: 'unit6', label: 'Unit 6' }
  ];
  var MODES = {
    vocab: [
      { id: 'fill', label: 'Sentence fill-in' },
      { id: 'letters', label: 'Missing letters' },
      { id: 'match', label: 'Memory match' },
      { id: 'timed', label: 'Timed challenge' }
    ],
    grammar: [
      { id: 'story', label: 'Story' },
      { id: 'chat', label: 'Chat' },
      { id: 'join', label: 'Join' },
      { id: 'boss', label: 'Boss' }
    ]
  };
  var TEXT = ['en', 'zh', 'pos', 'syllables'];
  var PAIRS = [['ex_en', 'ex_zh'], ['adv_en', 'adv_zh']];

  var client = null;
  var rows = [];
  var tableName = 'lesson_cards';

  function $(id) { return document.getElementById(id); }
  function say(text) {
    var note = $('studio-note');
    note.hidden = !text;
    note.textContent = text || '';
  }
  function place() {
    return {
      book: $('filter-book').value,
      series: $('filter-series').value,
      term: $('filter-term').value,
      level: $('filter-level').value,
      unit: $('filter-unit').value,
      section: $('filter-section').value,
      kind: $('filter-kind').value,
      mode: $('filter-mode').value,
      difficulty: $('filter-difficulty').value,
      set: $('filter-set') ? $('filter-set').value : '1',
      review: $('filter-review').value
    };
  }
  function syncMode() {
    var kind = $('filter-kind').value === 'grammar' ? 'grammar' : 'vocab';
    var modes = MODES[kind];
    var current = $('filter-mode').value;
    if (!modes.some(function (item) { return item.id === current; })) current = modes[0].id;
    fillSelect($('filter-mode'), modes, current);
    var practice = $('filter-section').value === 'practice';
    $('filter-mode-label').hidden = !practice;
    $('filter-difficulty-label').hidden = true;
    $('filter-set-label').hidden = !(practice && kind === 'grammar');
    $('filter-unit-label').hidden = practice && $('filter-mode').value === 'boss';
    syncUnits();
  }
  function syncUnits() {
    var practice = $('filter-section').value === 'practice';
    var vocab = $('filter-kind').value !== 'grammar';
    var units = UNITS.slice();
    if (practice && vocab) units = units.concat([{ id: 'mixed', label: 'Mixed topic' }]);
    var current = $('filter-unit').value;
    if (!units.some(function (item) { return item.id === current; })) current = 'unit1';
    fillSelect($('filter-unit'), units, current || 'unit1');
  }
  function fillSelect(select, items, selected) {
    select.replaceChildren();
    items.forEach(function (item) {
      var option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.label;
      if (item.id === selected) option.selected = true;
      select.appendChild(option);
    });
  }
  function syncSeries() {
    var book = $('filter-book').value;
    var current = $('filter-series').value;
    var items = SERIES[book] || SERIES.oxford;
    if (!items.some(function (item) { return item.id === current; })) current = items[0].id;
    fillSelect($('filter-series'), items, current);
  }

  function plainPaste(event) {
    event.preventDefault();
    var text = (event.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  }
  function cellText(value) {
    return String(value || '').replace(/\u00a0/g, ' ');
  }
  function escapeHtml(text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function highlightHtml(text, phrase) {
    var value = String(text || '');
    var mark = String(phrase || '').trim();
    if (!mark) return escapeHtml(value);
    var at = value.toLowerCase().indexOf(mark.toLowerCase());
    if (at < 0) return escapeHtml(value);
    return escapeHtml(value.slice(0, at))
      + '<span class="studio-hl">' + escapeHtml(value.slice(at, at + mark.length)) + '</span>'
      + escapeHtml(value.slice(at + mark.length));
  }
  function paintField(field, phrase) {
    field.innerHTML = highlightHtml(field.textContent, phrase);
  }
  function rowById(rowId) {
    return rows.filter(function (item) { return String(item.id) === String(rowId); })[0];
  }
  function markSelection(editor, rowId) {
    var row = rowById(rowId);
    if (!row) return;
    var sel = window.getSelection();
    var chosen = '';
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      var range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) chosen = sel.toString().trim();
    }
    var plain = editor.textContent || '';
    var at = chosen ? plain.toLowerCase().indexOf(chosen.toLowerCase()) : -1;
    if (!chosen || at < 0) {
      say('Select the English words in this example, then press Highlight this.');
      return;
    }
    chosen = plain.slice(at, at + chosen.length);
    row.highlight = chosen;
    var tr = editor.closest('tr');
    var english = tr.querySelectorAll('[data-field="ex_en"], [data-field="adv_en"]');
    var missing = 0;
    english.forEach(function (field) {
      paintField(field, chosen);
      if ((field.textContent || '').toLowerCase().indexOf(chosen.toLowerCase()) < 0) missing += 1;
    });
    say(missing
      ? 'Highlight saved. The other example does not contain these words.'
      : 'Highlight saved. Both examples show it. Publish to update the unit page.');
  }
  function edit(name, value) {
    var field = document.createElement('div');
    field.className = 'studio-edit';
    field.contentEditable = 'true';
    field.spellcheck = true;
    field.dataset.field = name;
    field.textContent = cellText(value);
    field.addEventListener('paste', plainPaste);
    return field;
  }
  function box(name, value) {
    var cell = document.createElement('td');
    cell.appendChild(edit(name, value));
    return cell;
  }
  function pairCell(topName, bottomName, row) {
    var cell = document.createElement('td');
    cell.className = 'studio-pair';
    var top = edit(topName, row[topName]);
    var bottom = edit(bottomName, row[bottomName]);
    cell.appendChild(top);
    if (topName === 'ex_en' || topName === 'adv_en') {
      paintField(top, row.highlight);
      top.addEventListener('blur', function () {
        var current = rowById(row.id);
        paintField(top, current && current.highlight);
      });
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'studio-mark';
      button.textContent = 'Highlight this';
      button.addEventListener('mousedown', function (event) { event.preventDefault(); });
      button.addEventListener('click', function () { markSelection(top, row.id); });
      cell.appendChild(button);
    }
    cell.appendChild(bottom);
    return cell;
  }
  function photoSrc(path) {
    var value = cellText(path).trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    value = value.replace(/^(\.\.\/)+/, '');
    if (value.indexOf('/') >= 0) return value;
    return place().unit + '/' + value.replace(/^\.\//, '');
  }
  function paintPhoto(cell) {
    var img = cell.querySelector('img');
    var path = cell.querySelector('[data-field="img"]').textContent;
    var src = photoSrc(path);
    img.hidden = !src;
    if (src) img.src = src;
  }
  function uploadPhoto(file, rowId, cell) {
    var ext = ((file.name || '').split('.').pop() || '').toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (!/^(jpg|png|gif|webp)$/.test(ext)) {
      say('Use a jpg, png, gif, or webp photo.');
      return;
    }
    var path = 'cards/' + rowId + '/' + Date.now() + '.' + ext;
    say('Uploading photo…');
    client.storage.from('lesson-media').upload(path, file, {
      contentType: file.type || 'image/' + (ext === 'jpg' ? 'jpeg' : ext),
      upsert: false
    }).then(function (result) {
      if (result.error) { say(result.error.message); return; }
      var pub = client.storage.from('lesson-media').getPublicUrl(path);
      var url = pub && pub.data && pub.data.publicUrl;
      if (!url) { say('The photo uploaded, but the address was missing.'); return; }
      cell.querySelector('[data-field="img"]').textContent = url;
      paintPhoto(cell);
      say('Photo is in this row. Publish to show it on the site.');
    });
  }
  function photoCell(row) {
    var cell = document.createElement('td');
    cell.className = 'studio-photo-cell';
    var img = document.createElement('img');
    img.alt = '';
    img.className = 'studio-thumb';
    var path = document.createElement('div');
    path.className = 'studio-edit';
    path.contentEditable = 'true';
    path.spellcheck = false;
    path.dataset.field = 'img';
    path.textContent = cellText(row.img);
    path.addEventListener('paste', plainPaste);
    path.addEventListener('input', function () { paintPhoto(cell); });
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-upload';
    button.textContent = 'Change photo';
    var picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/jpeg,image/png,image/gif,image/webp';
    picker.hidden = true;
    button.addEventListener('click', function () { picker.click(); });
    picker.addEventListener('change', function () {
      var file = picker.files && picker.files[0];
      picker.value = '';
      if (file) uploadPhoto(file, row.id, cell);
    });
    cell.appendChild(img);
    cell.appendChild(path);
    cell.appendChild(button);
    cell.appendChild(picker);
    paintPhoto(cell);
    return cell;
  }
  function revisionColumns(here) {
    var grammar = here.kind === 'grammar';
    var columns = [
      { col: 'col-num', label: '#' },
      { col: 'col-photo', label: 'Photo' },
      { col: 'col-text', label: 'English' },
      { col: 'col-text', label: '中文' },
      { col: 'col-text', label: 'Part of speech' },
      { col: grammar ? 'col-pattern' : 'col-text', label: grammar ? 'Pattern' : 'Syllables' }
    ];
    if (grammar) columns.push({ col: 'col-note', label: 'Note' });
    columns.push(
      { col: 'col-pair', label: 'Example<br>例句' },
      { col: 'col-pair', label: 'Advanced<br>進階例句' },
      { col: 'col-state', label: 'State' },
      { col: 'col-actions', label: '' }
    );
    return { shape: grammar ? 'grammar' : 'revision', columns: columns };
  }
  function practiceColumns(here) {
    var mode = here.mode;
    if (mode === 'letters') {
      return {
        shape: 'spell',
        kind: 'letters',
        columns: [
          { col: 'col-num', label: '#' },
          { col: 'col-pair', label: 'Easy' },
          { col: 'col-pair', label: 'Hard (chosen at random from these letters)' },
          { col: 'col-state', label: 'State' },
          { col: 'col-actions', label: '' }
        ]
      };
    }
    if (mode === 'match') {
      return {
        shape: 'spell',
        kind: 'match',
        columns: [
          { col: 'col-num', label: '#' },
          { col: 'col-pair', label: 'English' },
          { col: 'col-pair', label: 'Picture' },
          { col: 'col-state', label: 'State' },
          { col: 'col-actions', label: '' }
        ]
      };
    }
    if (mode === 'fill' && here.kind !== 'grammar') {
      return {
        shape: 'fill',
        kind: 'pair',
        columns: [
          { col: 'col-num', label: '#' },
          { col: 'col-pair', label: 'Easy' },
          { col: 'col-pair', label: 'Hard' },
          { col: 'col-options', label: 'Options' },
          { col: 'col-state', label: 'State' },
          { col: 'col-actions', label: '' }
        ]
      };
    }
    if (here.kind === 'grammar') {
      return {
        shape: 'passage',
        kind: 'grammar',
        fields: ['prompt', 'answer', 'explain', 'options'],
        columns: [
          { col: 'col-num', label: '#' },
          { col: 'col-passage', label: 'Prompt' },
          { col: 'col-short', label: 'Answer' },
          { col: 'col-explain', label: 'Explain' },
          { col: 'col-options', label: 'Options' },
          { col: 'col-hard', label: 'Hard' },
          { col: 'col-state', label: 'State' },
          { col: 'col-actions', label: '' }
        ]
      };
    }
    return {
      shape: 'fill',
      kind: 'plain',
      fields: ['prompt', 'answer', 'explain', 'options'],
      columns: [
        { col: 'col-num', label: '#' },
        { col: 'col-prompt', label: 'Prompt' },
        { col: 'col-answer', label: 'Answer' },
        { col: 'col-explain', label: 'Explain' },
        { col: 'col-options', label: 'Options' },
        { col: 'col-state', label: 'State' },
        { col: 'col-actions', label: '' }
      ]
    };
  }
  function setColumns(shape, columns) {
    var table = $('studio-table');
    table.dataset.shape = shape;
    var group = table.querySelector('colgroup');
    group.replaceChildren();
    columns.forEach(function (column) {
      var col = document.createElement('col');
      col.className = column.col;
      group.appendChild(col);
    });
    var row = document.createElement('tr');
    columns.forEach(function (column) {
      var cell = document.createElement('th');
      cell.innerHTML = column.label;
      row.appendChild(cell);
    });
    $('studio-head').replaceChildren(row);
  }
  function shownRows() {
    var review = place().review;
    if (review === 'draft') return rows.filter(function (row) { return row.status !== 'published'; });
    if (review === 'published') return rows.filter(function (row) { return row.status === 'published'; });
    return rows.slice();
  }
  function reviewLine() {
    var drafts = rows.filter(function (row) { return row.status !== 'published'; }).length;
    if (!drafts) return '';
    return drafts === 1
      ? '1 draft is waiting for a person to check.'
      : drafts + ' drafts are waiting for a person to check.';
  }
  function zipFill(list) {
    var map = {};
    (list || []).forEach(function (row) {
      var key = String(row.n);
      if (!map[key]) map[key] = { id: row.id, n: row.n, status: row.status, easy: null, hard: null };
      if (row.level_name === 'hard') map[key].hard = row;
      else {
        map[key].easy = row;
        map[key].id = row.id;
        map[key].status = row.status;
      }
    });
    return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) {
      return Number(a.n) - Number(b.n);
    });
  }
  function paintBlank(field, sentence, answer, blank) {
    var parts = window.StudioDraft.fillParts(sentence, answer, blank);
    field.innerHTML = '';
    field.appendChild(document.createTextNode(parts.before));
    var mark = document.createElement('span');
    mark.className = 'studio-hl';
    mark.textContent = parts.missing;
    field.appendChild(mark);
    field.appendChild(document.createTextNode(parts.after));
  }
  function readBlankField(field) {
    var answer = '';
    var sentence = '';
    function walk(node) {
      if (node.nodeType === 3) { sentence += node.textContent; return; }
      if (node.nodeType !== 1) return;
      if (node.classList && node.classList.contains('studio-hl')) {
        answer += node.textContent;
        sentence += '______';
        return;
      }
      Array.prototype.forEach.call(node.childNodes, walk);
    }
    walk(field);
    return {
      sentence: cellText(sentence).trim(),
      answer: cellText(answer).trim()
    };
  }
  function markBlank(field) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed || !field.contains(sel.anchorNode)) {
      say('Select the missing words in this sentence, then press Highlight this.');
      return;
    }
    field.querySelectorAll('.studio-hl').forEach(function (span) {
      span.replaceWith(document.createTextNode(span.textContent));
    });
    field.normalize();
    var range = sel.getRangeAt(0);
    if (!field.contains(range.commonAncestorContainer)) {
      say('Select the missing words in this sentence, then press Highlight this.');
      return;
    }
    var mark = document.createElement('span');
    mark.className = 'studio-hl';
    try { range.surroundContents(mark); }
    catch (error) {
      say('Select the missing words inside one part of the sentence.');
    }
  }
  function fillSideCell(side, row) {
    var cell = document.createElement('td');
    cell.className = 'studio-pair';
    var sentence = document.createElement('div');
    sentence.className = 'studio-edit';
    sentence.contentEditable = 'true';
    sentence.spellcheck = true;
    sentence.dataset.side = side;
    var blank = row && row.extra && row.extra.blank;
    paintBlank(sentence, (row && (row.extra && row.extra.sentence || row.prompt)) || '', (row && row.answer) || '', blank);
    sentence.addEventListener('paste', plainPaste);
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-mark';
    button.textContent = 'Highlight this';
    button.addEventListener('mousedown', function (event) { event.preventDefault(); });
    button.addEventListener('click', function () { markBlank(sentence); });
    var explain = edit(side + '_explain', row && row.explain);
    cell.appendChild(sentence);
    cell.appendChild(button);
    cell.appendChild(explain);
    return cell;
  }
  function hardCell(row) {
    var cell = document.createElement('td');
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.field = 'hard';
    input.checked = !!(row && row.extra && row.extra.item && row.extra.item.hard);
    cell.appendChild(input);
    return cell;
  }
  function paintMasked(field, phrase, which) {
    var hide = window.StudioDraft.letterMasks(phrase)[which] || {};
    var word = String(phrase || '');
    field.innerHTML = '';
    for (var i = 0; i < word.length; i += 1) {
      var ch = word.charAt(i);
      if (!hide[i]) {
        field.appendChild(document.createTextNode(ch));
        continue;
      }
      var mark = document.createElement('span');
      mark.className = 'studio-hl';
      mark.textContent = ch;
      field.appendChild(mark);
    }
  }
  function syncMasked(field) {
    var text = cellText(field.textContent);
    var row = field.closest('tr');
    row.querySelectorAll('[data-mask]').forEach(function (other) {
      paintMasked(other, text, other.dataset.mask);
    });
  }
  function lettersCell(phrase, which) {
    var cell = document.createElement('td');
    var field = document.createElement('div');
    field.className = 'studio-edit';
    field.contentEditable = 'true';
    field.spellcheck = true;
    field.dataset.mask = which;
    if (which === 'easy') field.dataset.field = 'prompt';
    paintMasked(field, phrase, which);
    field.addEventListener('paste', plainPaste);
    field.addEventListener('blur', function () { syncMasked(field); });
    cell.appendChild(field);
    return cell;
  }
  function matchPictureCell(row) {
    var cell = document.createElement('td');
    cell.className = 'studio-pair';
    var img = document.createElement('img');
    img.className = 'studio-thumb';
    img.alt = '';
    var path = edit('img', row.extra && row.extra.img);
    path.addEventListener('input', function () {
      var src = photoSrc(path.textContent);
      img.hidden = !src;
      if (src) img.src = src;
    });
    var src = photoSrc(row.extra && row.extra.img);
    img.hidden = !src;
    if (src) img.src = src;
    cell.appendChild(img);
    cell.appendChild(path);
    cell.appendChild(edit('answer', row.answer));
    return cell;
  }
  function renderFillPair(row) {
    var tr = document.createElement('tr');
    tr.dataset.pair = 'fill';
    tr.dataset.id = String((row.easy && row.easy.id) || (row.hard && row.hard.id) || '');
    if (row.easy && row.easy.id) tr.dataset.easyId = String(row.easy.id);
    if (row.hard && row.hard.id) tr.dataset.hardId = String(row.hard.id);
    if (row.status !== 'published') tr.classList.add('is-draft');
    var number = document.createElement('td');
    number.className = 'is-num';
    number.textContent = String(row.n);
    tr.appendChild(number);
    tr.appendChild(fillSideCell('easy', row.easy));
    tr.appendChild(fillSideCell('hard', row.hard));
    tr.appendChild(box('options', row.easy && row.easy.options));
    tr.appendChild(stateCell(row));
    tr.appendChild(actionCell(tr));
    return tr;
  }
  function renderPractice() {
    var spec = practiceColumns(place());
    setColumns(spec.shape, spec.columns);
    var body = $('studio-rows');
    body.replaceChildren();
    shownRows().forEach(function (row) {
      if (spec.kind === 'pair') {
        body.appendChild(renderFillPair(row));
        return;
      }
      if (spec.kind === 'letters' || spec.kind === 'match') {
        var shaped = document.createElement('tr');
        shaped.dataset.id = String(row.id);
        if (row.status !== 'published') shaped.classList.add('is-draft');
        var shapedNumber = document.createElement('td');
        shapedNumber.className = 'is-num';
        shapedNumber.textContent = String(row.n);
        shaped.appendChild(shapedNumber);
        if (spec.kind === 'letters') {
          var phrase = row.prompt || row.answer || '';
          shaped.appendChild(lettersCell(phrase, 'easy'));
          shaped.appendChild(lettersCell(phrase, 'hard'));
        } else {
          shaped.appendChild(box('prompt', row.prompt));
          shaped.appendChild(matchPictureCell(row));
        }
        shaped.appendChild(stateCell(row));
        shaped.appendChild(actionCell(shaped));
        body.appendChild(shaped);
        return;
      }
      var tr = document.createElement('tr');
      tr.dataset.id = String(row.id);
      if (row.status !== 'published') tr.classList.add('is-draft');
      var number = document.createElement('td');
      number.className = 'is-num';
      number.textContent = String(row.n);
      tr.appendChild(number);
      spec.fields.forEach(function (name) {
        tr.appendChild(box(name, row[name]));
      });
      if (spec.kind === 'grammar') tr.appendChild(hardCell(row));
      tr.appendChild(stateCell(row));
      tr.appendChild(actionCell(tr));
      body.appendChild(tr);
    });
    paintEmpty();
  }
  function stateCell(row) {
    var state = document.createElement('td');
    state.className = 'is-state';
    state.textContent = row.status === 'published' ? 'Published' : 'Draft';
    return state;
  }
  function actionCell(tr) {
    var actions = document.createElement('td');
    actions.className = 'is-actions';
    var stack = document.createElement('div');
    stack.className = 'studio-actions';
    var save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Save draft';
    save.addEventListener('click', function () { store(tr, 'draft'); });
    var publish = document.createElement('button');
    publish.type = 'button';
    publish.textContent = 'Publish';
    publish.addEventListener('click', function () { requestStore(tr, 'published'); });
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'studio-remove';
    remove.textContent = 'Remove';
    remove.addEventListener('click', function () { removeRow(tr); });
    stack.appendChild(save);
    stack.appendChild(publish);
    stack.appendChild(remove);
    actions.appendChild(stack);
    return actions;
  }
  function render() {
    if (tableName === 'practice_items') {
      renderPractice();
      return;
    }
    var here = place();
    var spec = revisionColumns(here);
    setColumns(spec.shape, spec.columns);
    var body = $('studio-rows');
    body.replaceChildren();
    var fields = ['en', 'zh', 'pos', here.kind === 'grammar' ? 'pattern' : 'syllables'];
    if (here.kind === 'grammar') fields.push('note_zh');
    shownRows().forEach(function (row) {
      var tr = document.createElement('tr');
      tr.dataset.id = String(row.id);
      if (row.status !== 'published') tr.classList.add('is-draft');
      var number = document.createElement('td');
      number.className = 'is-num';
      number.textContent = String(row.n);
      tr.appendChild(number);
      tr.appendChild(photoCell(row));
      fields.forEach(function (name) {
        tr.appendChild(box(name, row[name]));
      });
      PAIRS.forEach(function (pair) {
        tr.appendChild(pairCell(pair[0], pair[1], row));
      });
      tr.appendChild(stateCell(row));
      tr.appendChild(actionCell(tr));
      body.appendChild(tr);
    });
    paintEmpty();
  }
  function paintEmpty() {
    var visible = shownRows().length;
    var empty = $('studio-empty');
    empty.hidden = visible > 0;
    if (visible) return;
    var review = place().review;
    empty.textContent = review === 'draft'
      ? 'No drafts waiting in this list.'
      : (review === 'published' ? 'Nothing in this list is published yet.' : 'No rows in this list yet. New draft starts one.');
  }

  function readRow(tr) {
    var data = {};
    tr.querySelectorAll('[data-field]').forEach(function (field) {
      data[field.dataset.field] = field.type === 'checkbox' ? field.checked : cellText(field.textContent).trim();
    });
    var row = rows.filter(function (item) { return String(item.id) === tr.dataset.id; })[0];
    data.audio = row && row.audio ? row.audio : '';
    data.video = row && row.video ? row.video : '';
    data.highlight = row && row.highlight ? row.highlight : '';
    if (tableName === 'practice_items') {
      ['prompt', 'answer', 'explain', 'options'].forEach(function (name) {
        if (!Object.prototype.hasOwnProperty.call(data, name)) data[name] = row && row[name] ? row[name] : '';
      });
      data.level_name = (row && row.level_name) || window.StudioDraft.difficulty(place());
    }
    return data;
  }
  function requestStore(tr, status) {
    var firstPublish = status === 'published' && !rows.some(function (item) {
      return item.status === 'published' && String(item.id) !== tr.dataset.id;
    });
    if (firstPublish && !window.confirm('Publishing replaces what students see for this list. Other drafts stay off the site. Publish this row?')) return;
    store(tr, status);
  }
  function store(tr, status) {
    if (!window.StudioDraft) { say('The draft script did not load.'); return; }
    if (tr.dataset.pair === 'fill') { storeFill(tr, status); return; }
    var data = readRow(tr);
    var row = rows.filter(function (item) { return String(item.id) === tr.dataset.id; })[0];
    var wasPublished = row && row.status === 'published';
    var extra = row && row.extra;
    if (tableName === 'practice_items' && place().kind === 'grammar') {
      extra = Object.assign({}, extra || {});
      extra.item = Object.assign({}, extra.item || {}, { hard: data.hard === true });
      extra.set = Number(place().set) || extra.set || 1;
    }
    if (tableName === 'practice_items' && place().mode === 'letters' && data.prompt) data.answer = data.prompt;
    if (tableName === 'practice_items' && place().mode === 'match') {
      extra = Object.assign({}, extra || {});
      if (data.img != null) extra.img = data.img;
      extra.en = data.prompt || extra.en || '';
      extra.zh = data.answer || extra.zh || '';
    }
    var patch = tableName === 'practice_items'
      ? window.StudioDraft.practicePatch(data, extra, status)
      : window.StudioDraft.revisionPatch(data, status, row && row.published);
    say('Saving…');
    client.from(tableName).update(patch).eq('id', Number(tr.dataset.id)).select('id,status').then(function (result) {
      if (result.error) { say(result.error.message); return; }
      var saved = rows.filter(function (item) { return String(item.id) === tr.dataset.id; })[0];
      if (saved) {
        Object.assign(saved, data);
        saved.status = status;
        if (status === 'published') saved.published = patch.published;
      }
      tr.classList.toggle('is-draft', status !== 'published');
      tr.querySelector('.is-state').textContent = status === 'published' ? 'Published' : 'Draft';
      if (status === 'published') say('Published. Students see it after a refresh.');
      else if (wasPublished) say('Saved as a draft. Students no longer see this row until you publish it.');
      else say('Draft saved. Students do not see it yet.');
    });
  }

  function storeFill(tr, status) {
    var optionsField = tr.querySelector('[data-field="options"]');
    var options = optionsField ? cellText(optionsField.textContent).trim() : '';
    var number = Number(tr.querySelector('.is-num').textContent);
    var pair = rows.filter(function (item) { return Number(item.n) === number; })[0] || {};
    var pending = 2;
    function done(error) {
      if (error) { say(error); return; }
      pending -= 1;
      if (pending > 0) return;
      load(status === 'published' ? 'Published. Students see it after a refresh.' : 'Draft saved. Students do not see it yet.');
    }
    ['easy', 'hard'].forEach(function (side) {
      var field = tr.querySelector('[data-side="' + side + '"]');
      var blank = readBlankField(field);
      var explainField = tr.querySelector('[data-field="' + side + '_explain"]');
      var sideRow = pair[side];
      var data = {
        prompt: blank.sentence,
        answer: blank.answer,
        explain: explainField ? cellText(explainField.textContent).trim() : '',
        options: side === 'easy' ? options : ((sideRow && sideRow.options) || ''),
        level_name: side
      };
      var patch = window.StudioDraft.practicePatch(data, sideRow && sideRow.extra, status);
      var id = tr.dataset[side + 'Id'];
      if (!id) {
        var insert = window.StudioDraft.practiceInsert(Object.assign({}, place(), { difficulty: side }), number);
        Object.assign(insert, patch);
        client.from(tableName).insert(insert).select('id').then(function (result) {
          done(result.error && result.error.message);
        });
        return;
      }
      client.from(tableName).update(patch).eq('id', Number(id)).then(function (result) {
        done(result.error && result.error.message);
      });
    });
  }
  function load(doneMessage) {
    var here = place();
    var practice = here.section === 'practice';
    tableName = practice ? 'practice_items' : 'lesson_cards';
    say('Loading…');
    var query = client.from(tableName).select(practice
      ? 'id,n,status,prompt,answer,explain,options,level_name,extra'
      : 'id,n,status,en,zh,pos,syllables,pattern,note_zh,highlight,ex_en,ex_zh,adv_en,adv_zh,img,audio,video,published')
      .eq('book', here.book).eq('series', here.series).eq('term', here.term)
      .eq('level', here.level).eq('track', here.kind);
    if (practice) {
      query = query.eq('unit_id', window.StudioDraft.unitId(here)).eq('mode', here.mode);
      if (here.kind === 'grammar') query = query.eq('set_no', Number(here.set) || 1);
      else if (here.mode !== 'fill') query = query.eq('level_name', window.StudioDraft.difficulty(here));
    } else query = query.eq('unit_id', here.unit);
    query.order('n', { ascending: true })
      .then(function (result) {
        if (result.error) { say(result.error.message); return; }
        rows = result.data || [];
        if (practice && here.mode === 'fill' && here.kind !== 'grammar') rows = zipFill(rows);
        render();
        say(doneMessage || reviewLine());
      });
  }
  function sameList(table) {
    var here = place();
    var practice = here.section === 'practice';
    var query = client.from(table).select(here.mode === 'fill' ? 'id,n,level_name' : 'id,n')
      .eq('book', here.book).eq('series', here.series).eq('term', here.term).eq('level', here.level);
    if (practice) {
      query = query.eq('unit_id', window.StudioDraft.unitId(here)).eq('track', here.kind).eq('mode', here.mode);
      if (here.kind === 'grammar') query = query.eq('set_no', Number(here.set) || 1);
      else if (here.mode !== 'fill') query = query.eq('level_name', window.StudioDraft.difficulty(here));
    } else {
      query = query.eq('unit_id', here.unit).eq('track', here.kind === 'grammar' ? 'grammar' : 'vocab');
    }
    return query.order('n', { ascending: true });
  }
  function writeNumbers(changes, index) {
    if (!changes.length || index >= changes.length) {
      load('Removed. Numbers in this list now start at 1.');
      return;
    }
    client.from(tableName).update({ n: changes[index].n }).eq('id', changes[index].id).then(function (result) {
      if (result.error) { say(result.error.message); return; }
      writeNumbers(changes, index + 1);
    });
  }
  function deleteIds(ids, done) {
    if (!ids.length) { done(); return; }
    client.from(tableName).delete().eq('id', ids[0]).then(function (result) {
      if (result.error) { say(result.error.message); return; }
      deleteIds(ids.slice(1), done);
    });
  }
  function removeRow(tr) {
    var number = tr.querySelector('.is-num').textContent;
    var row = rows.filter(function (item) { return String(item.id) === tr.dataset.id || String(item.n) === number; })[0];
    var published = row && row.status === 'published';
    var message = published
      ? 'Remove ' + number + '? Students will not see it after a refresh. The photo and audio stay.'
      : 'Remove draft ' + number + '?';
    if (!window.confirm(message)) return;
    var ids = tr.dataset.pair === 'fill'
      ? [tr.dataset.easyId, tr.dataset.hardId].filter(Boolean).map(Number)
      : [Number(tr.dataset.id)];
    say('Removing…');
    deleteIds(ids, function () {
      sameList(tableName).then(function (listed) {
        if (listed.error) { say(listed.error.message); return; }
        var data = listed.data || [];
        var changes = place().mode === 'fill' && place().kind !== 'grammar'
          ? window.StudioDraft.compactNumbers(data.filter(function (item) { return item.level_name !== 'hard'; }))
            .concat(window.StudioDraft.compactNumbers(data.filter(function (item) { return item.level_name === 'hard'; })))
          : window.StudioDraft.compactNumbers(data);
        writeNumbers(changes, 0);
      });
    });
  }
  function createDraft() {
    if (!window.StudioDraft) { say('The draft script did not load.'); return; }
    var here = place();
    var practice = here.section === 'practice';
    var table = practice ? 'practice_items' : 'lesson_cards';
    say('Adding a draft…');
    var numbers = client.from(table).select('n')
      .eq('book', here.book).eq('series', here.series).eq('term', here.term).eq('level', here.level);
    if (practice) {
      numbers = numbers.eq('unit_id', window.StudioDraft.unitId(here)).eq('track', here.kind).eq('mode', here.mode);
      if (here.kind === 'grammar') numbers = numbers.eq('set_no', Number(here.set) || 1);
      else if (here.mode !== 'fill') numbers = numbers.eq('level_name', window.StudioDraft.difficulty(here));
      else numbers = numbers.eq('level_name', 'easy');
    } else {
      numbers = numbers.eq('unit_id', here.unit).eq('track', here.kind === 'grammar' ? 'grammar' : 'vocab');
    }
    numbers.then(function (result) {
      if (result.error) { say(result.error.message); return; }
      var n = window.StudioDraft.nextNumber(here, (result.data || []).map(function (item) { return item.n; }));
      if ($('filter-review').value === 'published') $('filter-review').value = 'all';
      var row = practice ? window.StudioDraft.practiceInsert(here, n) : window.StudioDraft.revisionInsert(here, n);
      var batch = [row];
      if (practice && here.mode === 'fill' && here.kind !== 'grammar') {
        batch.push(window.StudioDraft.practiceInsert(Object.assign({}, here, { difficulty: 'hard' }), n));
      }
      client.from(table).insert(batch).select('id').then(function (inserted) {
        if (inserted.error) { say(inserted.error.message); return; }
        load('Draft ' + n + ' added. Students do not see it until you publish.');
      });
    });
  }

  function safeReturn(value) {
    var from = String(value || '');
    if (!from || from.indexOf('studio') !== -1) return 'index.html';
    if (from.indexOf('..') !== -1 || from.indexOf('//') !== -1 || from.indexOf('\\') !== -1) return 'index.html';
    if (!/^[a-z0-9./_?#&=%-]+$/i.test(from)) return 'index.html';
    return from;
  }
  function wireBack() {
    var from = '';
    try { from = sessionStorage.getItem('revision-studio-from') || ''; } catch (e) {}
    var link = $('studio-back');
    if (link) link.setAttribute('href', safeReturn(from));
  }

  function bindEditor() {
    fillSelect($('filter-book'), BOOKS, 'oxford');
    syncSeries();
    fillSelect($('filter-term'), TERMS, 'first');
    LEVELS.forEach(function (id) {
      var option = document.createElement('option');
      option.value = id;
      option.textContent = id.toUpperCase();
      if (id === 'p6') option.selected = true;
      $('filter-level').appendChild(option);
    });
    fillSelect($('filter-unit'), UNITS, 'unit1');
    syncMode();
    ['filter-book', 'filter-series', 'filter-term', 'filter-level', 'filter-unit', 'filter-section', 'filter-kind', 'filter-mode', 'filter-difficulty', 'filter-set'].forEach(function (id) {
      $(id).addEventListener('change', function () {
        if (id === 'filter-book') syncSeries();
        if (id === 'filter-section' || id === 'filter-kind' || id === 'filter-mode') syncMode();
        load();
      });
    });
    $('filter-review').addEventListener('change', function () {
      render();
      say(reviewLine());
    });
    $('studio-new').addEventListener('click', createDraft);
    load();
  }
  function boot(deps) {
    wireBack();
    if (deps && deps.client) {
      client = deps.client;
      bindEditor();
      return;
    }
    var cfg = window.SUPABASE_PUBLIC || {};
    if (!window.supabase || !cfg.url || !cfg.key) { say('The database script did not load.'); return; }
    client = window.supabase.createClient(cfg.url, cfg.key, {
      auth: { storageKey: 'p6-sb-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    client.auth.getSession().then(function (result) {
      if (!result.data.session) {
        window.location.replace('account.html?next=' + encodeURIComponent('studio.html'));
        return;
      }
      client.rpc('is_content_editor').then(function (check) {
        if (check.error || check.data !== true) {
          say('This account cannot edit lessons.');
          return;
        }
        bindEditor();
      });
    });
  }
  window.RevisionStudio = { boot: boot };
  if (!window.STUDIO_TEST) boot();
})();
