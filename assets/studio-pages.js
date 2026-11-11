/* The Pages table: unit title, four doors, and the Get started lines. */
(function () {
  function $(id) { return document.getElementById(id); }
  function textOf(field) {
    return String(field && (field.textContent || '') || '').replace(/\u00a0/g, ' ').trim();
  }
  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function load(client, place, hooks) {
    var say = hooks.say || function () {};
    var api = window.SitePages;
    if (!api) { say('The page tools did not load.'); return; }
    say('Loading…');
    var unitId = place.unit === 'home' ? 'home' : place.unit;
    $('studio-empty').hidden = true;
    $('studio-new').hidden = true;
    Promise.all([
      client.from('site_pages').select('id,unit_id,slot,label,note,image,status,published')
        .eq('book', place.book).eq('series', place.series).eq('term', place.term).eq('level', place.level)
        .eq('unit_id', unitId),
      client.from('lesson_cards_live').select('unit_id,track,n,img')
        .eq('book', place.book).eq('series', place.series).eq('term', place.term).eq('level', place.level)
        .eq('unit_id', unitId).limit(500)
    ]).then(function (results) {
      if (results[0].error) { say(results[0].error.message); return; }
      var lessons = results[1].error ? [] : (results[1].data || []);
      render(client, place, unitId, results[0].data || [], lessons, say);
    });
  }

  function render(client, place, unitId, rows, lessons, say) {
    var head = $('studio-head');
    var body = $('studio-rows');
    head.innerHTML = '<tr><th>Line</th><th>Photo</th><th>Name</th><th>Words</th><th>State</th><th></th></tr>';
    body.replaceChildren();
    window.SitePages.slotsFor(unitId).forEach(function (slot) {
      var row = rows.filter(function (item) { return item.slot === slot.id; })[0] || null;
      var fallback = window.SitePages.defaults(place, unitId, slot.id, lessons);
      body.appendChild(line(client, place, unitId, slot, row, fallback, say));
    });
    say('Empty fields keep the default. Publish is what students see.');
  }

  function shown(stored, fallback) {
    return stored ? stored : fallback;
  }

  function line(client, place, unitId, slot, row, fallback, say) {
    var tr = document.createElement('tr');
    if (!row || row.status !== 'published') tr.classList.add('is-draft');
    var name = document.createElement('td');
    name.textContent = slot.name;
    tr.appendChild(name);
    tr.appendChild(photoCell(client, row, fallback, unitId, say));
    tr.appendChild(editCell('label', shown(row && row.label, fallback.label), fallback.label));
    tr.appendChild(editCell('note', shown(row && row.note, fallback.note), fallback.note));
    var state = document.createElement('td');
    state.className = 'is-state';
    state.textContent = row && row.status === 'published' ? 'Published' : 'Draft';
    tr.appendChild(state);
    tr.appendChild(actions(client, place, unitId, slot, row, tr, say));
    return tr;
  }

  function editCell(field, value, fallback) {
    var td = document.createElement('td');
    var box = document.createElement('div');
    box.className = 'studio-edit';
    box.contentEditable = 'true';
    box.spellcheck = false;
    box.dataset.field = field;
    box.dataset.default = fallback || '';
    box.textContent = value || '';
    td.appendChild(box);
    return td;
  }

  function photoCell(client, row, fallback, unitId, say) {
    var td = document.createElement('td');
    td.className = 'studio-photo-cell';
    var stored = row && row.image ? row.image : '';
    var preview = document.createElement('img');
    preview.className = 'studio-page-photo';
    preview.alt = '';
    var path = document.createElement('div');
    path.className = 'studio-edit';
    path.contentEditable = 'true';
    path.spellcheck = false;
    path.dataset.field = 'image';
    path.dataset.default = fallback.image || '';
    path.textContent = stored || fallback.image || '';
    function paint() {
      var src = window.SitePages.imageSrc(unitId, textOf(path));
      preview.hidden = !src;
      if (src) preview.src = src;
    }
    path.addEventListener('input', paint);
    var file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/png,image/jpeg,image/webp,image/gif';
    file.hidden = true;
    var change = document.createElement('button');
    change.type = 'button';
    change.textContent = 'Change photo';
    change.addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () {
      var picked = file.files && file.files[0];
      file.value = '';
      if (!picked) return;
      upload(client, picked, say, function (url) {
        path.textContent = url;
        paint();
      });
    });
    var clear = document.createElement('button');
    clear.type = 'button';
    clear.textContent = 'Use default photo';
    clear.addEventListener('click', function () {
      path.textContent = fallback.image || '';
      paint();
    });
    paint();
    td.appendChild(preview);
    td.appendChild(path);
    td.appendChild(change);
    td.appendChild(clear);
    return td;
  }

  function upload(client, file, say, done) {
    var ext = ((file.name || '').split('.').pop() || '').toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (!/^(jpg|png|gif|webp)$/.test(ext)) { say('Use a jpg, png, gif, or webp photo.'); return; }
    var storagePath = 'cards/pages/' + Date.now() + '.' + ext;
    say('Uploading photo…');
    client.storage.from('lesson-media').upload(storagePath, file, {
      contentType: file.type || 'image/' + (ext === 'jpg' ? 'jpeg' : ext),
      upsert: false
    }).then(function (result) {
      if (result.error) { say(result.error.message); return; }
      var pub = client.storage.from('lesson-media').getPublicUrl(storagePath);
      var url = pub && pub.data && pub.data.publicUrl;
      if (!url) { say('The photo uploaded, but the address was missing.'); return; }
      done(url);
      say('Photo is in this row. Publish to show it on the site.');
    });
  }

  function keep(field) {
    var value = textOf(field);
    return value === (field.dataset.default || '') ? '' : value;
  }

  function actions(client, place, unitId, slot, row, tr, say) {
    var td = document.createElement('td');
    var save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Save draft';
    var publish = document.createElement('button');
    publish.type = 'button';
    publish.textContent = 'Publish';
    function read() {
      var data = { label: '', note: '', image: '' };
      tr.querySelectorAll('[data-field]').forEach(function (field) {
        data[field.dataset.field] = keep(field);
      });
      return data;
    }
    function store(status) {
      var data = read();
      var patch = {
        book: place.book,
        series: place.series,
        term: place.term,
        level: place.level,
        unit_id: unitId,
        slot: slot.id,
        label: data.label,
        note: data.note,
        image: data.image,
        status: status
      };
      if (status === 'published') patch.published = { label: data.label, note: data.note, image: data.image };
      say('Saving…');
      var query = row && row.id
        ? client.from('site_pages').update(patch).eq('id', row.id).select('id,status,published')
        : client.from('site_pages').insert(patch).select('id,status,published');
      query.then(function (result) {
        if (result.error) { say(result.error.message); return; }
        var saved = result.data && result.data[0];
        if (saved) {
          row = Object.assign({}, row || {}, patch, saved);
        }
        tr.classList.toggle('is-draft', status !== 'published');
        tr.querySelector('.is-state').textContent = status === 'published' ? 'Published' : 'Draft';
        var existing = td.querySelector('.studio-retract');
        if (status === 'published' && !existing) td.appendChild(retractButton());
        if (status !== 'published' && existing) existing.remove();
        say(status === 'published' ? 'Published. Students see it after a refresh.' : 'Draft saved. Students do not see it yet.');
      });
    }
    save.addEventListener('click', function () { store('draft'); });
    publish.addEventListener('click', function () {
      if (!window.confirm('Publish this line? Students see it after a refresh.')) return;
      store('published');
    });
    function retractButton() {
      var retract = document.createElement('button');
      retract.type = 'button';
      retract.className = 'studio-retract';
      retract.textContent = 'Retract';
      retract.addEventListener('click', function () {
        if (!row.id) return;
        if (!window.confirm('Take this row off the live site? It stays in this table as a draft.')) return;
        say('Taking it off the site…');
        client.from('site_pages').update({ status: 'draft' }).eq('id', row.id).select('id,status').then(function (result) {
          if (result.error) { say(result.error.message); return; }
          row.status = 'draft';
          tr.classList.add('is-draft');
          tr.querySelector('.is-state').textContent = 'Draft';
          retract.remove();
          say('Taken off the site. Students see the default after a refresh.');
        });
      });
      return retract;
    }
    td.appendChild(save);
    td.appendChild(publish);
    if (row && row.status === 'published') td.appendChild(retractButton());
    return td;
  }

  window.RevisionStudioPages = { load: load, escapeHtml: escapeHtml };
})();
