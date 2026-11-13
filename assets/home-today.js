/**
 * Homepage helpers: one syllabus word per calendar day, and the last opened card.
 * Day choice uses the local date, so a reload on the same day keeps the same word.
 */
window.HomeToday = (function () {
  var LAST_KEY = 'p6-flash-last-v1';

  function dateKey(date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }

  function pickIndex(key, count) {
    var h = 2166136261;
    var s = String(key);
    var i;
    for (i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) % count;
  }

  function publicPath(src) {
    return String(src || '').replace(/^\.\.\//, '');
  }

  function syllabus(registry) {
    var out = [];
    registry.listUnits().forEach(function (u) {
      var pack = registry.getUnit(u.id);
      if (!pack || !pack.words) return;
      pack.words.forEach(function (w, i) {
        var n = i + 1;
        out.push({
          unitId: u.id,
          label: u.label,
          n: n,
          en: w.en,
          zh: w.zh,
          audio: publicPath(w.audio),
          img: publicPath(w.img),
          href: u.id + '/#c' + n
        });
      });
    });
    return out;
  }

  function wordOfDay(words, date) {
    if (!words || !words.length) return null;
    return words[pickIndex(dateKey(date || new Date()), words.length)];
  }

  function loadLast() {
    try {
      var raw = localStorage.getItem(LAST_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data.href !== 'string' || typeof data.en !== 'string') return null;
      var href = data.href.replace(/\/index\.html(?=[#?]|$)/, '/').replace(/\.html(?=[#?]|$)/, '/');
      if (!/^(unit[1-4]|dictation3)\/#c[1-9]\d*$/.test(href)) return null;
      data.href = href;
      return data;
    } catch (e) {
      return null;
    }
  }

  return {
    LAST_KEY: LAST_KEY,
    dateKey: dateKey,
    pickIndex: pickIndex,
    syllabus: syllabus,
    wordOfDay: wordOfDay,
    loadLast: loadLast
  };
})();
