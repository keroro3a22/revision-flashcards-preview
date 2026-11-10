/**
 * Words whose mastery state is review, grouped by unit.
 * An open unit links to Missing Letters for that word.
 * A locked unit links to the flashcard instead.
 */
window.ReviewList = (function () {
  function practiceOpen() {
    return true;
  }

  function groups(registry, mastery, options) {
    var opts = options || {};
    var practicePage = opts.practicePage || 'practice/letters.html';
    var cardPrefix = opts.cardPrefix || '';
    if (!registry || !mastery || typeof registry.listUnits !== 'function') return [];
    var data = mastery.load();
    var stored = (data && data.words) || {};
    var out = [];
    registry.listUnits().forEach(function (unit) {
      var pack = registry.getUnit(unit.id);
      var list = (pack && pack.words) || [];
      var open = practiceOpen(unit.id);
      var words = [];
      list.forEach(function (word, index) {
        var rec = stored[word.key];
        if (!rec || rec.state !== 'review') return;
        var n = index + 1;
        var href = open
          ? (practicePage + '?unit=' + encodeURIComponent(unit.id) + '&focus=' + encodeURIComponent(word.key))
          : (cardPrefix + unit.id + '/index.html#c' + n);
        words.push({ key: word.key, en: word.en, zh: word.zh, href: href });
      });
      if (words.length) out.push({ id: unit.id, label: unit.label, words: words });
    });
    return out;
  }

  var EMPTY = 'No words to review yet. After you practise, words that still need work will show up here.';

  function wordList(words, embedded) {
    var list = document.createElement('ul');
    list.className = 'review-word-list' + (embedded ? ' is-embedded' : '');
    words.forEach(function (word) {
      var item = document.createElement('li');
      var link = document.createElement('a');
      link.className = 'review-word';
      link.href = word.href;
      var en = document.createElement('span');
      en.className = 'review-word-en';
      en.textContent = word.en;
      var zh = document.createElement('span');
      zh.className = 'review-word-zh';
      zh.textContent = word.zh;
      link.appendChild(en);
      link.appendChild(zh);
      item.appendChild(link);
      list.appendChild(item);
    });
    return list;
  }

  function render(el, grouped) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    if (!grouped || !grouped.length) {
      appendEmpty(el);
      return;
    }
    grouped.forEach(function (group) {
      var heading = document.createElement('h3');
      heading.className = 'review-unit';
      heading.textContent = group.label;
      el.appendChild(heading);
      el.appendChild(wordList(group.words, false));
    });
  }

  function appendWords(el, words) {
    if (!el || !words || !words.length) return;
    el.appendChild(wordList(words, true));
  }

  function appendEmpty(el) {
    if (!el) return;
    var empty = document.createElement('p');
    empty.className = 'review-empty';
    empty.textContent = EMPTY;
    el.appendChild(empty);
  }

  return { groups: groups, render: render, appendWords: appendWords, appendEmpty: appendEmpty };
})();
