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
  var MEDIA = ['img', 'audio', 'video'];

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

  function fieldsOf(row) {
    var data = {};
    TEXT.concat(MEDIA).forEach(function (name) { data[name] = row[name] || ''; });
    return data;
  }
  function input(name, value) {
    var field = document.createElement('input');
    field.dataset.field = name;
    field.value = value || '';
    field.setAttribute('aria-label', name);
    return field;
  }
  function render() {
    var body = $('studio-rows');
    body.replaceChildren();
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      tr.dataset.id = String(row.id);
      var number = document.createElement('td');
      number.textContent = String(row.n);
      tr.appendChild(number);
      TEXT.forEach(function (name) {
        var cell = document.createElement('td');
        cell.appendChild(input(name, row[name]));
        tr.appendChild(cell);
      });
      var media = document.createElement('td');
      var details = document.createElement('details');
      var summary = document.createElement('summary');
      summary.textContent = 'Image, audio, video paths';
      details.appendChild(summary);
      MEDIA.forEach(function (name) {
        var label = document.createElement('label');
        label.textContent = name;
        label.appendChild(input(name, row[name]));
        details.appendChild(label);
      });
      media.appendChild(details);
      tr.appendChild(media);
      var state = document.createElement('td');
      state.textContent = row.status === 'published' ? 'Published' : 'Draft';
      tr.appendChild(state);
      var actions = document.createElement('td');
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
    tr.querySelectorAll('[data-field]').forEach(function (field) { data[field.dataset.field] = field.value; });
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
      tr.querySelector('td:nth-last-child(2)').textContent = status === 'published' ? 'Published' : 'Draft';
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

  function boot() {
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
