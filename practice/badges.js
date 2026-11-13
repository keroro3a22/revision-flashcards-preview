/**
 * Completion badges. localStorage key p6-flash-badges-v1.
 * Earned from finished practice sessions. Cross-unit badges use Units 1–4 only.
 * No points, totals, or streaks.
 */
window.Badges = (function () {
  const KEY = 'p6-flash-badges-v1';
  const POPUP_KEY = 'p6-flash-badge-popups-v1';
  const SETTINGS_KEY = 'p6-flash-badge-settings-v1';
  var overlay = {};
  const ORDER = [
    { id: 'unit1', label: 'Unit 1' },
    { id: 'unit2', label: 'Unit 2' },
    { id: 'unit3', label: 'Unit 3' },
    { id: 'unit4', label: 'Unit 4' },
    { id: 'dictation3', label: 'Dictation 3' }
  ];

  function empty() {
    return { earned: {}, units: {}, hadReview: {} };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return empty();
      if (!data.earned || typeof data.earned !== 'object') data.earned = {};
      if (!data.units || typeof data.units !== 'object') data.units = {};
      if (!data.hadReview || typeof data.hadReview !== 'object') data.hadReview = {};
      return data;
    } catch (e) {
      return empty();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* quota / private mode */ }
  }

  function unitState(data, unitId) {
    if (!data.units[unitId]) data.units[unitId] = {};
    var st = data.units[unitId];
    var defaults = {
      fillEasy: false,
      fillHard: false,
      lettersEasy: false,
      lettersHard: false,
      match: false,
      timed: false,
      grammarStory: false,
      grammarChat: false,
      grammarJoin: false
    };
    Object.keys(defaults).forEach(function (key) {
      if (typeof st[key] === 'undefined') st[key] = defaults[key];
    });
    return st;
  }

  /*
   * Badge art is original いらすとや clipart of people, saved locally (not generated).
   * Locked files are a flat gray fill of that same figure’s outline.
   * First Steps: https://www.irasutoya.com/2013/11/blog-post_508.html
   * Phrase Speller: https://www.irasutoya.com/2013/01/blog-post_2739.html
   * Match Master: https://www.irasutoya.com/2017/07/blog-post_978.html
   * Timed Hero: https://www.irasutoya.com/2012/12/blog-post_271.html
   * Hard Challenger: https://www.irasutoya.com/2020/01/blog-post_69.html
   * All-rounder: https://www.irasutoya.com/2014/11/blog-post_364.html
   * Unit 1 completer: https://www.irasutoya.com/2014/09/blog-post_58.html
   * Unit 2 completer: https://www.irasutoya.com/2012/11/blog-post_6715.html
   * Unit 3 completer: https://www.irasutoya.com/2013/09/blog-post_3570.html
   * Unit 4 completer: https://www.irasutoya.com/2013/09/blog-post_4255.html
   * Dictation 3 completer: https://www.irasutoya.com/2013/02/blog-post_4647.html
   */
  function catalog() {
    const globals = [
      { id: 'starter', title: '起步新手', english: 'First Steps', image: 'assets/badges/first-steps.png', detail: 'Finish any one practice session.' },
      { id: 'letters-phrase', title: '詞組拼寫手', english: 'Phrase Speller', image: 'assets/badges/phrase-speller.png', detail: 'Finish Missing Letters Easy for Unit 1, Unit 2, Unit 3, and Unit 4, with every answer correct.' },
      { id: 'match-pro', title: '配對高手', english: 'Match Master', image: 'assets/badges/match-master.png', detail: 'Finish Memory Match once for Unit 1, Unit 2, Unit 3, and Unit 4.' },
      { id: 'timed-brave', title: '限時勇者', english: 'Timed Hero', image: 'assets/badges/timed-hero.png', detail: 'Finish Timed Challenge once for Unit 1, Unit 2, Unit 3, and Unit 4.' },
      { id: 'hard-challenger', title: 'Hard 挑戰者', english: 'Hard Challenger', image: 'assets/badges/hard-challenger.png', detail: 'Finish Sentence Fill Hard and Missing Letters Hard for Unit 1, Unit 2, Unit 3, and Unit 4, with at least 90% correct in each session.' },
      { id: 'all-rounder', title: '全能練習生', english: 'All-rounder', image: 'assets/badges/all-rounder.png', detail: 'In Mixed topic, finish Sentence Fill, Missing Letters, Memory Match, and Timed Challenge once each.' }
    ];
    const unitArt = {
      unit1: 'assets/badges/unit-completer-unit1.png',
      unit2: 'assets/badges/unit-completer-unit2.png',
      unit3: 'assets/badges/unit-completer-unit3.png',
      unit4: 'assets/badges/unit-completer-unit4.png',
      dictation3: 'assets/badges/unit-completer-dictation3.png'
    };
    const units = ORDER.map(function (u) {
      return {
        id: 'unit-done:' + u.id,
        title: 'Unit 完成者',
        english: 'Unit Completer',
        image: unitArt[u.id],
        unitLabel: u.label,
        detail: 'Finish Sentence Fill, Missing Letters, and Memory Match for ' + u.label + '.'
      };
    });
    const grammar = [
      { id: 'grammar-story', title: '故事閱讀員', english: 'Story Reader', image: 'assets/badges/story-reader.png', detail: 'Finish Story Book in Units 1–4.' },
      { id: 'grammar-inference', title: '推理高手', english: 'Inference Ace', image: 'assets/badges/inference-ace.png', detail: 'Get the Chat Quest mystery right 3 times.' },
      { id: 'grammar-join', title: '組句高手', english: 'Sentence Linker', image: 'assets/badges/sentence-linker.png', detail: 'Finish Join the sentences in Units 1–4.' },
      { id: 'grammar-boss', title: 'Boss 挑戰者', english: 'Boss Beater', image: 'assets/badges/boss-beater.png', detail: 'Clear Boss Round with at least 1 life left.' }
    ];
    return globals.concat(units).concat(grammar);
  }

  function builtinTarget(id) {
    if (id === 'starter' || id === 'grammar-boss') return 1;
    if (id.indexOf('unit-done:') === 0) return 3;
    if (id === 'grammar-inference') return 3;
    return 4;
  }

  function targetLimit(id) {
    if (id === 'grammar-inference') return 99;
    return builtinTarget(id);
  }

  function cleanText(value, fallback, max) {
    var text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length > max) text = text.slice(0, max).trim();
    return text || fallback;
  }

  function cleanMilestones(list, target) {
    var seen = {};
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (row) {
      var at = Number(row && row.at);
      var message = cleanText(row && row.message, '', 120);
      if (!message || !isFinite(at) || Math.floor(at) !== at) return;
      if (at < 1 || at >= target || seen[at]) return;
      seen[at] = true;
      out.push({ at: at, message: message });
    });
    out.sort(function (a, b) { return a.at - b.at; });
    return out;
  }

  function rememberOverlay(rows) {
    overlay = {};
    (rows || []).forEach(function (row) {
      if (row && row.id) overlay[row.id] = row;
    });
  }

  function applyOverlay(rows) {
    rememberOverlay(rows);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(rows || [])); } catch (e) { /* quota */ }
  }

  function loadCachedOverlay() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) rememberOverlay(JSON.parse(raw));
    } catch (e) { /* ignore a broken cache */ }
  }

  function presented(raw) {
    var over = overlay[raw.id] || {};
    var target = builtinTarget(raw.id);
    var custom = Number(over.target);
    var max = targetLimit(raw.id);
    if (isFinite(custom) && custom >= 1 && custom <= max && Math.floor(custom) === custom) target = custom;
    var image = cleanText(over.image, raw.image || '', 400);
    return {
      id: raw.id,
      title: cleanText(over.title, raw.title || raw.id, 40),
      english: cleanText(over.english, raw.english || '', 40),
      detail: cleanText(over.detail, raw.detail || '', 280),
      image: image,
      unitLabel: raw.unitLabel || '',
      countEditable: raw.id === 'grammar-inference',
      custom: !!(over.image && String(over.image).trim()),
      target: target,
      milestones: cleanMilestones(over.milestones, target)
    };
  }

  function viewById(id) {
    var raw = catalog().filter(function (badge) { return badge.id === id; })[0];
    if (!raw) return { id: id, title: id, english: '', detail: '', image: '', custom: false, target: 1, milestones: [] };
    return presented(raw);
  }

  function unitCount(data, pred) {
    var count = 0;
    CROSS_UNITS.forEach(function (id) {
      if (pred((data.units && data.units[id]) || {})) count += 1;
    });
    return count;
  }

  function anyPractice(data) {
    var units = data.units || {};
    return Object.keys(units).some(function (id) {
      var st = units[id] || {};
      return !!(st.fillEasy || st.fillHard || st.lettersEasy || st.lettersHard || st.match || st.timed);
    });
  }

  function measure(data, id) {
    if (id === 'starter') return anyPractice(data) ? 1 : 0;
    if (id === 'letters-phrase') return unitCount(data, function (unit) { return meets(unit.lettersEasyBest, 1); });
    if (id === 'match-pro') return unitCount(data, function (unit) { return !!unit.match; });
    if (id === 'timed-brave') return unitCount(data, function (unit) { return !!unit.timed; });
    if (id === 'hard-challenger') {
      return unitCount(data, function (unit) {
        return meets(unit.fillHardBest, 0.9) && meets(unit.lettersHardBest, 0.9);
      });
    }
    if (id === 'all-rounder') {
      var mixed = (data.units && data.units.mixed) || {};
      var count = 0;
      if (mixed.fillEasy || mixed.fillHard) count += 1;
      if (mixed.lettersEasy || mixed.lettersHard) count += 1;
      if (mixed.match) count += 1;
      if (mixed.timed) count += 1;
      return count;
    }
    if (id.indexOf('unit-done:') === 0) {
      var st = (data.units && data.units[id.slice('unit-done:'.length)]) || {};
      var done = 0;
      if (st.fillEasy || st.fillHard) done += 1;
      if (st.lettersEasy || st.lettersHard) done += 1;
      if (st.match) done += 1;
      return done;
    }
    if (id === 'grammar-story') return unitCount(data, function (unit) { return !!unit.grammarStory; });
    if (id === 'grammar-join') return unitCount(data, function (unit) { return !!unit.grammarJoin; });
    if (id === 'grammar-inference') {
      var wins = Number(data.grammarInferenceWins);
      if (!isFinite(wins) || wins < 0) return 0;
      return Math.floor(wins);
    }
    if (id === 'grammar-boss') return data.earned && data.earned[id] ? 1 : 0;
    return 0;
  }

  function snapshot(data) {
    var map = {};
    catalog().forEach(function (badge) { map[badge.id] = measure(data, badge.id); });
    return map;
  }

  function progress(id) {
    var data = load();
    var view = viewById(id);
    var raw = measure(data, id);
    var earned = !!(data.earned && data.earned[id]);
    return {
      current: earned ? view.target : Math.min(raw, view.target),
      raw: raw,
      target: view.target
    };
  }

  function collectNudges(data, before) {
    var out = [];
    catalog().forEach(function (raw) {
      var view = presented(raw);
      if (!view.milestones.length) return;
      var prev = before[raw.id] || 0;
      var now = measure(data, raw.id);
      if (!data.nudgesSeen || typeof data.nudgesSeen !== 'object' || Array.isArray(data.nudgesSeen)) data.nudgesSeen = {};
      var seen = Array.isArray(data.nudgesSeen[raw.id]) ? data.nudgesSeen[raw.id].slice() : [];
      var changed = false;
      view.milestones.forEach(function (row) {
        if (row.at <= prev || row.at > now || seen.indexOf(row.at) !== -1) return;
        seen.push(row.at);
        changed = true;
        out.push({
          id: raw.id,
          at: row.at,
          message: row.message,
          title: view.title,
          english: view.english,
          detail: view.detail,
          image: view.image,
          custom: view.custom,
          current: Math.min(now, view.target),
          target: view.target
        });
      });
      if (changed) data.nudgesSeen[raw.id] = seen;
    });
    return out;
  }

  function readPending() {
    try {
      var parsed = JSON.parse(localStorage.getItem(POPUP_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writePending(list) {
    try {
      if (!list || !list.length) localStorage.removeItem(POPUP_KEY);
      else localStorage.setItem(POPUP_KEY, JSON.stringify(list));
    } catch (e) { /* quota */ }
  }

  function queuePopups(unlocks, nudges) {
    if ((!unlocks || !unlocks.length) && (!nudges || !nudges.length)) return;
    var pending = readPending();
    (unlocks || []).forEach(function (badge) {
      pending.push({
        kind: 'unlock',
        id: badge.id,
        title: badge.title,
        english: badge.english,
        detail: badge.detail || viewById(badge.id).detail,
        image: badge.image,
        custom: !!badge.custom
      });
    });
    (nudges || []).forEach(function (nudge) {
      pending.push({
        kind: 'nudge',
        id: nudge.id,
        at: nudge.at,
        message: nudge.message,
        title: nudge.title,
        english: nudge.english,
        detail: nudge.detail,
        image: nudge.image,
        custom: !!nudge.custom,
        current: nudge.current,
        target: nudge.target
      });
    });
    writePending(pending);
  }

  function clearPopups() {
    try { localStorage.removeItem(POPUP_KEY); } catch (e) { /* ignore */ }
  }

  function finish(data, before, fresh) {
    var nudges = collectNudges(data, before);
    save(data);
    queuePopups(fresh, nudges);
    return { newBadges: fresh, nudges: nudges };
  }

  function catchUp() {
    var data = load();
    var before = snapshot(data);
    var fresh = [];
    catalog().forEach(function (raw) {
      var view = presented(raw);
      if (measure(data, raw.id) >= view.target) {
        var badge = award(data, raw.id);
        if (badge) fresh.push(badge);
      }
    });
    var nudges = collectNudges(data, before);
    if (fresh.length || nudges.length) {
      save(data);
      queuePopups(fresh, nudges);
    }
    return { newBadges: fresh, nudges: nudges };
  }

  function imageSrc(path) {
    if (!path) return '';
    try {
      if (typeof location !== 'undefined' && location.pathname.indexOf('/practice/grammar/') !== -1) {
        return '../../' + path;
      }
      if (typeof location !== 'undefined' && location.pathname.indexOf('/practice/') !== -1) {
        return '../' + path;
      }
    } catch (e) { /* tests */ }
    return path;
  }

  function award(data, id) {
    if (data.earned[id]) return null;
    const earnedAt = Date.now();
    data.earned[id] = { earnedAt: earnedAt };
    const found = viewById(id);
    return {
      id: id,
      title: found.title,
      english: found.english,
      image: found.image,
      detail: found.detail,
      custom: !!found.custom,
      earnedAt: earnedAt
    };
  }

  function coreCompleteFrom(st) {
    if (!st) return false;
    return !!((st.fillEasy || st.fillHard) && (st.lettersEasy || st.lettersHard) && st.match);
  }

  var CROSS_UNITS = ['unit1', 'unit2', 'unit3', 'unit4'];

  function sessionRatio(stats) {
    if (!stats || !(stats.total > 0)) return null;
    var correct = Number(stats.correct);
    var total = Number(stats.total);
    if (!isFinite(correct) || !isFinite(total) || total <= 0) return null;
    if (correct < 0) correct = 0;
    if (correct > total) correct = total;
    return correct / total;
  }

  function meets(ratio, need) {
    return typeof ratio === 'number' && ratio + 1e-9 >= need;
  }

  function rememberBest(st, key, ratio) {
    if (ratio == null) return;
    if (typeof st[key] !== 'number' || ratio > st[key]) st[key] = ratio;
  }

  function recordSession(unitId, activity, difficulty, stats) {
    const data = load();
    const before = snapshot(data);
    const st = unitState(data, unitId);
    const hard = difficulty === 'hard';
    const ratio = sessionRatio(stats);
    if (activity === 'fill') {
      if (hard) {
        st.fillHard = true;
        rememberBest(st, 'fillHardBest', ratio);
      } else {
        st.fillEasy = true;
        rememberBest(st, 'fillEasyBest', ratio);
      }
    } else if (activity === 'letters') {
      if (hard) {
        st.lettersHard = true;
        rememberBest(st, 'lettersHardBest', ratio);
      } else {
        st.lettersEasy = true;
        rememberBest(st, 'lettersEasyBest', ratio);
      }
    } else if (activity === 'match') {
      st.match = true;
      rememberBest(st, 'matchBest', ratio);
    } else if (activity === 'timed') {
      st.timed = true;
      rememberBest(st, 'timedBest', ratio);
    }

    const fresh = [];
    function take(badge) {
      if (badge) fresh.push(badge);
    }
    function qualifies(id) {
      return measure(data, id) >= viewById(id).target;
    }
    if (qualifies('starter')) take(award(data, 'starter'));
    if (qualifies('letters-phrase')) take(award(data, 'letters-phrase'));
    if (qualifies('match-pro')) take(award(data, 'match-pro'));
    if (qualifies('timed-brave')) take(award(data, 'timed-brave'));
    if (qualifies('hard-challenger')) take(award(data, 'hard-challenger'));
    if (unitId === 'mixed' && qualifies('all-rounder')) take(award(data, 'all-rounder'));
    if (ORDER.some(function (u) { return u.id === unitId; }) && qualifies('unit-done:' + unitId)) {
      take(award(data, 'unit-done:' + unitId));
    }
    return finish(data, before, fresh);
  }

  function grantGrammarBadges(data) {
    const fresh = [];
    function take(badge) {
      if (badge) fresh.push(badge);
    }
    if (measure(data, 'grammar-story') >= viewById('grammar-story').target) {
      take(award(data, 'grammar-story'));
    }
    if (measure(data, 'grammar-join') >= viewById('grammar-join').target) {
      take(award(data, 'grammar-join'));
    }
    if (measure(data, 'grammar-inference') >= viewById('grammar-inference').target) {
      take(award(data, 'grammar-inference'));
    }
    return fresh;
  }

  function recordGrammarSession(unitId, mode) {
    const data = load();
    const before = snapshot(data);
    if (CROSS_UNITS.indexOf(unitId) !== -1) {
      const st = unitState(data, unitId);
      if (mode === 'story') st.grammarStory = true;
      else if (mode === 'chat') st.grammarChat = true;
      else if (mode === 'join') st.grammarJoin = true;
    }
    const fresh = grantGrammarBadges(data);
    return finish(data, before, fresh);
  }

  function recordGrammarInference() {
    const data = load();
    const before = snapshot(data);
    var wins = Number(data.grammarInferenceWins);
    if (!isFinite(wins) || wins < 0) wins = 0;
    data.grammarInferenceWins = wins + 1;
    const fresh = grantGrammarBadges(data);
    return finish(data, before, fresh);
  }

  function recordGrammarBoss(livesLeft) {
    const data = load();
    const before = snapshot(data);
    const fresh = [];
    if (Number(livesLeft) >= 1) {
      const badge = award(data, 'grammar-boss');
      if (badge) fresh.push(badge);
    }
    return finish(data, before, fresh);
  }

  function isEarned(id) {
    return !!load().earned[id];
  }

  function getEarned(id) {
    return load().earned[id] || null;
  }

  function coreComplete(unitId) {
    return coreCompleteFrom(load().units[unitId]);
  }

  var PRACTICE_FLAGS = ['fillEasy', 'fillHard', 'lettersEasy', 'lettersHard', 'match', 'timed'];
  var GRAMMAR_FLAGS = ['grammarStory', 'grammarChat', 'grammarJoin'];

  function practiceProgress(unitId) {
    var st = load().units[unitId] || {};
    var flags = PRACTICE_FLAGS;
    if (CROSS_UNITS.indexOf(unitId) !== -1) flags = PRACTICE_FLAGS.concat(GRAMMAR_FLAGS);
    var done = 0;
    flags.forEach(function (key) {
      if (st[key]) done += 1;
    });
    return Math.round((done / flags.length) * 100);
  }

  function hardUnlocked(unitId, activity) {
    const st = load().units[unitId];
    if (!st) return false;
    if (activity === 'fill') return !!st.fillEasy;
    if (activity === 'letters') return !!st.lettersEasy;
    return false;
  }

  function unitIndex(unitId) {
    return ORDER.findIndex(function (u) { return u.id === unitId; });
  }

  function unitUnlocked(unitId) {
    if (unitId === 'unit1' || unitId === 'dictation3' || unitId === 'mixed') return true;
    const i = unitIndex(unitId);
    if (i <= 0) return false;
    return coreComplete(ORDER[i - 1].id);
  }

  function lockReason(unitId) {
    if (unitId === 'unit1' || unitId === 'dictation3' || unitId === 'mixed') return '';
    const i = unitIndex(unitId);
    if (i <= 0) return '';
    const prev = ORDER[i - 1];
    const cur = ORDER[i];
    return 'Finish ' + prev.label + ' Sentence Fill, Missing Letters, and Memory Match to unlock ' + cur.label + '.';
  }

  function formatEarned(ts) {
    const d = new Date(ts);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function listWithStatus() {
    const data = load();
    return catalog().map(function (raw) {
      const view = presented(raw);
      const earned = data.earned[raw.id];
      const rawCount = measure(data, raw.id);
      const current = earned ? view.target : Math.min(rawCount, view.target);
      return {
        id: view.id,
        title: view.title,
        english: view.english,
        image: view.image,
        lockedImage: view.custom ? view.image : String(view.image || '').replace(/\.png$/, '-locked.png'),
        custom: view.custom,
        unitLabel: view.unitLabel,
        detail: view.detail,
        current: current,
        raw: rawCount,
        target: view.target,
        countEditable: view.countEditable,
        milestones: view.milestones,
        earned: !!earned,
        earnedAt: earned ? earned.earnedAt : null,
        earnedLabel: earned ? formatEarned(earned.earnedAt) : ''
      };
    });
  }

  function popupCard(item, locked) {
    var card = document.createElement('article');
    card.className = 'badge-popup-card';
    var art = document.createElement('div');
    art.className = 'badge-popup-art' + (locked && item.custom ? ' is-filtered' : '');
    var img = document.createElement('img');
    var src = item.image || '';
    if (locked && !item.custom) src = String(src).replace(/\.png$/, '-locked.png');
    img.src = imageSrc(src);
    img.alt = '';
    art.appendChild(img);
    card.appendChild(art);
    var title = document.createElement('h2');
    title.textContent = item.title || '';
    card.appendChild(title);
    if (item.english) {
      var english = document.createElement('p');
      english.className = 'badge-popup-english';
      english.textContent = item.english;
      card.appendChild(english);
    }
    return card;
  }

  function meter(current, target) {
    var wrap = document.createElement('div');
    wrap.className = 'badge-meter';
    wrap.setAttribute('role', 'progressbar');
    wrap.setAttribute('aria-valuemin', '0');
    wrap.setAttribute('aria-valuemax', String(target || 0));
    wrap.setAttribute('aria-valuenow', String(current || 0));
    var bar = document.createElement('span');
    var pct = target ? Math.max(0, Math.min(100, (current / target) * 100)) : 0;
    bar.style.width = pct + '%';
    wrap.appendChild(bar);
    return wrap;
  }

  function closePopup() {
    var pending = readPending();
    if (pending[0] && pending[0].kind === 'unlock') {
      while (pending[0] && pending[0].kind === 'unlock') pending.shift();
    } else {
      pending.shift();
    }
    writePending(pending);
    var open = document.getElementById('badge-popup');
    if (open) open.remove();
    showPending();
  }

  function ensurePopupStyle() {
    if (!document.head || document.getElementById('badge-popup-style')) return;
    var style = document.createElement('style');
    style.id = 'badge-popup-style';
    style.textContent = '.badge-popup{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:1rem}.badge-popup-backdrop{position:absolute;inset:0;background:rgba(36,60,108,.55)}.badge-popup-panel{position:relative;width:min(28rem,100%);max-height:min(88vh,40rem);overflow:auto;padding:1.15rem 1.1rem 1.2rem;border-radius:28px;background:#fcf0d8;color:#243c6c;text-align:center}.badge-popup-kicker,.badge-popup-card h2,.badge-popup-english,.badge-popup-cheer{font-family:Fredoka,sans-serif}.badge-popup-kicker{margin:0;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#fc903c}.badge-popup-card{margin-top:.65rem}.badge-popup-card h2{margin:.35rem 0 0;font-size:1.45rem}.badge-popup-english,.badge-popup-how,.badge-popup-cheer,.badge-fraction{margin:.2rem 0 0;font-weight:700}.badge-popup-art{width:8rem;height:8rem;margin:0 auto}.badge-popup-art img{width:100%;height:100%;object-fit:contain}.badge-popup-art.is-filtered img{filter:grayscale(1);opacity:.72}.badge-meter{width:min(100%,9rem);height:.55rem;margin:.7rem auto 0;border-radius:999px;background:rgba(36,60,108,.12);overflow:hidden}.badge-meter>span{display:block;height:100%;border-radius:inherit;background:#fc903c}.badge-popup-close{margin-top:.9rem;min-height:44px;padding:.4rem 1.2rem;border:0;border-radius:999px;background:#243c6c;color:#fcf0d8;font:inherit;font-weight:800}.badge-confetti{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:91}';
    document.head.appendChild(style);
  }

  function showPending() {
    if (typeof document === 'undefined' || !document.getElementById) return;
    ensurePopupStyle();
    var grid = document.getElementById('badge-grid');
    if (grid) renderGrid(grid);
    renderCount(document.getElementById('badge-count'));
    if (document.getElementById('badge-popup')) return;
    var pending = readPending();
    if (!pending.length) return;
    var unlocks = [];
    if (pending[0].kind === 'unlock') {
      var index = 0;
      while (pending[index] && pending[index].kind === 'unlock') {
        unlocks.push(pending[index]);
        index += 1;
      }
    }
    var nudge = unlocks.length ? null : pending[0];
    var root = document.createElement('div');
    root.id = 'badge-popup';
    root.className = 'badge-popup' + (unlocks.length ? ' is-unlock' : '');
    var backdrop = document.createElement('div');
    backdrop.className = 'badge-popup-backdrop';
    var panel = document.createElement('div');
    panel.className = 'badge-popup-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'badge-popup-title');
    var heading = document.createElement('p');
    heading.id = 'badge-popup-title';
    heading.className = 'badge-popup-kicker';
    heading.textContent = unlocks.length ? 'New badge' : 'Keep going';
    panel.appendChild(heading);
    if (unlocks.length) {
      unlocks.forEach(function (item) { panel.appendChild(popupCard(item, false)); });
      var canvas = document.createElement('canvas');
      canvas.className = 'badge-confetti';
      canvas.setAttribute('aria-hidden', 'true');
      root.appendChild(canvas);
      root._confetti = canvas;
    } else {
      panel.appendChild(popupCard(nudge, true));
      var how = document.createElement('p');
      how.className = 'badge-popup-how';
      how.textContent = nudge.detail || '';
      panel.appendChild(how);
      panel.appendChild(meter(nudge.current, nudge.target));
      var fraction = document.createElement('p');
      fraction.className = 'badge-fraction';
      fraction.textContent = (nudge.current || 0) + ' / ' + (nudge.target || 0);
      panel.appendChild(fraction);
      var cheer = document.createElement('p');
      cheer.className = 'badge-popup-cheer';
      cheer.textContent = nudge.message || '';
      panel.appendChild(cheer);
    }
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'badge-popup-close';
    close.textContent = 'Close';
    close.addEventListener('click', closePopup);
    panel.appendChild(close);
    backdrop.addEventListener('click', closePopup);
    root.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePopup();
      }
    });
    root.appendChild(backdrop);
    root.appendChild(panel);
    document.body.appendChild(root);
    close.focus();
    if (unlocks.length) startConfetti(root._confetti);
  }

  function startConfetti(canvas) {
    if (!canvas || !canvas.getContext) return;
    var reduce = false;
    try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduce = false; }
    if (reduce) return;
    var ctx = canvas.getContext('2d');
    var colors = ['#fc903c', '#fcc03c', '#243c6c', '#7eb6d9', '#f26b6b'];
    var pieces = [];
    function size() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    size();
    for (var i = 0; i < 70; i += 1) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.4,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        vy: 2 + Math.random() * 3,
        vx: -1.5 + Math.random() * 3,
        spin: Math.random() * 6,
        color: colors[i % colors.length]
      });
    }
    var started = Date.now();
    function frame() {
      if (!canvas.isConnected) return;
      if (Date.now() - started > 2200) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(function (piece) {
        piece.y += piece.vy;
        piece.x += piece.vx;
        piece.spin += 0.15;
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.spin);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
        ctx.restore();
      });
      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  function renderGrid(grid) {
    if (!grid) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    listWithStatus().forEach(function (badge) {
      var card = document.createElement('article');
      card.className = 'badge-card ' + (badge.earned ? 'is-earned' : 'is-locked');
      var art = document.createElement('div');
      art.className = 'badge-art' + (!badge.earned && badge.custom ? ' is-filtered' : '');
      var img = document.createElement('img');
      img.src = badge.earned ? badge.image : badge.lockedImage;
      img.alt = '';
      art.appendChild(img);
      var name = document.createElement('h2');
      name.className = 'badge-name';
      name.textContent = badge.title;
      var english = document.createElement('p');
      english.className = 'badge-english';
      english.textContent = badge.english;
      var how = document.createElement('p');
      how.className = 'badge-how';
      how.textContent = badge.detail;
      card.appendChild(art);
      card.appendChild(name);
      card.appendChild(english);
      card.appendChild(how);
      card.appendChild(meter(badge.current, badge.target));
      var fraction = document.createElement('p');
      fraction.className = 'badge-fraction';
      fraction.textContent = badge.current + ' / ' + badge.target;
      card.appendChild(fraction);
      if (badge.earned) {
        var date = document.createElement('p');
        date.className = 'badge-date';
        date.textContent = 'Earned ' + badge.earnedLabel;
        card.appendChild(date);
      }
      grid.appendChild(card);
    });
  }

  function renderCount(node) {
    if (!node) return;
    var list = listWithStatus();
    var earned = list.filter(function (badge) { return badge.earned; }).length;
    node.textContent = earned + ' of ' + list.length + ' earned';
  }

  function writeResult(el, result) {
    showPending();
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    const fresh = (result && result.newBadges) || [];
    const nudges = (result && result.nudges) || [];
    if (!fresh.length && !nudges.length) {
      el.textContent = 'Saved. Open Badges to see what you have earned.';
      return;
    }
    el.textContent = fresh.length ? 'New badge unlocked.' : 'Badge progress saved.';
  }

  loadCachedOverlay();

  return {
    KEY: KEY,
    ORDER: ORDER,
    catalog: catalog,
    recordSession: recordSession,
    recordGrammarSession: recordGrammarSession,
    recordGrammarInference: recordGrammarInference,
    recordGrammarBoss: recordGrammarBoss,
    isEarned: isEarned,
    getEarned: getEarned,
    coreComplete: coreComplete,
    practiceProgress: practiceProgress,
    hardUnlocked: hardUnlocked,
    unitUnlocked: unitUnlocked,
    lockReason: lockReason,
    formatEarned: formatEarned,
    listWithStatus: listWithStatus,
    progress: progress,
    applyOverlay: applyOverlay,
    cleanMilestones: cleanMilestones,
    builtinTarget: builtinTarget,
    targetLimit: targetLimit,
    catchUp: catchUp,
    clearPopups: clearPopups,
    showPending: showPending,
    POPUP_KEY: POPUP_KEY,
    imageSrc: imageSrc,
    renderGrid: renderGrid,
    renderCount: renderCount,
    writeResult: writeResult,
    load: load
  };
})();

if (typeof document !== 'undefined' && document.getElementById) {
  function bootBadgePopups() {
    if (!window.Badges) return;
    window.Badges.showPending();
    var cfg = window.SUPABASE_PUBLIC;
    if (!cfg || !cfg.url || !cfg.key || !window.supabase || !window.supabase.createClient) return;
    try {
      var client = window.supabase.createClient(cfg.url, cfg.key, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      client.from('badge_settings_live').select('id,title,english,detail,image,target,milestones').then(function (result) {
        if (!result || result.error || !result.data) return;
        window.Badges.applyOverlay(result.data);
        window.Badges.catchUp();
        window.Badges.showPending();
        var grid = document.getElementById('badge-grid');
        if (grid) window.Badges.renderGrid(grid);
        window.Badges.renderCount(document.getElementById('badge-count'));
      }, function () {});
    } catch (e) { /* built-in copy remains */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootBadgePopups);
  else bootBadgePopups();
}
