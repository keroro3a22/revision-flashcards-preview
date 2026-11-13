/**
 * Per-student nickname and avatar. localStorage key p6-flash-profile-v1.
 * Three free avatars ship as simple SVGs. Further portraits are the
 * existing badge illustrations and unlock with that badge.
 * No generated images.
 */
window.Profile = (function () {
  var KEY = 'p6-flash-profile-v1';
  var sessionLabel = '';
  var BADGE_KEY = 'p6-flash-badges-v1';
  var DEFAULT_AVATAR = 'cat';
  var MAX_NAME = 16;

  var AVATARS = [
    { id: 'cat', free: true, label: 'Cat', zh: '小貓', src: 'assets/avatars/cat.svg' },
    { id: 'sun', free: true, label: 'Sun', zh: '太陽', src: 'assets/avatars/sun.svg' },
    { id: 'bear', free: true, label: 'Bear', zh: '小熊', src: 'assets/avatars/bear.svg' },
    { id: 'starter', badgeId: 'starter', label: 'First Steps', zh: '起步新手', src: 'assets/badges/first-steps.png' },
    { id: 'letters-phrase', badgeId: 'letters-phrase', label: 'Phrase Speller', zh: '詞組拼寫手', src: 'assets/badges/phrase-speller.png' },
    { id: 'match-pro', badgeId: 'match-pro', label: 'Match Master', zh: '配對高手', src: 'assets/badges/match-master.png' },
    { id: 'timed-brave', badgeId: 'timed-brave', label: 'Timed Hero', zh: '限時勇者', src: 'assets/badges/timed-hero.png' },
    { id: 'hard-challenger', badgeId: 'hard-challenger', label: 'Hard Challenger', zh: 'Hard 挑戰者', src: 'assets/badges/hard-challenger.png' },
    { id: 'all-rounder', badgeId: 'all-rounder', label: 'All-rounder', zh: '全能練習生', src: 'assets/badges/all-rounder.png' },
    { id: 'unit1', badgeId: 'unit-done:unit1', label: 'Unit 1 Completer', zh: 'Unit 完成者', src: 'assets/badges/unit-completer-unit1.png' },
    { id: 'unit2', badgeId: 'unit-done:unit2', label: 'Unit 2 Completer', zh: 'Unit 完成者', src: 'assets/badges/unit-completer-unit2.png' },
    { id: 'unit3', badgeId: 'unit-done:unit3', label: 'Unit 3 Completer', zh: 'Unit 完成者', src: 'assets/badges/unit-completer-unit3.png' },
    { id: 'unit4', badgeId: 'unit-done:unit4', label: 'Unit 4 Completer', zh: 'Unit 完成者', src: 'assets/badges/unit-completer-unit4.png' },
    { id: 'dictation3', badgeId: 'unit-done:dictation3', label: 'Dictation 3 Completer', zh: 'Unit 完成者', src: 'assets/badges/unit-completer-dictation3.png' },
    { id: 'grammar-story', badgeId: 'grammar-story', label: 'Story Reader', zh: '故事閱讀員', src: 'assets/badges/story-reader.png' },
    { id: 'grammar-inference', badgeId: 'grammar-inference', label: 'Inference Ace', zh: '推理高手', src: 'assets/badges/inference-ace.png' },
    { id: 'grammar-join', badgeId: 'grammar-join', label: 'Sentence Linker', zh: '組句高手', src: 'assets/badges/sentence-linker.png' },
    { id: 'grammar-boss', badgeId: 'grammar-boss', label: 'Boss Beater', zh: 'Boss 挑戰者', src: 'assets/badges/boss-beater.png' }
  ];

  AVATARS.forEach(function (avatar) {
    if (!avatar.free && /\.png$/.test(avatar.src)) {
      avatar.lockedSrc = avatar.src.replace(/\.png$/, '-locked.png');
    }
  });

  function normalizeName(value) {
    var text = String(value || '').replace(/[\u0000-\u001F]/g, '').replace(/\s+/g, ' ').trim();
    if (text.length > MAX_NAME) text = text.slice(0, MAX_NAME).trim();
    return text;
  }

  function earnedMap() {
    try {
      if (window.Badges && typeof window.Badges.load === 'function') {
        var fromBadges = window.Badges.load();
        return (fromBadges && fromBadges.earned) || {};
      }
    } catch (e) { /* fall through */ }
    try {
      var raw = localStorage.getItem(BADGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return (parsed && parsed.earned) || {};
    } catch (e2) {
      return {};
    }
  }

  function findAvatar(id) {
    for (var i = 0; i < AVATARS.length; i++) {
      if (AVATARS[i].id === id) return AVATARS[i];
    }
    return null;
  }

  function isUnlocked(avatar, earned) {
    if (!avatar) return false;
    if (avatar.free) return true;
    return !!(earned && avatar.badgeId && earned[avatar.badgeId]);
  }

  function badgeArt(badgeId) {
    if (!badgeId || !window.Badges || typeof window.Badges.listWithStatus !== 'function') return null;
    var rows = window.Badges.listWithStatus();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === badgeId) return rows[i];
    }
    return null;
  }

  function list(earned) {
    var map = earned || earnedMap();
    return AVATARS.map(function (avatar) {
      var unlocked = isUnlocked(avatar, map);
      var badge = badgeArt(avatar.badgeId);
      var filtered = !!(!unlocked && badge && badge.custom);
      var src = avatar.src;
      if (badge && (unlocked || badge.custom)) src = unlocked ? badge.image : badge.lockedImage;
      else if (!unlocked) src = avatar.lockedSrc || avatar.src;
      var lockLabel = unlocked ? '' : ('Unlocks with ' + avatar.label + (avatar.zh ? ' · ' + avatar.zh : ''));
      return {
        id: avatar.id,
        label: avatar.label,
        zh: avatar.zh,
        free: !!avatar.free,
        badgeId: avatar.badgeId || '',
        unlocked: unlocked,
        filtered: filtered,
        src: src,
        lockLabel: lockLabel
      };
    });
  }

  function load() {
    var empty = { nickname: '', avatar: DEFAULT_AVATAR };
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return empty;
      var data = JSON.parse(raw);
      var nickname = normalizeName(data && data.nickname);
      var avatar = findAvatar(data && data.avatar) ? data.avatar : DEFAULT_AVATAR;
      return { nickname: nickname, avatar: avatar };
    } catch (e) {
      return empty;
    }
  }

  function usableAvatar(id, earned, fallbackId) {
    var chosen = findAvatar(id);
    if (chosen && isUnlocked(chosen, earned)) return chosen.id;
    var previous = findAvatar(fallbackId);
    if (previous && isUnlocked(previous, earned)) return previous.id;
    return DEFAULT_AVATAR;
  }

  function save(partial) {
    var current = load();
    var nickname = normalizeName(partial && partial.nickname != null ? partial.nickname : current.nickname);
    if (!nickname) return { ok: false, reason: 'nickname' };
    var earned = earnedMap();
    var avatar = usableAvatar(partial && partial.avatar, earned, current.avatar);
    var next = { nickname: nickname, avatar: avatar };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      return { ok: false, reason: 'storage' };
    }
    return { ok: true, profile: next };
  }

  function display(profile) {
    var current = profile || load();
    var earned = earnedMap();
    var id = usableAvatar(current.avatar, earned, DEFAULT_AVATAR);
    var avatar = findAvatar(id) || findAvatar(DEFAULT_AVATAR);
    var shown = list(earned).filter(function (row) { return row.id === id; })[0];
    return { id: avatar.id, label: avatar.label, zh: avatar.zh, src: shown ? shown.src : avatar.src };
  }

  function resolve(path) {
    var name = String(path || '').replace(/^(\.\.\/)+/, '');
    try {
      var pathName = (typeof location !== 'undefined' && location.pathname) || '';
      if (pathName.indexOf('/practice/grammar/') !== -1) return '../../' + name;
      if (pathName.indexOf('/practice/') !== -1 || /\/unit\d+\//.test(pathName)) return '../' + name;
    } catch (e) { /* tests */ }
    return name;
  }

  function mount(slot) {
    if (!slot || typeof document === 'undefined' || slot.querySelector('.profile-chip')) return;
    var sheet = buildSheet();
    document.body.appendChild(sheet.root);
    var chip = buildChip();
    slot.appendChild(chip.button);
    var mode = 'setup';
    var selected = DEFAULT_AVATAR;

    function paintChip() {
      var profile = load();
      var shown = display(profile);
      slot.classList.add('is-ready');
      chip.button.hidden = false;
      chip.img.src = resolve(shown.src);
      chip.img.alt = '';
      chip.name.textContent = profile.nickname || sessionLabel || 'Account';
      chip.button.setAttribute('aria-label', 'Account, ' + chip.name.textContent);
    }

    function paintGrid() {
      while (sheet.grid.firstChild) sheet.grid.removeChild(sheet.grid.firstChild);
      list().forEach(function (item) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'profile-choice' + (item.unlocked ? '' : ' is-locked') + (item.filtered ? ' is-filtered' : '') + (item.id === selected ? ' is-on' : '');
        btn.disabled = !item.unlocked;
        btn.dataset.id = item.id;
        btn.setAttribute('aria-pressed', item.id === selected ? 'true' : 'false');
        btn.setAttribute('aria-label', item.unlocked
          ? (item.label + (item.zh ? ', ' + item.zh : ''))
          : item.lockLabel);
        var img = document.createElement('img');
        img.src = resolve(item.src);
        img.alt = '';
        img.width = 72;
        img.height = 72;
        var name = document.createElement('span');
        name.className = 'profile-choice-name';
        name.textContent = item.unlocked ? item.label : 'Locked';
        var gloss = document.createElement('span');
        gloss.className = 'profile-choice-gloss';
        gloss.textContent = item.unlocked ? (item.zh || '') : item.lockLabel;
        btn.appendChild(img);
        btn.appendChild(name);
        btn.appendChild(gloss);
        if (item.unlocked) {
          btn.addEventListener('click', function () {
            selected = item.id;
            var choices = sheet.grid.querySelectorAll('.profile-choice');
            for (var i = 0; i < choices.length; i++) {
              var on = choices[i].dataset.id === selected;
              choices[i].classList.toggle('is-on', on);
              choices[i].setAttribute('aria-pressed', on ? 'true' : 'false');
            }
          });
        }
        sheet.grid.appendChild(btn);
      });
    }

    function open(nextMode) {
      mode = nextMode;
      var profile = load();
      var items = list();
      selected = profile.avatar;
      if (!items.some(function (item) { return item.id === selected && item.unlocked; })) {
        selected = DEFAULT_AVATAR;
      }
      var editing = mode === 'edit';
      sheet.title.textContent = editing ? 'Edit profile' : 'Make your profile';
      sheet.zh.textContent = editing ? '編輯檔案' : '建立檔案';
      sheet.lead.textContent = editing
        ? 'Change your nickname or avatar.'
        : 'Type a nickname. Cat is selected until you pick another picture.';
      sheet.name.value = profile.nickname || '';
      sheet.error.hidden = true;
      sheet.cancel.hidden = !editing;
      sheet.save.textContent = editing ? 'Save' : 'Continue';
      paintGrid();
      sheet.root.hidden = false;
      document.documentElement.classList.add('profile-open');
      sheet.name.focus();
    }

    function close() {
      sheet.root.hidden = true;
      document.documentElement.classList.remove('profile-open');
      if (!chip.button.hidden) chip.button.focus();
    }

    function commit() {
      var result = save({ nickname: sheet.name.value, avatar: selected });
      if (!result.ok) {
        sheet.error.textContent = result.reason === 'storage'
          ? 'Could not save on this device.'
          : 'Type a nickname to continue.';
        sheet.error.hidden = false;
        sheet.name.focus();
        return;
      }
      paintChip();
      close();
    }

    sheet.save.addEventListener('click', commit);
    sheet.cancel.addEventListener('click', close);
    sheet.backdrop.addEventListener('click', function () {
      if (mode === 'edit') close();
    });
    sheet.name.addEventListener('input', function () { sheet.error.hidden = true; });
    sheet.root.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && mode === 'edit') {
        event.preventDefault();
        close();
      }
      if (event.key === 'Enter' && event.target === sheet.name) {
        event.preventDefault();
        commit();
      }
    });

    paintChip();
  }

  function accountHref() {
    try {
      var path = (typeof location !== 'undefined' && location.pathname) || '';
      if (path.indexOf('/practice/grammar/') !== -1) return '../../profile/';
      if (path.indexOf('/practice/') !== -1 || path.indexOf('/game/') !== -1 || path.indexOf('/dictation') !== -1 || /\/unit[1-6]\//.test(path)) {
        return '../profile/';
      }
    } catch (e) {}
    return 'profile/';
  }

  function buildChip() {
    var button = document.createElement('a');
    button.className = 'profile-chip';
    button.href = accountHref();
    var img = document.createElement('img');
    img.className = 'profile-chip-avatar';
    img.alt = '';
    img.width = 36;
    img.height = 36;
    var name = document.createElement('span');
    name.className = 'profile-chip-name';
    button.appendChild(img);
    button.appendChild(name);
    return { button: button, img: img, name: name };
  }

  function buildSheet() {
    var root = document.createElement('div');
    root.className = 'profile-sheet';
    root.hidden = true;
    var backdrop = document.createElement('div');
    backdrop.className = 'profile-sheet-backdrop';
    var panel = document.createElement('div');
    panel.className = 'profile-sheet-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'profile-sheet-title');

    var titleRow = document.createElement('h2');
    titleRow.id = 'profile-sheet-title';
    titleRow.className = 'profile-sheet-title';
    var title = document.createElement('span');
    var zh = document.createElement('span');
    zh.className = 'profile-zh';
    titleRow.appendChild(title);
    titleRow.appendChild(zh);

    var lead = document.createElement('p');
    lead.className = 'profile-sheet-lead';

    var field = document.createElement('label');
    field.className = 'profile-field';
    var fieldName = document.createElement('span');
    fieldName.className = 'profile-field-label';
    fieldName.appendChild(document.createTextNode('Nickname '));
    var fieldZh = document.createElement('span');
    fieldZh.className = 'profile-zh';
    fieldZh.textContent = '暱稱';
    fieldName.appendChild(fieldZh);
    var name = document.createElement('input');
    name.id = 'profile-name';
    name.type = 'text';
    name.maxLength = MAX_NAME;
    name.autocomplete = 'nickname';
    name.required = true;
    name.setAttribute('aria-required', 'true');
    name.placeholder = 'e.g. Amy';
    name.setAttribute('aria-describedby', 'profile-name-error');
    field.appendChild(fieldName);
    field.appendChild(name);

    var error = document.createElement('p');
    error.id = 'profile-name-error';
    error.className = 'profile-error';
    error.hidden = true;

    var avatarLabel = document.createElement('p');
    avatarLabel.className = 'profile-avatars-label';
    avatarLabel.appendChild(document.createTextNode('Avatar '));
    var avatarZh = document.createElement('span');
    avatarZh.className = 'profile-zh';
    avatarZh.textContent = '頭像';
    avatarLabel.appendChild(avatarZh);

    var grid = document.createElement('div');
    grid.className = 'profile-grid';
    grid.setAttribute('role', 'list');

    var actions = document.createElement('div');
    actions.className = 'profile-actions';
    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'profile-save';
    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'profile-cancel';
    cancel.textContent = 'Cancel';
    actions.appendChild(saveBtn);
    actions.appendChild(cancel);

    panel.appendChild(titleRow);
    panel.appendChild(lead);
    panel.appendChild(field);
    panel.appendChild(error);
    panel.appendChild(avatarLabel);
    panel.appendChild(grid);
    panel.appendChild(actions);
    root.appendChild(backdrop);
    root.appendChild(panel);

    return {
      root: root,
      backdrop: backdrop,
      title: title,
      zh: zh,
      lead: lead,
      name: name,
      error: error,
      grid: grid,
      save: saveBtn,
      cancel: cancel
    };
  }

  function labelChip(text) {
    sessionLabel = text || '';
    var name = document.querySelector('.profile-chip-name');
    if (!name) return;
    if (!load().nickname) name.textContent = sessionLabel || 'Account';
  }

  function boot() {
    var slot = document.getElementById('profile-slot');
    if (slot) mount(slot);
  }

  if (typeof document !== 'undefined' && document.getElementById) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }

  return {
    KEY: KEY,
    BADGE_KEY: BADGE_KEY,
    DEFAULT_AVATAR: DEFAULT_AVATAR,
    MAX_NAME: MAX_NAME,
    AVATARS: AVATARS,
    normalizeName: normalizeName,
    earnedMap: earnedMap,
    isUnlocked: isUnlocked,
    list: list,
    load: load,
    save: save,
    display: display,
    mount: mount,
    labelChip: labelChip
  };
})();
