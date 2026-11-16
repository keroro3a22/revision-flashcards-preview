/* Shared Chat Quest names and bubble styles.
   A stored name wins, then the unit’s titled-role map, then a title-cased speaker key.
   Speakers that already have a bubble colour keep that colour. Anyone else gets a stable side and tint. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ChatNames = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var KNOWN = {
    amy: 1, tom: 1, miss: 1, ken: 1, leo: 1, sam: 1,
    mia: 1, chef: 1, ben: 1, lily: 1, may: 1, mr: 1
  };
  var STORED = ['name', 'who', 'displayName', 'speakerName', 'speaker_name'];
  var TONE_COUNT = 8;

  function clean(value) {
    if (typeof value !== 'string' && typeof value !== 'number') return '';
    var text = String(value).trim();
    if (!text || text.toLowerCase() === 'undefined' || text.toLowerCase() === 'null') return '';
    return text;
  }

  function speakerKey(item) {
    if (item == null) return '';
    if (typeof item === 'string') return item.trim().toLowerCase();
    return clean(item.speaker).toLowerCase();
  }

  function storedName(item) {
    if (!item || typeof item !== 'object') return '';
    var i;
    for (i = 0; i < STORED.length; i++) {
      var text = clean(item[STORED[i]]);
      if (text) return text;
    }
    return '';
  }

  function mappedName(names, key) {
    if (!names || !key) return '';
    var keys = Object.keys(names);
    var i;
    for (i = 0; i < keys.length; i++) {
      if (String(keys[i]).toLowerCase() === key) {
        var text = clean(names[keys[i]]);
        if (text) return text;
      }
    }
    return '';
  }

  function titleCase(key) {
    var pretty = String(key || '').replace(/[_]+/g, ' ').trim();
    if (!pretty) return '';
    return pretty.replace(/[A-Za-z]+/g, function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  }

  function display(item, names) {
    var stored = storedName(item);
    if (stored) return stored;
    var key = speakerKey(item);
    var mapped = mappedName(names, key);
    if (mapped) return mapped;
    return titleCase(key) || 'Someone';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  function hash(text) {
    var n = 5381;
    var i;
    for (i = 0; i < text.length; i++) n = ((n * 33) ^ text.charCodeAt(i)) >>> 0;
    return n;
  }

  function paint(el, item, extra) {
    if (!el) return '';
    var key = speakerKey(item);
    var classes = ['bubble'];
    if (KNOWN[key]) {
      classes.push(key);
    } else {
      var n = hash(key || 'guest');
      classes.push(n % 2 === 0 ? 'guest-start' : 'guest-end');
      classes.push('guest-tone-' + (n % TONE_COUNT));
    }
    if (extra) classes.push(extra);
    el.className = classes.join(' ');
    return el.className;
  }

  return {
    display: display,
    who: function (item, names) { return escapeHtml(display(item, names)); },
    paint: paint,
    known: KNOWN
  };
});
