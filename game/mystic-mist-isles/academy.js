(function () {
  'use strict';

  var KEY = 'mmi-player-v1';
  var PLAYERS = {
    oliver: { name: 'Oliver', src: 'art/players/oliver.png?v=3' },
    mia: { name: 'Mia', src: 'art/players/mia.png?v=4' },
    felix: { name: 'Felix', src: 'art/players/felix.png?v=3' },
    clara: { name: 'Clara', src: 'art/players/clara.png?v=3' }
  };
  var BOOK = [
    { src: 'art/guidebook/cover.jpg', alt: 'Guidebook cover', label: 'Cover' },
    { src: 'art/guidebook/4.jpg', alt: "Headmaster's words", label: "Headmaster's words" },
    { src: 'art/guidebook/3.jpg', alt: 'About the academy', label: 'About the academy' },
    { src: 'art/guidebook/9.jpg', alt: 'Skybound Practice', label: 'Skybound Practice' },
    { src: 'art/guidebook/8.jpg', alt: 'Living Garden Studies', label: 'Living Garden Studies' },
    { src: 'art/guidebook/5.jpg', alt: 'Potion Crafting', label: 'Potion Crafting' },
    { src: 'art/guidebook/1.jpg', alt: 'Trace and Memory', label: 'Trace and Memory' },
    { src: 'art/guidebook/7.jpg', alt: 'Quiet Observation', label: 'Quiet Observation' },
    { src: 'art/guidebook/6.jpg', alt: 'Rule and Resonance', label: 'Rule and Resonance' },
    { src: 'art/guidebook/10.jpg', alt: 'The Magic Ledger', label: 'The Magic Ledger' },
    { src: 'art/guidebook/2.jpg', alt: 'School Rules', label: 'School Rules' }
  ];
  var POSTERS = {
    club: { src: 'art/notice/club-fair.png?v=2', alt: 'Club Fair', w: 896, h: 1200 },
    forest: { src: 'art/notice/forest.png?v=3', alt: 'Beware of the Forest', w: 896, h: 1199 },
    lost: { src: 'art/notice/lost-and-found.png?v=2', alt: 'Lost and Found', w: 896, h: 1200 },
    rules: { src: 'art/notice/library-rules.png?v=3', alt: 'Library Rules', w: 896, h: 1200 },
    duel: { src: 'art/notice/dueling-club.png?v=2', alt: 'The Dueling Club', w: 1200, h: 896 },
    chart: { src: 'art/notice/academy-map.png?v=2', alt: 'Map of the Magic Academy', w: 896, h: 1200 }
  };

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

  function posterId(name) {
    if (name.indexOf('notice-') !== 0) return '';
    var id = name.slice(7);
    return POSTERS[id] ? id : '';
  }

  function openOverlay(id) {
    var poster = POSTERS[id];
    if (!poster) return;
    var img = document.getElementById('poster-img');
    img.src = poster.src;
    img.alt = poster.alt;
    img.width = poster.w;
    img.height = poster.h;
    document.getElementById('notice-overlay').hidden = false;
  }

  function closeOverlay() {
    var box = document.getElementById('notice-overlay');
    if (!box || box.hidden) return;
    box.hidden = true;
    document.getElementById('poster-img').removeAttribute('src');
    document.getElementById('poster-img').alt = '';
  }

  function applyScreen(name, mode) {
    var save = readSave();
    var incoming = name;
    if (name.indexOf('notice') === 0) name = 'notice';
    var poster = posterId(incoming);
    if ((name === 'map' || name === 'guidebook' || name === 'notice') && !save.seen) name = 'welcome';
    if (name !== 'welcome' && name !== 'character' && name !== 'map' && name !== 'guidebook' && name !== 'notice') {
      name = save.seen ? 'map' : 'welcome';
    }
    document.documentElement.setAttribute('data-mmi', name);
    if (name === 'welcome' || name === 'character') syncPickBack();
    if (name === 'map') paintWho();
    if (name === 'notice' && poster) openOverlay(poster);
    else closeOverlay();
    var url = '#' + name;
    if (location.hash !== url) {
      if (mode === 'push') history.pushState({ mmi: name }, '', url);
      else history.replaceState({ mmi: name }, '', url);
    }
  }

  function syncPickBack() {
    var back = document.getElementById('pick-back');
    if (back) back.hidden = !readSave().seen;
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
    document.getElementById('enter-world').disabled = !selected;
  }

  function showPage(index) {
    pageIndex = index;
    var page = BOOK[index];
    var over = document.getElementById('book-over');
    var under = document.getElementById('book-under');
    var following = BOOK[index + 1] || page;
    over.src = page.src;
    over.alt = page.alt;
    under.src = following.src;
    under.alt = '';
    document.getElementById('book-label').textContent = 'page ' + (index + 1) + ' of ' + BOOK.length;
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
    var over = document.getElementById('book-over');
    var under = document.getElementById('book-under');
    if (reduce) {
      showPage(next);
      return;
    }
    flipping = true;
    var finished = false;
    function complete() {
      if (finished) return;
      finished = true;
      over.removeEventListener('transitionend', onEnd);
      over.style.transition = 'none';
      over.classList.remove('is-turning');
      showPage(next);
      void over.offsetWidth;
      over.style.transition = '';
      flipping = false;
    }
    function onEnd(event) {
      if (event.propertyName !== 'transform') return;
      complete();
    }
    over.addEventListener('transitionend', onEnd);
    if (dir > 0) {
      under.src = BOOK[next].src;
      under.alt = '';
      over.classList.add('is-turning');
    } else {
      under.src = BOOK[pageIndex].src;
      under.alt = '';
      over.style.transition = 'none';
      over.src = BOOK[next].src;
      over.alt = BOOK[next].alt;
      over.classList.add('is-turning');
      void over.offsetWidth;
      over.style.transition = '';
      over.classList.remove('is-turning');
    }
    window.setTimeout(complete, 1200);
  }

  document.getElementById('pick-back').addEventListener('click', function () {
    applyScreen('map', 'push');
  });
  document.querySelectorAll('.cast-card').forEach(function (card) {
    card.addEventListener('click', function () {
      selectPlayer(card.getAttribute('data-player'));
    });
  });
  document.getElementById('enter-world').addEventListener('click', function () {
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
    showPage(0);
    applyScreen('guidebook', 'push');
  });
  document.getElementById('book-back').addEventListener('click', function () {
    applyScreen('map', 'push');
  });
  document.getElementById('book-prev').addEventListener('click', function () { turn(-1); });
  document.getElementById('book-next').addEventListener('click', function () { turn(1); });
  document.getElementById('notice-back').addEventListener('click', function () {
    applyScreen('map', 'push');
  });
  document.getElementById('notice-close').addEventListener('click', function () {
    closeOverlay();
  });
  document.querySelectorAll('.notice-pin').forEach(function (pin) {
    pin.addEventListener('click', function () {
      openOverlay(pin.getAttribute('data-poster'));
    });
  });
  document.querySelectorAll('.map-hot[data-note]').forEach(function (pin) {
    pin.addEventListener('click', function () {
      document.getElementById('place-note').textContent = pin.getAttribute('data-note');
    });
  });
  document.querySelectorAll('.map-hot[data-open="notice"]').forEach(function (pin) {
    pin.addEventListener('click', function () {
      document.getElementById('place-note').textContent = '';
      applyScreen('notice', 'push');
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
    var screen = document.documentElement.getAttribute('data-mmi');
    if (event.key === 'Escape' && screen === 'notice') {
      closeOverlay();
      return;
    }
    if (screen !== 'guidebook') return;
    if (event.key === 'ArrowRight') turn(1);
    if (event.key === 'ArrowLeft') turn(-1);
  });
  window.addEventListener('popstate', function () {
    var name = (location.hash || '#welcome').replace('#', '');
    applyScreen(name, 'stay');
  });

  selectPlayer(readSave().id);
  paintWho();
  showPage(0);
  applyScreen(document.documentElement.getAttribute('data-mmi') || 'welcome', 'replace');
})();
