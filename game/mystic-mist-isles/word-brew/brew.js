(function () {
  'use strict';

  var KEY = 'mmi-word-brew-v1';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var progress = {};
  var dict = WordBrew.dictionary([]);
  var bookOk = false;
  var bookReady = false;
  var current = null;
  var hintedWord = '';
  var picked = [];
  var tileSeq = 0;
  var lock = false;

  function blank() {
    return WordBrew.blankState();
  }

  function unique(list, allow) {
    var out = [];
    (list || []).forEach(function (word) {
      if (typeof word !== 'string') return;
      if (allow && allow.indexOf(word) === -1) return;
      if (out.indexOf(word) === -1) out.push(word);
    });
    return out;
  }

  function loadProgress() {
    var all = {};
    WordBrew.POTIONS.forEach(function (potion) { all[potion.id] = blank(); });
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || 'null') || {};
      WordBrew.POTIONS.forEach(function (potion) {
        var row = raw[potion.id] || {};
        all[potion.id] = {
          found: unique(row.found, potion.targets),
          extras: unique(row.extras),
          bonuses: unique(row.bonuses, potion.bonuses)
        };
      });
    } catch (e) {}
    return all;
  }

  function saveProgress() {
    try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) {}
  }

  function potionIndex(id) {
    for (var i = 0; i < WordBrew.POTIONS.length; i++) {
      if (WordBrew.POTIONS[i].id === id) return i;
    }
    return -1;
  }

  function setQuery(id) {
    var next = id ? ('?potion=' + encodeURIComponent(id)) : location.pathname;
    var same = id ? location.search === '?potion=' + id : !location.search;
    if (!same) history.replaceState({}, '', next);
  }

  function setStatus(text, kind) {
    var status = document.getElementById('status');
    status.textContent = text || '';
    status.classList.toggle('is-bad', kind === 'bad');
    status.classList.toggle('is-extra', kind === 'extra');
  }

  function syncTry() {
    document.getElementById('try-word').disabled = !current || lock || picked.length < 3 || !bookReady;
  }

  function renderChooser() {
    var list = document.getElementById('potion-list');
    list.replaceChildren();
    WordBrew.POTIONS.forEach(function (potion) {
      var state = progress[potion.id] || blank();
      var done = state.found.length >= WordBrew.NEED;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'potion' + (done ? ' is-ready' : '');
      button.addEventListener('click', function () { openPotion(potion.id); });
      var img = document.createElement('img');
      img.src = 'art/' + potion.id + (done ? '-ready.png' : '-unready.png');
      img.alt = '';
      var copy = document.createElement('span');
      var name = document.createElement('strong');
      name.textContent = potion.name;
      var theme = document.createElement('em');
      theme.textContent = potion.theme;
      var mark = document.createElement('b');
      mark.textContent = done ? 'Ready' : (state.found.length + ' of ' + WordBrew.NEED);
      copy.appendChild(name);
      copy.appendChild(theme);
      copy.appendChild(mark);
      button.appendChild(img);
      button.appendChild(copy);
      list.appendChild(button);
    });
  }

  function showChooser() {
    current = null;
    lock = false;
    document.getElementById('play').hidden = true;
    document.getElementById('chooser').hidden = false;
    document.getElementById('brew-sub').textContent = 'Alchemy Workshop';
    document.title = 'Word Brew · Play and Learn Club';
    setQuery('');
    renderChooser();
    window.scrollTo(0, 0);
  }

  function paintTray() {
    var tray = document.getElementById('tray');
    tray.replaceChildren();
    if (!picked.length) {
      var empty = document.createElement('span');
      empty.className = 'tray-empty';
      empty.textContent = 'Tap letters to make a word';
      tray.appendChild(empty);
      return;
    }
    picked.forEach(function (item, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'tile tile-in';
      button.textContent = item.letter.toUpperCase();
      button.setAttribute('aria-label', 'Remove ' + item.letter.toUpperCase());
      button.addEventListener('click', function () { removeAt(index); });
      tray.appendChild(button);
    });
  }

  function paintTiles(letters) {
    var box = document.getElementById('tiles');
    box.replaceChildren();
    picked = [];
    letters.forEach(function (letter) {
      var id = 't' + (tileSeq++);
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'tile';
      button.dataset.letter = letter;
      button.dataset.tile = id;
      button.textContent = letter.toUpperCase();
      button.setAttribute('aria-label', 'Letter ' + letter.toUpperCase());
      button.addEventListener('click', function () { takeTile(button); });
      box.appendChild(button);
    });
    paintTray();
    syncTry();
  }

  function takeTile(button) {
    if (lock || button.disabled) return;
    button.disabled = true;
    picked.push({ letter: button.dataset.letter, id: button.dataset.tile });
    paintTray();
    syncTry();
  }

  function removeAt(index) {
    if (lock) return;
    var item = picked[index];
    if (!item) return;
    picked.splice(index, 1);
    var tile = document.querySelector('#tiles .tile[data-tile="' + item.id + '"]');
    if (tile) tile.disabled = false;
    paintTray();
    syncTry();
  }

  function releaseAll() {
    picked = [];
    document.querySelectorAll('#tiles .tile').forEach(function (tile) { tile.disabled = false; });
    paintTray();
    syncTry();
  }

  function takeLetter(letter) {
    var tiles = document.querySelectorAll('#tiles .tile');
    for (var i = 0; i < tiles.length; i++) {
      if (!tiles[i].disabled && tiles[i].dataset.letter === letter) {
        takeTile(tiles[i]);
        return;
      }
    }
  }

  function paintLists() {
    var box = document.getElementById('lists');
    box.replaceChildren();
    if (!current) return;
    var state = progress[current.id];
    var done = state.found.length >= WordBrew.NEED;
    if (!done && state.extras.length) addList(box, 'Other words', state.extras, false);
    if (!done && state.bonuses.length) addList(box, 'Bonus', state.bonuses, true);
    document.getElementById('play-grid').classList.toggle('has-side', !done && box.childElementCount > 0);
  }

  function addList(box, title, words, bonus) {
    var section = document.createElement('section');
    section.className = 'word-block';
    var heading = document.createElement('h3');
    heading.textContent = title;
    var row = document.createElement('div');
    row.className = 'chips';
    words.forEach(function (word) {
      var chip = document.createElement('span');
      chip.className = 'word-chip' + (bonus ? ' is-bonus' : '');
      chip.textContent = word;
      row.appendChild(chip);
    });
    section.appendChild(heading);
    section.appendChild(row);
    box.appendChild(section);
  }

  function paintFound() {
    var box = document.getElementById('found-words');
    box.replaceChildren();
    if (!current) return;
    progress[current.id].found.forEach(function (word) {
      if (current.targets.indexOf(word) === -1) return;
      var item = document.createElement('span');
      item.textContent = word;
      box.appendChild(item);
    });
  }

  function hideClue() {
    hintedWord = '';
    var clue = document.getElementById('clue');
    clue.hidden = true;
    clue.textContent = '';
  }

  function unfoundTargets() {
    var found = progress[current.id].found;
    return current.targets.filter(function (word) {
      return found.indexOf(word) === -1;
    });
  }

  function showHint() {
    if (!current) return;
    var left = unfoundTargets();
    if (!left.length) {
      hideClue();
      return;
    }
    var start = 0;
    var at = hintedWord ? left.indexOf(hintedWord) : -1;
    if (at !== -1) start = (at + 1) % left.length;
    hintedWord = left[start];
    var clue = document.getElementById('clue');
    clue.hidden = false;
    clue.textContent = current.clues[hintedWord] || '';
  }

  function paintProgress(holdNote) {
    var state = progress[current.id];
    var count = state.found.length;
    var done = count >= WordBrew.NEED;
    var drops = document.querySelectorAll('#drops .drop');
    for (var i = 0; i < drops.length; i++) drops[i].classList.toggle('is-on', i < count);
    document.getElementById('drops').setAttribute('aria-label', count + ' of ' + WordBrew.NEED + ' words found');
    var stage = document.getElementById('stage');
    stage.style.setProperty('--p', String(Math.min(count, WordBrew.NEED) / WordBrew.NEED));
    stage.classList.toggle('is-ready', done);
    document.getElementById('play').classList.toggle('is-done', done);
    paintFound();
    var vocab = document.getElementById('vocab');
    vocab.replaceChildren();
    if (done) {
      current.targets.forEach(function (word) {
        if (state.found.indexOf(word) === -1) return;
        var item = document.createElement('span');
        item.textContent = word;
        vocab.appendChild(item);
      });
    }
    var note = document.getElementById('ready-note');
    var success = document.getElementById('success');
    success.hidden = !done;
    if (holdNote) {
      note.hidden = true;
      return;
    }
    note.hidden = !done;
    note.textContent = done ? current.effect : '';
  }

  function showNoteSoon() {
    var note = document.getElementById('ready-note');
    var effect = current.effect;
    window.setTimeout(function () {
      if (!current || current.effect !== effect) return;
      note.hidden = false;
      note.textContent = effect;
    }, reduce ? 0 : 920);
  }

  function stir() {
    var stage = document.getElementById('stage');
    stage.classList.remove('is-stir');
    void stage.offsetWidth;
    stage.classList.add('is-stir');
  }

  function fly(word) {
    var pour = document.getElementById('pour');
    pour.hidden = false;
    pour.textContent = word.toUpperCase();
    pour.classList.remove('is-pour');
    void pour.offsetWidth;
    pour.classList.add('is-pour');
    window.setTimeout(function () {
      pour.hidden = true;
      pour.classList.remove('is-pour');
    }, reduce ? 0 : 700);
  }

  function shake() {
    var tray = document.getElementById('tray');
    tray.classList.remove('is-shake');
    void tray.offsetWidth;
    tray.classList.add('is-shake');
  }

  function messageFor(result) {
    if (result.type === 'extra') return 'A real word. The potion stays the same.';
    if (result.type === 'bonus') return 'Bonus word. You do not need it to finish.';
    if (result.type === 'repeat') return 'Already in the pot.';
    if (result.type === 'repeat-extra' || result.type === 'repeat-bonus') return 'Already written down.';
    if (!bookOk) return 'The word book did not open. Try again in a moment.';
    return 'Not a word.';
  }

  function openPotion(id) {
    var index = potionIndex(id);
    if (index < 0) {
      showChooser();
      return;
    }
    current = WordBrew.POTIONS[index];
    lock = false;
    hideClue();
    document.getElementById('chooser').hidden = true;
    document.getElementById('play').hidden = false;
    document.getElementById('potion-name').textContent = current.name;
    document.getElementById('potion-task').textContent = current.instruction;
    document.getElementById('brew-sub').textContent = current.name;
    document.title = current.name + ' · Word Brew';
    var done = progress[current.id].found.length >= WordBrew.NEED;
    var stage = document.getElementById('stage');
    stage.setAttribute('data-potion', current.id);
    stage.classList.remove('just-ready', 'is-stir');
    var unready = document.getElementById('bottle-unready');
    var ready = document.getElementById('bottle-ready');
    var pour = document.getElementById('pour');
    pour.hidden = true;
    pour.classList.remove('is-pour');
    unready.src = 'art/' + current.id + '-unready.png';
    ready.src = 'art/' + current.id + '-ready.png';
    unready.alt = current.name + ' bottle, not finished';
    ready.alt = current.name + ' bottle, ready';
    unready.setAttribute('aria-hidden', done ? 'true' : 'false');
    ready.setAttribute('aria-hidden', done ? 'false' : 'true');
    paintProgress(false);
    paintLists();
    paintTiles(WordBrew.shuffleLetters(current.letters, current.targets.concat(current.bonuses)));
    document.getElementById('next-potion').hidden = index >= WordBrew.POTIONS.length - 1 || !done;
    setStatus(bookReady ? '' : 'Opening the word book…');
    setQuery(current.id);
    window.scrollTo(0, 0);
  }

  function tryWord() {
    if (lock || !current || picked.length < 3 || !bookReady) return;
    var word = picked.map(function (item) { return item.letter; }).join('');
    var result = WordBrew.judge(current, word, progress[current.id], dict);
    progress[current.id] = result.state;
    saveProgress();
    if (result.type === 'target') {
      if (result.target === hintedWord) hideClue();
      lock = true;
      syncTry();
      fly(result.word);
      var potionId = current.id;
      window.setTimeout(function () {
        lock = false;
        if (!current || current.id !== potionId) {
          syncTry();
          return;
        }
        var stage = document.getElementById('stage');
        if (result.done) {
          paintProgress(true);
          stage.classList.add('is-ready');
          if (!reduce) stage.classList.add('just-ready');
          document.getElementById('bottle-unready').setAttribute('aria-hidden', 'true');
          document.getElementById('bottle-ready').setAttribute('aria-hidden', 'false');
          document.getElementById('next-potion').hidden = potionIndex(current.id) >= WordBrew.POTIONS.length - 1;
          showNoteSoon();
        } else {
          paintProgress(false);
          stir();
        }
        setStatus('Poured into the pot.');
        renderChooser();
        releaseAll();
        syncTry();
      }, reduce ? 0 : 680);
      return;
    }
    releaseAll();
    paintLists();
    if (result.type === 'invalid') shake();
    setStatus(messageFor(result), result.type === 'invalid' ? 'bad' : (result.type === 'extra' ? 'extra' : ''));
  }

  document.getElementById('try-word').addEventListener('click', tryWord);
  document.getElementById('clear-word').addEventListener('click', function () {
    if (!lock) releaseAll();
  });
  document.getElementById('hint-word').addEventListener('click', showHint);
  document.getElementById('all-potions').addEventListener('click', showChooser);
  document.getElementById('next-potion').addEventListener('click', function () {
    if (!current) return;
    var index = potionIndex(current.id);
    if (index >= 0 && index < WordBrew.POTIONS.length - 1) openPotion(WordBrew.POTIONS[index + 1].id);
  });
  document.addEventListener('keydown', function (event) {
    if (document.getElementById('play').hidden) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Enter') {
      var target = event.target && event.target.id;
      if (target === 'clear-word' || target === 'all-potions' || target === 'next-potion' || target === 'hint-word') return;
      event.preventDefault();
      tryWord();
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (picked.length) removeAt(picked.length - 1);
      return;
    }
    if (event.key === 'Escape') {
      if (!lock) releaseAll();
      return;
    }
    if (/^[a-zA-Z]$/.test(event.key)) {
      event.preventDefault();
      takeLetter(event.key.toLowerCase());
    }
  });

  progress = loadProgress();
  renderChooser();
  var params = new URLSearchParams(location.search);
  var start = params.get('potion');
  if (potionIndex(start) !== -1) openPotion(start);
  else showChooser();

  fetch('words.txt').then(function (res) {
    if (!res.ok) throw new Error('book');
    return res.text();
  }).then(function (text) {
    dict = WordBrew.dictionary(text.split(/\s+/));
    bookOk = true;
    bookReady = true;
    syncTry();
    var status = document.getElementById('status');
    if (status.textContent === 'Opening the word book…') status.textContent = '';
  }).catch(function () {
    bookOk = false;
    bookReady = true;
    syncTry();
    if (!document.getElementById('play').hidden) {
      setStatus('The word book did not open. You can still finish the potion words.');
    }
  });
})();
