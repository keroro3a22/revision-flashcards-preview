/* Guide, top-bar book and level menus, Get started, and unit cards. */
(function () {
  var P = window.RevisionPlace;
  if (!P) return;

  var openMenu = '';
  var blurbs = {
    'revision-vocab': 'Open the word cards.',
    'revision-grammar': 'Open the grammar cards.',
    'practice-vocab': 'Open the quizzes.',
    'practice-grammar': 'Open the grammar games.',
    game: 'Open School Mystery.'
  };

  function show(mode) {
    document.documentElement.setAttribute('data-place', mode);
  }

  function closeMenus() {
    openMenu = '';
    ['book', 'series', 'level', 'term'].forEach(function (name) {
      var button = document.getElementById(name + '-button');
      var menu = document.getElementById(name + '-menu');
      if (button) button.setAttribute('aria-expanded', 'false');
      if (menu) menu.hidden = true;
    });
  }

  function unitText(unit) {
    return unit.title ? unit.label + ' · ' + unit.title : unit.label;
  }

  function fillMenu(name, items, selected, onPick) {
    var menu = document.getElementById(name + '-menu');
    menu.replaceChildren();
    items.forEach(function (item) {
      var option = document.createElement('button');
      option.type = 'button';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', item.id === selected ? 'true' : 'false');
      option.textContent = item.label;
      option.addEventListener('click', function (event) {
        event.stopPropagation();
        onPick(item.id);
      });
      menu.appendChild(option);
    });
  }

  function renderEntries(place, resolved) {
    var box = document.getElementById('place-entries');
    var heading = document.getElementById('unit-heading');
    box.replaceChildren();
    if (place.unit === P.RESOURCES) {
      heading.textContent = 'Resources';
      if (window.Resources) window.Resources.mount(place, box);
      return;
    }
    if (place.unit === P.HOME) {
      heading.textContent = '';
      return;
    }
    if (place.unit === P.GAME) {
      heading.textContent = 'Game';
    } else {
      var selected = P.unitsFor(place.book, place.level, place.series, place.term).filter(function (unit) {
        return unit.id === place.unit;
      })[0];
      var title = resolved && resolved.title ? resolved.title : (selected && selected.title);
      heading.textContent = selected ? (title ? selected.label + ' · ' + title : selected.label) : '';
    }
    var groups = resolved && resolved.groups ? resolved.groups : P.entriesFor(place);
    groups.forEach(function (group) {
      var section = document.createElement('section');
      section.className = 'place-group';
      if (group.id !== 'game') {
        var title = document.createElement('h3');
        title.className = 'place-group-title';
        title.textContent = group.label;
        section.appendChild(title);
      }
      var grid = document.createElement('div');
      grid.className = 'place-group-items';
      group.items.forEach(function (item) {
        var el = document.createElement(item.ready ? 'a' : 'div');
        el.className = 'place-entry tone-' + item.id + (item.ready ? '' : ' is-soon');
        if (item.ready) el.href = item.href;
        var copy = document.createElement('div');
        copy.className = 'place-entry-copy';
        if (item.ready && item.image) {
          var frame = document.createElement('div');
          frame.className = 'place-entry-media';
          var img = document.createElement('img');
          img.src = item.image;
          img.alt = '';
          frame.appendChild(img);
          if (window.ImgFrame && item.frame) window.ImgFrame.apply(img, item.frame, 4 / 3);
          el.appendChild(frame);
        }
        var name = document.createElement('h3');
        name.textContent = item.label;
        var note = document.createElement('p');
        note.textContent = item.ready ? (item.note || blurbs[item.id] || '') : (item.note || 'Coming soon');
        copy.appendChild(name);
        copy.appendChild(note);
        el.appendChild(copy);
        grid.appendChild(el);
      });
      section.appendChild(grid);
      box.appendChild(section);
    });
  }

  function scriptRoot() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      var cut = src.indexOf('assets/place-ui.js');
      if (cut !== -1) return src.slice(0, cut);
    }
    return '';
  }

  function pageKind() {
    var path = String(location.pathname || '');
    path = path.replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
    if (/\/unit\d+\/grammar$/.test(path)) return 'revision-grammar';
    if (/\/unit\d+$/.test(path)) return 'revision-vocab';
    if (/\/practice\/grammar\/(?:unit\d+-|boss$)/.test(path)) return 'practice-grammar';
    if (/\/practice$/.test(path) || /\/practice\/(?:fill|letters|match|timed)$/.test(path)) return 'practice-vocab';
    return '';
  }

  function unitFromLocation() {
    var bodyUnit = document.body && document.body.getAttribute('data-unit');
    if (bodyUnit) return bodyUnit;
    var queryUnit = '';
    try { queryUnit = new URLSearchParams(location.search).get('unit') || ''; } catch (e) {}
    if (/^unit\d+$/.test(queryUnit)) return queryUnit;
    var named = (location.pathname || '').match(/\/(unit\d+)(?:\/|-)/);
    if (named) return named[1];
    var stored = P.read(window.localStorage);
    if (stored && /^unit\d+$/.test(stored.unit)) return stored.unit;
    return 'unit1';
  }

  function samePlace(place) {
    return place.book === 'oxford' && place.series === 'oxford' && place.level === 'p6' && place.term === 'first';
  }

  function lessonHref(place, kind) {
    var root = scriptRoot();
    if (!samePlace(place) || place.unit === P.HOME || place.unit === P.GAME) return root || './';
    if (kind === 'revision-vocab') return root + place.unit + '/';
    if (kind === 'revision-grammar') return root + place.unit + '/grammar/';
    if (kind === 'practice-vocab') return root + 'practice/?unit=' + encodeURIComponent(place.unit);
    if (kind === 'practice-grammar' && /^unit[1-6]$/.test(place.unit)) return root + 'practice/grammar/' + place.unit + '-hub/';
    return root || './';
  }

  function follow(place, kind) {
    var next = P.write(window.localStorage, place);
    if (!next) return;
    var href = lessonHref(next, kind);
    var here = location.pathname + location.search;
    var dest = document.createElement('a');
    dest.href = href;
    if (dest.pathname + dest.search === here) {
      renderShell(next);
      return;
    }
    location.href = href;
  }

  function ensureChrome() {
    if (document.querySelector('.site-chrome')) return;
    var header = document.createElement('header');
    header.className = 'topbar site-chrome';
    var inner = document.createElement('div');
    inner.className = 'topbar-inner';
    var brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = scriptRoot() || './';
    brand.textContent = 'Play and Learn Club';
    inner.appendChild(brand);
    var nav = document.createElement('nav');
    nav.className = 'place-nav';
    nav.setAttribute('aria-label', 'Books and levels');
    ['book', 'series', 'level', 'term'].forEach(function (name) {
      var labels = { book: 'Books', series: 'Series', level: 'Levels', term: 'Term' };
      var drop = document.createElement('div');
      drop.className = 'place-drop';
      var label = document.createElement('span');
      label.className = 'place-drop-label';
      label.id = name + '-label';
      label.textContent = labels[name];
      var button = document.createElement('button');
      button.type = 'button';
      button.id = name + '-button';
      button.textContent = labels[name];
      button.setAttribute('aria-haspopup', 'listbox');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', name + '-menu');
      var menu = document.createElement('div');
      menu.className = 'place-menu';
      menu.id = name + '-menu';
      menu.setAttribute('role', 'listbox');
      menu.setAttribute('aria-labelledby', name + '-label');
      menu.hidden = true;
      drop.appendChild(label);
      drop.appendChild(button);
      drop.appendChild(menu);
      nav.appendChild(drop);
    });
    inner.appendChild(nav);
    var account = document.createElement('div');
    account.className = 'topbar-account';
    var accountNav = document.createElement('nav');
    accountNav.className = 'nav-plain';
    accountNav.setAttribute('aria-label', 'Account');
    var sign = document.createElement('a');
    sign.className = 'nav-jump';
    sign.id = 'account-link';
    sign.href = (scriptRoot() || '') + 'account/';
    sign.textContent = 'Sign in / Sign up';
    accountNav.appendChild(sign);
    var slot = document.getElementById('profile-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'profile-slot';
      slot.className = 'profile-slot';
    }
    account.appendChild(accountNav);
    account.appendChild(slot);
    inner.appendChild(account);
    header.appendChild(inner);
    var tabs = document.createElement('div');
    tabs.className = 'unit-tabs';
    tabs.id = 'unit-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Units');
    header.appendChild(tabs);
    document.body.insertBefore(header, document.body.firstChild);
  }

  function renderShell(place) {
    document.documentElement.setAttribute('data-view', place.unit === P.HOME ? 'home' : 'unit');
    document.documentElement.setAttribute('data-level-live', place.book === 'oxford' && place.series === 'oxford' && place.level === 'p6' && place.term === 'first' ? 'yes' : 'no');
    var bookLabel = P.books.filter(function (item) { return item.id === place.book; })[0].label;
    var seriesLabel = P.seriesFor(place.book).filter(function (item) { return item.id === place.series; })[0].label;
    var levelLabel = P.levels.filter(function (item) { return item.id === place.level; })[0].label;
    var termLabel = P.terms.filter(function (item) { return item.id === place.term; })[0].label;
    var bookButton = document.getElementById('book-button');
    var seriesButton = document.getElementById('series-button');
    var levelButton = document.getElementById('level-button');
    var termButton = document.getElementById('term-button');
    bookButton.textContent = bookLabel;
    if (seriesButton) seriesButton.textContent = seriesLabel;
    levelButton.textContent = levelLabel;
    if (termButton) termButton.textContent = termLabel;
    bookButton.setAttribute('aria-label', 'Books, ' + bookLabel);
    if (seriesButton) seriesButton.setAttribute('aria-label', 'Series, ' + seriesLabel);
    levelButton.setAttribute('aria-label', 'Levels, ' + levelLabel);
    if (termButton) termButton.setAttribute('aria-label', 'Term, ' + termLabel);
    var kind = pageKind();
    function choosePlace(next) {
      if (kind) follow(next, kind);
      else save(next);
    }
    fillMenu('book', P.books, place.book, function (id) {
      choosePlace(P.withChange(place, { book: id }));
    });
    fillMenu('series', P.seriesFor(place.book), place.series, function (id) {
      choosePlace(P.withChange(place, { series: id }));
    });
    fillMenu('level', P.levels, place.level, function (id) {
      choosePlace(P.withChange(place, { level: id }));
    });
    fillMenu('term', P.terms, place.term, function (id) {
      choosePlace(P.withChange(place, { term: id }));
    });

    var views = P.tabsFor(place);
    var tabs = document.getElementById('unit-tabs');
    function choose(unitId) {
      var next = P.withChange(place, { unit: unitId });
      if (kind) {
        if (!P.write(window.localStorage, next)) return;
        location.href = scriptRoot() || './';
        return;
      }
      save(next);
    }
    if (tabs) {
      tabs.replaceChildren();
      views.forEach(function (unit, index) {
        var tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'unit-tab';
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', unit.id === place.unit ? 'true' : 'false');
        tab.tabIndex = unit.id === place.unit ? 0 : -1;
        tab.textContent = unit.label;
        tab.addEventListener('click', function () { choose(unit.id); });
        tab.addEventListener('keydown', function (event) {
          var next = index;
          if (event.key === 'ArrowRight') next = Math.min(views.length - 1, index + 1);
          else if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
          else return;
          event.preventDefault();
          choose(views[next].id);
          var buttons = tabs.querySelectorAll('.unit-tab');
          if (buttons[next]) buttons[next].focus();
        });
        tabs.appendChild(tab);
      });
    }
    if (document.getElementById('place-entries')) renderEntries(place);
    closeMenus();
    if (window.SitePages && window.SitePages.mount) window.SitePages.mount(place);
  }

  window.RevisionPlacePaint = function (place, resolved) {
    if (!document.getElementById('place-entries')) return;
    if (!place || place.unit === P.HOME || place.unit === P.GAME) return;
    renderEntries(place, resolved);
  };

  function save(place) {
    var next = P.write(window.localStorage, place);
    if (!next) return;
    show('ready');
    renderShell(next);
    document.dispatchEvent(new Event('revision-place-ready'));
  }

  function renderGuide(step, draft) {
    var title = document.getElementById('place-guide-title');
    var back = document.getElementById('place-guide-back');
    var choices = document.getElementById('place-guide-choices');
    title.textContent = step === 'book' ? 'Pick a book' : 'Pick a level';
    choices.className = 'place-choices is-' + step;
    back.hidden = step === 'book';
    choices.replaceChildren();
    var items = step === 'book' ? P.books : P.levels;
    items.forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'place-choice';
      var img = document.createElement('img');
      img.src = item.image;
      img.alt = '';
      var label = document.createElement('span');
      label.textContent = item.label;
      button.appendChild(img);
      button.appendChild(label);
      button.addEventListener('click', function () {
        if (step === 'book') renderGuide('level', { book: item.id, level: '', unit: P.HOME });
        else save({ book: draft.book, level: item.id, unit: P.HOME });
      });
      choices.appendChild(button);
    });
    back.onclick = function () {
      renderGuide('book', { book: '', level: '', unit: P.HOME });
    };
  }

  function toggleMenu(name) {
    var willOpen = openMenu !== name;
    closeMenus();
    if (!willOpen) return;
    openMenu = name;
    document.getElementById(name + '-button').setAttribute('aria-expanded', 'true');
    document.getElementById(name + '-menu').hidden = false;
  }

  function boot() {
    var kind = pageKind();
    if (kind) ensureChrome();
    var bookButton = document.getElementById('book-button');
    var levelButton = document.getElementById('level-button');
    if (!bookButton || !levelButton) return;
    ['book', 'series', 'level', 'term'].forEach(function (name) {
      var button = document.getElementById(name + '-button');
      if (!button) return;
      button.addEventListener('click', function (event) {
        event.stopPropagation();
        toggleMenu(name);
      });
    });
    document.addEventListener('click', closeMenus);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenus();
    });
    var brand = document.querySelector('.site-chrome .brand') || document.querySelector('.brand');
    if (brand) {
      brand.addEventListener('click', function (event) {
        var place = P.read(window.localStorage);
        if (!place) return;
        event.preventDefault();
        var next = P.withChange(place, { unit: P.HOME });
        if (kind) follow(next, kind);
        else save(next);
      });
    }
    if (kind) {
      var savedPlace = P.read(window.localStorage) || {};
      var queryTerm = '';
      try { queryTerm = new URLSearchParams(location.search).get('term') || ''; } catch (e) {}
      var keptTerm = queryTerm === 'first' || queryTerm === 'second'
        ? queryTerm
        : (savedPlace.book === 'oxford' && savedPlace.series === 'oxford' && savedPlace.level === 'p6' && savedPlace.term) || 'first';
      var lesson = P.write(window.localStorage, {
        book: 'oxford',
        series: 'oxford',
        level: 'p6',
        term: keptTerm,
        unit: unitFromLocation()
      });
      if (lesson) renderShell(lesson);
      return;
    }
    var place = P.read(window.localStorage);
    if (!place) {
      show('guide');
      renderGuide('book', { book: '', level: '', unit: P.HOME });
      return;
    }
    show('ready');
    renderShell(place);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

