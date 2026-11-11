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
  function syncMode(preferredMode, preferredUnit) {
    var kind = $('filter-kind').value === 'grammar' ? 'grammar' : 'vocab';
    var modes = MODES[kind];
    var current = preferredMode || $('filter-mode').value;
    if (!modes.some(function (item) { return item.id === current; })) current = modes[0].id;
    fillSelect($('filter-mode'), modes, current);
    var practice = $('filter-section').value === 'practice';
    $('filter-mode-label').hidden = !practice;
    $('filter-difficulty-label').hidden = true;
    $('filter-set-label').hidden = !(practice && kind === 'grammar');
    $('filter-unit-label').hidden = practice && $('filter-mode').value === 'boss';
    syncUnits(preferredUnit);
  }
  function syncUnits(preferred) {
    var practice = $('filter-section').value === 'practice';
    var vocab = $('filter-kind').value !== 'grammar';
    var units = UNITS.slice();
    if (practice && vocab) units = units.concat([{ id: 'mixed', label: 'Mixed topic' }]);
    var current = preferred || $('filter-unit').value;
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
      var field = cell.querySelector('[data-field="img"]');
      if (field) {
        field.textContent = url;
        paintPhoto(cell);
      } else {
        var img = cell.querySelector('img');
        if (img) { img.hidden = false; img.src = url; }
        cell.dispatchEvent(new CustomEvent('studio-photo', { detail: url }));
      }
      say('Photo is in this row. Publish to show it on the site.');
    });
  }
  var frameDialog = null;
  function shapeRatio(shape) {
    if (shape === 'match') return 180 / 140;
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
      + '<p class="studio-frame-note">Drag inside the frame to move it. Drag a corner to resize it.</p>'
      + '<div class="studio-crop" data-crop>'
      + '<img alt="" draggable="false">'
      + '<div class="studio-crop-shade" data-shade="top"></div>'
      + '<div class="studio-crop-shade" data-shade="left"></div>'
      + '<div class="studio-crop-shade" data-shade="right"></div>'
      + '<div class="studio-crop-shade" data-shade="bottom"></div>'
      + '<div class="studio-crop-window" data-window>'
      + '<button type="button" class="studio-crop-corner" data-corner="nw" aria-label="Resize from the top left"></button>'
      + '<button type="button" class="studio-crop-corner" data-corner="ne" aria-label="Resize from the top right"></button>'
      + '<button type="button" class="studio-crop-corner" data-corner="sw" aria-label="Resize from the bottom left"></button>'
      + '<button type="button" class="studio-crop-corner" data-corner="se" aria-label="Resize from the bottom right"></button>'
      + '</div></div>'
      + '<div class="studio-frame-bar"><button type="button" data-reset>Reset</button><button type="button" data-done>Done</button></div>'
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
      }
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
    var ratio = shapeRatio(spec.shape);
    var frame = window.ImgFrame.normalize(spec.frame);
    var drag = null;
    function place() {
      var viewW = dialog.img.offsetWidth;
      var viewH = dialog.img.offsetHeight;
      var imageW = dialog.img.naturalWidth;
      var imageH = dialog.img.naturalHeight;
      if (!viewW || !viewH || !imageW || !imageH) return;
      var box = window.ImgFrame.viewRect(frame, imageW, imageH, viewW, viewH, ratio);
      var win = dialog.window;
      win.style.left = box.left + 'px';
      win.style.top = box.top + 'px';
      win.style.width = box.width + 'px';
      win.style.height = box.height + 'px';
      dialog.shades.top.style.cssText = 'left:0;top:0;width:100%;height:' + box.top + 'px;';
      dialog.shades.bottom.style.cssText = 'left:0;top:' + (box.top + box.height) + 'px;width:100%;height:' + Math.max(0, viewH - box.top - box.height) + 'px;';
      dialog.shades.left.style.cssText = 'left:0;top:' + box.top + 'px;width:' + box.left + 'px;height:' + box.height + 'px;';
      dialog.shades.right.style.cssText = 'left:' + (box.left + box.width) + 'px;top:' + box.top + 'px;width:' + Math.max(0, viewW - box.left - box.width) + 'px;height:' + box.height + 'px;';
    }
    dialog.place = place;
    dialog.img.onload = place;
    dialog.img.src = spec.src;
    dialog.root.hidden = false;
    if (dialog.img.complete && dialog.img.naturalWidth) place();
    dialog.crop.onpointerdown = function (event) {
      var corner = event.target.getAttribute && event.target.getAttribute('data-corner');
      if (event.target !== dialog.window && !corner) return;
      event.preventDefault();
      drag = { x: event.clientX, y: event.clientY, frame: frame, pointer: event.pointerId, corner: corner || '' };
      dialog.crop.setPointerCapture(event.pointerId);
    };
    dialog.crop.onpointermove = function (event) {
      if (!drag || drag.pointer !== event.pointerId) return;
      var viewW = dialog.img.offsetWidth;
      var viewH = dialog.img.offsetHeight;
      var imageW = dialog.img.naturalWidth;
      var imageH = dialog.img.naturalHeight;
      var dx = event.clientX - drag.x;
      var dy = event.clientY - drag.y;
      frame = drag.corner
        ? window.ImgFrame.resize(drag.frame, drag.corner, dx, dy, imageW, imageH, viewW, viewH, ratio)
        : window.ImgFrame.move(drag.frame, dx, dy, imageW, imageH, viewW, viewH, ratio);
      place();
    };
    function endDrag(event) {
      if (!drag || (event && drag.pointer !== event.pointerId)) return;
      drag = null;
    }
    dialog.crop.onpointerup = endDrag;
    dialog.crop.onpointercancel = endDrag;
    dialog.root.querySelector('[data-reset]').onclick = function () {
      frame = window.ImgFrame.normalize(null);
      place();
    };
    dialog.root.querySelector('[data-done]').onclick = function () {
      dialog.root.hidden = true;
      spec.onDone(window.ImgFrame.normalize(frame));
    };
  }
  function thumbButton(src, onClick) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-thumb-btn';
    button.setAttribute('aria-label', 'Preview and reframe photo');
    var img = document.createElement('img');
    img.alt = '';
    img.className = 'studio-thumb';
    button.appendChild(img);
    button.addEventListener('click', onClick);
    if (src) img.src = src;
    img.hidden = !src;
    return button;
  }
  function photoCell(row) {
    var cell = document.createElement('td');
    cell.className = 'studio-photo-cell';
    var frameInput = document.createElement('input');
    frameInput.type = 'hidden';
    frameInput.dataset.field = 'img_frame';
    frameInput.value = row.img_frame ? JSON.stringify(row.img_frame) : '';
    var thumb = thumbButton(photoSrc(row.img), function () {
      openPhotoFrame({
        src: photoSrc(cell.querySelector('[data-field="img"]').textContent),
        frame: frameInput.value,
        shape: 'revision',
        fit: row.published && row.published.cutout ? 'contain' : 'cover',
        cutout: !!(row.published && row.published.cutout),
        onDone: function (frame) {
          frameInput.value = JSON.stringify(frame);
          row.img_frame = frame;
          saveLessonFrame(row);
        }
      });
    });
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
    cell.appendChild(thumb);
    cell.appendChild(frameInput);
    cell.appendChild(path);
    cell.appendChild(button);
    cell.appendChild(picker);
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
    path.textContent = picture.src || '';
    var thumb = thumbButton(photoSrc(picture.src), function () {
      var current = path.textContent.trim();
      openPhotoFrame({
        src: photoSrc(current),
        frame: picture.frame,
        shape: place().mode === 'chat' ? 'chat' : 'grammar',
        fit: 'contain',
        onDone: function (frame) {
          picture = { src: current, frame: frame, kind: picture.kind };
          saveGrammarPicture(row, picture);
        }
      });
    });
    path.addEventListener('paste', plainPaste);
    path.addEventListener('input', function () {
      var img = thumb.querySelector('img');
      var src = photoSrc(path.textContent);
      img.hidden = !src;
      if (src) img.src = src;
    });
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
      if (!file) return;
      uploadPhoto(file, row.id, cell);
    });
    cell.addEventListener('studio-photo', function (event) {
      path.textContent = event.detail;
      picture = { src: event.detail, frame: picture.frame, kind: picture.kind };
      saveGrammarPicture(row, picture);
    });
    cell.appendChild(thumb);
    cell.appendChild(path);
    cell.appendChild(button);
    cell.appendChild(picker);
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
    var show = here.section === 'practice' && here.mode === 'letters';
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
    var thumb = thumbButton(photoSrc(row.extra && row.extra.img), function () {
      openPhotoFrame({
        src: photoSrc(path.textContent),
        frame: row.extra && row.extra.frame,
        shape: 'match',
        fit: 'contain',
        onDone: function (frame) {
          row.extra = Object.assign({}, row.extra || {}, { frame: frame, img: path.textContent.trim() });
          savePracticeFrame(row);
        }
      });
    });
    var img = thumb.querySelector('img');
    path.addEventListener('input', function () {
      var src = photoSrc(path.textContent);
      img.hidden = !src;
      if (src) img.src = src;
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
      if (!data.img_frame) delete data.img_frame;
      else {
        try { data.img_frame = JSON.parse(data.img_frame); }
        catch (error) { delete data.img_frame; }
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
  function load(doneMessage) {
    var here = place();
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
    var saved = savedPlace();
    $('filter-section').value = saved.section;
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
    ['filter-book', 'filter-series', 'filter-term', 'filter-level', 'filter-unit', 'filter-section', 'filter-kind', 'filter-mode', 'filter-difficulty', 'filter-set'].forEach(function (id) {
      $(id).addEventListener('change', function () {
        if (id === 'filter-book') syncSeries();
        if (id === 'filter-section' || id === 'filter-kind' || id === 'filter-mode') syncMode();
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
    var tableCopy = $('studio-copy-path');
    if (tableCopy) {
      tableCopy.addEventListener('click', function () {
        copyStudioText(window.StudioDraft.studioPath(place()), tableCopy);
      });
    }
    var opening = place();
    var openingSpec = opening.section === 'practice' ? practiceColumns(opening) : revisionColumns(opening);
    setColumns(openingSpec.shape, openingSpec.columns);
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
  window.RevisionStudio = { boot: boot, openPhotoFrame: openPhotoFrame };
  if (!window.STUDIO_TEST) boot();
})();
