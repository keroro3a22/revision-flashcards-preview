/* Badge names, pictures, pep lines, and the inference target. Counting stays in practice/badges.js. */
(function (root) {
  function clip(value, max) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function shownCopy(saved, builtin, max) {
    var text = clip(saved, max);
    return text || clip(builtin, max);
  }

  function savedCopy(value, builtin, max) {
    var text = clip(value, max);
    if (!text || text === clip(builtin, max)) return '';
    return text;
  }

  function builtinTarget(id) {
    if (window.Badges && window.Badges.builtinTarget) return window.Badges.builtinTarget(id);
    if (id === 'starter' || id === 'grammar-boss') return 1;
    if (String(id).indexOf('unit-done:') === 0) return 3;
    if (id === 'grammar-inference') return 3;
    return 4;
  }

  function targetLimit(id) {
    if (window.Badges && window.Badges.targetLimit) return window.Badges.targetLimit(id);
    if (id === 'grammar-inference') return 99;
    return builtinTarget(id);
  }

  function shownTarget(saved, id) {
    var base = builtinTarget(id);
    var next = Number(saved);
    var max = targetLimit(id);
    if (isFinite(next) && next >= 1 && next <= max && Math.floor(next) === next) return next;
    return base;
  }

  function readTarget(value, id) {
    var max = targetLimit(id);
    var base = builtinTarget(id);
    var text = String(value == null ? '' : value).trim();
    if (!text) return { ok: true, target: null, goal: base };
    var next = Number(text);
    if (!isFinite(next) || next < 1 || next > max || Math.floor(next) !== next) return { ok: false, max: max };
    return { ok: true, target: next === base ? null : next, goal: next };
  }

  function imageOk(value) {
    var text = String(value || '').trim();
    if (!text) return true;
    if (text.indexOf('..') !== -1) return false;
    if (text.indexOf('assets/badges/') === 0) return true;
    if (/^https?:\/\//i.test(text)) return text.indexOf('/object/public/lesson-media/') !== -1;
    return /^[a-z0-9._/-]+$/i.test(text);
  }

  function field(label, value, max, multiline) {
    var wrap = document.createElement('label');
    wrap.className = 'studio-badge-field';
    var name = document.createElement('span');
    name.textContent = label;
    var input = multiline ? document.createElement('textarea') : document.createElement('input');
    if (multiline) input.rows = 4;
    else input.type = 'text';
    input.maxLength = max;
    input.value = value || '';
    wrap.appendChild(name);
    wrap.appendChild(input);
    return { wrap: wrap, input: input };
  }

  function stepRow(step) {
    var row = document.createElement('div');
    row.className = 'studio-badge-step';
    var at = document.createElement('input');
    at.type = 'number';
    at.min = '1';
    at.className = 'studio-badge-at';
    at.value = step && step.at ? String(step.at) : '';
    at.setAttribute('aria-label', 'Progress');
    var message = document.createElement('input');
    message.type = 'text';
    message.maxLength = 120;
    message.className = 'studio-badge-message';
    message.value = step && step.message ? step.message : '';
    message.setAttribute('aria-label', 'Encouragement');
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', function () { row.remove(); });
    row.appendChild(at);
    row.appendChild(message);
    row.appendChild(remove);
    return row;
  }

  function readSteps(box) {
    var list = [];
    box.querySelectorAll('.studio-badge-step').forEach(function (row) {
      list.push({
        at: row.querySelector('.studio-badge-at').value,
        message: row.querySelector('.studio-badge-message').value
      });
    });
    return list;
  }

  function card(client, badge, saved, say, focus) {
    var row = saved || null;
    var target = shownTarget(row && row.target, badge.id);
    var article = document.createElement('article');
    article.className = 'studio-badge';
    article.dataset.id = badge.id;
    if (focus && focus === badge.id) article.classList.add('is-path');
    var top = document.createElement('div');
    top.className = 'studio-badge-top';
    var artWrap = document.createElement('div');
    artWrap.className = 'studio-badge-art';
    var art = document.createElement('img');
    art.alt = '';
    art.width = 96;
    art.height = 96;
    var imageValue = row && row.image ? row.image : '';
    function paint() {
      art.src = imageValue || badge.image;
    }
    paint();
    var photo = document.createElement('button');
    photo.type = 'button';
    photo.textContent = 'Change photo';
    photo.addEventListener('click', function () {
      if (!window.RevisionStudioLibrary) { say('The library did not load.'); return; }
      window.RevisionStudioLibrary.open(client, {
        say: say,
        onPick: function (url) {
          imageValue = String(url || '').trim();
          paint();
        },
        place: { book: 'oxford', series: 'oxford', term: 'first', level: 'p6', unit: '' }
      });
    });
    var clear = document.createElement('button');
    clear.type = 'button';
    clear.textContent = 'Use the built-in picture';
    clear.addEventListener('click', function () {
      imageValue = '';
      paint();
    });
    artWrap.appendChild(art);
    artWrap.appendChild(photo);
    artWrap.appendChild(clear);
    var names = document.createElement('div');
    names.className = 'studio-badge-names';
    if (badge.unitLabel) {
      var unit = document.createElement('p');
      unit.className = 'studio-badge-unit';
      unit.textContent = badge.unitLabel;
      names.appendChild(unit);
    }
    var title = field('Chinese name', shownCopy(row && row.title, badge.title, 40), 40, false);
    var english = field('English name', shownCopy(row && row.english, badge.english, 40), 40, false);
    var detail = field('How to earn it', shownCopy(row && row.detail, badge.detail, 280), 280, true);
    title.wrap.classList.add('studio-badge-title');
    english.wrap.classList.add('studio-badge-english');
    detail.wrap.classList.add('studio-badge-detail');
    names.appendChild(title.wrap);
    names.appendChild(english.wrap);
    top.appendChild(artWrap);
    top.appendChild(names);
    article.appendChild(top);
    article.appendChild(detail.wrap);
    var targetWrap = document.createElement('label');
    targetWrap.className = 'studio-badge-field studio-badge-target';
    var targetName = document.createElement('span');
    targetName.textContent = 'Target total';
    var targetInput = document.createElement('input');
    targetInput.type = 'number';
    targetInput.min = '1';
    targetInput.max = String(targetLimit(badge.id));
    targetInput.value = String(target);
    targetWrap.appendChild(targetName);
    targetWrap.appendChild(targetInput);
    article.appendChild(targetWrap);
    var steps = document.createElement('div');
    steps.className = 'studio-badge-steps';
    var storedSteps = row && Array.isArray(row.milestones) ? row.milestones : [];
    storedSteps.forEach(function (step) { steps.appendChild(stepRow(step)); });
    article.appendChild(steps);
    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'studio-badge-add';
    add.textContent = 'Add a pep line';
    add.addEventListener('click', function () { steps.appendChild(stepRow(null)); });
    article.appendChild(add);
    var state = document.createElement('p');
    state.className = 'studio-badge-state';
    state.textContent = row && row.status === 'published' ? 'Published' : (row ? 'Draft' : 'Built-in');
    article.appendChild(state);
    function payload(status) {
      var chosen = readTarget(targetInput.value, badge.id);
      if (!chosen.ok) {
        say('Target total is a whole number from 1 to ' + chosen.max + '.');
        return null;
      }
      if (!imageOk(imageValue)) {
        say('Choose a library photo, or leave the picture empty to use the built-in one.');
        return null;
      }
      var goal = chosen.goal;
      var milestones = window.Badges && window.Badges.cleanMilestones
        ? window.Badges.cleanMilestones(readSteps(steps), goal)
        : [];
      var patch = {
        id: badge.id,
        title: savedCopy(title.input.value, badge.title, 40),
        english: savedCopy(english.input.value, badge.english, 40),
        detail: savedCopy(detail.input.value, badge.detail, 280),
        image: imageOk(imageValue) ? String(imageValue || '').trim() : '',
        target: chosen.target,
        milestones: milestones,
        status: status
      };
      if (status === 'published') {
        patch.published = {
          title: patch.title,
          english: patch.english,
          detail: patch.detail,
          image: patch.image,
          target: chosen.target,
          milestones: milestones
        };
      }
      return patch;
    }
    function store(status) {
      var patch = payload(status);
      if (!patch) return;
      say('Saving…');
      var query = row && row.id
        ? client.from('badge_settings').update(patch).eq('id', badge.id).select('id,status')
        : client.from('badge_settings').insert(patch).select('id,status');
      query.then(function (result) {
        if (result.error) { say(result.error.message); return; }
        row = Object.assign({}, row || {}, patch, result.data && result.data[0]);
        state.textContent = status === 'published' ? 'Published' : 'Draft';
        say(status === 'published' ? 'Published. Students see it after a refresh.' : 'Draft saved. Students do not see it yet.');
      });
    }
    var actions = document.createElement('div');
    actions.className = 'studio-badge-actions';
    var save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Save draft';
    save.addEventListener('click', function () { store('draft'); });
    var publish = document.createElement('button');
    publish.type = 'button';
    publish.textContent = 'Publish';
    publish.addEventListener('click', function () {
      if (!window.confirm('Publish this badge? Students see it after a refresh.')) return;
      store('published');
    });
    actions.appendChild(save);
    actions.appendChild(publish);
    if (row && row.status === 'published') {
      var retract = document.createElement('button');
      retract.type = 'button';
      retract.textContent = 'Retract';
      retract.addEventListener('click', function () {
        if (!window.confirm('Take this badge off the live site? Students go back to the built-in words.')) return;
        client.from('badge_settings').update({ status: 'draft' }).eq('id', badge.id).then(function (result) {
          if (result.error) { say(result.error.message); return; }
          if (row) row.status = 'draft';
          state.textContent = 'Draft';
          retract.remove();
          say('Taken off the site. Students see the built-in badge after a refresh.');
        });
      });
      actions.appendChild(retract);
    }
    article.appendChild(actions);
    return article;
  }

  function load(client, place, hooks) {
    var say = (hooks && hooks.say) || function () {};
    var host = document.getElementById('studio-badges');
    if (!host) return;
    if (!window.Badges || !window.Badges.catalog) { say('The badge list did not load.'); return; }
    say('Loading…');
    client.from('badge_settings').select('id,title,english,detail,image,target,milestones,status').then(function (result) {
      if (result.error) { say(result.error.message); return; }
      var saved = {};
      (result.data || []).forEach(function (row) { saved[row.id] = row; });
      host.replaceChildren();
      window.Badges.catalog().forEach(function (badge) {
        host.appendChild(card(client, badge, saved[badge.id], say, hooks && hooks.focus));
      });
      var hit = hooks && hooks.focus ? host.querySelector('[data-id="' + hooks.focus + '"]') : null;
      if (hit && hit.scrollIntoView) hit.scrollIntoView({ block: 'center' });
      if (hooks && hooks.focused) hooks.focused();
      say('Names, how-to, and the target start from the built-in badge. Publish is what students see.');
    });
  }

  var api = { load: load, imageOk: imageOk };
  root.RevisionStudioBadges = api;
  if (typeof window !== 'undefined') window.RevisionStudioBadges = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
