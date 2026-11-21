(function () {
  'use strict';

  var KEY = 'mmi-player-v1';
  var PLAYERS = {
    oliver: { name: 'Oliver', src: 'art/players/oliver.png' },
    mia: { name: 'Mia', src: 'art/players/mia.png?v=2' },
    felix: { name: 'Felix', src: 'art/players/felix.png' },
    clara: { name: 'Clara', src: 'art/players/clara.png' }
  };
  var BOOK = [{ src: 'art/guidebook/cover.jpg', alt: 'Guidebook cover' }];
  for (var n = 1; n <= 10; n++) {
    BOOK.push({ src: 'art/guidebook/' + n + '.jpg', alt: 'Guidebook page ' + n });
  }

  var selected = '';
  var pageIndex = 0;
  var flipping = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function readSave() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (data && data.seen && PLAYERS[data.id]) return { id: data.id, seen: true };
    } catch (e) {}
    return { id: '', seen: false };
  }

  function writeSave(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function applyScreen(name, mode) {
    var save = readSave();
    if ((name === 'map' || name === 'guidebook') && !save.seen) name = 'welcome';
    if (name !== 'welcome' && name !== 'character' && name !== 'map' && name !== 'guidebook') {
      name = save.seen ? 'map' : 'welcome';
    }
    document.documentElement.setAttribute('data-mmi', name);
    if (name === 'character') syncCharacterBack();
    if (name === 'map') paintWho();
    var url = '#' + name;
    if (location.hash !== url) {
      if (mode === 'push') history.pushState({ mmi: name }, '', url);
      else history.replaceState({ mmi: name }, '', url);
    }
  }

  function syncCharacterBack() {
    var back = document.getElementById('character-back');
    back.textContent = readSave().seen ? 'Back to the map' : 'Back';
  }

  function paintWho() {
    var player = PLAYERS[readSave().id];
    if (!player) return;
    document.getElementById('who-name').textContent = player.name;
    document.getElementById('who-img').src = player.src;
    document.getElementById('change-character').setAttribute('aria-label', player.name + '. Change character');
  }

  function selectPlayer(id) {
    selected = '';
    var cards = document.querySelectorAll('.cast-card');
    for (var i = 0; i < cards.length; i++) {
      var on = cards[i].getAttribute('data-player') === id && !!PLAYERS[id];
      cards[i].setAttribute('aria-checked', on ? 'true' : 'false');
      if (on) selected = id;
    }
    document.getElementById('enter-academy').disabled = !selected;
  }

  function renderPage(index) {
    pageIndex = index;
    var page = BOOK[index];
    var img = document.getElementById('book-img');
    img.src = page.src;
    img.alt = page.alt;
    document.getElementById('book-label').textContent = index === 0 ? 'Cover' : ('Page ' + index + ' of 10');
    document.getElementById('book-prev').disabled = index === 0;
    document.getElementById('book-next').disabled = index === BOOK.length - 1;
    if (BOOK[index + 1]) {
      var pre = new Image();
      pre.src = BOOK[index + 1].src;
    }
  }

  function turn(dir) {
    if (flipping) return;
    var next = pageIndex + dir;
    if (next < 0 || next >= BOOK.length) return;
    if (reduce) {
      renderPage(next);
      return;
    }
    flipping = true;
    var sheet = document.getElementById('book-sheet');
    var finished = false;
    function done(event) {
      if (finished) return;
      if (event && event.propertyName && event.propertyName !== 'transform') return;
      finished = true;
      sheet.removeEventListener('transitionend', done);
      renderPage(next);
      sheet.classList.remove('is-turning');
      flipping = false;
    }
    sheet.addEventListener('transitionend', done);
    sheet.classList.add('is-turning');
    window.setTimeout(done, 500);
  }

  document.getElementById('to-character').addEventListener('click', function () {
    selectPlayer(readSave().id);
    applyScreen('character', 'push');
  });
  document.getElementById('character-back').addEventListener('click', function () {
    applyScreen(readSave().seen ? 'map' : 'welcome', 'push');
  });
  document.querySelectorAll('.cast-card').forEach(function (card) {
    card.addEventListener('click', function () {
      selectPlayer(card.getAttribute('data-player'));
    });
  });
  document.getElementById('enter-academy').addEventListener('click', function () {
    if (!selected || !PLAYERS[selected]) return;
    writeSave({ id: selected, seen: true });
    paintWho();
    applyScreen('map', 'push');
  });
  document.getElementById('change-character').addEventListener('click', function () {
    selectPlayer(readSave().id);
    applyScreen('character', 'push');
  });
  document.getElementById('open-book').addEventListener('click', function () {
    applyScreen('guidebook', 'push');
  });
  document.getElementById('book-back').addEventListener('click', function () {
    applyScreen('map', 'push');
  });
  document.getElementById('book-prev').addEventListener('click', function () { turn(-1); });
  document.getElementById('book-next').addEventListener('click', function () { turn(1); });
  document.querySelectorAll('.map-hot[data-note]').forEach(function (pin) {
    pin.addEventListener('click', function () {
      document.getElementById('place-note').textContent = pin.getAttribute('data-note');
    });
  });

  var sheet = document.getElementById('book-sheet');
  var startX = null;
  sheet.addEventListener('pointerdown', function (event) { startX = event.clientX; });
  sheet.addEventListener('pointerup', function (event) {
    if (startX == null) return;
    var dx = event.clientX - startX;
    startX = null;
    if (dx <= -48) turn(1);
    else if (dx >= 48) turn(-1);
  });
  document.addEventListener('keydown', function (event) {
    if (document.documentElement.getAttribute('data-mmi') !== 'guidebook') return;
    if (event.key === 'ArrowRight') turn(1);
    if (event.key === 'ArrowLeft') turn(-1);
  });
  window.addEventListener('popstate', function () {
    var name = (location.hash || '#welcome').replace('#', '');
    applyScreen(name, 'stay');
  });

  selectPlayer(readSave().id);
  paintWho();
  renderPage(0);
  applyScreen(document.documentElement.getAttribute('data-mmi') || 'welcome', 'replace');
})();
