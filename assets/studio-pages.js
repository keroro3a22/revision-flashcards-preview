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
    var focus = hooks.focus || '';
    var focused = hooks.focused || function () {};
    var api = window.SitePages;
    if (!api) { say('The page tools did not load.'); return; }
    say('Loading…');
    var unitId = place.unit === 'home' ? 'home' : place.unit;
    $('studio-empty').hidden = true;
    $('studio-new').hidden = true;
    var cards = client.from('lesson_cards').select('unit_id,track,n,en,img,img_frame,status')
      .eq('book', place.book).eq('series', place.series).eq('term', place.term).eq('level', place.level);
    if (unitId !== 'home') cards = cards.eq('unit_id', unitId);
    Promise.all([
      client.from('site_pages').select('id,unit_id,slot,label,note,image,image_frame,status,published')
        .eq('book', place.book).eq('series', place.series).eq('term', place.term).eq('level', place.level)
        .eq('unit_id', unitId),
      cards.limit(2000)
    ]).then(function (results) {
      if (results[0].error) { say(results[0].error.message); return; }
      var lessons = results[1].error ? [] : (results[1].data || []);
      render(client, place, unitId, results[0].data || [], lessons, say, focus, focused);
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

  function render(client, place, unitId, rows, lessons, say, focus, focused) {
    var head = $('studio-head');
    var body = $('studio-rows');
    if (window.StudioDraft && window.StudioDraft.mountStudioColumns) {
      window.StudioDraft.mountStudioColumns($('studio-table'), head, pageColumns(), 'pages', window.localStorage);
    }
    body.replaceChildren();
    var publishedLessons = lessons.filter(function (card) { return card.status === 'published'; });
    var hit = null;
    window.SitePages.slotsFor(unitId).forEach(function (slot) {
      var row = rows.filter(function (item) { return item.slot === slot.id; })[0] || null;
      var fallback = window.SitePages.defaults(place, unitId, slot.id, publishedLessons);
      var tr = line(client, place, unitId, slot, row, fallback, say);
      if (focus && slot.id === focus) hit = tr;
      body.appendChild(tr);
    });
    if (hit && window.RevisionStudio && window.RevisionStudio.markPathRow) window.RevisionStudio.markPathRow(hit);
    if (focus) focused();
    say('Empty fields keep the default. Publish is what students see.');
  }

  function shown(stored, fallback) {
    return stored ? stored : fallback;
  }

  function line(client, place, unitId, slot, row, fallback, say) {
    var tr = document.createElement('tr');
    tr.dataset.slot = slot.id;
    if (!row || row.status !== 'published') tr.classList.add('is-draft');
    var name = document.createElement('td');
    name.textContent = slot.name;
    tr.appendChild(name);
    tr.appendChild(photoCell(client, row, fallback, slot, say, unitId));
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

  function photoCell(client, row, fallback, slot, say, unitId) {
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
    path.dataset.src = stored || fallback.image || '';
    path.dataset.picked = stored ? '1' : '';
    path.textContent = path.dataset.src;
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
      var src = path.dataset.src || textOf(path);
      var next = currentFrame();
      preview.style.background = next && window.ImgFrame ? window.ImgFrame.normalize(next).bg : '#ffffff';
      preview.style.aspectRatio = String(ratio);
      img.classList.remove('is-cropped');
      ['--crop-left', '--crop-top', '--crop-width', '--crop-height'].forEach(function (name) {
        img.style.removeProperty(name);
      });
      if (!src) {
        img.hidden = true;
        img.removeAttribute('src');
        return;
      }
      img.hidden = false;
      function framed() {
        if (next && window.ImgFrame) window.ImgFrame.apply(img, next, ratio);
      }
      img.onload = framed;
      if (img.getAttribute('src') !== src) img.src = src;
      else framed();
    }
    thumb.addEventListener('click', function () {
      if (!window.RevisionStudio || !textOf(path)) return;
      window.RevisionStudio.openPhotoFrame({
        src: path.dataset.src || textOf(path),
        frame: currentFrame(),
        ratio: ratio,
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
      if (!window.RevisionStudioLibrary) { say('The library did not load.'); return; }
      window.RevisionStudioLibrary.open(client, {
        say: say,
        folder: unitId,
        onPick: function (src) {
          path.dataset.src = src;
          path.dataset.picked = '1';
          path.textContent = src;
          frameInput.value = '';
          paint();
        }
      });
    });
    var clear = document.createElement('button');
    clear.type = 'button';
    clear.textContent = 'Use default photo';
    clear.addEventListener('click', function () {
      path.dataset.src = fallback.image || '';
      path.dataset.picked = '';
      path.textContent = path.dataset.src;
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
      var imageText = (imageField && imageField.dataset.src) || textOf(imageField);
      var fallbackImage = imageField && imageField.dataset.default || '';
      var picked = imageField && imageField.dataset.picked === '1';
      data.image = picked || imageText !== fallbackImage ? imageText : '';
      if (frameField && frameField.value) {
        try { data.frame = JSON.parse(frameField.value); } catch (error) { data.frame = null; }
      }
      return data;
    }
    function copyText(text, button) {
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
      try { document.execCommand('copy'); } catch (error) {}
      area.remove();
      mark();
    }
    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'studio-copy';
    copy.textContent = 'Copy path';
    copy.addEventListener('click', function () {
      copyText(window.StudioDraft.studioPath(place, { slot: slot.id }), copy);
    });
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
    td.appendChild(copy);
    td.appendChild(save);
    td.appendChild(publish);
    if (row && row.status === 'published') td.appendChild(retractButton());
    return td;
  }

  window.RevisionStudioPages = { load: load, escapeHtml: escapeHtml };
})();
