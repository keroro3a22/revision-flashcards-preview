/* Table for the revision cards. Save keeps a draft. Publish is what the site reads. */
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
    { id: 'dictation3', label: 'Dictation' }
  ];
  var TEXT = ['en', 'zh', 'pos', 'syllables', 'highlight', 'ex_en', 'ex_zh', 'adv_en', 'adv_zh'];
  var WIDE = { en: true, zh: true, ex_en: true, ex_zh: true, adv_en: true, adv_zh: true };

  var client = null;
  var rows = [];

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
      unit: $('filter-unit').value
    };
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
  function box(name, value, wide) {
    var cell = document.createElement('td');
    cell.className = wide ? 'is-wide' : 'is-mid';
    var field = document.createElement('div');
    field.className = 'studio-edit';
    field.contentEditable = 'true';
    field.spellcheck = true;
    field.dataset.field = name;
    field.textContent = cellText(value);
    field.addEventListener('paste', plainPaste);
    cell.appendChild(field);
    return cell;
  }
  function photoSrc(path) {
    var value = cellText(path).trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
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
  function render() {
    var body = $('studio-rows');
    body.replaceChildren();
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      tr.dataset.id = String(row.id);
      tr.appendChild(photoCell(row));
      var number = document.createElement('td');
      number.className = 'is-num';
      number.textContent = String(row.n);
      tr.appendChild(number);
      TEXT.forEach(function (name) {
        tr.appendChild(box(name, row[name], !!WIDE[name]));
      });
      var state = document.createElement('td');
      state.className = 'is-state';
      state.textContent = row.status === 'published' ? 'Published' : 'Draft';
      tr.appendChild(state);
      var actions = document.createElement('td');
      actions.className = 'is-actions';
      var save = document.createElement('button');
      save.type = 'button';
      save.textContent = 'Save draft';
      save.addEventListener('click', function () { store(tr, 'draft'); });
      var publish = document.createElement('button');
      publish.type = 'button';
      publish.textContent = 'Publish';
      publish.addEventListener('click', function () { store(tr, 'published'); });
      actions.appendChild(save);
      actions.appendChild(publish);
      tr.appendChild(actions);
      body.appendChild(tr);
    });
    $('studio-empty').hidden = rows.length > 0;
  }

  function readRow(tr) {
    var data = {};
    tr.querySelectorAll('[data-field]').forEach(function (field) {
      data[field.dataset.field] = cellText(field.textContent).trim();
    });
    var row = rows.filter(function (item) { return String(item.id) === tr.dataset.id; })[0];
    data.audio = row && row.audio ? row.audio : '';
    data.video = row && row.video ? row.video : '';
    return data;
  }
  function store(tr, status) {
    var data = readRow(tr);
    var patch = Object.assign({ status: status }, data);
    if (status === 'published') patch.published = data;
    say('Saving…');
    client.from('lesson_cards').update(patch).eq('id', Number(tr.dataset.id)).select('id,status').then(function (result) {
      if (result.error) { say(result.error.message); return; }
      var row = rows.filter(function (item) { return String(item.id) === tr.dataset.id; })[0];
      if (row) {
        Object.assign(row, data);
        row.status = status;
      }
      tr.querySelector('.is-state').textContent = status === 'published' ? 'Published' : 'Draft';
      say(status === 'published' ? 'Published. Refresh the unit page to see it.' : 'Draft saved. The site is unchanged.');
    });
  }

  function load() {
    var here = place();
    say('Loading…');
    client.from('lesson_cards')
      .select('id,n,status,en,zh,pos,syllables,highlight,ex_en,ex_zh,adv_en,adv_zh,img,audio,video')
      .eq('book', here.book).eq('series', here.series).eq('term', here.term)
      .eq('level', here.level).eq('unit_id', here.unit)
      .order('n', { ascending: true })
      .then(function (result) {
        if (result.error) { say(result.error.message); return; }
        rows = result.data || [];
        render();
        say(rows.length ? '' : 'No cards for this book, series, term, and unit yet.');
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

  function boot() {
    wireBack();
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
        ['filter-book', 'filter-series', 'filter-term', 'filter-level', 'filter-unit'].forEach(function (id) {
          $(id).addEventListener('change', function () {
            if (id === 'filter-book') syncSeries();
            load();
          });
        });
        load();
      });
    });
  }
  boot();
})();
