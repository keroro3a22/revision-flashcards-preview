/* People and agents add a draft here first. A person checks it. Publish is what students read. */
(function () {
  var BOOKS = [
    { id: 'oxford', label: 'Oxford' },
    { id: 'longman', label: 'Longman' }
  ];
  var SERIES = {
    oxford: [{ id: 'oxford', label: 'Living Oxford English' }],
    longman: [
      { id: 'mypearson-express', label: 'Primary Longman Express' },
      { id: 'elect', label: 'Primary Longman Elect' }
    ]
  };
  var TERMS = [
    { id: 'first', label: 'Book A' },
    { id: 'second', label: 'Book B' }
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
  var pendingFocus = '';

  function $(id) { return document.getElementById(id); }
  function say(text) {
    var note = $('studio-note');
    note.hidden = !text;
    note.textContent = text || '';
  }
  function place() {
    var draft = window.StudioDraft || window.RevisionStudioDraft;
    var raw = {
      book: $('filter-book').value,
      series: $('filter-series').value,
      term: $('filter-term').value,
      level: $('filter-level').value,
      unit: $('filter-unit').value,
      open: $('filter-section').value,
      part: $('filter-part') ? $('filter-part').value : '',
      site: $('filter-site') ? $('filter-site').value : '',
      source: $('filter-source') ? $('filter-source').value : '',
      kind: $('filter-kind').value,
      mode: $('filter-mode').value,
      difficulty: $('filter-difficulty').value,
      set: $('filter-set') ? $('filter-set').value : '1',
      review: $('filter-review').value
    };
    return draft && draft.studioPlace ? draft.studioPlace(raw) : raw;
  }
  function syncMode(preferredMode, preferredUnit) {
    var open = $('filter-section').value;
    var part = $('filter-part') ? $('filter-part').value : 'revision';
    var source = $('filter-source') ? $('filter-source').value : 'unit';
    var kind = $('filter-kind').value === 'grammar' ? 'grammar' : 'vocab';
    if (open === 'unit' && part === 'practice' && source === 'boss') kind = 'grammar';
    if (open === 'unit' && part === 'practice' && source === 'mixed') kind = 'vocab';
    $('filter-kind').value = kind;
    var modes = MODES[kind].filter(function (item) { return item.id !== 'boss'; });
    var current = preferredMode || $('filter-mode').value;
    if (source === 'boss') current = 'boss';
    else if (!modes.some(function (item) { return item.id === current; })) current = modes[0].id;
    fillSelect($('filter-mode'), source === 'boss' ? [{ id: 'boss', label: 'Boss' }] : modes, current);
    var practice = open === 'unit' && part === 'practice';
    var sources = kind === 'grammar'
      ? [{ id: 'unit', label: 'This unit' }, { id: 'boss', label: 'Boss round' }]
      : [{ id: 'unit', label: 'This unit' }, { id: 'mixed', label: 'Mixed topic' }];
    if ($('filter-source')) {
      if (!sources.some(function (item) { return item.id === source; })) source = sources[0].id;
      fillSelect($('filter-source'), sources, source);
    }
    ['filter-book', 'filter-series', 'filter-term', 'filter-level'].forEach(function (id) {
      var node = $(id);
      if (node && node.parentElement) node.parentElement.hidden = open === 'site';
    });
    if ($('filter-part-label')) $('filter-part-label').hidden = open !== 'unit';
    if ($('filter-site-label')) $('filter-site-label').hidden = open !== 'site';
    if ($('filter-source-label')) $('filter-source-label').hidden = !practice;
    if ($('filter-review') && $('filter-review').parentElement) $('filter-review').parentElement.hidden = open === 'site';
    var lesson = open === 'unit' && part !== 'doors';
    $('filter-kind').parentElement.hidden = !lesson || (practice && source !== 'unit');
    $('filter-mode-label').hidden = !practice || source === 'boss';
    $('filter-difficulty-label').hidden = true;
    var sentenceFill = practice && source !== 'boss' && $('filter-mode').value === 'fill';
    $('filter-set-label').hidden = !practice || source === 'boss' || !(kind === 'grammar' || sentenceFill);
    $('filter-unit-label').hidden = open !== 'unit' || (part === 'practice' && source !== 'unit');
    if ($('studio-new')) $('studio-new').hidden = open === 'home' || open === 'site' || (open === 'unit' && part === 'doors');
    syncUnits(preferredUnit);
    syncPanels();
  }
  function syncUnits(preferred) {
    var units = UNITS.slice();
    var current = preferred || $('filter-unit').value;
    if (!units.some(function (item) { return item.id === current; })) current = 'unit1';
    fillSelect($('filter-unit'), units, current || 'unit1');
  }
  function syncPanels() {
    var here = place();
    var site = here.open === 'site';
    var scroll = document.querySelector('.studio-scroll');
    if (scroll) scroll.hidden = site;
    var badges = $('studio-badges');
    if (badges) badges.hidden = !(site && here.site === 'badges');
    var bar = $('letter-ignore');
    if (bar && !(site && here.site === 'ignore')) bar.hidden = true;
    if ($('studio-empty') && site) $('studio-empty').hidden = true;
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
  function syncSeries(preferred) {
    var book = $('filter-book').value;
    var current = preferred || $('filter-series').value;
    var items = SERIES[book] || SERIES.oxford;
    if (!items.some(function (item) { return item.id === current; })) current = items[0].id;
    fillSelect($('filter-series'), items, current);
  }
  function savedPlace() {
    try {
      return window.StudioDraft.readStudioPlace(window.localStorage);
    } catch (e) {
      return window.StudioDraft.readStudioPlace(null);
    }
  }
  function rememberPlace() {
    if (!window.StudioDraft) return;
    try { window.StudioDraft.writeStudioPlace(window.localStorage, place()); } catch (e) {}
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
    var marks = String(phrase || '').split(/\s*(?:\n|\|)\s*/).map(function (part) {
      return part.trim();
    }).filter(Boolean);
    if (!marks.length) return escapeHtml(value);
    marks.sort(function (a, b) { return b.length - a.length; });
    var lower = value.toLowerCase();
    var spans = [];
    marks.forEach(function (mark) {
      var needle = mark.toLowerCase();
      var from = 0;
      while (from <= lower.length - needle.length) {
        var at = lower.indexOf(needle, from);
        if (at < 0) break;
        var end = at + mark.length;
        var clash = spans.some(function (span) { return at < span.end && end > span.start; });
        if (!clash) spans.push({ start: at, end: end });
        from = at + Math.max(needle.length, 1);
      }
    });
    if (!spans.length) return escapeHtml(value);
    spans.sort(function (a, b) { return a.start - b.start; });
    var html = '';
    var cursor = 0;
    spans.forEach(function (span) {
      html += escapeHtml(value.slice(cursor, span.start));
      html += '<span class="studio-hl">' + escapeHtml(value.slice(span.start, span.end)) + '</span>';
      cursor = span.end;
    });
    return html + escapeHtml(value.slice(cursor));
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
    var side = editor.dataset.field === 'adv_en' ? 'adv' : 'example';
    var kept = window.StudioDraft.rememberSideHighlight(row, side, chosen);
    row.highlight = kept.highlight;
    row.highlight_adv = kept.highlight_adv;
    paintField(editor, chosen);
    say('Highlight saved for this sentence. Publish to update the unit page.');
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
  function fieldValue(field) {
    if (!field) return '';
    if (field.type === 'checkbox') return field.checked;
    if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') return cellText(field.value).trim();
    return cellText(field.textContent).trim();
  }
  function tagEditor(value, options) {
    options = options || {};
    var parse = options.parse || function (text) { return window.StudioDraft.optionList(text); };
    var join = options.join || function (list) { return window.StudioDraft.joinOptions(list); };
    var wrap = document.createElement('div');
    wrap.className = 'studio-tags';
    var hidden = document.createElement('input');
    hidden.type = 'hidden';
    if (options.field) hidden.dataset.field = options.field;
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'studio-tag-input';
    input.setAttribute('aria-label', options.label || 'Add option');
    input.autocomplete = 'off';
    input.spellcheck = true;
    var silent = false;
    function current() {
      return Array.prototype.map.call(wrap.querySelectorAll('[data-option]'), function (chip) {
        return chip.getAttribute('data-option');
      });
    }
    function sync() {
      var text = join(current());
      var changed = hidden.value !== text;
      hidden.value = text;
      if (!silent && changed && options.onChange) options.onChange(text);
    }
    function addOne(part) {
      if (!part || current().indexOf(part) >= 0) return;
      var chip = document.createElement('span');
      chip.className = 'studio-tag';
      chip.setAttribute('data-option', part);
      var label = document.createElement('span');
      label.textContent = part;
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'studio-tag-x';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Remove ' + part);
      remove.addEventListener('click', function () {
        chip.remove();
        sync();
        input.focus();
      });
      chip.appendChild(label);
      chip.appendChild(remove);
      wrap.insertBefore(chip, input);
    }
    function commit() {
      parse(input.value).forEach(addOne);
      input.value = '';
      sync();
    }
    function setValue(next) {
      silent = true;
      wrap.querySelectorAll('[data-option]').forEach(function (chip) { chip.remove(); });
      parse(next).forEach(addOne);
      sync();
      silent = false;
    }
    wrap.appendChild(input);
    wrap.appendChild(hidden);
    setValue(value);
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
      } else if (event.key === 'Backspace' && !input.value) {
        var chips = wrap.querySelectorAll('[data-option]');
        var last = chips[chips.length - 1];
        if (last) {
          last.remove();
          sync();
        }
      }
    });
    input.addEventListener('paste', function (event) {
      var text = (event.clipboardData || window.clipboardData).getData('text/plain');
      if (!options.splitPaste && text.indexOf('|') === -1) return;
      event.preventDefault();
      parse(text).forEach(addOne);
      sync();
    });
    input.addEventListener('blur', commit);
    wrap._setValue = setValue;
    wrap._getValue = function () { return hidden.value; };
    return wrap;
  }
  function optionEditor(value) {
    return tagEditor(value, { field: 'options' });
  }
  function box(name, value) {
    var cell = document.createElement('td');
    cell.appendChild(name === 'options' ? optionEditor(value) : edit(name, value));
    return cell;
  }
  function pairCell(topName, bottomName, row) {
    var cell = document.createElement('td');
    cell.className = 'studio-pair';
    var top = edit(topName, row[topName]);
    var bottom = edit(bottomName, row[bottomName]);
    cell.appendChild(top);
    if (topName === 'ex_en' || topName === 'adv_en') {
      var phraseFor = topName === 'adv_en'
        ? window.StudioDraft.advancedHighlight
        : window.StudioDraft.exampleHighlight;
      paintField(top, phraseFor(row));
      top.addEventListener('blur', function () {
        var current = rowById(row.id);
        paintField(top, phraseFor(current));
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
  var studioAudio = null;
  var SPEAKER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z"/></svg>';
  function audioSrc(path) {
    var value = cellText(path).trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    value = value.replace(/^(\.\.\/)+/, '');
    var unit = place().unit;
    if (value.indexOf(unit + '/') === 0) return value;
    return unit + '/' + value.replace(/^\.\//, '');
  }
  function audioCell(row) {
    var cell = document.createElement('td');
    cell.className = 'studio-audio-cell';
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-audio';
    button.innerHTML = SPEAKER_SVG;
    var src = audioSrc(row && row.audio);
    button.disabled = !src;
    button.setAttribute('aria-label', src ? 'Play pronunciation' : 'No pronunciation');
    button.addEventListener('click', function () {
      if (!src) return;
      if (studioAudio && button.classList.contains('is-playing')) {
        studioAudio.pause();
        button.classList.remove('is-playing');
        studioAudio = null;
        return;
      }
      if (studioAudio) studioAudio.pause();
      document.querySelectorAll('.studio-audio.is-playing').forEach(function (el) { el.classList.remove('is-playing'); });
      var audio = new Audio(src);
      studioAudio = audio;
      button.classList.add('is-playing');
      audio.addEventListener('ended', function () {
        button.classList.remove('is-playing');
        if (studioAudio === audio) studioAudio = null;
      });
      audio.play().catch(function () {
        button.classList.remove('is-playing');
        say('The pronunciation could not play.');
      });
    });
    cell.appendChild(button);
    return cell;
  }
  function photoSrc(path) {
    if (window.StudioDraft && window.StudioDraft.mediaSrc) return window.StudioDraft.mediaSrc(cellText(path), place());
    var value = cellText(path).trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    value = value.replace(/^(\.\.\/)+/, '');
    if (value.indexOf('/') >= 0) return value;
    return place().unit + '/' + value.replace(/^\.\//, '');
  }
  function paintPhoto(cell) {
    var button = cell.querySelector('.studio-thumb-btn');
    var path = cell.querySelector('[data-field="img"]');
    if (button && button.update) {
      var hidden = cell.querySelector('[data-field="img_frame"]');
      var stored = null;
      if (hidden && hidden.value) {
        try { stored = JSON.parse(hidden.value); } catch (error) { stored = null; }
      }
      button.update(photoSrc(path ? path.textContent : ''), stored);
      return;
    }
    var img = cell.querySelector('img');
    if (!img) return;
    var src = photoSrc(path ? path.textContent : '');
    img.hidden = !src;
    if (src) img.src = src;
  }
  function libraryPlace() {
    var here = place();
    var unit = here.unit === 'home' || here.unit === 'mixed' ? '' : here.unit;
    return { book: here.book, series: here.series, term: here.term, level: here.level, unit: unit };
  }
  function chooseLibraryPhoto(done) {
    if (!window.RevisionStudioLibrary) { say('The library did not load.'); return; }
    window.RevisionStudioLibrary.open(client, { say: say, onPick: done, place: libraryPlace() });
  }
  var frameDialog = null;
  function shapeRatio(shape) {
    if (shape === 'match') return 1;
    if (shape === 'grammar' || shape === 'chat') return 320 / 220;
    return 1;
  }
  function ensureFrameDialog() {
    if (frameDialog) return frameDialog;
    var root = document.createElement('div');
    root.className = 'studio-frame';
    root.hidden = true;
    root.innerHTML = '<div class="studio-frame-card" role="dialog" aria-modal="true" aria-labelledby="studio-frame-title">'
      + '<p id="studio-frame-title" class="studio-frame-title">Live preview</p>'
      + '<p class="studio-frame-note">Drag inside the frame to move it. Drag an edge or a corner to resize it. The frame can be larger than the photo.</p>'
      + '<div class="studio-crop" data-crop>'
      + '<img alt="" draggable="false">'
      + '<div class="studio-crop-shade" data-shade="top"></div>'
      + '<div class="studio-crop-shade" data-shade="left"></div>'
      + '<div class="studio-crop-shade" data-shade="right"></div>'
      + '<div class="studio-crop-shade" data-shade="bottom"></div>'
      + '<div class="studio-crop-window" data-window>'
      + '<div class="studio-crop-grid" aria-hidden="true"></div>'
      + '<button type="button" class="studio-crop-edge" data-handle="n" aria-label="Resize from the top"></button>'
      + '<button type="button" class="studio-crop-edge" data-handle="e" aria-label="Resize from the right"></button>'
      + '<button type="button" class="studio-crop-edge" data-handle="s" aria-label="Resize from the bottom"></button>'
      + '<button type="button" class="studio-crop-edge" data-handle="w" aria-label="Resize from the left"></button>'
      + '<button type="button" class="studio-crop-corner" data-corner="nw" data-handle="nw" aria-label="Resize from the top left"></button>'
      + '<button type="button" class="studio-crop-corner" data-corner="ne" data-handle="ne" aria-label="Resize from the top right"></button>'
      + '<button type="button" class="studio-crop-corner" data-corner="sw" data-handle="sw" aria-label="Resize from the bottom left"></button>'
      + '<button type="button" class="studio-crop-corner" data-corner="se" data-handle="se" aria-label="Resize from the bottom right"></button>'
      + '</div></div>'
      + '<div class="studio-frame-bar"><label class="studio-color">Background <input type="color" data-color value="#ffffff" aria-label="Background color"></label><button type="button" class="studio-dropper" data-dropper aria-label="Pick a color from the photo"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3L15 6"/></svg></button><button type="button" data-reset>Reset</button><button type="button" data-done>Done</button></div>'
      + '</div>';
    document.body.appendChild(root);
    frameDialog = {
      root: root,
      crop: root.querySelector('[data-crop]'),
      img: root.querySelector('img'),
      window: root.querySelector('[data-window]'),
      shades: {
        top: root.querySelector('[data-shade="top"]'),
        left: root.querySelector('[data-shade="left"]'),
        right: root.querySelector('[data-shade="right"]'),
        bottom: root.querySelector('[data-shade="bottom"]')
      },
      color: root.querySelector('[data-color]'),
      dropper: root.querySelector('[data-dropper]')
    };
    frameDialog.img.draggable = false;
    frameDialog.img.addEventListener('dragstart', function (event) { event.preventDefault(); });
    frameDialog.crop.addEventListener('dragstart', function (event) { event.preventDefault(); });
    root.addEventListener('click', function (event) {
      if (event.target === root) root.hidden = true;
    });
    window.addEventListener('resize', function () {
      if (!root.hidden && frameDialog.place) frameDialog.place();
    });
    return frameDialog;
  }
  function openPhotoFrame(spec) {
    if (!window.ImgFrame || !spec.src) {
      say(spec.src ? 'The picture tools did not load.' : 'Add a photo before reframing it.');
      return;
    }
    var dialog = ensureFrameDialog();
    var ratio = Number(spec.ratio) > 0 ? Number(spec.ratio) : shapeRatio(spec.shape);
    var frame = window.ImgFrame.normalize(spec.frame);
    var drag = null;
    function place() {
      var imageW = dialog.img.naturalWidth;
      var imageH = dialog.img.naturalHeight;
      if (!imageW || !imageH) return;
      var base = Math.min(460 / imageW, 340 / imageH, 1);
      var viewW = imageW * base;
      var viewH = imageH * base;
      var box = window.ImgFrame.viewRect(frame, imageW, imageH, viewW, viewH, ratio);
      var margin = 16;
      var originX = Math.min(0, box.left) - margin;
      var originY = Math.min(0, box.top) - margin;
      var rawW = Math.max(viewW, box.left + box.width) - originX + margin;
      var rawH = Math.max(viewH, box.top + box.height) - originY + margin;
      var maxW = Math.min(560, window.innerWidth - 80);
      var maxH = Math.min(window.innerHeight * 0.62, 520);
      var fit = Math.min(1, maxW / rawW, maxH / rawH);
      dialog.crop.style.width = (rawW * fit) + 'px';
      dialog.crop.style.height = (rawH * fit) + 'px';
      dialog.crop.style.background = frame.bg;
      dialog.view = { w: viewW * fit, h: viewH * fit };
      var imgX = (0 - originX) * fit;
      var imgY = (0 - originY) * fit;
      var imgW = viewW * fit;
      var imgH = viewH * fit;
      dialog.img.style.left = imgX + 'px';
      dialog.img.style.top = imgY + 'px';
      dialog.img.style.width = imgW + 'px';
      dialog.img.style.height = imgH + 'px';
      var winX = (box.left - originX) * fit;
      var winY = (box.top - originY) * fit;
      var winW = box.width * fit;
      var winH = box.height * fit;
      var win = dialog.window;
      win.style.left = winX + 'px';
      win.style.top = winY + 'px';
      win.style.width = winW + 'px';
      win.style.height = winH + 'px';
      win.style.background = 'transparent';
      var clipL = Math.max(imgX, Math.min(imgX + imgW, winX));
      var clipT = Math.max(imgY, Math.min(imgY + imgH, winY));
      var clipR = Math.max(imgX, Math.min(imgX + imgW, winX + winW));
      var clipB = Math.max(imgY, Math.min(imgY + imgH, winY + winH));
      dialog.shades.top.style.cssText = 'left:' + imgX + 'px;top:' + imgY + 'px;width:' + imgW + 'px;height:' + Math.max(0, clipT - imgY) + 'px;';
      dialog.shades.bottom.style.cssText = 'left:' + imgX + 'px;top:' + clipB + 'px;width:' + imgW + 'px;height:' + Math.max(0, imgY + imgH - clipB) + 'px;';
      dialog.shades.left.style.cssText = 'left:' + imgX + 'px;top:' + clipT + 'px;width:' + Math.max(0, clipL - imgX) + 'px;height:' + Math.max(0, clipB - clipT) + 'px;';
      dialog.shades.right.style.cssText = 'left:' + clipR + 'px;top:' + clipT + 'px;width:' + Math.max(0, imgX + imgW - clipR) + 'px;height:' + Math.max(0, clipB - clipT) + 'px;';
    }
    dialog.place = place;
    dialog.img.onload = place;
    dialog.img.src = spec.src;
    dialog.root.hidden = false;
    if (dialog.img.complete && dialog.img.naturalWidth) place();
    dialog.crop.onpointerdown = function (event) {
      var handle = event.target.getAttribute && event.target.getAttribute('data-handle');
      if (event.target !== dialog.window && !handle) return;
      event.preventDefault();
      drag = { x: event.clientX, y: event.clientY, frame: frame, pointer: event.pointerId, corner: handle || '' };
      dialog.crop.setPointerCapture(event.pointerId);
    };
    dialog.crop.onpointermove = function (event) {
      if (!drag || drag.pointer !== event.pointerId) return;
      var view = dialog.view || { w: dialog.img.offsetWidth, h: dialog.img.offsetHeight };
      var imageW = dialog.img.naturalWidth;
      var imageH = dialog.img.naturalHeight;
      var dx = event.clientX - drag.x;
      var dy = event.clientY - drag.y;
      frame = drag.corner
        ? window.ImgFrame.resize(drag.frame, drag.corner, dx, dy, imageW, imageH, view.w, view.h, ratio)
        : window.ImgFrame.move(drag.frame, dx, dy, imageW, imageH, view.w, view.h, ratio);
      place();
    };
    function endDrag(event) {
      if (!drag || (event && drag.pointer !== event.pointerId)) return;
      drag = null;
    }
    dialog.crop.onpointerup = endDrag;
    dialog.crop.onpointercancel = endDrag;
    dialog.color.value = frame.bg;
    dialog.color.oninput = function () {
      frame = Object.assign({}, frame, { bg: dialog.color.value });
      place();
    };
    dialog.dropper.onclick = function () {
      if (!window.EyeDropper) {
        say('Use the color box to choose a background.');
        return;
      }
      new window.EyeDropper().open().then(function (result) {
        frame = Object.assign({}, frame, { bg: result.sRGBHex });
        dialog.color.value = frame.bg;
        place();
      }).catch(function () {});
    };
    dialog.root.querySelector('[data-reset]').onclick = function () {
      frame = window.ImgFrame.normalize(null);
      dialog.color.value = frame.bg;
      place();
    };
    dialog.root.querySelector('[data-done]').onclick = function () {
      dialog.root.hidden = true;
      spec.onDone(window.ImgFrame.normalize(frame));
    };
  }
  function thumbButton(src, frame, ratio, onClick) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-thumb-btn';
    button.setAttribute('aria-label', 'Preview and reframe photo');
    var preview = document.createElement('span');
    preview.className = 'studio-thumb-preview';
    var img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    preview.appendChild(img);
    button.appendChild(preview);
    button.addEventListener('click', onClick);
    button.update = function (nextSrc, nextFrame) {
      src = nextSrc;
      frame = nextFrame;
      var bg = window.ImgFrame ? window.ImgFrame.normalize(frame).bg : '#ffffff';
      preview.style.background = bg;
      preview.style.aspectRatio = String(ratio);
      if (!src) {
        img.hidden = true;
        img.removeAttribute('src');
        return;
      }
      img.hidden = false;
      img.onload = function () {
        if (window.ImgFrame) window.ImgFrame.apply(img, frame, ratio);
      };
      if (img.getAttribute('src') !== src) img.src = src;
      else if (img.complete && img.naturalWidth && window.ImgFrame) window.ImgFrame.apply(img, frame, ratio);
    };
    button.update(src, frame);
    return button;
  }
  function photoCell(row) {
    var cell = document.createElement('td');
    cell.className = 'studio-photo-cell';
    var frameInput = document.createElement('input');
    frameInput.type = 'hidden';
    frameInput.dataset.field = 'img_frame';
    frameInput.value = row.img_frame ? JSON.stringify(row.img_frame) : '';
    var thumb = thumbButton(photoSrc(row.img), row.img_frame, 1, function () {
      openPhotoFrame({
        src: photoSrc(cell.querySelector('[data-field="img"]').textContent),
        frame: frameInput.value,
        shape: 'revision',
        fit: row.published && row.published.cutout ? 'contain' : 'cover',
        cutout: !!(row.published && row.published.cutout),
        onDone: function (frame) {
          frameInput.value = JSON.stringify(frame);
          row.img_frame = frame;
          thumb.update(photoSrc(cell.querySelector('[data-field="img"]').textContent), frame);
          saveLessonFrame(row);
        }
      });
    });
    var path = document.createElement('div');
    path.className = 'studio-edit';
    path.contentEditable = 'true';
    path.spellcheck = false;
    path.dataset.field = 'img';
    path.hidden = true;
    path.textContent = cellText(row.img);
    path.addEventListener('paste', plainPaste);
    path.addEventListener('input', function () { paintPhoto(cell); });
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-upload';
    button.textContent = 'Change photo';
    button.addEventListener('click', function () {
      chooseLibraryPhoto(function (src) {
        path.textContent = src;
        frameInput.value = '';
        row.img_frame = null;
        paintPhoto(cell);
        say('Photo is in this row. Publish to show it on the site.');
      });
    });
    cell.appendChild(thumb);
    cell.appendChild(frameInput);
    cell.appendChild(path);
    cell.appendChild(button);
    paintPhoto(cell);
    return cell;
  }
  function saveLessonFrame(row) {
    if (!client || !row || !row.id) return;
    var patch = { img_frame: row.img_frame };
    if (row.status === 'published' && row.published) {
      row.published = Object.assign({}, row.published, { img_frame: row.img_frame });
      patch.published = row.published;
    }
    client.from('lesson_cards').update(patch).eq('id', row.id).then(function (result) {
      say(result.error ? result.error.message : 'Reframe saved. Students see it after a refresh.');
    });
  }
  function grammarPicture(row) {
    var extra = (row && row.extra) || {};
    var published = (row && row.published) || {};
    var item = extra.item || published.item || {};
    var meta = extra.meta || published.meta || {};
    if (item.img) return { src: item.img, frame: item.frame || null, kind: 'item' };
    if (meta.hero) return { src: meta.hero, frame: meta.frame || null, kind: 'hero' };
    return { src: '', frame: null, kind: item.img == null && meta.hero == null ? 'item' : 'item' };
  }
  function saveGrammarPicture(row, picture) {
    row.extra = Object.assign({}, row.extra || {});
    if (picture.kind === 'hero') {
      row.extra.meta = Object.assign({}, row.extra.meta || {}, { hero: picture.src, frame: picture.frame });
      rows.forEach(function (other) {
        var rowSet = row.extra && row.extra.set != null ? Number(row.extra.set) : null;
        var otherSet = other.extra && other.extra.set != null ? Number(other.extra.set) : null;
        if (rowSet == null || otherSet !== rowSet || other === row) return;
        other.extra = Object.assign({}, other.extra || {});
        other.extra.meta = Object.assign({}, other.extra.meta || {}, { hero: picture.src, frame: picture.frame });
        if (client && other.id) client.from('practice_items').update({ extra: other.extra }).eq('id', other.id);
      });
    } else {
      row.extra.item = Object.assign({}, row.extra.item || {}, { img: picture.src, frame: picture.frame });
    }
    if (!client || !row.id) return;
    var patch = { extra: row.extra };
    if (row.status === 'published' && row.published) {
      row.published = Object.assign({}, row.published, {
        item: row.extra.item || row.published.item,
        meta: row.extra.meta || row.published.meta
      });
      patch.published = row.published;
    }
    client.from('practice_items').update(patch).eq('id', row.id).then(function (result) {
      say(result.error ? result.error.message : 'Picture saved. Students see it after a refresh.');
    });
  }
  function grammarPhotoCell(row) {
    var cell = document.createElement('td');
    cell.className = 'studio-photo-cell';
    var picture = grammarPicture(row);
    var path = document.createElement('div');
    path.className = 'studio-edit';
    path.contentEditable = 'true';
    path.spellcheck = false;
    path.hidden = true;
    path.textContent = picture.src || '';
    var thumb = thumbButton(photoSrc(picture.src), picture.frame, 320 / 220, function () {
      var current = path.textContent.trim();
      openPhotoFrame({
        src: photoSrc(current),
        frame: picture.frame,
        shape: place().mode === 'chat' ? 'chat' : 'grammar',
        fit: 'contain',
        onDone: function (frame) {
          picture = { src: current, frame: frame, kind: picture.kind };
          thumb.update(photoSrc(current), frame);
          saveGrammarPicture(row, picture);
        }
      });
    });
    path.addEventListener('paste', plainPaste);
    path.addEventListener('input', function () {
      thumb.update(photoSrc(path.textContent), picture.frame);
    });
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-upload';
    button.textContent = 'Change photo';
    button.addEventListener('click', function () {
      chooseLibraryPhoto(function (src) {
        cell.dispatchEvent(new CustomEvent('studio-photo', { detail: src }));
      });
    });
    cell.addEventListener('studio-photo', function (event) {
      path.textContent = event.detail;
      picture = { src: event.detail, frame: null, kind: picture.kind };
      thumb.update(photoSrc(event.detail), null);
      saveGrammarPicture(row, picture);
    });
    cell.appendChild(thumb);
    cell.appendChild(path);
    cell.appendChild(button);
    return cell;
  }
  function revisionColumns(here) {
    var grammar = here.kind === 'grammar';
    var columns = [
      { col: 'col-num', key: 'num', label: '#' },
      { col: 'col-photo', key: 'photo', label: 'Photo' },
      { col: 'col-audio', key: 'audio', label: 'Audio' },
      { col: 'col-text', key: 'en', label: 'English' },
      { col: 'col-text', key: 'zh', label: '中文' },
      { col: 'col-text', key: 'pos', label: 'Part of speech' },
      { col: grammar ? 'col-pattern' : 'col-text', key: grammar ? 'pattern' : 'syllables', label: grammar ? 'Pattern' : 'Syllables' }
    ];
    if (grammar) columns.push({ col: 'col-note', key: 'note', label: 'Note' });
    columns.push(
      { col: 'col-pair', key: 'example', label: 'Example<br>例句' },
      { col: 'col-pair', key: 'advanced', label: 'Advanced<br>進階例句' },
      { col: 'col-state', key: 'state', label: 'State' },
      { col: 'col-actions', key: 'actions', label: '' }
    );
    return { shape: grammar ? 'grammar' : 'revision', columns: columns };
  }
  function practiceColumns(here) {
    var mode = here.mode;
    if (mode === 'letters') {
      return {
        shape: 'letters',
        kind: 'letters',
        columns: [
          { col: 'col-num', key: 'num', label: '#' },
          { col: 'col-prompt', key: 'word', label: 'Word' },
          { col: 'col-pair', key: 'easy', label: 'Easy' },
          { col: 'col-pair', key: 'hard', label: 'Hard' },
          { col: 'col-state', key: 'state', label: 'State' },
          { col: 'col-actions', key: 'actions', label: '' }
        ]
      };
    }
    if (mode === 'match') {
      return {
        shape: 'spell',
        kind: 'match',
        columns: [
          { col: 'col-num', key: 'num', label: '#' },
          { col: 'col-pair', key: 'en', label: 'English' },
          { col: 'col-pair', key: 'picture', label: 'Picture' },
          { col: 'col-state', key: 'state', label: 'State' },
          { col: 'col-actions', key: 'actions', label: '' }
        ]
      };
    }
    if (mode === 'fill' && here.kind !== 'grammar') {
      return {
        shape: 'fill',
        kind: 'pair',
        columns: [
          { col: 'col-num', key: 'num', label: '#' },
          { col: 'col-pair', key: 'easy', label: 'Easy' },
          { col: 'col-pair', key: 'hard', label: 'Hard' },
          { col: 'col-options', key: 'options', label: 'Options' },
          { col: 'col-state', key: 'state', label: 'State' },
          { col: 'col-actions', key: 'actions', label: '' }
        ]
      };
    }
    if (here.kind === 'grammar') {
      var columns = [
        { col: 'col-num', key: 'num', label: '#' },
        { col: 'col-passage', key: 'prompt', label: 'Prompt' },
        { col: 'col-short', key: 'answer', label: 'Answer' },
        { col: 'col-explain', key: 'explain', label: 'Explain' },
        { col: 'col-options', key: 'options', label: 'Options' },
        { col: 'col-hard', key: 'hard', label: 'Hard' },
        { col: 'col-state', key: 'state', label: 'State' },
        { col: 'col-actions', key: 'actions', label: '' }
      ];
      if (mode === 'story' || mode === 'chat' || mode === 'boss') {
        columns.splice(1, 0, { col: 'col-photo', key: 'photo', label: 'Photo' });
      }
      return {
        shape: 'passage',
        kind: 'grammar',
        fields: ['prompt', 'answer', 'explain', 'options'],
        columns: columns
      };
    }
    return {
      shape: 'fill',
      kind: 'plain',
      fields: ['prompt', 'answer', 'explain', 'options'],
      columns: [
        { col: 'col-num', key: 'num', label: '#' },
        { col: 'col-prompt', key: 'prompt', label: 'Prompt' },
        { col: 'col-answer', key: 'answer', label: 'Answer' },
        { col: 'col-explain', key: 'explain', label: 'Explain' },
        { col: 'col-options', key: 'options', label: 'Options' },
        { col: 'col-state', key: 'state', label: 'State' },
        { col: 'col-actions', key: 'actions', label: '' }
      ]
    };
  }
  function setColumns(shape, columns) {
    window.StudioDraft.mountStudioColumns($('studio-table'), $('studio-head'), columns, shape, window.localStorage);
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
    return Object.keys(map).map(function (key) {
      var pair = map[key];
      var easyLive = pair.easy && pair.easy.status === 'published';
      var hardLive = pair.hard && pair.hard.status === 'published';
      if (easyLive || hardLive) pair.status = 'published';
      return pair;
    }).sort(function (a, b) {
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
    explain.classList.add('studio-fill-note');
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
  var ignoreLoaded = false;
  var ignoreDirty = false;
  function ignoreTags() {
    var host = $('letter-ignore-words');
    return host ? host.querySelector('.studio-tags') : null;
  }
  function currentIgnore() {
    var tags = ignoreTags();
    if (!tags || !tags._getValue || !window.LetterRules) return null;
    return window.LetterRules.parseIgnore(tags._getValue());
  }
  function paintMask(field, phrase, which, again) {
    var rules = window.LetterRules;
    var word = String(phrase || '');
    var hide = {};
    if (rules) {
      var ignored = currentIgnore();
      hide = again
        ? rules.anotherHide(word, which, field._hide, ignored)
        : rules.hiddenIndexes(word, which, Math.random, ignored);
    }
    field._hide = hide;
    field.textContent = '';
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
  function rowPhrase(node) {
    var row = node.closest('tr');
    var word = row && row.querySelector('[data-field="prompt"]');
    return cellText(word && word.textContent);
  }
  function repaintLetterMasks() {
    document.querySelectorAll('[data-mask]').forEach(function (field) {
      paintMask(field, rowPhrase(field), field.dataset.mask, false);
    });
  }
  function lettersCell(phrase, which) {
    var cell = document.createElement('td');
    var field = document.createElement('div');
    field.className = 'studio-mask';
    field.dataset.mask = which;
    field.setAttribute('aria-label', which === 'hard' ? 'Hard example' : 'Easy example');
    paintMask(field, phrase, which, false);
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-random';
    button.textContent = 'Random';
    button.setAttribute('aria-label', which === 'hard' ? 'Another hard example' : 'Another easy example');
    button.addEventListener('click', function () {
      paintMask(field, rowPhrase(button), which, true);
    });
    cell.appendChild(field);
    cell.appendChild(button);
    return cell;
  }
  function wordCell(phrase) {
    var cell = document.createElement('td');
    var field = edit('prompt', phrase);
    field.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') event.preventDefault();
    });
    field.addEventListener('input', function () {
      var text = cellText(field.textContent);
      var row = field.closest('tr');
      if (!row) return;
      row.querySelectorAll('[data-mask]').forEach(function (preview) {
        paintMask(preview, text, preview.dataset.mask, false);
      });
    });
    cell.appendChild(field);
    return cell;
  }
  function syncIgnoreBar() {
    var bar = $('letter-ignore');
    if (!bar) return;
    var here = place();
    var show = here.open === 'site' && here.site === 'ignore';
    bar.hidden = !show;
    if (!show || ignoreLoaded || ignoreDirty || !client || !window.LetterRules) return;
    ignoreLoaded = true;
    var tags = ignoreTags();
    if (tags && tags._setValue) tags._setValue(window.LetterRules.ignoreText());
    client.from('content_settings_live').select('value').eq('key', 'letter_ignore_words').maybeSingle().then(function (result) {
      if (ignoreDirty || !tags) return;
      if (!result.error && result.data && result.data.value) {
        if (tags._setValue) tags._setValue(result.data.value);
        window.LetterRules.setIgnoreWords(result.data.value);
        repaintLetterMasks();
      }
    });
  }
  function saveIgnoreWords() {
    if (!client || !window.LetterRules) { say('The draft script did not load.'); return; }
    var text = window.LetterRules.ignoreText(currentIgnore());
    var tags = ignoreTags();
    if (tags && tags._setValue) tags._setValue(text);
    window.LetterRules.setIgnoreWords(text);
    repaintLetterMasks();
    say('Saving ignore words…');
    client.from('content_settings').upsert({ key: 'letter_ignore_words', value: text }, { onConflict: 'key' }).then(function (result) {
      if (result.error) { say(result.error.message); return; }
      ignoreDirty = false;
      say('Ignore words saved. Students see them after a refresh.');
    });
  }
  function matchPictureCell(row) {
    var cell = document.createElement('td');
    cell.className = 'studio-pair';
    var path = edit('img', row.extra && row.extra.img);
    path.hidden = true;
    var thumb = thumbButton(photoSrc(row.extra && row.extra.img), row.extra && row.extra.frame, 1, function () {
      openPhotoFrame({
        src: photoSrc(path.textContent),
        frame: row.extra && row.extra.frame,
        shape: 'match',
        fit: 'contain',
        onDone: function (frame) {
          row.extra = Object.assign({}, row.extra || {}, { frame: frame, img: path.textContent.trim() });
          thumb.update(photoSrc(path.textContent), frame);
          savePracticeFrame(row);
        }
      });
    });
    path.addEventListener('input', function () {
      thumb.update(photoSrc(path.textContent), row.extra && row.extra.frame);
    });
    cell.appendChild(thumb);
    cell.appendChild(path);
    cell.appendChild(edit('answer', row.answer));
    return cell;
  }
  function savePracticeFrame(row) {
    if (!client || !row || !row.id) return;
    var patch = { extra: row.extra };
    if (row.status === 'published' && row.published) {
      row.published = Object.assign({}, row.published, { frame: row.extra.frame, img: row.extra.img });
      patch.published = row.published;
    }
    client.from('practice_items').update(patch).eq('id', row.id).then(function (result) {
      say(result.error ? result.error.message : 'Reframe saved. Students see it after a refresh.');
    });
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
          shaped.appendChild(wordCell(phrase));
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
      if (spec.kind === 'grammar' && (place().mode === 'story' || place().mode === 'chat' || place().mode === 'boss')) {
        tr.appendChild(grammarPhotoCell(row));
      }
      spec.fields.forEach(function (name) {
        tr.appendChild(box(name, row[name]));
      });
      if (spec.kind === 'grammar') tr.appendChild(hardCell(row));
      tr.appendChild(stateCell(row));
      tr.appendChild(actionCell(tr));
      body.appendChild(tr);
    });
    paintEmpty();
    focusPendingRow();
  }
  function stateCell(row) {
    var state = document.createElement('td');
    state.className = 'is-state';
    state.textContent = row.status === 'published' ? 'Published' : 'Draft';
    return state;
  }
  function rowLabel(tr) {
    var named = tr.querySelector('[data-field="prompt"], [data-field="en"]');
    var text = named ? cellText(named.textContent).trim() : '';
    if (text) return text;
    var easy = tr.querySelector('[data-side="easy"]');
    if (easy) {
      var blank = readBlankField(easy);
      if (blank.answer) return blank.answer;
      if (blank.sentence) return blank.sentence;
    }
    return '';
  }
  function copyStudioText(text, button) {
    function mark() {
      var old = button.textContent;
      button.textContent = 'Copied';
      setTimeout(function () { button.textContent = old; }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(mark, mark);
      return;
    }
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (e) {}
    area.remove();
    mark();
  }
  function actionCell(tr) {
    var actions = document.createElement('td');
    actions.className = 'is-actions';
    var stack = document.createElement('div');
    stack.className = 'studio-actions';
    function copyRow(button) {
      var number = tr.querySelector('.is-num').textContent.trim();
      var row = { n: number, label: rowLabel(tr) };
      var hardBox = tr.querySelector('[data-field="hard"]');
      if (hardBox) row.level = hardBox.checked ? 'hard' : 'easy';
      copyStudioText(window.StudioDraft.studioPath(place(), row), button);
    }
    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'studio-copy';
    copy.textContent = 'Copy path';
    copy.addEventListener('click', function () { copyRow(copy); });
    stack.appendChild(copy);
    var save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Save draft';
    save.addEventListener('click', function () { store(tr, 'draft'); });
    var publish = document.createElement('button');
    publish.type = 'button';
    publish.textContent = 'Publish';
    publish.addEventListener('click', function () { requestStore(tr, 'published'); });
    stack.appendChild(save);
    stack.appendChild(publish);
    if (liveTargets(tr).length) stack.appendChild(retractButton(tr));
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'studio-remove';
    remove.textContent = 'Remove';
    remove.addEventListener('click', function () { removeRow(tr); });
    stack.appendChild(remove);
    actions.appendChild(stack);
    return actions;
  }
  function render() {
    syncIgnoreBar();
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
      tr.appendChild(audioCell(row));
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
    focusPendingRow();
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
      data[field.dataset.field] = fieldValue(field);
    });
    var row = rows.filter(function (item) { return String(item.id) === tr.dataset.id; })[0];
    data.audio = row && row.audio ? row.audio : '';
    data.video = row && row.video ? row.video : '';
    data.highlight = row && row.highlight ? row.highlight : '';
    data.highlight_adv = row && row.highlight_adv != null ? row.highlight_adv : null;
    if (typeof data.img_frame === 'string') {
      if (!data.img_frame) data.img_frame = null;
      else {
        try { data.img_frame = JSON.parse(data.img_frame); }
        catch (error) { data.img_frame = null; }
      }
    }
    if (tableName === 'practice_items') {
      ['prompt', 'answer', 'explain', 'options'].forEach(function (name) {
        if (!Object.prototype.hasOwnProperty.call(data, name)) data[name] = row && row[name] ? row[name] : '';
      });
      data.level_name = (row && row.level_name) || window.StudioDraft.difficulty(place());
    }
    return data;
  }
  function liveTargets(tr) {
    if (tr.dataset.pair === 'fill') {
      var number = Number(tr.querySelector('.is-num').textContent);
      var pair = rows.filter(function (item) { return Number(item.n) === number; })[0] || {};
      return ['easy', 'hard'].map(function (side) {
        return pair[side] && pair[side].status === 'published' ? pair[side] : null;
      }).filter(Boolean);
    }
    var row = rows.filter(function (item) { return String(item.id) === tr.dataset.id; })[0];
    return row && row.status === 'published' ? [row] : [];
  }
  function paintLiveState(tr, live) {
    tr.classList.toggle('is-draft', !live);
    var state = tr.querySelector('.is-state');
    if (state) state.textContent = live ? 'Published' : 'Draft';
    var stack = tr.querySelector('.studio-actions');
    if (!stack) return;
    var button = stack.querySelector('.studio-retract');
    if (live && !button) {
      var remove = stack.querySelector('.studio-remove');
      stack.insertBefore(retractButton(tr), remove);
    }
    if (!live && button) button.remove();
  }
  function retractButton(tr) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-retract';
    button.textContent = 'Retract';
    button.addEventListener('click', function () { retractRow(tr); });
    return button;
  }
  function retractRow(tr) {
    var targets = liveTargets(tr);
    if (!targets.length) return;
    if (!window.confirm('Take this row off the live site? It stays in this table as a draft.')) return;
    say('Taking it off the site…');
    var pending = targets.length;
    var failed = '';
    targets.forEach(function (row) {
      client.from(tableName).update({ status: 'draft' }).eq('id', row.id).select('id,status').then(function (result) {
        if (result.error) failed = result.error.message;
        else row.status = 'draft';
        pending -= 1;
        if (pending > 0) return;
        if (failed) { say(failed); return; }
        if (tr.dataset.pair === 'fill') {
          var number = Number(tr.querySelector('.is-num').textContent);
          var pair = rows.filter(function (item) { return Number(item.n) === number; })[0];
          if (pair) {
            var easyLive = pair.easy && pair.easy.status === 'published';
            var hardLive = pair.hard && pair.hard.status === 'published';
            pair.status = easyLive || hardLive ? 'published' : 'draft';
          }
        }
        render();
        say('Taken off the site. Students no longer see it after a refresh.');
      });
    });
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
      paintLiveState(tr, status === 'published');
      if (status === 'published') say('Published. Students see it after a refresh.');
      else if (wasPublished) say('Saved as a draft. Students no longer see this row until you publish it.');
      else say('Draft saved. Students do not see it yet.');
    });
  }

  function storeFill(tr, status) {
    var optionsField = tr.querySelector('[data-field="options"]');
    var options = fieldValue(optionsField);
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
  var pathMark = null;
  function markPathRow(row) {
    if (!row) return;
    if (pathMark && pathMark.row !== row) {
      clearTimeout(pathMark.timer);
      pathMark.row.classList.remove('is-path-row');
    }
    row.classList.add('is-path-row');
    row.scrollIntoView({ block: 'center' });
    var timer = setTimeout(function () {
      row.classList.remove('is-path-row');
      if (pathMark && pathMark.row === row) pathMark = null;
    }, 1100);
    pathMark = { row: row, timer: timer };
  }
  function focusPendingRow() {
    if (!pendingFocus) return;
    var want = String(pendingFocus);
    pendingFocus = '';
    var found = null;
    $('studio-rows').querySelectorAll('tr').forEach(function (tr) {
      var num = tr.querySelector('.is-num');
      if (num && num.textContent.trim() === want) found = tr;
      if (tr.dataset.slot === want) found = tr;
    });
    if (found) markPathRow(found);
  }
  function goToPath(text) {
    var parsed = window.StudioDraft && window.StudioDraft.parseStudioPath(text);
    if (!parsed) { say('That path does not match a table.'); return; }
    $('filter-book').value = parsed.book;
    syncSeries(parsed.series);
    $('filter-term').value = parsed.term;
    $('filter-level').value = parsed.level;
    $('filter-section').value = parsed.open || 'unit';
    if ($('filter-part')) $('filter-part').value = parsed.part || 'revision';
    if ($('filter-site')) $('filter-site').value = parsed.site || 'badges';
    if ($('filter-source')) $('filter-source').value = parsed.source || 'unit';
    $('filter-kind').value = parsed.kind || 'vocab';
    if ($('filter-set') && parsed.set) $('filter-set').value = parsed.set;
    if (parsed.levelRow && $('filter-difficulty')) $('filter-difficulty').value = parsed.levelRow;
    syncMode(parsed.mode, parsed.unit);
    rememberPlace();
    pendingFocus = parsed.badgeId || parsed.slot || parsed.n || '';
    load();
    var shown = window.StudioDraft.studioPath(parsed, parsed.n ? { n: parsed.n, level: parsed.levelRow } : null);
    var box = $('studio-path-jump');
    if (box) box.value = shown;
    say('Opened ' + shown + '.');
  }
  function load(doneMessage) {
    var here = place();
    syncPanels();
    if (here.open === 'site' && here.site === 'badges') {
      if (window.RevisionStudioBadges) window.RevisionStudioBadges.load(client, here, { say: say, focus: pendingFocus, focused: function () { pendingFocus = ''; } });
      else say('The badge editor did not load.');
      return;
    }
    if (here.open === 'site' && here.site === 'ignore') {
      syncIgnoreBar();
      say('Ignore words apply to every Missing Letters practice.');
      return;
    }
    if (here.section === 'resources') {
      if (window.RevisionStudioResources) window.RevisionStudioResources.load(client, here, { say: say });
      else say('The resources editor did not load.');
      return;
    }
    if (here.section === 'pages') {
      if (window.RevisionStudioPages) {
        window.RevisionStudioPages.load(client, here, {
          say: say,
          focus: pendingFocus,
          focused: function () { pendingFocus = ''; }
        });
      }
      else say('The page editor did not load.');
      return;
    }
    var practice = here.section === 'practice';
    tableName = practice ? 'practice_items' : 'lesson_cards';
    say('Loading…');
    var query = client.from(tableName).select(practice
      ? 'id,n,status,prompt,answer,explain,options,level_name,extra'
      : 'id,n,status,en,zh,pos,syllables,pattern,note_zh,highlight,highlight_adv,ex_en,ex_zh,adv_en,adv_zh,img,img_frame,audio,video,published')
      .eq('book', here.book).eq('series', here.series).eq('term', here.term)
      .eq('level', here.level).eq('track', here.kind);
    if (practice) {
      query = query.eq('unit_id', window.StudioDraft.unitId(here)).eq('mode', here.mode);
      if (here.kind === 'grammar' || here.mode === 'fill') query = query.eq('set_no', Number(here.set) || 1);
      if (here.kind !== 'grammar' && here.mode !== 'fill') query = query.eq('level_name', window.StudioDraft.difficulty(here));
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
      if (here.kind === 'grammar' || here.mode === 'fill') query = query.eq('set_no', Number(here.set) || 1);
      if (here.kind !== 'grammar' && here.mode !== 'fill') query = query.eq('level_name', window.StudioDraft.difficulty(here));
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
    if (here.open === 'site' || here.open === 'home' || here.part === 'doors') return;
    if (here.section === 'resources' && window.RevisionStudioResources) {
      window.RevisionStudioResources.create(client, here, say);
      return;
    }
    var practice = here.section === 'practice';
    var table = practice ? 'practice_items' : 'lesson_cards';
    say('Adding a draft…');
    var numbers = client.from(table).select('n')
      .eq('book', here.book).eq('series', here.series).eq('term', here.term).eq('level', here.level);
    if (practice) {
      numbers = numbers.eq('unit_id', window.StudioDraft.unitId(here)).eq('track', here.kind).eq('mode', here.mode);
      if (here.kind === 'grammar' || here.mode === 'fill') numbers = numbers.eq('set_no', Number(here.set) || 1);
      if (here.kind !== 'grammar' && here.mode !== 'fill') numbers = numbers.eq('level_name', window.StudioDraft.difficulty(here));
      else numbers = numbers.eq('level_name', 'easy');
    } else {
      numbers = numbers.eq('unit_id', here.unit).eq('track', here.kind === 'grammar' ? 'grammar' : 'vocab');
    }
    numbers.then(function (result) {
      if (result.error) { say(result.error.message); return; }
      var n = window.StudioDraft.nextNumber(here, (result.data || []).map(function (item) { return item.n; }));
      if ($('filter-review').value === 'published') $('filter-review').value = 'all';
      rememberPlace();
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

  function studioRoot() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      var cut = src.indexOf('assets/studio.js');
      if (cut !== -1) return src.slice(0, cut);
    }
    return '';
  }
  function safeReturn(value) {
    var from = String(value || '');
    if (!from || from.indexOf('studio') !== -1) return '';
    if (from.indexOf('..') !== -1 || from.indexOf('//') !== -1 || from.indexOf('\\') !== -1) return '';
    if (!/^[a-z0-9./_?#&=%-]+$/i.test(from)) return '';
    from = from.replace(/(^|\/)index\.html(?=[#?]|$)/, '$1').replace(/\.html(?=[#?]|$)/, '/');
    return from === './' ? '' : from;
  }
  function wireBack() {
    var from = '';
    try { from = sessionStorage.getItem('revision-studio-from') || ''; } catch (e) {}
    var link = $('studio-back');
    if (link) link.setAttribute('href', (studioRoot() || '../') + safeReturn(from));
  }

  function bindEditor() {
    var saved = savedPlace();
    $('filter-section').value = saved.open || 'unit';
    if ($('filter-part')) $('filter-part').value = saved.part || 'revision';
    if ($('filter-site')) $('filter-site').value = saved.site || 'badges';
    if ($('filter-source')) $('filter-source').value = saved.source || 'unit';
    $('filter-kind').value = saved.kind;
    $('filter-difficulty').value = saved.difficulty;
    if ($('filter-set')) $('filter-set').value = saved.set;
    $('filter-review').value = saved.review;
    fillSelect($('filter-book'), BOOKS, saved.book);
    syncSeries(saved.series);
    fillSelect($('filter-term'), TERMS, saved.term);
    LEVELS.forEach(function (id) {
      var option = document.createElement('option');
      option.value = id;
      option.textContent = id.toUpperCase();
      if (id === saved.level) option.selected = true;
      $('filter-level').appendChild(option);
    });
    fillSelect($('filter-unit'), UNITS, saved.unit === 'mixed' ? 'unit1' : saved.unit);
    syncMode(saved.mode, saved.unit);
    ['filter-book', 'filter-series', 'filter-term', 'filter-level', 'filter-unit', 'filter-section', 'filter-part', 'filter-site', 'filter-source', 'filter-kind', 'filter-mode', 'filter-difficulty', 'filter-set'].forEach(function (id) {
      var node = $(id);
      if (!node) return;
      node.addEventListener('change', function () {
        if (id === 'filter-book') syncSeries();
        if (id === 'filter-section' || id === 'filter-part' || id === 'filter-site' || id === 'filter-source' || id === 'filter-kind' || id === 'filter-mode') syncMode();
        rememberPlace();
        load();
      });
    });
    $('filter-review').addEventListener('change', function () {
      rememberPlace();
      render();
      say(reviewLine());
    });
    $('studio-new').addEventListener('click', createDraft);
    var ignoreHost = $('letter-ignore-words');
    if (ignoreHost && window.LetterRules && !ignoreHost.querySelector('.studio-tags')) {
      ignoreHost.appendChild(tagEditor(window.LetterRules.ignoreText(), {
        label: 'Add ignore word',
        splitPaste: true,
        parse: function (text) { return window.LetterRules.parseIgnore(text); },
        join: function (list) { return window.LetterRules.ignoreText(list); },
        onChange: function (text) {
          ignoreDirty = true;
          window.LetterRules.setIgnoreWords(text);
          repaintLetterMasks();
        }
      }));
    }
    var ignoreSave = $('letter-ignore-save');
    if (ignoreSave) ignoreSave.addEventListener('click', saveIgnoreWords);
    var libraryButton = $('studio-library-open');
    if (libraryButton) {
      libraryButton.addEventListener('click', function () {
        if (window.RevisionStudioLibrary) window.RevisionStudioLibrary.open(client, { say: say, place: libraryPlace() });
        else say('The library did not load.');
      });
    }
    var tableCopy = $('studio-copy-path');
    if (tableCopy) {
      tableCopy.addEventListener('click', function () {
        copyStudioText(window.StudioDraft.studioPath(place()), tableCopy);
      });
    }
    var pathJump = $('studio-path-jump');
    if (pathJump) {
      pathJump.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        goToPath(pathJump.value);
      });
    }
    mountSearch();
    var opening = place();
    var openingSpec = opening.section === 'practice' ? practiceColumns(opening) : revisionColumns(opening);
    setColumns(openingSpec.shape, openingSpec.columns);
    load();
  }
  function escapeSuggest(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function searchLibrary(query) {
    var term = String(query || '').replace(/[%_"\\(),]/g, ' ').replace(/\s+/g, ' ').trim();
    if (term.length < 2 || !client) return Promise.resolve([]);
    function like(fields) {
      var needle = '%' + term + '%';
      return fields.map(function (field) { return field + '.ilike."' + needle + '"'; }).join(',');
    }
    return Promise.all([
      client.from('lesson_cards').select('book,series,term,level,unit_id,track,n,en,zh,ex_en,ex_zh,adv_en,adv_zh,pattern,note_zh')
        .or(like(['en', 'zh', 'ex_en', 'ex_zh', 'adv_en', 'adv_zh', 'pattern', 'note_zh'])).limit(1000),
      client.from('practice_items').select('book,series,term,level,unit_id,track,mode,set_no,n,level_name,prompt,answer,explain')
        .or(like(['prompt', 'answer', 'explain'])).limit(1000),
      client.from('site_pages').select('book,series,term,level,unit_id,slot,label,note')
        .or(like(['label', 'note'])).limit(1000)
    ]).then(function (results) {
      return window.StudioDraft.searchSuggestions({
        lessons: results[0].error ? [] : (results[0].data || []),
        practice: results[1].error ? [] : (results[1].data || []),
        pages: results[2].error ? [] : (results[2].data || [])
      }, term);
    });
  }
  function mountSearch() {
    var input = $('studio-search');
    var list = $('studio-suggest');
    if (!input || !list) return;
    var timer = 0;
    var seq = 0;
    var hits = [];
    var active = 0;
    function close() {
      list.hidden = true;
      list.replaceChildren();
      input.setAttribute('aria-expanded', 'false');
      hits = [];
    }
    function paint() {
      list.replaceChildren();
      if (!hits.length) {
        var empty = document.createElement('p');
        empty.className = 'studio-suggest-empty';
        empty.textContent = 'No matches';
        list.appendChild(empty);
      } else {
        hits.forEach(function (hit, index) {
          var button = document.createElement('button');
          button.type = 'button';
          button.setAttribute('role', 'option');
          if (index === active) button.className = 'is-active';
          var snippet = hit.snippet;
          var path = window.StudioDraft.studioPath(hit.place, hit.row);
          button.innerHTML = '<span class="studio-suggest-text">' + escapeSuggest(snippet.before) + '<mark>' + escapeSuggest(snippet.match) + '</mark>' + escapeSuggest(snippet.after) + '</span>'
            + '<span class="studio-suggest-path">' + escapeSuggest(path) + '</span>';
          button.addEventListener('mousedown', function (event) {
            event.preventDefault();
            choose(index);
          });
          list.appendChild(button);
        });
      }
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      var chosen = list.querySelector('.is-active');
      if (chosen && chosen.scrollIntoView) chosen.scrollIntoView({ block: 'nearest' });
    }
    function choose(index) {
      var hit = hits[index];
      if (!hit) return;
      close();
      goToPath(window.StudioDraft.studioPath(hit.place, hit.row));
    }
    function run() {
      var query = input.value.trim();
      var ticket = ++seq;
      if (query.length < 2) { close(); return; }
      searchLibrary(query).then(function (found) {
        if (ticket !== seq || input.value.trim() !== query) return;
        hits = found || [];
        active = 0;
        paint();
      });
    }
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(run, 180);
    });
    input.addEventListener('keydown', function (event) {
      if (list.hidden) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!hits.length) return;
        active = Math.min(hits.length - 1, active + 1);
        paint();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!hits.length) return;
        active = Math.max(0, active - 1);
        paint();
      } else if (event.key === 'Enter') {
        if (!hits.length) return;
        event.preventDefault();
        choose(active);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    });
    input.addEventListener('focus', function () {
      if (input.value.trim().length >= 2) run();
    });
    document.addEventListener('click', function (event) {
      if (event.target === input || list.contains(event.target)) return;
      close();
    });
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
        window.location.replace((studioRoot() || '../') + 'account/?next=' + encodeURIComponent('studio/'));
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
  window.RevisionStudio = { boot: boot, openPhotoFrame: openPhotoFrame, markPathRow: markPathRow };
  if (!window.STUDIO_TEST) boot();
})();
