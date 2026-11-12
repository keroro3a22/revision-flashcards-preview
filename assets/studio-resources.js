/* The Resources table: papers for the current book. Download stays locked. */
(function () {
  function $(id) { return document.getElementById(id); }
  function textOf(field) {
    return String(field && (field.textContent || '') || '').replace(/\u00a0/g, ' ').trim();
  }

  function load(client, place, hooks) {
    var say = hooks.say || function () {};
    say('Loading…');
    $('studio-empty').hidden = true;
    $('studio-new').hidden = false;
    client.from('resources').select('id,title,kind,price,note,file_path,status,published')
      .eq('book', place.book).eq('series', place.series).eq('term', place.term).eq('level', place.level)
      .order('id', { ascending: true })
      .then(function (result) {
        if (result.error) { say(result.error.message); return; }
        render(client, place, result.data || [], say);
      });
  }

  function columns() {
    return [
      { col: 'col-page-name', key: 'title', label: 'Name' },
      { col: 'col-short', key: 'kind', label: 'Kind' },
      { col: 'col-short', key: 'price', label: 'Price' },
      { col: 'col-page-words', key: 'file', label: 'File' },
      { col: 'col-state', key: 'state', label: 'State' },
      { col: 'col-actions', key: 'actions', label: '' }
    ];
  }

  function render(client, place, rows, say) {
    var head = $('studio-head');
    var body = $('studio-rows');
    if (window.StudioDraft && window.StudioDraft.mountStudioColumns) {
      window.StudioDraft.mountStudioColumns($('studio-table'), head, columns(), 'resources', window.localStorage);
    }
    body.replaceChildren();
    rows.forEach(function (row) { body.appendChild(line(client, place, row, say)); });
    say(rows.length ? 'Download stays locked until payment is connected.' : 'No papers yet. New draft adds one.');
  }

  function line(client, place, row, say) {
    var tr = document.createElement('tr');
    tr.dataset.id = String(row.id);
    if (row.status !== 'published') tr.classList.add('is-draft');
    tr.appendChild(edit('title', row.title));
    tr.appendChild(kindCell(row.kind));
    tr.appendChild(edit('price', row.price));
    tr.appendChild(edit('file', row.file_path));
    var state = document.createElement('td');
    state.className = 'is-state';
    state.textContent = row.status === 'published' ? 'Published' : 'Draft';
    tr.appendChild(state);
    tr.appendChild(actions(client, place, row, tr, say));
    return tr;
  }

  function edit(field, value) {
    var td = document.createElement('td');
    var box = document.createElement('div');
    box.className = 'studio-edit';
    box.contentEditable = 'true';
    box.spellcheck = false;
    box.dataset.field = field;
    box.textContent = value == null ? '' : String(value);
    td.appendChild(box);
    return td;
  }

  function kindCell(kind) {
    var td = document.createElement('td');
    var select = document.createElement('select');
    select.dataset.field = 'kind';
    [['mock-test', 'Mock test'], ['practice-paper', 'Practice paper']].forEach(function (item) {
      var option = document.createElement('option');
      option.value = item[0];
      option.textContent = item[1];
      if (item[0] === kind) option.selected = true;
      select.appendChild(option);
    });
    td.appendChild(select);
    return td;
  }

  function read(tr) {
    var data = { title: '', kind: 'mock-test', price: 0, file: '' };
    tr.querySelectorAll('[data-field]').forEach(function (field) {
      if (field.dataset.field === 'kind') data.kind = field.value === 'practice-paper' ? 'practice-paper' : 'mock-test';
      else data[field.dataset.field] = textOf(field);
    });
    var price = Number(data.price);
    data.price = isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : 0;
    return data;
  }

  function actions(client, place, row, tr, say) {
    var td = document.createElement('td');
    function store(status) {
      var data = read(tr);
      var patch = {
        book: place.book,
        series: place.series,
        term: place.term,
        level: place.level,
        title: data.title,
        kind: data.kind,
        price: data.price,
        file_path: data.file,
        status: status
      };
      if (status === 'published') {
        patch.published = { title: data.title, kind: data.kind, price: data.price, note: '' };
      }
      say('Saving…');
      client.from('resources').update(patch).eq('id', row.id).then(function (result) {
        if (result.error) { say(result.error.message); return; }
        row.status = status;
        tr.classList.toggle('is-draft', status !== 'published');
        tr.querySelector('.is-state').textContent = status === 'published' ? 'Published' : 'Draft';
        say(status === 'published' ? 'Published. Students can see the title and price. Download stays locked.' : 'Draft saved.');
      });
    }
    var save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Save draft';
    save.addEventListener('click', function () { store('draft'); });
    var publish = document.createElement('button');
    publish.type = 'button';
    publish.textContent = 'Publish';
    publish.addEventListener('click', function () {
      if (!window.confirm('Publish this paper? Students see the title and price. Download stays locked.')) return;
      store('published');
    });
    td.appendChild(save);
    td.appendChild(publish);
    if (row.status === 'published') {
      var retract = document.createElement('button');
      retract.type = 'button';
      retract.textContent = 'Retract';
      retract.addEventListener('click', function () {
        if (!window.confirm('Take this paper off the site?')) return;
        store('draft');
      });
      td.appendChild(retract);
    }
    return td;
  }

  function create(client, place, say) {
    say('Adding a paper…');
    client.from('resources').insert({
      book: place.book,
      series: place.series,
      term: place.term,
      level: place.level,
      title: '',
      kind: 'mock-test',
      price: 0,
      status: 'draft'
    }).select('id').then(function (result) {
      if (result.error) { say(result.error.message); return; }
      load(client, place, { say: say });
    });
  }

  window.RevisionStudioResources = { load: load, create: create };
})();
