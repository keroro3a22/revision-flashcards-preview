(function () {
  'use strict';

  var KEY = 'asc-player-v1';
  var PLAYERS = {
    evan: { name: 'Evan', src: 'art/players/evan.png?v=1' },
    lily: { name: 'Lily', src: 'art/players/lily.png?v=1' },
    ben: { name: 'Ben', src: 'art/players/ben.png?v=1' },
    hannah: { name: 'Hannah', src: 'art/players/hannah.png?v=1' }
  };
  var PLACES = {
    playground: { name: 'Playground', src: 'art/places/view-playground.jpg?v=1' },
    canteen: { name: 'Canteen', src: 'art/places/view-canteen.jpg?v=1' },
    notice: { name: 'Notice Board', src: 'art/places/view-notice-board.jpg?v=1' },
    library: { name: 'Library', src: 'art/places/view-library.jpg?v=1' },
    hall: { name: 'School Hall', src: 'art/places/view-school-hall.jpg?v=1' },
    store: { name: 'Storeroom', src: 'art/places/view-storeroom.jpg?v=1' },
    gate: { name: 'School Gate', note: 'This is the school gate.' }
  };

  var selected = '';
  var currentPlace = 'playground';

  function readSave() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (data && data.seen && PLAYERS[data.id]) return { id: data.id, seen: true };
    } catch (e) {}
    return { id: '', seen: false };
  }

  function writeSave(data) {
    try { localStorage.setItem(KEY, JSON.stringify({ id: data.id, seen: true })); } catch (e) {}
  }

  function placeId(name) {
    if (!name || name.indexOf('place-') !== 0) return '';
    var id = name.slice(6);
    return PLACES[id] ? id : '';
  }

  function showPlace(id) {
    var place = PLACES[id];
    if (!place) return;
    currentPlace = id;
    document.getElementById('place-title').textContent = place.name;
    var img = document.getElementById('place-art');
    var note = document.getElementById('place-note');
    if (place.src) {
      img.hidden = false;
      img.src = place.src;
      img.alt = place.name;
      note.hidden = true;
      note.textContent = '';
    } else {
      img.hidden = true;
      img.removeAttribute('src');
      img.alt = '';
      note.hidden = false;
      note.textContent = place.note;
    }
  }

  function applyScreen(name, mode) {
    var save = readSave();
    var incoming = name;
    var place = placeId(incoming);
    if (place) name = 'place';
    if ((name === 'map' || name === 'place') && !save.seen) name = 'welcome';
    if (name !== 'welcome' && name !== 'character' && name !== 'map' && name !== 'place') {
      name = save.seen ? 'map' : 'welcome';
    }
    if (name === 'place' && !place) place = currentPlace;
    document.documentElement.setAttribute('data-asc', name);
    if (name === 'welcome' || name === 'character') syncPickBack();
    if (name === 'map') paintWho();
    if (name === 'place') showPlace(place);
    var url = '#' + (name === 'place' ? 'place-' + (place || currentPlace) : name);
    if (location.hash !== url) {
      if (mode === 'push') history.pushState({ asc: name }, '', url);
      else history.replaceState({ asc: name }, '', url);
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
      cards[i].setAttribute('aria-label', cards[i].querySelector('.cast-name').textContent);
      if (on) selected = id;
    }
    document.getElementById('enter-world').disabled = !selected;
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
  document.getElementById('place-back').addEventListener('click', function () {
    applyScreen('map', 'push');
  });
  document.querySelectorAll('.map-hot[data-place]').forEach(function (pin) {
    pin.addEventListener('click', function () {
      var id = pin.getAttribute('data-place');
      if (!PLACES[id]) return;
      currentPlace = id;
      applyScreen('place-' + id, 'push');
    });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && document.documentElement.getAttribute('data-asc') === 'place') {
      applyScreen('map', 'push');
    }
  });
  window.addEventListener('popstate', function () {
    var name = (location.hash || '#welcome').replace('#', '');
    applyScreen(name, 'stay');
  });

  selectPlayer(readSave().id);
  paintWho();
  var boot = document.documentElement.getAttribute('data-asc') || 'welcome';
  var hashPlace = placeId((location.hash || '').replace('#', ''));
  if (hashPlace) currentPlace = hashPlace;
  applyScreen(boot === 'place' && hashPlace ? 'place-' + hashPlace : boot, 'replace');
})();
