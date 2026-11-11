/* Missing-letter draws.
   A word of one or two letters is never drawn, so those words
   are not ignore words.
   Ignore words are never drawn.
   Every other word is drawn, stopping at the largest count that does not
   pass the percentage: Easy 35%, Hard 51%.
   Easy never takes the first letter and never takes two letters in a row.
   Hard may take the first letter and two in a row, but not three. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LetterRules = api;
  if (typeof root.window === 'object' && root.window) root.window.LetterRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var DEFAULT_IGNORE = ['the', 'and', 'but', 'nor'];
  var active = DEFAULT_IGNORE.slice();

  function parseIgnore(value) {
    var seen = {};
    var list = [];
    String(value || '').toLowerCase().split(/[^a-z]+/).forEach(function (word) {
      if (!word || word.length <= 2 || seen[word]) return;
      seen[word] = true;
      list.push(word);
    });
    return list;
  }

  function setIgnoreWords(value) {
    active = parseIgnore(Array.isArray(value) ? value.join(' ') : value);
  }

  function ignoreWords() {
    return active.slice();
  }

  function ignoreText(list) {
    return (list || active).join(', ');
  }

  function ignoreSet(ignoreWords) {
    var list = ignoreWords == null
      ? active
      : parseIgnore(Array.isArray(ignoreWords) ? ignoreWords.join(' ') : ignoreWords);
    var set = {};
    list.forEach(function (word) { set[word] = true; });
    return set;
  }

  function removalCap(length, mode) {
    if (length <= 2) return 0;
    return Math.floor((mode === 'hard' ? 51 : 35) * length / 100);
  }

  function wordMasks(word, mode, set) {
    var text = String(word || '');
    var cap = removalCap(text.length, mode);
    if (!text || text.length <= 2 || (set && set[text.toLowerCase()]) || cap < 1) return [[]];
    var best = [];
    var bestSize = 0;
    var chosen = [];
    var runLimit = mode === 'hard' ? 3 : 2;
    function visit(index, run) {
      if (chosen.length > cap) return;
      if (index === text.length) {
        if (!chosen.length || chosen.length < bestSize) return;
        var copy = chosen.slice();
        if (chosen.length > bestSize) {
          bestSize = chosen.length;
          best = [copy];
        } else {
          best.push(copy);
        }
        return;
      }
      visit(index + 1, 0);
      if (mode !== 'hard' && index === 0) return;
      if (run + 1 >= runLimit) return;
      chosen.push(index);
      visit(index + 1, run + 1);
      chosen.pop();
    }
    visit(0, 0);
    best.sort(function (a, b) {
      var n = Math.max(a.length, b.length);
      var i;
      for (i = 0; i < n; i += 1) {
        var diff = (a[i] || 0) - (b[i] || 0);
        if (diff) return diff;
      }
      return a.length - b.length;
    });
    return best.length ? best : [[]];
  }

  function pick(options, random) {
    var n = Math.random();
    if (typeof random === 'function' && random.length === 0) {
      var got = random();
      if (typeof got === 'number' && isFinite(got)) n = got;
    }
    if (n < 0) n = 0;
    if (n >= 1) n = 0.999999;
    var index = Math.floor(n * options.length);
    if (index >= options.length) index = options.length - 1;
    if (index < 0) index = 0;
    return options[index];
  }

  function hiddenIndexes(phrase, mode, random, ignored) {
    var text = String(phrase || '');
    var set = ignoreSet(ignored);
    var hide = {};
    var match;
    var pattern = /[A-Za-z]+/g;
    while ((match = pattern.exec(text))) {
      pick(wordMasks(match[0], mode, set), random).forEach(function (index) {
        hide[match.index + index] = true;
      });
    }
    return hide;
  }

  function hideKey(hide) {
    return Object.keys(hide || {}).map(Number).sort(function (a, b) { return a - b; }).join(',');
  }

  function anotherHide(phrase, mode, previous, ignored) {
    var first = hiddenIndexes(phrase, mode, Math.random, ignored);
    var previousKey = hideKey(previous);
    if (hideKey(first) !== previousKey) return first;
    var i;
    for (i = 0; i < 12; i += 1) {
      var next = hiddenIndexes(phrase, mode, Math.random, ignored);
      if (hideKey(next) !== previousKey) return next;
    }
    return first;
  }

  function maskPhrase(phrase, mode, random, ignored) {
    var text = String(phrase || '');
    var hide = hiddenIndexes(text, mode, random, ignored);
    return text.split('').map(function (ch, index) { return hide[index] ? '_' : ch; }).join('');
  }

  function removals(word, mode, ignored) {
    return wordMasks(String(word || ''), mode, ignoreSet(ignored));
  }

  return {
    parseIgnore: parseIgnore,
    setIgnoreWords: setIgnoreWords,
    ignoreWords: ignoreWords,
    ignoreText: ignoreText,
    maskPhrase: maskPhrase,
    hiddenIndexes: hiddenIndexes,
    anotherHide: anotherHide,
    removals: removals
  };
});
