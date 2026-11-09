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

  function renderEntries(place) {
    var box = document.getElementById('place-entries');
    var heading = document.getElementById('unit-heading');
    box.replaceChildren();
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
      heading.textContent = selected ? unitText(selected) : '';
    }
    P.entriesFor(place).forEach(function (group) {
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
          el.appendChild(frame);
        }
        var name = document.createElement('h3');
        name.textContent = item.label;
        var note = document.createElement('p');
        note.textContent = item.ready ? blurbs[item.id] : (item.note || 'Coming soon');
        copy.appendChild(name);
        copy.appendChild(note);
        el.appendChild(copy);
        grid.appendChild(el);
      });
      section.appendChild(grid);
      box.appendChild(section);
    });
  }

  function renderShell(place) {
    document.documentElement.setAttribute('data-view', place.unit === P.HOME ? 'home' : 'unit');
    document.documentElement.setAttribute('data-level-live', place.book === 'oxford' && place.series === 'oxford' && place.level === 'p6' && place.term === 'first' ? 'yes' : 'no');
    document.getElementById('place-header').textContent = P.headerText(place);
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
    fillMenu('book', P.books, place.book, function (id) {
      save(P.withChange(place, { book: id }));
    });
    fillMenu('series', P.seriesFor(place.book), place.series, function (id) {
      save(P.withChange(place, { series: id }));
    });
    fillMenu('level', P.levels, place.level, function (id) {
      save(P.withChange(place, { level: id }));
    });
    fillMenu('term', P.terms, place.term, function (id) {
      save(P.withChange(place, { term: id }));
    });

    var views = [{ id: P.HOME, label: 'Get started' }]
      .concat(P.unitsFor(place.book, place.level, place.series, place.term))
      .concat([{ id: P.GAME, label: 'Game' }]);
    var tabs = document.getElementById('unit-tabs');
    tabs.replaceChildren();
    views.forEach(function (unit, index) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'unit-tab';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', unit.id === place.unit ? 'true' : 'false');
      tab.tabIndex = unit.id === place.unit ? 0 : -1;
      tab.textContent = unit.label;
      tab.addEventListener('click', function () {
        save(P.withChange(place, { unit: unit.id }));
      });
      tab.addEventListener('keydown', function (event) {
        var next = index;
        if (event.key === 'ArrowRight') next = Math.min(views.length - 1, index + 1);
        else if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
        else return;
        event.preventDefault();
        save(P.withChange(place, { unit: views[next].id }));
        var buttons = tabs.querySelectorAll('.unit-tab');
        if (buttons[next]) buttons[next].focus();
      });
      tabs.appendChild(tab);
    });
    renderEntries(place);
    closeMenus();
  }

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
    var brand = document.querySelector('.brand');
    if (brand) {
      brand.addEventListener('click', function (event) {
        var place = P.read(window.localStorage);
        if (!place) return;
        event.preventDefault();
        save(P.withChange(place, { unit: P.HOME }));
      });
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
