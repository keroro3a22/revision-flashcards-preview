/**
 * Merge practice progress that already lives in localStorage.
 * Logged-out pages keep using those keys. After sign-in, account.js
 * sends the merged snapshot to the learner's account.
 */
(function (root) {
  var EMAIL_DOMAIN = 'learners.localhost';
  var KEYS = {
    badges: 'p6-flash-badges-v1',
    profile: 'p6-flash-profile-v1',
    mastery: 'p6-flash-mastery-v1',
    matchBest: 'p6-flash-match-best-v1',
    timedBest: 'p6-flash-timed-best-v1',
    lastPlace: 'p6-flash-last-v1'
  };
  var OWNER_KEY = 'p6-progress-owner';
  var PROFILE_AT = 'p6-progress-profile-at';
  var LAST_AT = 'p6-progress-last-at';
  var CHOICE_KEY = 'p6-anon-choice';
  var HELD_KEY = 'p6-anon-held';
  var STASH_PREFIX = 'p6-progress-stash:';
  var USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/;

  function parseObject(raw) {
    if (!raw) return {};
    try {
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
      return data;
    } catch (e) {
      return {};
    }
  }

  function emptySnapshot() {
    return {
      badges: {},
      profile: {},
      mastery: {},
      matchBest: {},
      timedBest: {},
      lastPlace: {}
    };
  }

  function read(storage) {
    return {
      badges: parseObject(storage.getItem(KEYS.badges)),
      profile: parseObject(storage.getItem(KEYS.profile)),
      mastery: parseObject(storage.getItem(KEYS.mastery)),
      matchBest: parseObject(storage.getItem(KEYS.matchBest)),
      timedBest: parseObject(storage.getItem(KEYS.timedBest)),
      lastPlace: parseObject(storage.getItem(KEYS.lastPlace))
    };
  }

  function write(storage, snapshot) {
    var snap = snapshot || emptySnapshot();
    storage.setItem(KEYS.badges, JSON.stringify(snap.badges || {}));
    storage.setItem(KEYS.profile, JSON.stringify(snap.profile || {}));
    storage.setItem(KEYS.mastery, JSON.stringify(snap.mastery || {}));
    storage.setItem(KEYS.matchBest, JSON.stringify(snap.matchBest || {}));
    storage.setItem(KEYS.timedBest, JSON.stringify(snap.timedBest || {}));
    storage.setItem(KEYS.lastPlace, JSON.stringify(snap.lastPlace || {}));
  }

  function stash(storage, id, snapshot, times) {
    if (!id) return;
    storage.setItem(STASH_PREFIX + id, JSON.stringify({
      snapshot: snapshot || emptySnapshot(),
      profileAt: Number(times && times.profileAt) || 0,
      lastAt: Number(times && times.lastAt) || 0
    }));
  }

  function readStash(storage, id) {
    var data = parseObject(storage.getItem(STASH_PREFIX + id));
    var snap = data.snapshot && typeof data.snapshot === 'object' ? data.snapshot : null;
    return {
      snapshot: snap ? {
        badges: snap.badges || {},
        profile: snap.profile || {},
        mastery: snap.mastery || {},
        matchBest: snap.matchBest || {},
        timedBest: snap.timedBest || {},
        lastPlace: snap.lastPlace || {}
      } : emptySnapshot(),
      profileAt: Number(data.profileAt) || 0,
      lastAt: Number(data.lastAt) || 0,
      found: !!snap
    };
  }

  function clearStash(storage, id) {
    storage.removeItem(STASH_PREFIX + id);
  }

  function clearDevice(storage) {
    write(storage, emptySnapshot());
    storage.removeItem(OWNER_KEY);
    storage.removeItem(PROFILE_AT);
    storage.removeItem(LAST_AT);
    storage.removeItem(CHOICE_KEY);
    storage.removeItem(HELD_KEY);
    storage.removeItem('p6-flash-badge-popups-v1');
    if (typeof storage.key !== 'function' || typeof storage.length !== 'number') return;
    var drop = [];
    for (var i = 0; i < storage.length; i++) {
      var key = storage.key(i);
      if (key && key.indexOf(STASH_PREFIX) === 0) drop.push(key);
    }
    drop.forEach(function (key) { storage.removeItem(key); });
  }

  function num(value) {
    var n = Number(value);
    return isFinite(n) ? n : 0;
  }

  function stable(value) {
    if (typeof value === 'undefined') return 'null';
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Object.prototype.toString.call(value) === '[object Array]') {
      return '[' + value.map(stable).join(',') + ']';
    }
    var keys = Object.keys(value).sort();
    return '{' + keys.map(function (key) {
      return JSON.stringify(key) + ':' + stable(value[key]);
    }).join(',') + '}';
  }

  function mergeEarned(a, b) {
    var out = {};
    var ids = {};
    Object.keys(a || {}).forEach(function (id) { ids[id] = true; });
    Object.keys(b || {}).forEach(function (id) { ids[id] = true; });
    Object.keys(ids).forEach(function (id) {
      var left = a && a[id];
      var right = b && b[id];
      if (left && right) {
        out[id] = num(left.earnedAt) <= num(right.earnedAt) ? left : right;
      } else {
        out[id] = left || right;
      }
    });
    return out;
  }

  function mergeUnitState(a, b) {
    var out = {};
    var keys = {};
    Object.keys(a || {}).forEach(function (key) { keys[key] = true; });
    Object.keys(b || {}).forEach(function (key) { keys[key] = true; });
    Object.keys(keys).forEach(function (key) {
      var left = a ? a[key] : undefined;
      var right = b ? b[key] : undefined;
      if (typeof left === 'number' || typeof right === 'number') {
        out[key] = Math.max(typeof left === 'number' ? left : 0, typeof right === 'number' ? right : 0);
      } else if (typeof left === 'boolean' || typeof right === 'boolean') {
        out[key] = !!(left || right);
      } else if (right != null) {
        out[key] = right;
      } else {
        out[key] = left;
      }
    });
    return out;
  }

  function mergeUnits(a, b) {
    var out = {};
    var ids = {};
    Object.keys(a || {}).forEach(function (id) { ids[id] = true; });
    Object.keys(b || {}).forEach(function (id) { ids[id] = true; });
    Object.keys(ids).forEach(function (id) {
      out[id] = mergeUnitState(a && a[id], b && b[id]);
    });
    return out;
  }

  function mergeHad(a, b) {
    var out = {};
    Object.keys(b || {}).forEach(function (key) { if (b[key]) out[key] = b[key]; });
    Object.keys(a || {}).forEach(function (key) { if (a[key]) out[key] = a[key]; });
    return out;
  }

  function mergeSeen(a, b) {
    var out = {};
    function take(src) {
      if (!src || typeof src !== 'object' || Array.isArray(src)) return;
      Object.keys(src).forEach(function (id) {
        var list = Array.isArray(src[id]) ? src[id] : [];
        if (!out[id]) out[id] = [];
        list.forEach(function (step) {
          var at = Number(step);
          if (isFinite(at) && out[id].indexOf(at) === -1) out[id].push(at);
        });
      });
    }
    take(a);
    take(b);
    return out;
  }

  function mergeBadges(a, b) {
    a = a && typeof a === 'object' ? a : {};
    b = b && typeof b === 'object' ? b : {};
    var leftWins = num(a.grammarInferenceWins);
    var rightWins = num(b.grammarInferenceWins);
    if (leftWins < 0) leftWins = 0;
    if (rightWins < 0) rightWins = 0;
    var out = {
      earned: mergeEarned(a.earned, b.earned),
      units: mergeUnits(a.units, b.units),
      hadReview: mergeHad(a.hadReview, b.hadReview)
    };
    var seen = mergeSeen(a.nudgesSeen, b.nudgesSeen);
    if (Object.keys(seen).length) out.nudgesSeen = seen;
    var wins = Math.max(leftWins, rightWins);
    if (wins > 0) out.grammarInferenceWins = wins;
    return out;
  }

  function stateRank(state) {
    if (state === 'mastered') return 3;
    if (state === 'review') return 2;
    if (state === 'new') return 1;
    return 0;
  }

  function mergeWord(a, b) {
    if (!a || typeof a !== 'object') return b;
    if (!b || typeof b !== 'object') return a;
    var state = stateRank(a.state) >= stateRank(b.state) ? (a.state || 'new') : (b.state || 'new');
    var last = Math.max(num(a.last), num(b.last));
    return {
      state: state,
      streak: Math.max(num(a.streak), num(b.streak)),
      correct: Math.max(num(a.correct), num(b.correct)),
      wrong: Math.max(num(a.wrong), num(b.wrong)),
      last: last || null
    };
  }

  function mergeMastery(a, b) {
    var left = (a && a.words) || {};
    var right = (b && b.words) || {};
    var words = {};
    var keys = {};
    Object.keys(left).forEach(function (key) { keys[key] = true; });
    Object.keys(right).forEach(function (key) { keys[key] = true; });
    Object.keys(keys).forEach(function (key) {
      words[key] = mergeWord(left[key], right[key]);
    });
    return { words: words };
  }

  function betterMatch(a, b) {
    if (!a || typeof a.flips !== 'number') return b || null;
    if (!b || typeof b.flips !== 'number') return a;
    if (a.flips !== b.flips) return a.flips < b.flips ? a : b;
    var aMs = typeof a.ms === 'number' ? a.ms : Infinity;
    var bMs = typeof b.ms === 'number' ? b.ms : Infinity;
    return aMs <= bMs ? a : b;
  }

  function mergeMatch(a, b) {
    var out = {};
    var keys = {};
    Object.keys(a || {}).forEach(function (key) { keys[key] = true; });
    Object.keys(b || {}).forEach(function (key) { keys[key] = true; });
    Object.keys(keys).forEach(function (key) {
      var best = betterMatch(a && a[key], b && b[key]);
      if (best) out[key] = best;
    });
    return out;
  }

  function mergeTimed(a, b) {
    var out = {};
    var keys = {};
    Object.keys(a || {}).forEach(function (key) { keys[key] = true; });
    Object.keys(b || {}).forEach(function (key) { keys[key] = true; });
    Object.keys(keys).forEach(function (key) {
      var left = a && typeof a[key] === 'number' ? a[key] : null;
      var right = b && typeof b[key] === 'number' ? b[key] : null;
      if (left == null && right == null) return;
      out[key] = Math.max(left == null ? -Infinity : left, right == null ? -Infinity : right);
    });
    return out;
  }

  function hasNickname(profile) {
    return !!(profile && typeof profile.nickname === 'string' && profile.nickname.trim());
  }

  function hasPlace(place) {
    return !!(place && place.en && place.href && place.unitId);
  }

  function pickProfile(local, remote, localAt, remoteAt) {
    local = local && typeof local === 'object' ? local : {};
    remote = remote && typeof remote === 'object' ? remote : {};
    if (hasNickname(local) && !hasNickname(remote)) return local;
    if (hasNickname(remote) && !hasNickname(local)) return remote;
    if (num(localAt) > num(remoteAt)) return local;
    return Object.keys(remote).length ? remote : local;
  }

  function pickPlace(local, remote, localAt, remoteAt) {
    local = local && typeof local === 'object' ? local : {};
    remote = remote && typeof remote === 'object' ? remote : {};
    if (hasPlace(local) && !hasPlace(remote)) return local;
    if (hasPlace(remote) && !hasPlace(local)) return remote;
    if (num(localAt) > num(remoteAt)) return local;
    return Object.keys(remote).length ? remote : local;
  }

  function normalize(snapshot) {
    snapshot = snapshot || {};
    return {
      badges: mergeBadges(snapshot.badges, {}),
      profile: snapshot.profile && typeof snapshot.profile === 'object' ? snapshot.profile : {},
      mastery: mergeMastery(snapshot.mastery, {}),
      matchBest: mergeMatch(snapshot.matchBest, {}),
      timedBest: mergeTimed(snapshot.timedBest, {}),
      lastPlace: snapshot.lastPlace && typeof snapshot.lastPlace === 'object' ? snapshot.lastPlace : {}
    };
  }

  function same(a, b) {
    return stable(normalize(a)) === stable(normalize(b));
  }

  function merge(local, remote, times) {
    times = times || {};
    local = local || emptySnapshot();
    remote = remote || emptySnapshot();
    return normalize({
      badges: mergeBadges(local.badges, remote.badges),
      mastery: mergeMastery(local.mastery, remote.mastery),
      matchBest: mergeMatch(local.matchBest, remote.matchBest),
      timedBest: mergeTimed(local.timedBest, remote.timedBest),
      profile: pickProfile(local.profile, remote.profile, times.profileAt, times.remoteAt),
      lastPlace: pickPlace(local.lastPlace, remote.lastPlace, times.lastAt, times.remoteAt)
    });
  }

  function hasProgress(snapshot) {
    var snap = snapshot || {};
    var badges = snap.badges || {};
    if (badges.earned && Object.keys(badges.earned).length) return true;
    if (num(badges.grammarInferenceWins) > 0) return true;
    var units = badges.units || {};
    var unitIds = Object.keys(units);
    for (var i = 0; i < unitIds.length; i++) {
      var state = units[unitIds[i]] || {};
      var flags = Object.keys(state);
      for (var j = 0; j < flags.length; j++) {
        if (state[flags[j]]) return true;
      }
    }
    var words = (snap.mastery && snap.mastery.words) || {};
    if (Object.keys(words).length) return true;
    if (hasNickname(snap.profile)) return true;
    if (hasPlace(snap.lastPlace)) return true;
    if (snap.matchBest && Object.keys(snap.matchBest).length) return true;
    if (snap.timedBest && Object.keys(snap.timedBest).length) return true;
    return false;
  }

  function planHydration(opts) {
    opts = opts || {};
    var local = normalize(opts.local || emptySnapshot());
    var remote = normalize(opts.remote || emptySnapshot());
    var owner = opts.localOwner || '';
    var userId = opts.userId;
    var remoteAt = num(opts.remoteAt);
    if (!opts.freshAccount && (!owner || owner !== userId)) {
      return {
        action: 'apply',
        snapshot: normalize(remote),
        upload: false,
        stashLocalAs: hasProgress(local) ? (owner || 'anon') : '',
        holdAnon: false,
        owner: userId,
        profileAt: remoteAt,
        lastAt: remoteAt
      };
    }
    if (opts.freshAccount && hasProgress(local) && opts.choice !== 'save' && opts.choice !== 'separate') {
      return { action: 'ask' };
    }
    if (!owner && opts.choice === 'separate') {
      return {
        action: 'apply',
        snapshot: remote,
        upload: false,
        stashLocalAs: 'anon',
        holdAnon: true,
        owner: userId,
        profileAt: remoteAt,
        lastAt: remoteAt
      };
    }
    var merged = merge(local, remote, {
      remoteAt: remoteAt,
      profileAt: num(opts.profileAt),
      lastAt: num(opts.lastAt)
    });
    return {
      action: 'apply',
      snapshot: merged,
      upload: !same(merged, remote),
      stashLocalAs: '',
      holdAnon: false,
      owner: userId,
      profileAt: Math.max(num(opts.profileAt), remoteAt),
      lastAt: Math.max(num(opts.lastAt), remoteAt)
    };
  }

  function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
  }

  function usernameOk(value) {
    return USERNAME_RE.test(normalizeUsername(value));
  }

  function emailForUsername(value) {
    var name = normalizeUsername(value);
    if (!USERNAME_RE.test(name)) return '';
    return name + '@' + EMAIL_DOMAIN;
  }

  function passwordOk(value) {
    var text = String(value || '');
    return text.length >= 6 && text.length <= 72;
  }

  function safeNext(value) {
    var next = String(value || '');
    if (!/^[a-z0-9./_-]+(?:#[A-Za-z0-9_-]+)?$/i.test(next)) return '';
    if (next.indexOf('..') !== -1 || next.indexOf('//') !== -1) return '';
    return next;
  }

  root.ProgressSync = {
    EMAIL_DOMAIN: EMAIL_DOMAIN,
    KEYS: KEYS,
    OWNER_KEY: OWNER_KEY,
    PROFILE_AT: PROFILE_AT,
    LAST_AT: LAST_AT,
    CHOICE_KEY: CHOICE_KEY,
    HELD_KEY: HELD_KEY,
    emptySnapshot: emptySnapshot,
    read: read,
    write: write,
    stash: stash,
    readStash: readStash,
    clearStash: clearStash,
    clearDevice: clearDevice,
    normalize: normalize,
    same: same,
    merge: merge,
    hasProgress: hasProgress,
    planHydration: planHydration,
    normalizeUsername: normalizeUsername,
    usernameOk: usernameOk,
    emailForUsername: emailForUsername,
    passwordOk: passwordOk,
    safeNext: safeNext
  };
})(typeof window !== 'undefined' ? window : globalThis);
