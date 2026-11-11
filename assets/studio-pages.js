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
    var cards = client.from('lesson_cards').select('unit_id,track,n,en,img,img_frame,status')
      .eq('book', place.book).eq('series', place.series).eq('term', place.term).eq('level', place.level);
    var practice = client.from('practice_items').select('unit_id,mode,n,extra,published')
      .eq('book', place.book).eq('series', place.series).eq('term', place.term).eq('level', place.level)
      .eq('track', 'grammar');
    if (unitId !== 'home') {
      cards = cards.eq('unit_id', unitId);
      practice = practice.eq('unit_id', unitId);
    }
    Promise.all([
      client.from('site_pages').select('id,unit_id,slot,label,note,image,image_frame,status,published')
        .eq('book', place.book).eq('series', place.series).eq('term', place.term).eq('level', place.level)
        .eq('unit_id', unitId),
      cards.limit(2000),
      practice.limit(2000)
    ]).then(function (results) {
      if (results[0].error) { say(results[0].error.message); return; }
      var lessons = results[1].error ? [] : (results[1].data || []);
      var grammar = results[2].error ? [] : (results[2].data || []);
      render(client, place, unitId, results[0].data || [], lessons, grammar, say);
    });
  }

  function pageColumns() {
    return [
      { col: 'col-page-line', key: 'line', label: 'Line' },
      { col: 'col-page-photo', key: 'photo', label: 'Photo' },
      { col: 'col-page-name', key: 'name', label: 'Name' },
      { col: 'col-page-words', key: 'words', label: 'Words' },
      { col: 'col-state', key: 'state', label: 'State' },
      { col: 'col-actions', key: 'actions', label: '' }
    ];
  }

  function render(client, place, unitId, rows, lessons, grammar, say) {
    var head = $('studio-head');
    var body = $('studio-rows');
    if (window.StudioDraft && window.StudioDraft.mountStudioColumns) {
      window.StudioDraft.mountStudioColumns($('studio-table'), head, pageColumns(), 'pages', window.localStorage);
    }
    body.replaceChildren();
    var publishedLessons = lessons.filter(function (card) { return card.status === 'published'; });
    var library = photoLibrary(lessons, grammar);
    window.SitePages.slotsFor(unitId).forEach(function (slot) {
      var row = rows.filter(function (item) { return item.slot === slot.id; })[0] || null;
      var fallback = window.SitePages.defaults(place, unitId, slot.id, publishedLessons);
      body.appendChild(line(client, place, unitId, slot, row, fallback, library, say));
    });
    say('Empty fields keep the default. Publish is what students see.');
  }

  function shown(stored, fallback) {
    return stored ? stored : fallback;
  }

  function line(client, place, unitId, slot, row, fallback, library, say) {
    var tr = document.createElement('tr');
    if (!row || row.status !== 'published') tr.classList.add('is-draft');
    var name = document.createElement('td');
    name.textContent = slot.name;
    tr.appendChild(name);
    tr.appendChild(photoCell(row, fallback, slot, library, say));
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

  function librarySrc(unitId, img) {
    var value = String(img || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (/^illust\//.test(value)) return 'practice/grammar/' + value;
    if (value.indexOf('/') >= 0) return value;
    return (unitId ? unitId + '/' : '') + value;
  }

  function photoLibrary(cards, practices) {
    var seen = {};
    var list = [];
    function add(src, label, frame) {
      if (!src || seen[src]) return;
      seen[src] = true;
      list.push({ src: src, label: label, frame: frame || null });
    }
    (cards || []).forEach(function (card) {
      var src = librarySrc(card.unit_id, card.img);
      if (!src) return;
      var kind = card.track === 'grammar' ? 'Grammar' : 'Vocab';
      add(src, kind + ' ' + card.n + (card.en ? ' · ' + card.en : ''), card.img_frame);
    });
    (practices || []).forEach(function (row) {
      var extra = row.extra || {};
      var published = row.published || {};
      var item = extra.item || published.item || {};
      var meta = extra.meta || published.meta || {};
      var mode = String(row.mode || 'Grammar');
      mode = mode.charAt(0).toUpperCase() + mode.slice(1);
      if (item.img) add(librarySrc(row.unit_id, item.img), mode + ' ' + row.n, item.frame);
      if (meta.hero) add(librarySrc(row.unit_id, meta.hero), mode + ' hero', meta.frame);
    });
    return list;
  }

  function photoCell(row, fallback, slot, library, say) {
    var td = document.createElement('td');
    td.className = 'studio-photo-cell';
    var ratio = window.SitePages.photoRatio(slot.id);
    var stored = row && row.image ? row.image : '';
    var frame = row && (row.image_frame || (row.published && row.published.frame)) || null;
    var path = document.createElement('div');
    path.className = 'studio-edit';
    path.hidden = true;
    path.dataset.field = 'image';
    path.dataset.default = fallback.image || '';
    path.textContent = stored || fallback.image || '';
    var frameInput = document.createElement('input');
    frameInput.type = 'hidden';
    frameInput.dataset.field = 'frame';
    frameInput.value = frame ? JSON.stringify(frame) : '';
    var preview = document.createElement('span');
    preview.className = 'studio-thumb-preview';
    var img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    preview.appendChild(img);
    var thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'studio-thumb-btn';
    thumb.setAttribute('aria-label', 'Preview and reframe photo');
    thumb.appendChild(preview);
    function currentFrame() {
      if (!frameInput.value) return null;
      try { return JSON.parse(frameInput.value); } catch (error) { return null; }
    }
    function paint() {
      var src = textOf(path);
      var next = currentFrame();
      var bg = window.ImgFrame ? window.ImgFrame.normalize(next).bg : '#ffffff';
      preview.style.background = bg;
      preview.style.aspectRatio = String(ratio);
      if (!src) {
        img.hidden = true;
        img.removeAttribute('src');
        return;
      }
      img.hidden = false;
      img.onload = function () {
        if (window.ImgFrame) window.ImgFrame.apply(img, next, ratio);
      };
      if (img.getAttribute('src') !== src) img.src = src;
      else if (img.complete && img.naturalWidth && window.ImgFrame) window.ImgFrame.apply(img, next, ratio);
    }
    thumb.addEventListener('click', function () {
      if (!window.RevisionStudio || !textOf(path)) return;
      window.RevisionStudio.openPhotoFrame({
        src: textOf(path),
        frame: currentFrame(),
        shape: ratio === 1 ? 'revision' : 'grammar',
        onDone: function (next) {
          frameInput.value = JSON.stringify(next);
          paint();
        }
      });
    });
    var change = document.createElement('button');
    change.type = 'button';
    change.className = 'studio-upload';
    change.textContent = 'Change photo';
    change.addEventListener('click', function () {
      choosePhoto(library, ratio, say, function (item) {
        path.textContent = item.src;
        frameInput.value = item.frame ? JSON.stringify(item.frame) : '';
        paint();
      });
    });
    var clear = document.createElement('button');
    clear.type = 'button';
    clear.textContent = 'Use default photo';
    clear.addEventListener('click', function () {
      path.textContent = fallback.image || '';
      frameInput.value = '';
      paint();
    });
    paint();
    td.appendChild(thumb);
    td.appendChild(path);
    td.appendChild(frameInput);
    td.appendChild(change);
    td.appendChild(clear);
    return td;
  }

  function choosePhoto(library, ratio, say, onPick) {
    var root = document.createElement('div');
    root.className = 'studio-library';
    var card = document.createElement('div');
    card.className = 'studio-library-card';
    var title = document.createElement('p');
    title.className = 'studio-frame-title';
    title.textContent = 'Choose a photo from this unit';
    card.appendChild(title);
    if (!library.length) {
      var empty = document.createElement('p');
      empty.textContent = 'This unit has no photos yet.';
      card.appendChild(empty);
    }
    var grid = document.createElement('div');
    grid.className = 'studio-library-grid';
    library.forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'studio-library-item';
      var thumb = document.createElement('span');
      thumb.className = 'studio-thumb-preview';
      thumb.style.aspectRatio = String(ratio);
      var img = document.createElement('img');
      img.alt = '';
      img.src = item.src;
      thumb.appendChild(img);
      var caption = document.createElement('span');
      caption.textContent = item.label;
      button.appendChild(thumb);
      button.appendChild(caption);
      button.addEventListener('click', function () {
        root.remove();
        onPick(item);
      });
      img.addEventListener('load', function () {
        if (window.ImgFrame) window.ImgFrame.apply(img, item.frame, ratio);
      });
      grid.appendChild(button);
    });
    card.appendChild(grid);
    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', function () { root.remove(); });
    card.appendChild(cancel);
    root.appendChild(card);
    root.addEventListener('click', function (event) {
      if (event.target === root) root.remove();
    });
    document.body.appendChild(root);
    if (!library.length) say('This unit has no photos yet.');
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
      var data = { label: '', note: '', image: '', frame: null };
      tr.querySelectorAll('[data-field]').forEach(function (field) {
        if (field.dataset.field === 'image' || field.dataset.field === 'frame') return;
        data[field.dataset.field] = keep(field);
      });
      var imageField = tr.querySelector('[data-field="image"]');
      var frameField = tr.querySelector('[data-field="frame"]');
      var imageText = textOf(imageField);
      data.image = imageText === (imageField && imageField.dataset.default || '') ? '' : imageText;
      if (data.image && frameField && frameField.value) {
        try { data.frame = JSON.parse(frameField.value); } catch (error) { data.frame = null; }
      }
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
        image_frame: data.frame,
        status: status
      };
      if (status === 'published') patch.published = { label: data.label, note: data.note, image: data.image, frame: data.frame };
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
