(function () {
  'use strict';

  var KEY = 'asc-player-v1';
  var PLAYERS = {
    evan: { name: 'Evan', src: 'art/players/evan.png?v=1' },
    lily: { name: 'Lily', src: 'art/players/lily.png?v=1' },
    ben: { name: 'Ben', src: 'art/players/ben.png?v=1' },
    hannah: { name: 'Hannah', src: 'art/players/hannah.png?v=1' }
  };

  var selected = '';

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

  function showNote(text) {
    var note = document.getElementById('map-note');
    if (note) note.textContent = text || '';
  }

  function applyScreen(name, mode) {
    var save = readSave();
    if (name === 'place-notice') name = 'place';
    if ((name === 'map' || name === 'place') && !save.seen) name = 'welcome';
    if (name !== 'welcome' && name !== 'character' && name !== 'map' && name !== 'place') {
      name = save.seen ? 'map' : 'welcome';
    }
    document.documentElement.setAttribute('data-asc', name);
    if (name === 'welcome' || name === 'character') syncPickBack();
    if (name === 'map') paintWho();
    var url = '#' + (name === 'place' ? 'place-notice' : name);
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
      var pid = cards[i].getAttribute('data-player');
      var on = pid === id && !!PLAYERS[pid];
      cards[i].setAttribute('aria-checked', on ? 'true' : 'false');
      if (PLAYERS[pid]) cards[i].setAttribute('aria-label', PLAYERS[pid].name);
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
  document.querySelectorAll('.map-hot[data-note]').forEach(function (pin) {
    pin.addEventListener('click', function () {
      showNote(pin.getAttribute('data-note'));
    });
  });
  document.querySelectorAll('.map-hot[data-open="notice"]').forEach(function (pin) {
    pin.addEventListener('click', function () {
      showNote('');
      applyScreen('place-notice', 'push');
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
  applyScreen(boot === 'place' ? 'place-notice' : boot, 'replace');
})();
