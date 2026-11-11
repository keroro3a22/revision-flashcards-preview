/* One highlight phrase per example sentence.
   highlight is the Sample / Example phrase.
   highlight_adv is the Advanced example phrase.
   A blank highlight_adv keeps the older single phrase on both sentences. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LessonHighlight = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function phrase(card, field) {
    var sample = card && card.highlight != null ? String(card.highlight) : '';
    var advanced = card && card.highlight_adv != null ? String(card.highlight_adv) : '';
    if (field === 'adv_en') return advanced.trim() ? advanced : sample;
    return sample;
  }

  function mark(text, target) {
    var value = text == null ? '' : String(text);
    var needle = target == null ? '' : String(target);
    if (!needle) return value;
    var at = value.toLowerCase().indexOf(needle.toLowerCase());
    if (at < 0) return value;
    return value.slice(0, at)
      + '<span class="hl">' + value.slice(at, at + needle.length) + '</span>'
      + value.slice(at + needle.length);
  }

  function storedHighlights(row, field, chosen) {
    var next = {
      highlight: row && row.highlight != null ? String(row.highlight) : '',
      highlight_adv: row && row.highlight_adv != null ? String(row.highlight_adv) : ''
    };
    var value = chosen == null ? '' : String(chosen);
    if (field === 'adv_en') next.highlight_adv = value;
    else next.highlight = value;
    return next;
  }

  return { phrase: phrase, mark: mark, storedHighlights: storedHighlights };
});
