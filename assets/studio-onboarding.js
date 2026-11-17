/* Onboarding pictures: publisher, book name, then level.
   An empty photo keeps the built-in picture. Students read onboarding_images_live. */
(function () {
  var RATIO = 4 / 3;
  var sortKey = '';
  var sortDir = 'asc';
  var view = { client: null, place: null, rows: [], say: function () {}, focus: '', focused: function () {} };

  function $(id) { return document.getElementById(id); }
  function textOf(field) {
    return String(field && (field.textContent || '') || '').replace(/\u00a0/g, ' ').trim();
  }

  function slots() {
    var place = window.RevisionPlace;
    return place && place.onboardingPictures ? place.onboardingPictures() : [];
  }

  function stillHere() {
    var section = $('filter-section');
    var site = $('filter-site');
    return section && section.value === 'site' && site && site.value === 'onboarding';
  }

  function load(client, place, hooks) {
    var say = hooks.say || function () {};
    var focus = hooks.focus || '';
    var focused = hooks.focused || function () {};
    if (!slots().length) { say('The onboarding list did not load.'); if (focus) focused(); return; }
    say('Loading…');
    if ($('studio-empty')) $('studio-empty').hidden = true;
    if ($('studio-new')) $('studio-new').hidden = true;
    client.from('onboarding_images').select('id,image,image_frame,status,published').then(function (result) {
      if (!stillHere()) { if (focus) focused(); return; }
      if (result.error) { say(result.error.message); if (focus) focused(); return; }
      view.client = client;
      view.place = place;
      view.rows = result.data || [];
      view.say = say;
      view.focus = focus;
      view.focused = focused;
      render(client, place, view.rows, say, focus, focused);
    });
  }

  function columns() {
    return [
      { col: 'col-page-line', key: 'line', label: 'Line' },
      { col: 'col-page-name', key: 'publisher', label: 'Publisher' },
      { col: 'col-page-words', key: 'book', label: 'Book name' },
      { col: 'col-page-photo', key: 'photo', label: 'Photo' },
      { col: 'col-state', key: 'state', label: 'State' },
      { col: 'col-actions', key: 'actions', label: '' }
    ];
  }

  function wanted(review, row) {
    var published = !!(row && row.status === 'published');
    if (review === 'draft') return !published;
    if (review === 'published') return published;
    return true;
  }

  function render(client, place, rows, say, focus, focused) {
    var head = $('studio-head');
    var body = $('studio-rows');
    var review = $('filter-review') ? $('filter-review').value : 'all';
    if (window.StudioDraft && window.StudioDraft.mountStudioColumns) {
      window.StudioDraft.mountStudioColumns($('studio-table'), head, columns(), 'onboarding', window.localStorage);
    }
    body.replaceChildren();
    var byId = {};
    rows.forEach(function (row) { byId[row.id] = row; });
    var hit = null;
    var list = slots();
    if (sortKey && window.RevisionPlace && window.RevisionPlace.sortOnboarding) {
      list = window.RevisionPlace.sortOnboarding(list, sortKey, sortDir);
    }
    list.forEach(function (slot) {
      var row = byId[slot.id] || null;
      if (!wanted(review, row)) return;
      var tr = line(client, place, slot, row, say);
      if (focus && slot.id === focus) hit = tr;
      body.appendChild(tr);
    });
    if (hit && window.RevisionStudio && window.RevisionStudio.markPathRow) window.RevisionStudio.markPathRow(hit);
    if (focus) focused();
    armSort($('studio-head'));
    say('Empty photos keep the built-in picture. Publish is what students see. Sort with Publisher or Book name.');
  }

  function armSort(head) {
    if (!head) return;
    head.querySelectorAll('th').forEach(function (th) {
      var key = th.dataset.key;
      if (key !== 'publisher' && key !== 'book') return;
      var grip = th.querySelector('.studio-col-resize');
      var name = '';
      Array.prototype.forEach.call(th.childNodes, function (node) {
        if (node.nodeType === 3) name += node.textContent;
      });
      name = name.replace(/\s+/g, ' ').trim();
      Array.prototype.slice.call(th.childNodes).forEach(function (node) {
        if (node !== grip) node.remove();
      });
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'studio-sort';
      button.textContent = name + (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');
      button.addEventListener('click', function () {
        if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortKey = key; sortDir = 'asc'; }
        render(view.client, view.place, view.rows, view.say, '', function () {});
      });
      th.setAttribute('aria-sort', sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
      th.insertBefore(button, grip);
    });
  }

  function line(client, place, slot, row, say) {
    var tr = document.createElement('tr');
    tr.dataset.slot = slot.id;
    if (!row || row.status !== 'published') tr.classList.add('is-draft');
    var name = document.createElement('td');
    name.textContent = slot.name;
    tr.appendChild(name);
    tr.appendChild(plainCell(slot.publisher));
    tr.appendChild(plainCell(slot.bookName));
    tr.appendChild(photoCell(client, row, slot, say, place));
    var state = document.createElement('td');
    state.className = 'is-state';
    state.textContent = row && row.status === 'published' ? 'Published' : 'Draft';
    tr.appendChild(state);
    tr.appendChild(actions(client, slot, row, tr, say, place));
    return tr;
  }

  function plainCell(value) {
    var td = document.createElement('td');
    td.textContent = value || '';
    return td;
  }

  function photoCell(client, row, slot, say, place) {
    var td = document.createElement('td');
    td.className = 'studio-photo-cell';
    var stored = row && row.image ? row.image : '';
    var frame = row && (row.image_frame || (row.published && row.published.frame)) || null;
    var path = document.createElement('div');
    path.className = 'studio-edit';
    path.hidden = true;
    path.dataset.field = 'image';
    path.dataset.default = slot.image || '';
    path.dataset.src = stored || slot.image || '';
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
      preview.style.aspectRatio = String(RATIO);
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
        if (next && window.ImgFrame) window.ImgFrame.apply(img, next, RATIO);
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
        ratio: RATIO,
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
        place: {
          book: place.book,
          series: place.series,
          term: place.term,
          level: place.level,
          unit: ''
        },
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
    clear.className = 'studio-upload';
    clear.textContent = 'Use default photo';
    clear.addEventListener('click', function () {
      path.dataset.src = slot.image || '';
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

  function actions(client, slot, row, tr, say, place) {
    var td = document.createElement('td');
    td.className = 'is-actions';
    function read() {
      var imageField = tr.querySelector('[data-field="image"]');
      var frameField = tr.querySelector('[data-field="frame"]');
      var imageText = (imageField && imageField.dataset.src) || textOf(imageField);
      var fallbackImage = imageField && imageField.dataset.default || '';
      var picked = imageField && imageField.dataset.picked === '1';
      var data = { image: picked || imageText !== fallbackImage ? imageText : '', frame: null };
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
      copyText(window.StudioDraft.studioPath(place, { id: slot.id }), copy);
    });
    function store(status) {
      var data = read();
      var patch = {
        id: slot.id,
        image: data.image,
        image_frame: data.frame,
        status: status
      };
      if (status === 'published') patch.published = { image: data.image, frame: data.frame };
      say('Saving…');
      var query = row && row.id
        ? client.from('onboarding_images').update(patch).eq('id', slot.id).select('id,status,published')
        : client.from('onboarding_images').insert(patch).select('id,status,published');
      query.then(function (result) {
        if (result.error) { say(result.error.message); return; }
        var saved = result.data && result.data[0];
        if (saved) row = Object.assign({}, row || {}, patch, saved);
        tr.classList.toggle('is-draft', status !== 'published');
        tr.querySelector('.is-state').textContent = status === 'published' ? 'Published' : 'Draft';
        var existing = td.querySelector('.studio-retract');
        if (status === 'published' && !existing) td.appendChild(retractButton());
        if (status !== 'published' && existing) existing.remove();
        say(status === 'published' ? 'Published. Students see it after a refresh.' : 'Draft saved. Students do not see it yet.');
      });
    }
    function retractButton() {
      var retract = document.createElement('button');
      retract.type = 'button';
      retract.className = 'studio-retract';
      retract.textContent = 'Retract';
      retract.addEventListener('click', function () {
        if (!row || !row.id) return;
        if (!window.confirm('Take this picture off the live site? It stays in this table as a draft.')) return;
        say('Taking it off the site…');
        client.from('onboarding_images').update({ status: 'draft' }).eq('id', slot.id).select('id,status').then(function (result) {
          if (result.error) { say(result.error.message); return; }
          row.status = 'draft';
          tr.classList.add('is-draft');
          tr.querySelector('.is-state').textContent = 'Draft';
          retract.remove();
          say('Taken off the site. Students see the built-in picture after a refresh.');
        });
      });
      return retract;
    }
    var save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Save draft';
    save.addEventListener('click', function () { store('draft'); });
    var publish = document.createElement('button');
    publish.type = 'button';
    publish.textContent = 'Publish';
    publish.addEventListener('click', function () {
      if (!window.confirm('Publish this picture? Students see it after a refresh.')) return;
      store('published');
    });
    td.appendChild(copy);
    td.appendChild(save);
    td.appendChild(publish);
    if (row && row.status === 'published') td.appendChild(retractButton());
    return td;
  }

  window.RevisionStudioOnboarding = { load: load };
})();