(function () {
  var style = document.createElement('style');
  style.textContent = '.back-to-top{position:fixed;top:max(1rem,env(safe-area-inset-top));right:max(1rem,env(safe-area-inset-right));z-index:60;width:2.75rem;height:2.75rem;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:#fff;color:#243c6c;box-shadow:0 10px 24px rgba(36,60,108,.22);cursor:pointer;opacity:0;transform:scale(.45);pointer-events:none;transition:opacity .22s ease,transform .28s cubic-bezier(.4,0,1,1)}.back-to-top svg{width:1.15rem;height:1.15rem;display:block}.back-to-top.is-in{opacity:1;transform:scale(1);pointer-events:auto;animation:back-to-top-pop .52s linear both}@keyframes back-to-top-pop{0%{opacity:0;transform:scale(.4)}46%{opacity:1;transform:scale(1.16)}72%{transform:scale(.93)}88%{transform:scale(1.04)}100%{transform:scale(1)}}@media (prefers-reduced-motion:reduce){.back-to-top,.back-to-top.is-in{animation:none;transition:opacity .15s linear;transform:none}}';
  document.head.appendChild(style);

  function scrollY() {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  var scrollFrame = 0;
  function scrollToTop() {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    var start = scrollY();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (start <= 0 || reduce) {
      window.scrollTo(0, 0);
      scrollFrame = 0;
      return;
    }
    var duration = 280;
    var began = 0;
    function step(now) {
      if (!began) began = now;
      var t = Math.min(1, (now - began) / duration);
      window.scrollTo(0, Math.round(start * (1 - t)));
      if (t < 1) scrollFrame = requestAnimationFrame(step);
      else scrollFrame = 0;
    }
    scrollFrame = requestAnimationFrame(step);
  }

  function mount() {
    if (document.body.classList.contains('studio-page') || document.getElementById('back-to-top')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.id = 'back-to-top';
    button.className = 'back-to-top';
    button.setAttribute('aria-label', 'Back to top');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6"/><path d="m6.5 11.5 5.5-5.5 5.5 5.5"/></svg>';
    button.addEventListener('click', function () {
      scrollToTop();
    });
    document.body.appendChild(button);
    var shown = false;
    function paint() {
      var y = scrollY();
      var height = window.innerHeight || 1;
      var doc = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      if (doc <= height + 48) shown = false;
      else if (!shown && y > height) shown = true;
      else if (shown && y < height * 0.6) shown = false;
      button.classList.toggle('is-in', shown);
    }
    window.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();

(function () {
  var scripts = document.getElementsByTagName('script');
  var src = 'assets/copy-path.js?v=5';
  var i;
  for (i = 0; i < scripts.length; i += 1) {
    var current = scripts[i].src || '';
    if (current.indexOf('place-ui.js') !== -1) {
      src = current.replace(/place-ui\.js(?:\?.*)?$/, 'copy-path.js?v=5');
      break;
    }
  }
  var tag = document.createElement('script');
  tag.src = src;
  document.head.appendChild(tag);
})();
