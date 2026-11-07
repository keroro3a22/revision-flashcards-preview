/* Home guide, book and level menus, and the unit tab bar. */
(function () {
  var P = window.RevisionPlace;
  if (!P) return;

  var openMenu = '';
  var blurbs = {
    words: 'Open the word cards.',
    grammar: 'Open the grammar games.',
    revision: 'Open the revision cards.',
    game: 'Open School Mystery.',
    practice: 'Open the quizzes.'
  };

  function show(mode) {
    document.documentElement.setAttribute('data-place', mode);
  }

  function closeMenus() {
    openMenu = '';
    ['book', 'level'].forEach(function (name) {
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

  function renderShell(place) {
    document.getElementById('place-header').textContent = P.headerText(place);
    document.getElementById('book-button').textContent = P.books.filter(function (item) {
      return item.id === place.book;
    })[0].label;
    document.getElementById('level-button').textContent = P.levels.filter(function (item) {
      return item.id === place.level;
    })[0].label;
    fillMenu('book', P.books, place.book, function (id) {
      save(P.withChange(place, { book: id }));
    });
    fillMenu('level', P.levels, place.level, function (id) {
      save(P.withChange(place, { level: id }));
    });

    var units = P.unitsFor(place.book, place.level);
    var tabs = document.getElementById('unit-tabs');
    tabs.replaceChildren();
    units.forEach(function (unit, index) {
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
        if (event.key === 'ArrowRight') next = Math.min(units.length - 1, index + 1);
        else if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
        else return;
        event.preventDefault();
        save(P.withChange(place, { unit: units[next].id }));
        var buttons = tabs.querySelectorAll('.unit-tab');
        if (buttons[next]) buttons[next].focus();
      });
      tabs.appendChild(tab);
    });

    var selected = units.filter(function (unit) { return unit.id === place.unit; })[0];
    document.getElementById('unit-heading').textContent = selected ? unitText(selected) : '';

    var box = document.getElementById('place-entries');
    box.replaceChildren();
    P.entriesFor(place).forEach(function (item) {
      var el = document.createElement(item.ready ? 'a' : 'div');
      el.className = 'place-entry tone-' + item.id + (item.ready ? '' : ' is-building');
      if (item.ready) el.href = item.href;
      var title = document.createElement('h3');
      title.textContent = item.label;
      var note = document.createElement('p');
      note.textContent = item.ready ? blurbs[item.id] : item.note;
      el.appendChild(title);
      el.appendChild(note);
      box.appendChild(el);
    });
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
    var headings = { book: 'Pick a book', level: 'Pick a level', unit: 'Pick a unit' };
    title.textContent = headings[step];
    back.hidden = step === 'book';
    choices.replaceChildren();
    var items = step === 'book' ? P.books : (step === 'level' ? P.levels : P.unitsFor(draft.book, draft.level));
    items.forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'place-choice';
      button.textContent = step === 'unit' ? unitText(item) : item.label;
      button.addEventListener('click', function () {
        if (step === 'book') renderGuide('level', { book: item.id, level: '', unit: '' });
        else if (step === 'level') renderGuide('unit', { book: draft.book, level: item.id, unit: '' });
        else save({ book: draft.book, level: draft.level, unit: item.id });
      });
      choices.appendChild(button);
    });
    back.onclick = function () {
      if (step === 'unit') renderGuide('level', draft);
      else renderGuide('book', { book: '', level: '', unit: '' });
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
    bookButton.addEventListener('click', function (event) {
      event.stopPropagation();
      toggleMenu('book');
    });
    levelButton.addEventListener('click', function (event) {
      event.stopPropagation();
      toggleMenu('level');
    });
    document.addEventListener('click', closeMenus);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenus();
    });
    var place = P.read(window.localStorage);
    if (!place) {
      show('guide');
      renderGuide('book', { book: '', level: '', unit: '' });
      return;
    }
    show('ready');
    renderShell(place);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
